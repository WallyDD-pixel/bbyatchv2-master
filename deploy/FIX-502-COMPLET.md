# Fix 502 Bad Gateway - Diagnostic complet

## Commandes à exécuter dans l'ordre

### 1. Vérifier que PM2 est en cours d'exécution

```bash
sudo bash -c "cd /home/ec2-user/bbyatchv2-master && export PM2_HOME=/home/ec2-user/.pm2 && pm2 status"
```

### 2. Vérifier que l'application écoute sur le port 3000

```bash
sudo ss -tlnp | grep :3000
```

### 3. Vérifier les logs PM2 récents (erreurs)

```bash
sudo bash -c "cd /home/ec2-user/bbyatchv2-master && export PM2_HOME=/home/ec2-user/.pm2 && pm2 logs bbyatch --lines 10 --err"
```

### 4. Tester l'application localement

```bash
curl -v http://localhost:3000 2>&1 | head -30
```

### 5. Vérifier les logs Nginx

```bash
sudo tail -30 /var/log/nginx/error.log
```

### 6. Vérifier la configuration Nginx

```bash
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/* | grep -A 15 "preprod.bbservicescharter.com"
```

### 7. Si PM2 n'est pas démarré, le démarrer

```bash
sudo bash -c "cd /home/ec2-user/bbyatchv2-master && export PM2_HOME=/home/ec2-user/.pm2 && pm2 start ecosystem.config.cjs"
```

### 8. Si l'application ne démarre pas, vérifier le port dans ecosystem.config.cjs

```bash
sudo bash -c "cd /home/ec2-user/bbyatchv2-master && cat ecosystem.config.cjs | grep -A 5 PORT"
```

### 9. Redémarrer Nginx si nécessaire

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```
