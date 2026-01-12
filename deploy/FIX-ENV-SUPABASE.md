# 🔧 Correction du fichier .env pour Supabase

## ❌ Problème Actuel

Votre DATABASE_URL semble incomplète :
```
DATABASE_URL="postgresql://postgres:Escalop08%26%26@db.nbovypcv>
```

Elle se termine par `>` et manque la fin de l'URL.

## ✅ Format Correct pour Supabase

Votre `.env` devrait ressembler à ça :

```env
# Base de données Supabase
DATABASE_URL="postgresql://postgres:Escalop08%26%26@db.nbovypcv.supabase.co:5432/postgres?schema=public"

# NextAuth
NEXTAUTH_URL="https://preprod.bbservicescharter.com"
NEXTAUTH_SECRET="F99k7GgBX8kCgZIbVw7x5lAZjVxg2gaR+AEC3+ain4E="

# Port de l'application
PORT=3010

# Stripe (si utilisé)
STRIPE_TEST_SK=""
STRIPE_WEBHOOK_SECRET=""
```

## 🔍 Comment Obtenir la Bonne URL

1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. **Settings** > **Database**
4. Dans "Connection string", choisissez **URI**
5. Copiez l'URL complète qui ressemble à :
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   
   OU (format direct) :
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

6. Ajoutez `?schema=public` à la fin
7. Si votre mot de passe contient des caractères spéciaux comme `&&`, ils doivent être encodés en URL (`%26%26`)

## 📝 Format Complet

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public
```

Où :
- `[PASSWORD]` = votre mot de passe (avec caractères spéciaux encodés si nécessaire)
- `[PROJECT-REF]` = votre référence de projet Supabase (ex: `nbovypcv`)

## ⚠️ Important

- Le mot de passe `Escalop08&&` doit être encodé en `Escalop08%26%26` (correct ✅)
- L'URL doit se terminer par `?schema=public` (manquant ❌)
- L'URL doit inclure `.supabase.co:5432/postgres` (manquant ❌)

## 🚀 Correction Rapide

Sur votre serveur :

```bash
nano .env
```

Remplacez la ligne DATABASE_URL par :
```env
DATABASE_URL="postgresql://postgres:Escalop08%26%26@db.nbovypcv.supabase.co:5432/postgres?schema=public"
```

**Note** : Remplacez `nbovypcv` par votre vraie référence de projet Supabase si ce n'est pas la bonne.











