#!/bin/bash

# Script de diagnostic et réparation pour corriger l'erreur 502 Bad Gateway
# Usage: bash deploy/fix-502-bad-gateway.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PORT=3010
APP_NAME="bbyatchv2-preprod"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 Diagnostic et réparation 502 Bad Gateway${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé. Exécutez ce script depuis la racine du projet.${NC}"
    exit 1
fi

echo -e "${YELLOW}[1/8] Vérification du répertoire...${NC}"
echo -e "${GREEN}✓ Répertoire correct: $(pwd)${NC}"
echo ""

# 2. Vérifier PM2
echo -e "${YELLOW}[2/8] Vérification de PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 n'est pas installé!${NC}"
    echo "Installation de PM2..."
    sudo npm install -g pm2
else
    echo -e "${GREEN}✓ PM2 est installé${NC}"
fi
echo ""

# 3. Vérifier l'état de l'application dans PM2
echo -e "${YELLOW}[3/8] Vérification de l'état de l'application...${NC}"
PM2_STATUS=$(pm2 list | grep "$APP_NAME" || echo "")

if [ -z "$PM2_STATUS" ]; then
    echo -e "${RED}❌ L'application '$APP_NAME' n'est pas dans PM2${NC}"
    APP_RUNNING=false
else
    echo -e "${GREEN}✓ Application trouvée dans PM2${NC}"
    echo "$PM2_STATUS"
    
    # Vérifier si elle est en erreur ou arrêtée
    if echo "$PM2_STATUS" | grep -q "errored\|stopped"; then
        echo -e "${RED}❌ L'application est en erreur ou arrêtée${NC}"
        APP_RUNNING=false
    else
        APP_RUNNING=true
    fi
fi
echo ""

# 4. Vérifier si le port 3010 répond
echo -e "${YELLOW}[4/8] Vérification du port $PORT...${NC}"
if curl -f -s -m 5 http://localhost:$PORT > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Le port $PORT répond correctement${NC}"
    PORT_RESPONDING=true
else
    echo -e "${RED}❌ Le port $PORT ne répond pas${NC}"
    PORT_RESPONDING=false
    
    # Vérifier si quelque chose utilise le port
    PORT_IN_USE=$(sudo lsof -ti:$PORT 2>/dev/null || echo "")
    if [ -n "$PORT_IN_USE" ]; then
        echo -e "${YELLOW}⚠️  Le port $PORT est utilisé par: $PORT_IN_USE${NC}"
        echo "Tentative de libération du port..."
        bash deploy/kill-port-3010.sh
    fi
fi
echo ""

# 5. Vérifier les logs PM2 pour voir les erreurs
echo -e "${YELLOW}[5/8] Analyse des logs PM2 (dernières 30 lignes)...${NC}"
if [ -n "$PM2_STATUS" ]; then
    echo -e "${BLUE}--- Logs récents ---${NC}"
    pm2 logs "$APP_NAME" --lines 30 --nostream 2>&1 | tail -30
    echo -e "${BLUE}--- Fin des logs ---${NC}"
else
    echo "Aucun log disponible (application non démarrée)"
fi
echo ""

# 6. Vérifier le fichier .env
echo -e "${YELLOW}[6/8] Vérification du fichier .env...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Le fichier .env n'existe pas!${NC}"
    if [ -f "deploy/env.example" ]; then
        echo "Création depuis deploy/env.example..."
        cp deploy/env.example .env
        echo -e "${YELLOW}⚠️  Veuillez configurer le fichier .env avant de continuer${NC}"
    fi
else
    echo -e "${GREEN}✓ Fichier .env trouvé${NC}"
    
    # Vérifier les variables importantes
    if grep -q "DATABASE_URL" .env; then
        echo -e "${GREEN}✓ DATABASE_URL configurée${NC}"
    else
        echo -e "${RED}❌ DATABASE_URL manquante dans .env${NC}"
    fi
    
    if grep -q "PORT" .env; then
        ENV_PORT=$(grep "^PORT=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        if [ -n "$ENV_PORT" ] && [ "$ENV_PORT" != "3010" ]; then
            echo -e "${YELLOW}⚠️  PORT dans .env est différent: $ENV_PORT (attendu: 3010)${NC}"
        fi
    fi
fi
echo ""

# 7. Vérifier Nginx
echo -e "${YELLOW}[7/8] Vérification de Nginx...${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx est actif${NC}"
    
    # Vérifier la configuration
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo -e "${GREEN}✓ Configuration Nginx valide${NC}"
    else
        echo -e "${RED}❌ Erreur dans la configuration Nginx${NC}"
        sudo nginx -t
    fi
else
    echo -e "${RED}❌ Nginx n'est pas actif!${NC}"
    echo "Démarrage de Nginx..."
    sudo systemctl start nginx
fi
echo ""

# 8. Actions de réparation
echo -e "${YELLOW}[8/8] Actions de réparation...${NC}"

NEEDS_RESTART=false

# Si l'application n'est pas en cours d'exécution ou ne répond pas
if [ "$APP_RUNNING" = false ] || [ "$PORT_RESPONDING" = false ]; then
    echo -e "${BLUE}Redémarrage de l'application...${NC}"
    
    # Arrêter l'application si elle existe
    if [ -n "$PM2_STATUS" ]; then
        echo "Arrêt de l'application..."
        pm2 stop "$APP_NAME" 2>/dev/null || true
        pm2 delete "$APP_NAME" 2>/dev/null || true
    fi
    
    # Vérifier que le build existe
    if [ ! -d ".next" ]; then
        echo -e "${YELLOW}⚠️  Le dossier .next n'existe pas. Build nécessaire...${NC}"
        echo "Lancement du build..."
        npm run build
    else
        echo -e "${GREEN}✓ Build trouvé${NC}"
    fi
    
    # Démarrer l'application avec PM2
    echo "Démarrage de l'application avec PM2..."
    pm2 start ecosystem.config.cjs
    
    # Attendre un peu pour que l'application démarre
    echo "Attente du démarrage (10 secondes)..."
    sleep 10
    
    # Vérifier à nouveau
    if curl -f -s -m 5 http://localhost:$PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Application démarrée avec succès sur le port $PORT${NC}"
    else
        echo -e "${RED}❌ L'application ne répond toujours pas après redémarrage${NC}"
        echo "Vérifiez les logs: pm2 logs $APP_NAME"
        exit 1
    fi
    
    NEEDS_RESTART=true
fi

# Recharger Nginx si nécessaire
if [ "$NEEDS_RESTART" = true ]; then
    echo "Rechargement de Nginx..."
    sudo systemctl reload nginx
    echo -e "${GREEN}✓ Nginx rechargé${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Diagnostic terminé${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}📋 Commandes utiles:${NC}"
echo "  - Voir les logs: pm2 logs $APP_NAME"
echo "  - Statut PM2: pm2 status"
echo "  - Redémarrer: pm2 restart $APP_NAME"
echo "  - Tester localement: curl http://localhost:$PORT"
echo "  - Vérifier Nginx: sudo systemctl status nginx"
echo ""
