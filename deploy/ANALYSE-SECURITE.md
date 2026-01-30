# Analyse de sécurité - Failles identifiées

## 🔴 Failles critiques

### 1. Injection SQL potentielle avec `$executeRawUnsafe`

**Fichier:** `src/app/api/signup/route.ts` (lignes 8, 28)

**Problème:**
```typescript
await prisma.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "User" (...)
`);
```

**Risque:** Bien que le code utilise des templates littéraux statiques ici, l'utilisation de `$executeRawUnsafe` est dangereuse si des variables utilisateur sont interpolées.

**Recommandation:**
- Utiliser `$executeRaw` avec des paramètres typés au lieu de `$executeRawUnsafe`
- Si `$executeRawUnsafe` est absolument nécessaire, valider et échapper toutes les entrées

**Priorité:** 🔴 CRITIQUE

---

### 2. Validation d'email insuffisante

**Fichiers:** `src/app/api/signup/route.ts`, `src/app/api/admin/users/route.ts`

**Problème:**
```typescript
// signup/route.ts ligne 40
if (typeof email !== "string" || !email.includes("@")) 
  return NextResponse.json({ error: "invalid_email" }, { status: 400 });

// admin/users/route.ts ligne 21
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
```

**Risque:** 
- La validation dans `signup/route.ts` est trop faible (accepte `test@` comme email valide)
- Pas de validation de longueur maximale
- Pas de normalisation (espaces, caractères spéciaux)

**Recommandation:**
- Utiliser une bibliothèque de validation d'email (ex: `validator`, `zod`)
- Normaliser l'email (trim, lowercase)
- Limiter la longueur (RFC 5321: 320 caractères max)

**Priorité:** 🟠 ÉLEVÉE

---

### 3. Mots de passe faibles

**Fichiers:** `src/app/api/signup/route.ts`, `src/app/api/admin/users/route.ts`

**Problème:**
```typescript
if (typeof password !== "string" || password.length < 6)
```

**Risque:**
- Minimum de 6 caractères est trop faible
- Pas de vérification de complexité (majuscules, chiffres, caractères spéciaux)
- Pas de protection contre les mots de passe courants

**Recommandation:**
- Minimum 12 caractères
- Exiger majuscules, minuscules, chiffres
- Vérifier contre une liste de mots de passe courants
- Utiliser `zxcvbn` pour évaluer la force

**Priorité:** 🟠 ÉLEVÉE

---

### 4. Pas de rate limiting

**Fichiers:** Tous les endpoints API publics

**Problème:**
- Aucun rate limiting sur les endpoints de connexion, inscription, contact
- Risque d'attaques par force brute
- Risque de spam (formulaires de contact)

**Recommandation:**
- Implémenter rate limiting avec `@upstash/ratelimit` ou `next-rate-limit`
- Limiter les tentatives de connexion (ex: 5 par IP/15min)
- Limiter les inscriptions (ex: 3 par IP/heure)
- Limiter les formulaires de contact (ex: 10 par IP/heure)

**Priorité:** 🟠 ÉLEVÉE

---

### 5. Session JWT trop longue

**Fichier:** `src/lib/auth.ts` (ligne 16)

**Problème:**
```typescript
maxAge: 30 * 24 * 60 * 60, // 30 days
```

**Risque:**
- Session de 30 jours augmente le risque si le token est compromis
- Pas de rotation de token
- Pas de révocation possible

**Recommandation:**
- Réduire à 7 jours maximum
- Implémenter refresh tokens
- Permettre la révocation de sessions

**Priorité:** 🟡 MOYENNE

---

## 🟠 Failles importantes

### 6. Pas de protection CSRF explicite

**Fichiers:** Tous les endpoints POST/PUT/DELETE

**Problème:**
- NextAuth gère partiellement CSRF, mais pas de vérification explicite
- Les formulaires peuvent être soumis depuis d'autres domaines

**Recommandation:**
- Vérifier l'origine des requêtes
- Utiliser des tokens CSRF pour les formulaires
- Configurer les headers CORS correctement

**Priorité:** 🟡 MOYENNE

---

### 7. Validation d'entrée insuffisante

**Fichiers:** `src/app/api/contact-message/route.ts`, `src/app/api/autre-ville/route.ts`

**Problème:**
```typescript
// contact-message/route.ts
const name = (form.get('name')||'').toString().slice(0,200).trim();
const message = (form.get('message')||'').toString().slice(0,5000).trim();
```

**Risque:**
- Pas de validation de format (seulement longueur)
- Pas de sanitization HTML (risque XSS si affiché)
- Pas de validation de caractères autorisés

**Recommandation:**
- Sanitizer le HTML avec `DOMPurify` ou `sanitize-html`
- Valider les formats (ex: téléphone, email)
- Rejeter les caractères dangereux

**Priorité:** 🟡 MOYENNE

---

### 8. Gestion des erreurs expose des informations

**Fichiers:** Plusieurs endpoints API

**Problème:**
```typescript
// Exemple dans contact-message/route.ts ligne 64
return NextResponse.json({ ok:false, error:'server_error' }, { status:500 });
```

**Risque:**
- Messages d'erreur génériques (bon)
- Mais les logs console peuvent exposer des détails sensibles
- Stack traces dans les réponses en développement

**Recommandation:**
- Ne jamais exposer les stack traces en production
- Logger les erreurs détaillées côté serveur uniquement
- Retourner des messages génériques aux clients

**Priorité:** 🟡 MOYENNE

---

### 9. Vérification d'autorisation incohérente

**Fichiers:** Plusieurs routes admin

**Problème:**
```typescript
// Certaines routes vérifient le rôle dans la session
if ((session.user as any)?.role === 'admin') return session.user;

// D'autres vérifient toujours en base
const me = await prisma.user.findUnique({ where: { email: session.user.email }, select: { role: true } });
```

**Risque:**
- Incohérence dans la vérification
- Certaines routes peuvent être contournées si le rôle dans le JWT est modifié
- Pas de vérification systématique en base

**Recommandation:**
- Toujours vérifier le rôle en base de données pour les actions sensibles
- Utiliser une fonction `ensureAdmin()` centralisée et cohérente
- Ne jamais faire confiance uniquement au JWT

**Priorité:** 🟡 MOYENNE

---

### 10. Pas de validation de l'origine des webhooks Stripe

**Fichier:** `src/app/api/payments/webhook/route.ts`

**Problème:**
- La vérification de signature Stripe est présente (ligne 61)
- Mais pas de vérification de l'IP source
- Pas de vérification de l'User-Agent

**Recommandation:**
- Vérifier que la requête vient bien de Stripe (whitelist IPs Stripe)
- Vérifier l'User-Agent Stripe
- Ajouter un timestamp pour éviter les replay attacks

**Priorité:** 🟡 MOYENNE

---

## 🟡 Failles modérées

### 11. Upload de fichiers sans validation stricte

**Fichier:** `src/app/api/admin/boats/[id]/route.ts`

**Problème:**
```typescript
const allowed = ['image/jpeg','image/png','image/webp','image/gif'];
const mime = (f as any).type;
if (allowed.includes(mime)) { ... }
```

**Risque:**
- Validation basée uniquement sur le type MIME (peut être falsifié)
- Pas de vérification de la signature de fichier (magic bytes)
- Pas de limitation de taille stricte
- Pas de scan antivirus

**Recommandation:**
- Vérifier les magic bytes du fichier
- Limiter strictement la taille (ex: 5MB max)
- Scanner les fichiers uploadés
- Renommer les fichiers avec des noms aléatoires

**Priorité:** 🟡 MOYENNE

---

### 12. Pas de protection contre l'énumération d'emails

**Fichier:** `src/app/api/signup/route.ts`

**Problème:**
```typescript
if (existing) return NextResponse.json({ error: "exists" }, { status: 409 });
```

**Risque:**
- Un attaquant peut découvrir quels emails sont enregistrés
- Facilite le ciblage d'utilisateurs spécifiques

**Recommandation:**
- Retourner toujours le même message (succès ou échec générique)
- Ne pas révéler si l'email existe déjà
- Utiliser un délai constant pour éviter le timing attack

**Priorité:** 🟡 MOYENNE

---

### 13. Pas de protection contre le timing attack

**Fichiers:** `src/lib/auth.ts` (authentification)

**Problème:**
- `bcrypt.compare()` est déjà protégé contre les timing attacks
- Mais la vérification de l'existence de l'utilisateur peut révéler des informations

**Recommandation:**
- Toujours exécuter `bcrypt.compare()` même si l'utilisateur n'existe pas
- Utiliser un hash factice pour maintenir un temps constant

**Priorité:** 🟢 FAIBLE

---

### 14. Variables d'environnement exposées

**Fichier:** `ecosystem.config.cjs`

**Problème:**
- Les variables d'environnement sont chargées dans le code
- Pas de vérification de la présence des variables critiques
- Pas de validation des formats

**Recommandation:**
- Utiliser `zod` pour valider les variables d'environnement
- Vérifier au démarrage que toutes les variables requises sont présentes
- Ne jamais exposer les secrets dans les logs

**Priorité:** 🟡 MOYENNE

---

### 15. Pas de logging de sécurité

**Problème:**
- Pas de logs des tentatives d'authentification échouées
- Pas de logs des actions administratives
- Pas de logs des accès aux données sensibles

**Recommandation:**
- Logger toutes les tentatives de connexion (succès et échecs)
- Logger toutes les actions administratives
- Logger les accès aux données sensibles
- Utiliser un système de logging structuré (ex: Winston)

**Priorité:** 🟡 MOYENNE

---

## 🟢 Améliorations recommandées

### 16. Headers de sécurité manquants

**Recommandation:**
- Ajouter `Content-Security-Policy`
- Ajouter `X-Frame-Options: DENY`
- Ajouter `X-Content-Type-Options: nosniff`
- Ajouter `Referrer-Policy: strict-origin-when-cross-origin`
- Ajouter `Permissions-Policy`

**Priorité:** 🟢 FAIBLE

---

### 17. Pas de vérification de l'intégrité des dépendances

**Reblème:**
- Pas de vérification des signatures des packages npm
- Risque d'installer des packages compromis

**Recommandation:**
- Utiliser `npm audit` régulièrement
- Utiliser `snyk` ou `dependabot` pour détecter les vulnérabilités
- Verrouiller les versions exactes des dépendances critiques

**Priorité:** 🟢 FAIBLE

---

### 18. Pas de monitoring des anomalies

**Recommandation:**
- Implémenter un système de détection d'anomalies
- Alerter en cas de nombreuses tentatives de connexion échouées
- Alerter en cas d'activité suspecte

**Priorité:** 🟢 FAIBLE

---

## 📋 Plan d'action prioritaire

### Phase 1 - Critiques (à faire immédiatement)
1. ✅ Remplacer `$executeRawUnsafe` par `$executeRaw` avec paramètres
2. ✅ Améliorer la validation d'email
3. ✅ Renforcer les exigences de mot de passe
4. ✅ Implémenter le rate limiting

### Phase 2 - Importantes (dans la semaine)
5. ✅ Réduire la durée de session JWT
6. ✅ Améliorer la validation d'entrée
7. ✅ Sanitizer le HTML dans les messages
8. ✅ Standardiser la vérification d'autorisation

### Phase 3 - Améliorations (dans le mois)
9. ✅ Améliorer la validation des uploads
10. ✅ Ajouter les headers de sécurité
11. ✅ Implémenter le logging de sécurité
12. ✅ Ajouter la protection contre l'énumération

---

## 🔧 Outils recommandés

- **Rate Limiting:** `@upstash/ratelimit` ou `next-rate-limit`
- **Validation:** `zod` ou `yup`
- **Sanitization:** `DOMPurify` ou `sanitize-html`
- **Email Validation:** `validator` ou `zod` avec `z.string().email()`
- **Password Strength:** `zxcvbn`
- **Security Headers:** `next-secure-headers`
- **Vulnerability Scanning:** `npm audit`, `snyk`, `dependabot`

---

## 📚 Ressources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Prisma Security](https://www.prisma.io/docs/guides/security)
