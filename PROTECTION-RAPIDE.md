# 🛡️ Protection Rapide - Empêcher le Malware de Revenir

## ⚡ Installation en 3 Commandes

Sur votre serveur EC2, exécutez simplement :

```bash
cd ~/bbyatchv2-master
chmod +x install-protection.sh
bash install-protection.sh
```

**C'est tout !** Le système va :
1. Nettoyer le malware existant
2. Installer toutes les protections
3. Activer la surveillance automatique

## 🔄 Protection Automatique

Une fois installé, le système **protège automatiquement** votre serveur :

- ✅ **Vérifie toutes les 5 minutes** la présence de malware
- ✅ **Supprime automatiquement** tout malware détecté
- ✅ **Enregistre** toutes les actions dans les logs
- ✅ **Protège SSH** avec fail2ban (bloque les attaques)
- ✅ **Limite l'accès SSH** à votre IP uniquement

## 📊 Vérifier que ça fonctionne

```bash
# Vérifier que la protection est active
sudo systemctl status malware-protection.timer

# Voir les logs de protection
sudo tail -20 /var/log/malware-protection.log

# Vérifier le pare-feu
sudo ufw status

# Vérifier fail2ban
sudo fail2ban-client status sshd
```

## 🚨 Si le Malware Revient Quand Même

Le système devrait le détecter et le supprimer automatiquement. Mais si vous voulez vérifier manuellement :

```bash
# Vérification manuelle
cd ~/bbyatchv2-master
bash monitor-malware.sh

# Nettoyage manuel si nécessaire
bash cleanup-malware-complete.sh
```

## 🔍 Surveillance Continue

Le système vérifie automatiquement, mais vous pouvez aussi :

```bash
# Voir les logs en temps réel
sudo tail -f /var/log/malware-protection.log

# Vérifier la mémoire
free -h

# Vérifier les processus
ps aux | grep -E "(xmrig|moneroocean|miner)"
```

## ⚙️ Configuration Avancée

### Changer la fréquence de vérification

Par défaut, le système vérifie toutes les 5 minutes. Pour changer :

```bash
sudo nano /etc/systemd/system/malware-protection.timer
```

Changez `OnUnitActiveSec=5min` à la valeur souhaitée (ex: `10min`, `1h`)

Puis rechargez :
```bash
sudo systemctl daemon-reload
sudo systemctl restart malware-protection.timer
```

### Désactiver temporairement

```bash
sudo systemctl stop malware-protection.timer
```

### Réactiver

```bash
sudo systemctl start malware-protection.timer
```

## 📝 Ce qui est Protégé

- ✅ Processus malveillants (xmrig, moneroocean, miner)
- ✅ Dossiers suspects (~/moneroocean, /tmp/moneroocean, etc.)
- ✅ Crontabs malveillants
- ✅ Services systemd suspects
- ✅ Attaques SSH (fail2ban)
- ✅ Accès non autorisés (pare-feu UFW)

## 🎯 Résultat

Avec cette protection, **le malware ne peut plus s'installer durablement** car :
1. Il est détecté automatiquement toutes les 5 minutes
2. Il est supprimé immédiatement
3. Les tentatives d'accès malveillantes sont bloquées
4. SSH est protégé contre les attaques par force brute

**Votre serveur est maintenant protégé en permanence !** 🛡️
