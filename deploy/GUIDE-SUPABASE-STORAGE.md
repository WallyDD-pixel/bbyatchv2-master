# Guide de configuration Supabase Storage

Ce guide explique comment configurer Supabase Storage pour stocker les images et vidéos de l'application.

## 1. Configuration dans Supabase Dashboard

### Créer un bucket

1. Allez dans votre projet Supabase Dashboard
2. Naviguez vers **Storage** dans le menu de gauche
3. Cliquez sur **New bucket**
4. Configurez le bucket :
   - **Name**: `uploads` (ou le nom que vous avez défini dans `SUPABASE_STORAGE_BUCKET`)
   - **Public bucket**: ✅ **Activé** (pour que les images soient accessibles publiquement)
   - **File size limit**: 100 MB (pour les vidéos)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/png`
     - `image/webp`
     - `image/gif`
     - `video/mp4`
     - `video/webm`
     - `video/ogg`

### Configurer les politiques de sécurité (RLS)

1. Allez dans **Storage** → **Policies**
2. Pour le bucket `uploads`, créez une politique :

**Policy Name**: `Public Access`
**Allowed operation**: SELECT (pour la lecture)
**Policy definition**:
```sql
true
```

Cela permet à tout le monde de lire les fichiers (puisque le bucket est public).

**Pour l'upload** (si vous voulez permettre l'upload depuis le client) :
**Policy Name**: `Authenticated Upload`
**Allowed operation**: INSERT
**Policy definition**:
```sql
bucket_id = 'uploads' AND auth.role() = 'authenticated'
```

**Note**: Dans notre cas, l'upload se fait côté serveur avec la Service Role Key, donc cette politique n'est pas strictement nécessaire.

## 2. Configuration des variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://[votre-project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[votre-service-role-key]
SUPABASE_STORAGE_BUCKET=uploads
```

### Où trouver ces valeurs ?

1. **NEXT_PUBLIC_SUPABASE_URL** :
   - Allez dans **Settings** → **API**
   - Copiez l'**URL** (Project URL)

2. **SUPABASE_SERVICE_ROLE_KEY** :
   - Allez dans **Settings** → **API**
   - Copiez la **service_role key** (⚠️ **NE JAMAIS** exposer cette clé côté client !)
   - Cette clé permet d'uploader des fichiers sans authentification utilisateur

3. **SUPABASE_STORAGE_BUCKET** :
   - Le nom du bucket que vous avez créé (par défaut: `uploads`)

## 3. Structure des dossiers dans Supabase Storage

Les fichiers sont organisés dans les dossiers suivants :
- `experiences/` - Images des expériences
- `boats/` - Images des bateaux
- `boats/videos/` - Vidéos des bateaux
- `homepage/` - Images du slider principal
- `info-cards/` - Images des cartes d'information
- `used-boats/` - Images des bateaux d'occasion

## 4. Installation et déploiement

### Sur le serveur

1. **Installer la dépendance** :
```bash
npm install @supabase/supabase-js
```

2. **Mettre à jour le fichier `.env`** avec les variables Supabase

3. **Reconstruire l'application** :
```bash
npm run build
pm2 restart bbyatchv2-preprod
```

## 5. Migration des fichiers existants

Si vous avez déjà des fichiers dans `public/uploads/`, vous pouvez les migrer vers Supabase Storage :

```bash
# Script de migration (à créer si nécessaire)
# Les fichiers existants continueront de fonctionner via Nginx
# Les nouveaux uploads iront automatiquement vers Supabase Storage
```

## 6. Vérification

1. Testez l'upload d'une image dans l'interface admin
2. Vérifiez dans Supabase Dashboard → Storage → `uploads` que le fichier apparaît
3. Vérifiez que l'image s'affiche correctement sur le site

## 7. Avantages de Supabase Storage

- ✅ Pas de gestion de stockage serveur
- ✅ CDN intégré pour des performances optimales
- ✅ Scalable automatiquement
- ✅ Sauvegarde et réplication automatiques
- ✅ Accès public sécurisé via URLs signées (optionnel)

## 8. Dépannage

### Erreur: "Missing NEXT_PUBLIC_SUPABASE_URL"
- Vérifiez que la variable est bien définie dans `.env`
- Redémarrez l'application après modification du `.env`

### Erreur: "Missing SUPABASE_SERVICE_ROLE_KEY"
- Vérifiez que la clé est correcte dans `.env`
- Assurez-vous d'utiliser la **service_role key** et non la **anon key**

### Les images ne s'affichent pas
- Vérifiez que le bucket est **public**
- Vérifiez les politiques RLS dans Supabase Dashboard
- Vérifiez que l'URL retournée est correcte dans la base de données






