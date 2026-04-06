#!/usr/bin/env bash
#
# Surveille les processus à CPU anormalement élevé trop longtemps.
# - Ne touche PAS aux processus légitimes (liste blanche : Next, Node, nginx, etc.).
# - Tue vite les motifs connus de malware / minage (ex. /tmp/npm_update, xmrig).
# - Pour le reste : kill seulement si CPU très haut pendant plusieurs cycles consécutifs.
#
# IMPORTANT (prod) : tuer automatiquement "tout ce qui est gourmand" casserait le site
# lors de builds ou pics légitimes. Ce script est volontairement conservateur.
#
# Usage:
#   sudo ./cpu-abuse-watchdog.sh              # une passe
#   sudo CPU_WATCHDOG_INTERVAL=60 ./cpu-abuse-watchdog.sh   # boucle (systemd recommandé)
#
# Cron (root), toutes les 2 minutes :
#   */2 * * * * /usr/local/bin/cpu-abuse-watchdog.sh
#
# Variables (optionnelles) :
#   CPU_WATCHDOG_LOG=/var/log/cpu-watchdog.log
#   CPU_WATCHDOG_STATE=/var/run/cpu-watchdog
#   CPU_HIGH_PCT=88          # seuil %CPU (colonne ps)
#   CPU_BAD_CYCLES=8         # cycles consécutifs au-dessus du seuil avant kill (× intervalle cron)
#   CPU_WATCHDOG_INTERVAL=0  # si >0, boucle toutes les N secondes (pour systemd)
#

set -uo pipefail

LOG_FILE="${CPU_WATCHDOG_LOG:-/var/log/cpu-watchdog.log}"
STATE_DIR="${CPU_WATCHDOG_STATE:-/var/run/cpu-watchdog}"
HIGH_PCT="${CPU_HIGH_PCT:-88}"
BAD_CYCLES="${CPU_BAD_CYCLES:-8}"
INTERVAL="${CPU_WATCHDOG_INTERVAL:-0}"

# Processus / motifs jamais tués pour "CPU élevé" (adapter si besoin)
ALLOW_REGEX='next-server|node |/node|PM2|nginx|httpd|apache2|postgres|postmaster|mysqld|mariadb|redis-server|certbot|amazon-ssm|sshd|systemd|dbus|chronyd|auditd|rsyslogd|crond|dbus-daemon|gssproxy|networkd'

# Tués rapidement si la ligne de commande correspond (malware courant)
# Mots-clés typiques minage / malware (ajuster avec prudence)
INSTAKILL_REGEX='npm_update|xmrig|moneroocean|kdevtmpfsi|kinsing|/tmp/[^ ]*miner'

mkdir -p "$STATE_DIR" 2>/dev/null || STATE_DIR="${TMPDIR:-/tmp}/cpu-watchdog-$$"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  if touch "$LOG_FILE" 2>/dev/null; then
    echo "$msg" >>"$LOG_FILE"
  fi
}

kill_pid() {
  local pid="$1"
  local reason="$2"
  if [[ -z "$pid" || "$pid" -lt 2 ]]; then
    return 0
  fi
  if kill -0 "$pid" 2>/dev/null; then
    log "KILL pid=$pid ($reason)"
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$STATE_DIR/$pid" 2>/dev/null || true
}

one_pass() {
  # pid, %cpu, reste = ligne de commande (évite pipe -> sous-shell)
  local line pid pcpu args cpu_int c
  while IFS= read -r line; do
    [[ -z "${line// }" ]] && continue
    pid=$(awk '{print $1}' <<<"$line")
    pcpu=$(awk '{print $2}' <<<"$line")
    args=$(awk '{$1=""; $2=""; sub(/^ +/, ""); print}' <<<"$line")
    [[ -z "${pid:-}" ]] && continue

    # Ignorer nos propres scripts
    if [[ "$args" == *"cpu-abuse-watchdog"* ]]; then
      continue
    fi

    # Instakill malware connu
    if echo "$args" | grep -qE "$INSTAKILL_REGEX"; then
      kill_pid "$pid" "motif instakill: ${args:0:120}"
      continue
    fi

    # CPU lu comme entier (ps peut afficher 99.8)
    cpu_int="${pcpu%.*}"
    [[ -z "$cpu_int" ]] && cpu_int=0
    [[ "$cpu_int" =~ ^[0-9]+$ ]] || cpu_int=0

    if [[ "$cpu_int" -lt "$HIGH_PCT" ]]; then
      rm -f "$STATE_DIR/$pid" 2>/dev/null || true
      continue
    fi

    # Liste blanche : on réinitialise le compteur et on ne tue pas
    if echo "$args" | grep -qE "$ALLOW_REGEX"; then
      rm -f "$STATE_DIR/$pid" 2>/dev/null || true
      continue
    fi

    # Compteur de cycles consécutifs "dangereux"
    c=0
    if [[ -f "$STATE_DIR/$pid" ]]; then
      c=$(cat "$STATE_DIR/$pid" 2>/dev/null || echo 0)
    fi
    c=$((c + 1))
    echo "$c" >"$STATE_DIR/$pid" 2>/dev/null || true

    if [[ "$c" -ge "$BAD_CYCLES" ]]; then
      kill_pid "$pid" "CPU ${pcpu}% pendant ${c} cycles (seuil ${HIGH_PCT}%, cmd=${args:0:160})"
    fi
  done < <(ps axo pid,pcpu,args --sort=-pcpu --no-headers | head -80)
}

cleanup_stale_state() {
  # Supprimer les fichiers d'état pour des PID qui n'existent plus
  local f base
  for f in "$STATE_DIR"/*; do
    [[ -e "$f" ]] || continue
    base=$(basename "$f")
    if ! [[ "$base" =~ ^[0-9]+$ ]]; then
      continue
    fi
    if ! kill -0 "$base" 2>/dev/null; then
      rm -f "$f" 2>/dev/null || true
    fi
  done
}

main() {
  if [[ "$(id -u)" -ne 0 ]]; then
    log "AVERTISSEMENT: exécuter en root (sudo) pour tuer des processus d'autres utilisateurs et écrire $LOG_FILE"
  fi

  if [[ "$INTERVAL" =~ ^[0-9]+$ ]] && [[ "$INTERVAL" -gt 0 ]]; then
    log "Boucle toutes les ${INTERVAL}s (Ctrl+C pour arrêter)"
    while true; do
      cleanup_stale_state
      one_pass
      sleep "$INTERVAL"
    done
  else
    cleanup_stale_state
    one_pass
  fi
}

main "$@"
