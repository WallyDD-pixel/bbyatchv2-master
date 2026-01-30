# Redémarrer l'application après le build

## 1. Vérifier l'état de PM2

```bash
pm2 list
```

## 2. Si le processus n'existe pas, le créer

```bash
cd /home/ec2-user/bbyatchv2-master
pm2 start ecosystem.config.cjs
```

## 3. Si le processus existe, le redémarrer

```bash
pm2 restart bbyatch
# ou
pm2 restart ecosystem.config.cjs
```

## 4. Vérifier les logs

```bash
pm2 logs bbyatch --lines 50
```

## 5. Vérifier que l'application fonctionne

```bash
curl http://localhost:3000
```

## 6. Sauvegarder la configuration PM2

```bash
pm2 save
pm2 startup
```
