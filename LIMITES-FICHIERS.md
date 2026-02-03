# 📊 Limites de Taille des Fichiers et Compression Automatique

## 📸 Images

### Limites actuelles
- **Taille maximale acceptée** : **20MB** (augmenté de 5MB)
- **Taille cible après compression** : **2MB**
- **Résolution maximale** : 1920x1920 pixels
- **Qualité de compression** : 85%

### Formats supportés
- JPEG
- PNG
- WebP
- GIF (limite: 10MB, compression limitée pour préserver l'animation)

### Compression automatique
✅ **Active par défaut** : Les images sont automatiquement compressées si elles dépassent 2MB, même si elles font moins de 20MB.

**Processus** :
1. Si l'image fait **> 2MB** : compression automatique à 2MB max
2. Si l'image fait **> 20MB** : rejetée avec message d'erreur
3. Redimensionnement automatique si dimensions > 1920px
4. Conversion en JPEG pour optimiser la taille

## 🎥 Vidéos

### Limites actuelles
- **Taille maximale acceptée** : **200MB** (augmenté de 100MB)
- **Taille cible après compression** : 100MB (si compression serveur disponible)

### Formats supportés
- MP4
- WebM
- OGG

### Compression
⚠️ **Note** : La compression vidéo côté serveur nécessite des outils spécialisés (FFmpeg). Actuellement, les vidéos sont acceptées jusqu'à 200MB sans compression automatique.

## 🔧 Fonctionnement Technique

### Côté Client (Navigateur)
- Compression automatique via Canvas API
- Redimensionnement intelligent (préserve le ratio)
- Réduction progressive de la qualité si nécessaire
- Remplacement automatique du fichier dans l'input

### Côté Serveur
- Validation de sécurité (magic bytes, type MIME)
- Upload vers Supabase Storage
- Compression supplémentaire si Sharp est disponible

## 📝 Messages Utilisateur

### Images
- **< 2MB** : Upload direct, pas de compression
- **2MB - 20MB** : "Compression automatique en cours..." → "Image compressée avec succès (X MB)"
- **> 20MB** : "Image trop volumineuse (X MB). Limite: 20MB. Veuillez réduire la taille du fichier."

### Vidéos
- **< 200MB** : Upload direct
- **> 200MB** : "Fichier trop volumineux (X MB). Limite: 200MB."

## 🎯 Recommandations

### Pour les images
1. **Utilisez des images haute qualité** : Le système compresse automatiquement
2. **Préférez JPEG** : Meilleure compression que PNG
3. **Évitez les images > 20MB** : Réduisez-les avant l'upload si nécessaire

### Pour les vidéos
1. **Utilisez MP4** : Format le plus compatible
2. **Compressez avant l'upload** si > 100MB pour de meilleures performances
3. **Résolution recommandée** : 1080p (1920x1080) maximum

## 🔄 Améliorations Futures Possibles

1. **Compression vidéo automatique** : Intégration FFmpeg côté serveur
2. **Recadrage interactif** : Outil de recadrage/repositionnement d'images
3. **Optimisation WebP automatique** : Conversion automatique en WebP pour meilleure compression
4. **CDN pour vidéos** : Utilisation d'un CDN dédié pour les vidéos volumineuses
