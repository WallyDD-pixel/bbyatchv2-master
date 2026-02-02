#!/bin/bash

echo "🔧 Correction des problèmes Git et du site"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Diagnostic Git
echo "1️⃣ Diagnostic Git..."
if [ ! -d .git ]; then
    echo -e "   ${RED}❌ Ce n'est pas un dépôt Git${NC}"
    echo "   Initialisation d'un nouveau dépôt..."
    git init
    echo -e "   ${GREEN}✅ Dépôt Git initialisé${NC}"
else
    echo -e "   ${GREEN}✅ Dépôt Git détecté${NC}"
fi
echo ""

# 2. Vérifier le remote
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REMOTE_URL" ]; then
    echo -e "   ${YELLOW}⚠️  Aucun remote 'origin' configuré${NC}"
    read -p "   Voulez-vous ajouter un remote ? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        read -p "   Entrez l'URL du dépôt Git: " GIT_URL
        if [ -n "$GIT_URL" ]; then
            git remote add origin "$GIT_URL"
            echo -e "   ${GREEN}✅ Remote ajouté${NC}"
        fi
    fi
else
    echo "   Remote origin: $REMOTE_URL"
fi
echo ""

# 3. Essayer de récupérer les changements
echo "2️⃣ Récupération des changements..."
echo "   Fetch..."
git fetch origin 2>&1 | head -10
echo ""

# 4. Vérifier s'il y a des conflits ou changements locaux
echo "3️⃣ Vérification des changements locaux..."
LOCAL_CHANGES=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$LOCAL_CHANGES" -gt 0 ]; then
    echo -e "   ${YELLOW}⚠️  Changements locaux détectés ($LOCAL_CHANGES fichiers)${NC}"
    echo "   Fichiers modifiés:"
    git status --short | head -10 | sed 's/^/      /'
    echo ""
    read -p "   Voulez-vous sauvegarder les changements avant le pull ? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        git add .
        git commit -m "Sauvegarde avant pull - $(date '+%Y-%m-%d %H:%M:%S')"
        echo -e "   ${GREEN}✅ Changements sauvegardés${NC}"
    fi
fi
echo ""

# 5. Tentative de pull
echo "4️⃣ Tentative de pull..."
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
echo "   Branche actuelle: $BRANCH"

if git pull origin "$BRANCH" 2>&1; then
    echo -e "   ${GREEN}✅ Pull réussi${NC}"
else
    echo -e "   ${RED}❌ Pull échoué${NC}"
    echo ""
    echo "   Tentative alternative: fetch + merge"
    git fetch origin "$BRANCH" 2>&1 | head -5
    git merge "origin/$BRANCH" 2>&1 | head -10
fi
echo ""

# 6. Redémarrer l'application
echo "5️⃣ Redémarrage de l'application..."
pm2 restart bbyatch
sleep 3
pm2 list
echo ""

# 7. Vérifier nginx
echo "6️⃣ Vérification de nginx..."
if ! systemctl is-active nginx &>/dev/null; then
    sudo systemctl start nginx
fi
sudo systemctl restart nginx
systemctl is-active nginx && echo -e "   ${GREEN}✅ Nginx actif${NC}" || echo -e "   ${RED}❌ Problème avec nginx${NC}"
echo ""

# 8. Test de connexion
echo "7️⃣ Test de connexion..."
echo "   Test local Next.js:"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:3000 || echo "   ❌ Échec"
echo ""

echo "   Test local nginx:"
curl -s -o /dev/null -w "   Status: %{http_code}\n" http://localhost:80 || echo "   ❌ Échec"
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Corrections appliquées${NC}"
echo ""
echo "📋 Vérifications supplémentaires:"
echo "   1. Vérifiez les logs PM2: pm2 logs bbyatch --lines 50"
echo "   2. Vérifiez les Security Groups AWS (ports 80 et 443)"
echo "   3. Testez depuis l'extérieur: curl http://VOTRE_DOMAINE"
echo ""
