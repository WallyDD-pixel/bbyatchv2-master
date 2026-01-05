# Migration vers Supabase Storage - Checklist

## ✅ Modifications effectuées

1. ✅ Installation de `@supabase/supabase-js` dans `package.json`
2. ✅ Création de `src/lib/supabase.ts` - Configuration Supabase
3. ✅ Création de `src/lib/storage.ts` - Fonctions utilitaires pour upload/suppression
4. ✅ Modification de `src/app/api/admin/experiences/route.ts` - POST
5. ✅ Modification de `src/app/api/admin/experiences/[id]/route.ts` - PUT/POST
6. ✅ Modification de `src/app/api/admin/boats/route.ts` - POST
7. ✅ Modification de `src/app/api/admin/boats/[id]/route.ts` - PUT
8. ✅ Modification de `src/app/api/admin/homepage-settings/route.ts` - POST
9. ✅ Modification de `src/app/api/admin/info-cards/route.ts` - POST
10. ✅ Modification de `src/app/api/admin/used-boats/route.ts` - POST

## 📋 Étapes de déploiement

### 1. Configuration Supabase Dashboard

Suivez le guide : `deploy/GUIDE-SUPABASE-STORAGE.md`

### 2. Variables d'environnement

Ajoutez dans `.env` sur le serveur :

```env
NEXT_PUBLIC_SUPABASE_URL=https://[votre-project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[votre-service-role-key]
SUPABASE_STORAGE_BUCKET=uploads
```

### 3. Installation et build

```bash
# Installer la nouvelle dépendance
npm install

# Reconstruire l'application
npm run build

# Redémarrer PM2
pm2 restart bbyatchv2-preprod
```

### 4. Vérification

1. Testez l'upload d'une image dans l'interface admin
2. Vérifiez dans Supabase Dashboard → Storage que le fichier apparaît
3. Vérifiez que l'image s'affiche correctement sur le site

## 🔄 Migration des fichiers existants (optionnel)

Les fichiers existants dans `public/uploads/` continueront de fonctionner via Nginx.
Les nouveaux uploads iront automatiquement vers Supabase Storage.

Si vous voulez migrer les fichiers existants, vous pouvez créer un script de migration.

## ⚠️ Notes importantes

- Les URLs retournées seront maintenant des URLs Supabase (ex: `https://[project].supabase.co/storage/v1/object/public/uploads/...`)
- Les anciennes URLs `/uploads/...` continueront de fonctionner pour les fichiers existants
- Assurez-vous que le bucket est **public** dans Supabase Dashboard
- La Service Role Key ne doit **JAMAIS** être exposée côté client

