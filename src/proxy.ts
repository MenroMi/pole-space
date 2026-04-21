import { NextResponse } from 'next/server';

import { auth } from '@/shared/lib/auth';

const protectedRoutes = ['/profile', '/admin'];

export function getProtectedRedirect(
  pathname: string,
  isAuthenticated: boolean,
  requestUrl: string,
  search: string = '',
): URL | null {
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
  matcher: ['/profile/:path*', '/admin/:path*'],
};
