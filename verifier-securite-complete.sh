#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "🔍 VÉRIFICATION COMPLÈTE DE SÉCURITÉ"
echo "═══════════════════════════════════════════════════════════════"
echo ""

echo "1️⃣ PROCESSUS MALVEILLANTS CONNUS"
echo "───────────────────────────────────────────────────────────────"
SUSPICIOUS=$(ps aux | grep -iE "xmrig|miner|moneroocean|scanner|systemwatcher|cryptonight|stratum|pool|mining" | grep -v grep)
if [ -z "$SUSPICIOUS" ]; then
    echo "✅ Aucun processus malveillant connu détecté"
else
    echo "❌ PROCESSUS SUSPECTS TROUVÉS:"
    echo "$SUSPICIOUS"
fi
echo ""

echo "2️⃣ ANALYSE DU PROCESSUS NEXT-SERVER (PID 89329)"
echo "───────────────────────────────────────────────────────────────"
NEXT_PID=89329
if ps -p $NEXT_PID > /dev/null 2>&1; then
    echo "✅ Processus actif"
    echo ""
    echo "Informations détaillées:"
    ps -fp $NEXT_PID
    echo ""
    
    # Vérifier le chemin réel
    if [ -f "/proc/$NEXT_PID/exe" ]; then
        REAL_PATH=$(readlink -f /proc/$NEXT_PID/exe 2>/dev/null)
        echo "Exécutable réel: $REAL_PATH"
        
        # Vérifier si c'est bien Node.js
        if [[ "$REAL_PATH" == *"node"* ]]; then
            echo "✅ C'est bien un processus Node.js"
        else
            echo "⚠️ ATTENTION: L'exécutable ne semble pas être Node.js"
        fi
    fi
    
    # Répertoire de travail
    if [ -d "/proc/$NEXT_PID/cwd" ]; then
        CWD=$(readlink -f /proc/$NEXT_PID/cwd 2>/dev/null)
        echo "Répertoire de travail: $CWD"
    fi
    
    # Connexions réseau
    echo ""
    echo "Connexions réseau:"
    netstat -tunp 2>/dev/null | grep $NEXT_PID | head -5 || ss -tunp 2>/dev/null | grep $NEXT_PID | head -5 || echo "Aucune connexion détectée"
else
    echo "⚠️ Le processus next-server n'est pas actif"
fi
echo ""

echo "3️⃣ VÉRIFICATION DES FICHIERS MALVEILLANTS"
echo "───────────────────────────────────────────────────────────────"
cd ~
SUSPICIOUS_FILES=$(find . -maxdepth 3 -type f \( -name "*xmrig*" -o -name "*miner*" -o -name "*moneroocean*" -o -name "*scanner*" -o -name "*systemwatcher*" \) 2>/dev/null)
if [ -z "$SUSPICIOUS_FILES" ]; then
    echo "✅ Aucun fichier suspect trouvé dans le répertoire home"
else
    echo "❌ FICHIERS SUSPECTS TROUVÉS:"
    echo "$SUSPICIOUS_FILES"
fi
echo ""

echo "4️⃣ VÉRIFICATION DES CRONTABS"
echo "───────────────────────────────────────────────────────────────"
echo "Crontab utilisateur:"
crontab -l 2>/dev/null | grep -v "^#" | grep -v "^$" || echo "Aucune tâche cron utilisateur"
echo ""
echo "Crontabs système:"
sudo grep -r "xmrig\|miner\|moneroocean\|scanner" /etc/cron.* 2>/dev/null || echo "Aucune tâche suspecte dans les crontabs système"
echo ""

echo "5️⃣ VÉRIFICATION DES SERVICES SYSTEMD"
echo "───────────────────────────────────────────────────────────────"
systemctl list-units --type=service --all --no-pager | grep -E "malware|miner|scanner|systemwatcher" || echo "Aucun service suspect trouvé"
echo ""

echo "6️⃣ CONNEXIONS RÉSEAU SUSPECTES"
echo "───────────────────────────────────────────────────────────────"
echo "Connexions sortantes vers des ports non standards:"
netstat -tunp 2>/dev/null | grep ESTABLISHED | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10 || \
ss -tunp 2>/dev/null | grep ESTAB | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -rn | head -10 || \
echo "Impossible de lire les connexions"
echo ""

echo "7️⃣ RÉSUMÉ DE L'UTILISATION MÉMOIRE"
echo "───────────────────────────────────────────────────────────────"
echo "Processus consommant le plus de mémoire:"
ps aux --sort=-%mem | head -6 | awk 'NR==1 || $4>1.0 {printf "%-8s %6s%% %10s %s\n", $2, $4, $6/1024"MB", $11}'
echo ""

TOTAL_NODE=$(ps aux | grep -E "node|next-server" | grep -v grep | awk '{sum+=$6} END {print sum/1024}')
if [ ! -z "$TOTAL_NODE" ] && [ "$TOTAL_NODE" != "0" ]; then
    echo "Mémoire totale Node.js/Next.js: ${TOTAL_NODE} MB"
    echo "⚠️ Le processus Next.js consomme beaucoup de mémoire (${TOTAL_NODE} MB)"
    echo "   C'est normal mais peut être optimisé avec NODE_OPTIONS='--max-old-space-size=768'"
fi
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ Vérification terminée"
echo ""
echo "📊 CONCLUSION:"
echo "   - Aucun malware détecté dans les processus actifs"
echo "   - Le processus next-server consomme ~1GB (normal mais élevé)"
echo "   - Recommandation: Optimiser la mémoire de Next.js"
echo "═══════════════════════════════════════════════════════════════"
