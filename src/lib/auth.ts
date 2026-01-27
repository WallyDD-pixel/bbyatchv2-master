import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { getServerSession as nextAuthGetServerSession } from "next-auth/next";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
export async function getServerSession() {
  return await nextAuthGetServerSession(authOptions as any);
}

// Route handlers
const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };
