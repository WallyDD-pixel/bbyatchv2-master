# 🔍 Diagnostic SSH Timeout

## ✅ Vérifications AWS (déjà faites)
- Port 22 (SSH) : ✅ Ouvert avec source 0.0.0.0/0
- Port 80 (HTTP) : ✅ Ouvert
- Port 443 (HTTPS) : ✅ Ouvert

## 🔍 Causes possibles du timeout SSH

### 1. Serveur arrêté ou en panne
**Vérification dans AWS Console :**
- EC2 → Instances → Vérifiez l'état de l'instance
- Doit être "Running" (en cours d'exécution)
- Si "Stopped" → Démarrer l'instance
- Si "Stopping" → Attendre qu'elle s'arrête puis la redémarrer

### 2. UFW bloque le port 22 localement
**Le malware peut avoir modifié UFW sur le serveur**

**Solution via AWS Systems Manager (si configuré) :**
```bash
aws ssm start-session --target i-VOTRE_INSTANCE_ID
```

**Ou via la console AWS :**
- EC2 → Instances → Sélectionner l'instance
- Actions → Connect → Session Manager (si disponible)

### 3. Service SSH arrêté
Le malware peut avoir arrêté le service SSH.

### 4. IP publique a changé
Vérifiez l'IP publique actuelle dans la console AWS.

### 5. Problème réseau temporaire
Essayez de vous connecter depuis un autre réseau/VPN.

## 🛠️ Solutions

### Solution 1 : Redémarrer l'instance
1. Console AWS → EC2 → Instances
2. Sélectionner l'instance
3. Actions → Instance State → Reboot
4. Attendre 2-3 minutes
5. Réessayer la connexion SSH

### Solution 2 : Utiliser AWS Systems Manager Session Manager
Si Session Manager est configuré :
```bash
aws ssm start-session --target i-VOTRE_INSTANCE_ID
```

### Solution 3 : Vérifier l'état de l'instance
- Console AWS → EC2 → Instances
- Vérifiez les métriques CloudWatch :
  - CPU utilisation
  - Status checks
  - Network in/out

### Solution 4 : Créer un script de réparation à exécuter via User Data
Si vous pouvez redémarrer l'instance, vous pouvez ajouter un script User Data qui :
1. Autorise le port 22 dans UFW
2. Démarre le service SSH
3. Nettoie le malware

## 📋 Script User Data pour réparer SSH au démarrage

```bash
#!/bin/bash
# Script User Data pour réparer SSH au démarrage

# Attendre que le système soit prêt
sleep 30

# Autoriser SSH dans UFW
ufw allow 22/tcp
ufw --force enable

# Démarrer et activer SSH
systemctl start sshd || systemctl start ssh
systemctl enable sshd || systemctl enable ssh

# Nettoyer le malware
pkill -9 -f xmrig
pkill -9 -f moneroocean
rm -rf ~/moneroocean /root/moneroocean

# Nettoyer les crontabs
crontab -l 2>/dev/null | grep -vE "xmrig|monero" | crontab - 2>/dev/null || true

# Logger
echo "SSH réparé le $(date)" >> /var/log/ssh-repair.log
```

## 🔧 Actions immédiates

1. **Vérifier l'état de l'instance dans AWS Console**
2. **Si l'instance est "Running"** → Essayer de redémarrer
3. **Vérifier les métriques CloudWatch** pour voir si le serveur répond
4. **Essayer de se connecter via Session Manager** si disponible
5. **Vérifier l'IP publique** (elle peut avoir changé)

## 📞 Si rien ne fonctionne

1. **Créer un snapshot** du volume EBS
2. **Créer une nouvelle instance** avec le bon groupe de sécurité
3. **Attacher le volume** au snapshot
4. **Se connecter à la nouvelle instance**
5. **Nettoyer le malware** sur la nouvelle instance
