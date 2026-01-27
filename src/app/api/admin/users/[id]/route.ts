import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function ensureAdmin() {
  const session = (await getServerSession()) as any;
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const email = session.user.email as string;
  const me = await (prisma as any).user.findUnique({ where: { email }, select: { role: true } }).catch(() => null);
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  const { id } = params;
  const u = await (prisma as any).user.findUnique({ where: { id } }).catch(() => null);
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ user: u });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  const { id } = params;
  const body = await req.json().catch(() => ({} as any));
  const { email, name, firstName, lastName, phone, address, city, zip, country, role } = body ?? {};
  try {
    await (prisma as any).user.update({
      where: { id },
      data: { email, name, firstName, lastName, phone, address, city, zip, country, role },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  const { id } = params;
  try {
    await (prisma as any).user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function PUT_password(req: Request, { params }: { params: { id: string } }) {
  // This won't be auto-routed; use a nested route file instead.
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
