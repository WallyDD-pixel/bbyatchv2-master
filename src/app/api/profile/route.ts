import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = session.user.email as string;
  try {
    const u = await (prisma as any).user.findUnique({ where: { email } }).catch(() => null);
    if (u) {
      const { id, name, role } = u as any;
      return NextResponse.json({ user: { id, name, email, role: role || "user" } });
    }
  } catch {}
  // Fallback avec les infos de session uniquement
  return NextResponse.json({ user: { email, role: (session.user as any)?.role || "user" } });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { name, email, firstName, lastName, phone, address, city, zip, country } = body ?? {};
  if (!email) return NextResponse.json({ error: "missing" }, { status: 400 });

  const client: any = prisma as any;
  try {
    if (client.user?.update) {
      await client.user.update({ where: { email }, data: { name, firstName, lastName, phone, address, city, zip, country } });
    } else {
      await prisma.$executeRaw`UPDATE "User" SET name = ${name}, firstName = ${firstName}, lastName = ${lastName}, phone = ${phone}, address = ${address}, city = ${city}, zip = ${zip}, country = ${country} WHERE email = ${email}`;
    }
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
