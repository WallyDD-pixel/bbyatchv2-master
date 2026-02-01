#!/bin/bash

# Script pour mettre à jour le script de protection avec les nouveaux processus suspects

echo "🔄 Mise à jour du script de protection automatique"
echo "=================================================="
echo ""

# Mettre à jour le script de protection
sudo tee /usr/local/bin/malware-protection.sh > /dev/null <<'PROTECT_EOF'
#!/bin/bash
# Script de protection automatique contre le malware

LOG_FILE="/var/log/malware-protection.log"
THREAT_DETECTED=0

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Vérifier les processus suspects (liste étendue)
if pgrep -f "xmrig|moneroocean|miner|systemwatcher|scanner_linux" > /dev/null 2>&1; then
    log "ALERTE: Processus malveillant détecté !"
    pkill -9 -f xmrig 2>/dev/null
    pkill -9 -f moneroocean 2>/dev/null
    pkill -9 -f miner 2>/dev/null
    pkill -9 -f systemwatcher 2>/dev/null
    pkill -9 -f scanner_linux 2>/dev/null
    THREAT_DETECTED=1
fi

# Vérifier les dossiers suspects
SUSPECT_DIRS=("$HOME/moneroocean" "/tmp/moneroocean" "/var/tmp/moneroocean")
for dir in "${SUSPECT_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log "ALERTE: Dossier suspect détecté: $dir"
        rm -rf "$dir" 2>/dev/null || sudo rm -rf "$dir" 2>/dev/null
        THREAT_DETECTED=1
    fi
done

# Vérifier les fichiers suspects
SUSPECT_FILES=("$HOME/systemwatcher" "$HOME/scanner_linux" "/tmp/systemwatcher" "/tmp/scanner_linux")
for file in "${SUSPECT_FILES[@]}"; do
    if [ -f "$file" ]; then
        log "ALERTE: Fichier suspect détecté: $file"
        rm -f "$file" 2>/dev/null || sudo rm -f "$file" 2>/dev/null
        THREAT_DETECTED=1
    fi
done

# Vérifier les crontabs suspects
if crontab -l 2>/dev/null | grep -qE "(xmrig|moneroocean|miner|wget.*sh|curl.*sh|systemwatcher|scanner_linux)"; then
    log "ALERTE: Crontab suspect détecté !"
    crontab -l 2>/dev/null | grep -vE "(xmrig|moneroocean|miner|wget.*sh|curl.*sh|systemwatcher|scanner_linux)" | crontab -
    THREAT_DETECTED=1
fi

# Si une menace est détectée, enregistrer
if [ $THREAT_DETECTED -eq 1 ]; then
    log "MENACE DÉTECTÉE ET NETTOYÉE"
fi

exit 0
PROTECT_EOF

sudo chmod +x /usr/local/bin/malware-protection.sh

# Redémarrer le service
sudo systemctl restart malware-protection.timer

echo "✅ Script de protection mis à jour"
echo "✅ Service redémarré"
echo ""
echo "Le système détectera maintenant:"
echo "  - xmrig, moneroocean, miner"
echo "  - systemwatcher"
echo "  - scanner_linux"
echo ""
