#!/bin/bash

# Script pour trouver le projet et exécuter le déploiement

echo "🔍 Recherche du projet bbyatchv2-master..."

# Chercher dans les emplacements courants
SEARCH_DIRS=(
    "$HOME/bbyatchv2-master"
    "$HOME/bbyatchv2"
    "/home/ubuntu/bbyatchv2-master"
    "/home/ubuntu/bbyatchv2"
    "$(pwd)/bbyatchv2-master"
)

FOUND_DIR=""

for dir in "${SEARCH_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        FOUND_DIR="$dir"
        echo "✓ Projet trouvé dans: $FOUND_DIR"
        break
    fi
done

if [ -z "$FOUND_DIR" ]; then
    echo "❌ Projet non trouvé!"
    echo ""
    echo "Le projet doit être dans l'un de ces emplacements:"
    for dir in "${SEARCH_DIRS[@]}"; do
        echo "  - $dir"
    done
    echo ""
    echo "Ou cherchez-le manuellement avec:"
    echo "  find ~ -type d -name 'bbyatchv2*' 2>/dev/null"
    exit 1
fi

# Vérifier si le script de déploiement existe
if [ -f "$FOUND_DIR/deploy/deploy.sh" ]; then
    echo "✓ Script de déploiement trouvé"
    cd "$FOUND_DIR"
    chmod +x deploy/deploy.sh
    bash deploy/deploy.sh
elif [ -f "$FOUND_DIR/deploy.sh" ]; then
    echo "✓ Script de déploiement trouvé à la racine"
    cd "$FOUND_DIR"
    chmod +x deploy.sh
    bash deploy.sh
else
    echo "❌ Script de déploiement non trouvé!"
    echo "Le script devrait être dans: $FOUND_DIR/deploy/deploy.sh"
    echo ""
    echo "Liste des fichiers dans deploy/:"
    ls -la "$FOUND_DIR/deploy/" 2>/dev/null || echo "Le dossier deploy/ n'existe pas"
    exit 1
fi

