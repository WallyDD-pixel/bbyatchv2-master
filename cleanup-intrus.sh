#!/bin/bash

echo "🧹 Nettoyage des fichiers suspects..."

cd ~/bbyatchv2 || exit 1

# Liste des fichiers suspects à supprimer
FILES_TO_REMOVE=(
    "xmrig-6.24.0"
    "sex.sh"
    "kal.tar.gz"
    "identity"
    "baseline.sql"
)

# Supprimer les fichiers suspects
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -e "$file" ]; then
        echo "❌ Suppression de: $file"
        rm -rf "$file"
    else
        echo "ℹ️  Fichier non trouvé: $file"
    fi
done

echo ""
echo "✅ Nettoyage terminé !"
echo ""
echo "🔍 Vérification des processus suspects..."

# Vérifier les processus xmrig en cours
if pgrep -f xmrig > /dev/null; then
    echo "⚠️  ATTENTION: Processus xmrig détecté !"
    echo "   PID: $(pgrep -f xmrig)"
    echo "   Arrêt du processus..."
    pkill -f xmrig
else
    echo "✅ Aucun processus xmrig détecté"
fi

# Vérifier les processus suspects
echo ""
echo "🔍 Processes suspects en cours:"
ps aux | grep -E "(xmrig|miner|crypto)" | grep -v grep || echo "   Aucun processus suspect détecté"

echo ""
echo "🔍 Vérification des crontabs..."
crontab -l 2>/dev/null | grep -E "(xmrig|miner|wget|curl.*sh)" && echo "⚠️  Crontab suspect détecté !" || echo "✅ Crontab propre"

echo ""
echo "🔍 Vérification des services systemd suspects..."
systemctl list-units --type=service | grep -E "(xmrig|miner)" || echo "✅ Aucun service suspect détecté"

echo ""
echo "✅ Vérifications terminées !"

















