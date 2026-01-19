import { useState, useCallback, useMemo, type ChangeEvent } from 'react';
import { z, type ZodSchema } from 'zod';

interface UseFormOptions<T> {
  schema: ZodSchema<T>;
  initialValues: T;
  onSubmit?: (values: T) => void | Promise<void>;
}

interface FieldError {
  message: string;
}

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, FieldError>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export function useForm<T extends Record<string, unknown>>(options: UseFormOptions<T>) {
  const { schema, initialValues, onSubmit } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, FieldError>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if form is dirty (values changed from initial)
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  // Check if form is valid
  const isValid = useMemo(() => {
    try {
      schema.parse(values);
      return true;
    } catch {
      return false;
    }
  }, [schema, values]);

  // Validate a single field
  const validateField = useCallback(
    (name: keyof T, value: unknown): FieldError | null => {
      try {
        // Create a partial schema to validate just this field
        const fieldSchema = (schema as z.ZodObject<Record<string, z.ZodType>>).shape[name as string];
        if (fieldSchema) {
          fieldSchema.parse(value);
        }
        return null;
      } catch (error) {
        if (error instanceof z.ZodError) {
          return { message: error.issues[0]?.message || 'Invalid value' };
        }
        return null;
      }
    },
    [schema]
  );

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    try {
      schema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof T, FieldError>> = {};
        error.issues.forEach((err) => {
          const field = err.path[0] as keyof T;
          if (!newErrors[field]) {
            newErrors[field] = { message: err.message };
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [schema, values]);

  // Handle field change
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      let parsedValue: unknown = value;

      // Handle number inputs
      if (type === 'number') {
        parsedValue = value === '' ? '' : Number(value);
      }

      // Handle checkbox inputs
      if (type === 'checkbox') {
        parsedValue = (e.target as HTMLInputElement).checked;
      }

      setValues((prev) => ({
        ...prev,
        [name]: parsedValue,
      }));

      // Validate on change if field has been touched
      if (touched[name as keyof T]) {
        const error = validateField(name as keyof T, parsedValue);
        setErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [touched, validateField]
  );

  // Set a field value programmatically
  const setValue = useCallback(
    (name: keyof T, value: T[keyof T]) => {
      setValues((prev) => ({
        ...prev,
        [name]: value,
      }));

      if (touched[name]) {
        const error = validateField(name, value);
        setErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [touched, validateField]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;

      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));

      const error = validateField(name as keyof T, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    },
    [validateField]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      // Mark all fields as touched
      const allTouched = Object.keys(initialValues).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Partial<Record<keyof T, boolean>>
      );
      setTouched(allTouched);

      // Validate form
      const isFormValid = validateForm();
      if (!isFormValid) {
        return;
      }

      if (onSubmit) {
        try {
          setIsSubmitting(true);
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [initialValues, validateForm, onSubmit, values]
  );

  // Reset form to initial values
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // Set all values at once
  const setAllValues = useCallback((newValues: Partial<T>) => {
    setValues((prev) => ({
      ...prev,
      ...newValues,
    }));
  }, []);

  // Get field props for easy binding
  const getFieldProps = useCallback(
    (name: keyof T) => ({
      name: name as string,
      value: values[name] as string | number,
      onChange: handleChange,
      onBlur: handleBlur,
    }),
    [values, handleChange, handleBlur]
  );

  // Get field state for rendering
  const getFieldState = useCallback(
    (name: keyof T) => ({
      error: errors[name]?.message,
      touched: touched[name] || false,
      hasError: Boolean(errors[name] && touched[name]),
    }),
    [errors, touched]
  );

  const state: FormState<T> = {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
  };

  return {
    ...state,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    setAllValues,
    reset,
    validateField,
    validateForm,
    getFieldProps,
    getFieldState,
  };
}

// Helper component for form fields
interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  touched?: boolean;
  children: React.ReactNode;
  required?: boolean;
}

export function FormField({ label, name, error, touched, children, required }: FormFieldProps) {
  const hasError = Boolean(error && touched);

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-[var(--text-secondary)]">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hasError && (
        <p className="text-sm text-red-400 animate-slide-up">{error}</p>
      )}
    </div>
  );
}

// Input with validation styling
interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export function ValidatedInput({ hasError, className = '', ...props }: ValidatedInputProps) {
  const baseClasses =
    'w-full px-4 py-3 bg-[var(--bg-tertiary)] border rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-all';
  const normalClasses = 'border-[var(--glass-border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20';
  const errorClasses = 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20';

  return (
    <input
      className={`${baseClasses} ${hasError ? errorClasses : normalClasses} ${className}`}
      {...props}
    />
  );
}
