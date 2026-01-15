#!/bin/bash

# Script pour mettre à jour le code avec Supabase Storage et reconstruire
# Usage: bash deploy/update-supabase-storage.sh

set -e

echo "🔄 Mise à jour du code avec Supabase Storage..."

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Variables
APP_DIR="$HOME/bbyatchv2-master"
APP_NAME="bbyatchv2-preprod"

cd "$APP_DIR"

# 1. Vérifier que les variables Supabase sont dans .env
echo -e "${YELLOW}[1/5] Vérification des variables Supabase...${NC}"
if ! grep -q "NEXT_PUBLIC_SUPABASE_URL" .env || ! grep -q "SUPABASE_SERVICE_ROLE_KEY" .env; then
    echo -e "${RED}✗ Les variables Supabase ne sont pas configurées dans .env${NC}"
    echo "Ajoutez ces lignes dans .env:"
    echo "  NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co"
    echo "  SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key"
    echo "  SUPABASE_STORAGE_BUCKET=uploads"
    exit 1
fi
echo -e "${GREEN}✓ Variables Supabase configurées${NC}"

# 2. Vérifier que @supabase/supabase-js est installé
echo -e "${YELLOW}[2/5] Vérification de @supabase/supabase-js...${NC}"
if ! npm list @supabase/supabase-js > /dev/null 2>&1; then
    echo "Installation de @supabase/supabase-js..."
    npm install @supabase/supabase-js
fi
echo -e "${GREEN}✓ @supabase/supabase-js installé${NC}"

# 3. Vérifier que les fichiers nécessaires existent
echo -e "${YELLOW}[3/5] Vérification des fichiers nécessaires...${NC}"
REQUIRED_FILES=(
    "src/lib/supabase.ts"
    "src/lib/storage.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ Fichier manquant: $file${NC}"
        echo "Assurez-vous d'avoir les fichiers modifiés sur le serveur"
        exit 1
    fi
done
echo -e "${GREEN}✓ Tous les fichiers nécessaires sont présents${NC}"

# 4. Reconstruire l'application
echo -e "${YELLOW}[4/5] Reconstruction de l'application...${NC}"

# Vérifier la mémoire disponible
AVAIL_MEM=$(free -m | awk '/^Mem:/{print $7}')
if [ "$AVAIL_MEM" -lt 1024 ]; then
    echo -e "${YELLOW}⚠ Mémoire faible détectée. Utilisation de NODE_OPTIONS...${NC}"
    export NODE_OPTIONS="--max-old-space-size=1536"
fi

# Générer le client Prisma
echo "Génération du client Prisma..."
npx prisma generate

# Build de l'application
echo "Build de l'application Next.js..."
npm run build

echo -e "${GREEN}✓ Application reconstruite${NC}"

# 5. Redémarrer l'application
echo -e "${YELLOW}[5/5] Redémarrage de l'application...${NC}"
pm2 restart "$APP_NAME" --update-env

# Attendre quelques secondes
sleep 5

# Vérifier que l'application fonctionne
if pm2 list | grep -q "$APP_NAME.*online"; then
    echo -e "${GREEN}✓ Application redémarrée avec succès${NC}"
else
    echo -e "${RED}✗ L'application ne semble pas démarrée correctement${NC}"
    echo "Vérifiez les logs avec: pm2 logs $APP_NAME"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Mise à jour terminée avec succès!${NC}"
echo ""
echo "Vérifiez les logs pour voir si Supabase Storage est utilisé:"
echo "  pm2 logs $APP_NAME --lines 50"
echo ""
echo "Testez l'upload d'une image pour vérifier que les URLs Supabase sont générées."






