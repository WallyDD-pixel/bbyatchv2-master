#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔍 VÉRIFICATION DES PROCESSUS SUSPECTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "⚠️ RECHERCHE DE PROCESSUS MALVEILLANTS CONNUS"
echo "───────────────────────────────────────────────────────────────"
SUSPICIOUS_NAMES=("xmrig" "miner" "moneroocean" "scanner" "systemwatcher" "cryptonight" "stratum" "pool" "mining" "coin" "bitcoin" "monero")
FOUND_SUSPICIOUS=false

for name in "${SUSPICIOUS_NAMES[@]}"; do
    RESULT=$(ps aux | grep -i "$name" | grep -v grep)
    if [ ! -z "$RESULT" ]; then
        echo "❌ PROCESSUS SUSPECT TROUVÉ: $name"
        echo "$RESULT"
        FOUND_SUSPICIOUS=true
    fi
done

if [ "$FOUND_SUSPICIOUS" = false ]; then
    echo "✅ Aucun processus malveillant connu détecté"
fi
echo ""

echo "🔍 ANALYSE DES PROCESSUS NODE.JS"
echo "───────────────────────────────────────────────────────────────"
NODE_PROCS=$(ps aux | grep node | grep -v grep)
if [ ! -z "$NODE_PROCS" ]; then
    echo "$NODE_PROCS"
    echo ""
    echo "Détails des processus Node.js:"
    ps aux | grep node | grep -v grep | while read line; do
        PID=$(echo $line | awk '{print $2}')
        CMD=$(echo $line | awk '{for(i=11;i<=NF;i++) printf "%s ", $i; print ""}')
        MEM=$(echo $line | awk '{print $6/1024 " MB"}')
        echo "  PID: $PID | MEM: $MEM | CMD: $CMD"
        
        # Vérifier le chemin du binaire
        if [ -f "/proc/$PID/exe" ]; then
            REAL_PATH=$(readlink -f /proc/$PID/exe 2>/dev/null)
            echo "    → Exécutable: $REAL_PATH"
        fi
        
        # Vérifier le répertoire de travail
        if [ -d "/proc/$PID/cwd" ]; then
            CWD=$(readlink -f /proc/$PID/cwd 2>/dev/null)
            echo "    → Répertoire: $CWD"
        fi
    done
else
    echo "Aucun processus Node.js trouvé"
fi
echo ""

echo "🔍 ANALYSE DU PROCESSUS NEXT-SERVER"
echo "───────────────────────────────────────────────────────────────"
NEXT_PID=$(ps aux | grep "next-server" | grep -v grep | awk '{print $2}' | head -1)
if [ ! -z "$NEXT_PID" ]; then
    echo "PID: $NEXT_PID"
    echo ""
    
    # Informations détaillées
    if [ -f "/proc/$NEXT_PID/exe" ]; then
        REAL_PATH=$(readlink -f /proc/$NEXT_PID/exe 2>/dev/null)
        echo "Exécutable: $REAL_PATH"
    fi
    
    if [ -d "/proc/$NEXT_PID/cwd" ]; then
        CWD=$(readlink -f /proc/$NEXT_PID/cwd 2>/dev/null)
        echo "Répertoire: $CWD"
    fi
    
    # Vérifier les fichiers ouverts
    echo ""
    echo "Fichiers ouverts (top 10):"
    lsof -p $NEXT_PID 2>/dev/null | head -11 | tail -10 || echo "Impossible de lire les fichiers ouverts"
    
    # Vérifier les connexions réseau
    echo ""
    echo "Connexions réseau:"
    netstat -tunp 2>/dev/null | grep $NEXT_PID | head -10 || ss -tunp 2>/dev/null | grep $NEXT_PID | head -10 || echo "Impossible de lire les connexions"
else
    echo "Processus next-server non trouvé"
fi
echo ""

echo "🔍 VÉRIFICATION DES PROCESSUS AVEC CONNEXIONS EXTERNES SUSPECTES"
echo "───────────────────────────────────────────────────────────────"
echo "Connexions sortantes vers des ports non standards:"
netstat -tunp 2>/dev/null | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10 || \
ss -tunp 2>/dev/null | grep ESTAB | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10 || \
echo "Impossible de lire les connexions"
echo ""

echo "🔍 VÉRIFICATION DES CRONTABS"
echo "───────────────────────────────────────────────────────────────"
echo "Crontab utilisateur:"
crontab -l 2>/dev/null || echo "Aucun crontab utilisateur"
echo ""
echo "Crontab root:"
sudo crontab -l 2>/dev/null || echo "Aucun crontab root"
echo ""
echo "Crontabs système:"
ls -la /etc/cron.* 2>/dev/null | head -20 || echo "Impossible de lire les crontabs système"
echo ""

echo "🔍 VÉRIFICATION DES SERVICES SYSTEMD SUSPECTS"
echo "───────────────────────────────────────────────────────────────"
systemctl list-units --type=service --all --no-pager | grep -E "malware|miner|scanner|systemwatcher" || echo "Aucun service suspect trouvé"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ Vérification terminée"
echo "═══════════════════════════════════════════════════════════════"
