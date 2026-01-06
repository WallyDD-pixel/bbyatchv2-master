#!/bin/bash

# Script pour corriger la version de Prisma sur le serveur
# Ce script installe la version de Prisma correspondant au package.json

set -e

echo "🔧 Correction de la version de Prisma..."

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire du projet."
    exit 1
fi

# Installer la version correcte de Prisma
echo "📦 Installation de Prisma 5.19.1 (version du projet)..."
npm install prisma@5.19.1 @prisma/client@5.19.1 --save-exact

# Générer le client Prisma
echo "🔨 Génération du client Prisma..."
npx prisma generate

echo "✅ Prisma corrigé avec succès!"
echo ""
echo "Vous pouvez maintenant exécuter:"
echo "  npx prisma migrate deploy"
echo "  ou"
echo "  npx prisma db push"



