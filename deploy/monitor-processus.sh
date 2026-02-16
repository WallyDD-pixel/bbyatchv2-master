#!/bin/bash

# Script de monitoring intelligent pour détecter et tuer les processus malveillants
# Usage: bash deploy/monitor-processus.sh [--daemon]
# En mode daemon: bash deploy/monitor-processus.sh --daemon &

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration des seuils
CPU_THRESHOLD=80          # % CPU au-delà duquel on considère suspect
CPU_DURATION=300         # Durée en secondes (5 min) à maintenir ce seuil
MEMORY_THRESHOLD=50      # % Mémoire au-delà duquel on considère suspect
MEMORY_MB_THRESHOLD=500  # Mémoire absolue en MB (au-delà = suspect même si % faible)

# Liste blanche des processus légitimes (ne JAMAIS tuer ces processus)
WHITELIST=(
    "systemd"
    "kernel"
    "kthreadd"
    "ksoftirqd"
    "migration"
    "rcu_"
    "PM2"
    "pm2"
    "node"
    "next-server"
    "nginx"
    "sshd"
    "ssm-agent"
    "amazon-ssm-agent"
    "fail2ban"
    "firewalld"
    "chronyd"
    "dbus"
    "auditd"
    "systemd-journald"
    "systemd-resolved"
    "systemd-logind"
    "irqbalance"
    "gssproxy"
    "python3.*fail2ban"
    "python3.*firewalld"
    "journalctl"
    "systemctl"
    "systemd-analyze"
    "systemd-cgtop"
)

# Chemins suspects (processus depuis ces chemins = très suspect)
SUSPICIOUS_PATHS=(
    "/tmp/"
    "/dev/"
    "/var/tmp/"
)

# Noms suspects (patterns de noms aléatoires typiques des malwares)
SUSPICIOUS_NAMES=(
    "^[a-zA-Z0-9]{8,}$"           # Noms aléatoires de 8+ caractères
    "^[a-z]{1}[A-Z0-9]{7,}$"       # Pattern comme cUpXNEP1
    "^[A-Z][a-z0-9]{7,}$"          # Pattern alternatif
)

LOG_FILE="${HOME}/bbyatchv2-master/logs/monitor-processus.log"
HISTORY_DIR="${HOME}/bbyatchv2-master/logs/monitor-history"
HISTORY_FILE="${HISTORY_DIR}/history-$(date +%Y-%m-%d).json"
STATS_FILE="${HISTORY_DIR}/stats.json"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$HISTORY_DIR"

# Fonction de logging (sans codes ANSI pour les logs)
log() {
    # Supprimer les codes ANSI pour les logs
    local message=$(echo "$1" | sed 's/\x1b\[[0-9;]*m//g')
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message" | tee -a "$LOG_FILE"
}

# Fonction de logging avec couleur pour la console uniquement
log_color() {
    local color="$1"
    shift
    local message="$@"
    echo -e "${color}${message}${NC}"
    log "$message"
}

# Fonction pour échapper les chaînes JSON (sans jq)
json_escape() {
    echo "$1" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed 's/\$/\\$/g' | sed ':a;N;$!ba;s/\n/\\n/g'
}

# Fonction pour enregistrer dans l'historique JSON
save_to_history() {
    local event_type="$1"
    local pid="$2"
    local cpu="$3"
    local mem="$4"
    local mem_mb="$5"
    local cmd="$6"
    local path="$7"
    local score="$8"
    local runtime="$9"
    local action="${10}"  # "detected", "killed", "monitored"
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local cmd_escaped=$(json_escape "$cmd")
    local path_escaped=$(json_escape "$path")
    local runtime_escaped=$(json_escape "$runtime")
    
    local entry=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "event_type": "$event_type",
  "pid": $pid,
  "cpu_percent": $cpu,
  "memory_percent": $mem,
  "memory_mb": $mem_mb,
  "command": "$cmd_escaped",
  "path": "$path_escaped",
  "suspicion_score": $score,
  "runtime": "$runtime_escaped",
  "action": "$action"
}
EOF
)
    
    # Ajouter à l'historique du jour (format JSON lines)
    echo "$entry" >> "$HISTORY_FILE"
    
    # Mettre à jour les statistiques
    update_stats "$event_type" "$action"
}

# Fonction pour mettre à jour les statistiques (sans jq)
update_stats() {
    local event_type="$1"
    local action="$2"
    
    # Initialiser le fichier de stats s'il n'existe pas
    if [ ! -f "$STATS_FILE" ]; then
        echo '{"total_checks": 0, "detections": 0, "killed": 0, "monitored": 0, "last_update": ""}' > "$STATS_FILE"
    fi
    
    # Lire les stats actuelles (méthode simple sans jq)
    local total_checks=$(grep -o '"total_checks": [0-9]*' "$STATS_FILE" | grep -o '[0-9]*' || echo "0")
    local detections=$(grep -o '"detections": [0-9]*' "$STATS_FILE" | grep -o '[0-9]*' || echo "0")
    local killed=$(grep -o '"killed": [0-9]*' "$STATS_FILE" | grep -o '[0-9]*' || echo "0")
    local monitored=$(grep -o '"monitored": [0-9]*' "$STATS_FILE" | grep -o '[0-9]*' || echo "0")
    
    # Mettre à jour selon l'action
    if [ "$action" = "killed" ]; then
        killed=$((killed + 1))
        detections=$((detections + 1))
    elif [ "$action" = "monitored" ]; then
        monitored=$((monitored + 1))
        detections=$((detections + 1))
    fi
    
    # Écrire les nouvelles stats (format JSON simple)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    cat > "$STATS_FILE" <<EOF
{
  "total_checks": $total_checks,
  "detections": $detections,
  "killed": $killed,
  "monitored": $monitored,
  "last_update": "$timestamp"
}
EOF
}

# Fonction pour vérifier si un processus est dans la whitelist
is_whitelisted() {
    local cmd="$1"
    local path="$2"
    
    # Vérifier la whitelist dans la commande ET le chemin
    for pattern in "${WHITELIST[@]}"; do
        if echo "$cmd" | grep -qiE "$pattern" || echo "$path" | grep -qiE "$pattern"; then
            return 0  # Trouvé dans whitelist
        fi
    done
    
    # Vérifier si c'est un processus système (PPID = 1 ou 2)
    local ppid=$(ps -o ppid= -p "$3" 2>/dev/null | xargs)
    if [ "$ppid" = "1" ] || [ "$ppid" = "2" ]; then
        # Processus système, vérifier plus strictement
        if echo "$cmd" | grep -qiE "^\[.*\]$"; then
            return 0  # Processus kernel (entre crochets)
        fi
    fi
    
    return 1  # Pas dans whitelist
}

# Fonction pour vérifier si un chemin est suspect
is_suspicious_path() {
    local path="$1"
    
    for suspicious in "${SUSPICIOUS_PATHS[@]}"; do
        if echo "$path" | grep -qiE "^$suspicious"; then
            return 0  # Chemin suspect
        fi
    done
    
    return 1  # Chemin normal
}

# Fonction pour vérifier si un nom est suspect
is_suspicious_name() {
    local name=$(basename "$1")
    
    for pattern in "${SUSPICIOUS_NAMES[@]}"; do
        if echo "$name" | grep -qiE "$pattern"; then
            return 0  # Nom suspect
        fi
    done
    
    return 1  # Nom normal
}

# Fonction pour calculer le score de suspicion
calculate_suspicion_score() {
    local pid="$1"
    local cpu="$2"
    local mem="$3"
    local mem_mb="$4"
    local cmd="$5"
    local path="$6"
    local score=0
    
    # Score basé sur CPU
    if (( $(echo "$cpu > $CPU_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        score=$((score + 30))
        if (( $(echo "$cpu > 90" | bc -l 2>/dev/null || echo "0") )); then
            score=$((score + 20))  # CPU très élevé = très suspect
        fi
    fi
    
    # Score basé sur mémoire
    if (( $(echo "$mem > $MEMORY_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
        score=$((score + 20))
    fi
    if [ "$mem_mb" -gt "$MEMORY_MB_THRESHOLD" ]; then
        score=$((score + 15))
    fi
    
    # Score basé sur le chemin
    if is_suspicious_path "$path"; then
        score=$((score + 40))  # Chemin suspect = très suspect
    fi
    
    # Score basé sur le nom
    if is_suspicious_name "$path"; then
        score=$((score + 35))  # Nom suspect = très suspect
    fi
    
    # Vérifier si le processus est dans /tmp avec un nom aléatoire
    if echo "$path" | grep -qiE "^/tmp/[a-zA-Z0-9]{8,}$"; then
        score=$((score + 50))  # Très suspect (comme cUpXNEP1)
    fi
    
    echo "$score"
}

# Fonction principale de monitoring
monitor_processes() {
    log "=== Début du monitoring ==="
    
    # Mettre à jour le compteur de vérifications
    if [ -f "$STATS_FILE" ]; then
        local total_checks=$(grep -o '"total_checks": [0-9]*' "$STATS_FILE" | grep -o '[0-9]*' || echo "0")
        total_checks=$((total_checks + 1))
        local detections=$(grep -o '"detections": [0-9]*' "$STATS_FILE" | grep -o '[0-9]*' || echo "0")
        local killed=$(grep -o '"killed": [0-9]*' "$STATS_FILE" | grep -o '[0-9]*' || echo "0")
        local monitored=$(grep -o '"monitored": [0-9]*' "$STATS_FILE" | grep -o '[0-9]*' || echo "0")
        local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        cat > "$STATS_FILE" <<EOF
{
  "total_checks": $total_checks,
  "detections": $detections,
  "killed": $killed,
  "monitored": $monitored,
  "last_update": "$timestamp"
}
EOF
    fi
    
    # Obtenir tous les processus
    ps aux --sort=-%cpu | tail -n +2 | while read -r line; do
        pid=$(echo "$line" | awk '{print $2}')
        cpu=$(echo "$line" | awk '{print $3}')
        mem=$(echo "$line" | awk '{print $4}')
        cmd=$(echo "$line" | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}' | xargs)
        
        # Ignorer les processus sans PID valide
        if [ -z "$pid" ] || [ "$pid" = "PID" ]; then
            continue
        fi
        
        # Obtenir le chemin complet
        exe_path=$(readlink -f /proc/$pid/exe 2>/dev/null || echo "$cmd" | awk '{print $1}')
        if [ -z "$exe_path" ] || [ "$exe_path" = "deleted" ]; then
            exe_path=$(ps -p $pid -o cmd= 2>/dev/null | awk '{print $1}' | head -1)
        fi
        
        # Obtenir la mémoire en MB
        mem_mb=$(echo "$line" | awk '{print $6}')
        
        # Vérifier si le processus est dans la whitelist
        if is_whitelisted "$cmd" "$exe_path" "$pid"; then
            continue  # Ignorer les processus légitimes
        fi
        
        # Calculer le score de suspicion
        score=$(calculate_suspicion_score "$pid" "$cpu" "$mem" "$mem_mb" "$cmd" "$exe_path")
        
        # Si score > 50, considérer comme suspect
        if [ "$score" -ge 50 ]; then
            # Vérifier la durée d'exécution
            runtime=$(ps -o etime= -p "$pid" 2>/dev/null | xargs)
            
            log_color "$RED" "⚠️  PROCESSUS SUSPECT DÉTECTÉ"
            log "PID: $pid"
            log "CPU: ${cpu}%"
            log "Mémoire: ${mem}% (${mem_mb} MB)"
            log "Commande: $cmd"
            log "Chemin: $exe_path"
            log "Score de suspicion: $score/100"
            log "Durée: $runtime"
            
            # Enregistrer dans l'historique (action initiale: détecté)
            save_to_history "suspicious_process" "$pid" "$cpu" "$mem" "$mem_mb" "$cmd" "$exe_path" "$score" "$runtime" "detected"
            
            # Décision de tuer le processus
            should_kill=false
            
            # Tuer si CPU > seuil ET durée > durée minimale
            if (( $(echo "$cpu > $CPU_THRESHOLD" | bc -l 2>/dev/null || echo "0") )); then
                # Convertir runtime en secondes pour vérification
                runtime_sec=$(echo "$runtime" | awk -F: '{if(NF==2) print $1*60+$2; else if(NF==3) print $1*3600+$2*60+$3; else print 0}')
                if [ "$runtime_sec" -ge "$CPU_DURATION" ] || [ "$score" -ge 80 ]; then
                    should_kill=true
                fi
            fi
            
            # Tuer immédiatement si très suspect (chemin /tmp avec nom aléatoire)
            if echo "$exe_path" | grep -qiE "^/tmp/[a-zA-Z0-9]{8,}$"; then
                should_kill=true
                log_color "$RED" "🔴 CHEMIN TRÈS SUSPECT (/tmp avec nom aléatoire) - Tuer immédiatement"
            fi
            
            # Tuer si CPU > 90% pendant plus de 2 minutes
            if (( $(echo "$cpu > 90" | bc -l 2>/dev/null || echo "0") )); then
                runtime_sec=$(echo "$runtime" | awk -F: '{if(NF==2) print $1*60+$2; else if(NF==3) print $1*3600+$2*60+$3; else print 0}')
                if [ "$runtime_sec" -ge 120 ]; then
                    should_kill=true
                    log_color "$RED" "🔴 CPU > 90% pendant > 2 min - Tuer"
                fi
            fi
            
            if [ "$should_kill" = true ]; then
                log_color "$RED" "🔴 TUER LE PROCESSUS $pid"
                kill -9 "$pid" 2>/dev/null
                sleep 1
                
                # Vérifier qu'il est bien mort
                if ps -p "$pid" > /dev/null 2>&1; then
                    log_color "$RED" "❌ Échec - processus toujours actif, tentative supplémentaire"
                    killall -9 "$(basename "$exe_path")" 2>/dev/null
                else
                    log_color "$GREEN" "✓ Processus $pid tué avec succès"
                    
                    # Enregistrer dans l'historique (action: tué)
                    save_to_history "process_killed" "$pid" "$cpu" "$mem" "$mem_mb" "$cmd" "$exe_path" "$score" "$runtime" "killed"
                    
                    # Essayer de supprimer le fichier s'il existe
                    if [ -f "$exe_path" ] && [ "$exe_path" != "deleted" ]; then
                        rm -f "$exe_path" 2>/dev/null && log "✓ Fichier $exe_path supprimé" || log "⚠️  Impossible de supprimer $exe_path"
                    fi
                fi
            else
                log_color "$YELLOW" "⚠️  Processus suspect mais pas encore tué (surveillance continue)"
                
                # Enregistrer dans l'historique (action: surveillé mais pas tué)
                save_to_history "process_monitored" "$pid" "$cpu" "$mem" "$mem_mb" "$cmd" "$exe_path" "$score" "$runtime" "monitored"
            fi
        fi
    done
    
    log "=== Fin du monitoring ==="
}

# Mode daemon
if [ "$1" = "--daemon" ]; then
    log "Démarrage en mode daemon (vérification toutes les 60 secondes)"
    while true; do
        monitor_processes
        sleep 60
    done
else
    # Mode one-shot
    monitor_processes
fi

