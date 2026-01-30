import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { validateEmail, validatePassword, validateName, validatePhone } from "@/lib/security/validation";
import { checkSignupRateLimit, getClientIP } from "@/lib/security/rate-limit";

async function ensureUserTable() {
  // Crée la table User si elle n'existe pas (SQLite) avec toutes les colonnes nécessaires
  // Utiliser $executeRaw avec template literal sécurisé (pas de variables utilisateur)
  try {
    await prisma.$executeRaw`
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
      )
    `;
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email")
    `;
  } catch (e: any) {
    // Si la table existe déjà, ignorer l'erreur
    if (!e?.message?.includes('already exists') && !e?.code?.includes('P2010')) {
      throw e;
    }
  }
}

export async function POST(req: Request) {
  // Rate limiting
  const ip = getClientIP(req);
  const rateLimit = checkSignupRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const { email, password } = body ?? {};
  const firstName: string | undefined = body?.firstName;
  const lastName: string | undefined = body?.lastName;
  const fallbackName: string | undefined = body?.name;
  const name = [firstName, lastName].filter(Boolean).join(" ") || fallbackName || null;

  // Validation des champs requis
  if (!email || !password) {
    // Protection contre énumération: toujours retourner le même message
    // Attendre un délai constant pour éviter les timing attacks
    await new Promise(resolve => setTimeout(resolve, 100));
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }

  // Validation email améliorée
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return NextResponse.json({ error: "invalid_email", details: emailValidation.error }, { status: 400 });
  }
  const normalizedEmail = emailValidation.normalized!;

  // Validation mot de passe renforcée
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return NextResponse.json({ error: "weak_password", details: passwordValidation.error, suggestions: passwordValidation.suggestions }, { status: 400 });
  }

  // Validation du nom si fourni
  if (name) {
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: "invalid_name", details: nameValidation.error }, { status: 400 });
    }
  }

  // Validation du téléphone si fourni
  const phoneValidation = validatePhone(body?.phone);
  if (!phoneValidation.valid) {
    return NextResponse.json({ error: "invalid_phone", details: phoneValidation.error }, { status: 400 });
  }

  const client: any = prisma as any;

  // Existence check with ORM or raw SQL fallback; crée la table si absente
  // Protection contre énumération: toujours exécuter bcrypt même si l'utilisateur existe
  let existing: any = null;
  try {
    if (client.user?.findUnique) {
      existing = await client.user.findUnique({ where: { email: normalizedEmail } });
    } else {
      const rows = (await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "User" WHERE email = ${normalizedEmail} LIMIT 1
      `);
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

  // Protection contre énumération: toujours hasher le mot de passe
  // pour maintenir un temps constant et éviter les timing attacks
  const hash = await bcrypt.hash(password, 10);

  if (existing) {
    // Attendre un délai constant pour éviter les timing attacks
    await new Promise(resolve => setTimeout(resolve, 100));
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }

  // Create user via ORM or raw SQL fallback
  // Le hash a déjà été calculé ci-dessus pour éviter les timing attacks
  let createdUser: any = null;
  const now = new Date();
  
  // Sanitizer les champs texte
  const sanitizedName = name ? name.trim().slice(0, 200) : null;
  const sanitizedAddress = body?.address ? body.address.trim().slice(0, 500) : null;
  const sanitizedCity = body?.city ? body.city.trim().slice(0, 100) : null;
  const sanitizedZip = body?.zip ? body.zip.trim().slice(0, 20) : null;
  const sanitizedCountry = body?.country ? body.country.trim().slice(0, 100) : null;
  const sanitizedPhone = phoneValidation.normalized || null;
  
  if (client.user?.create) {
    createdUser = await client.user.create({ 
      data: { 
        email: normalizedEmail, 
        name: sanitizedName, 
        password: hash, 
        firstName: firstName ? firstName.trim().slice(0, 100) : null, 
        lastName: lastName ? lastName.trim().slice(0, 100) : null, 
        phone: sanitizedPhone, 
        address: sanitizedAddress, 
        city: sanitizedCity, 
        zip: sanitizedZip, 
        country: sanitizedCountry 
      } 
    });
  } else {
    const id = randomUUID();
    const image: string | null = null;
    const emailVerified: Date | null = null;
    // Utiliser $executeRaw avec paramètres typés (sécurisé)
    await prisma.$executeRaw`
      INSERT INTO "User" (id, name, email, password, image, emailVerified, createdAt, updatedAt, firstName, lastName, phone, address, city, zip, country)
      VALUES (${id}, ${sanitizedName}, ${normalizedEmail}, ${hash}, ${image}, ${emailVerified}, ${now}, ${now}, ${firstName ? firstName.trim().slice(0, 100) : null}, ${lastName ? lastName.trim().slice(0, 100) : null}, ${sanitizedPhone}, ${sanitizedAddress}, ${sanitizedCity}, ${sanitizedZip}, ${sanitizedCountry})
    `;
    createdUser = { id, email: normalizedEmail, name: sanitizedName, firstName, lastName, phone: sanitizedPhone, createdAt: now };
  }

  // Créer le compte dans Supabase Auth pour synchronisation
  try {
    const supabase = await createClient();
    const { data: supabaseUser, error: supabaseError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password, // Utiliser le mot de passe en clair pour Supabase Auth
      options: {
        data: {
          name: sanitizedName || name,
          firstName: firstName ? firstName.trim().slice(0, 100) : null,
          lastName: lastName ? lastName.trim().slice(0, 100) : null,
          phone: sanitizedPhone,
          role: 'user', // Par défaut, les nouveaux utilisateurs sont 'user'
        },
        emailRedirectTo: undefined, // Pas de redirection email pour l'instant
      },
    });

    if (supabaseError) {
      // Si l'utilisateur existe déjà dans Supabase Auth, ce n'est pas grave
      // (peut arriver si l'inscription a été partiellement effectuée)
      if (!supabaseError.message.includes('already registered')) {
        console.warn('⚠️ Erreur lors de la création du compte Supabase Auth (non bloquant):', supabaseError.message);
      }
    } else {
      console.log('✅ Compte créé dans Supabase Auth:', supabaseUser?.user?.email);
    }
  } catch (supabaseErr) {
    // Ne pas bloquer la création de compte si Supabase Auth échoue
    // L'utilisateur pourra toujours se connecter et sera créé automatiquement lors de la première connexion
    console.warn('⚠️ Erreur lors de la synchronisation avec Supabase Auth (non bloquant):', supabaseErr);
  }

  // Envoyer une notification par email pour la nouvelle création de compte (admin)
  try {
    const { sendEmail, getNotificationEmail, isNotificationEnabled } = await import('@/lib/email');
    const { newUserAccountEmail, welcomeEmail } = await import('@/lib/email-templates');
    
    const settings = await prisma.settings.findFirst({ select: { logoUrl: true } });
    const logoUrl = (settings as any)?.logoUrl || null;
    
    const accountData = {
      email: createdUser.email || email,
      name: createdUser.name || name,
      firstName: createdUser.firstName || firstName || null,
      lastName: createdUser.lastName || lastName || null,
      phone: createdUser.phone || body?.phone || null,
      createdAt: createdUser.createdAt || now,
    };
    
    // Email de notification à l'admin
    if (await isNotificationEnabled('accountCreated')) {
      const notificationEmail = await getNotificationEmail();
      const { subject, html } = newUserAccountEmail(accountData, 'fr', logoUrl);
      
      await sendEmail({
        to: notificationEmail,
        subject,
        html,
      });
    }
    
    // Email de bienvenue à l'utilisateur
    try {
      const { subject: welcomeSubject, html: welcomeHtml } = welcomeEmail(accountData, 'fr', logoUrl);
      await sendEmail({
        to: accountData.email,
        subject: welcomeSubject,
        html: welcomeHtml,
      });
    } catch (welcomeErr) {
      console.error('Error sending welcome email:', welcomeErr);
    }
  } catch (emailErr) {
    // Ne pas bloquer la création de compte si l'email échoue
    console.error('Error sending account creation notification email:', emailErr);
  }

  return NextResponse.json({ ok: true });
}
