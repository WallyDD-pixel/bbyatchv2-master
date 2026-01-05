# 🎯 Appliquer les Migrations via Supabase Dashboard

## ✅ Solution Simple : Pas besoin de Prisma migrate deploy

Au lieu d'utiliser `prisma migrate deploy` qui nécessite beaucoup de mémoire, appliquez les migrations SQL directement dans Supabase Dashboard.

## 📋 Étapes

### 1. Ouvrir Supabase SQL Editor

1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Cliquez sur **SQL Editor** dans le menu de gauche

### 2. Appliquer les Migrations dans l'Ordre

Ouvrez chaque fichier de migration dans l'ordre et exécutez-les :

#### Migration 1: Baseline
Fichier : `prisma/migrations/20250821232536_baseline/migration.sql`

Copiez tout le contenu et exécutez-le dans SQL Editor.

#### Migration 2: Stripe Settings
Fichier : `prisma/migrations/20250822004558_add_stripe_settings/migration.sql`

Et ainsi de suite pour toutes les migrations dans l'ordre chronologique.

### 3. Liste Complète des Migrations

Exécutez-les dans cet ordre :

1. `20250821232536_baseline/migration.sql`
2. `20250822004558_add_stripe_settings/migration.sql`
3. `20250822005406_add_stripe_and_payment_fields/migration.sql`
4. `20250822023140_add_agency_role_and_requests/migration.sql`
5. `20250822032327_add_used_boat_model/migration.sql`
6. `20250822040951_add_contact_message_table/migration.sql`
7. `20250822042601_add_boat_options/migration.sql`
8. `20250822051510_add_boat_experiences/migration.sql`
9. `20250822053819_add_experience_availability/migration.sql`
10. `20250829180000_add_homepage_fields_to_settings/migration.sql`
11. `20250829180500_add_homepage_text_fields_to_settings/migration.sql`
12. `20250829181000_add_whychoose_and_aboutus_fields_to_settings/migration.sql`
13. `20250830135438_add_main_slider_text/migration.sql`
14. `20250830153139_add_why_choose_image_url/migration.sql`
15. `20250830155732_add_about_us_subtitle/migration.sql`
16. `20250830163725_add_footer_social_links/migration.sql`
17. `20250830172839_add_city_model/migration.sql`
18. `20250831014409_add_stripe_keys/migration.sql`
19. `20251006160000_add_main_slider_image_urls/migration.sql`
20. `20251006201017_add_main_slider_image_url/migration.sql`
21. `20251007120000_add_legal_pages/migration.sql`
22. `20251007120500_add_legal_slugs_to_settings/migration.sql`
23. `20251117055821_add_photo_urls_to_experience/migration.sql`
24. `20251117094033_add_phone_to_contact_message/migration.sql`
25. `20251117134734_add_about_page_fields/migration.sql`
26. `20251117140000_add_social_media_fields/migration.sql`
27. `20251117150000_add_boat_details_fields/migration.sql`

### 4. Vérification

Après avoir exécuté toutes les migrations :

1. Allez sur **Table Editor** dans Supabase
2. Vous devriez voir toutes vos tables créées :
   - Settings
   - Experience
   - Boat
   - User
   - etc.

## 🚀 Après les Migrations

Une fois les migrations appliquées via Supabase Dashboard, déployez l'application :

```bash
cd ~/bbyatchv2-master
bash deploy/deploy-sans-migrations.sh
```

Ce script va :
- ✅ Installer les dépendances
- ✅ Générer le client Prisma (nécessaire pour l'app)
- ✅ Builder l'application
- ✅ Démarrer avec PM2
- ⏭️ Sauter les migrations (déjà faites via Dashboard)

## 💡 Pourquoi cette Solution ?

- ✅ Pas besoin de mémoire pour Prisma migrate deploy
- ✅ Vous voyez exactement ce qui est exécuté
- ✅ Plus de contrôle
- ✅ Prisma reste nécessaire pour l'application (c'est l'ORM utilisé dans le code)

## 📝 Note Importante

**Prisma est toujours nécessaire** pour votre application ! C'est l'ORM (Object-Relational Mapping) qui permet à votre code TypeScript de communiquer avec Supabase. 

Ce qu'on évite, c'est juste `prisma migrate deploy` qui nécessite beaucoup de mémoire. Mais `prisma generate` (pour générer le client) reste nécessaire et fonctionne bien.







