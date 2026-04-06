#!/usr/bin/env bash
#
# Surveille les processus à CPU anormalement élevé trop longtemps.
#
# Les attaquants imitent souvent des noms ("node", "nginx"...). Ce script ne se fie
# pas aux noms seuls : il regarde surtout
#   - le binaire réel (readlink /proc/pid/exe)
#   - les chemins /tmp, /var/tmp, /dev/shm dans la ligne de commande
#   - les interpréteurs (node, bash, python...) qui exécutent un script sous /tmp
#
# Tués vite : binaire sous chemins suspects, motifs minage connus, scripts depuis /tmp.
# CPU élevé prolongé : seuils différents selon que le binaire est dans des préfixes de
# confiance (/usr, /opt, nvm dans $HOME...) ou non.
#
# Variables (optionnelles) :
#   CPU_WATCHDOG_LOG, CPU_WATCHDOG_STATE, CPU_HIGH_PCT, CPU_BAD_CYCLES, CPU_WATCHDOG_INTERVAL
#   CPU_TRUSTED_PREFIXES   préfixes sûrs pour le binaire, séparés par virgule
#                            défaut: /usr,/opt,/snap,/nix
#   CPU_HOME_TRUST_PREFIX   ex: /home/ec2-user — autorise node/nvm sous ce HOME + apps dedans
#   CPU_SAFE_CMD_REGEX      motifs dans la cmdline pour services connus (Next, nginx, pm2…)
#   CPU_BAD_CYCLES_SHORT    cycles avant kill si binaire hors préfixes de confiance (défaut: 3)
#

set -uo pipefail

LOG_FILE="${CPU_WATCHDOG_LOG:-/var/log/cpu-watchdog.log}"
STATE_DIR="${CPU_WATCHDOG_STATE:-/var/run/cpu-watchdog}"
HIGH_PCT="${CPU_HIGH_PCT:-88}"
BAD_CYCLES="${CPU_BAD_CYCLES:-8}"
BAD_CYCLES_SHORT="${CPU_BAD_CYCLES_SHORT:-3}"
INTERVAL="${CPU_WATCHDOG_INTERVAL:-0}"

# Préfixes où un binaire est considéré comme "système / install légitime"
CPU_TRUSTED_PREFIXES="${CPU_TRUSTED_PREFIXES:-/usr,/opt,/snap,/nix}"

# Déploiement typique : autoriser Node via nvm + projet sous ce home (séparer par virgule)
CPU_HOME_TRUST_PREFIX="${CPU_HOME_TRUST_PREFIX:-/home/ec2-user}"

# Si la cmdline ressemble à un service que tu héberges, ne pas tuer au moindre doute
# (reste combiné avec binaire non suspect ou sous HOME/nvm)
CPU_SAFE_CMD_REGEX="${CPU_SAFE_CMD_REGEX:-next-server|next-router-worker|nginx:|postgres:|postmaster|mysqld|mariadbd|redis-server|httpd|apache2|pm2|node.*PM2|amazon-ssm|ssm-agent|sshd|containerd|dockerd}"

INSTAKILL_REGEX='npm_update|xmrig|moneroocean|kdevtmpfsi|kinsing|cryptonight|stratum|\.X11-unix/|hashvault|pool\.|minergate'

# Chemins "jamais légitimes" pour un binaire persistant (hors noyau)
SUSPICIOUS_EXE_PREFIX_REGEX='^/(tmp|var/tmp|dev/shm)(/|$)'

mkdir -p "$STATE_DIR" 2>/dev/null || STATE_DIR="${TMPDIR:-/tmp}/cpu-watchdog-$$"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  if touch "$LOG_FILE" 2>/dev/null; then
    echo "$msg" >>"$LOG_FILE"
  fi
}

# Ligne de commande réelle (nuls -> espaces)
get_cmdline() {
  local pid="$1"
  if [[ ! -r "/proc/$pid/cmdline" ]]; then
    echo ""
    return
  fi
  tr '\0' ' ' <"/proc/$pid/cmdline" | sed 's/ $//'
}

# Chemin du binaire exécutable
get_exe() {
  local pid="$1"
  local ex
  ex=$(readlink "/proc/$pid/exe" 2>/dev/null || true)
  echo "$ex"
}

exe_is_deleted() {
  [[ "$1" == *"(deleted)"* ]]
}

exe_path_suspicious() {
  local ex="$1"
  [[ -z "$ex" ]] && return 0
  exe_is_deleted "$ex" && return 0
  echo "$ex" | grep -qE "$SUSPICIOUS_EXE_PREFIX_REGEX" && return 0
  return 1
}

# Préfixe de confiance (/usr, /opt, …)
exe_under_trusted_prefix() {
  local ex="$1"
  local IFS=',' p
  [[ -z "$ex" ]] && return 1
  IFS=',' read -ra _prefs <<< "$CPU_TRUSTED_PREFIXES"
  for p in "${_prefs[@]}"; do
    p=$(echo "$p" | sed 's/^ *//;s/ *$//')
    [[ -n "$p" && "$ex" == "$p"* ]] && return 0
  done
  return 1
}

# Node / nvm sous le home de déploiement
exe_under_home_nvm() {
  local ex="$1"
  local IFS=',' h
  [[ -z "$ex" ]] && return 1
  IFS=',' read -ra _homes <<< "$CPU_HOME_TRUST_PREFIX"
  for h in "${_homes[@]}"; do
    h=$(echo "$h" | sed 's/^ *//;s/ *$//')
    [[ -z "$h" ]] && continue
    if [[ "$ex" == "$h/.nvm/"* ]] || [[ "$ex" == "$h/.fnm/"* ]]; then
      return 0
    fi
  done
  return 1
}

# Au moins un argument de la cmdline pointe vers un script sous zone sensible
cmdline_loads_from_suspicious_path() {
  local cmd="$1"
  echo "$cmd" | grep -qE ' (/tmp/|/var/tmp/|/dev/shm/)[^ ]+' && return 0
  return 1
}

# Cmdline ressemble à un service métier connu (indicateur faible seul — utilisé avec exe OK)
cmdline_looks_like_known_stack() {
  local cmd="$1"
  echo "$cmd" | grep -qE "$CPU_SAFE_CMD_REGEX"
}

# Projet app sous HOME (node qui charge le site depuis le repo)
cmdline_node_from_app_home() {
  local cmd="$1"
  local IFS=',' h
  IFS=',' read -ra _homes <<< "$CPU_HOME_TRUST_PREFIX"
  for h in "${_homes[@]}"; do
    h=$(echo "$h" | sed 's/^ *//;s/ *$//')
    [[ -z "$h" ]] && continue
    if echo "$cmd" | grep -qE "node.*$h/[^ ]+"; then
      return 0
    fi
  done
  return 1
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

# Retourne le nombre de cycles requis pour ce PID (stocké: "score:seuil")
increment_strike() {
  local pid="$1"
  local threshold="$2"
  local f="$STATE_DIR/$pid"
  local n=0
  [[ -f "$f" ]] && n=$(cut -d: -f1 <"$f" 2>/dev/null || echo 0)
  n=$((n + 1))
  echo "${n}:${threshold}" >"$f" 2>/dev/null || true
  echo "$n"
}

reset_strike() {
  rm -f "$STATE_DIR/$1" 2>/dev/null || true
}

one_pass() {
  local line pid pcpu args cpu_int cmd exe
  while IFS= read -r line; do
    [[ -z "${line// }" ]] && continue
    pid=$(awk '{print $1}' <<<"$line")
    pcpu=$(awk '{print $2}' <<<"$line")
    args=$(awk '{$1=""; $2=""; sub(/^ +/, ""); print}' <<<"$line")
    [[ -z "${pid:-}" ]] && continue

    cmd=$(get_cmdline "$pid")
    [[ -z "$cmd" ]] && cmd="$args"
    exe=$(get_exe "$pid")

    if [[ "$cmd" == *"cpu-abuse-watchdog"* ]]; then
      continue
    fi

    # --- 1) Motifs minage / cmdline évidents
    if echo "$cmd" | grep -qE "$INSTAKILL_REGEX"; then
      kill_pid "$pid" "instakill cmd: ${cmd:0:160}"
      continue
    fi

    # --- 2) Binaire sous /tmp, /dev/shm, ou (deleted) : danger immédiat
    if exe_path_suspicious "$exe"; then
      kill_pid "$pid" "exe suspect: $exe | ${cmd:0:120}"
      continue
    fi

    # --- 3) bash/node/python… qui exécute explicitement un fichier sous /tmp etc.
    if cmdline_loads_from_suspicious_path "$cmd"; then
      kill_pid "$pid" "script/chargement depuis zone temporaire: ${cmd:0:160}"
      continue
    fi

    cpu_int="${pcpu%.*}"
    [[ -z "$cpu_int" ]] && cpu_int=0
    [[ "$cpu_int" =~ ^[0-9]+$ ]] || cpu_int=0

    if [[ "$cpu_int" -lt "$HIGH_PCT" ]]; then
      reset_strike "$pid"
      continue
    fi

    # --- 4) CPU élevé : décision "intelligente" (chemins, pas seulement le nom)
    local need_cycles="$BAD_CYCLES"
    local trust=0

    if exe_under_trusted_prefix "$exe" || exe_under_home_nvm "$exe"; then
      trust=1
    fi

    # Stack connue + binaire pas dans /tmp : on tolère longtemps
    if [[ "$trust" -eq 1 ]] && cmdline_looks_like_known_stack "$cmd"; then
      reset_strike "$pid"
      continue
    fi

    # Node qui lance le projet depuis le home (déploiement)
    if [[ "$trust" -eq 1 ]] && cmdline_node_from_app_home "$cmd"; then
      reset_strike "$pid"
      continue
    fi

    # Binaire hors /usr /opt / nvm : seuil court (adaptation pirate : faux binaire ailleurs)
    if [[ "$trust" -eq 0 ]]; then
      need_cycles="$BAD_CYCLES_SHORT"
    fi

    # Binaire "système" mais cmdline ne ressemble à rien de connu : garder un peu de marge
    if [[ "$trust" -eq 1 ]] && ! cmdline_looks_like_known_stack "$cmd" && ! cmdline_node_from_app_home "$cmd"; then
      need_cycles="$BAD_CYCLES"
    fi

    local n
    n=$(increment_strike "$pid" "$need_cycles")
    if [[ "$n" -ge "$need_cycles" ]]; then
      kill_pid "$pid" "CPU ${pcpu}% strike $n>=${need_cycles} exe=$exe | ${cmd:0:140}"
    fi
  done < <(ps axo pid,pcpu,args --sort=-pcpu --no-headers | head -80)
}

cleanup_stale_state() {
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
    log "AVERTISSEMENT: exécuter en root (sudo) pour tuer d'autres utilisateurs et écrire $LOG_FILE"
  fi

  if [[ "$INTERVAL" =~ ^[0-9]+$ ]] && [[ "$INTERVAL" -gt 0 ]]; then
    log "Boucle toutes les ${INTERVAL}s — trusted_prefixes=$CPU_TRUSTED_PREFIXES home=$CPU_HOME_TRUST_PREFIX"
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
