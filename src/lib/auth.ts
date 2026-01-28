import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

// Define options explicitly so getServerSession can use the same config in v4
export const authOptions: NextAuthOptions = {
  // Note: PrismaAdapter is not needed with JWT strategy, but kept for compatibility
  // adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  pages: {
    error: '/signin', // Redirect errors to signin page
  },
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
// Simplified version that decodes JWT directly from cookies to avoid Function.prototype.apply errors
export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('next-auth.session-token') || cookieStore.get('__Secure-next-auth.session-token');
    
    if (!token?.value) {
      return null;
    }
    
    // Decode JWT token (simple base64 decode)
    try {
      const parts = token.value.split('.');
      if (parts.length !== 3) return null;
      
      // Decode base64 using Node.js Buffer (always available server-side)
      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = Buffer.from(base64Payload, 'base64').toString('utf8');
      const payload = JSON.parse(payloadJson);
      
      // Get user info from database using email from token
      if (payload.email) {
        const user = await (prisma as any).user.findUnique({ 
          where: { email: payload.email },
          select: { id: true, email: true, name: true, image: true, role: true }
        }).catch(() => null);
        
        if (user) {
          return {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role || 'user'
            },
            expires: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined
          } as any;
        }
      }
    } catch (e) {
      // Invalid token format - return null
      return null;
    }
    
    return null;
  } catch (error) {
    // Silently fail and return null
    return null;
  }
}

// Route handlers
const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };
