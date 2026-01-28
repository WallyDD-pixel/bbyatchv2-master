#!/bin/bash
# Script pour résoudre les conflits de merge en acceptant la version locale (ours)

echo "🔧 Résolution des conflits de merge..."

# Accepter la version locale (ours) pour tous les fichiers en conflit
git checkout --ours src/app/admin/agency-requests/page.tsx
git checkout --ours src/app/admin/boats/page.tsx
git checkout --ours src/app/admin/messages/page.tsx
git checkout --ours src/app/admin/used-boats/[id]/page.tsx
git checkout --ours src/app/api/admin/info-cards/[id]/route.ts
git checkout --ours src/app/api/admin/seo-tracking/route.ts
git checkout --ours src/app/api/admin/used-boats/route.ts
git checkout --ours src/app/api/admin/used-boats/update/route.ts
git checkout --ours src/app/api/payments/deposit/route.ts

# Ajouter les fichiers résolus
git add src/app/admin/agency-requests/page.tsx
git add src/app/admin/boats/page.tsx
git add src/app/admin/messages/page.tsx
git add src/app/admin/used-boats/[id]/page.tsx
git add src/app/api/admin/info-cards/[id]/route.ts
git add src/app/api/admin/seo-tracking/route.ts
git add src/app/api/admin/used-boats/route.ts
git add src/app/api/admin/used-boats/update/route.ts
git add src/app/api/payments/deposit/route.ts

echo "✅ Conflits résolus. Fichiers ajoutés au staging."
echo "📝 Vous pouvez maintenant faire: git commit -m 'Resolve merge conflicts'"
