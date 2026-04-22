'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { loginAction } from '../actions';
import { loginSchema } from '../lib/validation';
import type { LoginFormData } from '../lib/validation';

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="currentColor"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="currentColor"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="currentColor"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="currentColor"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export function LoginForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    const result = await loginAction(data);
    if (result?.error) {
      setError('root', { message: result.error });
    }
  };

  return (
    <div className="w-full max-w-sm space-y-10">
      <div className="space-y-1.5">
        <h2 className="font-display text-4xl font-light tracking-tight text-on-surface lowercase">
          welcome back.
        </h2>
        <p className="text-sm text-on-surface-variant">sign in to continue your practice.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          <div className="group">
            <label
              htmlFor="email"
              className="mb-1 block text-[10px] font-medium tracking-widest text-outline-variant uppercase transition-colors group-focus-within:text-primary"
            >
              email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="performer@kinetic.com"
              className="w-full border-b border-outline-variant bg-transparent px-0 py-3 text-on-surface transition-colors placeholder:text-outline-variant/40 focus:border-primary focus:outline-none"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="group">
            <div className="mb-1 flex items-end justify-between">
              <label
                htmlFor="password"
                className="block text-[10px] font-medium tracking-widest text-outline-variant uppercase transition-colors group-focus-within:text-primary"
              >
                password
              </label>
              <span className="cursor-pointer text-[10px] tracking-widest text-primary/60 uppercase transition-colors hover:text-primary">
                forgot?
              </span>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="w-full border-b border-outline-variant bg-transparent px-0 py-3 text-on-surface transition-colors placeholder:text-outline-variant/40 focus:border-primary focus:outline-none"
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        {errors.root && (
          <p role="alert" className="text-sm text-red-400">
            {errors.root.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md py-4 text-xs font-bold tracking-widest text-on-primary uppercase shadow-[0_32px_64px_-12px_rgba(132,88,179,0.25)] transition-all duration-300 kinetic-gradient active:scale-[0.98] disabled:opacity-60"
        >
          {isSubmitting ? 'signing in...' : 'sign in'}
        </button>
      </form>

      <div className="space-y-6">
        <div className="relative flex items-center">
          <div className="h-px flex-grow bg-outline-variant/20" />
          <span className="mx-4 flex-shrink text-[10px] tracking-widest text-outline-variant uppercase">
            or continue with
          </span>
          <div className="h-px flex-grow bg-outline-variant/20" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant/15 bg-surface-container px-4 py-3 text-xs font-medium transition-colors hover:bg-surface-high"
          >
            <GoogleIcon />
            google
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg border border-outline-variant/15 bg-surface-container px-4 py-3 text-xs font-medium transition-colors hover:bg-surface-high"
          >
            <FacebookIcon />
            facebook
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-on-surface-variant">
        new to the gallery?{' '}
        <Link
          href="/signup"
          className="ml-1 font-bold text-primary decoration-2 underline-offset-4 hover:underline"
        >
          create account
        </Link>
      </p>
    </div>
  );
}
