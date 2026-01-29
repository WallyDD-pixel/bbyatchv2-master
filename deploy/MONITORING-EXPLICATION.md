# 🔄 Système de Monitoring et Auto-Recovery

## 📋 Vue d'ensemble

Ce système surveille en continu l'état de votre site et le redémarre automatiquement en cas de panne, garantissant une disponibilité maximale.

## 🎯 Fonctionnalités

### 1. **Vérifications automatiques**
Le script vérifie toutes les 60 secondes :
- ✅ **État PM2** : L'application est-elle en cours d'exécution ?
- ✅ **Port** : Le port 3003 est-il utilisé (app écoute) ?
- ✅ **Réponse HTTP locale** : L'app répond-elle sur localhost:3003 ?
- ✅ **Réponse HTTP publique** : Le site est-il accessible via Nginx ?
- ✅ **Mémoire disponible** : Y a-t-il assez de RAM ?
- ✅ **Base de données** : La configuration DB est-elle présente ?
- ✅ **Processus Node** : Des processus Node sont-ils actifs ?

### 2. **Récupération automatique**
Si un problème est détecté, le script :
1. **Arrête proprement** l'application (PM2)
2. **Nettoie** les processus Node qui traînent
3. **Libère le port** si nécessaire
4. **Nettoie les caches** (.next/cache, node_modules/.cache)
5. **Vérifie la mémoire** et nettoie le swap si nécessaire
6. **Redémarre** l'application avec PM2
7. **Vérifie** que le redémarrage a réussi

### 3. **Protection contre les boucles**
- **Cooldown** : 5 minutes minimum entre deux redémarrages
- **Limite de tentatives** : Maximum 3 redémarrages automatiques
- **Alertes** : Si 3 tentatives échouent, le script alerte et s'arrête (nécessite intervention manuelle)

## 📁 Fichiers créés

### `deploy/monitor-and-recover.sh`
**Script principal de monitoring**
- Vérifie l'état toutes les 60 secondes
- Redémarre automatiquement en cas de panne
- Logs détaillés dans `monitor.log`
- Gestion des erreurs et cooldowns

### `deploy/install-monitor-service.sh`
**Script d'installation du service systemd**
- Installe le monitoring comme service Linux
- Démarre automatiquement au boot du serveur
- Tourne en arrière-plan en continu
- Logs dans `monitor-service.log`

### `deploy/MONITORING-EXPLICATION.md`
**Cette documentation**

## 🚀 Installation

### Option 1 : Service systemd (Recommandé)
```bash
cd ~/bbyatch/bbyatchv2-master
chmod +x deploy/install-monitor-service.sh
./deploy/install-monitor-service.sh
```

**Avantages** :
- ✅ Démarre automatiquement au boot
- ✅ Redémarre si le script crash
- ✅ Géré par systemd (logs, status, etc.)
- ✅ Tourne en arrière-plan

### Option 2 : Exécution manuelle
```bash
cd ~/bbyatch/bbyatchv2-master
chmod +x deploy/monitor-and-recover.sh
./deploy/monitor-and-recover.sh
```

**Avantages** :
- ✅ Simple à tester
- ✅ Logs visibles en temps réel

**Inconvénients** :
- ❌ S'arrête si le terminal se ferme
- ❌ Ne redémarre pas au boot

### Option 3 : PM2 (Alternative)
```bash
cd ~/bbyatch/bbyatchv2-master
pm2 start deploy/monitor-and-recover.sh --name monitor
pm2 save
pm2 startup
```

## 📊 Types de pannes couvertes

### 1. **Crash de l'application**
- **Détection** : PM2 status ≠ "online" ou port libre
- **Action** : Redémarrage automatique

### 2. **Timeout / Pas de réponse**
- **Détection** : HTTP 000, 500, ou timeout
- **Action** : Redémarrage automatique

### 3. **Problème de mémoire**
- **Détection** : RAM disponible < 100MB
- **Action** : Nettoyage du swap + redémarrage

### 4. **Processus Node bloqués**
- **Détection** : Port utilisé mais app ne répond pas
- **Action** : Kill des processus + redémarrage

### 5. **Problème de port**
- **Détection** : Port 3003 non utilisé
- **Action** : Libération du port + redémarrage

### 6. **Cache corrompu**
- **Détection** : App ne démarre pas correctement
- **Action** : Nettoyage des caches + redémarrage

## 📝 Logs

### Logs du script
```bash
tail -f monitor.log
```

### Logs du service (si installé comme service)
```bash
sudo journalctl -u bbyatch-monitor -f
```

### Logs PM2
```bash
pm2 logs bbyatch
```

## ⚙️ Configuration

Éditez `deploy/monitor-and-recover.sh` pour modifier :

```bash
CHECK_INTERVAL=60          # Vérification toutes les 60 secondes
MAX_RESTART_ATTEMPTS=3     # Max 3 tentatives de redémarrage
RESTART_COOLDOWN=300       # 5 minutes entre redémarrages
APP_PORT=3003              # Port de l'application
APP_URL="https://..."      # URL publique du site
```

## 🔍 Surveillance manuelle

### Vérifier l'état du monitoring
```bash
# Si installé comme service
sudo systemctl status bbyatch-monitor

# Vérifier les logs récents
tail -50 monitor.log
```

### Tester manuellement
```bash
# Lancer une vérification complète
./deploy/monitor-and-recover.sh
# (Ctrl+C pour arrêter)
```

## 🛠️ Dépannage

### Le monitoring ne démarre pas
```bash
# Vérifier les permissions
chmod +x deploy/monitor-and-recover.sh

# Vérifier que PM2 est installé
which pm2

# Vérifier les logs d'erreur
cat monitor-service-error.log
```

### Le monitoring redémarre trop souvent
```bash
# Augmenter le cooldown dans monitor-and-recover.sh
RESTART_COOLDOWN=600  # 10 minutes au lieu de 5
```

### Le site reste down malgré les redémarrages
```bash
# Vérifier les logs PM2 pour l'erreur exacte
pm2 logs bbyatch --lines 100

# Vérifier les variables d'environnement
cat .env | grep -E "DATABASE_URL|NEXTAUTH"

# Vérifier la mémoire
free -h
```

## 📈 Statistiques

Le script enregistre dans `monitor.log` :
- ✅ Chaque vérification (succès/échec)
- ✅ Chaque redémarrage automatique
- ✅ Les problèmes détectés
- ✅ Les récupérations réussies

## 🔐 Sécurité

- Le script tourne avec les permissions de l'utilisateur (pas root)
- Les logs sont limités en taille (rotation automatique)
- Limite de redémarrages pour éviter les boucles infinies
- Cooldown entre redémarrages pour éviter le spam

## 🎯 Résultat attendu

Avec ce système en place :
- ✅ **Disponibilité maximale** : Le site se remet en ligne automatiquement
- ✅ **Intervention minimale** : Pas besoin de surveiller manuellement
- ✅ **Logs détaillés** : Traçabilité de tous les incidents
- ✅ **Récupération rapide** : Redémarrage en moins de 30 secondes

## 📞 Support

Si le monitoring détecte un problème mais ne peut pas le résoudre automatiquement :
1. Vérifier les logs : `tail -100 monitor.log`
2. Vérifier l'état PM2 : `pm2 list`
3. Vérifier les ressources : `free -h && df -h`
4. Intervention manuelle si nécessaire
