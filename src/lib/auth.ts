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
// Uses NextAuth's internal session handling by calling the session endpoint
export async function getServerSession() {
  try {
    const cookieStore = await cookies();
    const headersList = await headers();
    
    // Get all cookies to pass to the session endpoint
    const allCookies = cookieStore.getAll();
    const cookieHeader = allCookies.map(c => `${c.name}=${c.value}`).join('; ');
    
    // Call NextAuth's session endpoint internally
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const sessionUrl = `${baseUrl}/api/auth/session`;
    
    try {
      const response = await fetch(sessionUrl, {
        headers: {
          'Cookie': cookieHeader,
          'User-Agent': headersList.get('user-agent') || 'server',
        },
        cache: 'no-store',
      });
      
      if (response.ok) {
        const session = await response.json();
        if (session?.user) {
          // Get full user info from database
          if (session.user.email) {
            const user = await (prisma as any).user.findUnique({ 
              where: { email: session.user.email },
              select: { id: true, email: true, name: true, image: true, role: true }
            }).catch(() => null);
            
            if (user) {
              return {
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  image: user.image,
                  role: user.role || (session.user as any)?.role || 'user'
                },
                expires: session.expires
              } as any;
            }
          }
          
          // Fallback: return session as-is if DB lookup fails
          return session;
        }
      }
    } catch (fetchError) {
      // If internal fetch fails, try simple JWT decode as fallback
      const token = cookieStore.get('next-auth.session-token') || cookieStore.get('__Secure-next-auth.session-token');
      if (token?.value) {
        try {
          const parts = token.value.split('.');
          if (parts.length === 3) {
            const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const payloadJson = Buffer.from(base64Payload, 'base64').toString('utf8');
            const payload = JSON.parse(payloadJson);
            
            if (payload.email) {
              const user = await (prisma as any).user.findUnique({ 
                where: { email: payload.email as string },
                select: { id: true, email: true, name: true, image: true, role: true }
              }).catch(() => null);
              
              if (user) {
                return {
                  user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role || (payload.role as string) || 'user'
                  },
                  expires: payload.exp ? new Date((payload.exp as number) * 1000).toISOString() : undefined
                } as any;
              }
            }
          }
        } catch (e) {
          // JWT decode also failed
        }
      }
    }
    
    return null;
  } catch (error) {
    // Silently fail and return null
    return null;
  }
}

// Route handlers - NextAuth v4 avec Next.js 15 App Router
// Dans NextAuth v4, NextAuth() retourne directement un handler qui peut être utilisé comme GET et POST
const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };
