# 🔧 Guide de Dépannage - Mode Rescue VPS OVH

## ❓ Pourquoi mon VPS passe en mode rescue ?

Le mode rescue est activé automatiquement par OVH quand le système ne peut pas démarrer normalement. Voici les causes les plus courantes :

### Causes principales :

1. **💾 Disque plein** (cause la plus fréquente)
   - Le système ne peut plus écrire sur le disque
   - Les logs, fichiers temporaires s'accumulent

2. **🔄 Trop de redémarrages**
   - Si le système crash au démarrage plusieurs fois
   - OVH active automatiquement le mode rescue

3. **📁 Système de fichiers corrompu**
   - Erreur lors d'un redémarrage brutal
   - Problème de disque dur

4. **⚙️ Problème de configuration système**
   - Fichier `/etc/fstab` incorrect
   - Problème avec le kernel
   - Service système bloquant le démarrage

5. **🔌 Problème matériel**
   - Disque dur défaillant
   - Problème de RAM

## 🔍 Comment diagnostiquer ?

### 1. Vérifier l'espace disque (dans le mode rescue)

```bash
# Se connecter en mode rescue via SSH
# Les identifiants sont envoyés par email par OVH

# Monter le disque principal
mount /dev/sda1 /mnt  # ou /dev/nvme0n1p1 selon votre VPS

# Vérifier l'espace disque
df -h /mnt

# Vérifier les plus gros fichiers/dossiers
du -sh /mnt/* | sort -h | tail -20
```

### 2. Vérifier les logs système

```bash
# Voir les logs du dernier boot
dmesg | tail -100

# Vérifier les logs système
journalctl -b -1  # logs du boot précédent
```

### 3. Vérifier le système de fichiers

```bash
# Vérifier l'intégrité du système de fichiers
fsck -n /dev/sda1  # Mode lecture seule d'abord
```

## 🛠️ Solutions

### Solution 1 : Libérer de l'espace disque

```bash
# Dans le mode rescue, monter le disque
mount /dev/sda1 /mnt

# Nettoyer les logs
rm -rf /mnt/var/log/*.log
rm -rf /mnt/var/log/*.gz

# Nettoyer les packages npm/node_modules inutiles
find /mnt/home/ubuntu -name "node_modules" -type d -exec rm -rf {} +

# Nettoyer les fichiers temporaires
rm -rf /mnt/tmp/*
rm -rf /mnt/var/tmp/*

# Nettoyer les anciennes versions de kernel
apt-get autoremove -y
apt-get autoclean

# Vérifier l'espace libéré
df -h /mnt
```

### Solution 2 : Réparer le système de fichiers

```bash
# Monter le disque en mode rescue
mount /dev/sda1 /mnt

# Réparer le système de fichiers (ATTENTION : peut prendre du temps)
fsck -y /dev/sda1

# Si erreur grave, forcer la réparation
fsck -f -y /dev/sda1
```

### Solution 3 : Vérifier et corriger /etc/fstab

```bash
# Monter le disque
mount /dev/sda1 /mnt

# Vérifier le fichier fstab
cat /mnt/etc/fstab

# Si erreur, éditer avec précaution
nano /mnt/etc/fstab
```

### Solution 4 : Redémarrer en mode normal

Une fois les problèmes corrigés :

1. **Dans le panneau OVH :**
   - Allez dans votre VPS
   - Section "Boot"
   - Changez de "Rescue" à "LOCAL" (ou votre OS)

2. **Redémarrez le VPS**

3. **Vérifiez que tout fonctionne :**
   ```bash
   ssh ubuntu@votre-serveur
   df -h
   systemctl status
   ```

## 🚨 Prévention

### Script de nettoyage automatique

Créez un script pour éviter que le disque se remplisse :

```bash
# Créer le script
nano ~/cleanup-disk.sh
```

```bash
#!/bin/bash
# Script de nettoyage automatique

echo "🧹 Nettoyage du disque..."

# Nettoyer les logs anciens (garder les 7 derniers jours)
find /var/log -name "*.log" -mtime +7 -delete
find /var/log -name "*.gz" -mtime +7 -delete

# Nettoyer les fichiers temporaires
rm -rf /tmp/*
rm -rf /var/tmp/*

# Nettoyer les packages apt
apt-get autoremove -y
apt-get autoclean

# Nettoyer les logs PM2 anciens
if command -v pm2 &> /dev/null; then
    pm2 flush  # Vide les logs PM2
fi

# Afficher l'espace disque
echo ""
echo "📊 Espace disque disponible :"
df -h | grep -E '^/dev/'

echo ""
echo "✅ Nettoyage terminé !"
```

```bash
# Rendre exécutable
chmod +x ~/cleanup-disk.sh

# Ajouter au cron pour exécution hebdomadaire
crontab -e
# Ajouter cette ligne :
0 2 * * 0 /home/ubuntu/cleanup-disk.sh >> /home/ubuntu/cleanup.log 2>&1
```

### Surveillance de l'espace disque

```bash
# Installer un outil de monitoring
npm install -g pm2-logrotate

# Configurer PM2 logrotate
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Vérification régulière

Ajoutez cette commande à votre routine :

```bash
# Vérifier l'espace disque
df -h

# Si utilisation > 80%, nettoyer
if [ $(df / | tail -1 | awk '{print $5}' | sed 's/%//') -gt 80 ]; then
    echo "⚠️  Disque presque plein !"
    ~/cleanup-disk.sh
fi
```

## 📋 Checklist de récupération

- [ ] Se connecter en mode rescue (identifiants OVH par email)
- [ ] Monter le disque principal
- [ ] Vérifier l'espace disque (`df -h`)
- [ ] Identifier la cause (disque plein, fs corrompu, etc.)
- [ ] Appliquer la solution appropriée
- [ ] Vérifier que tout est OK
- [ ] Changer le boot de "Rescue" à "LOCAL" dans OVH
- [ ] Redémarrer le VPS
- [ ] Vérifier que l'application fonctionne
- [ ] Mettre en place la prévention

## 🆘 En cas d'urgence

Si vous ne pouvez pas récupérer :

1. **Contactez le support OVH**
2. **Restaurez depuis un snapshot** (si disponible)
3. **Réinstallez le système** (dernier recours)

## 📝 Commandes utiles en mode rescue

```bash
# Lister les partitions
lsblk
fdisk -l

# Monter une partition
mount /dev/sda1 /mnt

# Accéder au système monté
chroot /mnt

# Vérifier les services
systemctl list-units --failed

# Voir les erreurs de boot
journalctl -b -1 -p err
```

