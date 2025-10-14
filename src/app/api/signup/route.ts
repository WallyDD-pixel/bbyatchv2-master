import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

async function ensureUserTable() {
  // Crée la table User si elle n’existe pas (SQLite) avec toutes les colonnes nécessaires
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT,
      "firstName" TEXT,
      "lastName" TEXT,
      "email" TEXT NOT NULL UNIQUE,
      "emailVerified" DATETIME,
      "image" TEXT,
      "password" TEXT,
      "role" TEXT NOT NULL DEFAULT 'user',
      "phone" TEXT,
      "address" TEXT,
      "city" TEXT,
      "zip" TEXT,
      "country" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email");`);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const { email, password } = body ?? {};
  const firstName: string | undefined = body?.firstName;
  const lastName: string | undefined = body?.lastName;
  const fallbackName: string | undefined = body?.name;
  const name = [firstName, lastName].filter(Boolean).join(" ") || fallbackName || null;

  if (!email || !password) return NextResponse.json({ error: "missing" }, { status: 400 });
  if (typeof email !== "string" || !email.includes("@")) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (typeof password !== "string" || password.length < 6) return NextResponse.json({ error: "weak_password" }, { status: 400 });

  const client: any = prisma as any;

  // Existence check with ORM or raw SQL fallback; crée la table si absente
  let existing: any = null;
  try {
    if (client.user?.findUnique) {
      existing = await client.user.findUnique({ where: { email } });
    } else {
      const rows = (await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE email = ${email} LIMIT 1`);
      existing = rows?.[0] ?? null;
    }
  } catch (e: any) {
    if (e?.code === "P2010" && /no such table: User/i.test(e?.message || "")) {
      await ensureUserTable();
      existing = null;
    } else {
      throw e;
    }
  }
  if (existing) return NextResponse.json({ error: "exists" }, { status: 409 });

  // Create user via ORM or raw SQL fallback
  const hash = await bcrypt.hash(password, 10);
  if (client.user?.create) {
    await client.user.create({ data: { email, name, password: hash, firstName, lastName, phone: body?.phone ?? null, address: body?.address ?? null, city: body?.city ?? null, zip: body?.zip ?? null, country: body?.country ?? null } });
  } else {
    const id = randomUUID();
    const now = new Date();
    const image: string | null = null;
    const emailVerified: Date | null = null;
    await prisma.$executeRaw`INSERT INTO "User" (id, name, email, password, image, emailVerified, createdAt, updatedAt, firstName, lastName, phone, address, city, zip, country)
      VALUES (${id}, ${name}, ${email}, ${hash}, ${image}, ${emailVerified}, ${now}, ${now}, ${firstName ?? null}, ${lastName ?? null}, ${body?.phone ?? null}, ${body?.address ?? null}, ${body?.city ?? null}, ${body?.zip ?? null}, ${body?.country ?? null})`;
  }

  return NextResponse.json({ ok: true });
}
