#!/bin/bash

echo "🔧 Correction de la redirection malveillante..."

cd ~/bbyatchv2 || exit 1

# 1. Arrêter l'application
echo "1️⃣ Arrêt de l'application..."
pm2 stop bbyatchv2-preprod 2>/dev/null || pm2 stop bbyatchv2 2>/dev/null || echo "   Application non démarrée avec PM2"

# 2. Supprimer le build corrompu
echo ""
echo "2️⃣ Suppression du build corrompu..."
rm -rf .next
echo "   ✅ Dossier .next supprimé"

# 3. Vérifier et nettoyer nginx
echo ""
echo "3️⃣ Vérification de nginx..."
if [ -f /etc/nginx/sites-enabled/bbyatchv2 ]; then
    echo "   Vérification de la configuration..."
    if grep -q "solgalaxy\|claim-reward" /etc/nginx/sites-enabled/bbyatchv2 2>/dev/null; then
        echo "   ⚠️  Redirection malveillante trouvée dans nginx !"
        echo "   📝 Éditez manuellement: sudo nano /etc/nginx/sites-enabled/bbyatchv2"
    else
        echo "   ✅ Configuration nginx propre"
    fi
fi

# 4. Vérifier les fichiers publics
echo ""
echo "4️⃣ Vérification des fichiers publics..."
find public -type f \( -name "*.html" -o -name "*.js" \) 2>/dev/null | while read file; do
    if grep -q "solgalaxy\|claim-reward" "$file" 2>/dev/null; then
        echo "   ⚠️  Fichier suspect: $file"
        echo "   💡 Supprimez-le ou restaurez-le depuis git"
    fi
done

# 5. Vérifier .env
echo ""
echo "5️⃣ Vérification du fichier .env..."
if [ -f .env ]; then
    if grep -qi "solgalaxy\|claim-reward" .env 2>/dev/null; then
        echo "   ⚠️  Variable suspecte dans .env !"
        echo "   📝 Vérifiez manuellement: nano .env"
    else
        echo "   ✅ .env propre"
    fi
fi

# 6. Reconstruire proprement
echo ""
echo "6️⃣ Reconstruction de l'application..."
echo "   Installation des dépendances..."
npm ci

echo "   Génération Prisma..."
npx prisma generate

echo "   Build de l'application..."
npm run build

# 7. Redémarrer
echo ""
echo "7️⃣ Redémarrage de l'application..."
pm2 restart bbyatchv2-preprod 2>/dev/null || pm2 start npm --name bbyatchv2-preprod -- run start

echo ""
echo "✅ Correction terminée !"
echo ""
echo "🔍 Vérifiez maintenant votre site. Si le problème persiste:"
echo "   1. Vérifiez la configuration nginx: sudo nano /etc/nginx/sites-enabled/bbyatchv2"
echo "   2. Vérifiez les fichiers dans public/"
echo "   3. Vérifiez les variables d'environnement dans .env"
echo "   4. Videz le cache du navigateur (Ctrl+Shift+R)"









