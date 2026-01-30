# Diagnostic 502 Bad Gateway

## Commandes à exécuter sur le serveur

### 1. Vérifier que PM2 est en cours d'exécution

```bash
sudo bash -c "cd /home/ec2-user/bbyatchv2-master && export PM2_HOME=/home/ec2-user/.pm2 && pm2 status"
```

### 2. Vérifier que l'application écoute sur le port 3000

```bash
sudo ss -tlnp | grep :3000
```

### 3. Vérifier les logs PM2 récents

```bash
sudo bash -c "cd /home/ec2-user/bbyatchv2-master && export PM2_HOME=/home/ec2-user/.pm2 && pm2 logs bbyatch --lines 50 --err"
```

### 4. Vérifier les logs Nginx

```bash
sudo tail -50 /var/log/nginx/error.log
```

### 5. Tester l'application localement

```bash
curl http://localhost:3000
```

### 6. Vérifier la configuration Nginx

```bash
sudo nginx -t
sudo cat /etc/nginx/sites-available/* | grep -A 10 "preprod.bbservicescharter.com"
```

### 7. Si PM2 n'est pas démarré, le démarrer

```bash
sudo bash -c "cd /home/ec2-user/bbyatchv2-master && export PM2_HOME=/home/ec2-user/.pm2 && pm2 start ecosystem.config.cjs"
```

### 8. Si l'application ne démarre pas, vérifier les variables d'environnement

```bash
sudo bash -c "cd /home/ec2-user/bbyatchv2-master && cat .env | grep -E 'PORT|DATABASE_URL|NEXTAUTH'"
```
