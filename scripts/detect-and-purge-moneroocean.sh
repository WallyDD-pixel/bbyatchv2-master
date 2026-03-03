#!/usr/bin/env bash
#
# Détecteur + purge du malware MoneroOcean (cryptomineur).
# Si le dossier moneroocean (ou fichiers/processus liés) est détecté, applique la stratégie de purge.
#
# Usage:
#   ./detect-and-purge-moneroocean.sh          # exécution manuelle
#   sudo ./detect-and-purge-moneroocean.sh     # avec droits root (recommandé pour iptables + purge complète)
#
# Installation en surveillance (cron toutes les 5 min) :
#   sudo cp scripts/detect-and-purge-moneroocean.sh /usr/local/bin/
#   sudo chmod +x /usr/local/bin/detect-and-purge-moneroocean.sh
#   sudo crontab -e
#   Ajouter: */5 * * * * /usr/local/bin/detect-and-purge-moneroocean.sh
#

# Ne pas utiliser set -e : on veut exécuter toute la purge même si une commande échoue
LOG_FILE="${LOG_FILE:-/var/log/moneroocean-purge.log}"
# Si pas de droits d'écriture dans /var/log, utiliser le répertoire courant
if ! touch "$LOG_FILE" 2>/dev/null; then
  LOG_FILE="./moneroocean-purge.log"
fi

MALWARE_IP="91.92.243.113"
FOUND=0

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Détection: dossiers et fichiers connus
check_locations() {
  local dirs_to_check=(
    "$HOME/moneroocean"
    "/tmp/moneroocean"
    "/var/tmp/moneroocean"
    "$HOME/system-check"
    "/var/tmp/system-check"
    "/tmp/system-check"
  )
  local files_to_check=(
    "$HOME/logic.sh"
    "/tmp/logic.sh"
    "/var/tmp/logic.sh"
    "/var/tmp/system-check"
    "/tmp/system-check"
  )
  for d in "${dirs_to_check[@]}"; do
    if [[ -d "$d" ]]; then
      log "DÉTECTION: dossier malveillant trouvé: $d"
      FOUND=1
    fi
  done
  for f in "${files_to_check[@]}"; do
    if [[ -f "$f" ]]; then
      log "DÉTECTION: fichier malveillant trouvé: $f"
      FOUND=1
    fi
  done
  # Processus suspects
  if pgrep -f "moneroocean" >/dev/null 2>&1 || \
     pgrep -f "xmrig" >/dev/null 2>&1 || \
     pgrep -f "logic\.sh" >/dev/null 2>&1 || \
     pgrep -f "system-check" >/dev/null 2>&1; then
    log "DÉTECTION: processus de minage en cours"
    FOUND=1
  fi
}

# Purge: tuer les processus
purge_processes() {
  log "Purge: arrêt des processus malveillants..."
  for pattern in "moneroocean" "xmrig" "logic.sh" "system-check" "miner"; do
    if pgrep -f "$pattern" >/dev/null 2>&1; then
      pkill -9 -f "$pattern" 2>/dev/null || true
      log "  -> processus -f $pattern tués"
    fi
  done
}

# Purge: supprimer dossiers et fichiers
purge_files() {
  log "Purge: suppression des dossiers et fichiers..."
  local dirs=(
    "$HOME/moneroocean"
    "/tmp/moneroocean"
    "/var/tmp/moneroocean"
    "$HOME/system-check"
    "/var/tmp/system-check"
    "/tmp/system-check"
  )
  local files=(
    "$HOME/logic.sh"
    "/tmp/logic.sh"
    "/var/tmp/logic.sh"
    "/var/tmp/system-check"
    "/tmp/system-check"
  )
  for d in "${dirs[@]}"; do
    if [[ -d "$d" ]]; then
      rm -rf "$d" 2>/dev/null || sudo rm -rf "$d" 2>/dev/null || true
      log "  -> supprimé: $d"
    fi
  done
  for f in "${files[@]}"; do
    if [[ -f "$f" ]]; then
      rm -f "$f" 2>/dev/null || sudo rm -f "$f" 2>/dev/null || true
      log "  -> supprimé: $f"
    fi
  done
}

# Bloquer l'IP malveillante (nécessite root)
block_malware_ip() {
  if ! command -v iptables &>/dev/null; then
    log "Purge: iptables non disponible, skip blocage IP"
    return
  fi
  if [[ "$(id -u)" -ne 0 ]]; then
    log "Purge: blocage IP (sudo)..."
    if ! sudo iptables -C OUTPUT -d "$MALWARE_IP" -j DROP 2>/dev/null; then
      sudo iptables -A OUTPUT -d "$MALWARE_IP" -j DROP
      log "  -> règle OUTPUT -d $MALWARE_IP ajoutée"
    fi
    if ! sudo iptables -C INPUT -s "$MALWARE_IP" -j DROP 2>/dev/null; then
      sudo iptables -A INPUT -s "$MALWARE_IP" -j DROP
      log "  -> règle INPUT -s $MALWARE_IP ajoutée"
    fi
  else
    if ! iptables -C OUTPUT -d "$MALWARE_IP" -j DROP 2>/dev/null; then
      iptables -A OUTPUT -d "$MALWARE_IP" -j DROP
      log "  -> règle OUTPUT -d $MALWARE_IP ajoutée"
    fi
    if ! iptables -C INPUT -s "$MALWARE_IP" -j DROP 2>/dev/null; then
      iptables -A INPUT -s "$MALWARE_IP" -j DROP
      log "  -> règle INPUT -s $MALWARE_IP ajoutée"
    fi
  fi
  # Persistance des règles (Amazon Linux 2 / RHEL)
  if [[ -d /etc/sysconfig ]]; then
    iptables-save 2>/dev/null | tee /etc/sysconfig/iptables >/dev/null 2>&1 || \
    sudo iptables-save 2>/dev/null | sudo tee /etc/sysconfig/iptables >/dev/null 2>&1 || true
  fi
}

# --- Main ---
main() {
  check_locations
  if [[ $FOUND -eq 0 ]]; then
    # Pas de log à chaque run pour éviter de remplir le disque quand tout va bien
    # Décommenter la ligne suivante pour tracer chaque exécution:
    # log "Aucune menace détectée."
    exit 0
  fi

  log "========== PURGE AUTOMATIQUE DÉMARRÉE =========="
  purge_processes
  purge_files
  block_malware_ip
  log "========== PURGE TERMINÉE =========="
}

main "$@"
