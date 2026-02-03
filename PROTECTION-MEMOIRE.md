# 🛡️ Protection de la Mémoire contre le Malware

## Problème
Le malware remplit la mémoire du serveur, ce qui fait planter l'application Next.js (erreur 502 Bad Gateway).

## Solution : Isolation et Protection Multi-Couches

### 1. Limites PM2 (Déjà configuré dans `ecosystem.config.cjs`)
- ✅ Limite de mémoire : 1.5GB maximum pour l'application
- ✅ Redémarrage automatique si la limite est dépassée
- ✅ Limite Node.js : `--max-old-space-size=1536`

### 2. Protection Automatique de la Mémoire

Le script `protect-memory.sh` :
- ✅ Surveille l'utilisation de la mémoire système
- ✅ Tue automatiquement les processus malveillants si mémoire > 85%
- ✅ Tue les processus suspects qui utilisent > 500MB
- ✅ Protège l'application en la redémarrant si elle dépasse 1.5GB

### 3. Installation de la Protection

```bash
cd ~/bbyatchv2-master

# Rendre le script exécutable
chmod +x protect-memory.sh

# Créer le service systemd
sudo tee /etc/systemd/system/memory-protection.service > /dev/null << 'EOF'
[Unit]
Description=Protection automatique de la mémoire contre le malware
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash /home/ec2-user/bbyatchv2-master/protect-memory.sh
User=root

[Install]
WantedBy=multi-user.target
EOF

# Créer le timer (exécution toutes les minutes)
sudo tee /etc/systemd/system/memory-protection.timer > /dev/null << 'EOF'
[Unit]
Description=Timer pour la protection de la mémoire
Requires=memory-protection.service

[Timer]
OnBootSec=30s
OnUnitActiveSec=1min
Unit=memory-protection.service

[Install]
WantedBy=timers.target
EOF

# Activer et démarrer
sudo systemctl daemon-reload
sudo systemctl enable memory-protection.timer
sudo systemctl start memory-protection.timer

# Vérifier
sudo systemctl status memory-protection.timer
```

### 4. Limites Système pour l'Utilisateur (Optionnel mais Recommandé)

Créer des limites pour l'utilisateur `ec2-user` :

```bash
# Créer le fichier de limites
sudo tee /etc/security/limits.d/ec2-user-limits.conf > /dev/null << 'EOF'
# Limites pour ec2-user
ec2-user soft memlock 2048000
ec2-user hard memlock 2048000
ec2-user soft nofile 65536
ec2-user hard nofile 65536
EOF

# Appliquer les limites (nécessite une reconnexion SSH)
```

### 5. Vérification et Monitoring

```bash
# Voir les logs de protection mémoire
sudo tail -f /var/log/memory-protection.log

# Voir l'état du timer
sudo systemctl status memory-protection.timer

# Voir l'utilisation mémoire en temps réel
watch -n 2 'free -h && echo "" && pm2 monit'

# Voir les processus les plus gourmands
ps aux --sort=-%mem | head -10
```

### 6. Redémarrer l'Application avec les Nouvelles Limites

```bash
cd ~/bbyatchv2-master

# Arrêter PM2
pm2 delete all

# Redémarrer avec les nouvelles limites
pm2 start ecosystem.config.cjs

# Vérifier
pm2 list
pm2 logs bbyatch --lines 20
```

## Résultat

Avec ces protections :
- ✅ L'application est limitée à 1.5GB de mémoire
- ✅ Le malware est tué automatiquement s'il consomme trop de mémoire
- ✅ L'application redémarre automatiquement si elle dépasse sa limite
- ✅ La mémoire système est protégée (tue les processus suspects si > 85%)
- ✅ Votre site reste en ligne même en cas d'attaque

## Surveillance Continue

```bash
# Voir les logs de protection
sudo tail -f /var/log/memory-protection.log

# Voir l'état de la mémoire
free -h

# Voir l'état de l'application
pm2 monit
```
