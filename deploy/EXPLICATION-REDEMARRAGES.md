# 🔄 Pourquoi l'application redémarre en boucle (700 fois) ?

## Causes identifiées

### 1. **Incohérence de port** ⚠️ CRITIQUE
- **package.json** : `next start -p 3003`
- **ecosystem.config.cjs** : `PORT: 3010`
- **Nginx** : pointe vers `3010`
- **Résultat** : L'app démarre sur 3003, mais Nginx cherche sur 3010 → Timeout → Crash

### 2. **Boucle infinie dans getServerSession()** ⚠️ CRITIQUE
```typescript
// src/lib/auth.ts ligne 73
const response = await fetch(sessionUrl, {
  // ...
});
```
**Problème** : Si l'app n'est pas encore démarrée, le fetch vers `/api/auth/session` échoue → Timeout → Crash → Redémarrage → Boucle infinie

### 3. **Limite PM2 dépassée**
- `max_restarts: 10` dans ecosystem.config.cjs
- Mais 700 redémarrages = PM2 a dépassé la limite et continue quand même
- Cela signifie que l'app crash **immédiatement** après le démarrage

### 4. **Mémoire insuffisante**
- L'app utilise seulement **4.5mb** de RAM
- C'est suspect : une app Next.js devrait utiliser au moins 50-100mb
- **Conclusion** : L'app crash avant même de démarrer complètement

### 5. **Erreurs non gérées**
- Si une erreur survient au démarrage (connexion DB, variables d'env manquantes, etc.)
- L'app crash immédiatement
- PM2 redémarre → Crash → Redémarrage → Boucle

## Solutions

### Solution 1 : Corriger le port
```bash
# Option A : Changer package.json pour utiliser 3010
# Option B : Changer ecosystem.config.cjs et Nginx pour utiliser 3003
```

### Solution 2 : Corriger getServerSession()
- Ne pas faire de fetch interne si l'app n'est pas prête
- Utiliser directement les cookies sans fetch

### Solution 3 : Augmenter la mémoire
- `NODE_OPTIONS="--max-old-space-size=2048"`

### Solution 4 : Vérifier les logs
- `pm2 logs bbyatch --lines 100` pour voir l'erreur exacte

## Ordre de correction recommandé

1. ✅ Vérifier les logs PM2 pour l'erreur exacte
2. ✅ Corriger l'incohérence de port
3. ✅ Corriger getServerSession() pour éviter les boucles
4. ✅ Augmenter la mémoire disponible
5. ✅ Redémarrer proprement
