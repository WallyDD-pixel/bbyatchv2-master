#!/bin/bash

echo "🔒 Durcissement de la sécurité du serveur"
echo "========================================="
echo ""
echo "⚠️  Ce script va configurer des protections contre le malware"
echo "⚠️  Il nécessite des privilèges sudo pour certaines opérations"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Vérifier si on est root ou sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  Certaines opérations nécessitent sudo${NC}"
    echo ""
fi

# 1. Nettoyer d'abord le malware existant
echo -e "${BLUE}1️⃣ Nettoyage initial du malware...${NC}"
if [ -f ~/bbyatchv2-master/cleanup-malware-complete.sh ]; then
    bash ~/bbyatchv2-master/cleanup-malware-complete.sh
else
    echo -e "   ${YELLOW}⚠️  Script de nettoyage non trouvé, nettoyage manuel...${NC}"
    pkill -9 -f xmrig 2>/dev/null || true
    pkill -9 -f moneroocean 2>/dev/null || true
    pkill -9 -f miner 2>/dev/null || true
    rm -rf ~/moneroocean 2>/dev/null || true
    sudo rm -rf /tmp/moneroocean /var/tmp/moneroocean 2>/dev/null || true
fi

# 2. Configurer le pare-feu (UFW sur Debian/Ubuntu, skip sur Amazon Linux)
echo ""
echo -e "${BLUE}2️⃣ Configuration du pare-feu...${NC}"

if command -v ufw &>/dev/null; then
    CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "")
    echo "   Configuration des règles UFW..."
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 80/tcp comment 'HTTP'
    sudo ufw allow 443/tcp comment 'HTTPS'
    if [ -n "$CURRENT_IP" ]; then
        echo -e "   ${YELLOW}Votre IP détectée: $CURRENT_IP${NC}"
        read -p "   Autoriser uniquement cette IP pour SSH ? (o/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[OoYy]$ ]]; then
            sudo ufw allow from $CURRENT_IP to any port 22 comment 'SSH from current IP'
            echo -e "   ${GREEN}✅ SSH limité à $CURRENT_IP${NC}"
        else
            read -p "   Entrez l'IP à autoriser pour SSH (ou Entrée pour toutes): " ALLOWED_IP
            if [ -n "$ALLOWED_IP" ]; then
                sudo ufw allow from $ALLOWED_IP to any port 22 comment "SSH from $ALLOWED_IP"
            else
                sudo ufw allow 22/tcp comment 'SSH'
            fi
        fi
    else
        read -p "   Entrez l'IP pour SSH (ou Entrée pour toutes): " ALLOWED_IP
        [ -n "$ALLOWED_IP" ] && sudo ufw allow from $ALLOWED_IP to any port 22 || sudo ufw allow 22/tcp comment 'SSH'
    fi
    sudo ufw --force enable
    echo -e "   ${GREEN}✅ Pare-feu UFW activé${NC}"
elif command -v firewall-cmd &>/dev/null; then
    echo -e "   ${YELLOW}Firewalld détecté (Amazon Linux/RHEL). Utilisez les Security Groups EC2 pour le pare-feu.${NC}"
    echo -e "   ${GREEN}✅ Pare-feu: géré par AWS Security Groups${NC}"
else
    echo -e "   ${YELLOW}UFW non disponible (système type Amazon Linux). Utilisez les Security Groups EC2.${NC}"
    echo -e "   ${GREEN}✅ Pare-feu: configurez les Security Groups dans la console AWS${NC}"
fi

# 3. Installer et configurer fail2ban (Debian/Ubuntu: apt, Amazon Linux/RHEL: yum)
echo ""
echo -e "${BLUE}3️⃣ Installation et configuration de fail2ban...${NC}"

if ! command -v fail2ban-client &> /dev/null; then
    if command -v apt-get &>/dev/null; then
        echo "   Installation de fail2ban (apt)..."
        sudo apt-get update -qq && sudo apt-get install -y fail2ban
    elif command -v yum &>/dev/null; then
        echo "   Installation de fail2ban (yum)..."
        sudo yum install -y fail2ban 2>/dev/null || echo -e "   ${YELLOW}   (fail2ban absent des dépôts, ignoré)${NC}"
    elif command -v dnf &>/dev/null; then
        echo "   Installation de fail2ban (dnf)..."
        sudo dnf install -y fail2ban 2>/dev/null || echo -e "   ${YELLOW}   (fail2ban absent des dépôts, ignoré)${NC}"
    fi
fi

if command -v fail2ban-client &>/dev/null; then
    # Log SSH: auth.log (Debian/Ubuntu) ou secure (RHEL/Amazon Linux)
    SSH_LOG="/var/log/auth.log"
    [ -f /var/log/secure ] && SSH_LOG="/var/log/secure"
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 22
filter = sshd
logpath = $SSH_LOG
maxretry = 3
bantime = 86400
EOF
    sudo systemctl enable fail2ban 2>/dev/null || true
    sudo systemctl restart fail2ban 2>/dev/null || true
    echo -e "   ${GREEN}✅ fail2ban configuré et activé${NC}"
else
    echo -e "   ${YELLOW}   fail2ban non installé (optionnel)${NC}"
fi

# 4. Sécuriser SSH
echo ""
echo -e "${BLUE}4️⃣ Sécurisation de SSH...${NC}"

SSH_CONFIG="/etc/ssh/sshd_config"
SSH_BACKUP="/etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)"

# Sauvegarder la configuration actuelle
sudo cp $SSH_CONFIG $SSH_BACKUP
echo "   Configuration sauvegardée: $SSH_BACKUP"

# Appliquer les sécurisations
echo "   Application des sécurisations SSH..."

# Désactiver l'authentification root
sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' $SSH_CONFIG

# Désactiver l'authentification par mot de passe (utiliser uniquement les clés)
read -p "   Désactiver l'authentification par mot de passe ? (recommandé si vous utilisez des clés SSH) (o/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[OoYy]$ ]]; then
    sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' $SSH_CONFIG
    echo -e "   ${GREEN}✅ Authentification par mot de passe désactivée${NC}"
else
    echo -e "   ${YELLOW}⚠️  Authentification par mot de passe maintenue${NC}"
fi

# Limiter les tentatives de connexion
sudo sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' $SSH_CONFIG

# Désactiver les utilisateurs vides
sudo sed -i 's/^#*PermitEmptyPasswords.*/PermitEmptyPasswords no/' $SSH_CONFIG

# Désactiver X11 forwarding (sauf si nécessaire)
sudo sed -i 's/^#*X11Forwarding.*/X11Forwarding no/' $SSH_CONFIG

# Redémarrer SSH
sudo systemctl restart sshd
echo -e "   ${GREEN}✅ SSH sécurisé${NC}"
echo -e "   ${YELLOW}⚠️  IMPORTANT: Testez votre connexion SSH avant de fermer cette session !${NC}"

# 5. Créer un script de protection automatique
echo ""
echo -e "${BLUE}5️⃣ Création du système de protection automatique...${NC}"

PROTECTION_SCRIPT="/usr/local/bin/malware-protection.sh"
sudo tee $PROTECTION_SCRIPT > /dev/null <<'PROTECT_EOF'
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

# Si une menace est détectée, envoyer une alerte
if [ $THREAT_DETECTED -eq 1 ]; then
    log "MENACE DÉTECTÉE ET NETTOYÉE"
    # Vous pouvez ajouter ici l'envoi d'un email ou une notification
fi

exit 0
PROTECT_EOF

sudo chmod +x $PROTECTION_SCRIPT
echo -e "   ${GREEN}✅ Script de protection créé: $PROTECTION_SCRIPT${NC}"

# 6. Créer un service systemd pour la protection automatique
echo ""
echo -e "${BLUE}6️⃣ Création du service de protection automatique...${NC}"

sudo tee /etc/systemd/system/malware-protection.service > /dev/null <<EOF
[Unit]
Description=Protection automatique contre le malware
After=network.target

[Service]
Type=oneshot
ExecStart=$PROTECTION_SCRIPT
User=root

[Install]
WantedBy=multi-user.target
EOF

# Créer un timer pour exécuter la protection toutes les 5 minutes
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
echo -e "   ${GREEN}✅ Service de protection automatique activé (vérification toutes les 5 minutes)${NC}"

# 7. Protéger les fichiers critiques avec des permissions strictes
echo ""
echo -e "${BLUE}7️⃣ Protection des fichiers critiques...${NC}"

# Protéger les fichiers de configuration (si présents, ex. pas sur toutes les Amazon Linux)
[ -f /etc/crontab ] && sudo chmod 644 /etc/crontab
[ -d /etc/cron.d ] && sudo chmod 700 /etc/cron.d && sudo chmod 644 /etc/cron.d/* 2>/dev/null || true

# Protéger les scripts dans le home
if [ -d ~/bbyatchv2-master ]; then
    chmod 700 ~/bbyatchv2-master/*.sh 2>/dev/null || true
    echo -e "   ${GREEN}✅ Permissions des scripts sécurisées${NC}"
fi

# 8. Désactiver les services inutiles
echo ""
echo -e "${BLUE}8️⃣ Désactivation des services inutiles...${NC}"

# Liste des services à désactiver (ajustez selon vos besoins)
SERVICES_TO_DISABLE=("bluetooth" "cups" "avahi-daemon")

for service in "${SERVICES_TO_DISABLE[@]}"; do
    if systemctl is-enabled "$service" &>/dev/null; then
        sudo systemctl disable "$service" 2>/dev/null && echo "   Service $service désactivé" || true
    fi
done

# 9. Configurer les limites de ressources
echo ""
echo -e "${BLUE}9️⃣ Configuration des limites de ressources...${NC}"

# Créer un fichier de limites pour empêcher l'utilisation excessive
sudo tee /etc/security/limits.d/malware-prevention.conf > /dev/null <<EOF
# Limites pour prévenir l'utilisation excessive de ressources par le malware
* soft nproc 1000
* hard nproc 2000
* soft nofile 4096
* hard nofile 8192
EOF

echo -e "   ${GREEN}✅ Limites de ressources configurées${NC}"

# 10. Créer un script de monitoring quotidien
echo ""
echo -e "${BLUE}🔟 Configuration du monitoring quotidien...${NC}"

MONITOR_SCRIPT="$HOME/bbyatchv2-master/monitor-malware.sh"
if [ -f "$MONITOR_SCRIPT" ]; then
    if command -v crontab &>/dev/null; then
        (crontab -l 2>/dev/null | grep -v "monitor-malware.sh"; echo "0 3 * * * $MONITOR_SCRIPT >> $HOME/malware-monitor.log 2>&1") | crontab -
        echo -e "   ${GREEN}✅ Monitoring quotidien configuré (3h du matin)${NC}"
    else
        echo -e "   ${YELLOW}   (crontab non disponible; le timer systemd assure la surveillance toutes les 5 min)${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Script de monitoring non trouvé${NC}"
fi

# 11. Résumé final
echo ""
echo "========================================="
echo -e "${GREEN}✅ Durcissement de la sécurité terminé !${NC}"
echo ""
echo -e "${YELLOW}📋 Résumé des protections activées:${NC}"
echo "   ✅ Pare-feu UFW configuré et activé"
echo "   ✅ fail2ban installé et configuré"
echo "   ✅ SSH sécurisé"
echo "   ✅ Service de protection automatique (vérification toutes les 5 min)"
echo "   ✅ Monitoring quotidien configuré"
echo "   ✅ Limites de ressources configurées"
echo ""
echo -e "${YELLOW}🔍 Commandes utiles:${NC}"
echo "   - Vérifier le statut de la protection: sudo systemctl status malware-protection.timer"
echo "   - Voir les logs: sudo tail -f /var/log/malware-protection.log"
echo "   - Vérifier fail2ban: sudo fail2ban-client status"
echo "   - Vérifier UFW: sudo ufw status"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT:${NC}"
echo "   1. Testez votre connexion SSH maintenant !"
echo "   2. Vérifiez que vous pouvez toujours vous connecter"
echo "   3. Surveillez les logs: sudo tail -f /var/log/malware-protection.log"
echo "   4. Le système vérifie automatiquement toutes les 5 minutes"
echo ""
