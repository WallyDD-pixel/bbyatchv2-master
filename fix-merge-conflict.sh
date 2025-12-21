#!/bin/bash
# Script pour résoudre le conflit Git dans autre-ville/page.tsx

echo "🔧 Résolution du conflit Git dans src/app/autre-ville/page.tsx..."

# Sauvegarder le fichier actuel
cp src/app/autre-ville/page.tsx src/app/autre-ville/page.tsx.backup

# Créer la version correcte du fichier
cat > src/app/autre-ville/page.tsx << 'EOF'
export const dynamic = 'force-dynamic';
import HeaderBar from '@/components/HeaderBar';
import Footer from '@/components/Footer';
import { messages, type Locale } from '@/i18n/messages';
import AutreVilleClient from './AutreVilleClient';

export const metadata = { title: 'Autre ville - Informations' };

export default async function AutreVillePage({ searchParams }: { searchParams?: { lang?: string } }) {
  const sp = searchParams || {};
  const locale: Locale = sp?.lang === "en" ? "en" : "fr";
  const t = messages[locale];

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderBar initialLocale={locale} />
      <main className="flex-1">
        <AutreVilleClient locale={locale} t={t} />
      </main>
      <Footer locale={locale} t={t} />
    </div>
  );
}
EOF

echo "✅ Fichier corrigé !"
echo "📝 Vérification du fichier..."
cat src/app/autre-ville/page.tsx

echo ""
echo "✅ Conflit résolu ! Vous pouvez maintenant :"
echo "   1. git add src/app/autre-ville/page.tsx"
echo "   2. git commit -m 'Résolution conflit autre-ville/page.tsx'"
echo "   3. git pull (si nécessaire)"
echo "   4. npm run build"

