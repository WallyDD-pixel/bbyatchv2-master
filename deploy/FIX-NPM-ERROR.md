# Solution pour l'Erreur npm install (SIGKILL)

## 🔴 Problème

L'erreur `SIGKILL` lors de l'installation de `esbuild` indique généralement que le processus a été tué par le système, souvent à cause d'un manque de mémoire (OOM Killer).

## ✅ Solution Rapide

Sur votre serveur, exécutez ce script de correction :

```bash
cd ~/bbyatchv2-master
bash deploy/fix-npm-install.sh
```

Ce script va :
1. ✅ Arrêter l'application PM2
2. ✅ Vérifier et libérer la mémoire
3. ✅ Nettoyer le cache npm
4. ✅ Supprimer node_modules et package-lock.json
5. ✅ Réinstaller les dépendances avec des options optimisées
6. ✅ Vérifier l'installation

## 🔧 Solution Manuelle (si le script ne fonctionne pas)

### Étape 1: Arrêter l'application
```bash
pm2 stop bbyatchv2-preprod
pm2 delete bbyatchv2-preprod
```

### Étape 2: Vérifier la mémoire
```bash
free -h
```

Si la mémoire disponible est < 512MB, libérez-la :
```bash
sync
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'
```

### Étape 3: Nettoyer npm
```bash
cd ~/bbyatchv2-master
npm cache clean --force
```

### Étape 4: Supprimer node_modules
```bash
rm -rf node_modules
rm -f package-lock.json
```

### Étape 5: Réinstaller avec options mémoire
```bash
export NODE_OPTIONS="--max-old-space-size=1024"
npm install --legacy-peer-deps --no-audit
```

### Étape 6: Relancer le déploiement
```bash
bash deploy/deploy.sh
```

## 🚀 Solution Alternative: Augmenter la Swap

Si le problème persiste à cause d'un manque de mémoire, vous pouvez créer un fichier swap :

```bash
# Créer un fichier swap de 2GB
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Rendre le swap permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Vérifier
free -h
```

Puis relancez l'installation :
```bash
cd ~/bbyatchv2-master
bash deploy/fix-npm-install.sh
```

## 📊 Vérification

Après l'installation, vérifiez que tout est OK :

```bash
# Vérifier que node_modules existe
ls -la node_modules | head

# Vérifier que les binaires sont présents
ls node_modules/.bin/ | grep -E "(next|prisma|esbuild)"

# Vérifier la mémoire
free -h
```

## 🔍 Diagnostic

Si le problème persiste, vérifiez :

1. **Logs npm** :
```bash
cat ~/.npm/_logs/$(ls -t ~/.npm/_logs/ | head -1)
```

2. **Espace disque** :
```bash
df -h
```

3. **Processus utilisant beaucoup de mémoire** :
```bash
ps aux --sort=-%mem | head -10
```

4. **Logs système (OOM Killer)** :
```bash
dmesg | grep -i "killed process"
# ou
journalctl -k | grep -i "out of memory"
```

## 💡 Prévention

Pour éviter ce problème à l'avenir :

1. **Surveiller la mémoire** :
```bash
watch -n 1 free -h
```

2. **Installer avec moins de parallélisme** :
```bash
npm install --legacy-peer-deps --maxsockets=1
```

3. **Utiliser npm ci au lieu de npm install** (une fois package-lock.json généré) :
```bash
npm ci --legacy-peer-deps
```

## 📝 Notes

- Le script `fix-npm-install.sh` utilise `npm install` au lieu de `npm ci` car il est plus tolérant aux problèmes
- L'option `--legacy-peer-deps` évite les conflits de dépendances
- `NODE_OPTIONS="--max-old-space-size=1024"` limite l'utilisation mémoire de Node.js à 1GB

