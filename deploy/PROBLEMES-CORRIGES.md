# Problèmes de Déploiement - Corrections Appliquées

## 🔴 Problèmes Identifiés

### 1. **PORT non persistant dans PM2**
**Problème**: Le PORT était défini uniquement dans le script de déploiement mais pas dans la configuration PM2. Quand PM2 redémarrait l'application (après un crash ou un redémarrage du serveur), le PORT n'était pas défini et Next.js utilisait le port par défaut 3000 au lieu de 3010.

**Impact**: 
- L'application démarrait sur le mauvais port
- Nginx ne pouvait pas se connecter (il pointe vers 3010)
- Le site apparaissait comme "down"

**Solution**: Ajout du PORT dans `ecosystem.config.cjs` avec une valeur par défaut de 3010.

### 2. **Variables d'environnement non chargées au redémarrage**
**Problème**: Les variables d'environnement du fichier `.env` n'étaient pas chargées dans la configuration PM2, donc elles n'étaient pas disponibles quand PM2 redémarrait l'application.

**Impact**:
- DATABASE_URL, NEXTAUTH_SECRET, etc. non disponibles
- L'application ne pouvait pas se connecter à la base de données
- Erreurs d'authentification

**Solution**: 
- Chargement des variables depuis `.env` dans le script de déploiement
- Configuration explicite des variables importantes dans `ecosystem.config.cjs`

### 3. **PM2 non configuré pour démarrer au boot**
**Problème**: PM2 n'était pas configuré pour démarrer automatiquement au redémarrage du serveur.

**Impact**:
- Après un redémarrage du serveur, l'application ne redémarrait pas automatiquement
- Le site restait "down" jusqu'à intervention manuelle

**Solution**: Ajout de la configuration `pm2 startup` dans le script de déploiement.

### 4. **Pas de vérification de santé après déploiement**
**Problème**: Le script ne vérifiait pas si l'application fonctionnait réellement après le déploiement.

**Impact**:
- Les erreurs de démarrage n'étaient pas détectées immédiatement
- Difficile de savoir si le déploiement a réussi

**Solution**: Ajout d'une vérification avec curl pour s'assurer que l'application répond sur le port configuré.

### 5. **Logs non configurés**
**Problème**: Les logs PM2 n'étaient pas configurés avec des chemins spécifiques.

**Impact**:
- Difficile de déboguer les problèmes
- Logs dispersés

**Solution**: Configuration des chemins de logs dans `ecosystem.config.cjs`.

## ✅ Corrections Appliquées

### Fichier `ecosystem.config.cjs`
- ✅ Ajout du PORT avec valeur par défaut 3010
- ✅ Chargement des variables d'environnement depuis `.env`
- ✅ Configuration explicite des variables importantes (DATABASE_URL, NEXTAUTH_URL, etc.)
- ✅ Configuration des logs PM2
- ✅ Augmentation de `min_uptime` à 10s pour éviter les redémarrages trop rapides

### Fichier `deploy/deploy.sh`
- ✅ Chargement des variables d'environnement depuis `.env` avant le démarrage PM2
- ✅ Configuration automatique de PM2 startup
- ✅ Vérification de santé après le déploiement (curl sur localhost:PORT)
- ✅ Création automatique du dossier logs
- ✅ Affichage du statut PM2 à la fin du déploiement

## 🚀 Comment Utiliser les Corrections

1. **Transférer les fichiers modifiés sur le serveur**:
```bash
scp ecosystem.config.cjs deploy/deploy.sh ubuntu@51.83.134.141:~/bbyatchv2-master/
```

2. **Relancer le déploiement**:
```bash
ssh ubuntu@51.83.134.141
cd ~/bbyatchv2-master
bash deploy/deploy.sh
```

3. **Vérifier que tout fonctionne**:
```bash
pm2 status
pm2 logs bbyatchv2-preprod --lines 50
curl http://localhost:3010
```

## 🔍 Vérifications Post-Déploiement

Après le déploiement, vérifiez:

1. **PM2 Status**:
```bash
pm2 status
```
L'application doit être en statut "online" avec un uptime > 0.

2. **Logs**:
```bash
pm2 logs bbyatchv2-preprod --lines 50
```
Vérifiez qu'il n'y a pas d'erreurs de connexion à la base de données ou autres erreurs.

3. **Port**:
```bash
sudo lsof -i :3010
```
Le processus Node.js doit écouter sur le port 3010.

4. **Nginx**:
```bash
sudo nginx -t
sudo systemctl status nginx
```

5. **Base de données**:
```bash
docker ps | grep bbyatchv2-preprod-db
docker logs bbyatchv2-preprod-db --tail 20
```

## 🛠️ En Cas de Problème

Si l'application ne démarre toujours pas:

1. **Vérifier les logs PM2**:
```bash
pm2 logs bbyatchv2-preprod --err --lines 100
```

2. **Vérifier le fichier .env**:
```bash
cat .env
```
Assurez-vous que toutes les variables sont définies correctement.

3. **Vérifier que PostgreSQL tourne**:
```bash
docker ps
docker logs bbyatchv2-preprod-db
```

4. **Redémarrer manuellement**:
```bash
pm2 restart bbyatchv2-preprod
pm2 logs bbyatchv2-preprod --lines 50
```

5. **Vérifier les permissions**:
```bash
ls -la logs/
chmod 755 logs/
```

## 📝 Notes Importantes

- Le PORT est maintenant défini à 3010 par défaut dans `ecosystem.config.cjs`
- Les variables d'environnement sont chargées depuis `.env` au démarrage
- PM2 redémarrera automatiquement l'application au boot du serveur
- Les logs sont maintenant dans `./logs/pm2-error.log` et `./logs/pm2-out.log`

## 🔄 Pour les Prochains Déploiements

Le script de déploiement est maintenant plus robuste et devrait éviter les problèmes de "site down". Les principales améliorations:

1. ✅ Configuration persistante du PORT
2. ✅ Variables d'environnement chargées correctement
3. ✅ Redémarrage automatique au boot
4. ✅ Vérification de santé après déploiement
5. ✅ Logs mieux organisés

