# Instructions après corrections de sécurité

## 📋 Actions immédiates requises

### 1. Installer les nouvelles dépendances

```bash
cd ~/bbyatchv2-master
npm install
```

**Nouvelles dépendances ajoutées:**
- `validator` - Validation email stricte
- `zod` - Validation de schémas
- `sanitize-html` - Sanitization HTML
- `zxcvbn` - Évaluation force mot de passe

### 2. Rebuild l'application

```bash
npm run build
```

### 3. Redémarrer PM2

```bash
pm2 restart bbyatch
pm2 logs bbyatch --lines 50
```

## ✅ Corrections appliquées

### Failles critiques corrigées

1. **Injection SQL** ✅
   - `$executeRawUnsafe` remplacé par `$executeRaw` sécurisé
   - Fichier: `src/app/api/signup/route.ts`

2. **Validation email** ✅
   - Utilisation de `validator.isEmail()` avec normalisation
   - Validation selon RFC 5321 (max 320 caractères)

3. **Mots de passe** ✅
   - Minimum 12 caractères (au lieu de 6)
   - Exigence: majuscules, minuscules, chiffres
   - Évaluation de force avec `zxcvbn` (score minimum 2)

4. **Rate limiting** ✅
   - Authentification: 5 tentatives / 15 minutes
   - Inscription: 3 tentatives / heure
   - Contact: 10 messages / heure

5. **Session JWT** ✅
   - Réduite de 30 jours à 7 jours

6. **Validation entrées** ✅
   - Validation stricte des noms (caractères dangereux rejetés)
   - Sanitization HTML avec `sanitize-html`
   - Validation téléphone

7. **Protection énumération** ✅
   - Délais constants pour éviter timing attacks
   - Toujours exécuter bcrypt même si utilisateur inexistant

8. **Headers sécurité** ✅
   - Headers complets dans `next.config.ts`
   - CSP configuré pour Stripe et Supabase

9. **Vérification admin** ✅
   - Fonction centralisée `ensureAdmin()` qui vérifie TOUJOURS en base

## ⚠️ Points d'attention

### Validation email plus stricte

La nouvelle validation est plus stricte. Si des utilisateurs légitimes ont des problèmes:
- Vérifier le format de leur email
- La validation normalise automatiquement (trim, lowercase)

### Mots de passe existants

Les mots de passe existants ne sont **PAS** affectés. Seuls les **nouveaux** mots de passe doivent respecter:
- Minimum 12 caractères
- Au moins une majuscule, une minuscule, un chiffre
- Score zxcvbn >= 2

### Rate limiting

Le rate limiting est en **mémoire**. Pour la production à grande échelle:
- Migrer vers Redis ou @upstash/ratelimit
- Le système actuel est suffisant pour la plupart des cas

### Headers CSP

Le Content-Security-Policy autorise:
- Stripe (js.stripe.com, hooks.stripe.com)
- Supabase (*.supabase.co)
- Google Fonts

Si vous ajoutez d'autres services externes, mettre à jour `next.config.ts`.

## 🧪 Tests recommandés

Après installation et redémarrage, tester:

1. **Inscription:**
   - Email invalide → doit être rejeté
   - Mot de passe faible → doit être rejeté avec suggestions
   - Inscription valide → doit fonctionner

2. **Connexion:**
   - 5 tentatives incorrectes → doit bloquer (rate limit)
   - Connexion valide → doit fonctionner

3. **Formulaires de contact:**
   - 10 messages → doit bloquer (rate limit)
   - Message avec HTML → doit être sanitizé

4. **Endpoints admin:**
   - Sans authentification → doit retourner 401
   - Avec rôle user → doit retourner 403
   - Avec rôle admin → doit fonctionner

## 📝 Fichiers modifiés

### Nouveaux fichiers créés:
- `src/lib/security/validation.ts` - Utilitaires de validation
- `src/lib/security/rate-limit.ts` - Rate limiting
- `src/lib/security/auth-helpers.ts` - Helpers d'authentification

### Fichiers modifiés:
- `package.json` - Nouvelles dépendances
- `next.config.ts` - Headers de sécurité
- `src/lib/auth.ts` - Durée session réduite
- `src/app/api/signup/route.ts` - Toutes les corrections
- `src/app/api/admin/users/route.ts` - Validation améliorée
- `src/app/api/auth/signin/route.ts` - Rate limiting + validation
- `src/app/api/contact-message/route.ts` - Validation + sanitization
- `src/app/api/autre-ville/route.ts` - Validation + sanitization
- `src/app/api/admin/users/[id]/route.ts` - ensureAdmin centralisé
- `src/app/api/admin/boats/[id]/route.ts` - ensureAdmin centralisé
- `src/app/api/admin/availability/route.ts` - ensureAdmin centralisé

## 🔄 À faire (optionnel)

### Remplacer les autres fonctions ensureAdmin()

Il reste ~21 fichiers avec des fonctions `ensureAdmin()` locales. Pour les remplacer:

```typescript
// AVANT
async function ensureAdmin() {
  const session = (await getServerSession()) as any;
  if (!session?.user?.email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const me = await (prisma as any).user.findUnique({ where: { email: session.user.email }, select: { role: true } }).catch(() => null);
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return null;
}

// APRÈS
import { ensureAdmin } from '@/lib/security/auth-helpers';
// Puis utiliser: const guard = await ensureAdmin(); if (guard) return guard;
```

### Validation upload fichiers

Pour améliorer la sécurité des uploads, ajouter la vérification des magic bytes dans `src/app/api/admin/boats/[id]/route.ts`.

## 📊 Résultat

**9 failles critiques/importantes corrigées sur 10**

L'application est maintenant beaucoup plus sécurisée avec:
- ✅ Protection contre injection SQL
- ✅ Validation stricte des entrées
- ✅ Rate limiting contre force brute
- ✅ Mots de passe renforcés
- ✅ Headers de sécurité HTTP
- ✅ Protection contre énumération et timing attacks
