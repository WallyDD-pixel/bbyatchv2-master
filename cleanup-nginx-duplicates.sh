#!/bin/bash

echo "🔍 Recherche des configurations nginx en double..."

# Lister tous les fichiers de configuration
echo ""
echo "1️⃣ Fichiers dans sites-enabled:"
ls -la /etc/nginx/sites-enabled/ | grep bbyatch

echo ""
echo "2️⃣ Fichiers dans sites-available:"
ls -la /etc/nginx/sites-available/ | grep bbyatch

echo ""
echo "3️⃣ Contenu des fichiers actifs:"
for file in /etc/nginx/sites-enabled/*; do
    if [ -f "$file" ]; then
        echo ""
        echo "📄 $file:"
        grep -i "server_name\|preprod.bbservicescharter.com" "$file" || echo "   (pas de server_name trouvé)"
    fi
done

echo ""
echo "4️⃣ Recherche de la redirection malveillante restante:"
grep -r "claim-reward.solgalaxy.cc" /etc/nginx/sites-enabled/ /etc/nginx/sites-available/ 2>/dev/null && echo "⚠️  TROUVÉ !" || echo "✅ Plus de redirection malveillante"

echo ""
echo "💡 Pour supprimer les doublons, identifiez les fichiers à supprimer et exécutez:"
echo "   sudo rm /etc/nginx/sites-enabled/nom-du-fichier-en-double"












