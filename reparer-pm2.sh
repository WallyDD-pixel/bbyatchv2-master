#!/bin/bash

echo "🔧 Réparation du processus PM2 corrompu..."
echo ""

# Étape 1 : Arrêter et supprimer le processus corrompu
echo "📋 Étape 1 : Arrêt et suppression du processus corrompu..."
pm2 stop all 2>/dev/null || true
pm2 delete bbyatch 2>/dev/null || true
sleep 2

# Étape 2 : Nettoyer les logs
echo "📋 Étape 2 : Nettoyage des logs..."
pm2 flush 2>/dev/null || true

# Étape 3 : Vérifier que le build existe
echo "📋 Étape 3 : Vérification du build..."
if [ ! -d ".next" ]; then
    echo "⚠️  Le dossier .next n'existe pas. Build nécessaire..."
    echo "   Exécutez: npm run build"
    exit 1
fi

# Étape 4 : Vérifier la mémoire disponible
echo "📋 Étape 4 : Vérification de la mémoire..."
free -h

# Étape 5 : Vérifier que le port 3003 n'est pas utilisé
echo "📋 Étape 5 : Vérification du port 3003..."
if lsof -Pi :3003 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Le port 3003 est déjà utilisé. Arrêt du processus..."
    lsof -ti:3003 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Étape 6 : Redémarrer avec ecosystem.config.cjs
echo "📋 Étape 6 : Redémarrage avec ecosystem.config.cjs..."
pm2 start ecosystem.config.cjs

# Étape 7 : Attendre un peu et vérifier le statut
echo "📋 Étape 7 : Vérification du statut..."
sleep 5
pm2 list

# Étape 8 : Afficher les logs récents
echo ""
echo "📋 Étape 8 : Logs récents (dernières 20 lignes)..."
pm2 logs bbyatch --lines 20 --nostream

# Étape 9 : Sauvegarder
echo ""
echo "📋 Étape 9 : Sauvegarde de la configuration..."
pm2 save

echo ""
echo "✅ Réparation terminée !"
echo ""
echo "📊 Commandes utiles :"
echo "   - pm2 list          : Voir l'état des processus"
echo "   - pm2 logs bbyatch  : Voir les logs en temps réel"
echo "   - pm2 monit         : Monitorer les ressources"
echo ""
