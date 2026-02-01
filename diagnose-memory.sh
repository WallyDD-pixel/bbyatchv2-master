#!/bin/bash

echo "🔍 Diagnostic de l'utilisation de la mémoire"
echo "============================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. État de la mémoire
echo -e "${BLUE}1️⃣ État actuel de la mémoire:${NC}"
free -h
echo ""

# Calcul du pourcentage utilisé
MEM_INFO=$(free | grep Mem)
MEM_TOTAL=$(echo $MEM_INFO | awk '{print $2}')
MEM_USED=$(echo $MEM_INFO | awk '{print $3}')
MEM_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($MEM_USED/$MEM_TOTAL)*100}")
echo -e "   Mémoire utilisée: ${YELLOW}${MEM_PERCENT}%${NC}"
echo ""

# 2. Top 10 des processus consommant le plus de mémoire
echo -e "${BLUE}2️⃣ Top 10 des processus consommant le plus de mémoire:${NC}"
ps aux --sort=-%mem | head -11 | awk 'NR==1{printf "%-8s %-8s %-6s %-6s %-10s %s\n", $1, $2, $3, $4, $5, $11} NR>1{printf "%-8s %-8s %5.1f%% %5.1f%% %10s %s\n", $1, $2, $3, $4, $5, $11}'
echo ""

# 3. Vérifier les processus suspects
echo -e "${BLUE}3️⃣ Recherche de processus suspects:${NC}"
SUSPECT_PROCESSES=$(ps aux | grep -E "(xmrig|moneroocean|miner|crypto)" | grep -v grep || true)
if [ -n "$SUSPECT_PROCESSES" ]; then
    echo -e "   ${RED}⚠️  PROCESSUS SUSPECTS DÉTECTÉS !${NC}"
    echo "$SUSPECT_PROCESSES" | sed 's/^/      /'
    echo ""
    echo "   Arrêt des processus suspects..."
    pkill -9 -f xmrig 2>/dev/null || true
    pkill -9 -f moneroocean 2>/dev/null || true
    pkill -9 -f miner 2>/dev/null || true
    sleep 2
    echo -e "   ${GREEN}✅ Processus arrêtés${NC}"
else
    echo -e "   ${GREEN}✅ Aucun processus suspect détecté${NC}"
fi
echo ""

# 4. Vérifier les processus Node.js/Next.js
echo -e "${BLUE}4️⃣ Processus Node.js/Next.js:${NC}"
NODE_PROCESSES=$(ps aux | grep -E "(node|next)" | grep -v grep || true)
if [ -n "$NODE_PROCESSES" ]; then
    echo "$NODE_PROCESSES" | while read line; do
        PID=$(echo "$line" | awk '{print $2}')
        MEM=$(echo "$line" | awk '{print $4}')
        CMD=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
        echo "   PID: $PID | Mémoire: ${MEM}% | $CMD"
    done
    echo ""
    echo "   Total des processus Node.js: $(echo "$NODE_PROCESSES" | wc -l)"
else
    echo "   Aucun processus Node.js en cours"
fi
echo ""

# 5. Vérifier les processus PM2
echo -e "${BLUE}5️⃣ Processus PM2:${NC}"
if command -v pm2 &> /dev/null; then
    pm2 list 2>/dev/null || echo "   PM2 installé mais aucun processus"
else
    echo "   PM2 non installé"
fi
echo ""

# 6. Vérifier les logs de protection
echo -e "${BLUE}6️⃣ Dernières entrées des logs de protection:${NC}"
if [ -f /var/log/malware-protection.log ]; then
    echo "   Dernières 10 lignes:"
    sudo tail -10 /var/log/malware-protection.log | sed 's/^/      /'
else
    echo "   Aucun log de protection (le service n'a peut-être pas encore tourné)"
fi
echo ""

# 7. Vérifier le cache système
echo -e "${BLUE}7️⃣ Cache système:${NC}"
CACHE_INFO=$(free | grep Mem)
CACHE_SIZE=$(echo $CACHE_INFO | awk '{print $6}')
CACHE_PERCENT=$(awk "BEGIN {printf \"%.1f\", ($CACHE_SIZE/$MEM_TOTAL)*100}")
echo "   Cache: $(numfmt --to=iec-i --suffix=B $((CACHE_SIZE * 1024)) 2>/dev/null || echo "${CACHE_SIZE}KB") (${CACHE_PERCENT}%)"
echo ""

# 8. Recommandations
echo -e "${BLUE}8️⃣ Recommandations:${NC}"
if (( $(echo "$MEM_PERCENT > 90" | bc -l 2>/dev/null || echo "0") )); then
    echo -e "   ${RED}⚠️  Mémoire très élevée (>90%)${NC}"
    echo ""
    echo "   Actions possibles:"
    echo "   1. Redémarrer les services Node.js/PM2 si nécessaire"
    echo "   2. Nettoyer le cache système: sudo sync && sudo sysctl vm.drop_caches=3"
    echo "   3. Vérifier s'il y a des fuites mémoire dans l'application"
    echo "   4. Augmenter la RAM de l'instance EC2 si nécessaire"
elif (( $(echo "$MEM_PERCENT > 80" | bc -l 2>/dev/null || echo "0") )); then
    echo -e "   ${YELLOW}⚠️  Mémoire élevée (>80%)${NC}"
    echo ""
    echo "   Surveillez l'utilisation et considérez:"
    echo "   - Nettoyer le cache si nécessaire"
    echo "   - Vérifier les processus qui consomment le plus"
else
    echo -e "   ${GREEN}✅ Mémoire dans des limites acceptables${NC}"
fi
echo ""

# 9. Commandes utiles
echo -e "${BLUE}9️⃣ Commandes utiles:${NC}"
echo "   - Voir tous les processus: ps aux --sort=-%mem | head -20"
echo "   - Tuer un processus: kill -9 PID"
echo "   - Nettoyer le cache: sudo sync && sudo sysctl vm.drop_caches=3"
echo "   - Redémarrer PM2: pm2 restart all"
echo "   - Voir les logs PM2: pm2 logs"
echo ""
