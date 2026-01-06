# 🌐 Guide de Configuration du Domaine preprod.bbservicescharter.com

Ce guide vous explique comment lier votre nouveau VPS au domaine `preprod.bbservicescharter.com`.

## 📋 Prérequis

- ✅ VPS démarré et accessible via SSH
- ✅ Accès à votre gestionnaire DNS (chez votre registrar ou hébergeur DNS)
- ✅ Nginx installé sur le VPS
- ✅ Ports 80 et 443 ouverts dans le firewall du VPS

## 🔧 Étapes de Configuration

### Étape 1 : Obtenir l'IP Publique du VPS

**Sur le serveur**, exécutez :

```bash
curl ifconfig.me
# ou
curl ipinfo.io/ip
```

Notez cette IP, vous en aurez besoin pour la configuration DNS.

### Étape 2 : Configurer les Enregistrements DNS

Dans votre **gestionnaire DNS** (chez votre registrar ou votre hébergeur DNS) :

1. **Connectez-vous** à votre panneau de gestion DNS
2. **Trouvez** les enregistrements pour `bbservicescharter.com`
3. **Créez ou modifiez** l'enregistrement suivant :

   **Enregistrement A :**
   - **Type** : `A`
   - **Nom** : `preprod` (ou `preprod.bbservicescharter.com` selon votre interface)
   - **Valeur/IP** : `[VOTRE_NOUVELLE_IP_PUBLIQUE]` (ex: `16.171.173.63`)
   - **TTL** : `3600` (ou valeur par défaut)

4. **Sauvegardez** les modifications

**Exemple visuel :**
```
Type | Nom          | Valeur        | TTL
-----|--------------|---------------|-----
A    | preprod      | 16.171.173.63 | 3600
```

### Étape 3 : Vérifier la Propagation DNS

**Sur votre machine locale**, vérifiez que le DNS pointe bien vers la nouvelle IP :

```bash
# Windows PowerShell
nslookup preprod.bbservicescharter.com

# Linux/Mac
dig preprod.bbservicescharter.com +short
```

La commande doit retourner votre nouvelle IP publique.

**⏱️ Note** : La propagation DNS peut prendre de quelques minutes à 48 heures, mais généralement c'est fait en 5-30 minutes.

### Étape 4 : Configurer Nginx et SSL sur le Serveur

**Sur le serveur**, une fois connecté via SSH :

```bash
cd ~/bbyatchv2-master

# Utiliser le script automatique (recommandé)
bash deploy/configurer-domaine.sh
```

Le script va :
- ✅ Mettre à jour la configuration Nginx avec la nouvelle IP
- ✅ Configurer le certificat SSL avec Let's Encrypt
- ✅ Recharger Nginx

**Ou manuellement** :

```bash
# 1. Mettre à jour la configuration Nginx
sudo nano /etc/nginx/sites-available/bbyatchv2-preprod

# Remplacer l'ancienne IP (51.83.134.141) par la nouvelle dans server_name
# server_name NOUVELLE_IP preprod.bbservicescharter.com;

# 2. Vérifier la configuration
sudo nginx -t

# 3. Recharger Nginx
sudo systemctl reload nginx

# 4. Configurer le certificat SSL
sudo certbot --nginx -d preprod.bbservicescharter.com --agree-tos --redirect
```

### Étape 5 : Vérifier le Fichier .env

**Sur le serveur**, assurez-vous que le fichier `.env` contient :

```env
NEXTAUTH_URL="https://preprod.bbservicescharter.com"
```

Si ce n'est pas le cas :

```bash
nano ~/bbyatchv2-master/.env
# Modifier NEXTAUTH_URL si nécessaire
```

Puis redémarrer l'application :

```bash
pm2 restart bbyatchv2-preprod --update-env
```

### Étape 6 : Vérifier que Tout Fonctionne

**Sur votre machine locale** :

```bash
# Vérifier que le domaine répond
curl -I https://preprod.bbservicescharter.com

# Ou ouvrir dans un navigateur
# https://preprod.bbservicescharter.com
```

**Sur le serveur** :

```bash
# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/error.log

# Vérifier le statut de l'application
pm2 status
pm2 logs bbyatchv2-preprod --lines 20
```

## 🔍 Dépannage

### Le DNS ne pointe pas vers la bonne IP

1. Vérifiez dans votre gestionnaire DNS que l'enregistrement A est correct
2. Attendez la propagation DNS (peut prendre jusqu'à 48h)
3. Vérifiez avec `nslookup` ou `dig` depuis différents endroits

### Erreur SSL "Certificate not found"

```bash
# Sur le serveur, renouveler le certificat
sudo certbot --nginx -d preprod.bbservicescharter.com --force-renewal
```

### Nginx ne démarre pas

```bash
# Vérifier les erreurs
sudo nginx -t

# Voir les logs
sudo tail -f /var/log/nginx/error.log
```

### L'application ne répond pas

```bash
# Vérifier que l'application tourne
pm2 status

# Voir les logs
pm2 logs bbyatchv2-preprod --lines 50

# Redémarrer si nécessaire
pm2 restart bbyatchv2-preprod
```

## 📝 Checklist Complète

- [ ] IP publique du VPS obtenue
- [ ] Enregistrement DNS A créé/modifié pour `preprod.bbservicescharter.com`
- [ ] Propagation DNS vérifiée (`nslookup` ou `dig`)
- [ ] Configuration Nginx mise à jour sur le serveur
- [ ] Certificat SSL configuré avec Let's Encrypt
- [ ] Nginx rechargé et fonctionnel
- [ ] Fichier `.env` contient `NEXTAUTH_URL="https://preprod.bbservicescharter.com"`
- [ ] Application redémarrée avec PM2
- [ ] Site accessible via `https://preprod.bbservicescharter.com`

## 🎯 Résumé des Commandes Principales

```bash
# Sur le serveur
cd ~/bbyatchv2-master
bash deploy/configurer-domaine.sh

# Vérifier DNS (local)
nslookup preprod.bbservicescharter.com

# Vérifier HTTPS (local)
curl -I https://preprod.bbservicescharter.com
```

Une fois tout configuré, votre site sera accessible sur `https://preprod.bbservicescharter.com` ! 🎉


