# 🔍 Guide de Monitoring des Processus

## Réponse à votre question : Quand un processus est-il dangereux ?

Il n'y a **pas de pourcentage fixe**, mais voici les règles utilisées par le script :

### 🎯 Seuils de suspicion

#### CPU (Processeur)
- **> 80% pendant > 5 minutes** = Suspect
- **> 90% pendant > 2 minutes** = Très suspect → **TUER**
- **> 95% pendant > 1 minute** = Critique → **TUER IMMÉDIATEMENT**

#### Mémoire (RAM)
- **> 50% de la RAM totale** = Suspect
- **> 500 MB** pour un processus non-légitime = Suspect
- **> 1 GB** = Très suspect → **TUER**

#### Critères combinés (Score de suspicion)
Le script utilise un système de score (0-100) :

| Critère | Points |
|---------|--------|
| CPU > 80% | +30 |
| CPU > 90% | +50 |
| Mémoire > 50% | +20 |
| Mémoire > 500MB | +15 |
| Chemin suspect (/tmp, /dev) | +40 |
| Nom suspect (aléatoire) | +35 |
| **/tmp avec nom aléatoire** | **+50** |

**Score ≥ 50** = Suspect (surveillé)  
**Score ≥ 80** = Très suspect (tué immédiatement)

### ✅ Processus légitimes (WHITELIST)

Ces processus ne seront **JAMAIS** tués :
- `systemd`, `kernel`, processus système
- `PM2`, `pm2`, `node`, `next-server` (votre application)
- `nginx`, `sshd`, `fail2ban`, `firewalld`
- Services AWS (`ssm-agent`, `amazon-ssm-agent`)

### 🔴 Processus suspects (TUÉS automatiquement)

1. **Processus dans /tmp avec nom aléatoire** (comme `cUpXNEP1`)
   - Tué immédiatement, peu importe le CPU/mémoire

2. **CPU > 90% pendant > 2 minutes**
   - Indique un cryptominer ou script malveillant

3. **Score de suspicion ≥ 80**
   - Combinaison de plusieurs critères suspects

## 📊 Exemple : Le malware détecté

```
PID: 10505
CPU: 97.2%  ← TRÈS SUSPECT (> 90%)
Mémoire: 4.0% (158700 MB) ← ÉNORME
Chemin: /tmp/cUpXNEP1 ← SUSPECT (/tmp + nom aléatoire)
Score: 50 + 50 + 20 = 120/100 → TUÉ IMMÉDIATEMENT
```

## 🚀 Utilisation

### Installation automatique
```bash
bash deploy/install-monitor.sh
```

### Test manuel
```bash
bash deploy/monitor-processus.sh
```

### Mode daemon (surveillance continue)
```bash
bash deploy/monitor-processus.sh --daemon &
```

### Voir les logs
```bash
tail -f logs/monitor-processus.log
```

## ⚙️ Configuration

Modifiez les seuils dans `deploy/monitor-processus.sh` :

```bash
CPU_THRESHOLD=80          # % CPU suspect
CPU_DURATION=300          # Durée en secondes (5 min)
MEMORY_THRESHOLD=50       # % Mémoire suspecte
MEMORY_MB_THRESHOLD=500   # Mémoire absolue en MB
```

## 🛡️ Protection supplémentaire

Le script protège contre :
- ✅ Cryptomineurs (CPU élevé)
- ✅ Scripts malveillants dans /tmp
- ✅ Processus avec noms aléatoires
- ✅ Fuites mémoire
- ✅ Processus suspects qui consomment trop de ressources

## ⚠️ Important

Le script est **intelligent** et ne tuera **JAMAIS** :
- Votre application Next.js/PM2
- Les processus système essentiels
- Les services légitimes

Il ne tuera que les processus **vraiment suspects** basés sur plusieurs critères combinés.

