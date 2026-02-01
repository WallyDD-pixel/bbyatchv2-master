#!/bin/bash

echo "🔍 Vérification rapide de la mémoire"
echo "==================================="
echo ""

# 1. État mémoire
echo "📊 État de la mémoire:"
free -h
echo ""

# 2. Processus suspects
echo "🔍 Processus suspects:"
ps aux | grep -E "(xmrig|moneroocean|miner)" | grep -v grep || echo "✅ Aucun processus suspect"
echo ""

# 3. Top 5 processus consommant le plus
echo "📈 Top 5 processus consommant le plus de mémoire:"
ps aux --sort=-%mem | head -6 | awk 'NR==1{printf "%-8s %-8s %-6s %-6s %s\n", $1, $2, $3, $4, $11} NR>1{printf "%-8s %-8s %5.1f%% %5.1f%% %s\n", $1, $2, $3, $4, $11}'
echo ""

# 4. Processus Node.js/PM2
echo "🟢 Processus Node.js/Next.js:"
ps aux | grep -E "(node|next|pm2)" | grep -v grep | head -10 || echo "Aucun processus Node.js"
echo ""

# 5. Logs de protection
echo "📝 Dernières détections (logs de protection):"
if [ -f /var/log/malware-protection.log ]; then
    sudo tail -5 /var/log/malware-protection.log 2>/dev/null || echo "Impossible de lire les logs"
else
    echo "Aucun log de protection (normal si le service vient de démarrer)"
fi
echo ""
