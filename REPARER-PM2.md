# 🔧 Réparation du Processus PM2 Corrompu

## ⚠️ Problème Détecté

Le processus `bbyatch` est dans un état corrompu :
- **6189 redémarrages** (↺ 6189) - crash en boucle
- **Mémoire à 0b** - processus mort
- **Statut vide** - état invalide
- **Uptime 0** - ne démarre pas

## ✅ Solution : Nettoyage Complet

### Étape 1 : Arrêter et Supprimer le Processus Corrompu

```bash
# Arrêter tous les processus PM2
pm2 stop all

# Supprimer le processus corrompu
pm2 delete bbyatch

# Vérifier qu'il n'y a plus rien
pm2 list
```

### Étape 2 : Nettoyer les Logs et le Cache PM2

```bash
# Nettoyer les logs
pm2 flush

# Vérifier les logs d'erreur pour comprendre le problème
cat logs/pm2-error.log | tail -50
```

### Étape 3 : Vérifier que le Build est à Jour

```bash
# Vérifier que le dossier .next existe
ls -la .next

# Si le build n'existe pas, le créer
npm run build
```

### Étape 4 : Redémarrer Proprement avec Ecosystem

```bash
# Redémarrer avec la configuration ecosystem.config.cjs
pm2 start ecosystem.config.cjs

# Vérifier le statut
pm2 list
pm2 logs bbyatch --lines 20
```

### Étape 5 : Sauvegarder la Configuration

```bash
# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# (Suivre les instructions affichées)
```

## 🔍 Diagnostic des Erreurs

Si le processus ne démarre toujours pas :

### Vérifier les Logs d'Erreur

```bash
# Logs PM2
pm2 logs bbyatch --err --lines 50

# Logs système
journalctl -u pm2-ec2-user --lines 50

# Vérifier les ports
netstat -tulpn | grep 3003
```

### Vérifier les Variables d'Environnement

```bash
# Vérifier que .env existe
ls -la .env

# Vérifier les variables critiques
cat .env | grep -E "(DATABASE_URL|NEXTAUTH|PORT)"
```

### Vérifier la Mémoire Disponible

```bash
# Vérifier la mémoire
free -h

# Si moins de 500MB disponibles, libérer de la mémoire
sudo sync && sudo sysctl vm.drop_caches=3
```

## 🚨 Si le Problème Persiste

### Option 1 : Redémarrer le Serveur

```bash
# Redémarrer complètement le serveur
sudo reboot
```

### Option 2 : Réinstaller PM2

```bash
# Désinstaller PM2
npm uninstall -g pm2

# Réinstaller PM2
npm install -g pm2

# Redémarrer
pm2 start ecosystem.config.cjs
```

### Option 3 : Démarrer Manuellement (Test)

```bash
# Tester le démarrage manuel
NODE_ENV=production NODE_OPTIONS='--max-old-space-size=768' node_modules/.bin/next start -p 3003

# Si ça fonctionne, le problème vient de PM2
# Si ça ne fonctionne pas, le problème vient de l'application
```

## 📝 Notes

- **6189 redémarrages** indique un crash en boucle, probablement dû à :
  - Manque de mémoire
  - Erreur dans le code
  - Port déjà utilisé
  - Variables d'environnement manquantes

- Après le nettoyage, surveiller les logs pendant 5 minutes pour s'assurer que le processus reste stable.
