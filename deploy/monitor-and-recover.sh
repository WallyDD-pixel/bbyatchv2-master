#!/bin/bash
# Script de monitoring et auto-recovery pour maintenir le site en ligne
# Ce script vérifie l'état du site et le redémarre automatiquement en cas de panne

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="bbyatch"
APP_PORT=3003
APP_URL="https://preprod.bbservicescharter.com"
LOCAL_URL="http://localhost:${APP_PORT}"
LOG_FILE="${SCRIPT_DIR}/monitor.log"
MAX_LOG_SIZE=10485760  # 10MB
ALERT_EMAIL=""  # Optionnel: email pour les alertes
CHECK_INTERVAL=60  # Vérification toutes les 60 secondes
MAX_RESTART_ATTEMPTS=3  # Nombre max de tentatives de redémarrage avant alerte
RESTART_COOLDOWN=300  # 5 minutes entre les redémarrages

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging avec timestamp
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "${BLUE}$*${NC}"
}

log_success() {
    log "SUCCESS" "${GREEN}$*${NC}"
}

log_warning() {
    log "WARNING" "${YELLOW}$*${NC}"
}

log_error() {
    log "ERROR" "${RED}$*${NC}"
}

# Nettoyer les anciens logs si trop volumineux
cleanup_logs() {
    if [ -f "${LOG_FILE}" ] && [ $(stat -f%z "${LOG_FILE}" 2>/dev/null || stat -c%s "${LOG_FILE}" 2>/dev/null || echo 0) -gt ${MAX_LOG_SIZE} ]; then
        tail -n 1000 "${LOG_FILE}" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "${LOG_FILE}"
        log_info "Logs nettoyés (taille max dépassée)"
    fi
}

# Vérifier si l'application répond
check_app_health() {
    local url=$1
    local timeout=10
    
    # Test HTTP
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time ${timeout} "${url}" 2>/dev/null || echo "000")
    
    if [ "${http_code}" = "200" ] || [ "${http_code}" = "404" ] || [ "${http_code}" = "301" ] || [ "${http_code}" = "302" ]; then
        return 0  # OK
    else
        return 1  # KO
    fi
}

# Vérifier l'état PM2
check_pm2_status() {
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 n'est pas installé"
        return 1
    fi
    
    local status=$(pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown")
    local pid=$(pm2 jlist 2>/dev/null | grep -o '"pid":[0-9]*' | head -1 | cut -d':' -f2 || echo "0")
    
    if [ "${status}" = "online" ] && [ "${pid}" != "0" ]; then
        return 0  # OK
    else
        log_warning "PM2 status: ${status}, PID: ${pid}"
        return 1  # KO
    fi
}

# Vérifier si le port est utilisé
check_port() {
    if ss -tlnp 2>/dev/null | grep -q ":${APP_PORT} " || netstat -tlnp 2>/dev/null | grep -q ":${APP_PORT} "; then
        return 0  # Port utilisé
    else
        return 1  # Port libre
    fi
}

# Vérifier la mémoire disponible
check_memory() {
    local available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    
    if [ "${available_mem}" -lt 100 ]; then
        log_warning "Mémoire disponible faible: ${available_mem}MB"
        return 1
    fi
    return 0
}

# Vérifier la connexion à la base de données
check_database() {
    if [ ! -f "${SCRIPT_DIR}/.env" ]; then
        log_warning "Fichier .env non trouvé"
        return 1
    fi
    
    # Test simple: vérifier que DATABASE_URL est défini
    if grep -q "^DATABASE_URL=" "${SCRIPT_DIR}/.env" 2>/dev/null; then
        return 0
    else
        log_error "DATABASE_URL non défini dans .env"
        return 1
    fi
}

# Vérifier les processus Node
check_node_processes() {
    local node_count=$(ps aux | grep -E "node|next" | grep -v grep | wc -l | tr -d ' ')
    
    if [ "${node_count}" -gt 0 ]; then
        return 0
    else
        log_warning "Aucun processus Node trouvé"
        return 1
    fi
}

# Redémarrer l'application
restart_app() {
    log_info "Tentative de redémarrage de l'application..."
    
    cd "${SCRIPT_DIR}"
    
    # 1. Arrêter PM2
    pm2 stop "${APP_NAME}" 2>/dev/null || true
    pm2 delete "${APP_NAME}" 2>/dev/null || true
    sleep 2
    
    # 2. Tuer les processus Node qui traînent
    pkill -9 -f "next-server" 2>/dev/null || true
    pkill -9 -f "node.*${APP_PORT}" 2>/dev/null || true
    sleep 2
    
    # 3. Libérer le port si nécessaire
    if check_port; then
        log_warning "Port ${APP_PORT} encore utilisé, libération forcée..."
        fuser -k ${APP_PORT}/tcp 2>/dev/null || true
        sleep 2
    fi
    
    # 4. Nettoyer les caches
    rm -rf .next/cache 2>/dev/null || true
    rm -rf node_modules/.cache 2>/dev/null || true
    
    # 5. Vérifier la mémoire
    if ! check_memory; then
        log_warning "Mémoire faible, nettoyage du swap..."
        sudo swapoff -a 2>/dev/null || true
        sudo swapon -a 2>/dev/null || true
    fi
    
    # 6. Redémarrer avec PM2
    export NODE_OPTIONS="--max-old-space-size=2048"
    pm2 start ecosystem.config.cjs
    sleep 5
    
    # 7. Vérifier que ça a démarré
    if check_pm2_status; then
        log_success "Application redémarrée avec succès"
        return 0
    else
        log_error "Échec du redémarrage"
        return 1
    fi
}

# Vérification complète de l'état
full_health_check() {
    local issues=0
    local checks_passed=0
    
    log_info "=== Vérification de santé ==="
    
    # 1. Vérifier PM2
    if check_pm2_status; then
        log_success "✓ PM2: OK"
        ((checks_passed++))
    else
        log_error "✗ PM2: ÉCHEC"
        ((issues++))
    fi
    
    # 2. Vérifier le port
    if check_port; then
        log_success "✓ Port ${APP_PORT}: Utilisé (OK)"
        ((checks_passed++))
    else
        log_error "✗ Port ${APP_PORT}: Libre (PROBLÈME)"
        ((issues++))
    fi
    
    # 3. Vérifier la réponse locale
    if check_app_health "${LOCAL_URL}"; then
        log_success "✓ Application locale: Répond"
        ((checks_passed++))
    else
        log_error "✗ Application locale: Ne répond pas"
        ((issues++))
    fi
    
    # 4. Vérifier la réponse publique (optionnel, peut échouer si Nginx est down)
    if check_app_health "${APP_URL}"; then
        log_success "✓ Site public: Accessible"
        ((checks_passed++))
    else
        log_warning "⚠ Site public: Inaccessible (peut être Nginx)"
    fi
    
    # 5. Vérifier la mémoire
    if check_memory; then
        log_success "✓ Mémoire: OK"
        ((checks_passed++))
    else
        log_warning "⚠ Mémoire: Faible"
    fi
    
    # 6. Vérifier la base de données
    if check_database; then
        log_success "✓ Base de données: Configurée"
        ((checks_passed++))
    else
        log_warning "⚠ Base de données: Problème de configuration"
    fi
    
    # 7. Vérifier les processus Node
    if check_node_processes; then
        log_success "✓ Processus Node: Présents"
        ((checks_passed++))
    else
        log_warning "⚠ Processus Node: Absents"
    fi
    
    log_info "Résultat: ${checks_passed}/7 vérifications OK"
    
    return ${issues}
}

# Fonction principale de monitoring
monitor_loop() {
    local consecutive_failures=0
    local last_restart_time=0
    local restart_count=0
    
    log_info "=== Démarrage du monitoring ==="
    log_info "URL: ${APP_URL}"
    log_info "Port local: ${APP_PORT}"
    log_info "Intervalle de vérification: ${CHECK_INTERVAL}s"
    
    while true; do
        cleanup_logs
        
        # Vérification complète
        if full_health_check; then
            # Tout est OK
            if [ ${consecutive_failures} -gt 0 ]; then
                log_success "Site rétabli après ${consecutive_failures} échec(s)"
                consecutive_failures=0
                restart_count=0
            fi
        else
            # Problème détecté
            ((consecutive_failures++))
            log_error "Problème détecté (échec consécutif #${consecutive_failures})"
            
            # Vérifier si on peut redémarrer
            local current_time=$(date +%s)
            local time_since_restart=$((current_time - last_restart_time))
            
            if [ ${restart_count} -lt ${MAX_RESTART_ATTEMPTS} ] && [ ${time_since_restart} -gt ${RESTART_COOLDOWN} ]; then
                log_warning "Tentative de récupération automatique..."
                if restart_app; then
                    last_restart_time=$(date +%s)
                    ((restart_count++))
                    consecutive_failures=0
                    log_success "Récupération réussie (tentative ${restart_count}/${MAX_RESTART_ATTEMPTS})"
                else
                    log_error "Échec de la récupération"
                fi
            elif [ ${restart_count} -ge ${MAX_RESTART_ATTEMPTS} ]; then
                log_error "⚠️  ALERTE: Nombre maximum de redémarrages atteint (${MAX_RESTART_ATTEMPTS})"
                log_error "⚠️  Intervention manuelle requise !"
                # Ici on pourrait envoyer un email d'alerte
            elif [ ${time_since_restart} -le ${RESTART_COOLDOWN} ]; then
                log_warning "Cooldown actif: ${time_since_restart}s/${RESTART_COOLDOWN}s"
            fi
        fi
        
        # Attendre avant la prochaine vérification
        sleep ${CHECK_INTERVAL}
    done
}

# Gestion des signaux pour arrêt propre
trap 'log_info "Arrêt du monitoring..."; exit 0' SIGINT SIGTERM

# Point d'entrée
main() {
    cd "${SCRIPT_DIR}"
    
    # Vérifier que PM2 est installé
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 n'est pas installé. Installez-le avec: npm install -g pm2"
        exit 1
    fi
    
    # Démarrer le monitoring
    monitor_loop
}

# Exécuter le script
main "$@"
