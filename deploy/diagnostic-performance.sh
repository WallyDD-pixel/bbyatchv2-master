#!/bin/bash

# Script de diagnostic de performance pour identifier pourquoi le VPS est lent
# Usage: bash deploy/diagnostic-performance.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "⚡ DIAGNOSTIC DE PERFORMANCE DU VPS"
echo "=========================================="
echo ""

# 1. Informations système générales
echo -e "${YELLOW}[1/12] Informations système...${NC}"
echo "Uptime: $(uptime)"
echo "Date: $(date)"
echo ""

# 2. Utilisation CPU
echo -e "${YELLOW}[2/12] Utilisation CPU...${NC}"
echo "Top 5 processus consommant le plus de CPU:"
ps aux --sort=-%cpu | head -6
echo ""

# 3. Utilisation mémoire
echo -e "${YELLOW}[3/12] Utilisation mémoire (RAM)...${NC}"
free -h
echo ""
echo "Top 5 processus consommant le plus de mémoire:"
ps aux --sort=-%mem | head -6
echo ""

# 4. Utilisation du swap
echo -e "${YELLOW}[4/12] Utilisation du swap...${NC}"
swapon --show
echo ""
if [ "$(free | grep Swap | awk '{print $3}')" -gt 0 ]; then
    echo -e "${RED}⚠️  Swap utilisé - cela peut ralentir le système${NC}"
    echo "Processus utilisant le swap:"
    for pid in $(pgrep -f .); do
        swap=$(grep VmSwap /proc/$pid/status 2>/dev/null | awk '{print $2}')
        if [ ! -z "$swap" ] && [ "$swap" -gt 0 ]; then
            echo "PID $pid ($(ps -p $pid -o comm=)): $(($swap / 1024)) MB"
        fi
    done | head -10
else
    echo -e "${GREEN}✓ Aucun swap utilisé${NC}"
fi
echo ""

# 5. Utilisation disque
echo -e "${YELLOW}[5/12] Utilisation disque...${NC}"
df -h
echo ""
echo "Top 10 plus gros fichiers/dossiers:"
du -h / 2>/dev/null | sort -rh | head -10
echo ""

# 6. I/O disque
echo -e "${YELLOW}[6/12] Activité I/O disque...${NC}"
if command -v iostat &> /dev/null; then
    iostat -x 1 2 | tail -n +4
else
    echo "iostat non installé. Installation recommandée: sudo apt install sysstat"
fi
echo ""

# 7. Processus PM2
echo -e "${YELLOW}[7/12] Statut PM2...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 status
    echo ""
    echo "Utilisation mémoire/CPU par PM2:"
    pm2 monit --no-interaction 2>/dev/null || pm2 list
else
    echo -e "${RED}PM2 non installé${NC}"
fi
echo ""

# 8. Services système
echo -e "${YELLOW}[8/12] Services système actifs...${NC}"
systemctl list-units --type=service --state=running | head -20
echo ""

# 9. Connexions réseau
echo -e "${YELLOW}[9/12] Connexions réseau actives...${NC}"
echo "Connexions établies:"
netstat -an | grep ESTABLISHED | wc -l
echo "Top 10 connexions par IP:"
netstat -an | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10
echo ""

# 10. Logs système récents (erreurs)
echo -e "${YELLOW}[10/12] Erreurs système récentes...${NC}"
if [ -f /var/log/syslog ]; then
    echo "Dernières erreurs dans syslog:"
    sudo tail -20 /var/log/syslog | grep -i error || echo "Aucune erreur récente"
elif [ -f /var/log/messages ]; then
    echo "Dernières erreurs dans messages:"
    sudo tail -20 /var/log/messages | grep -i error || echo "Aucune erreur récente"
fi
echo ""

# 11. Charge système
echo -e "${YELLOW}[11/12] Charge système (load average)...${NC}"
LOAD=$(uptime | awk -F'load average:' '{print $2}')
CPU_CORES=$(nproc)
echo "Load average: $LOAD"
echo "Nombre de CPU: $CPU_CORES"
LOAD_1=$(echo $LOAD | awk -F',' '{print $1}' | xargs)
if (( $(echo "$LOAD_1 > $CPU_CORES" | bc -l) )); then
    echo -e "${RED}⚠️  Charge élevée - le système est surchargé${NC}"
else
    echo -e "${GREEN}✓ Charge normale${NC}"
fi
echo ""

# 12. Processus zombies
echo -e "${YELLOW}[12/12] Processus zombies...${NC}"
ZOMBIES=$(ps aux | awk '$8 ~ /^Z/ { print $2 }' | wc -l)
if [ "$ZOMBIES" -gt 0 ]; then
    echo -e "${RED}⚠️  $ZOMBIES processus zombie(s) détecté(s)${NC}"
    ps aux | awk '$8 ~ /^Z/ { print }'
else
    echo -e "${GREEN}✓ Aucun processus zombie${NC}"
fi
echo ""

echo "=========================================="
echo "📋 RÉSUMÉ ET RECOMMANDATIONS"
echo "=========================================="
echo ""

# Vérifications automatiques
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
SWAP_USAGE=$(free | grep Swap | awk '{if ($2 > 0) printf "%.0f", $3/$2 * 100; else print "0"}')
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

echo "Utilisation mémoire: ${MEM_USAGE}%"
echo "Utilisation swap: ${SWAP_USAGE}%"
echo "Utilisation disque: ${DISK_USAGE}%"
echo ""

if [ "$MEM_USAGE" -gt 80 ]; then
    echo -e "${RED}⚠️  Mémoire fortement utilisée (>80%)${NC}"
    echo "   → Considérez augmenter la RAM ou optimiser les applications"
fi

if [ "$SWAP_USAGE" -gt 10 ]; then
    echo -e "${RED}⚠️  Swap utilisé (>10%) - cela ralentit le système${NC}"
    echo "   → Vérifiez les processus qui consomment trop de mémoire"
fi

if [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${RED}⚠️  Disque presque plein (>80%)${NC}"
    echo "   → Libérez de l'espace disque"
fi

echo ""
echo "Commandes utiles pour optimiser:"
echo "  - Voir les processus en temps réel: htop (ou top)"
echo "  - Redémarrer PM2: pm2 restart all"
echo "  - Nettoyer les logs: sudo journalctl --vacuum-time=7d"
echo "  - Vérifier l'espace disque: df -h"
echo "  - Trouver les gros fichiers: sudo du -h / | sort -rh | head -20"
echo ""


