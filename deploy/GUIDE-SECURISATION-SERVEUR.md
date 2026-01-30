# Guide de Sécurisation Complète du Serveur EC2

## 📋 Table des matières
1. [Configuration UFW (Firewall)](#1-configuration-ufw-firewall)
2. [Sécurisation SSH](#2-sécurisation-ssh)
3. [Mise à jour et maintenance](#3-mise-à-jour-et-maintenance)
4. [Protection contre le malware](#4-protection-contre-le-malware)
5. [Monitoring et alertes](#5-monitoring-et-alertes)
6. [Configuration User Data sécurisée](#6-configuration-user-data-sécurisée)
7. [Checklist de sécurité](#7-checklist-de-sécurité)

---

## 1. Configuration UFW (Firewall)

### 1.1 Installation et configuration de base

```bash
# Installer UFW si pas déjà installé
sudo apt-get update
sudo apt-get install -y ufw

# Réinitialiser UFW (si déjà configuré)
sudo ufw --force reset

# Politique par défaut : tout refuser en entrée, tout autoriser en sortie
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Autoriser SSH (CRITIQUE - à faire en premier !)
sudo ufw allow 22/tcp

# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Activer UFW
sudo ufw --force enable

# Vérifier le statut
sudo ufw status verbose
```

### 1.2 Autoriser uniquement votre IP pour SSH (Recommandé)

```bash
# Remplacer VOTRE_IP_PUBLIQUE par votre adresse IP publique
# Vous pouvez la trouver sur : https://whatismyipaddress.com/
sudo ufw delete allow 22/tcp
sudo ufw allow from VOTRE_IP_PUBLIQUE to any port 22 proto tcp

# Exemple :
# sudo ufw allow from 123.45.67.89 to any port 22 proto tcp
```

### 1.3 Bloquer les IPs malveillantes

```bash
# Bloquer une IP spécifique
sudo ufw deny from IP_MALVEILLANTE

# Exemple : bloquer les IPs qui tentent de se connecter
sudo ufw deny from 167.94.138.121
sudo ufw deny from 66.132.153.142
```

### 1.4 Sauvegarder les règles UFW

```bash
# Les règles UFW sont automatiquement sauvegardées dans :
# /etc/ufw/user.rules (IPv4)
# /etc/ufw/user6.rules (IPv6)

# Pour sauvegarder manuellement :
sudo cp /etc/ufw/user.rules /etc/ufw/user.rules.backup
```

---

## 2. Sécurisation SSH

### 2.1 Configuration SSH de base

Éditez le fichier de configuration SSH :

```bash
sudo nano /etc/ssh/sshd_config
```

Modifications recommandées :

```bash
# Désactiver la connexion root directe
PermitRootLogin no

# Changer le port SSH (optionnel mais recommandé)
# Port 2222  # Décommentez et changez le port

# Limiter les tentatives de connexion
MaxAuthTries 3

# Désactiver l'authentification par mot de passe (utiliser uniquement les clés)
PasswordAuthentication no
PubkeyAuthentication yes

# Désactiver X11 forwarding (si non utilisé)
X11Forwarding no

# Timeout pour les connexions inactives
ClientAliveInterval 300
ClientAliveCountMax 2

# Limiter les utilisateurs autorisés
AllowUsers admin

# Désactiver les protocoles obsolètes
Protocol 2
```

Après modification :

```bash
# Tester la configuration avant de redémarrer
sudo sshd -t

# Si pas d'erreur, redémarrer SSH
sudo systemctl restart sshd

# Vérifier que SSH fonctionne toujours
sudo systemctl status sshd
```

⚠️ **IMPORTANT** : Si vous changez le port SSH, n'oubliez pas de mettre à jour UFW :
```bash
sudo ufw allow 2222/tcp  # Si vous avez changé le port à 2222
```

### 2.2 Configuration des clés SSH

```bash
# Vérifier que votre clé publique est dans authorized_keys
cat ~/.ssh/authorized_keys

# Si vous devez ajouter une clé :
# nano ~/.ssh/authorized_keys
# Collez votre clé publique

# Sécuriser les permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 2.3 Installer Fail2Ban (Protection contre les attaques brute-force)

```bash
# Installer Fail2Ban
sudo apt-get update
sudo apt-get install -y fail2ban

# Créer la configuration locale
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Éditer la configuration
sudo nano /etc/fail2ban/jail.local
```

Configuration recommandée :

```ini
[DEFAULT]
bantime = 3600        # Bannir pendant 1 heure
findtime = 600        # Fenêtre de 10 minutes
maxretry = 3          # 3 tentatives avant bannissement

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
```

```bash
# Redémarrer Fail2Ban
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Vérifier le statut
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

---

## 3. Mise à jour et maintenance

### 3.1 Mise à jour automatique

```bash
# Installer unattended-upgrades
sudo apt-get install -y unattended-upgrades

# Configurer les mises à jour automatiques
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Configuration recommandée :

```bash
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}:${distro_codename}-updates";
};

Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
```

```bash
# Activer les mises à jour automatiques
sudo nano /etc/apt/apt.conf.d/20auto-upgrades
```

Ajoutez :

```
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
```

### 3.2 Mise à jour manuelle régulière

```bash
# Mettre à jour la liste des paquets
sudo apt-get update

# Voir les mises à jour disponibles
sudo apt-get upgrade -s

# Installer les mises à jour de sécurité
sudo apt-get upgrade -y

# Nettoyer les paquets inutiles
sudo apt-get autoremove -y
sudo apt-get autoclean
```

---

## 4. Protection contre le malware

### 4.1 Script de monitoring automatique

Créez un script de monitoring :

```bash
sudo nano /usr/local/bin/monitor-malware.sh
```

Collez ce contenu :

```bash
#!/bin/bash
# Script de monitoring pour détecter le malware Monero

LOG_FILE="/var/log/malware-monitor.log"
ALERT_EMAIL="votre-email@example.com"  # Changez cette ligne

# Fonction de logging
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Vérifier les processus suspects
SUSPICIOUS_PROCESSES=$(ps aux | grep -E "xmrig|moneroocean|minerd" | grep -v grep)

if [ ! -z "$SUSPICIOUS_PROCESSES" ]; then
    log_message "ALERTE: Processus malveillant détecté!"
    log_message "$SUSPICIOUS_PROCESSES"
    
    # Arrêter les processus
    pkill -9 -f xmrig
    pkill -9 -f moneroocean
    pkill -9 -f minerd
    
    log_message "Processus malveillants arrêtés"
fi

# Vérifier les fichiers suspects
if [ -d "$HOME/moneroocean" ] || [ -d "/root/moneroocean" ] || [ -d "/tmp/moneroocean" ]; then
    log_message "ALERTE: Dossiers malveillants détectés!"
    rm -rf ~/moneroocean /root/moneroocean /tmp/moneroocean
    log_message "Dossiers malveillants supprimés"
fi

# Vérifier les crontabs
CRON_SUSPICIOUS=$(crontab -l 2>/dev/null | grep -E "xmrig|monero|curl.*sh|wget.*sh")
if [ ! -z "$CRON_SUSPICIOUS" ]; then
    log_message "ALERTE: Crontab malveillant détecté!"
    log_message "$CRON_SUSPICIOUS"
    crontab -l | grep -vE "xmrig|monero|curl.*sh|wget.*sh" | crontab -
    log_message "Crontab nettoyé"
fi

# Vérifier les services systemd suspects
SYSTEMD_SUSPICIOUS=$(systemctl list-units --type=service --state=running | grep -E "xmrig|monero")
if [ ! -z "$SYSTEMD_SUSPICIOUS" ]; then
    log_message "ALERTE: Service systemd suspect détecté!"
    log_message "$SYSTEMD_SUSPICIOUS"
fi
```

Rendre le script exécutable :

```bash
sudo chmod +x /usr/local/bin/monitor-malware.sh
```

### 4.2 Créer un cron job pour exécuter le monitoring

```bash
# Éditer le crontab
crontab -e

# Ajouter cette ligne pour exécuter toutes les 5 minutes
*/5 * * * * /usr/local/bin/monitor-malware.sh
```

### 4.3 Script de nettoyage complet

Utilisez le script existant :

```bash
cd ~/bbyatch/bbyatchv2-master
sudo bash deploy/eliminer-et-bloquer-malware.sh
```

---

## 5. Monitoring et alertes

### 5.1 Installation de monitoring système

```bash
# Installer htop pour surveiller les processus
sudo apt-get install -y htop iotop nethogs

# Installer logwatch pour analyser les logs
sudo apt-get install -y logwatch
```

### 5.2 Configuration de logwatch

```bash
# Configurer logwatch
sudo nano /etc/logwatch/conf/logwatch.conf
```

Modifications :

```
MailTo = votre-email@example.com
MailFrom = serveur@bbyatch.com
Detail = Med
Range = yesterday
Service = All
```

### 5.3 Vérification régulière des logs

```bash
# Vérifier les tentatives de connexion SSH échouées
sudo grep "Failed password" /var/log/auth.log | tail -20

# Vérifier les connexions SSH réussies
sudo grep "Accepted" /var/log/auth.log | tail -20

# Vérifier les processus qui consomment le plus de CPU
top -b -n 1 | head -20

# Vérifier l'utilisation du disque
df -h

# Vérifier l'utilisation de la mémoire
free -h
```

---

## 6. Configuration User Data sécurisée

Lors de la création de votre nouvelle instance, utilisez ce User Data :

```bash
#!/bin/bash
exec > /tmp/user-data.log 2>&1
set -x

# Attendre que le système soit prêt
sleep 30

# Mettre à jour le système
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# Installer les outils essentiels
apt-get install -y ufw fail2ban unattended-upgrades htop

# Configuration UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Configuration SSH de base
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Configuration Fail2Ban
systemctl enable fail2ban
systemctl start fail2ban

# Créer le script de monitoring
cat > /usr/local/bin/monitor-malware.sh << 'EOF'
#!/bin/bash
LOG_FILE="/var/log/malware-monitor.log"
SUSPICIOUS_PROCESSES=$(ps aux | grep -E "xmrig|moneroocean|minerd" | grep -v grep)
if [ ! -z "$SUSPICIOUS_PROCESSES" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ALERTE: Processus malveillant détecté!" >> "$LOG_FILE"
    pkill -9 -f xmrig
    pkill -9 -f moneroocean
    pkill -9 -f minerd
fi
if [ -d "$HOME/moneroocean" ] || [ -d "/root/moneroocean" ]; then
    rm -rf ~/moneroocean /root/moneroocean /tmp/moneroocean
fi
EOF

chmod +x /usr/local/bin/monitor-malware.sh

# Ajouter au crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-malware.sh") | crontab -

# Nettoyer les paquets inutiles
apt-get autoremove -y
apt-get autoclean
```

---

## 7. Checklist de sécurité

### ✅ Configuration initiale

- [ ] UFW installé et configuré
- [ ] SSH sécurisé (clés uniquement, pas de mot de passe)
- [ ] Fail2Ban installé et actif
- [ ] Mises à jour automatiques configurées
- [ ] Script de monitoring installé
- [ ] Cron job de monitoring configuré

### ✅ Maintenance régulière (hebdomadaire)

- [ ] Vérifier les logs d'authentification SSH
- [ ] Vérifier les processus suspects (htop)
- [ ] Vérifier l'utilisation des ressources (CPU, RAM, disque)
- [ ] Vérifier les mises à jour disponibles
- [ ] Vérifier les règles UFW
- [ ] Vérifier les IPs bannies par Fail2Ban

### ✅ Maintenance mensuelle

- [ ] Mettre à jour tous les paquets
- [ ] Vérifier les logs de sécurité
- [ ] Réviser les règles de firewall
- [ ] Vérifier les sauvegardes
- [ ] Tester la restauration depuis backup

### ✅ En cas d'alerte

- [ ] Vérifier immédiatement les processus en cours
- [ ] Vérifier les connexions réseau actives
- [ ] Vérifier les fichiers modifiés récemment
- [ ] Exécuter le script de nettoyage
- [ ] Changer les mots de passe si nécessaire
- [ ] Réviser les clés SSH autorisées

---

## 🔒 Bonnes pratiques supplémentaires

1. **Ne jamais utiliser le compte root** - Utilisez toujours un utilisateur avec sudo
2. **Changer régulièrement les clés SSH** - Rotation tous les 3-6 mois
3. **Utiliser des mots de passe forts** - Même si vous utilisez des clés SSH
4. **Limiter l'accès SSH** - Autoriser uniquement votre IP si possible
5. **Surveiller les logs régulièrement** - Au moins une fois par semaine
6. **Faire des sauvegardes régulières** - Quotidiennes si possible
7. **Utiliser HTTPS** - Pour toutes les communications web
8. **Garder le système à jour** - Installer les mises à jour de sécurité rapidement

---

## 📞 En cas de problème

Si vous détectez une activité suspecte :

1. **Isolez le serveur** - Coupez les connexions non essentielles
2. **Exécutez le script de nettoyage** - `deploy/eliminer-et-bloquer-malware.sh`
3. **Changez toutes les clés SSH** - Générez de nouvelles clés
4. **Vérifiez les logs** - Identifiez la source de l'attaque
5. **Bloquez les IPs malveillantes** - Via UFW
6. **Contactez le support** - Si nécessaire

---

**Dernière mise à jour : 30 janvier 2026**
