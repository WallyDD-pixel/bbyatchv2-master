#!/bin/bash

# Script de protection de la mémoire contre le malware
# Tue automatiquement les processus qui consomment trop de mémoire

LOG_FILE="/var/log/memory-protection.log"
MAX_MEMORY_PERCENT=85  # Si la mémoire système > 85%, tuer les processus suspects
MAX_PROCESS_MEMORY=500  # Tuer les processus suspects qui utilisent > 500MB

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | sudo tee -a "$LOG_FILE" > /dev/null
}

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

THREAT_DETECTED=0
PROCESSES_KILLED=0

# 1. Vérifier l'utilisation globale de la mémoire
MEM_TOTAL=$(free | grep Mem | awk '{print $2}')
MEM_USED=$(free | grep Mem | awk '{print $3}')
MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))

log "Mémoire système: ${MEM_PERCENT}% utilisée (${MEM_USED}KB / ${MEM_TOTAL}KB)"

# 2. Si la mémoire est critique, tuer les processus suspects
if [ "$MEM_PERCENT" -gt "$MAX_MEMORY_PERCENT" ]; then
    log "ALERTE: Mémoire critique (${MEM_PERCENT}%) - Recherche de processus suspects..."
    
    # Tuer tous les processus malveillants connus
    MALWARE_PATTERNS=("xmrig" "moneroocean" "miner" "scanner_linux" "systemwatcher")
    
    for pattern in "${MALWARE_PATTERNS[@]}"; do
        PIDS=$(pgrep -f "$pattern" 2>/dev/null || true)
        if [ -n "$PIDS" ]; then
            for pid in $PIDS; do
                MEM_USAGE=$(ps -o rss= -p "$pid" 2>/dev/null | awk '{print int($1/1024)}')
                if [ -n "$MEM_USAGE" ] && [ "$MEM_USAGE" -gt 0 ]; then
                    log "Processus suspect détecté: $pattern (PID: $pid, Mémoire: ${MEM_USAGE}MB)"
                    kill -9 "$pid" 2>/dev/null && log "Processus $pid tué" && PROCESSES_KILLED=$((PROCESSES_KILLED + 1))
                fi
            done
        fi
    done
    
    # 3. Tuer les processus Node.js suspects (qui ne sont pas notre application)
    PM2_PIDS=$(pm2 jlist 2>/dev/null | grep -o '"pid":[0-9]*' | cut -d: -f2 || true)
    
    ps aux | grep node | grep -v grep | while read line; do
        PID=$(echo "$line" | awk '{print $2}')
        MEM_MB=$(echo "$line" | awk '{print int($6/1024)}')
        CMD=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
        
        # Ignorer les processus PM2 légitimes
        IS_PM2_PROCESS=0
        for pm2_pid in $PM2_PIDS; do
            if [ "$PID" = "$pm2_pid" ]; then
                IS_PM2_PROCESS=1
                break
            fi
        done
        
        # Si c'est un processus Node.js suspect (pas PM2, utilise beaucoup de mémoire)
        if [ "$IS_PM2_PROCESS" -eq 0 ] && [ "$MEM_MB" -gt "$MAX_PROCESS_MEMORY" ]; then
            # Vérifier si c'est un processus malveillant
            if echo "$CMD" | grep -qE "(xmrig|moneroocean|miner|scanner|wget.*github.com/xmrig|curl.*tli.sh)"; then
                log "ALERTE: Processus Node.js suspect détecté (PID: $PID, Mémoire: ${MEM_MB}MB, CMD: $CMD)"
                kill -9 "$PID" 2>/dev/null && log "Processus suspect $PID tué" && PROCESSES_KILLED=$((PROCESSES_KILLED + 1))
                THREAT_DETECTED=1
            fi
        fi
    done
    
    # 4. Si la mémoire est toujours critique, tuer les processus les plus gourmands (sauf notre app)
    if [ "$MEM_PERCENT" -gt 90 ]; then
        log "ALERTE CRITIQUE: Mémoire > 90% - Recherche des processus les plus gourmands..."
        
        # Trouver les 5 processus les plus gourmands (sauf kernel, systemd, nginx, notre app)
        ps aux --sort=-%mem | head -10 | tail -5 | while read line; do
            PID=$(echo "$line" | awk '{print $2}')
            MEM_PCT=$(echo "$line" | awk '{print $4}')
            CMD=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
            
            # Ignorer les processus système essentiels et notre application
            if ! echo "$CMD" | grep -qE "(systemd|kernel|nginx|pm2|next|node.*bbyatch)" && \
               [ "$(echo "$MEM_PCT" | cut -d. -f1)" -gt 10 ]; then
                log "Processus gourmand détecté (PID: $PID, Mémoire: ${MEM_PCT}%, CMD: $CMD)"
                # Vérifier si c'est suspect avant de tuer
                if echo "$CMD" | grep -qE "(xmrig|moneroocean|miner|scanner|wget|curl.*sh)"; then
                    kill -9 "$PID" 2>/dev/null && log "Processus suspect $PID tué" && PROCESSES_KILLED=$((PROCESSES_KILLED + 1))
                    THREAT_DETECTED=1
                fi
            fi
        done
    fi
fi

# 5. Vérifier que notre application a assez de mémoire
PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"pm_id":0' || true)
if [ -n "$PM2_STATUS" ]; then
    APP_MEM=$(pm2 jlist 2>/dev/null | grep -o '"memory":[0-9]*' | head -1 | cut -d: -f2 || echo "0")
    APP_MEM_MB=$((APP_MEM / 1024 / 1024))
    
    if [ "$APP_MEM_MB" -gt 1536 ]; then
        log "ALERTE: L'application utilise ${APP_MEM_MB}MB (limite: 1536MB) - Redémarrage..."
        pm2 restart bbyatch 2>/dev/null && log "Application redémarrée"
    fi
fi

# Résumé
if [ $THREAT_DETECTED -eq 1 ] || [ $PROCESSES_KILLED -gt 0 ]; then
    log "MENACE DÉTECTÉE ET NETTOYÉE: $PROCESSES_KILLED processus tué(s), Mémoire: ${MEM_PERCENT}%"
    exit 1
else
    log "Mémoire OK: ${MEM_PERCENT}%"
    exit 0
fi
