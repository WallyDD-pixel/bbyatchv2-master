# Solution Définitive pour le Problème de Mémoire (esbuild SIGKILL)

## 🔴 Problème

L'erreur `SIGKILL` lors de l'installation d'`esbuild` indique que le processus est tué par le système par manque de mémoire (OOM Killer). Votre serveur n'a probablement pas assez de RAM pour compiler esbuild.

## ✅ Solution Recommandée: Créer un Swap File

### Option 1: Script Automatique (Recommandé)

```bash
cd ~/bbyatchv2-master
bash deploy/create-swap.sh 2
```

Ce script crée un swap de 2GB automatiquement.

### Option 2: Manuel

```bash
# Créer un swap de 2GB
sudo fallocate -l 2G /swapfile
# Si fallocate n'existe pas:
# sudo dd if=/dev/zero of=/swapfile bs=1M count=2048

# Configurer les permissions
sudo chmod 600 /swapfile

# Formater en swap
sudo mkswap /swapfile

# Activer le swap
sudo swapon /swapfile

# Rendre permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Vérifier
free -h
```

## 🚀 Après avoir créé le swap

Relancez l'installation:

```bash
cd ~/bbyatchv2-master

# Option 1: Utiliser le script de correction
bash deploy/fix-npm-install.sh

# Option 2: Installation manuelle
npm cache clean --force
rm -rf node_modules package-lock.json
export NODE_OPTIONS="--max-old-space-size=1024"
npm install --legacy-peer-deps --no-audit
```

## 🔍 Vérification

Après avoir créé le swap, vérifiez:

```bash
# Vérifier que le swap est actif
free -h
# Vous devriez voir une ligne "Swap:" avec de la mémoire disponible

# Vérifier que le swap est monté
swapon --show

# Vérifier que c'est dans fstab (pour le démarrage automatique)
grep swapfile /etc/fstab
```

## 💡 Pourquoi esbuild nécessite beaucoup de mémoire?

`esbuild` est un bundler très rapide écrit en Go. Lors de l'installation via npm, il doit compiler son binaire natif pour votre architecture, ce qui nécessite:
- Compilation Go → nécessite ~500MB-1GB de RAM
- Compilation des dépendances natives
- Cache de compilation

Avec un swap, même si vous avez peu de RAM, le système peut utiliser le disque comme mémoire virtuelle.

## 📊 Taille de Swap Recommandée

- **< 1GB RAM**: Swap de 2-4GB
- **1-2GB RAM**: Swap de 2GB
- **> 2GB RAM**: Swap de 1-2GB (ou pas de swap nécessaire)

## ⚠️ Performance avec Swap

Note importante: Le swap est plus lent que la RAM. L'installation sera plus lente avec swap, mais elle devrait fonctionner. Une fois l'installation terminée, votre application fonctionnera normalement en RAM.

## 🔄 Alternative: Installer esbuild séparément

Si le swap ne résout pas le problème, essayez:

```bash
bash deploy/install-esbuild-separately.sh
```

Ce script installe esbuild en premier, puis les autres dépendances.

## 🛠️ Dépannage

### Le swap ne se monte pas au démarrage

```bash
# Vérifier fstab
cat /etc/fstab | grep swapfile

# Si absent, ajouter:
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Monter manuellement pour tester
sudo swapon /swapfile
```

### Vérifier l'utilisation du swap

```bash
# Voir l'utilisation en temps réel
watch -n 1 free -h

# Voir les processus utilisant le swap
sudo swapon --show
```

### Désactiver le swap (si nécessaire)

```bash
sudo swapoff /swapfile
sudo rm /swapfile
# Retirer la ligne de /etc/fstab si vous l'avez ajoutée
```

## 📝 Checklist

- [ ] Créer un swap file (2GB recommandé)
- [ ] Vérifier que le swap est actif (`free -h`)
- [ ] Nettoyer le cache npm (`npm cache clean --force`)
- [ ] Supprimer node_modules et package-lock.json
- [ ] Réinstaller avec `npm install --legacy-peer-deps --no-audit`
- [ ] Vérifier que l'installation a réussi
- [ ] Relancer le déploiement (`bash deploy/deploy.sh`)

## 🎯 Commandes Rapides

```bash
# Tout en une fois
cd ~/bbyatchv2-master
bash deploy/create-swap.sh 2 && \
npm cache clean --force && \
rm -rf node_modules package-lock.json && \
export NODE_OPTIONS="--max-old-space-size=1024" && \
npm install --legacy-peer-deps --no-audit && \
bash deploy/deploy.sh
```

