#!/bin/bash
# Script pour installer le service de monitoring comme service systemd
# Cela permet au monitoring de tourner en continu même après redémarrage du serveur

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONITOR_SCRIPT="${SCRIPT_DIR}/deploy/monitor-and-recover.sh"
SERVICE_NAME="bbyatch-monitor"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
USER=$(whoami)

echo "=== Installation du service de monitoring ==="
echo ""

# 1. Vérifier que le script existe
if [ ! -f "${MONITOR_SCRIPT}" ]; then
    echo "❌ Script de monitoring non trouvé: ${MONITOR_SCRIPT}"
    exit 1
fi

# 2. Rendre le script exécutable
chmod +x "${MONITOR_SCRIPT}"
echo "✅ Script rendu exécutable"

# 3. Créer le service systemd
echo "Création du service systemd..."
sudo tee "${SERVICE_FILE}" > /dev/null <<EOF
[Unit]
Description=BB Yacht Site Monitor and Auto-Recovery
After=network.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${SCRIPT_DIR}
ExecStart=/bin/bash ${MONITOR_SCRIPT}
Restart=always
RestartSec=10
StandardOutput=append:${SCRIPT_DIR}/monitor-service.log
StandardError=append:${SCRIPT_DIR}/monitor-service-error.log

# Limites de ressources
MemoryLimit=512M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service systemd créé: ${SERVICE_FILE}"

# 4. Recharger systemd
sudo systemctl daemon-reload
echo "✅ Systemd rechargé"

# 5. Activer le service (démarrage automatique au boot)
sudo systemctl enable "${SERVICE_NAME}"
echo "✅ Service activé (démarrage automatique)"

# 6. Démarrer le service
sudo systemctl start "${SERVICE_NAME}"
echo "✅ Service démarré"

# 7. Vérifier l'état
sleep 2
if sudo systemctl is-active --quiet "${SERVICE_NAME}"; then
    echo "✅ Service actif et fonctionnel"
else
    echo "⚠️  Service démarré mais état incertain"
fi

# 8. Afficher les commandes utiles
echo ""
echo "=== Commandes utiles ==="
echo "Voir les logs du service:"
echo "  sudo journalctl -u ${SERVICE_NAME} -f"
echo ""
echo "Voir les logs du script:"
echo "  tail -f ${SCRIPT_DIR}/monitor.log"
echo ""
echo "Arrêter le service:"
echo "  sudo systemctl stop ${SERVICE_NAME}"
echo ""
echo "Redémarrer le service:"
echo "  sudo systemctl restart ${SERVICE_NAME}"
echo ""
echo "Désactiver le service:"
echo "  sudo systemctl disable ${SERVICE_NAME}"
echo ""
echo "Vérifier l'état:"
echo "  sudo systemctl status ${SERVICE_NAME}"
echo ""

echo "=== Installation terminée ==="
