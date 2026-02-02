#!/bin/bash

echo "🔍 Diagnostic des problèmes Git"
echo "==============================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Vérifier si c'est un dépôt git
echo -e "${BLUE}1️⃣ Vérification du dépôt Git...${NC}"
if [ -d .git ]; then
    echo -e "   ${GREEN}✅ Dépôt Git détecté${NC}"
else
    echo -e "   ${RED}❌ Ce n'est pas un dépôt Git${NC}"
    echo "   Le dossier .git n'existe pas"
    exit 1
fi
echo ""

# 2. Vérifier la configuration git
echo -e "${BLUE}2️⃣ Configuration Git...${NC}"
echo "   Remote configurés:"
git remote -v 2>/dev/null || echo "   Aucun remote configuré"
echo ""

# 3. Vérifier l'état du dépôt
echo -e "${BLUE}3️⃣ État du dépôt...${NC}"
echo "   Branche actuelle:"
git branch --show-current 2>/dev/null || echo "   Impossible de déterminer la branche"
echo ""

echo "   Statut:"
git status --short 2>/dev/null | head -10 || echo "   Erreur lors de la vérification du statut"
echo ""

# 4. Tester la connexion au remote
echo -e "${BLUE}4️⃣ Test de connexion au remote...${NC}"
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -n "$REMOTE_URL" ]; then
    echo "   Remote URL: $REMOTE_URL"
    
    # Tester la connexion
    echo "   Test de connexion..."
    if git ls-remote --heads origin 2>&1 | head -1; then
        echo -e "   ${GREEN}✅ Connexion au remote OK${NC}"
    else
        echo -e "   ${RED}❌ Impossible de se connecter au remote${NC}"
        echo "   Causes possibles:"
        echo "      - Problème de réseau"
        echo "      - Credentials manquants ou incorrects"
        echo "      - URL du remote incorrecte"
    fi
else
    echo -e "   ${YELLOW}⚠️  Aucun remote 'origin' configuré${NC}"
    echo "   Pour ajouter un remote:"
    echo "      git remote add origin URL_DU_DEPOT"
fi
echo ""

# 5. Vérifier les credentials
echo -e "${BLUE}5️⃣ Vérification des credentials...${NC}"
if [ -f ~/.ssh/id_rsa ] || [ -f ~/.ssh/id_ed25519 ]; then
    echo -e "   ${GREEN}✅ Clés SSH trouvées${NC}"
else
    echo -e "   ${YELLOW}⚠️  Aucune clé SSH trouvée${NC}"
fi

if git config --global user.name &>/dev/null; then
    echo "   Git user.name: $(git config --global user.name)"
else
    echo -e "   ${YELLOW}⚠️  Git user.name non configuré${NC}"
fi

if git config --global user.email &>/dev/null; then
    echo "   Git user.email: $(git config --global user.email)"
else
    echo -e "   ${YELLOW}⚠️  Git user.email non configuré${NC}"
fi
echo ""

# 6. Tentative de pull avec plus de détails
echo -e "${BLUE}6️⃣ Tentative de pull avec diagnostic...${NC}"
echo "   Exécution de: git pull --verbose"
git pull --verbose 2>&1 | head -20
echo ""

# 7. Recommandations
echo "========================================"
echo -e "${YELLOW}📋 Solutions possibles:${NC}"
echo ""
echo "Si le remote n'est pas configuré:"
echo "   git remote add origin URL_DU_DEPOT"
echo ""
echo "Si vous utilisez HTTPS et avez besoin d'authentification:"
echo "   git config --global credential.helper store"
echo "   (puis entrez vos identifiants lors du prochain pull)"
echo ""
echo "Si vous utilisez SSH et avez des problèmes:"
echo "   ssh -T git@github.com  # Pour tester la connexion"
echo ""
echo "Pour forcer un pull (écrase les changements locaux):"
echo "   git fetch origin"
echo "   git reset --hard origin/main  # ou origin/master selon votre branche"
echo ""
