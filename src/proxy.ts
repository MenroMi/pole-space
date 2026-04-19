import { auth } from '@/shared/lib/auth'
import { NextResponse } from 'next/server'

const protectedRoutes = ['/profile', '/admin']

export default auth((req) => {
  const isProtected = protectedRoutes.some((route) =>
    req.nextUrl.pathname.startsWith(route)
  )

  if (isProtected && !req.auth) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, req.url)
    )
  }
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)'],
}
