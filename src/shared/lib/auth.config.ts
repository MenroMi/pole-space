import type { NextAuthConfig } from 'next-auth';

export const authBaseConfig = {
  providers: [],
  session: { strategy: 'jwt' as const, maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        const u = user as { firstName?: string | null; lastName?: string | null };
        token.name = [u.firstName, u.lastName].filter(Boolean).join(' ') || null;
      }
      if (trigger === 'update') {
        const s = session as { name?: string | null } | undefined;
        if (s?.name !== undefined) token.name = s.name;
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
