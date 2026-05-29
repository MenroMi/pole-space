'use client';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/components/ui/button';

import { removeAvatarAction, uploadAvatarAction } from '../actions';

type AvatarUploadProps = {
  currentImage: string | null;
  onUploadSuccess: () => void;
};

export default function AvatarUpload({ currentImage, onUploadSuccess }: AvatarUploadProps) {
  const t = useTranslations('profile');
  const { update } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'upload' | 'remove' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(t('avatarOnlyImages'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('avatarMaxSize'));
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
  }

  async function handleRemove() {
    setPendingAction('remove');
    setError(null);
    try {
      await removeAvatarAction();
      await update({ picture: null });
      setPreview(null);
      onUploadSuccess();
    } catch {
      setError(t('avatarUploadFailed'));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setPendingAction('upload');
    setError(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const result = await uploadAvatarAction(formData);
      if (!result.success) {
        setError(result.error ?? t('avatarUploadFailed'));
      } else {
        await update({ picture: result.imageUrl });
        onUploadSuccess();
        setPreview(null);
      }
    } catch {
      setError(t('avatarUploadFailed'));
    } finally {
      setPendingAction(null);
    }
  }

  const displayImage = preview ?? currentImage;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Avatar + camera button overlay */}
      <div className="relative">
        <div className="relative h-24 w-24 overflow-hidden rounded-2xl bg-surface-high">
          {displayImage ? (
            <Image src={displayImage} alt={t('avatarAlt')} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant/30">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          )}
        </div>

        {/* Camera button — 44x44 mobile (iOS HIG / WCAG AAA), 32x32 desktop */}
        <button
          type="button"
          aria-label={t('choosePhoto')}
          disabled={pendingAction !== null}
          onClick={() => inputRef.current?.click()}
          className="absolute -right-1.5 -bottom-1.5 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-primary-container text-on-surface shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:w-8"
        >
          {pendingAction === 'upload' ? (
            <Loader2 className="h-5 w-5 animate-spin sm:h-4 sm:w-4" />
          ) : (
            <svg
              width="20"
              height="20"
              className="sm:h-4 sm:w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        aria-hidden="true"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upload / Remove actions */}
      <div className="flex gap-2">
        {preview && (
          <Button type="button" size="sm" onClick={handleUpload} disabled={pendingAction !== null}>
            {pendingAction === 'upload' && <Loader2 className="h-4 w-4 animate-spin" />}
            {pendingAction === 'upload' ? t('uploadingPhoto') : t('uploadPhoto')}
          </Button>
        )}
        {currentImage && !preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={pendingAction !== null}
          >
            {pendingAction === 'remove' && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('removePhoto')}
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
