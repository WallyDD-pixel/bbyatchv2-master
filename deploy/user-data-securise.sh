#!/bin/bash
# User Data sécurisé pour nouvelle instance EC2
# À utiliser lors de la création de l'instance dans AWS

exec > /tmp/user-data.log 2>&1
set -x

# Attendre que le système soit prêt
sleep 30

# Variables
export DEBIAN_FRONTEND=noninteractive

# Mise à jour du système
apt-get update
apt-get upgrade -y

# Installation des outils essentiels
apt-get install -y \
    ufw \
    fail2ban \
    unattended-upgrades \
    htop \
    curl \
    wget \
    git

# ============================================
# CONFIGURATION UFW (FIREWALL)
# ============================================
echo "Configuration de UFW..."

# Réinitialiser UFW
ufw --force reset

# Politiques par défaut
ufw default deny incoming
ufw default allow outgoing

# Autoriser SSH (CRITIQUE - à faire en premier!)
ufw allow 22/tcp

# Autoriser HTTP et HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Activer UFW
ufw --force enable

echo "UFW configuré et activé"

# ============================================
# CONFIGURATION SSH
# ============================================
echo "Configuration de SSH..."

# Sauvegarder la configuration
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Modifications de sécurité
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#MaxAuthTries 6/MaxAuthTries 3/' /etc/ssh/sshd_config
sed -i 's/#ClientAliveInterval 0/ClientAliveInterval 300/' /etc/ssh/sshd_config
sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 2/' /etc/ssh/sshd_config

# Vérifier et redémarrer SSH
if sshd -t; then
    systemctl restart sshd
    systemctl enable sshd
    echo "SSH configuré et redémarré"
else
    echo "ERREUR: Configuration SSH invalide, restauration..."
    cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
    systemctl restart sshd
fi

# ============================================
# CONFIGURATION FAIL2BAN
# ============================================
echo "Configuration de Fail2Ban..."

# Créer la configuration locale
if [ ! -f /etc/fail2ban/jail.local ]; then
    cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
fi

# Ajouter la configuration
cat >> /etc/fail2ban/jail.local << 'EOF'

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
bantime = 3600
EOF

systemctl restart fail2ban
systemctl enable fail2ban

echo "Fail2Ban configuré et activé"

# ============================================
# CONFIGURATION MISES À JOUR AUTOMATIQUES
# ============================================
echo "Configuration des mises à jour automatiques..."

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}:${distro_codename}-updates";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF

echo "Mises à jour automatiques configurées"

# ============================================
# SCRIPT DE MONITORING MALWARE
# ============================================
echo "Création du script de monitoring..."

cat > /usr/local/bin/monitor-malware.sh << 'MONITOR_EOF'
#!/bin/bash
# Script de monitoring pour détecter le malware Monero

LOG_FILE="/var/log/malware-monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Fonction de logging
log_message() {
    echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}

# Vérifier les processus suspects
SUSPICIOUS_PROCESSES=$(ps aux | grep -E "xmrig|moneroocean|minerd" | grep -v grep)

if [ ! -z "$SUSPICIOUS_PROCESSES" ]; then
    log_message "ALERTE: Processus malveillant détecté!"
    log_message "$SUSPICIOUS_PROCESSES"
    
    # Arrêter les processus
    pkill -9 -f xmrig 2>/dev/null || true
    pkill -9 -f moneroocean 2>/dev/null || true
    pkill -9 -f minerd 2>/dev/null || true
    
    log_message "Processus malveillants arrêtés"
fi

# Vérifier les fichiers suspects
if [ -d "$HOME/moneroocean" ] || [ -d "/root/moneroocean" ] || [ -d "/tmp/moneroocean" ]; then
    log_message "ALERTE: Dossiers malveillants détectés!"
    rm -rf ~/moneroocean /root/moneroocean /tmp/moneroocean 2>/dev/null || true
    log_message "Dossiers malveillants supprimés"
fi

# Vérifier les crontabs
CRON_SUSPICIOUS=$(crontab -l 2>/dev/null | grep -E "xmrig|monero|curl.*sh|wget.*sh" || true)
if [ ! -z "$CRON_SUSPICIOUS" ]; then
    log_message "ALERTE: Crontab malveillant détecté!"
    log_message "$CRON_SUSPICIOUS"
    crontab -l 2>/dev/null | grep -vE "xmrig|monero|curl.*sh|wget.*sh" | crontab - 2>/dev/null || true
    log_message "Crontab nettoyé"
fi

# Vérifier les crontabs root
ROOT_CRON_SUSPICIOUS=$(sudo crontab -l 2>/dev/null | grep -E "xmrig|monero|curl.*sh|wget.*sh" || true)
if [ ! -z "$ROOT_CRON_SUSPICIOUS" ]; then
    log_message "ALERTE: Crontab root malveillant détecté!"
    log_message "$ROOT_CRON_SUSPICIOUS"
    sudo crontab -l 2>/dev/null | grep -vE "xmrig|monero|curl.*sh|wget.*sh" | sudo crontab - 2>/dev/null || true
    log_message "Crontab root nettoyé"
fi

# Vérifier les services systemd suspects
SYSTEMD_SUSPICIOUS=$(systemctl list-units --type=service --state=running 2>/dev/null | grep -E "xmrig|monero" || true)
if [ ! -z "$SYSTEMD_SUSPICIOUS" ]; then
    log_message "ALERTE: Service systemd suspect détecté!"
    log_message "$SYSTEMD_SUSPICIOUS"
fi
MONITOR_EOF

chmod +x /usr/local/bin/monitor-malware.sh

# Créer le fichier de log
touch /var/log/malware-monitor.log
chmod 644 /var/log/malware-monitor.log

# Ajouter au crontab (pour tous les utilisateurs)
# Pour l'utilisateur par défaut (admin)
(crontab -l -u admin 2>/dev/null | grep -v "monitor-malware.sh"; echo "*/5 * * * * /usr/local/bin/monitor-malware.sh") | crontab -u admin - 2>/dev/null || true

# Pour root
(crontab -l -u root 2>/dev/null | grep -v "monitor-malware.sh"; echo "*/5 * * * * /usr/local/bin/monitor-malware.sh") | crontab -u root - 2>/dev/null || true

echo "Script de monitoring créé et configuré"

# ============================================
# NETTOYAGE
# ============================================
echo "Nettoyage des paquets inutiles..."
apt-get autoremove -y
apt-get autoclean

echo "=========================================="
echo "Configuration User Data terminée!"
echo "=========================================="
echo "Vérifiez les logs dans /tmp/user-data.log"
echo "=========================================="
