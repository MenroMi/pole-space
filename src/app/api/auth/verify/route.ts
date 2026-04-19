import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { deleteVerificationToken } from '@/features/auth/lib/tokens'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url))
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url))
  }

  if (verificationToken.expires < new Date()) {
    await deleteVerificationToken(token)
    const email = encodeURIComponent(verificationToken.identifier)
    return NextResponse.redirect(
      new URL(`/verify-email?error=expired&email=${email}`, req.url)
    )
  }

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  })
  await deleteVerificationToken(token)

  return NextResponse.redirect(new URL('/login?verified=true', req.url))
}
