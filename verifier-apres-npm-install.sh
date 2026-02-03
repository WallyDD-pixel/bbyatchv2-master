#!/bin/bash

# Script à exécuter IMMÉDIATEMENT après npm install sur un nouveau serveur
# Usage: bash verifier-apres-npm-install.sh

echo "🔍 VÉRIFICATION POST-INSTALLATION NPM"
echo "===================================="
echo ""
echo "⚠️  Ce script doit être exécuté IMMÉDIATEMENT après 'npm install'"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FOUND_ISSUES=false

# 1. Vérifier les packages avec postinstall
echo "1️⃣ Analyse des scripts postinstall..."
echo ""

if [ -f "deploy/analyser-packages-postinstall.sh" ]; then
    chmod +x deploy/analyser-packages-postinstall.sh
    bash deploy/analyser-packages-postinstall.sh
    
    # Vérifier le code de retour
    if [ $? -ne 0 ]; then
        echo -e "${RED}⚠️  Des packages suspects ont été détectés!${NC}"
        FOUND_ISSUES=true
    fi
else
    echo -e "${YELLOW}⚠️  Script d'analyse non trouvé, recherche manuelle...${NC}"
    
    # Recherche manuelle
    SUSPICIOUS=$(find node_modules -name "package.json" -exec grep -l "postinstall" {} \; 2>/dev/null | \
        xargs grep -lE "178.16.52.253|1utig|wget.*http.*sh|curl.*http.*sh" 2>/dev/null)
    
    if [ ! -z "$SUSPICIOUS" ]; then
        echo -e "${RED}🚨 Packages suspects trouvés:${NC}"
        echo "$SUSPICIOUS"
        FOUND_ISSUES=true
    else
        echo -e "${GREEN}✅ Aucun package suspect détecté${NC}"
    fi
fi

echo ""

# 2. Vérifier les processus malveillants
echo "2️⃣ Vérification des processus..."
SUSPICIOUS_PROCESSES=$(ps aux | grep -E "(xmrig|moneroocean|systemwatcher|scanner_linux)" | grep -v grep)
if [ ! -z "$SUSPICIOUS_PROCESSES" ]; then
    echo -e "${RED}🚨 Processus malveillants détectés!${NC}"
    echo "$SUSPICIOUS_PROCESSES"
    FOUND_ISSUES=true
else
    echo -e "${GREEN}✅ Aucun processus malveillant${NC}"
fi
echo ""

# 3. Vérifier la mémoire
echo "3️⃣ Vérification de la mémoire..."
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
if [ "$MEMORY_USAGE" -gt 50 ]; then
    echo -e "${YELLOW}⚠️  Utilisation mémoire élevée: ${MEMORY_USAGE}%${NC}"
    free -h
    echo ""
    echo "   Si c'est juste après npm install, c'est normal."
    echo "   Si c'est après quelques minutes, c'est suspect."
else
    echo -e "${GREEN}✅ Mémoire normale: ${MEMORY_USAGE}%${NC}"
fi
echo ""

# 4. Vérifier les crontabs
echo "4️⃣ Vérification des crontabs..."
CRON_SUSPICIOUS=$(crontab -l 2>/dev/null | grep -E "(178.16.52.253|1utig|wget.*http.*sh|curl.*http.*sh)" || echo "")
if [ ! -z "$CRON_SUSPICIOUS" ]; then
    echo -e "${RED}🚨 Crontab suspect détecté!${NC}"
    echo "$CRON_SUSPICIOUS"
    FOUND_ISSUES=true
else
    echo -e "${GREEN}✅ Crontab propre${NC}"
fi
echo ""

# 5. Vérifier les fichiers suspects
echo "5️⃣ Vérification des fichiers suspects..."
SUSPICIOUS_FILES=$(find ~ -maxdepth 2 -type f \( -name "*xmrig*" -o -name "*moneroocean*" -o -name "*systemwatcher*" -o -name "*scanner_linux*" \) 2>/dev/null)
if [ ! -z "$SUSPICIOUS_FILES" ]; then
    echo -e "${RED}🚨 Fichiers suspects trouvés!${NC}"
    echo "$SUSPICIOUS_FILES"
    FOUND_ISSUES=true
else
    echo -e "${GREEN}✅ Aucun fichier suspect${NC}"
fi
echo ""

# Résumé
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$FOUND_ISSUES" = true ]; then
    echo -e "${RED}🚨 PROBLÈMES DÉTECTÉS!${NC}"
    echo ""
    echo "⚠️  ACTIONS REQUISES:"
    echo "   1. NE PAS continuer le déploiement"
    echo "   2. Identifier le package compromis"
    echo "   3. Le supprimer de package.json"
    echo "   4. Nettoyer: rm -rf node_modules package-lock.json"
    echo "   5. Réinstaller: npm install --legacy-peer-deps"
    echo "   6. Réexécuter ce script"
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ TOUT EST PROPRE!${NC}"
    echo ""
    echo "Vous pouvez continuer le déploiement en toute sécurité."
    echo ""
    echo "Prochaines étapes:"
    echo "   1. Configurer .env"
    echo "   2. npx prisma generate"
    echo "   3. npm run build"
    echo "   4. pm2 start ecosystem.config.cjs"
    echo ""
    exit 0
fi
