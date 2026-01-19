import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from '../hooks/useForm';
import { registerSchema, type RegisterInput } from '../validation/schemas';

export default function Register() {
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const initialValues: RegisterInput = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  const form = useForm({
    schema: registerSchema,
    initialValues,
    onSubmit: async (values) => {
      setError('');
      try {
        await register(values.email, values.password, values.name);
        navigate('/setup');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message :
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Registration failed. Please try again.';
        setError(errorMessage);
      }
    },
  });

  const password = form.values.password;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Stadium Floodlight Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-cyan-500/8 via-transparent to-transparent blur-3xl" />

        {/* Floating Orbs */}
        <div className="absolute top-32 right-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s' }} />
        <div className="absolute bottom-32 left-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s', animationDelay: '2s' }} />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-pattern-grid opacity-30" />
      </div>

      <div className="w-full max-w-md relative animate-slide-up">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 mb-5 shadow-lg shadow-cyan-500/25">
            <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-4xl font-display text-white tracking-wide mb-2">
            Join The League
          </h1>
          <p className="text-slate-400 font-body">
            Create your manager profile
          </p>
        </div>

        {/* Register Card */}
        <div className="glass-card p-8 animate-scale-in" style={{ animationDelay: '0.1s' }}>
          {/* Server Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-400 text-sm font-body">{error}</p>
              </div>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={form.handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="name" className="input-label">
                Your Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="name"
                  type="text"
                  {...form.getFieldProps('name')}
                  className={`input-field pl-12 ${form.getFieldState('name').hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  placeholder="Your display name"
                />
              </div>
              {form.getFieldState('name').hasError && (
                <p className="text-sm text-red-400 animate-slide-up">{form.getFieldState('name').error}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="input-label">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  {...form.getFieldProps('email')}
                  className={`input-field pl-12 ${form.getFieldState('email').hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  placeholder="you@example.com"
                />
              </div>
              {form.getFieldState('email').hasError && (
                <p className="text-sm text-red-400 animate-slide-up">{form.getFieldState('email').error}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="password" className="input-label">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type="password"
                    {...form.getFieldProps('password')}
                    className={`input-field pl-12 pr-4 ${form.getFieldState('password').hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                    placeholder="Min 6 chars"
                  />
                </div>
                {form.getFieldState('password').hasError && (
                  <p className="text-sm text-red-400 animate-slide-up">{form.getFieldState('password').error}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="input-label">
                  Confirm
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    {...form.getFieldProps('confirmPassword')}
                    className={`input-field pl-12 pr-4 ${form.getFieldState('confirmPassword').hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                    placeholder="Repeat"
                  />
                </div>
                {form.getFieldState('confirmPassword').hasError && (
                  <p className="text-sm text-red-400 animate-slide-up">{form.getFieldState('confirmPassword').error}</p>
                )}
              </div>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex gap-1">
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 6 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 8 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 10 && /[A-Z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                  <div className={`h-1 flex-1 rounded-full transition-colors ${password.length >= 12 && /[0-9]/.test(password) && /[A-Z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                </div>
                <p className="text-xs text-slate-500">
                  {password.length < 6 ? 'Too short' : password.length < 8 ? 'Weak' : password.length < 10 ? 'Good' : 'Strong'}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={form.isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-6"
            >
              {form.isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create My Team
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/50" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#12121A] text-slate-500 font-body">Already a manager?</span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            to="/login"
            className="btn-ghost w-full flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign In Instead
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-sm mt-6 font-body">
          By creating an account, you agree to the league rules
        </p>
      </div>
    </div>
  );
}
