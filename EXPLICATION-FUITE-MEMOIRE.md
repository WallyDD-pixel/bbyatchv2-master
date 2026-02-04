# 🔍 Explication : Pourquoi la Mémoire Augmente avec le Temps

## 📊 Observation

Votre processus Next.js consomme **990.7 MB** après **9 heures** d'activité, alors qu'il devrait rester stable autour de 300-500 MB.

## 🔴 Causes Possibles

### 1. **Fuite de Mémoire (Memory Leak)**
Les applications Node.js peuvent avoir des fuites de mémoire si :
- Des objets ne sont pas libérés correctement
- Des listeners d'événements ne sont pas supprimés
- Des timers/intervals ne sont pas nettoyés
- Des connexions ne sont pas fermées

### 2. **Cache qui Grandit**
Next.js et les applications web mettent en cache :
- Les résultats de requêtes DB
- Les pages rendues
- Les composants React
- Les images optimisées

Si le cache n'est pas limité, il peut grandir indéfiniment.

### 3. **Connexions DB Non Fermées**
Si les connexions Prisma/PostgreSQL ne sont pas correctement fermées ou mises en pool, elles s'accumulent.

### 4. **Logs qui S'accumulent**
Si les logs ne sont pas limités, ils peuvent consommer de la mémoire.

### 5. **Garbage Collector (GC) Inefficace**
Node.js utilise un garbage collector qui peut ne pas nettoyer assez souvent si :
- La mémoire disponible est grande (limite à 1536 MB)
- Le GC n'est pas déclenché assez souvent

## ✅ Solutions

### Solution 1 : Réduire la Limite Mémoire (IMMÉDIAT)

Réduire la limite force le GC à nettoyer plus souvent :

```javascript
// ecosystem.config.cjs
NODE_OPTIONS: '--max-old-space-size=768', // Au lieu de 1536
```

**Avantages :**
- Force le GC à nettoyer plus souvent
- Empêche la mémoire de dépasser 768 MB
- Laisse plus de mémoire au système

### Solution 2 : Redémarrage Automatique (RECOMMANDÉ)

Configurer PM2 pour redémarrer automatiquement si la mémoire dépasse un seuil :

```javascript
// ecosystem.config.cjs
max_memory_restart: '800M', // Redémarrer si > 800 MB
```

**Note :** PM2 peut avoir des problèmes avec cette option, donc on peut utiliser un script externe.

### Solution 3 : Redémarrage Périodique (SIMPLE)

Redémarrer l'application toutes les 6-12 heures pour "réinitialiser" la mémoire :

```bash
# Créer un cron job
crontab -e
# Ajouter :
0 */6 * * * /usr/bin/pm2 restart bbyatch
```

### Solution 4 : Optimiser le Code (LONG TERME)

- Vérifier les connexions DB
- Limiter les caches
- Nettoyer les listeners d'événements
- Utiliser `--expose-gc` pour forcer le GC manuellement

## 🎯 Recommandation Immédiate

1. **Réduire la limite à 768 MB** (force le GC)
2. **Configurer un redémarrage automatique** si > 800 MB
3. **Surveiller** avec `pm2 monit`

## 📈 Surveillance

Pour surveiller la mémoire en temps réel :

```bash
pm2 monit
# ou
watch -n 5 'pm2 list'
```
