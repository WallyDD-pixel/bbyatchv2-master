#!/bin/bash

# Script d'installation des dépendances avec résolution du conflit nodemailer

echo "📦 Installation des dépendances de sécurité..."

# Option 1: Utiliser --legacy-peer-deps (recommandé)
# nodemailer 7.x est rétrocompatible avec 6.x pour l'usage basique
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo "✅ Dépendances installées avec succès!"
    echo ""
    echo "📋 Nouvelles dépendances de sécurité installées:"
    echo "   - validator (validation email)"
    echo "   - zod (validation de schémas)"
    echo "   - sanitize-html (sanitization HTML)"
    echo "   - zxcvbn (évaluation force mot de passe)"
    echo ""
    echo "🚀 Prochaines étapes:"
    echo "   1. npm run build"
    echo "   2. pm2 restart bbyatch"
else
    echo "❌ Erreur lors de l'installation"
    exit 1
fi
