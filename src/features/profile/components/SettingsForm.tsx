'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheck, Lock, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Input } from '@/shared/components/ui/input';

import { changePasswordAction, updateProfileAction } from '../actions';

import AvatarUpload from './AvatarUpload';

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 8s2.667-5 7-5 7 5 7 5-2.667 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
            className="pr-10 placeholder:text-on-surface-variant/40"
            onKeyDown={(e) => { setCapsLock(e.getModifierState('CapsLock')); onKeyDown?.(e); }}
            onKeyUp={(e) => { setCapsLock(e.getModifierState('CapsLock')); onKeyUp?.(e); }}
            onBlur={(e) => { setCapsLock(false); onBlur?.(e); }}
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
          <p role="status" className="mt-1.5 text-xs tracking-wide text-primary/70">
            Caps Lock is on
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  },
);
PasswordField.displayName = 'PasswordField';

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username is too long')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
    .optional()
    .or(z.literal('')),
  location: z.string().max(100, 'Location is too long').optional(),
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

type ProfileValues = z.infer<typeof profileSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

type SettingsFormProps = {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  image: string | null;
  location: string | null;
  email: string | null;
  hasPassword: boolean;
};

export default function SettingsForm({
  firstName,
  lastName,
  username,
  image,
  location,
  email,
  hasPassword,
}: SettingsFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      username: username ?? '',
      location: location ?? '',
    },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  function handleDiscard() {
    profileForm.reset();
    passwordForm.reset();
    router.push('/profile');
  }

  async function handleSave() {
    setIsPending(true);
    setProfileError(null);
    setPasswordError(null);

    const profileValues = profileForm.getValues();
    const isProfileValid = await profileForm.trigger();
    if (!isProfileValid) {
      setIsPending(false);
      return;
    }

    const profileResult = await updateProfileAction({
      firstName: profileValues.firstName || undefined,
      lastName: profileValues.lastName || undefined,
      username: profileValues.username || undefined,
      location: profileValues.location || undefined,
    });

    if (!profileResult.success) {
      if (profileResult.field === 'username') {
        profileForm.setError('username', { message: profileResult.error });
      } else {
        setProfileError(profileResult.error);
      }
      setIsPending(false);
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = passwordForm.getValues();
    if (currentPassword || newPassword || confirmPassword) {
      const isPasswordValid = await passwordForm.trigger();
      if (!isPasswordValid) {
        setIsPending(false);
        return;
      }
      const passwordResult = await changePasswordAction({ currentPassword, newPassword });
      if (!passwordResult.success) {
        passwordForm.setError('currentPassword', { message: passwordResult.error });
        setIsPending(false);
        return;
      }
    }

    setIsPending(false);
    router.push('/profile');
  }

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'anonymous';

  return (
    <div className="p-6 md:p-12 space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-4xl md:text-5xl lowercase tracking-tight text-primary">
          settings
        </h1>
        <p className="text-on-surface-variant text-lg">
          Manage your athlete profile and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Profile block */}
        <section className="md:col-span-4 bg-surface-low rounded-2xl p-8 flex flex-col items-center text-center space-y-6">
          <AvatarUpload currentImage={image} onUploadSuccess={() => router.refresh()} />
          <div className="space-y-2">
            <p className="font-display text-xl text-on-surface">{displayName}</p>
            {email && <p className="text-sm text-on-surface-variant">{email}</p>}
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary-container/50 px-3 py-1.5 text-xs uppercase tracking-widest text-on-secondary-container ring-1 ring-outline-variant/15">
              <BadgeCheck size={14} aria-hidden="true" />
              Elite Member
            </div>
          </div>
        </section>

        {/* Personal Information */}
        <section className="md:col-span-8 bg-surface-low rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
            <User size={20} className="text-primary" aria-hidden="true" />
            <h2 className="font-display text-lg text-on-surface">Personal Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                First Name
              </label>
              <Input {...profileForm.register('firstName')} placeholder="Your first name" className="placeholder:text-on-surface-variant/40" />
              {profileForm.formState.errors.firstName && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                Last Name
              </label>
              <Input {...profileForm.register('lastName')} placeholder="Your last name" className="placeholder:text-on-surface-variant/40" />
              {profileForm.formState.errors.lastName && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.lastName.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                Username
              </label>
              <Input {...profileForm.register('username')} placeholder="your_username" className="placeholder:text-on-surface-variant/40" />
              {profileForm.formState.errors.username && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.username.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                Location
              </label>
              <Input
                {...profileForm.register('location')}
                placeholder="City, Country (optional)"
                className="placeholder:text-on-surface-variant/40"
              />
              {profileForm.formState.errors.location && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.location.message}
                </p>
              )}
            </div>
          </div>
          {profileError && <p className="text-sm text-destructive">{profileError}</p>}
        </section>

        {/* Security */}
        {hasPassword && (
          <section className="md:col-span-12 bg-surface-low rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
              <Lock size={20} className="text-primary" aria-hidden="true" />
              <h2 className="font-display text-lg text-on-surface">Security</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                  Current Password
                </label>
                <PasswordField
                  {...passwordForm.register('currentPassword')}
                  placeholder="Current password"
                  error={passwordForm.formState.errors.currentPassword?.message}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                  New Password
                </label>
                <PasswordField
                  {...passwordForm.register('newPassword')}
                  placeholder="New password"
                  error={passwordForm.formState.errors.newPassword?.message}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                  Confirm Password
                </label>
                <PasswordField
                  {...passwordForm.register('confirmPassword')}
                  placeholder="Confirm new password"
                  error={passwordForm.formState.errors.confirmPassword?.message}
                />
              </div>
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </section>
        )}

        {/* Actions */}
        <div className="md:col-span-12 flex justify-end gap-4">
          <button
            type="button"
            onClick={handleDiscard}
            className="px-8 py-3 font-display font-bold lowercase text-primary border border-outline-variant/20 rounded-lg hover:bg-surface-container transition-colors"
          >
            discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="kinetic-gradient cursor-pointer rounded-lg px-8 py-3 font-display text-sm font-semibold lowercase tracking-wide text-on-primary-container transition-transform duration-150 active:scale-95 disabled:opacity-50"
          >
            {isPending ? 'saving…' : 'save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
