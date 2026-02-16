#!/bin/bash

# Script pour vérifier le statut du monitoring
# Usage: bash deploy/verifier-monitor.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "🔍 VÉRIFICATION DU STATUT DU MONITORING"
echo "=========================================="
echo ""

# 1. Vérifier le service systemd
echo -e "${YELLOW}[1/5] Statut du service systemd...${NC}"
if systemctl is-active --quiet monitor-processus.service 2>/dev/null; then
    echo -e "${GREEN}✓ Service actif${NC}"
    systemctl status monitor-processus.service --no-pager -l | head -15
else
    echo -e "${RED}❌ Service non actif${NC}"
    echo "Pour démarrer: sudo systemctl start monitor-processus"
fi
echo ""

# 2. Vérifier si le processus tourne
echo -e "${YELLOW}[2/5] Processus en cours...${NC}"
MONITOR_PIDS=$(pgrep -f "monitor-processus.sh.*--daemon")
if [ -n "$MONITOR_PIDS" ]; then
    echo -e "${GREEN}✓ Processus trouvé (PID: $MONITOR_PIDS)${NC}"
    ps aux | grep -E "monitor-processus.sh.*--daemon" | grep -v grep
else
    echo -e "${RED}❌ Aucun processus trouvé${NC}"
fi
echo ""

# 3. Vérifier les logs récents
echo -e "${YELLOW}[3/5] Dernières activités (10 dernières lignes)...${NC}"
LOG_FILE="${HOME}/bbyatchv2-master/logs/monitor-processus.log"
if [ -f "$LOG_FILE" ]; then
    tail -10 "$LOG_FILE"
    echo ""
    echo "Temps de la dernière vérification:"
    tail -1 "$LOG_FILE" | awk '{print $1, $2}'
else
    echo -e "${YELLOW}⚠️  Fichier de log non trouvé${NC}"
fi
echo ""

# 4. Vérifier la configuration cron (si installée)
echo -e "${YELLOW}[4/5] Vérification cron...${NC}"
CRON_JOBS=$(crontab -l 2>/dev/null | grep "monitor-processus.sh" || echo "")
if [ -n "$CRON_JOBS" ]; then
    echo -e "${GREEN}✓ Cron job configuré:${NC}"
    echo "$CRON_JOBS"
else
    echo -e "${YELLOW}⚠️  Aucun cron job trouvé (normal si vous utilisez systemd)${NC}"
fi
echo ""

# 5. Statistiques
echo -e "${YELLOW}[5/5] Statistiques...${NC}"
if [ -f "$LOG_FILE" ]; then
    TOTAL_CHECKS=$(grep -c "=== Début du monitoring ===" "$LOG_FILE" 2>/dev/null || echo "0")
    SUSPICIOUS=$(grep -c "PROCESSUS SUSPECT DÉTECTÉ" "$LOG_FILE" 2>/dev/null || echo "0")
    KILLED=$(grep -c "tué avec succès" "$LOG_FILE" 2>/dev/null || echo "0")
    
    echo "Total de vérifications: $TOTAL_CHECKS"
    echo "Processus suspects détectés: $SUSPICIOUS"
    echo "Processus tués: $KILLED"
    
    if [ "$TOTAL_CHECKS" -gt 0 ]; then
        echo ""
        echo "Dernière détection:"
        grep "PROCESSUS SUSPECT DÉTECTÉ" "$LOG_FILE" | tail -1 | awk -F']' '{print $2}' || echo "Aucune"
    fi
else
    echo "Aucune statistique disponible (log non trouvé)"
fi
echo ""

echo "=========================================="
echo "📋 RÉSUMÉ"
echo "=========================================="
echo ""

# Vérification finale
if systemctl is-active --quiet monitor-processus.service 2>/dev/null || [ -n "$MONITOR_PIDS" ]; then
    echo -e "${GREEN}✅ Le monitoring tourne en continu${NC}"
    echo ""
    echo "Mode de fonctionnement:"
    echo "  - Service systemd: $(systemctl is-active monitor-processus.service 2>/dev/null || echo 'Non actif')"
    echo "  - Vérification: Toutes les 60 secondes"
    echo "  - Redémarrage automatique: Oui (si crash)"
    echo ""
    echo "Commandes utiles:"
    echo "  - Voir les logs en temps réel: tail -f $LOG_FILE"
    echo "  - Redémarrer: sudo systemctl restart monitor-processus"
    echo "  - Arrêter: sudo systemctl stop monitor-processus"
    echo "  - Voir le statut: sudo systemctl status monitor-processus"
else
    echo -e "${RED}❌ Le monitoring ne tourne PAS${NC}"
    echo ""
    echo "Pour démarrer:"
    echo "  sudo systemctl start monitor-processus"
    echo "  sudo systemctl enable monitor-processus  # Pour démarrer au boot"
fi
echo ""

