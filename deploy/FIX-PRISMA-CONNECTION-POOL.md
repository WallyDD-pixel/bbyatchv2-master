# Fix Prisma Connection Pool Timeout

## Problème
```
Timed out fetching a new connection from the connection pool. 
(Current connection pool timeout: 10, connection limit: 1)
```

## Solution : Augmenter le pool de connexions

### 1. Vérifier la DATABASE_URL actuelle

```bash
cd /home/ec2-user/bbyatchv2-master
cat .env | grep DATABASE_URL
```

### 2. Modifier la DATABASE_URL pour augmenter le pool

La DATABASE_URL doit inclure des paramètres de pool :
- `connection_limit=10` : Nombre de connexions dans le pool
- `pool_timeout=20` : Timeout en secondes

Exemple :
```
DATABASE_URL="postgresql://user:pass@host:6543/db?schema=public&pgbouncer=true&connection_limit=10&pool_timeout=20"
```

### 3. Modifier le fichier .env

```bash
nano .env
```

Ajoutez `&connection_limit=10&pool_timeout=20` à la fin de votre DATABASE_URL.

### 4. Redémarrer PM2

```bash
sudo bash -c "cd /home/ec2-user/bbyatchv2-master && export PM2_HOME=/home/ec2-user/.pm2 && pm2 restart bbyatch"
```

### 5. Vérifier les logs

```bash
sudo bash -c "cd /home/ec2-user/bbyatchv2-master && export PM2_HOME=/home/ec2-user/.pm2 && pm2 logs bbyatch --lines 20"
```
