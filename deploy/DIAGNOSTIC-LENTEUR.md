# 🔍 Diagnostic de lenteur - Commandes rapides

## 1. Vérifier les logs PM2 (erreurs récentes)
```bash
pm2 logs bbyatchv2-preprod --lines 50 --nostream
```

## 2. Vérifier l'utilisation mémoire réelle
```bash
ps aux | grep -E "node|next" | grep -v grep
free -h
```

## 3. Vérifier les requêtes DB lentes (si PostgreSQL)
```bash
# Se connecter à la DB et voir les requêtes actives
# (remplace les infos par tes vraies credentials)
psql $DATABASE_URL -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%' ORDER BY duration DESC;"
```

## 4. Vérifier les logs Nginx (timeouts)
```bash
sudo tail -50 /var/log/nginx/error.log
```

## 5. Tester la réponse locale directement
```bash
time curl -I http://localhost:3003 2>&1
```

## 6. Vérifier les processus qui consomment
```bash
top -b -n 1 | head -20
```

## 7. Vérifier le build Next.js (peut être corrompu)
```bash
ls -lah .next/server 2>/dev/null | head -10
```

## 8. Redémarrer proprement avec plus de mémoire
```bash
pm2 stop bbyatchv2-preprod
pkill -9 -f "next-server" || true
export NODE_OPTIONS="--max-old-space-size=2048"
pm2 restart bbyatchv2-preprod
sleep 5
pm2 list
```

## 9. Vérifier la connexion à Supabase/DB
```bash
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.\$connect().then(() => { console.log('✅ DB OK'); process.exit(0); }).catch(e => { console.error('❌ DB:', e.message); process.exit(1); });"
```

## 10. Vérifier les variables d'environnement critiques
```bash
grep -E "DATABASE_URL|NEXTAUTH|NODE_ENV" .env | head -5
```
