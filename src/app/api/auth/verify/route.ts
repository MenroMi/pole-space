import { NextRequest, NextResponse } from 'next/server';

import { deleteVerificationToken } from '@/features/auth/lib/tokens';
import { prisma } from '@/shared/lib/prisma';
import { verifyRatelimit } from '@/shared/lib/ratelimit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const { success } = await verifyRatelimit.limit(ip);
  if (!success) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url));
  }

  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url));
  }

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url));
    }

    if (verificationToken.expires < new Date()) {
      await deleteVerificationToken(token);
      const email = encodeURIComponent(verificationToken.identifier);
      return NextResponse.redirect(new URL(`/verify-email?error=expired&email=${email}`, req.url));
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: verificationToken.identifier },
        data: { emailVerified: new Date() },
      }),
      prisma.verificationToken.delete({ where: { token } }),
    ]);

    return NextResponse.redirect(new URL('/login?verified=true', req.url));
  } catch {
    return NextResponse.redirect(new URL('/verify-email?error=server', req.url));
  }
}
