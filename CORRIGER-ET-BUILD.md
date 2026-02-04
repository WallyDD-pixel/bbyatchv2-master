# 🔧 Correction et Build - Guide Complet

## ⚠️ Problèmes Identifiés

1. **Le build n'existe pas** : Le dossier `.next` est manquant
2. **Warning `swcMinify`** : Le fichier `next.config.ts` sur le serveur n'est pas à jour

## ✅ Solution : Étapes à Suivre

### Étape 1 : Arrêter PM2 pour Libérer la Mémoire

```bash
# Arrêter et supprimer le processus corrompu
pm2 stop all
pm2 delete bbyatch
pm2 flush
```

### Étape 2 : Vérifier/Corriger `next.config.ts` sur le Serveur

```bash
# Vérifier si swcMinify existe encore
grep -n "swcMinify" next.config.ts

# Si la ligne existe, la supprimer manuellement ou :
# Éditer le fichier
nano next.config.ts

# Chercher la ligne avec "swcMinify" et la supprimer
# Elle devrait ressembler à :
#   swcMinify: true, // Utiliser SWC pour la minification
```

**OU** si vous avez synchronisé les fichiers depuis votre PC local, vérifiez que le fichier est bien à jour :

```bash
# Vérifier que swcMinify n'existe plus
grep "swcMinify" next.config.ts
# Ne devrait rien retourner
```

### Étape 3 : Vérifier la Mémoire Disponible

```bash
# Vérifier la mémoire
free -h

# Si moins de 500MB disponibles, libérer le cache
sudo sync && sudo sysctl vm.drop_caches=3
free -h
```

### Étape 4 : Faire le Build

```bash
# Builder avec la limite mémoire (1GB max)
npm run build

# OU si npm run build ne fonctionne pas :
NODE_OPTIONS='--max-old-space-size=1024' next build
```

**⏱️ Le build peut prendre 3-5 minutes avec peu de mémoire. C'est normal.**

### Étape 5 : Vérifier que le Build a Réussi

```bash
# Vérifier que le dossier .next existe
ls -la .next

# Vérifier qu'il contient BUILD_ID
ls -la .next/BUILD_ID
cat .next/BUILD_ID
```

### Étape 6 : Redémarrer PM2

```bash
# Redémarrer avec ecosystem.config.cjs
pm2 start ecosystem.config.cjs

# Vérifier le statut (devrait être "online")
pm2 list

# Voir les logs pour confirmer le démarrage
pm2 logs bbyatch --lines 20

# Sauvegarder
pm2 save
```

## 🚨 Si le Build Échoue

### Option 1 : Build avec Plus de Mémoire (Temporaire)

```bash
# Arrêter PM2
pm2 stop all

# Libérer le cache système
sudo sync && sudo sysctl vm.drop_caches=3

# Builder avec 1.5GB (au lieu de 1GB)
NODE_OPTIONS='--max-old-space-size=1536' next build
```

### Option 2 : Créer une Swap Temporaire

```bash
# Créer 2GB de swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Vérifier
free -h

# Builder
npm run build

# Désactiver la swap après (optionnel)
# sudo swapoff /swapfile
# sudo rm /swapfile
```

### Option 3 : Build Local puis Upload

Si le build est trop lent sur le serveur :

```bash
# Sur votre PC local
npm run build

# Uploader le dossier .next
scp -r .next ec2-user@votre-serveur-ip:~/bbyatchv2-master/
```

## 📋 Checklist de Vérification

- [ ] PM2 arrêté
- [ ] `next.config.ts` corrigé (pas de `swcMinify`)
- [ ] Mémoire disponible > 500MB
- [ ] Build réussi (dossier `.next` existe)
- [ ] PM2 redémarré et statut "online"
- [ ] Logs sans erreur

## 🎯 Commandes Rapides (Copier-Coller)

```bash
# 1. Arrêter PM2
pm2 stop all && pm2 delete bbyatch && pm2 flush

# 2. Vérifier next.config.ts
grep "swcMinify" next.config.ts || echo "✅ Pas de swcMinify"

# 3. Libérer la mémoire
sudo sync && sudo sysctl vm.drop_caches=3

# 4. Builder
npm run build

# 5. Vérifier le build
ls -la .next/BUILD_ID && echo "✅ Build réussi"

# 6. Redémarrer PM2
pm2 start ecosystem.config.cjs && pm2 list && pm2 save
```
