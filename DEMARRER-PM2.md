# 🚀 Démarrer PM2 Après le Build

## ✅ Le Build a Réussi !

Le fichier `.next/BUILD_ID` existe, donc le build est terminé avec succès.

## 🔧 Démarrer PM2

Le processus n'existe pas encore dans PM2. Il faut le démarrer :

```bash
# Démarrer avec ecosystem.config.cjs
pm2 start ecosystem.config.cjs

# Vérifier le statut
pm2 list

# Voir les logs
pm2 logs bbyatch --lines 20

# Sauvegarder la configuration
pm2 save
```

## 📋 Commandes Complètes

```bash
# 1. Démarrer PM2
pm2 start ecosystem.config.cjs

# 2. Attendre quelques secondes pour le démarrage
sleep 5

# 3. Vérifier le statut (devrait être "online")
pm2 list

# 4. Voir les logs pour confirmer
pm2 logs bbyatch --lines 30

# 5. Sauvegarder
pm2 save
```

## ✅ Signes de Succès

Après `pm2 start ecosystem.config.cjs`, vous devriez voir :
- Un processus `bbyatch` dans `pm2 list`
- Statut **"online"** (vert)
- Dans les logs : "Ready" ou "started server on port 3003"

## 🚨 Si le Démarrage Échoue

### Vérifier les Logs d'Erreur

```bash
# Logs d'erreur
pm2 logs bbyatch --err --lines 50

# Ou vérifier les logs dans le fichier
cat logs/pm2-error.log | tail -50
```

### Vérifier le Port

```bash
# Vérifier si le port 3003 est déjà utilisé
netstat -tulpn | grep 3003

# Si oui, libérer le port
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
# Redémarrer
pm2 restart bbyatch

# Arrêter
pm2 stop bbyatch

# Voir le statut
pm2 status

# Monitorer les ressources
pm2 monit
```
