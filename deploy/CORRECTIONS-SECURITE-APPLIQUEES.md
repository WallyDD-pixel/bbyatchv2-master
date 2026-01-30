# Corrections de sécurité appliquées

## ✅ Corrections complétées

### 1. Injection SQL potentielle - CORRIGÉ ✅
**Fichier:** `src/app/api/signup/route.ts`
- ❌ Avant: `$executeRawUnsafe` avec templates SQL
- ✅ Après: `$executeRaw` avec paramètres typés
- **Impact:** Protection contre les injections SQL

### 2. Validation d'email améliorée - CORRIGÉ ✅
**Fichiers:** 
- `src/app/api/signup/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/auth/signin/route.ts`
- `src/app/api/contact-message/route.ts`
- `src/app/api/autre-ville/route.ts`

- ❌ Avant: Validation basique `email.includes("@")` ou regex simple
- ✅ Après: Utilisation de `validator.isEmail()` avec normalisation
- **Impact:** Validation stricte selon RFC, normalisation automatique

### 3. Mots de passe renforcés - CORRIGÉ ✅
**Fichiers:**
- `src/app/api/signup/route.ts`
- `src/app/api/admin/users/route.ts`

- ❌ Avant: Minimum 6 caractères, pas de complexité
- ✅ Après: 
  - Minimum 12 caractères
  - Exigence: majuscules, minuscules, chiffres
  - Évaluation de force avec `zxcvbn` (score minimum 2)
- **Impact:** Protection contre les mots de passe faibles

### 4. Rate limiting implémenté - CORRIGÉ ✅
**Fichiers:**
- `src/lib/security/rate-limit.ts` (nouveau)
- `src/app/api/signup/route.ts`
- `src/app/api/auth/signin/route.ts`
- `src/app/api/contact-message/route.ts`
- `src/app/api/autre-ville/route.ts`

- ❌ Avant: Aucun rate limiting
- ✅ Après:
  - Authentification: 5 tentatives / 15 minutes
  - Inscription: 3 tentatives / heure
  - Contact: 10 messages / heure
- **Impact:** Protection contre force brute et spam

### 5. Session JWT réduite - CORRIGÉ ✅
**Fichier:** `src/lib/auth.ts`
- ❌ Avant: 30 jours
- ✅ Après: 7 jours
- **Impact:** Réduction du risque si token compromis

### 6. Validation et sanitization des entrées - CORRIGÉ ✅
**Fichiers:**
- `src/lib/security/validation.ts` (nouveau)
- `src/app/api/contact-message/route.ts`
- `src/app/api/autre-ville/route.ts`

- ❌ Avant: Validation basique, pas de sanitization HTML
- ✅ Après:
  - Validation stricte des noms (caractères dangereux rejetés)
  - Sanitization HTML avec `sanitize-html`
  - Validation téléphone
  - Limitation de longueur
- **Impact:** Protection contre XSS et injection

### 7. Vérification d'autorisation standardisée - EN COURS 🔄
**Fichier:** `src/lib/security/auth-helpers.ts` (nouveau)
- ✅ Création de fonctions centralisées:
  - `ensureAuthenticated()`
  - `ensureAdmin()` - TOUJOURS vérifie en base
  - `ensureRole()`
  - `getCurrentUser()`
- ⚠️ À faire: Remplacer toutes les fonctions `ensureAdmin()` locales (24 fichiers)

### 8. Protection contre énumération emails - CORRIGÉ ✅
**Fichier:** `src/app/api/signup/route.ts`
- ❌ Avant: Réponse différente si email existe
- ✅ Après:
  - Toujours exécuter `bcrypt.hash()` même si email existe
  - Délai constant pour éviter timing attacks
  - Même message d'erreur
- **Impact:** Impossible de découvrir quels emails sont enregistrés

### 9. Headers de sécurité HTTP - CORRIGÉ ✅
**Fichier:** `next.config.ts`
- ❌ Avant: Aucun header de sécurité
- ✅ Après: Headers complets:
  - `Strict-Transport-Security`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Content-Security-Policy` (configuré pour Stripe et Supabase)
- **Impact:** Protection contre clickjacking, XSS, etc.

### 10. Protection contre timing attacks - CORRIGÉ ✅
**Fichiers:**
- `src/app/api/signup/route.ts`
- `src/app/api/auth/signin/route.ts`

- ❌ Avant: Temps de réponse variable selon existence utilisateur
- ✅ Après:
  - Toujours exécuter `bcrypt.hash()` même si utilisateur inexistant
  - Délais constants
- **Impact:** Impossible de deviner quels emails existent via timing

## 📦 Nouvelles dépendances ajoutées

```json
{
  "validator": "^13.11.0",        // Validation email
  "zod": "^3.22.4",                // Validation de schémas
  "sanitize-html": "^2.11.0",      // Sanitization HTML
  "zxcvbn": "^4.4.2"               // Évaluation force mot de passe
}
```

## 🔄 À compléter

### 7. Standardiser toutes les vérifications admin
**Action requise:** Remplacer les 24 fonctions `ensureAdmin()` locales par `ensureAdmin()` de `@/lib/security/auth-helpers`

**Fichiers concernés:**
- `src/app/api/admin/notifications/test/route.ts`
- `src/app/api/admin/notifications/route.ts`
- `src/app/api/admin/experiences/[id]/route.ts`
- `src/app/api/admin/navbar/route.ts`
- `src/app/api/admin/availability/slot/[id]/route.ts`
- `src/app/api/admin/homepage-settings/route.ts`
- `src/app/api/admin/gallery/route.ts`
- `src/app/api/admin/navbar/reorder/route.ts`
- `src/app/api/admin/gallery/[id]/route.ts`
- `src/app/api/admin/legal-pages/settings/route.ts`
- `src/app/api/admin/general-settings/route.ts`
- `src/app/api/admin/about-settings/route.ts`
- `src/app/api/admin/info-cards/route.ts`
- `src/app/api/admin/agency-requests/[id]/route.ts`
- `src/app/api/admin/legal-pages/route.ts`
- `src/app/api/admin/used-sale-settings/route.ts`
- `src/app/api/admin/legal-pages/[id]/route.ts`
- `src/app/api/admin/boats/[id]/route.ts`
- `src/app/api/admin/availability/experiences/route.ts`
- `src/app/api/admin/boats/[id]/experience-price/route.ts`
- `src/app/api/admin/availability/route.ts`
- `src/app/api/admin/seo-tracking/route.ts`
- `src/app/api/admin/info-cards/[id]/route.ts`
- `src/app/api/admin/users/[id]/route.ts`

**Exemple de remplacement:**
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
// Utiliser directement: const guard = await ensureAdmin();
```

### 8. Améliorer validation upload fichiers
**Fichier:** `src/app/api/admin/boats/[id]/route.ts`
- Ajouter vérification des magic bytes
- Limiter strictement la taille
- Scanner les fichiers

## 📝 Notes importantes

1. **Rate limiting en mémoire:** Le rate limiting actuel est en mémoire. Pour la production à grande échelle, migrer vers Redis ou @upstash/ratelimit.

2. **CSP Stripe:** Le Content-Security-Policy a été configuré pour autoriser Stripe. Vérifier que tous les domaines nécessaires sont inclus.

3. **Validation email:** La validation utilise `validator` qui est plus stricte que la validation précédente. Certains emails valides mais non standards pourraient être rejetés.

4. **Mots de passe existants:** Les mots de passe existants ne sont pas affectés. Seuls les nouveaux mots de passe doivent respecter les nouvelles règles.

5. **Tests requis:** Tester tous les endpoints modifiés pour s'assurer que les validations ne cassent pas les fonctionnalités existantes.

## 🚀 Prochaines étapes

1. Installer les nouvelles dépendances: `npm install`
2. Tester les endpoints modifiés
3. Remplacer les fonctions `ensureAdmin()` locales
4. Implémenter la validation des uploads de fichiers
5. Configurer un rate limiting en production (Redis)
