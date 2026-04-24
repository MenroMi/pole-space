import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import { authBaseConfig } from '@/shared/lib/auth.config';

const { auth } = NextAuth(authBaseConfig);

const protectedRoutes = ['/profile', '/admin'];
const authRoutes = ['/login', '/signup', '/verify-email'];

export function getProtectedRedirect(
  pathname: string,
  isAuthenticated: boolean,
  requestUrl: string,
  search: string = '',
): URL | null {
  if (isAuthenticated && authRoutes.includes(pathname)) {
    return new URL('/', requestUrl);
  }
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  if (isProtected && !isAuthenticated) {
    const callbackUrl = encodeURIComponent(pathname + search);
    return new URL(`/login?callbackUrl=${callbackUrl}`, requestUrl);
  }
  return null;
}

export default auth((req) => {
  const redirectUrl = getProtectedRedirect(
    req.nextUrl.pathname,
    !!req.auth,
    req.url,
    req.nextUrl.search,
  );
  if (redirectUrl) {
    return NextResponse.redirect(redirectUrl);
  }
});

export const config = {
  matcher: ['/profile/:path*', '/admin/:path*', '/login', '/signup', '/verify-email'],
};
