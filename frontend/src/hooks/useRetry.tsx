import { useState, useCallback, useRef, useEffect } from 'react';

interface UseRetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

interface UseRetryReturn<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
  retry: () => Promise<void>;
  reset: () => void;
}

export function useRetry<T>(
  asyncFn: () => Promise<T>,
  options: UseRetryOptions = {}
): UseRetryReturn<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const calculateDelay = useCallback((attempt: number) => {
    const delay = initialDelay * Math.pow(backoffFactor, attempt);
    return Math.min(delay, maxDelay);
  }, [initialDelay, backoffFactor, maxDelay]);

  const execute = useCallback(async (isRetryAttempt = false) => {
    if (!isMountedRef.current) return;

    if (isRetryAttempt) {
      setIsRetrying(true);
    } else {
      setIsLoading(true);
      setRetryCount(0);
    }
    setError(null);

    try {
      const result = await asyncFn();
      if (isMountedRef.current) {
        setData(result);
        setError(null);
        setRetryCount(0);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (!isMountedRef.current) return;

      if (retryCount < maxRetries) {
        const nextRetryCount = retryCount + 1;
        setRetryCount(nextRetryCount);
        onRetry?.(nextRetryCount, error);

        const delay = calculateDelay(retryCount);
        retryTimeoutRef.current = setTimeout(() => {
          execute(true);
        }, delay);
      } else {
        setError(error);
        onMaxRetriesReached?.(error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRetrying(false);
      }
    }
  }, [asyncFn, retryCount, maxRetries, calculateDelay, onRetry, onMaxRetriesReached]);

  const retry = useCallback(async () => {
    setRetryCount(0);
    await execute(false);
  }, [execute]);

  const reset = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  return {
    data,
    error,
    isLoading,
    isRetrying,
    retryCount,
    retry,
    reset,
  };
}

// Hook for fetching data with automatic retry
export function useFetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseRetryOptions = {}
) {
  const { data, error, isLoading, isRetrying, retryCount, retry, reset } = useRetry(fetchFn, options);
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (!hasExecutedRef.current) {
      hasExecutedRef.current = true;
      retry();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(() => {
    hasExecutedRef.current = true;
    retry();
  }, [retry]);

  return {
    data,
    error,
    isLoading,
    isRetrying,
    retryCount,
    refetch,
    reset,
  };
}

// Wrapper component for retry functionality
interface RetryWrapperProps {
  error: Error | null;
  isLoading: boolean;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  onRetry: () => void;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export function RetryWrapper({
  error,
  isLoading,
  isRetrying = false,
  retryCount = 0,
  maxRetries = 3,
  onRetry,
  children,
  loadingComponent,
}: RetryWrapperProps) {
  if (isLoading && !isRetrying) {
    return loadingComponent || (
      <div className="flex items-center justify-center p-8">
        <div className="spinner" />
      </div>
    );
  }

  if (error && retryCount >= maxRetries) {
    return (
      <div className="glass-card p-6 text-center">
        <svg className="w-12 h-12 mx-auto mb-3 text-red-500 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <p className="text-[var(--text-primary)] font-medium mb-1">Failed to load</p>
        <p className="text-[var(--text-secondary)] text-sm mb-4">{error.message}</p>
        <button className="btn-secondary" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  if (isRetrying) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-2">
        <div className="spinner" />
        <p className="text-[var(--text-secondary)] text-sm">
          Retrying... (Attempt {retryCount}/{maxRetries})
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
