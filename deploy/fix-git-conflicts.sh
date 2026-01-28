#!/bin/bash

echo "🔧 Résolution des conflits Git"
echo "=============================="
echo ""

# Vérifier si on est dans un repo git
if [ ! -d .git ]; then
    echo "❌ Erreur: Ce n'est pas un dépôt Git"
    exit 1
fi

# 1. Voir l'état actuel
echo "1️⃣ État actuel du dépôt..."
git status

# 2. Identifier les fichiers en conflit
echo ""
echo "2️⃣ Fichiers en conflit..."
CONFLICTED_FILES=$(git diff --name-only --diff-filter=U 2>/dev/null || git status --short | grep "^UU\|^AA\|^DD" | awk '{print $2}')

if [ -z "$CONFLICTED_FILES" ]; then
    echo "   ✅ Aucun fichier en conflit détecté"
    echo ""
    echo "   Tentative de résolution automatique..."
    
    # Si pas de conflits visibles, essayer d'abort le merge
    if [ -f .git/MERGE_HEAD ]; then
        echo "   ⚠️  Merge en cours détecté"
        read -p "   Annuler le merge et recommencer ? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git merge --abort
            echo "   ✅ Merge annulé"
            echo ""
            echo "   Vous pouvez maintenant faire: git pull"
            exit 0
        fi
    fi
else
    echo "   Fichiers en conflit:"
    echo "$CONFLICTED_FILES" | sed 's/^/      - /'
fi

# 3. Options de résolution
echo ""
echo "3️⃣ Options de résolution:"
echo "   a) Garder la version locale (serveur)"
echo "   b) Garder la version distante (GitHub)"
echo "   c) Annuler le merge et recommencer"
echo "   d) Résoudre manuellement"
echo ""
read -p "   Votre choix (a/b/c/d): " -n 1 -r
echo

case $REPLY in
    a)
        echo ""
        echo "   📥 Garde de la version locale..."
        for file in $CONFLICTED_FILES; do
            if [ -f "$file" ]; then
                echo "      - $file"
                git checkout --ours "$file"
                git add "$file"
            fi
        done
        echo "   ✅ Fichiers résolus (version locale)"
        ;;
    b)
        echo ""
        echo "   📥 Garde de la version distante..."
        for file in $CONFLICTED_FILES; do
            if [ -f "$file" ]; then
                echo "      - $file"
                git checkout --theirs "$file"
                git add "$file"
            fi
        done
        echo "   ✅ Fichiers résolus (version distante)"
        ;;
    c)
        echo ""
        echo "   🔄 Annulation du merge..."
        git merge --abort
        echo "   ✅ Merge annulé"
        echo ""
        echo "   Vous pouvez maintenant faire: git pull"
        exit 0
        ;;
    d)
        echo ""
        echo "   📝 Résolution manuelle requise"
        echo ""
        echo "   Fichiers à éditer:"
        echo "$CONFLICTED_FILES" | sed 's/^/      - /'
        echo ""
        echo "   Après résolution manuelle, exécutez:"
        echo "      git add <fichier>"
        echo "      git commit"
        exit 0
        ;;
    *)
        echo "   ❌ Choix invalide"
        exit 1
        ;;
esac

# 4. Finaliser le merge
echo ""
echo "4️⃣ Finalisation du merge..."
if git diff --cached --quiet; then
    echo "   ⚠️  Aucun fichier à commiter"
else
    echo "   Création du commit de merge..."
    git commit -m "Merge: Résolution des conflits" || {
        echo "   ⚠️  Le commit a échoué, mais les fichiers sont résolus"
        echo "   Vous pouvez maintenant faire: git commit"
    }
fi

# 5. Vérifier l'état final
echo ""
echo "5️⃣ État final..."
git status

echo ""
echo "=============================================="
echo "✅ Conflits résolus !"
echo ""
echo "📋 Prochaines étapes:"
echo "   - Vérifiez que tout fonctionne: npm run build"
echo "   - Redémarrez l'application: pm2 restart all"
echo ""
