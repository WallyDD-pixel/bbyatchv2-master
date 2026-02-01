#!/bin/bash

# Script pour corriger l'installation sur Amazon Linux
# Installe les outils manquants et configure le pare-feu

echo "🔧 Correction de l'installation pour Amazon Linux"
echo "================================================="
echo ""

YOUR_IP="${1:-90.90.82.243}"

# 1. Installer fail2ban (si pas déjà installé)
echo "1️⃣ Vérification de fail2ban..."
if ! command -v fail2ban-client &> /dev/null; then
    echo "   Installation de fail2ban..."
    sudo yum install -y epel-release
    sudo yum install -y fail2ban
    
    # Créer la configuration
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/secure
maxretry = 3
bantime = 86400
EOF
    
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    echo "   ✅ fail2ban installé et configuré"
else
    echo "   ✅ fail2ban déjà installé"
fi

# 2. Configurer le pare-feu
echo ""
echo "2️⃣ Configuration du pare-feu..."
if [ -f ~/bbyatchv2-master/setup-firewall-amazon-linux.sh ]; then
    chmod +x ~/bbyatchv2-master/setup-firewall-amazon-linux.sh
    bash ~/bbyatchv2-master/setup-firewall-amazon-linux.sh $YOUR_IP
else
    echo "   ⚠️  Script de pare-feu non trouvé, configuration manuelle..."
    
    # Configuration iptables basique
    if command -v iptables &> /dev/null; then
        # Sauvegarder
        sudo iptables-save > /tmp/iptables-backup-$(date +%Y%m%d_%H%M%S).rules
        
        # Autoriser SSH depuis votre IP
        sudo iptables -I INPUT 1 -p tcp -s $YOUR_IP --dport 22 -j ACCEPT
        
        # Sauvegarder
        sudo service iptables save 2>/dev/null || sudo iptables-save > /etc/sysconfig/iptables 2>/dev/null || true
        
        echo "   ✅ Règle iptables ajoutée pour SSH depuis $YOUR_IP"
    else
        echo "   ⚠️  iptables non disponible"
    fi
fi

# 3. Vérifier le service de protection
echo ""
echo "3️⃣ Vérification du service de protection..."
if systemctl is-enabled malware-protection.timer &>/dev/null; then
    echo "   ✅ Service de protection actif"
    sudo systemctl status malware-protection.timer --no-pager -l | head -5
else
    echo "   ⚠️  Service de protection non trouvé"
    echo "   Réinstallation du service..."
    
    # Recréer le service si nécessaire
    if [ -f ~/bbyatchv2-master/harden-security.sh ]; then
        # Extraire juste la partie service du script
        bash -c 'source ~/bbyatchv2-master/harden-security.sh' 2>/dev/null || {
            # Créer le service manuellement
            sudo tee /usr/local/bin/malware-protection.sh > /dev/null <<'PROTECT_EOF'
#!/bin/bash
LOG_FILE="/var/log/malware-protection.log"
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}
if pgrep -f "xmrig|moneroocean|miner" > /dev/null 2>&1; then
    log "ALERTE: Processus malveillant détecté !"
    pkill -9 -f xmrig 2>/dev/null
    pkill -9 -f moneroocean 2>/dev/null
    pkill -9 -f miner 2>/dev/null
fi
SUSPECT_DIRS=("$HOME/moneroocean" "/tmp/moneroocean" "/var/tmp/moneroocean")
for dir in "${SUSPECT_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log "ALERTE: Dossier suspect détecté: $dir"
        rm -rf "$dir" 2>/dev/null || sudo rm -rf "$dir" 2>/dev/null
    fi
done
if crontab -l 2>/dev/null | grep -qE "(xmrig|moneroocean|miner|wget.*sh|curl.*sh)"; then
    log "ALERTE: Crontab suspect détecté !"
    crontab -l 2>/dev/null | grep -vE "(xmrig|moneroocean|miner|wget.*sh|curl.*sh)" | crontab -
fi
exit 0
PROTECT_EOF
            sudo chmod +x /usr/local/bin/malware-protection.sh
            
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
            echo "   ✅ Service de protection réinstallé"
        }
    fi
fi

# 4. Résumé
echo ""
echo "================================================="
echo "✅ Correction terminée !"
echo ""
echo "📋 État des protections:"
echo ""
echo "🔍 Vérifications:"
echo "   - Service de protection: sudo systemctl status malware-protection.timer"
echo "   - Logs de protection: sudo tail -f /var/log/malware-protection.log"
echo "   - fail2ban: sudo fail2ban-client status"
echo "   - Pare-feu: sudo iptables -L -n -v"
echo ""
echo "⚠️  Note: Sur Amazon Linux, le pare-feu principal est géré par les"
echo "   Security Groups AWS. Le pare-feu iptables est une couche supplémentaire."
echo ""
