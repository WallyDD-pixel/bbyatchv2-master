# Premières commandes une fois connecté au serveur

## 1. Vérifier l'état de l'application

```bash
# Aller dans le répertoire du projet
cd ~/bbyatchv2-master

# Vérifier l'état de PM2
pm2 status

# Voir les logs récents
pm2 logs bbyatch --lines 50

# Vérifier que l'application tourne
pm2 info bbyatch
```

## 2. Vérifier les logs Nginx

```bash
# Logs d'erreur
sudo tail -50 /var/log/nginx/error.log

# Logs d'accès récents
sudo tail -50 /var/log/nginx/access.log
```

## 3. Vérifier la sécurité (malware, processus suspects)

```bash
# Vérifier les processus suspects
ps aux | grep -E "xmrig|moneroocean|minerd" | grep -v grep

# Vérifier les crontabs
crontab -l
sudo crontab -l

# Vérifier les connexions réseau suspectes
sudo netstat -tulpn | grep LISTEN

# Vérifier l'espace disque
df -h
```

## 4. Mettre à jour le code (si nécessaire)

```bash
cd ~/bbyatchv2-master

# Vérifier les changements en attente
git status

# Récupérer les dernières modifications
git pull

# Installer les dépendances si nécessaire
npm install --legacy-peer-deps

# Rebuild l'application
npm run build

# Redémarrer PM2
pm2 restart bbyatch

# Vérifier les logs après redémarrage
pm2 logs bbyatch --lines 20
```

## 5. Vérifier la configuration

```bash
# Vérifier les variables d'environnement (sans afficher les valeurs sensibles)
cd ~/bbyatchv2-master
cat .env | grep -E "DATABASE_URL|NEXTAUTH|SUPABASE|PORT" | sed 's/=.*/=***/'

# Vérifier la configuration Nginx
sudo nginx -t

# Vérifier les règles iptables
sudo iptables -L -n -v | head -20
```

## 6. Vérifier Fail2Ban

```bash
# Statut de Fail2Ban
sudo fail2ban-client status

# Statut spécifique pour SSH
sudo fail2ban-client status sshd

# Voir les IPs bannies
sudo fail2ban-client status sshd | grep "Banned IP"
```

## 7. Tester la connexion à la base de données

```bash
cd ~/bbyatchv2-master

# Tester la connexion Prisma
npx prisma db push --skip-generate
```

## 8. Vérifier les ressources système

```bash
# CPU et mémoire
top -bn1 | head -20

# Ou avec htop si disponible
htop

# Espace disque
df -h

# Utilisation mémoire
free -h
```
