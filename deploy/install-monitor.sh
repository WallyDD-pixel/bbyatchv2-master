#!/bin/bash

# Script d'installation du monitoring automatique
# Usage: bash deploy/install-monitor.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🔧 INSTALLATION DU MONITORING AUTOMATIQUE"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor-processus.sh"
CRON_FILE="/tmp/cron-monitor"

# Vérifier que le script existe
if [ ! -f "$MONITOR_SCRIPT" ]; then
    echo -e "${RED}❌ Script monitor-processus.sh non trouvé${NC}"
    exit 1
fi

# Rendre le script exécutable
chmod +x "$MONITOR_SCRIPT"
echo -e "${GREEN}✓ Script rendu exécutable${NC}"

# Créer le répertoire de logs si nécessaire
mkdir -p "$(dirname "$MONITOR_SCRIPT")/../logs"
echo -e "${GREEN}✓ Répertoire de logs créé${NC}"

# Option 1: Installer via cron (toutes les 5 minutes)
echo ""
echo -e "${YELLOW}Installation via cron (recommandé)...${NC}"
(crontab -l 2>/dev/null | grep -v "monitor-processus.sh"; echo "*/5 * * * * $MONITOR_SCRIPT >> $SCRIPT_DIR/../logs/monitor-cron.log 2>&1") | crontab -
echo -e "${GREEN}✓ Cron job installé (exécution toutes les 5 minutes)${NC}"

# Option 2: Créer un service systemd (alternative)
echo ""
echo -e "${YELLOW}Voulez-vous aussi créer un service systemd ? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    SERVICE_FILE="/etc/systemd/system/monitor-processus.service"
    
    sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Monitoring automatique des processus malveillants
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$SCRIPT_DIR
ExecStart=$MONITOR_SCRIPT --daemon
Restart=always
RestartSec=60

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable monitor-processus.service
    sudo systemctl start monitor-processus.service
    echo -e "${GREEN}✓ Service systemd créé et démarré${NC}"
fi

echo ""
echo "=========================================="
echo "📋 RÉSUMÉ"
echo "=========================================="
echo ""
echo "Monitoring installé avec succès !"
echo ""
echo "Configuration:"
echo "  - Script: $MONITOR_SCRIPT"
echo "  - Logs: $SCRIPT_DIR/../logs/monitor-processus.log"
echo "  - Cron: Toutes les 5 minutes"
echo ""
echo "Seuils configurés:"
echo "  - CPU suspect: > 80% pendant > 300s (5 min)"
echo "  - Mémoire suspecte: > 50% ou > 500MB"
echo ""
echo "Commandes utiles:"
echo "  - Tester manuellement: bash $MONITOR_SCRIPT"
echo "  - Voir les logs: tail -f $SCRIPT_DIR/../logs/monitor-processus.log"
echo "  - Vérifier cron: crontab -l"
echo "  - Arrêter le service: sudo systemctl stop monitor-processus"
echo ""

