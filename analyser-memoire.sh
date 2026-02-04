#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔍 ANALYSE DE LA MÉMOIRE - $(date)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "📊 ÉTAT GÉNÉRAL DE LA MÉMOIRE"
echo "───────────────────────────────────────────────────────────────"
free -h
echo ""

echo "🔝 TOP 15 PROCESSUS PAR CONSOMMATION MÉMOIRE"
echo "───────────────────────────────────────────────────────────────"
ps aux --sort=-%mem | head -16 | awk '{printf "%-8s %6s%% %10s %s\n", $2, $4, $6/1024"MB", $11}'
echo ""

echo "📦 PROCESSUS NODE.JS"
echo "───────────────────────────────────────────────────────────────"
if command -v node &> /dev/null; then
    ps aux | grep node | grep -v grep | awk '{printf "PID: %-8s MEM: %6s%% %10s CMD: %s\n", $2, $4, $6/1024"MB", $11}'
    TOTAL_NODE=$(ps aux | grep node | grep -v grep | awk '{sum+=$6} END {print sum/1024}')
    if [ ! -z "$TOTAL_NODE" ]; then
        echo "Total Node.js: ${TOTAL_NODE} MB"
    fi
else
    echo "Node.js non trouvé"
fi
echo ""

echo "🔄 PROCESSUS PM2"
echo "───────────────────────────────────────────────────────────────"
if command -v pm2 &> /dev/null; then
    pm2 list
    echo ""
    echo "Détails mémoire PM2:"
    pm2 jlist | jq -r '.[] | "\(.name): \(.monit.memory/1024/1024 | floor)MB CPU:\(.monit.cpu)%"' 2>/dev/null || pm2 describe all | grep -E "name|memory|cpu" | head -20
else
    echo "PM2 non trouvé"
fi
echo ""

echo "🛡️ VÉRIFICATION MALWARE"
echo "───────────────────────────────────────────────────────────────"
SUSPICIOUS=$(ps aux | grep -E "xmrig|miner|moneroocean|scanner|systemwatcher" | grep -v grep)
if [ -z "$SUSPICIOUS" ]; then
    echo "✅ Aucun processus suspect détecté"
else
    echo "⚠️ PROCESSUS SUSPECTS DÉTECTÉS:"
    echo "$SUSPICIOUS"
fi
echo ""

echo "🔧 SERVICES SYSTEMD ACTIFS"
echo "───────────────────────────────────────────────────────────────"
systemctl list-units --type=service --state=running --no-pager | head -15
echo ""

echo "💾 UTILISATION MÉMOIRE PAR TYPE DE PROCESSUS"
echo "───────────────────────────────────────────────────────────────"
ps aux --sort=-%mem | awk 'NR>1 {cmd=$11; gsub(/.*\//, "", cmd); mem[$cmd]+=$6} END {for (c in mem) printf "%-20s %10.2f MB\n", c, mem[c]/1024}' | sort -k2 -rn | head -10
echo ""

echo "📈 DÉTAILS MÉMOIRE SYSTÈME"
echo "───────────────────────────────────────────────────────────────"
cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|Cached|Buffers|SwapTotal|SwapFree" | awk '{printf "%-20s %10s\n", $1, $2/1024"MB"}'
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ Analyse terminée"
echo "═══════════════════════════════════════════════════════════════"
