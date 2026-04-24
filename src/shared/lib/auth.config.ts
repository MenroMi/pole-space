import type { NextAuthConfig } from 'next-auth';

export const authBaseConfig = {
  providers: [],
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        const u = user as { firstName?: string | null; lastName?: string | null };
        token.name = [u.firstName, u.lastName].filter(Boolean).join(' ') || null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
