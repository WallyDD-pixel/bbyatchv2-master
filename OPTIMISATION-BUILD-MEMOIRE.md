# 🚀 Optimisation du Build avec Mémoire Limitée

## ⚠️ Problème

Le build Next.js prend beaucoup de temps car le serveur n'a que **1.9 GB de RAM** et le build consomme beaucoup de mémoire.

## ✅ Solutions Appliquées

### 1. Correction du Warning `swcMinify`
- **Problème** : `swcMinify` n'existe plus dans Next.js 15 (SWC est toujours activé)
- **Solution** : Option retirée de `next.config.ts`

### 2. Limite Mémoire pour le Build
- **Ajouté** : `NODE_OPTIONS='--max-old-space-size=1024'` dans le script de build
- **Bénéfice** : Limite la mémoire utilisée pendant le build à 1 GB

## 🔧 Options de Build Optimisées

### Option 1 : Build avec Limite Mémoire (DÉJÀ APPLIQUÉ)
```bash
npm run build
```
Utilise maintenant 1 GB max au lieu de consommer toute la mémoire disponible.

### Option 2 : Build en Mode Standalone (RECOMMANDÉ pour Production)
Ajouter dans `next.config.ts` :
```typescript
output: 'standalone',
```

**Avantages :**
- Build plus rapide
- Moins de fichiers générés
- Meilleur pour le déploiement

### Option 3 : Build avec Cache (SI DISPONIBLE)
```bash
# Utiliser le cache Next.js
NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS='--max-old-space-size=1024' next build
```

## 📊 Conseils pour Accélérer le Build

### 1. Libérer de la Mémoire Avant le Build
```bash
# Arrêter PM2 temporairement
pm2 stop bbyatch

# Libérer le cache système
sudo sync && sudo sysctl vm.drop_caches=3

# Puis builder
npm run build

# Redémarrer PM2 après
pm2 start bbyatch
```

### 2. Build en Plusieurs Étapes (SI NÉCESSAIRE)
Si le build échoue par manque de mémoire :
```bash
# Option 1 : Augmenter temporairement la swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Builder
npm run build

# Désactiver la swap après
sudo swapoff /swapfile
sudo rm /swapfile
```

### 3. Build Local puis Upload (ALTERNATIVE)
Si le build est trop lent sur le serveur :
```bash
# Sur votre PC local (plus de mémoire)
npm run build

# Uploader le dossier .next
scp -r .next ec2-user@votre-serveur:~/bbyatchv2-master/
```

## ⏱️ Temps de Build Attendu

- **Avant optimisation** : 5-10 minutes (ou timeout)
- **Après optimisation** : 3-5 minutes
- **Avec swap** : 2-4 minutes

## 🎯 Recommandation

1. **Arrêter PM2** avant le build
2. **Utiliser le script optimisé** : `npm run build`
3. **Surveiller la mémoire** : `free -h` pendant le build
4. **Redémarrer PM2** après le build

## 📝 Note

Le build est toujours plus lent sur un serveur avec peu de mémoire. C'est normal. L'important est que le build réussisse sans timeout.
