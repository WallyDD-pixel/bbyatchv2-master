#!/bin/bash

# Script d'installation rapide avec IP prédéfinie
# IP publique: 90.90.82.243

YOUR_IP="90.90.82.243"

echo "🚀 Installation rapide de la protection"
echo "========================================"
echo "IP configurée: $YOUR_IP"
echo ""

cd ~/bbyatchv2-master || exit 1

# Rendre tous les scripts exécutables
chmod +x *.sh

# 1. Nettoyer d'abord
echo "1️⃣ Nettoyage du malware existant..."
bash cleanup-malware-complete.sh

# 2. Configurer le pare-feu avec votre IP
echo ""
echo "2️⃣ Configuration du pare-feu UFW avec votre IP ($YOUR_IP)..."
if ! command -v ufw &> /dev/null; then
    sudo apt update -qq
    sudo apt install -y ufw
fi

sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw allow from $YOUR_IP to any port 22 comment "SSH from $YOUR_IP"
sudo ufw --force enable
echo "✅ Pare-feu configuré avec votre IP"

# 3. Installer fail2ban
echo ""
echo "3️⃣ Installation de fail2ban..."
if ! command -v fail2ban-client &> /dev/null; then
    sudo apt install -y fail2ban
fi

sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400
EOF

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
echo "✅ fail2ban installé et configuré"

# 4. Créer le script de protection automatique
echo ""
echo "4️⃣ Installation de la protection automatique..."

sudo tee /usr/local/bin/malware-protection.sh > /dev/null <<'PROTECT_EOF'
#!/bin/bash
# Script de protection automatique contre le malware

LOG_FILE="/var/log/malware-protection.log"
THREAT_DETECTED=0

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Vérifier les processus suspects
if pgrep -f "xmrig|moneroocean|miner" > /dev/null 2>&1; then
    log "ALERTE: Processus malveillant détecté !"
    pkill -9 -f xmrig 2>/dev/null
    pkill -9 -f moneroocean 2>/dev/null
    pkill -9 -f miner 2>/dev/null
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

# Vérifier les crontabs suspects
if crontab -l 2>/dev/null | grep -qE "(xmrig|moneroocean|miner|wget.*sh|curl.*sh)"; then
    log "ALERTE: Crontab suspect détecté !"
    crontab -l 2>/dev/null | grep -vE "(xmrig|moneroocean|miner|wget.*sh|curl.*sh)" | crontab -
    THREAT_DETECTED=1
fi

# Si une menace est détectée, enregistrer
if [ $THREAT_DETECTED -eq 1 ]; then
    log "MENACE DÉTECTÉE ET NETTOYÉE"
fi

exit 0
PROTECT_EOF

sudo chmod +x /usr/local/bin/malware-protection.sh

# 5. Créer le service systemd
echo ""
echo "5️⃣ Configuration du service de protection automatique..."

sudo tee /etc/systemd/system/malware-protection.service > /dev/null <<EOF
[Unit]
Description=Protection automatique contre le malware
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/malware-protection.sh
User=root

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/malware-protection.timer > /dev/null <<EOF
[Unit]
Description=Timer pour la protection contre le malware
Requires=malware-protection.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min
Unit=malware-protection.service

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable malware-protection.timer
sudo systemctl start malware-protection.timer
echo "✅ Protection automatique activée (vérification toutes les 5 minutes)"

# 6. Configurer le monitoring quotidien
echo ""
echo "6️⃣ Configuration du monitoring quotidien..."
MONITOR_SCRIPT="$HOME/bbyatchv2-master/monitor-malware.sh"
if [ -f "$MONITOR_SCRIPT" ]; then
    (crontab -l 2>/dev/null | grep -v "monitor-malware.sh"; echo "0 3 * * * $MONITOR_SCRIPT >> $HOME/malware-monitor.log 2>&1") | crontab -
    echo "✅ Monitoring quotidien configuré (3h du matin)"
fi

# 7. Résumé
echo ""
echo "========================================"
echo "✅ Installation terminée !"
echo ""
echo "📋 Protections activées:"
echo "   ✅ Pare-feu UFW (SSH limité à $YOUR_IP)"
echo "   ✅ fail2ban (protection SSH)"
echo "   ✅ Protection automatique (vérification toutes les 5 min)"
echo "   ✅ Monitoring quotidien"
echo ""
echo "🔍 Commandes utiles:"
echo "   - Vérifier la protection: sudo systemctl status malware-protection.timer"
echo "   - Voir les logs: sudo tail -f /var/log/malware-protection.log"
echo "   - Vérifier le pare-feu: sudo ufw status"
echo "   - Vérifier fail2ban: sudo fail2ban-client status"
echo ""
echo "⚠️  IMPORTANT: Votre IP ($YOUR_IP) est configurée pour SSH"
echo "   Si votre IP change, mettez à jour UFW avec:"
echo "   sudo ufw delete allow from OLD_IP to any port 22"
echo "   sudo ufw allow from NEW_IP to any port 22"
echo ""
