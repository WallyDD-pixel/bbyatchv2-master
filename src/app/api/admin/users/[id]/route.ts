import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/security/auth-helpers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
