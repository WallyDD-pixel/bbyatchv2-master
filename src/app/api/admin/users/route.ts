import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function ensureAdmin() {
  const session = (await getServerSession()) as any;
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } }).catch(() => null);
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

export async function POST(req: Request) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  try {
    const form = await req.formData();
    const emailRaw = (form.get("email") as string | null) || "";
    const email = emailRaw.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    const exists = await (prisma as any).user.findUnique({ where: { email }, select: { id: true } });
    if (exists) return NextResponse.json({ error: "email_exists" }, { status: 409 });

    const firstName = (form.get("firstName") as string | null) || null;
    const lastName = (form.get("lastName") as string | null) || null;
    const roleInput = ((form.get("role") as string | null) || "user").toLowerCase();
    const role = ["user", "admin", "agency"].includes(roleInput) ? roleInput : "user";
    const passwordPlain = (form.get("password") as string | null) || "";
    let password: string | undefined = undefined;
    if (passwordPlain) {
      if (passwordPlain.length < 6) return NextResponse.json({ error: "weak_password" }, { status: 400 });
      password = await bcrypt.hash(passwordPlain, 10);
    }
    const nameParts = [firstName || undefined, lastName || undefined].filter(Boolean);
    const name = nameParts.join(" ") || null;

    const user = await (prisma as any).user.create({
      data: { email, firstName, lastName, name, role, password },
      select: { id: true, email: true, role: true },
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function GET() { // optional listing (limited)
  const guard = await ensureAdmin();
  if (guard) return guard;
  const users = await (prisma as any).user.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, email: true, role: true, createdAt: true } });
  return NextResponse.json({ users });
}
