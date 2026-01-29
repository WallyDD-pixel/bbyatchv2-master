import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    // 1. Vérifier si l'utilisateur existe dans la table User (ancien système)
    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, image: true, role: true, password: true }
    });

    if (!dbUser || !dbUser.password) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    // 2. Vérifier le mot de passe
    const passwordValid = await bcrypt.compare(password, dbUser.password);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    // 3. Vérifier si l'utilisateur existe dans Supabase Auth
    const supabase = await createClient();
    
    // Essayer de se connecter d'abord
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Si l'utilisateur n'existe pas dans Supabase Auth, le créer
    if (signInError && signInError.message.includes('Invalid login credentials')) {
      // Créer le compte dans Supabase Auth avec le même mot de passe
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
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

      // Après création, se connecter
      const { data: finalSignIn, error: finalError } = await supabase.auth.signInWithPassword({
        email,
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
