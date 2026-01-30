#!/bin/bash
# Script de configuration de sécurité initiale pour le serveur EC2
# À exécuter immédiatement après la création de l'instance

set -e  # Arrêter en cas d'erreur

echo "=========================================="
echo "Configuration de sécurité initiale"
echo "=========================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que le script est exécuté en tant que root ou avec sudo
if [ "$EUID" -ne 0 ]; then 
    error "Ce script doit être exécuté avec sudo"
    exit 1
fi

info "Mise à jour du système..."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

info "Installation des outils essentiels..."
apt-get install -y \
    ufw \
    fail2ban \
    unattended-upgrades \
    htop \
    iotop \
    nethogs \
    logwatch \
    curl \
    wget \
    git

info "Configuration de UFW..."

# Sauvegarder la configuration actuelle
if [ -f /etc/ufw/user.rules ]; then
    cp /etc/ufw/user.rules /etc/ufw/user.rules.backup.$(date +%Y%m%d_%H%M%S)
fi

# Réinitialiser UFW
ufw --force reset

# Politiques par défaut
ufw default deny incoming
ufw default allow outgoing

# Autoriser SSH (CRITIQUE)
info "Autorisation du port SSH (22)..."
ufw allow 22/tcp

# Demander si l'utilisateur veut limiter SSH à son IP
read -p "Voulez-vous limiter SSH à votre IP uniquement ? (o/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[OoYy]$ ]]; then
    read -p "Entrez votre adresse IP publique : " USER_IP
    if [[ ! -z "$USER_IP" ]]; then
        ufw delete allow 22/tcp
        ufw allow from "$USER_IP" to any port 22 proto tcp
        info "SSH limité à l'IP : $USER_IP"
    fi
fi

# Autoriser HTTP et HTTPS
info "Autorisation des ports HTTP (80) et HTTPS (443)..."
ufw allow 80/tcp
ufw allow 443/tcp

# Activer UFW
info "Activation de UFW..."
ufw --force enable

# Afficher le statut
info "Statut de UFW :"
ufw status verbose

info "Configuration de SSH..."

# Sauvegarder la configuration SSH
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)

# Modifications de sécurité SSH
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/#MaxAuthTries 6/MaxAuthTries 3/' /etc/ssh/sshd_config
sed -i 's/#ClientAliveInterval 0/ClientAliveInterval 300/' /etc/ssh/sshd_config
sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 2/' /etc/ssh/sshd_config

# Vérifier la configuration SSH
if sshd -t; then
    info "Configuration SSH valide"
    systemctl restart sshd
    systemctl enable sshd
    info "SSH redémarré"
else
    error "Erreur dans la configuration SSH, restauration de la sauvegarde..."
    cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config
    systemctl restart sshd
    exit 1
fi

info "Configuration de Fail2Ban..."

# Créer la configuration locale
if [ ! -f /etc/fail2ban/jail.local ]; then
    cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
fi

# Configuration Fail2Ban
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

info "Fail2Ban configuré et activé"

info "Configuration des mises à jour automatiques..."

# Configuration unattended-upgrades
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

info "Mises à jour automatiques configurées"

info "Création du script de monitoring malware..."

# Créer le script de monitoring
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

info "Script de monitoring créé"

# Ajouter au crontab de l'utilisateur actuel
CURRENT_USER=$(whoami)
if [ "$CURRENT_USER" != "root" ]; then
    (crontab -l 2>/dev/null | grep -v "monitor-malware.sh"; echo "*/5 * * * * /usr/local/bin/monitor-malware.sh") | crontab -
    info "Cron job ajouté pour l'utilisateur $CURRENT_USER"
fi

# Ajouter au crontab root
(crontab -l -u root 2>/dev/null | grep -v "monitor-malware.sh"; echo "*/5 * * * * /usr/local/bin/monitor-malware.sh") | crontab -u root - 2>/dev/null || true
info "Cron job ajouté pour root"

info "Nettoyage des paquets inutiles..."
apt-get autoremove -y
apt-get autoclean

echo ""
echo "=========================================="
info "Configuration terminée avec succès!"
echo "=========================================="
echo ""
info "Résumé de la configuration :"
echo "  ✓ UFW configuré et activé"
echo "  ✓ SSH sécurisé"
echo "  ✓ Fail2Ban installé et actif"
echo "  ✓ Mises à jour automatiques configurées"
echo "  ✓ Script de monitoring installé"
echo ""
warn "IMPORTANT :"
echo "  - Vérifiez que vous pouvez toujours vous connecter en SSH"
echo "  - Si vous avez limité SSH à votre IP, notez-la"
echo "  - Le monitoring s'exécute toutes les 5 minutes"
echo "  - Les logs sont dans /var/log/malware-monitor.log"
echo ""
info "Pour vérifier le statut :"
echo "  - UFW : sudo ufw status verbose"
echo "  - Fail2Ban : sudo fail2ban-client status"
echo "  - Monitoring : tail -f /var/log/malware-monitor.log"
echo ""
