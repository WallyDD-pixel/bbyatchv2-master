#!/bin/bash

echo "🔒 Installation et configuration de Fail2Ban"
echo "=============================================="
echo ""

# Vérifier si on est root ou sudo
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Ce script nécessite les privilèges sudo"
    echo "   Exécutez avec: sudo bash install-fail2ban.sh"
    exit 1
fi

# 1. Installation de Fail2Ban
echo "1️⃣ Installation de Fail2Ban..."
if command -v fail2ban-client &> /dev/null; then
    echo "   ✅ Fail2Ban est déjà installé"
else
    echo "   Installation en cours..."
    apt-get update
    apt-get install -y fail2ban
    echo "   ✅ Fail2Ban installé"
fi

# 2. Créer la configuration locale (jail.local)
echo ""
echo "2️⃣ Configuration de Fail2Ban..."

JAIL_LOCAL="/etc/fail2ban/jail.local"

cat > "$JAIL_LOCAL" << 'EOF'
[DEFAULT]
# Adresse IP à ne JAMAIS bannir (votre IP personnelle)
# Remplacez par votre IP réelle si vous voulez être sûr de ne jamais être banni
ignoreip = 127.0.0.1/8 ::1

# Durée du bannissement (par défaut: 10 minutes)
bantime = 3600

# Fenêtre de temps pour compter les tentatives (par défaut: 10 minutes)
findtime = 600

# Nombre maximum de tentatives avant bannissement
maxretry = 5

# Email pour les notifications (optionnel)
# destemail = admin@votre-domaine.com
# sendername = Fail2Ban
# action = %(action_mwl)s

[sshd]
# Protection SSH
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
maxretry = 3
bantime = 7200

[sshd-ddos]
# Protection contre les attaques DDoS sur SSH
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
maxretry = 10
findtime = 600
bantime = 3600

[nginx-limit-req]
# Protection contre les attaques sur Nginx (rate limiting)
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
findtime = 600
bantime = 3600

[nginx-botsearch]
# Protection contre les bots malveillants
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
findtime = 600
bantime = 86400

[recidive]
# Bannissement progressif pour les récidivistes
enabled = true
logpath = /var/log/fail2ban.log
action = %(action_)s
bantime = 86400
findtime = 86400
maxretry = 3
EOF

echo "   ✅ Configuration créée dans $JAIL_LOCAL"

# 3. Créer un filtre personnalisé pour Nginx si nécessaire
echo ""
echo "3️⃣ Configuration des filtres..."

# Filtre pour les bots malveillants dans Nginx
NGINX_BOT_FILTER="/etc/fail2ban/filter.d/nginx-botsearch.conf"
if [ ! -f "$NGINX_BOT_FILTER" ]; then
    cat > "$NGINX_BOT_FILTER" << 'EOF'
[Definition]
failregex = ^<HOST> -.*"(GET|POST|HEAD).*HTTP.*" (404|403|400) .*$
            ^<HOST> -.*"GET /.*(wp-admin|wp-login|phpmyadmin|admin|xmlrpc).*" .*$
            ^<HOST> -.*"GET /.*\.(php|asp|jsp|cgi).*" .*$
ignoreregex =
EOF
    echo "   ✅ Filtre nginx-botsearch créé"
fi

# 4. Démarrer et activer Fail2Ban
echo ""
echo "4️⃣ Démarrage de Fail2Ban..."
systemctl enable fail2ban
systemctl restart fail2ban
sleep 2

if systemctl is-active --quiet fail2ban; then
    echo "   ✅ Fail2Ban est actif"
else
    echo "   ❌ Erreur: Fail2Ban n'a pas démarré"
    systemctl status fail2ban
    exit 1
fi

# 5. Vérifier le statut
echo ""
echo "5️⃣ Vérification du statut..."
fail2ban-client status

echo ""
echo "6️⃣ Vérification des jails actifs..."
fail2ban-client status sshd 2>/dev/null || echo "   ⚠️  Jail SSH non configuré"

# 7. Instructions
echo ""
echo "=============================================="
echo "✅ Fail2Ban est installé et configuré !"
echo ""
echo "📋 Commandes utiles:"
echo "   - Voir le statut: sudo fail2ban-client status"
echo "   - Voir les IPs bannies SSH: sudo fail2ban-client status sshd"
echo "   - Débannir une IP: sudo fail2ban-client set sshd unbanip <IP>"
echo "   - Bannir une IP manuellement: sudo fail2ban-client set sshd banip <IP>"
echo "   - Voir les logs: sudo tail -f /var/log/fail2ban.log"
echo ""
echo "🔒 Protection activée pour:"
echo "   - SSH (3 tentatives = bannissement 2h)"
echo "   - Nginx rate limiting"
echo "   - Bots malveillants"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Vérifiez que votre IP n'est pas dans ignoreip si vous voulez être protégé"
echo "   - Surveillez les logs régulièrement"
echo "   - Changez le port SSH si possible (plus sécurisé)"
echo ""
