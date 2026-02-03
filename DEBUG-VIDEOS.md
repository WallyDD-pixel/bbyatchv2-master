# 🎥 Guide de Débogage des Vidéos

## ✅ Corrections Appliquées

### 1. **Content Security Policy (CSP)**
- ✅ Ajout de `media-src 'self' https: blob: data:` dans `next.config.ts`
- Cela permet le chargement des vidéos depuis Supabase Storage

### 2. **Amélioration du Composant Vidéo**
- ✅ Ajout de `crossOrigin="anonymous"` pour éviter les problèmes CORS
- ✅ Changement de `preload="metadata"` à `preload="auto"` pour un chargement plus rapide
- ✅ Ajout de logs détaillés pour identifier les problèmes
- ✅ Meilleure gestion des erreurs

## 🔍 Comment Déboguer

### 1. Ouvrir la Console du Navigateur
- Appuyez sur **F12** ou **Ctrl+Shift+I**
- Allez dans l'onglet **Console**

### 2. Vérifier les Logs
Vous devriez voir :
- `🎬 BoatMediaCarousel - Vidéos reçues:` : Liste des URLs de vidéos
- `🎬 Parsing vidéo:` : Comment chaque vidéo est détectée
- `✅ Début du chargement vidéo:` : Confirme que la vidéo commence à charger
- `✅ Métadonnées vidéo chargées:` : Durée, dimensions de la vidéo
- `✅ Vidéo prête à être lue:` : La vidéo peut être lue

### 3. Vérifier les Erreurs
Si vous voyez :
- `❌ Erreur de chargement vidéo:` : Il y a un problème avec l'URL ou les permissions
- `⚠️ Chargement vidéo bloqué:` : Problème réseau ou CORS
- `⚠️ Chargement vidéo suspendu:` : Le navigateur a suspendu le chargement

## 🔧 Problèmes Courants et Solutions

### Problème 1 : Vidéo ne charge pas (erreur CORS)
**Symptôme** : Console montre une erreur CORS

**Solution** :
1. Vérifier que le bucket Supabase Storage est **public**
2. Dans Supabase Dashboard → Storage → Settings
3. S'assurer que "Public bucket" est activé

### Problème 2 : URL de vidéo incorrecte
**Symptôme** : Console montre que l'URL est vide ou invalide

**Solution** :
1. Vérifier dans la base de données que `videoUrls` contient bien les URLs
2. Les URLs doivent être au format : `https://[project].supabase.co/storage/v1/object/public/uploads/boats/videos/[filename].mp4`

### Problème 3 : Vidéo trop lourde
**Symptôme** : La vidéo commence à charger mais s'arrête

**Solution** :
1. Vérifier la taille de la vidéo (max 200MB)
2. Compresser la vidéo si nécessaire
3. Utiliser un format optimisé (MP4 avec H.264)

### Problème 4 : Format de vidéo non supporté
**Symptôme** : La vidéo ne peut pas être lue

**Solution** :
1. Utiliser des formats supportés : MP4, WebM, OGG
2. MP4 avec codec H.264 est le plus compatible

## 📋 Checklist de Vérification

- [ ] Les vidéos sont uploadées dans Supabase Storage
- [ ] Le bucket `uploads` est public
- [ ] Les URLs dans `videoUrls` sont correctes
- [ ] Les formats de vidéo sont supportés (MP4, WebM, OGG)
- [ ] La taille des vidéos est raisonnable (< 200MB)
- [ ] La console ne montre pas d'erreurs CORS
- [ ] La CSP permet `media-src https:`

## 🧪 Test Rapide

1. Ouvrez la console (F12)
2. Rechargez la page du bateau
3. Vérifiez les logs :
   ```
   🎬 BoatMediaCarousel - Vidéos reçues: 2 ['url1', 'url2']
   🎬 Parsing vidéo: { url: '...', parsed: { type: 'video', url: '...' } }
   ✅ Début du chargement vidéo: ...
   ✅ Métadonnées vidéo chargées: { duration: 120, ... }
   ✅ Vidéo prête à être lue: ...
   ```

Si vous voyez ces logs, la vidéo devrait fonctionner !

## 🆘 Si le Problème Persiste

1. **Copiez les logs de la console** et partagez-les
2. **Vérifiez l'URL de la vidéo** dans la base de données
3. **Testez l'URL directement** dans le navigateur (elle doit s'ouvrir)
4. **Vérifiez les permissions Supabase** (bucket public)
