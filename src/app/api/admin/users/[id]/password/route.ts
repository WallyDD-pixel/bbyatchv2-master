import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = (await getServerSession(auth as any)) as any;
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } }).catch(() => null);
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = params;
  const body = await req.json().catch(() => ({} as any));
  const password: string | undefined = body?.password;
  if (!password || password.length < 6) return NextResponse.json({ error: "weak" }, { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  try {
    await (prisma as any).user.update({ where: { id }, data: { password: hash } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
