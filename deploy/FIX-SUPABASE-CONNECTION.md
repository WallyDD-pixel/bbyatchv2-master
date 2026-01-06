# 🔧 Résoudre les Problèmes de Connexion à Supabase

## ❌ Erreur : Can't reach database server

Cette erreur signifie que votre machine Windows ne peut pas se connecter à Supabase.

## ✅ Solutions

### Solution 1: Vérifier que votre projet Supabase est actif

1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Vérifiez que le projet n'est pas **pausé** (les projets gratuits peuvent être mis en pause après inactivité)
4. Si c'est pausé, cliquez sur **Resume** pour le réactiver
5. Attendez quelques secondes que le projet redémarre

### Solution 2: Utiliser le Pooler de Connexion (Recommandé)

Supabase recommande d'utiliser le **Connection Pooler** pour les connexions externes.

1. Allez sur Supabase > Settings > Database
2. Trouvez **Connection Pooling**
3. Copiez la **Connection string** du pooler (port **6543** au lieu de 5432)
4. Format : `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

Mettez à jour votre `.env` avec cette URL.

### Solution 3: Vérifier les paramètres de sécurité réseau

1. Allez sur Supabase > Settings > Database
2. Vérifiez **Network Restrictions**
3. Assurez-vous que les connexions externes sont autorisées
4. Si nécessaire, ajoutez votre IP ou désactivez temporairement les restrictions

### Solution 4: Utiliser l'URL directe avec le bon format

Votre URL devrait ressembler à :

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public
```

OU avec le pooler :

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?schema=public
```

### Solution 5: Appliquer les migrations depuis le serveur VPS

Si vous ne pouvez toujours pas vous connecter depuis Windows, appliquez les migrations depuis le serveur VPS qui a déjà accès à Supabase :

```bash
ssh ubuntu@51.83.134.141
cd ~/bbyatchv2-master

# Créer un swap pour éviter les problèmes de mémoire
bash deploy/create-swap.sh 2

# Appliquer les migrations
npx prisma migrate deploy
```

## 🔍 Vérification

Pour tester la connexion :

```powershell
# Tester la connexion
npx prisma db pull
```

Si ça fonctionne, vous verrez les tables de votre base.

## 📝 Format Correct de DATABASE_URL

### Format Direct (port 5432)
```
DATABASE_URL="postgresql://postgres:Escalop08%26%26@db.nbovypcv.supabase.co:5432/postgres?schema=public"
```

### Format Pooler (port 6543) - Recommandé
```
DATABASE_URL="postgresql://postgres.nbovypcv:Escalop08%26%26@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?schema=public"
```

**Note** : Remplacez `eu-central-1` par votre région Supabase (trouvable dans Settings > Database).

## 🚀 Alternative : Migrations depuis Supabase Dashboard

Si vous ne pouvez pas vous connecter, vous pouvez exécuter les migrations SQL directement :

1. Allez sur Supabase > SQL Editor
2. Copiez le contenu de chaque fichier dans `prisma/migrations/[NOM]/migration.sql`
3. Exécutez-les dans l'ordre








