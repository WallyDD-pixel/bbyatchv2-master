#!/bin/bash

# Script pour voir l'historique du monitoring
# Usage: bash deploy/voir-historique.sh [--today|--week|--month|--all]

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

HISTORY_DIR="${HOME}/bbyatchv2-master/logs/monitor-history"
STATS_FILE="${HISTORY_DIR}/stats.json"

echo "=========================================="
echo "📊 HISTORIQUE DU MONITORING"
echo "=========================================="
echo ""

# Fonction pour lire les valeurs JSON (sans jq si nécessaire)
read_json_value() {
    local file="$1"
    local key="$2"
    if command -v jq &> /dev/null; then
        jq -r ".$key // 0" "$file" 2>/dev/null || echo "0"
    else
        grep -o "\"$key\": [0-9]*" "$file" 2>/dev/null | grep -o '[0-9]*' || echo "0"
    fi
}

read_json_string() {
    local file="$1"
    local key="$2"
    if command -v jq &> /dev/null; then
        jq -r ".$key // \"\"" "$file" 2>/dev/null || echo ""
    else
        grep -o "\"$key\": \"[^\"]*\"" "$file" 2>/dev/null | sed 's/.*"\(.*\)".*/\1/' || echo ""
    fi
}

# Afficher les statistiques globales
if [ -f "$STATS_FILE" ]; then
    echo -e "${YELLOW}Statistiques globales:${NC}"
    total_checks=$(read_json_value "$STATS_FILE" "total_checks")
    detections=$(read_json_value "$STATS_FILE" "detections")
    killed=$(read_json_value "$STATS_FILE" "killed")
    monitored=$(read_json_value "$STATS_FILE" "monitored")
    last_update=$(read_json_string "$STATS_FILE" "last_update")
    
    echo "  Total de vérifications: $total_checks"
    echo "  Processus suspects détectés: $detections"
    echo "  Processus tués: $killed"
    echo "  Processus surveillés: $monitored"
    if [ -n "$last_update" ]; then
        echo "  Dernière mise à jour: $last_update"
    fi
    echo ""
fi

# Déterminer quelle période afficher
PERIOD="${1:---today}"

case "$PERIOD" in
    --today)
        DATE_FILTER=$(date +%Y-%m-%d)
        PERIOD_NAME="Aujourd'hui"
        ;;
    --week)
        DATE_FILTER=$(date -d "7 days ago" +%Y-%m-%d)
        PERIOD_NAME="7 derniers jours"
        ;;
    --month)
        DATE_FILTER=$(date -d "30 days ago" +%Y-%m-%d)
        PERIOD_NAME="30 derniers jours"
        ;;
    --all)
        DATE_FILTER=""
        PERIOD_NAME="Tout l'historique"
        ;;
    *)
        DATE_FILTER=$(date +%Y-%m-%d)
        PERIOD_NAME="Aujourd'hui"
        ;;
esac

echo -e "${YELLOW}Période: $PERIOD_NAME${NC}"
echo ""

# Compter les fichiers d'historique
if [ -z "$DATE_FILTER" ]; then
    HISTORY_FILES=$(ls -1 "$HISTORY_DIR"/history-*.json 2>/dev/null | sort)
else
    # Trouver tous les fichiers depuis la date
    HISTORY_FILES=$(ls -1 "$HISTORY_DIR"/history-*.json 2>/dev/null | awk -v date="$DATE_FILTER" -F'-' '$NF >= date' | sort)
fi

if [ -z "$HISTORY_FILES" ]; then
    echo -e "${YELLOW}⚠️  Aucun historique trouvé${NC}"
    exit 0
fi

# Compter les événements
TOTAL_EVENTS=0
TOTAL_KILLED=0
TOTAL_MONITORED=0

for file in $HISTORY_FILES; do
    if [ -f "$file" ]; then
        event_count=$(wc -l < "$file" 2>/dev/null || echo "0")
        TOTAL_EVENTS=$((TOTAL_EVENTS + event_count))
        
        killed_count=$(grep -c '"action": "killed"' "$file" 2>/dev/null || echo "0")
        TOTAL_KILLED=$((TOTAL_KILLED + killed_count))
        
        monitored_count=$(grep -c '"action": "monitored"' "$file" 2>/dev/null || echo "0")
        TOTAL_MONITORED=$((TOTAL_MONITORED + monitored_count))
    fi
done

echo "Événements trouvés: $TOTAL_EVENTS"
echo "  - Processus tués: $TOTAL_KILLED"
echo "  - Processus surveillés: $TOTAL_MONITORED"
echo ""

# Afficher les derniers événements
echo -e "${YELLOW}Derniers événements (10 plus récents):${NC}"
echo ""

# Concaténer tous les fichiers et extraire les événements
if command -v jq &> /dev/null; then
    # Utiliser jq si disponible
    cat $HISTORY_FILES 2>/dev/null | jq -s 'sort_by(.timestamp) | reverse | .[0:10]' | jq -r '.[] | "\(.timestamp)|\(.event_type)|\(.pid)|\(.cpu_percent)|\(.memory_mb)|\(.suspicion_score)|\(.action)|\(.command)"' | while IFS='|' read -r timestamp event_type pid cpu mem score action cmd; do
        if [ "$action" = "killed" ]; then
            echo -e "${RED}🔴 $timestamp${NC} | $event_type | PID: $pid | CPU: $cpu% | Mémoire: $mem MB | Score: $score | ${RED}TUÉ${NC}"
        elif [ "$action" = "monitored" ]; then
            echo -e "${YELLOW}⚠️  $timestamp${NC} | $event_type | PID: $pid | CPU: $cpu% | Mémoire: $mem MB | Score: $score | ${YELLOW}SURVEILLÉ${NC}"
        else
            echo -e "${BLUE}ℹ️  $timestamp${NC} | $event_type | PID: $pid | CPU: $cpu% | Mémoire: $mem MB | Score: $score | $action"
        fi
        echo "  Commande: $cmd"
        echo ""
    done
    
    # Afficher les processus tués récemment
    echo ""
    echo -e "${YELLOW}Processus tués récemment:${NC}"
    cat $HISTORY_FILES 2>/dev/null | jq -s 'sort_by(.timestamp) | reverse | map(select(.action == "killed")) | .[0:5]' | jq -r '.[] | "\(.timestamp)|\(.pid)|\(.command)|\(.suspicion_score)"' | while IFS='|' read -r timestamp pid cmd score; do
        echo -e "${RED}🔴 $timestamp${NC} | PID: $pid | Score: $score"
        echo "  $cmd"
        echo ""
    done
else
    # Méthode alternative sans jq (simple parsing)
    echo -e "${YELLOW}⚠️  jq non installé - affichage simplifié${NC}"
    echo "Pour une meilleure visualisation, installez jq: sudo yum install jq (ou sudo apt install jq)"
    echo ""
    # Afficher les 10 dernières lignes de chaque fichier
    for file in $HISTORY_FILES; do
        if [ -f "$file" ]; then
            echo "Fichier: $(basename $file)"
            tail -5 "$file" | grep -o '"timestamp": "[^"]*"' | head -5
            echo ""
        fi
    done
fi

echo ""
echo "=========================================="
echo "📋 Commandes utiles"
echo "=========================================="
echo ""
echo "Voir l'historique:"
echo "  bash deploy/voir-historique.sh --today    # Aujourd'hui"
echo "  bash deploy/voir-historique.sh --week     # 7 derniers jours"
echo "  bash deploy/voir-historique.sh --month    # 30 derniers jours"
echo "  bash deploy/voir-historique.sh --all      # Tout l'historique"
echo ""
echo "Fichiers d'historique:"
echo "  ls -lh $HISTORY_DIR/"
echo ""

