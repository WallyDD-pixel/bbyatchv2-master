#!/bin/bash

echo "🔧 Correction et Build - Script Automatique"
echo "=========================================="
echo ""

# Étape 1 : Arrêter PM2
echo "📋 Étape 1 : Arrêt de PM2..."
pm2 stop all 2>/dev/null || true
pm2 delete bbyatch 2>/dev/null || true
pm2 flush 2>/dev/null || true
sleep 2
echo "✅ PM2 arrêté"
echo ""

# Étape 2 : Vérifier et corriger next.config.ts
echo "📋 Étape 2 : Vérification de next.config.ts..."
if grep -q "swcMinify" next.config.ts 2>/dev/null; then
    echo "⚠️  swcMinify trouvé dans next.config.ts"
    echo "   Correction en cours..."
    # Supprimer la ligne swcMinify
    sed -i '/swcMinify:/d' next.config.ts
    sed -i '/swcMinify/d' next.config.ts
    echo "✅ next.config.ts corrigé"
else
    echo "✅ next.config.ts est correct (pas de swcMinify)"
fi
echo ""

# Étape 3 : Vérifier la mémoire
echo "📋 Étape 3 : Vérification de la mémoire..."
free -h
MEM_AVAILABLE=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ "$MEM_AVAILABLE" -lt 500 ]; then
    echo "⚠️  Mémoire disponible faible ($MEM_AVAILABLE MB)"
    echo "   Libération du cache système..."
    sudo sync && sudo sysctl vm.drop_caches=3 2>/dev/null || true
    free -h
else
    echo "✅ Mémoire suffisante ($MEM_AVAILABLE MB disponible)"
fi
echo ""

# Étape 4 : Vérifier si le build existe déjà
echo "📋 Étape 4 : Vérification du build existant..."
if [ -f ".next/BUILD_ID" ]; then
    echo "⚠️  Un build existe déjà"
    read -p "   Voulez-vous le supprimer et rebuilder ? (o/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        echo "   Suppression de l'ancien build..."
        rm -rf .next
        echo "✅ Ancien build supprimé"
    else
        echo "✅ Utilisation du build existant"
        BUILD_EXISTS=true
    fi
else
    echo "ℹ️  Aucun build existant"
    BUILD_EXISTS=false
fi
echo ""

# Étape 5 : Faire le build
if [ "$BUILD_EXISTS" != "true" ]; then
    echo "📋 Étape 5 : Build en cours..."
    echo "   ⏱️  Cela peut prendre 3-5 minutes..."
    echo ""
    
    # Essayer avec npm run build d'abord
    if npm run build; then
        echo ""
        echo "✅ Build réussi !"
    else
        echo ""
        echo "⚠️  Build échoué avec npm run build"
        echo "   Tentative avec NODE_OPTIONS directement..."
        NODE_OPTIONS='--max-old-space-size=1024' next build
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Build réussi !"
        else
            echo ""
            echo "❌ Build échoué"
            echo "   Vérifiez les erreurs ci-dessus"
            exit 1
        fi
    fi
    echo ""
else
    echo "📋 Étape 5 : Build existant, passage à l'étape suivante..."
    echo ""
fi

# Étape 6 : Vérifier que le build a réussi
echo "📋 Étape 6 : Vérification du build..."
if [ -f ".next/BUILD_ID" ]; then
    BUILD_ID=$(cat .next/BUILD_ID)
    echo "✅ Build ID: $BUILD_ID"
else
    echo "❌ Erreur : Le build n'existe pas"
    exit 1
fi
echo ""

# Étape 7 : Redémarrer PM2
echo "📋 Étape 7 : Redémarrage de PM2..."
pm2 start ecosystem.config.cjs
sleep 3
pm2 list
echo ""

# Étape 8 : Afficher les logs
echo "📋 Étape 8 : Logs récents..."
pm2 logs bbyatch --lines 10 --nostream
echo ""

# Étape 9 : Sauvegarder
echo "📋 Étape 9 : Sauvegarde de la configuration..."
pm2 save
echo ""

echo "✅ Processus terminé !"
echo ""
echo "📊 Commandes utiles :"
echo "   - pm2 list          : Voir l'état des processus"
echo "   - pm2 logs bbyatch  : Voir les logs en temps réel"
echo "   - pm2 monit         : Monitorer les ressources"
echo ""
