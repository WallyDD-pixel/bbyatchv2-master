import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";

// Define options explicitly so getServerSession can use the same config in v4
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
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
    async jwt({ token, user }: any) {
      if (user) token.role = (user as any).role;
      if (!token.role && token?.email) {
        const dbUser = await (prisma as any).user.findUnique({ where: { email: token.email } }).catch(() => null);
        token.role = dbUser?.role || "user";
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) (session.user as any).role = token?.role || "user";
      return session;
    },
  },
};

// Keep an alias for existing imports
export const auth = authOptions;

// Export getServerSession for use in server components and API routes
// Workaround for Next.js 16 + next-auth 4 compatibility
export async function getServerSession() {
  try {
    // Dynamic import to avoid build-time errors
    const nextAuth = await import("next-auth");
    
    // Try to use getServerSession if it exists
    if (typeof nextAuth.getServerSession === 'function') {
      const cookieStore = await cookies();
      const headerStore = await headers();
      
      const req = {
        headers: Object.fromEntries(headerStore.entries()),
        cookies: Object.fromEntries(
          cookieStore.getAll().map(c => [c.name, c.value])
        ),
      } as any;
      
      return await nextAuth.getServerSession({ req } as any, authOptions as any);
    }
    
    // Fallback: return null
    return null;
  } catch (error) {
    // Silently fail and return null
    return null;
  }
}

// Route handlers
const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };
