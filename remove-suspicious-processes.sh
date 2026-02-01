#!/bin/bash

echo "🔒 Suppression des processus suspects détectés"
echo "=============================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Arrêter systemwatcher
echo -e "${YELLOW}1️⃣ Arrêt des processus systemwatcher...${NC}"
SYSTEMWATCHER_PIDS=$(ps aux | grep systemwatcher | grep -v grep | awk '{print $2}')
if [ -n "$SYSTEMWATCHER_PIDS" ]; then
    echo "   PIDs trouvés: $SYSTEMWATCHER_PIDS"
    for pid in $SYSTEMWATCHER_PIDS; do
        echo "   Arrêt du processus $pid..."
        kill -9 $pid 2>/dev/null && echo -e "   ${GREEN}✅ Processus $pid arrêté${NC}" || echo -e "   ${RED}❌ Impossible d'arrêter $pid${NC}"
    done
    sleep 2
    # Vérifier qu'ils sont bien arrêtés
    REMAINING=$(ps aux | grep systemwatcher | grep -v grep | wc -l)
    if [ "$REMAINING" -eq 0 ]; then
        echo -e "   ${GREEN}✅ Tous les processus systemwatcher arrêtés${NC}"
    else
        echo -e "   ${RED}⚠️  Certains processus persistent${NC}"
    fi
else
    echo -e "   ${GREEN}✅ Aucun processus systemwatcher trouvé${NC}"
fi
echo ""

# 2. Arrêter scanner_linux
echo -e "${YELLOW}2️⃣ Arrêt des processus scanner_linux...${NC}"
SCANNER_PIDS=$(ps aux | grep scanner_linux | grep -v grep | awk '{print $2}')
if [ -n "$SCANNER_PIDS" ]; then
    echo "   PIDs trouvés: $SCANNER_PIDS"
    for pid in $SCANNER_PIDS; do
        echo "   Arrêt du processus $pid..."
        kill -9 $pid 2>/dev/null && echo -e "   ${GREEN}✅ Processus $pid arrêté${NC}" || echo -e "   ${RED}❌ Impossible d'arrêter $pid${NC}"
    done
    sleep 2
    # Vérifier qu'ils sont bien arrêtés
    REMAINING=$(ps aux | grep scanner_linux | grep -v grep | wc -l)
    if [ "$REMAINING" -eq 0 ]; then
        echo -e "   ${GREEN}✅ Tous les processus scanner_linux arrêtés${NC}"
    else
        echo -e "   ${RED}⚠️  Certains processus persistent${NC}"
    fi
else
    echo -e "   ${GREEN}✅ Aucun processus scanner_linux trouvé${NC}"
fi
echo ""

# 3. Trouver et supprimer les fichiers
echo -e "${YELLOW}3️⃣ Recherche des fichiers suspects...${NC}"

# Chercher systemwatcher
SYSTEMWATCHER_FILES=$(find ~ -name "systemwatcher" -type f 2>/dev/null)
if [ -n "$SYSTEMWATCHER_FILES" ]; then
    echo "   Fichiers systemwatcher trouvés:"
    echo "$SYSTEMWATCHER_FILES" | sed 's/^/      /'
    echo ""
    read -p "   Supprimer ces fichiers ? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        for file in $SYSTEMWATCHER_FILES; do
            rm -f "$file" 2>/dev/null && echo -e "   ${GREEN}✅ Supprimé: $file${NC}" || echo -e "   ${RED}❌ Impossible de supprimer: $file${NC}"
        done
    fi
else
    echo -e "   ${GREEN}✅ Aucun fichier systemwatcher trouvé${NC}"
fi
echo ""

# Chercher scanner_linux
SCANNER_FILES=$(find ~ -name "scanner_linux" -type f 2>/dev/null)
if [ -n "$SCANNER_FILES" ]; then
    echo "   Fichiers scanner_linux trouvés:"
    echo "$SCANNER_FILES" | sed 's/^/      /'
    echo ""
    read -p "   Supprimer ces fichiers ? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        for file in $SCANNER_FILES; do
            rm -f "$file" 2>/dev/null && echo -e "   ${GREEN}✅ Supprimé: $file${NC}" || echo -e "   ${RED}❌ Impossible de supprimer: $file${NC}"
        done
    fi
else
    echo -e "   ${GREEN}✅ Aucun fichier scanner_linux trouvé${NC}"
fi
echo ""

# 4. Vérifier où ils s'exécutent
echo -e "${YELLOW}4️⃣ Localisation des processus (avant arrêt)...${NC}"
ps aux | grep -E "(systemwatcher|scanner_linux)" | grep -v grep | awk '{print "   PID: " $2 " | CWD: " $NF " | CMD: " $11}'
echo ""

# 5. Vérifier les crontabs pour ces processus
echo -e "${YELLOW}5️⃣ Vérification des crontabs...${NC}"
CRON_SUSPECT=$(crontab -l 2>/dev/null | grep -E "(systemwatcher|scanner_linux)" || true)
if [ -n "$CRON_SUSPECT" ]; then
    echo -e "   ${RED}⚠️  Crontab suspect trouvé !${NC}"
    echo "$CRON_SUSPECT" | sed 's/^/      /'
    echo ""
    echo "   Suppression des crontabs suspects..."
    crontab -l 2>/dev/null | grep -vE "(systemwatcher|scanner_linux)" | crontab -
    echo -e "   ${GREEN}✅ Crontabs suspects supprimés${NC}"
else
    echo -e "   ${GREEN}✅ Aucun crontab suspect${NC}"
fi
echo ""

# 6. Vérification finale
echo -e "${YELLOW}6️⃣ Vérification finale...${NC}"
REMAINING_PROCESSES=$(ps aux | grep -E "(systemwatcher|scanner_linux)" | grep -v grep || true)
if [ -n "$REMAINING_PROCESSES" ]; then
    echo -e "   ${RED}⚠️  Processus encore en cours:${NC}"
    echo "$REMAINING_PROCESSES" | sed 's/^/      /'
else
    echo -e "   ${GREEN}✅ Aucun processus suspect restant${NC}"
fi
echo ""

# 7. État de la mémoire après
echo -e "${YELLOW}7️⃣ État de la mémoire après nettoyage:${NC}"
free -h
echo ""

echo "=============================================="
echo -e "${GREEN}✅ Nettoyage terminé !${NC}"
echo ""
echo "📋 Actions recommandées:"
echo "   1. Vérifiez les logs: sudo journalctl -xe | grep -E '(systemwatcher|scanner_linux)'"
echo "   2. Vérifiez les services: systemctl list-units | grep -E '(systemwatcher|scanner)'"
echo "   3. Surveillez la mémoire: free -h"
echo ""
