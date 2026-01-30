#!/bin/bash
# Script à exécuter UNE FOIS que vous avez récupéré l'accès SSH
# Vérifie et répare les règles de pare-feu SSH

echo "🔧 === VÉRIFICATION ET RÉPARATION SSH ==="
echo ""

# 1. Vérifier UFW
echo "1️⃣ Vérification UFW..."
if command -v ufw &> /dev/null; then
    echo "   Statut UFW:"
    sudo ufw status verbose
    echo ""
    
    # Vérifier si le port 22 est autorisé
    if sudo ufw status | grep -q "22/tcp.*ALLOW"; then
        echo "   ✅ Port 22 autorisé dans UFW"
    else
        echo "   ⚠️  Port 22 non autorisé dans UFW !"
        echo "   Correction en cours..."
        sudo ufw allow 22/tcp
        echo "   ✅ Port 22 autorisé"
    fi
else
    echo "   ⚠️  UFW non installé"
fi
echo ""

# 2. Vérifier iptables
echo "2️⃣ Vérification iptables..."
if sudo iptables -L -n | grep -q "22.*ACCEPT"; then
    echo "   ✅ Port 22 autorisé dans iptables"
else
    echo "   ⚠️  Port 22 peut être bloqué dans iptables"
    echo "   Règles iptables pour le port 22:"
    sudo iptables -L -n | grep 22 || echo "   Aucune règle trouvée"
fi
echo ""

# 3. Vérifier sshd_config
echo "3️⃣ Vérification configuration SSH..."
if sudo grep -q "^Port 22" /etc/ssh/sshd_config; then
    echo "   ✅ SSH écoute sur le port 22"
else
    SSH_PORT=$(sudo grep "^Port" /etc/ssh/sshd_config | awk '{print $2}' || echo "22")
    echo "   SSH écoute sur le port: $SSH_PORT"
fi

if sudo grep -q "^PermitRootLogin no" /etc/ssh/sshd_config; then
    echo "   ✅ Root login désactivé (sécurisé)"
else
    echo "   ⚠️  Root login peut être activé"
fi
echo ""

# 4. Vérifier que sshd est actif
echo "4️⃣ Vérification service SSH..."
if sudo systemctl is-active --quiet sshd || sudo systemctl is-active --quiet ssh; then
    echo "   ✅ Service SSH actif"
    sudo systemctl status sshd --no-pager -l | head -5 || sudo systemctl status ssh --no-pager -l | head -5
else
    echo "   ❌ Service SSH non actif !"
    echo "   Démarrage du service..."
    sudo systemctl start sshd || sudo systemctl start ssh
    sudo systemctl enable sshd || sudo systemctl enable ssh
fi
echo ""

# 5. Afficher les règles recommandées
echo "5️⃣ Règles recommandées pour UFW:"
echo "   Pour autoriser seulement votre IP:"
echo "   sudo ufw allow from VOTRE_IP to any port 22"
echo ""
echo "   Pour autoriser temporairement toutes les IPs (moins sécurisé):"
echo "   sudo ufw allow 22/tcp"
echo ""

# 6. Vérifier les connexions actives
echo "6️⃣ Connexions SSH actives:"
ss -tunp | grep :22 | grep ESTAB || echo "   Aucune connexion active"
echo ""

echo "=== VÉRIFICATION TERMINÉE ==="
echo ""
echo "📋 Si vous ne pouvez toujours pas vous connecter:"
echo "   1. Vérifiez le groupe de sécurité AWS (port 22 doit être ouvert)"
echo "   2. Vérifiez que l'instance est en état 'Running'"
echo "   3. Vérifiez votre IP publique (elle peut avoir changé)"
echo "   4. Essayez de vous connecter depuis une autre machine/réseau"
