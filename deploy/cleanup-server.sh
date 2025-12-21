#!/bin/bash

# Script de nettoyage complet du serveur pour réinstallation
# Usage: bash cleanup-server.sh

set -e

echo "🧹 Démarrage du nettoyage du serveur..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Arrêter et supprimer les processus PM2
echo -e "${YELLOW}[1/8] Arrêt et suppression des processus PM2...${NC}"
if command -v pm2 &> /dev/null; then
    # Arrêter tous les processus PM2
    pm2 stop all 2>/dev/null || true
    pm2 delete all 2>/dev/null || true
    # Supprimer le processus spécifique si il existe
    pm2 delete bbyatchv2-preprod 2>/dev/null || true
    pm2 save --force 2>/dev/null || true
    echo -e "${GREEN}✓ PM2 nettoyé${NC}"
else
    echo -e "${YELLOW}⚠ PM2 non installé, ignoré${NC}"
fi

# 2. Arrêter et supprimer les containers Docker
echo -e "${YELLOW}[2/8] Arrêt et suppression des containers Docker...${NC}"
if command -v docker &> /dev/null; then
    # Arrêter le container de la base de données
    docker stop bbyatchv2-preprod-db 2>/dev/null || true
    docker rm bbyatchv2-preprod-db 2>/dev/null || true
    
    # Arrêter tous les containers liés à bbyatchv2
    docker ps -a --filter "name=bbyatchv2" -q | xargs -r docker stop 2>/dev/null || true
    docker ps -a --filter "name=bbyatchv2" -q | xargs -r docker rm 2>/dev/null || true
    
    echo -e "${GREEN}✓ Containers Docker arrêtés et supprimés${NC}"
else
    echo -e "${YELLOW}⚠ Docker non installé, ignoré${NC}"
fi

# 3. Supprimer les volumes Docker
echo -e "${YELLOW}[3/8] Suppression des volumes Docker...${NC}"
if command -v docker &> /dev/null; then
    docker volume rm preprod_pg_data 2>/dev/null || true
    docker volume prune -f 2>/dev/null || true
    echo -e "${GREEN}✓ Volumes Docker supprimés${NC}"
fi

# 4. Supprimer les configurations Nginx
echo -e "${YELLOW}[4/8] Suppression des configurations Nginx...${NC}"
if [ -L /etc/nginx/sites-enabled/bbyatchv2-preprod ] || [ -L /etc/nginx/sites-enabled/bbyatchv2 ]; then
    sudo rm -f /etc/nginx/sites-enabled/bbyatchv2-preprod 2>/dev/null || true
    sudo rm -f /etc/nginx/sites-enabled/bbyatchv2 2>/dev/null || true
    echo -e "${GREEN}✓ Liens symboliques Nginx supprimés${NC}"
fi

if [ -f /etc/nginx/sites-available/bbyatchv2-preprod ]; then
    sudo rm -f /etc/nginx/sites-available/bbyatchv2-preprod 2>/dev/null || true
    echo -e "${GREEN}✓ Configuration Nginx supprimée${NC}"
fi

if [ -f /etc/nginx/sites-available/bbyatchv2 ]; then
    sudo rm -f /etc/nginx/sites-available/bbyatchv2 2>/dev/null || true
    echo -e "${GREEN}✓ Configuration Nginx supprimée${NC}"
fi

# Tester et recharger Nginx
if command -v nginx &> /dev/null; then
    sudo nginx -t 2>/dev/null && sudo systemctl reload nginx 2>/dev/null || true
fi

# 5. Supprimer les certificats Let's Encrypt (optionnel - décommenter si nécessaire)
# echo -e "${YELLOW}[5/8] Suppression des certificats Let's Encrypt...${NC}"
# sudo certbot delete --cert-name preprod.bbservicescharter.com --non-interactive 2>/dev/null || true
# echo -e "${GREEN}✓ Certificats Let's Encrypt supprimés${NC}"

# 6. Nettoyer les processus Node.js qui pourraient tourner
echo -e "${YELLOW}[5/8] Nettoyage des processus Node.js...${NC}"
pkill -f "node.*bbyatchv2" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
echo -e "${GREEN}✓ Processus Node.js arrêtés${NC}"

# 7. Nettoyer les ports utilisés (optionnel)
echo -e "${YELLOW}[6/8] Vérification des ports...${NC}"
# Vérifier le port 3010
if lsof -ti:3010 &> /dev/null; then
    echo -e "${YELLOW}⚠ Port 3010 encore utilisé, arrêt des processus...${NC}"
    sudo lsof -ti:3010 | xargs -r sudo kill -9 2>/dev/null || true
fi
echo -e "${GREEN}✓ Ports vérifiés${NC}"

# 8. Demander confirmation pour supprimer le dossier de l'application
echo -e "${YELLOW}[7/8] Nettoyage des fichiers de l'application...${NC}"
echo -e "${RED}⚠ ATTENTION: Cette étape va supprimer le dossier de l'application${NC}"
read -p "Voulez-vous supprimer le dossier de l'application? (oui/non) " -n 3 -r
echo
if [[ $REPLY =~ ^[Oo][Uu][Ii]$ ]]; then
    read -p "Entrez le chemin complet du dossier à supprimer (ex: ~/bbyatchv2-master): " APP_DIR
    if [ -d "$APP_DIR" ]; then
        echo -e "${RED}Suppression de $APP_DIR...${NC}"
        rm -rf "$APP_DIR"
        echo -e "${GREEN}✓ Dossier supprimé${NC}"
    else
        echo -e "${YELLOW}⚠ Dossier non trouvé: $APP_DIR${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Dossier de l'application conservé${NC}"
fi

# 9. Nettoyer le cache npm (optionnel)
echo -e "${YELLOW}[8/8] Nettoyage du cache npm...${NC}"
npm cache clean --force 2>/dev/null || true
echo -e "${GREEN}✓ Cache npm nettoyé${NC}"

echo ""
echo -e "${GREEN}✅ Nettoyage terminé!${NC}"
echo ""
echo "Résumé des actions effectuées:"
echo "  ✓ PM2: processus arrêtés et supprimés"
echo "  ✓ Docker: containers et volumes supprimés"
echo "  ✓ Nginx: configurations supprimées"
echo "  ✓ Node.js: processus arrêtés"
echo "  ✓ Ports: vérifiés et libérés"
echo ""
echo "Vous pouvez maintenant installer votre nouveau site."

