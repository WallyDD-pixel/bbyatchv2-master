#!/bin/bash

echo "🔄 Pull Git sécurisé"
echo "==================="
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Vérifier l'état actuel
echo "1️⃣ Vérification de l'état actuel..."
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
echo "   Branche: $BRANCH"
echo ""

# 2. Vérifier les changements locaux
echo "2️⃣ Vérification des changements locaux..."
LOCAL_CHANGES=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$LOCAL_CHANGES" -gt 0 ]; then
    echo -e "   ${YELLOW}⚠️  $LOCAL_CHANGES fichier(s) modifié(s) localement${NC}"
    echo "   Fichiers modifiés:"
    git status --short | head -10 | sed 's/^/      /'
    echo ""
    echo "   Options:"
    echo "   1. Stash les changements (sauvegarde temporaire)"
    echo "   2. Commit les changements"
    echo "   3. Ignorer et écraser (perte des changements locaux)"
    echo ""
    read -p "   Votre choix (1/2/3): " choice
    
    case $choice in
        1)
            echo "   Stash des changements..."
            git stash push -m "Sauvegarde avant pull - $(date '+%Y-%m-%d %H:%M:%S')"
            echo -e "   ${GREEN}✅ Changements sauvegardés dans stash${NC}"
            STASHED=1
            ;;
        2)
            echo "   Commit des changements..."
            git add .
            git commit -m "Changements locaux - $(date '+%Y-%m-%d %H:%M:%S')" || echo "   Aucun changement à commiter"
            echo -e "   ${GREEN}✅ Changements commités${NC}"
            ;;
        3)
            echo -e "   ${YELLOW}⚠️  Écrasement des changements locaux...${NC}"
            git reset --hard HEAD
            git clean -fd
            echo -e "   ${GREEN}✅ Changements locaux supprimés${NC}"
            ;;
        *)
            echo "   Annulation..."
            exit 1
            ;;
    esac
else
    echo -e "   ${GREEN}✅ Aucun changement local${NC}"
    STASHED=0
fi
echo ""

# 3. Fetch des changements distants
echo "3️⃣ Récupération des changements distants..."
if git fetch origin "$BRANCH" 2>&1; then
    echo -e "   ${GREEN}✅ Fetch réussi${NC}"
else
    echo -e "   ${RED}❌ Erreur lors du fetch${NC}"
    echo "   Vérifiez votre connexion et vos credentials"
    exit 1
fi
echo ""

# 4. Vérifier s'il y a des changements distants
echo "4️⃣ Vérification des changements distants..."
LOCAL_COMMIT=$(git rev-parse HEAD 2>/dev/null)
REMOTE_COMMIT=$(git rev-parse "origin/$BRANCH" 2>/dev/null)

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo -e "   ${GREEN}✅ Déjà à jour avec origin/$BRANCH${NC}"
    if [ "$STASHED" = "1" ]; then
        echo "   Restauration du stash..."
        git stash pop 2>/dev/null && echo -e "   ${GREEN}✅ Stash restauré${NC}" || echo "   Aucun stash à restaurer"
    fi
    exit 0
else
    echo "   Changements distants détectés"
    echo "   Local:  $LOCAL_COMMIT"
    echo "   Remote: $REMOTE_COMMIT"
fi
echo ""

# 5. Tentative de merge/pull
echo "5️⃣ Fusion des changements..."
if git pull origin "$BRANCH" 2>&1; then
    echo -e "   ${GREEN}✅ Pull réussi${NC}"
    
    # Restaurer le stash si nécessaire
    if [ "$STASHED" = "1" ]; then
        echo "   Tentative de restauration du stash..."
        git stash pop 2>/dev/null && echo -e "   ${GREEN}✅ Stash restauré${NC}" || echo -e "   ${YELLOW}⚠️  Conflits dans le stash, résolvez manuellement${NC}"
    fi
else
    echo -e "   ${RED}❌ Conflits détectés${NC}"
    echo ""
    echo "   Options pour résoudre:"
    echo "   1. Résoudre manuellement les conflits"
    echo "   2. Accepter les changements distants (écrase les locaux)"
    echo ""
    read -p "   Votre choix (1/2): " resolve_choice
    
    case $resolve_choice in
        1)
            echo "   Ouvrez les fichiers en conflit et résolvez-les"
            echo "   Puis exécutez: git add . && git commit"
            ;;
        2)
            echo "   Acceptation des changements distants..."
            git reset --hard "origin/$BRANCH"
            echo -e "   ${GREEN}✅ Changements distants appliqués${NC}"
            ;;
    esac
fi
echo ""

# 6. État final
echo "6️⃣ État final..."
git status --short | head -5
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Opération terminée${NC}"
echo ""
