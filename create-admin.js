const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Email et mot de passe (peuvent être modifiés via variables d'environnement)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bbyachts.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

    console.log('🔐 Réinitialisation du compte admin...');
    console.log(`📧 Email: ${adminEmail}`);

    // Créer un mot de passe hashé
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Créer ou mettre à jour l'admin (réinitialise le mot de passe même si existe déjà)
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        role: 'admin',
        emailVerified: new Date(),
      },
      create: {
        email: adminEmail,
        name: 'Admin',
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        role: 'admin',
        emailVerified: new Date(),
      }
    });

    console.log('✅ Compte admin créé/mis à jour avec succès !');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Rôle: ${admin.role}`);
    console.log(`   Mot de passe: ${adminPassword}`);
    console.log('');
    console.log('🔑 Vous pouvez maintenant vous connecter avec ces identifiants.');
  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
