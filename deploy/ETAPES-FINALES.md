# 🎯 Étapes Finales - Après Correction du .env

## ✅ Étape 1: Vérifier le .env sur le serveur

Sur votre serveur VPS :

```bash
ssh ubuntu@51.83.134.141
cd ~/bbyatchv2-master

# Vérifier que le .env est correct
cat .env | grep DATABASE_URL
```

Assurez-vous que la ligne ressemble à :
```
DATABASE_URL="postgresql://postgres:Escalop08%26%26@db.nbovypcv.supabase.co:5432/postgres?schema=public"
```

Si ce n'est pas correct, corrigez-le :
```bash
nano .env
# Modifiez la ligne DATABASE_URL
# Sauvegardez avec Ctrl+X, puis Y, puis Entrée
```

## ✅ Étape 2: Vérifier schema.prisma

Assurez-vous que `prisma/schema.prisma` utilise PostgreSQL :

```bash
grep "provider" prisma/schema.prisma
```

Si ça affiche `provider = "sqlite"`, changez-le :

```bash
nano prisma/schema.prisma
# Trouvez la ligne : provider = "sqlite"
# Changez-la en : provider = "postgresql"
# Sauvegardez
```

## ✅ Étape 3: Tester la connexion à Supabase

Avant de déployer, testez que la connexion fonctionne :

```bash
# Générer le client Prisma
npx prisma generate

# Tester la connexion
npx prisma db pull
```

Si ça fonctionne sans erreur, c'est bon ! ✅

## ✅ Étape 4: Lancer le déploiement

```bash
bash deploy/deploy-supabase.sh
```

Le script va :
1. ✅ Installer les dépendances npm
2. ✅ Générer le client Prisma
3. ✅ Appliquer les migrations sur Supabase
4. ✅ Builder l'application Next.js
5. ✅ Configurer Nginx
6. ✅ Démarrer l'application avec PM2

## ✅ Étape 5: Vérifier que tout fonctionne

```bash
# Vérifier le statut PM2
pm2 status

# Voir les logs (les 50 dernières lignes)
pm2 logs bbyatchv2-preprod --lines 50

# Tester que l'application répond
curl http://localhost:3010

# Vérifier depuis l'extérieur (si le domaine est configuré)
curl https://preprod.bbservicescharter.com
```

## 🔍 En Cas de Problème

### Erreur de connexion à Supabase

```bash
# Vérifier le .env
cat .env | grep DATABASE_URL

# Tester la connexion manuellement
npx prisma db pull

# Voir les erreurs détaillées
npx prisma migrate deploy --verbose
```

### L'application ne démarre pas

```bash
# Voir les logs d'erreur
pm2 logs bbyatchv2-preprod --err --lines 100

# Redémarrer
pm2 restart bbyatchv2-preprod

# Vérifier les variables d'environnement
pm2 env bbyatchv2-preprod
```

### Erreur "schema does not exist"

1. Allez sur Supabase > SQL Editor
2. Exécutez : 
   ```sql
   CREATE SCHEMA IF NOT EXISTS public;
   ```
3. Relancez : `npx prisma migrate deploy`

## 📝 Commandes Utiles Après Déploiement

```bash
# Voir les logs en temps réel
pm2 logs bbyatchv2-preprod

# Redémarrer l'application
pm2 restart bbyatchv2-preprod

# Voir le statut
pm2 status

# Monitoring en temps réel
pm2 monit

# Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx

# Voir les logs Nginx
sudo tail -f /var/log/nginx/error.log
```

## 🎉 Résumé des Étapes

1. ✅ Corriger le `.env` avec la bonne DATABASE_URL Supabase
2. ✅ Vérifier que `schema.prisma` utilise `postgresql`
3. ✅ Tester la connexion : `npx prisma db pull`
4. ✅ Lancer le déploiement : `bash deploy/deploy-supabase.sh`
5. ✅ Vérifier : `pm2 logs bbyatchv2-preprod`

Une fois ces étapes terminées, votre application devrait être en ligne ! 🚀




