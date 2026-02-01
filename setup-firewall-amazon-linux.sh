#!/bin/bash

# Script pour configurer le pare-feu sur Amazon Linux
# Amazon Linux utilise firewalld ou iptables, pas UFW

echo "🔥 Configuration du pare-feu sur Amazon Linux"
echo "============================================="
echo ""

YOUR_IP="${1:-90.90.82.243}"

# Détecter le système
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "⚠️  Impossible de détecter le système d'exploitation"
    exit 1
fi

echo "Système détecté: $OS"
echo "IP configurée: $YOUR_IP"
echo ""

# Pour Amazon Linux, utiliser iptables directement
if [[ "$OS" == "amzn" ]] || [[ "$OS" == "amazon" ]]; then
    echo "📦 Configuration avec iptables (Amazon Linux)..."
    
    # Vérifier si iptables est installé
    if ! command -v iptables &> /dev/null; then
        echo "Installation de iptables..."
        sudo yum install -y iptables-services
    fi
    
    # Sauvegarder les règles actuelles
    sudo iptables-save > /tmp/iptables-backup-$(date +%Y%m%d_%H%M%S).rules
    
    # Flush les règles existantes
    sudo iptables -F
    sudo iptables -X
    sudo iptables -t nat -F
    sudo iptables -t nat -X
    sudo iptables -t mangle -F
    sudo iptables -t mangle -X
    
    # Politique par défaut
    sudo iptables -P INPUT DROP
    sudo iptables -P FORWARD DROP
    sudo iptables -P OUTPUT ACCEPT
    
    # Autoriser les connexions établies
    sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
    
    # Autoriser localhost
    sudo iptables -A INPUT -i lo -j ACCEPT
    
    # Autoriser HTTP/HTTPS
    sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
    sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
    
    # Autoriser SSH uniquement depuis votre IP
    sudo iptables -A INPUT -p tcp -s $YOUR_IP --dport 22 -j ACCEPT
    
    # Sauvegarder les règles
    sudo service iptables save 2>/dev/null || sudo iptables-save > /etc/sysconfig/iptables
    
    # Activer iptables au démarrage
    sudo systemctl enable iptables 2>/dev/null || sudo chkconfig iptables on 2>/dev/null || true
    sudo systemctl start iptables 2>/dev/null || sudo service iptables start 2>/dev/null || true
    
    echo "✅ Pare-feu iptables configuré"
    echo ""
    echo "📋 Règles configurées:"
    echo "   - SSH autorisé uniquement depuis $YOUR_IP"
    echo "   - HTTP (port 80) autorisé"
    echo "   - HTTPS (port 443) autorisé"
    echo "   - Toutes les autres connexions entrantes bloquées"
    echo ""
    echo "🔍 Vérifier les règles:"
    echo "   sudo iptables -L -n -v"
    echo ""
    echo "⚠️  IMPORTANT: Si vous perdez l'accès SSH, vous pouvez utiliser:"
    echo "   - La console AWS EC2 pour modifier les Security Groups"
    echo "   - Ou la console AWS pour accéder à l'instance"
    
else
    echo "⚠️  Système non reconnu. Utilisation d'UFW..."
    
    if ! command -v ufw &> /dev/null; then
        if command -v apt-get &> /dev/null; then
            sudo apt-get update -qq
            sudo apt-get install -y ufw
        elif command -v yum &> /dev/null; then
            sudo yum install -y ufw
        elif command -v dnf &> /dev/null; then
            sudo dnf install -y ufw
        else
            echo "❌ Impossible d'installer UFW. Gestionnaire de paquets non reconnu."
            exit 1
        fi
    fi
    
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 80/tcp comment 'HTTP'
    sudo ufw allow 443/tcp comment 'HTTPS'
    sudo ufw allow from $YOUR_IP to any port 22 comment "SSH from $YOUR_IP"
    sudo ufw --force enable
    
    echo "✅ Pare-feu UFW configuré"
fi

echo ""
echo "✅ Configuration terminée !"
