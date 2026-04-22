'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

import { updateProfileAction, changePasswordAction } from '../actions';

import AvatarUpload from './AvatarUpload';

export const profileNameSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
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

interface SettingsFormProps {
  name: string | null;
  image: string | null;
  hasPassword: boolean;
}

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
            <div className="flex flex-col gap-1">
              <Input
                {...passwordForm.register('currentPassword')}
                type="password"
                placeholder="Current password"
                aria-label="Current password"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Input
                {...passwordForm.register('newPassword')}
                type="password"
                placeholder="New password"
                aria-label="New password"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Input
                {...passwordForm.register('confirmPassword')}
                type="password"
                placeholder="Confirm new password"
                aria-label="Confirm new password"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
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
