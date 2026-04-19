import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import Facebook from 'next-auth/providers/facebook'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user?.password) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        return valid ? user : null
      },
    }),
  ],
  session: { strategy: 'jwt' as const },
  callbacks: {
    jwt({ token, user }: { token: Record<string, unknown>; user?: { role?: string } }) {
      if (user) token.role = user.role
      return token
    },
    session({
      session,
      token,
    }: {
      session: Record<string, unknown> & { user?: Record<string, unknown> }
      token: Record<string, unknown>
    }) {
      if (session.user) session.user.role = token.role
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
