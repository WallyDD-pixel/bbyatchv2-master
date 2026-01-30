import { NextResponse } from "next/server";
import { ensureAdmin } from "@/lib/security/auth-helpers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { validateEmail, validatePassword, validateName, validatePhone } from "@/lib/security/validation";

export async function POST(req: Request) {
  const guard = await ensureAdmin();
  if (guard) return guard;
  try {
    const form = await req.formData();
    const emailRaw = (form.get("email") as string | null) || "";
    
    // Validation email améliorée
    const emailValidation = validateEmail(emailRaw);
    if (!emailValidation.valid) {
      return NextResponse.json({ error: "invalid_email", details: emailValidation.error }, { status: 400 });
    }
    const email = emailValidation.normalized!;

    const exists = await (prisma as any).user.findUnique({ where: { email }, select: { id: true } });
    if (exists) return NextResponse.json({ error: "email_exists" }, { status: 409 });

    const firstNameRaw = (form.get("firstName") as string | null) || null;
    const lastNameRaw = (form.get("lastName") as string | null) || null;
    
    // Validation des noms
    if (firstNameRaw) {
      const firstNameValidation = validateName(firstNameRaw, 100);
      if (!firstNameValidation.valid) {
        return NextResponse.json({ error: "invalid_firstName", details: firstNameValidation.error }, { status: 400 });
      }
    }
    if (lastNameRaw) {
      const lastNameValidation = validateName(lastNameRaw, 100);
      if (!lastNameValidation.valid) {
        return NextResponse.json({ error: "invalid_lastName", details: lastNameValidation.error }, { status: 400 });
      }
    }

    const firstName = firstNameRaw ? firstNameRaw.trim().slice(0, 100) : null;
    const lastName = lastNameRaw ? lastNameRaw.trim().slice(0, 100) : null;
    const roleInput = ((form.get("role") as string | null) || "user").toLowerCase();
    const role = ["user", "admin", "agency"].includes(roleInput) ? roleInput : "user";
    
    const passwordPlain = (form.get("password") as string | null) || "";
    let password: string | undefined = undefined;
    if (passwordPlain) {
      // Validation mot de passe renforcée
      const passwordValidation = validatePassword(passwordPlain);
      if (!passwordValidation.valid) {
        return NextResponse.json({ error: "weak_password", details: passwordValidation.error, suggestions: passwordValidation.suggestions }, { status: 400 });
      }
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

export async function GET() {
  // optional listing (limited)
  const guard = await ensureAdmin();
  if (guard) return guard;
  const users = await (prisma as any).user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json({ users });
}
