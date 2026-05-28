'use client';

import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/i18n/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

type AdminUserMenuProps = {
  currentUserName?: string | null;
  currentUserImage?: string | null;
  initials: string;
  collapsed?: boolean;
  compact?: boolean;
};

export function AdminUserMenu({
  currentUserName,
  currentUserImage,
  initials,
  collapsed,
  compact = false,
}: AdminUserMenuProps) {
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  // Close the dialog when the viewport crosses the lg breakpoint — prevents a
  // ghost portal from staying open after a CSS-hidden instance is no longer visible.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const close = () => setConfirmOpen(false);
    mq.addEventListener('change', close);
    return () => mq.removeEventListener('change', close);
  }, []);

  const handleDialogOpenChange = (open: boolean) => {
    setConfirmOpen(open);
    if (!open) setSignOutError(false);
  };

  const avatar = (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        flexShrink: 0,
        overflow: 'hidden',
        background: 'linear-gradient(135deg,#52416c,#dcb8ff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-space-grotesk)',
        fontSize: 12,
        fontWeight: 700,
        color: '#1b1b1b',
      }}
    >
      {currentUserImage ? (
        <Image
          src={currentUserImage}
          alt={currentUserName ?? 'Admin'}
          width={30}
          height={30}
          style={{ objectFit: 'cover', width: 30, height: 30 }}
        />
      ) : (
        initials
      )}
    </div>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <button
              type="button"
              aria-label={t('accountMenu')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'border-color 150ms, background 150ms',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(220,184,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(220,184,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              {avatar}
            </button>
          ) : (
            <button
              type="button"
              aria-label={t('accountMenu')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: (collapsed ?? false) ? 0 : 10,
                padding: (collapsed ?? false) ? '10px 0' : '10px 14px',
                justifyContent: (collapsed ?? false) ? 'center' : 'flex-start',
                borderRadius: 8,
                overflow: 'hidden',
                width: '100%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {avatar}
              {!(collapsed ?? false) && (
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#e2e2e2',
                      fontFamily: 'var(--font-manrope)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currentUserName || 'Admin'}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#8458b3',
                      fontFamily: 'var(--font-manrope)',
                      fontWeight: 700,
                    }}
                  >
                    Admin
                  </div>
                </div>
              )}
            </button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side={compact ? 'bottom' : 'top'}>
          <DropdownMenuItem asChild>
            <Link href="/profile">{t('profile')}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile/settings">{t('settings')}</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            {t('logOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('logOutConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('logOutConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e: React.MouseEvent) => {
                e.preventDefault();
                try {
                  await signOut({ callbackUrl: '/' });
                } catch {
                  setSignOutError(true);
                }
              }}
            >
              {t('logOutConfirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
          {signOutError && (
            <p className="mt-2 text-center text-sm text-destructive">{t('logOutError')}</p>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
