'use client';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/shared/components/ui/button';

import { uploadAvatarAction } from '../actions';

type AvatarUploadProps = {
  currentImage: string | null;
  onUploadSuccess: (imageUrl: string) => void;
};

export default function AvatarUpload({ currentImage, onUploadSuccess }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
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
      setError('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB');
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setIsPending(true);
    setError(null);
    const formData = new FormData();
    formData.append('avatar', file);
    const result = await uploadAvatarAction(formData);
    setIsPending(false);
    if (!result.success) {
      setError(result.error ?? 'Upload failed');
    } else {
      onUploadSuccess(result.imageUrl);
      setPreview(null);
    }
  }

  const displayImage = preview ?? currentImage;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-surface-high">
        {displayImage ? (
          <Image src={displayImage} alt="Avatar" fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-on-surface-variant">
            No photo
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Choose photo
        </Button>
        {preview && (
          <Button type="button" size="sm" onClick={handleUpload} disabled={isPending}>
            {isPending ? 'Uploading…' : 'Upload'}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
