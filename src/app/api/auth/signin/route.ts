import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkAuthRateLimit, getClientIP } from '@/lib/security/rate-limit';
import { validateEmail } from '@/lib/security/validation';

export async function POST(req: Request) {
  try {
    // Rate limiting
    const ip = getClientIP(req);
    const rateLimit = checkAuthRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Veuillez réessayer plus tard.', retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // Validation email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      // Protection contre timing attack: toujours exécuter bcrypt
      await bcrypt.hash(password, 10);
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }
    const normalizedEmail = emailValidation.normalized!;

    // 1. Vérifier si l'utilisateur existe dans la table User (ancien système)
    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, image: true, role: true, password: true }
    });

    // Protection contre timing attack: toujours exécuter bcrypt même si l'utilisateur n'existe pas
    const dummyHash = '$2a$10$dummy.hash.for.timing.attack.protection.abcdefghijklmnopqrstuvwxyz';
    const userHash = dbUser?.password || dummyHash;
    
    // 2. Vérifier le mot de passe (toujours exécuter pour éviter les timing attacks)
    const passwordValid = await bcrypt.compare(password, userHash);
    
    if (!dbUser || !dbUser.password || !passwordValid) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    // 3. Vérifier si l'utilisateur existe dans Supabase Auth
    const supabase = await createClient();
    
    // Essayer de se connecter d'abord (utiliser l'email normalisé)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    // Si l'utilisateur n'existe pas dans Supabase Auth, le créer
    if (signInError && signInError.message.includes('Invalid login credentials')) {
      // Créer le compte dans Supabase Auth avec le même mot de passe (utiliser l'email normalisé)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name: dbUser.name,
            image: dbUser.image,
            role: dbUser.role || 'user'
          }
        }
      });

      if (signUpError) {
        return NextResponse.json({ error: 'Erreur lors de la création du compte' }, { status: 500 });
      }

      // Après création, se connecter (utiliser l'email normalisé)
      const { data: finalSignIn, error: finalError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (finalError) {
        return NextResponse.json({ error: 'Erreur de connexion' }, { status: 500 });
      }
    } else if (signInError) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        role: dbUser.role || 'user'
      }
    });
  } catch (error: any) {
    console.error('Sign in error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
