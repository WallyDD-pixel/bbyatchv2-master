# Démarrer l'application après installation

## 1. Installer PM2

**Important** : Si `npm` est installé via `nvm`, utilisez `npm` sans `sudo` :

```bash
npm install -g pm2
```

Si vous obtenez une erreur de permissions, vous pouvez aussi utiliser :
```bash
# Vérifier que nvm est chargé
source ~/.bashrc
# Puis installer PM2
npm install -g pm2
```

## 2. Créer le fichier .env

```bash
cd ~/bbyatchv2-master
nano .env
```

Collez votre configuration. Exemple minimal :

```env
DATABASE_URL="postgresql://user:password@host:5432/database?schema=public&connection_limit=10&pool_timeout=20"
NEXTAUTH_URL="https://preprod.bbservicescharter.com"
NEXTAUTH_SECRET="votre-secret-tres-long-et-aleatoire"
STRIPE_TEST_SK="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
PORT=3003
```

**Important** : Remplacez les valeurs par vos vraies valeurs !

## 3. Créer le dossier logs

```bash
mkdir -p logs
```

## 4. Démarrer l'application avec PM2

```bash
pm2 start ecosystem.config.cjs
```

## 5. Sauvegarder la configuration PM2

```bash
pm2 save
```

## 6. Configurer PM2 pour démarrer au boot

```bash
pm2 startup
```

**Important** : Exécutez la commande affichée par PM2 (elle commence par `sudo env PATH=...`)

## 7. Vérifier que tout fonctionne

```bash
# Vérifier le statut PM2
pm2 status

# Voir les logs
pm2 logs bbyatch --lines 50

# Tester localement
curl http://localhost:3003

# Vérifier que Nginx fonctionne
sudo systemctl status nginx

# Tester depuis l'extérieur (remplacez par votre IP ou domaine)
curl http://preprod.bbservicescharter.com
```

## 8. Si tout est OK, configurer SSL (optionnel mais recommandé)

```bash
# Installer Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL
sudo certbot --nginx -d preprod.bbservicescharter.com --agree-tos -m votre-email@example.com --redirect
```

## Commandes utiles

```bash
# Redémarrer l'application
pm2 restart bbyatch

# Arrêter l'application
pm2 stop bbyatch

# Voir les logs en temps réel
pm2 logs bbyatch

# Voir les métriques
pm2 monit
```
