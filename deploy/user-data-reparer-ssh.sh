#!/bin/bash
# Script User Data à ajouter dans AWS Console pour réparer SSH au démarrage
# À copier dans : EC2 → Instances → Actions → Instance Settings → Edit User Data

# Attendre que le système soit prêt
sleep 30

# Logger
echo "=== DÉBUT RÉPARATION SSH - $(date) ===" >> /var/log/ssh-repair.log

# 1. Autoriser SSH dans UFW
if command -v ufw &> /dev/null; then
    echo "Autorisation SSH dans UFW..." >> /var/log/ssh-repair.log
    ufw --force allow 22/tcp
    ufw --force enable
    echo "✅ UFW configuré" >> /var/log/ssh-repair.log
fi

# 2. Démarrer et activer SSH
echo "Démarrage du service SSH..." >> /var/log/ssh-repair.log
systemctl start sshd 2>/dev/null || systemctl start ssh 2>/dev/null || true
systemctl enable sshd 2>/dev/null || systemctl enable ssh 2>/dev/null || true
echo "✅ Service SSH démarré" >> /var/log/ssh-repair.log

# 3. Nettoyer le malware immédiatement
echo "Nettoyage du malware..." >> /var/log/ssh-repair.log
pkill -9 -f xmrig 2>/dev/null || true
pkill -9 -f moneroocean 2>/dev/null || true
pkill -9 -f "curl.*monero" 2>/dev/null || true
pkill -9 -f "wget.*monero" 2>/dev/null || true
rm -rf ~/moneroocean /root/moneroocean /tmp/moneroocean /var/tmp/moneroocean 2>/dev/null || true
echo "✅ Malware nettoyé" >> /var/log/ssh-repair.log

# 4. Nettoyer les crontabs suspects
echo "Nettoyage des crontabs..." >> /var/log/ssh-repair.log
crontab -l 2>/dev/null | grep -vE "xmrig|monero|curl.*sh|wget.*sh" | crontab - 2>/dev/null || true
crontab -l 2>/dev/null | grep -vE "xmrig|monero|curl.*sh|wget.*sh" | crontab - 2>/dev/null || true
echo "✅ Crontabs nettoyés" >> /var/log/ssh-repair.log

# 5. Vérifier iptables (si UFW n'est pas utilisé)
echo "Vérification iptables..." >> /var/log/ssh-repair.log
if ! command -v ufw &> /dev/null; then
    iptables -I INPUT -p tcp --dport 22 -j ACCEPT 2>/dev/null || true
    echo "✅ iptables configuré" >> /var/log/ssh-repair.log
fi

# 6. Vérifier que SSH écoute
echo "Vérification que SSH écoute..." >> /var/log/ssh-repair.log
ss -tlnp | grep :22 && echo "✅ SSH écoute sur le port 22" >> /var/log/ssh-repair.log || echo "⚠️ SSH ne semble pas écouter" >> /var/log/ssh-repair.log

echo "=== FIN RÉPARATION SSH - $(date) ===" >> /var/log/ssh-repair.log

# Afficher le log
cat /var/log/ssh-repair.log
