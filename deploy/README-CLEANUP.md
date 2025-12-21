# Guide de Nettoyage du Serveur

Ce guide explique comment nettoyer complètement votre serveur avant d'installer un nouveau site.

## 🧹 Scripts de Nettoyage

Deux scripts sont disponibles :

### 1. `cleanup-server.sh` (Version Interactive)
Demande confirmation avant de supprimer le dossier de l'application.

### 2. `cleanup-server-auto.sh` (Version Automatique)
Version non-interactive qui nettoie tout automatiquement.

## 📋 Ce qui sera supprimé/nettoyé

Les scripts vont :
- ✅ Arrêter et supprimer tous les processus PM2
- ✅ Arrêter et supprimer les containers Docker (base de données)
- ✅ Supprimer les volumes Docker (données de la base)
- ✅ Supprimer les configurations Nginx
- ✅ Arrêter les processus Node.js
- ✅ Libérer les ports 3000 et 3010
- ✅ (Optionnel) Supprimer le dossier de l'application

⚠️ **ATTENTION** : La suppression des volumes Docker supprimera définitivement toutes les données de la base de données !

## 🚀 Utilisation

### Option 1 : Script Interactif (Recommandé)

Sur votre serveur, dans le dossier du projet :

```bash
# Copier le script sur le serveur (si pas déjà présent)
# Puis rendre exécutable
chmod +x cleanup-server.sh

# Exécuter
bash cleanup-server.sh
```

Le script vous demandera confirmation avant de supprimer le dossier de l'application.

### Option 2 : Script Automatique

```bash
# Rendre exécutable
chmod +x cleanup-server-auto.sh

# Exécuter (sans supprimer le dossier de l'app)
bash cleanup-server-auto.sh

# OU exécuter en supprimant aussi le dossier de l'app
bash cleanup-server-auto.sh /home/ubuntu/bbyatchv2-master
```

## 📝 Étapes Manuelles (Alternative)

Si vous préférez faire le nettoyage manuellement :

### 1. Arrêter PM2
```bash
pm2 stop all
pm2 delete all
pm2 save --force
```

### 2. Arrêter Docker
```bash
docker stop bbyatchv2-preprod-db
docker rm bbyatchv2-preprod-db
docker volume rm preprod_pg_data
```

### 3. Nettoyer Nginx
```bash
sudo rm -f /etc/nginx/sites-enabled/bbyatchv2-preprod
sudo rm -f /etc/nginx/sites-available/bbyatchv2-preprod
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Arrêter les processus Node.js
```bash
pkill -f "node.*bbyatchv2"
pkill -f "npm.*start"
```

### 5. Libérer les ports
```bash
sudo lsof -ti:3010 | xargs sudo kill -9
sudo lsof -ti:3000 | xargs sudo kill -9
```

### 6. Supprimer le dossier de l'application (si souhaité)
```bash
rm -rf ~/bbyatchv2-master  # Remplacez par le chemin réel
```

## 🔒 Certificats SSL

Les certificats Let's Encrypt sont **conservés** par défaut. Si vous souhaitez les supprimer également, décommentez la section dans le script ou exécutez :

```bash
sudo certbot delete --cert-name preprod.bbservicescharter.com
```

## ✅ Après le Nettoyage

Une fois le nettoyage terminé, vous pouvez :

1. Cloner ou copier votre nouveau site
2. Installer les dépendances
3. Configurer Nginx
4. Lancer votre nouvelle application

## 🆘 En cas de Problème

Si quelque chose ne fonctionne pas, vérifiez :

```bash
# Vérifier les processus PM2
pm2 list

# Vérifier les containers Docker
docker ps -a

# Vérifier les configurations Nginx
ls -la /etc/nginx/sites-enabled/
ls -la /etc/nginx/sites-available/

# Vérifier les ports utilisés
sudo lsof -i :3010
sudo lsof -i :3000
```

