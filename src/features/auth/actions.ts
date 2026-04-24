'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';

import { signIn } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

import { RESEND_COOLDOWN_MS } from './lib/cooldown-config';
import { sendVerificationEmail } from './lib/email';
import { generateVerificationToken, deleteUserTokens } from './lib/tokens';
import { signupSchema } from './lib/validation';
import type { SignupFormData, LoginFormData } from './lib/validation';

export async function signupAction(data: SignupFormData) {
  const parsed = signupSchema.safeParse(data);
  if (!parsed.success) return { error: 'Invalid input' };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: 'Email already in use' };

  const hashed = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
      password: hashed,
      emailVerified: null,
    },
  });

  const token = await generateVerificationToken(parsed.data.email);

  try {
    await sendVerificationEmail(parsed.data.email, token);
  } catch {
    await deleteUserTokens(parsed.data.email);
    await prisma.user.delete({ where: { email: parsed.data.email } });
    return { error: 'Failed to send email, please try again' };
  }

  redirect(`/verify-email?sent=true&email=${encodeURIComponent(parsed.data.email)}`);
}

export async function loginAction(data: LoginFormData) {
  try {
    await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirectTo: '/catalog',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const cause = error.cause as { err?: Error } | undefined;
      const message = cause?.err?.message ?? 'Invalid credentials';
      if (message === 'Please verify your email first') {
        return { error: message, email: data.email };
      }
      return { error: message };
    }
    throw error;
  }
}

export async function resendVerificationAction(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) redirect('/verify-email?error=invalid');
  if (user.emailVerified !== null) redirect('/catalog');

  const existing = await prisma.verificationToken.findFirst({ where: { identifier: email } });
  if (existing) {
    if (Date.now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      redirect(`/verify-email?sent=true&email=${encodeURIComponent(email)}`);
    }
  }

  await deleteUserTokens(email);
  const token = await generateVerificationToken(email);

  try {
    await sendVerificationEmail(email, token);
  } catch {
    await deleteUserTokens(email);
    redirect(`/verify-email?error=send-failed&email=${encodeURIComponent(email)}`);
  }

  redirect(`/verify-email?sent=true&email=${encodeURIComponent(email)}`);
}

export async function checkEmailVerifiedAction(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  });
  return user !== null && user.emailVerified !== null;
}
