import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
// No need to import jose for this approach

// Define options explicitly so getServerSession can use the same config in v4
export const authOptions: NextAuthOptions = {
  // Note: PrismaAdapter is not needed with JWT strategy, but kept for compatibility
  // adapter: PrismaAdapter(prisma) as any,
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  pages: {
    error: '/signin', // Redirect errors to signin page
  },
  // Let NextAuth handle cookies automatically - don't override
  // This ensures compatibility with NextAuth v4
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await (prisma as any)
          .user?.findUnique?.({ where: { email: credentials.email } })
          .catch?.(() => null);
        if (!user || !user.password) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      // Allow sign in if user exists
      return !!user;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.role = (user as any).role;
      }
      if (!token.role && token?.email) {
        const dbUser = await (prisma as any).user.findUnique({ where: { email: token.email } }).catch(() => null);
        token.role = dbUser?.role || "user";
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token?.role || "user";
      }
      return session;
    },
    async redirect({ url, baseUrl }: any) {
      // Allow relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
};

// Keep an alias for existing imports
export const auth = authOptions;

// Export getServerSession for use in server components and API routes
// Now uses Supabase Auth instead of NextAuth
export { getServerSession } from './auth-supabase';

// Route handlers - NextAuth v4 avec Next.js 15 App Router
// Dans NextAuth v4, NextAuth() retourne directement un handler qui peut être utilisé comme GET et POST
const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };
