# ✅ Étapes Après le Build

## 1. Vérifier que le Build a Réussi

```bash
# Vérifier que le dossier .next existe et contient BUILD_ID
ls -la .next/BUILD_ID
cat .next/BUILD_ID
```

Si le build a réussi, vous devriez voir un fichier `BUILD_ID` avec un identifiant unique.

## 2. Redémarrer PM2

```bash
# Arrêter PM2 si nécessaire
pm2 stop bbyatch

# Redémarrer avec la nouvelle configuration
pm2 start ecosystem.config.cjs

# Vérifier le statut
pm2 list
```

Le statut devrait être **"online"** (vert).

## 3. Vérifier les Logs

```bash
# Voir les logs récents (dernières 50 lignes)
pm2 logs bbyatch --lines 50

# Voir les logs en temps réel
pm2 logs bbyatch

# Voir uniquement les erreurs
pm2 logs bbyatch --err --lines 50
```

**✅ Signes que tout fonctionne :**
- Pas d'erreurs dans les logs
- Message "Ready" ou "started server" dans les logs
- Statut PM2 = "online"

## 4. Tester l'Application

```bash
# Vérifier que le serveur répond
curl http://localhost:3003

# OU depuis votre navigateur
# http://votre-domaine.com
```

## 5. Sauvegarder la Configuration PM2

```bash
# Sauvegarder la configuration actuelle
pm2 save

# (Optionnel) Configurer PM2 pour démarrer au boot
pm2 startup
# Suivre les instructions affichées
```

## 6. Surveiller les Ressources

```bash
# Voir l'utilisation mémoire et CPU
pm2 monit

# OU
free -h
ps aux --sort=-%mem | head -10
```

## 🚨 Si le Serveur ne Démarre Pas

### Vérifier les Erreurs

```bash
# Logs d'erreur détaillés
pm2 logs bbyatch --err --lines 100

# Vérifier les logs système
journalctl -u pm2-ec2-user --lines 50
```

### Vérifier le Port

```bash
# Vérifier si le port 3003 est utilisé
netstat -tulpn | grep 3003

# Si le port est bloqué, tuer le processus
lsof -ti:3003 | xargs kill -9
```

### Vérifier les Variables d'Environnement

```bash
# Vérifier que .env existe
ls -la .env

# Vérifier les variables critiques
cat .env | grep -E "(DATABASE_URL|NEXTAUTH|PORT)"
```

## 📊 Commandes Utiles

```bash
# Redémarrer PM2
pm2 restart bbyatch

# Arrêter PM2
pm2 stop bbyatch

# Voir le statut
pm2 status

# Voir les informations détaillées
pm2 show bbyatch

# Voir les logs en temps réel
pm2 logs bbyatch

# Monitorer les ressources
pm2 monit
```

## ✅ Checklist Finale

- [ ] Build réussi (`.next/BUILD_ID` existe)
- [ ] PM2 redémarré et statut "online"
- [ ] Pas d'erreurs dans les logs
- [ ] Application accessible (localhost:3003 ou domaine)
- [ ] Configuration PM2 sauvegardée (`pm2 save`)

## 🎯 Résumé Rapide

```bash
# 1. Vérifier le build
ls -la .next/BUILD_ID

# 2. Redémarrer PM2
pm2 restart bbyatch

# 3. Vérifier le statut
pm2 list

# 4. Voir les logs
pm2 logs bbyatch --lines 20

# 5. Sauvegarder
pm2 save
```
