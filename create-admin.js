const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Vérifier si un admin existe déjà
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('Un administrateur existe déjà:', existingAdmin.email);
      return;
    }

    // Créer un mot de passe hashé
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Créer l'utilisateur admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        name: 'Administrateur',
        firstName: 'Admin',
        lastName: 'User',
        password: hashedPassword,
        role: 'admin',
        emailVerified: new Date(),
      }
    });

    console.log('Administrateur créé avec succès:', admin.email);
  } catch (error) {
    console.error('Erreur lors de la création de l\'admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
