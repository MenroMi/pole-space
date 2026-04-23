'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

import { updateProfileAction, changePasswordAction } from '../actions';

import AvatarUpload from './AvatarUpload';

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 8s2.667-5 7-5 7 5 7 5-2.667 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 2l12 12" />
      <path d="M6.5 6.5a2 2 0 002.83 2.83" />
      <path d="M4 4.3A8 8 0 001 8s2.667 5 7 5c1.1 0 2.1-.25 3-.7" />
      <path d="M12 11.7A8 8 0 0015 8s-2.667-5-7-5c-1.1 0-2.1.25-3 .7" />
    </svg>
  );
}

type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & { error?: string };

const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ onKeyDown, onKeyUp, onBlur, error, type: _type, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    return (
      <div className="flex flex-col gap-1">
        <div className="relative">
          <Input
            ref={ref}
            type={show ? 'text' : 'password'}
            className="pr-10"
            onKeyDown={(e) => {
              setCapsLock(e.getModifierState('CapsLock'));
              onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              setCapsLock(e.getModifierState('CapsLock'));
              onKeyUp?.(e);
            }}
            onBlur={(e) => {
              setCapsLock(false);
              onBlur?.(e);
            }}
            {...props}
          />
          <button
            type="button"
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-outline-variant transition-colors hover:text-on-surface focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {capsLock && (
          <p role="status" className="text-xs text-primary/70">
            Caps Lock is on
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  },
);
PasswordField.displayName = 'PasswordField';

export const profileNameSchema = z.object({
  name: z.string().min(5, 'Name must be at least 5 characters').max(50, 'Name is too long'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileNameValues = z.infer<typeof profileNameSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

type SettingsFormProps = {
  name: string | null;
  image: string | null;
  hasPassword: boolean;
};

export default function SettingsForm({ name, image, hasPassword }: SettingsFormProps) {
  const router = useRouter();
  const [nameSuccess, setNameSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const nameForm = useForm<ProfileNameValues>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { name: name ?? '' },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function handleNameSubmit(values: ProfileNameValues) {
    setNameSuccess(false);
    const result = await updateProfileAction(values);
    if (!result.success) {
      nameForm.setError('name', { message: result.error });
    } else {
      setNameSuccess(true);
      router.refresh();
    }
  }

  async function handlePasswordSubmit(values: ChangePasswordFormValues) {
    setPasswordSuccess(false);
    const result = await changePasswordAction({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (!result.success) {
      passwordForm.setError('currentPassword', { message: result.error });
    } else {
      setPasswordSuccess(true);
      passwordForm.reset();
    }
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <h1 className="font-display text-xl font-semibold text-on-surface">Settings</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-on-surface">Profile photo</h2>
        <AvatarUpload currentImage={image} onUploadSuccess={() => router.refresh()} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-on-surface">Display name</h2>
        <form
          onSubmit={nameForm.handleSubmit(handleNameSubmit)}
          className="flex max-w-sm flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <Input
              {...nameForm.register('name')}
              placeholder="Your name"
              aria-label="Display name"
            />
            {nameForm.formState.errors.name && (
              <p className="text-sm text-destructive">{nameForm.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={nameForm.formState.isSubmitting}>
              {nameForm.formState.isSubmitting ? 'Saving…' : 'Save name'}
            </Button>
            {nameSuccess && <p className="text-sm text-primary">Name updated!</p>}
          </div>
        </form>
      </section>

      {hasPassword && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-on-surface">Change password</h2>
          <form
            onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
            className="flex max-w-sm flex-col gap-3"
          >
            <PasswordField
              {...passwordForm.register('currentPassword')}
              placeholder="Current password"
              aria-label="Current password"
              error={passwordForm.formState.errors.currentPassword?.message}
            />
            <PasswordField
              {...passwordForm.register('newPassword')}
              placeholder="New password"
              aria-label="New password"
              error={passwordForm.formState.errors.newPassword?.message}
            />
            <PasswordField
              {...passwordForm.register('confirmPassword')}
              placeholder="Confirm new password"
              aria-label="Confirm new password"
              error={passwordForm.formState.errors.confirmPassword?.message}
            />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting ? 'Saving…' : 'Change password'}
              </Button>
              {passwordSuccess && <p className="text-sm text-primary">Password updated!</p>}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
