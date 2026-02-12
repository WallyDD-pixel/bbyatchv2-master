#!/bin/bash

# Script d'analyse mémoire approfondie pour identifier les processus malveillants
# Usage: bash deploy/analyser-memoire.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "🔍 ANALYSE MÉMOIRE ET PROCESSUS SUSPECTS"
echo "=========================================="
echo ""

# 1. État général de la mémoire
echo -e "${YELLOW}[1/15] État général de la mémoire...${NC}"
free -h
echo ""
MEM_TOTAL=$(free -m | grep Mem | awk '{print $2}')
MEM_USED=$(free -m | grep Mem | awk '{print $3}')
MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))
echo "Mémoire utilisée: ${MEM_PERCENT}% (${MEM_USED}MB / ${MEM_TOTAL}MB)"
if [ "$MEM_PERCENT" -gt 90 ]; then
    echo -e "${RED}⚠️  CRITIQUE: Mémoire presque saturée (>90%)${NC}"
elif [ "$MEM_PERCENT" -gt 80 ]; then
    echo -e "${YELLOW}⚠️  Mémoire fortement utilisée (>80%)${NC}"
fi
echo ""

# 2. Top 10 processus consommant le plus de mémoire
echo -e "${YELLOW}[2/15] Top 10 processus consommant le plus de mémoire...${NC}"
ps aux --sort=-%mem | head -11 | awk 'NR==1 || $6 > 100 {printf "PID: %-8s MEM: %8s MB (%5s%%) CMD: %s\n", $2, $6, $4, $11}'
echo ""

# 3. Processus Node.js/PM2 détaillés
echo -e "${YELLOW}[3/15] Processus Node.js/PM2...${NC}"
ps aux | grep -E "node|pm2|next" | grep -v grep
echo ""
if command -v pm2 &> /dev/null; then
    echo "Statut PM2:"
    pm2 list
    echo ""
    echo "Utilisation mémoire PM2:"
    pm2 jlist | jq -r '.[] | "\(.name): \(.monit.memory/1024/1024 | floor)MB CPU:\(.monit.cpu)%"' 2>/dev/null || pm2 monit --no-interaction 2>/dev/null || echo "Impossible d'obtenir les stats PM2"
fi
echo ""

# 4. Processus suspects (noms suspects, chemins suspects)
echo -e "${YELLOW}[4/15] Processus suspects (noms/chemins suspects)...${NC}"
ps aux | grep -E "sh|bash|base64|curl|wget|nc|netcat|python|perl|ruby|php" | grep -v grep | grep -v "ec2-user\|root.*pm2\|root.*node" || echo "Aucun processus suspect trouvé"
echo ""

# 5. Processus avec des chemins suspects (/tmp, /dev, etc.)
echo -e "${YELLOW}[5/15] Processus exécutés depuis /tmp ou /dev...${NC}"
ps aux | awk '$11 ~ /^\/tmp\// || $11 ~ /^\/dev\// {print "PID: "$2" CMD: "$11" ARGS: "$12" "$13" "$14" "$15}'
echo ""

# 6. Processus avec des arguments suspects
echo -e "${YELLOW}[6/15] Processus avec arguments suspects (base64, pipe, etc.)...${NC}"
ps aux | grep -E "base64|echo.*\|.*sh|/bin/sh|/dev/fd" | grep -v grep || echo "Aucun processus avec arguments suspects"
echo ""

# 7. Utilisation du swap
echo -e "${YELLOW}[7/15] Utilisation du swap...${NC}"
free -h | grep Swap
SWAP_USED=$(free -m | grep Swap | awk '{print $3}')
if [ "$SWAP_USED" -gt 0 ]; then
    echo -e "${RED}⚠️  Swap utilisé: ${SWAP_USED}MB - cela ralentit le système${NC}"
    echo "Processus utilisant le swap:"
    for pid in $(pgrep .); do
        if [ -f "/proc/$pid/status" ]; then
            swap=$(grep VmSwap /proc/$pid/status 2>/dev/null | awk '{print $2}')
            if [ ! -z "$swap" ] && [ "$swap" -gt 0 ]; then
                cmd=$(ps -p $pid -o comm= 2>/dev/null)
                echo "PID $pid ($cmd): $(($swap / 1024)) MB"
            fi
        fi
    done | head -10
else
    echo -e "${GREEN}✓ Aucun swap utilisé${NC}"
fi
echo ""

# 8. Connexions réseau actives (peut consommer de la mémoire)
echo -e "${YELLOW}[8/15] Connexions réseau actives...${NC}"
CONN_COUNT=$(netstat -an 2>/dev/null | grep ESTABLISHED | wc -l)
echo "Connexions établies: $CONN_COUNT"
if [ "$CONN_COUNT" -gt 100 ]; then
    echo -e "${YELLOW}⚠️  Nombre élevé de connexions (>100)${NC}"
fi
echo "Top 10 IPs avec le plus de connexions:"
netstat -an 2>/dev/null | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10
echo ""

# 9. Charge système (load average)
echo -e "${YELLOW}[9/15] Charge système...${NC}"
uptime
LOAD_1=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | xargs)
CPU_CORES=$(nproc)
echo "Load average (1min): $LOAD_1"
echo "CPU cores: $CPU_CORES"
if (( $(echo "$LOAD_1 > $CPU_CORES * 2" | bc -l 2>/dev/null || echo "0") )); then
    echo -e "${RED}⚠️  Charge très élevée - système surchargé${NC}"
fi
echo ""

# 10. Processus avec beaucoup de threads (peut indiquer un malware)
echo -e "${YELLOW}[10/15] Processus avec beaucoup de threads...${NC}"
ps -eo pid,comm,nlwp,%mem,%cpu --sort=-nlwp | head -11
echo ""

# 11. Vérifier les fichiers ouverts par les processus suspects
echo -e "${YELLOW}[11/15] Fichiers ouverts par les processus Node.js...${NC}"
for pid in $(pgrep -f "node|next"); do
    echo "PID $pid ($(ps -p $pid -o comm=)):"
    lsof -p $pid 2>/dev/null | grep -E "\.sh$|\.py$|\.pl$|/tmp/|/dev/" | head -5 || echo "  Aucun fichier suspect"
done
echo ""

# 12. Vérifier les mappings mémoire suspects
echo -e "${YELLOW}[12/15] Mappings mémoire des processus Node.js...${NC}"
for pid in $(pgrep -f "node|next" | head -3); do
    echo "PID $pid:"
    cat /proc/$pid/maps 2>/dev/null | grep -E "executable|heap|stack" | head -5 || echo "  Impossible de lire les mappings"
done
echo ""

# 13. Vérifier l'utilisation mémoire par type (RSS, VSZ, etc.)
echo -e "${YELLOW}[13/15] Détails mémoire des processus Node.js...${NC}"
for pid in $(pgrep -f "node|next" | head -5); do
    if [ -f "/proc/$pid/status" ]; then
        echo "PID $pid:"
        grep -E "VmRSS|VmSize|VmData|VmStk|VmExe" /proc/$pid/status 2>/dev/null | awk '{printf "  %s\n", $0}'
        echo ""
    fi
done
echo ""

# 14. Vérifier les processus qui redémarrent fréquemment (signe de crash mémoire)
echo -e "${YELLOW}[14/15] Historique des redémarrages PM2...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 list | grep -E "errored|restart" || echo "Aucun processus en erreur"
    echo ""
    echo "Derniers logs d'erreur PM2 (OOM possible):"
    tail -50 ~/bbyatchv2-master/logs/pm2-error.log 2>/dev/null | grep -iE "out of memory|oom|killed|fatal|error" | tail -10 || echo "Aucune erreur mémoire récente"
fi
echo ""

# 15. Recommandations
echo -e "${YELLOW}[15/15] Recommandations...${NC}"
echo ""

if [ "$MEM_PERCENT" -gt 90 ]; then
    echo -e "${RED}🔴 ACTION IMMÉDIATE REQUISE:${NC}"
    echo "  1. Redémarrer PM2: pm2 restart all"
    echo "  2. Vérifier les processus suspects et les tuer si nécessaire"
    echo "  3. Augmenter la limite mémoire dans ecosystem.config.cjs si nécessaire"
    echo ""
fi

if [ "$SWAP_USED" -gt 100 ]; then
    echo -e "${YELLOW}⚠️  Swap utilisé - performance dégradée${NC}"
    echo "  → Identifier et arrêter les processus consommateurs"
    echo ""
fi

echo "Commandes utiles:"
echo "  - Tuer un processus suspect: kill -9 <PID>"
echo "  - Redémarrer PM2: pm2 restart all"
echo "  - Voir les processus en temps réel: htop"
echo "  - Augmenter limite mémoire PM2: Modifier max_memory_restart dans ecosystem.config.cjs"
echo ""

