# Déploiement production & préproduction (Ubuntu 22.04+)

## Préproduction rapide (sans domaine final)
### Option 1: FQDN nip.io
1. Choisir: `IP_PUBLIC.nip.io` (ex: `203.0.113.10.nip.io`).
2. Copier `.env.preprod.example` en `.env` et remplacer:
  - `NEXTAUTH_URL=https://IP_PUBLIC.nip.io`
  - Ajuster `DATABASE_URL` si Postgres docker (voir `docker-compose.preprod.yml`).
3. Lancer Postgres: `docker compose -f docker-compose.preprod.yml up -d`.
4. Migrations: `npx prisma migrate deploy`.
5. Seed (optionnel): `npx ts-node prisma/seed.ts` (ou créer un seed léger séparé).
6. Build / Start: `npm ci && npm run build && pm2 start npm --name bbyatchv2-preprod -- run start`.
7. Nginx: utiliser `deploy/nginx-preprod.conf` (remplacer placeholder) puis `sudo ln -s ...`.
8. SSL: `sudo certbot --nginx -d IP_PUBLIC.nip.io --agree-tos -m email@domaine --redirect`.

### Option 2: IP seule (HTTP)
Même étapes sans Certbot, mais pas de HTTPS (limite pour NextAuth / cookies sécurisés).

### Données préprod
- Utiliser une base distincte (`bbyatch_preprod`).
- Nettoyer seed: retirer comptes et données sensibles avant import.
- Fichier robots.txt pour bloquer indexation: `User-agent: *` / `Disallow: /`.

---

## 1. Pré-requis système
- Node.js 20 LTS (via nvm ou NodeSource)
- Git
- Nginx (reverse proxy)
- Certbot (Let’s Encrypt)

## 2. Cloner / Mettre à jour
```bash
git pull origin master
```

## 3. Fichier .env (exemple Postgres)
Créer `.env` :
```
DATABASE_URL="postgresql://user:password@localhost:5432/bbyatch?schema=public"
NEXTAUTH_URL="https://votre-domaine"
NEXTAUTH_SECRET="long-random-secret"
STRIPE_TEST_SK="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
# Optionnel Windows seulement: NEXT_FORCE_SWCRUST_WASM=1
# Préprod: voir `.env.preprod.example`
```

## 4. Prisma (migrations)
```bash
npx prisma migrate deploy
npx prisma generate
```

## 5. Build & Start (ex: PM2)
```bash
npm ci
npm run build
pm2 start npm --name "bbyatchv2" -- run start
pm2 save
pm2 startup  # (optionnel pour redémarrage auto)
```

## 6. Nginx reverse proxy
`/etc/nginx/sites-available/bbyatchv2` :
```
server {
  server_name votre-domaine;
  listen 80;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```
Activer :
```bash
sudo ln -s /etc/nginx/sites-available/bbyatchv2 /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 7. SSL Let’s Encrypt
```bash
sudo certbot --nginx -d votre-domaine -m email@domaine --agree-tos --redirect
```

## 8. Webhook Stripe (si utilisé)
Ouvrir port 443, configurer endpoint `https://votre-domaine/api/payments/webhook` dans Dashboard Stripe.

## 9. Logs & Monitoring
```bash
pm2 logs bbyatchv2
pm2 monit
```

## 10. Mises à jour
```bash
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart bbyatchv2
```

## 11. Sécurité rapide
- Mettre à jour system : `sudo apt update && sudo apt upgrade -y`
- UFW : `sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable`
- Restreindre permissions `.env`

## 12. Migration SQLite -> Postgres (si besoin)
1. Export SQLite : `sqlite3 prisma/dev.db .dump > dump.sql`
2. Adapter le SQL (types) si nécessaire.
3. Importer dans Postgres : `psql -d bbyatch -f dump.sql`
4. Modifier `provider` dans `schema.prisma` si changement.
5. Mettre à jour `DATABASE_URL`, puis `npx prisma db pull` et `npx prisma migrate diff`. 

## 13. Rollback rapide
- Garder un build précédent (dossier `.next` archivé) ou utiliser `git tag`.
- Si échec après déploiement, rollback :
```bash
git checkout <tag-ou-commit>
npm ci
npm run build
pm2 restart bbyatchv2
```

---
Checklist Prod minimale : DB OK, migrations appliquées, domaine + SSL, process manager, sauvegarde `.env`.
