import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@bbyachts.local";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";

    console.log("🔐 Réinitialisation du compte admin...");
    console.log(`📧 Email: ${adminEmail}`);

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Créer ou mettre à jour l'admin
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        role: "admin",
        emailVerified: new Date(),
      },
      create: {
        email: adminEmail,
        name: "Admin",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        password: hashedPassword,
        emailVerified: new Date(),
      },
    });

    console.log("✅ Compte admin créé/mis à jour avec succès !");
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Rôle: ${admin.role}`);
    console.log(`   Mot de passe: ${adminPassword}`);
    console.log("");
    console.log("🔑 Vous pouvez maintenant vous connecter avec ces identifiants.");
  } catch (error) {
    console.error("❌ Erreur lors de la création de l'admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdmin();











