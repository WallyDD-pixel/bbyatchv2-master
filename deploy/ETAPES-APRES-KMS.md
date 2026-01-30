# Étapes après la configuration KMS

## ✅ Étape 1 : Attendre la propagation (1-2 minutes)

Les permissions IAM peuvent prendre quelques minutes à se propager.

## 🔍 Étape 2 : Tester Session Manager

1. **Console AWS** → **EC2** → **Instances**
2. Sélectionnez votre instance `i-0f72f180aeeaedf7e`
3. Cliquez sur **Connect** → **Session Manager** → **Connect**

Si ça fonctionne, vous êtes connecté ! 🎉

## ❌ Si Session Manager ne fonctionne toujours pas

### Option A : Vérifier Fail2Ban (IP bannie)

Si votre IP est bannie par Fail2Ban, vous devez la débannir.

**Via EC2 Instance Connect** (si disponible) :

1. **Console AWS** → **EC2** → **Instances**
2. Sélectionnez votre instance
3. Cliquez sur **Connect** → **EC2 Instance Connect** → **Connect**

Une fois connecté :

```bash
# Obtenir votre IP publique actuelle
curl -s https://api.ipify.org

# Débannir votre IP (remplacez YOUR_IP par votre IP)
sudo fail2ban-client set sshd unban YOUR_IP

# Vérifier le statut de Fail2Ban
sudo fail2ban-client status sshd

# Voir les IPs bannies
sudo fail2ban-client status sshd | grep "Banned IP"
```

### Option B : Vérifier les Security Groups

1. **Console AWS** → **EC2** → **Instances**
2. Sélectionnez votre instance → **Security** → Cliquez sur le Security Group
3. **Inbound rules** → Vérifiez que le port **22 (SSH)** est ouvert depuis votre IP ou `0.0.0.0/0`

Si nécessaire, ajoutez une règle :
- **Type** : SSH
- **Port** : 22
- **Source** : Votre IP (ou `0.0.0.0/0` pour tester)

### Option C : Tester SSH direct

Si Session Manager ne fonctionne toujours pas, essayez SSH direct :

```bash
# Depuis votre machine locale (PowerShell)
ssh -i "bbyatch4R.pem" ec2-user@ec2-16-16-104-13.eu-north-1.compute.amazonaws.com
```

**Note** : Si vous obtenez "Connection closed by remote host", c'est probablement Fail2Ban qui bloque votre IP.

### Option D : Désactiver temporairement Fail2Ban

⚠️ **Attention** : À faire uniquement si vous avez besoin d'accès urgent et que vous ne pouvez pas utiliser EC2 Instance Connect.

Via EC2 Instance Connect :

```bash
# Arrêter Fail2Ban temporairement
sudo systemctl stop fail2ban

# Vérifier qu'il est arrêté
sudo systemctl status fail2ban

# Réessayer SSH ou Session Manager
```

**Important** : Réactivez Fail2Ban après :

```bash
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

## 📝 Une fois connecté

Une fois que vous avez accès au serveur, vous pouvez :

1. **Vérifier l'état de l'application** :
```bash
cd ~/bbyatchv2-master
pm2 status
pm2 logs bbyatch --lines 50
```

2. **Mettre à jour le code** :
```bash
cd ~/bbyatchv2-master
git pull
npm install --legacy-peer-deps
npm run build
pm2 restart bbyatch
```

3. **Vérifier les logs Nginx** :
```bash
sudo tail -50 /var/log/nginx/error.log
```

## 🔐 Sécurité recommandée après connexion

1. **Vérifier les processus suspects** :
```bash
ps aux | grep -E "xmrig|moneroocean|minerd" | grep -v grep
```

2. **Vérifier les crontabs** :
```bash
crontab -l
sudo crontab -l
```

3. **Vérifier les connexions réseau suspectes** :
```bash
sudo netstat -tulpn | grep LISTEN
```
