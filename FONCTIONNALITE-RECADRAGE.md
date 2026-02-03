# ✂️ Fonctionnalité de Recadrage et Repositionnement d'Images

## ✅ Fonctionnalités Implémentées

### 1. **Recadrage Interactif**
- ✅ Interface de recadrage avec zoom, rotation et repositionnement
- ✅ Ratio personnalisable (carré, 16/9, 4/3, libre)
- ✅ Contrôles intuitifs (molette pour zoom, clic-glisser pour repositionner)

### 2. **Recadrage Après Upload**
- ✅ Bouton "Recadrer" sur chaque image dans la galerie
- ✅ Remplacement automatique de l'image originale par la version recadrée
- ✅ Conservation de la position dans la galerie
- ✅ Mise à jour automatique si l'image est l'image principale

### 3. **Repositionnement**
- ✅ Possibilité de déplacer l'image dans la zone de recadrage
- ✅ Zoom pour ajuster la zone visible
- ✅ Centrage automatique initial

## 🎯 Utilisation

### Pour recadrer une image existante :

1. **Accéder à la galerie** : Dans l'édition d'un bateau, section "Photos"
2. **Survoler une image** : Les boutons d'action apparaissent
3. **Cliquer sur "Recadrer"** : Le modal de recadrage s'ouvre
4. **Ajuster l'image** :
   - **Zoom** : Molette de la souris ou boutons +/-
   - **Repositionner** : Clic-glisser sur l'image
   - **Rotation** : Bouton de rotation (si disponible)
5. **Valider** : Cliquer sur "Valider" pour sauvegarder
6. **Annuler** : Cliquer sur "Annuler" pour fermer sans modifier

### Résultat :
- L'image recadrée remplace l'originale dans la galerie
- La position dans la liste est conservée
- Si c'était l'image principale, elle reste principale avec la nouvelle version

## 🔧 Détails Techniques

### Composant `ImageCropper`
- **Localisation** : `src/components/ImageCropper.tsx`
- **Fonctionnalités** :
  - Recadrage interactif avec Canvas API
  - Export en fichier `File` pour upload
  - Interface responsive

### Intégration dans `BoatEditClient`
- **Bouton "Recadrer"** : Ajouté dans les actions au survol de chaque image
- **Modal** : Affichage conditionnel du composant `ImageCropper`
- **Upload** : Remplacement automatique via l'API `/api/admin/boats/[id]`

### API Modifications
- **Paramètre `replaceImageUrl`** : Indique quelle image remplacer
- **Logique de remplacement** : L'image est remplacée à la même position dans la liste

## 📋 Format et Qualité

- **Format de sortie** : JPEG (optimisé)
- **Qualité** : 85% (haute qualité)
- **Taille maximale** : 2MB après compression automatique
- **Résolution** : Jusqu'à 1920x1920 pixels

## 🎨 Améliorations Futures Possibles

1. **Recadrage lors de l'upload initial** : Permettre de recadrer avant le premier upload
2. **Ratios prédéfinis** : Options pour ratios spécifiques (bannière, carré, etc.)
3. **Filtres** : Ajout de filtres visuels (luminosité, contraste, saturation)
4. **Repositionnement CSS** : Utiliser `object-position` pour ajuster l'affichage sans recadrer
5. **Recadrage multiple** : Recadrer plusieurs images en une seule session

## ⚠️ Notes Importantes

- Le recadrage remplace définitivement l'image originale
- Il est recommandé de garder une copie de l'original si nécessaire
- La compression automatique s'applique après le recadrage
- Les images recadrées sont optimisées pour le web

## 🔄 Workflow Complet

```
1. Upload image originale (jusqu'à 20MB)
   ↓
2. Compression automatique si > 2MB
   ↓
3. Affichage dans la galerie
   ↓
4. Clic sur "Recadrer"
   ↓
5. Ajustement (zoom, position, rotation)
   ↓
6. Validation
   ↓
7. Upload de l'image recadrée
   ↓
8. Remplacement dans la galerie
   ↓
9. Compression automatique si nécessaire
```

## 📝 Exemple d'Utilisation

```typescript
// Dans BoatEditClient.tsx
const handleCropImage = async (croppedFile: File, originalUrl: string, index: number) => {
  // Upload avec indication de remplacement
  const fd = new FormData();
  fd.append('imageFiles', croppedFile);
  fd.append('replaceImageUrl', originalUrl);
  // ... autres champs
  // L'API remplace automatiquement l'image à la bonne position
};
```

## ✨ Avantages

- ✅ **Contrôle total** : Vous décidez exactement quelle partie de l'image afficher
- ✅ **Optimisation visuelle** : Ajustez le cadrage pour un rendu optimal
- ✅ **Pas de perte de qualité** : Compression intelligente à 85%
- ✅ **Workflow fluide** : Recadrage directement depuis la galerie
- ✅ **Conservation de l'ordre** : La position dans la galerie est préservée
