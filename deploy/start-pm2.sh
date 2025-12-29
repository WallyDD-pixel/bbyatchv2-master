#!/bin/bash

# Script pour démarrer l'application avec PM2
# Usage: ./start-pm2.sh

set -e

echo "🚀 Démarrage de l'application avec PM2..."

# Vérifier que PM2 est installé
if ! command -v pm2 &> /dev/null; then
    echo "❌ Erreur: PM2 n'est pas installé."
    echo "📦 Installation de PM2..."
    npm install -g pm2
fi

# Vérifier que le fichier de configuration existe
if [ ! -f "ecosystem.config.cjs" ]; then
    echo "❌ Erreur: ecosystem.config.cjs n'est pas trouvé."
    exit 1
fi

# Vérifier que l'application est buildée
if [ ! -d ".next" ]; then
    echo "⚠️  L'application n'est pas buildée. Construction en cours..."
    npm run build
fi

# Créer le dossier logs s'il n'existe pas
mkdir -p logs

# Démarrer avec PM2 en spécifiant explicitement le fichier .cjs
echo "📦 Démarrage de l'application..."
pm2 start ecosystem.config.cjs

# Sauvegarder la configuration PM2
pm2 save

# Afficher le statut
echo ""
echo "✅ Application démarrée!"
echo ""
pm2 status

echo ""
echo "📝 Commandes utiles:"
echo "  - pm2 logs          : Voir les logs"
echo "  - pm2 restart all   : Redémarrer l'application"
echo "  - pm2 stop all      : Arrêter l'application"
echo "  - pm2 delete all    : Supprimer l'application de PM2"

