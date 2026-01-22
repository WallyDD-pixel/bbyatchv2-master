#!/bin/bash

# Script pour configurer le port 3010 et vérifier la configuration
# Usage: bash deploy/fix-port-config.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🔧 Configuration du port 3010...${NC}"

cd ~/bbyatchv2-master || exit 1

# 1. Arrêter PM2
echo -e "${YELLOW}[1/6] Arrêt de PM2...${NC}"
pm2 stop bbyatchv2-preprod 2>/dev/null || true
pm2 delete bbyatchv2-preprod 2>/dev/null || true
echo -e "${GREEN}✓ PM2 arrêté${NC}"

# 2. Vérifier le fichier .env
echo -e "${YELLOW}[2/6] Vérification du fichier .env...${NC}"
if [ -f ".env" ]; then
    if grep -q "^PORT=" .env; then
        echo -e "${GREEN}✓ PORT est défini dans .env${NC}"
        grep "^PORT=" .env
    else
        echo -e "${YELLOW}⚠ PORT non défini dans .env, ajout...${NC}"
        echo "PORT=3010" >> .env
        echo -e "${GREEN}✓ PORT=3010 ajouté${NC}"
    fi
else
    echo -e "${RED}✗ Fichier .env non trouvé${NC}"
    echo "Création d'un fichier .env minimal..."
    echo "PORT=3010" > .env
    echo -e "${YELLOW}⚠ Vous devez configurer les autres variables d'environnement${NC}"
fi

# 3. Vérifier que le port 3010 est libre
echo -e "${YELLOW}[3/6] Vérification du port 3010...${NC}"
if lsof -ti:3010 &> /dev/null; then
    echo -e "${YELLOW}⚠ Port 3010 utilisé, libération...${NC}"
    sudo lsof -ti:3010 | xargs -r sudo kill -9 2>/dev/null || true
    sleep 2
fi
echo -e "${GREEN}✓ Port 3010 libre${NC}"

# 4. Vérifier Nginx
echo -e "${YELLOW}[4/6] Vérification de Nginx...${NC}"
if [ -L /etc/nginx/sites-enabled/bbyatchv2-preprod ] || [ -L /etc/nginx/sites-enabled/bbyatchv2 ]; then
    echo -e "${GREEN}✓ Configuration Nginx trouvée${NC}"
else
    echo -e "${YELLOW}⚠ Configuration Nginx non trouvée, création...${NC}"
    sudo cp deploy/nginx-preprod.conf /etc/nginx/sites-available/bbyatchv2-preprod
    sudo ln -sf /etc/nginx/sites-available/bbyatchv2-preprod /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo -e "${GREEN}✓ Configuration Nginx créée${NC}"
fi

# 5. Démarrer PM2 avec PORT=3010
echo -e "${YELLOW}[5/6] Démarrage de PM2 avec PORT=3010...${NC}"
PORT=3010 pm2 start npm --name bbyatchv2-preprod -- run start
sleep 5
pm2 save

# 6. Vérifier que l'application répond
echo -e "${YELLOW}[6/6] Vérification que l'application répond...${NC}"
sleep 3
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3010 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Application répond sur localhost:3010${NC}"
    curl -I http://localhost:3010 2>/dev/null | head -3
else
    echo -e "${RED}✗ Application ne répond pas sur localhost:3010${NC}"
    echo "Logs PM2:"
    pm2 logs bbyatchv2-preprod --lines 20 --nostream
fi

echo ""
echo -e "${GREEN}✅ Configuration terminée !${NC}"
echo ""
echo "Vérification:"
echo "  pm2 status                    # Vérifier le statut"
echo "  pm2 logs bbyatchv2-preprod    # Voir les logs"
echo "  curl http://localhost:3010   # Tester l'application"
echo "  curl https://preprod.bbservicescharter.com  # Tester depuis l'extérieur"
