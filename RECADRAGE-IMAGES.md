# 🖼️ Recadrage et Repositionnement d'Images

## 📋 Fonctionnalité Disponible

Un composant `ImageCropper` a été créé pour permettre le recadrage et le repositionnement d'images avant l'upload.

## 🎯 Caractéristiques

### Fonctionnalités
- ✅ **Recadrage interactif** : Zone de recadrage ajustable
- ✅ **Repositionnement** : Glisser-déposer pour repositionner l'image
- ✅ **Zoom** : Contrôle du zoom (molette de souris ou slider)
- ✅ **Ratio personnalisable** : Support de différents ratios (16/9, 4/3, 1:1, etc.)
- ✅ **Prévisualisation en temps réel** : Voir le résultat avant d'appliquer

### Utilisation

Le composant `ImageCropper` peut être intégré dans n'importe quelle interface d'upload d'images :

```tsx
import ImageCropper from '@/components/ImageCropper';

// Dans votre composant
const [showCropper, setShowCropper] = useState(false);
const [imageToCrop, setImageToCrop] = useState<string | null>(null);

// Afficher le recadreur
{showCropper && imageToCrop && (
  <ImageCropper
    imageUrl={imageToCrop}
    aspectRatio={16/9} // Ratio personnalisable
    locale="fr"
    onCrop={(croppedFile) => {
      // Utiliser le fichier recadré
      console.log('Image recadrée:', croppedFile);
      setShowCropper(false);
    }}
    onCancel={() => {
      setShowCropper(false);
    }}
  />
)}
```

## 🔧 Intégration Recommandée

### Dans BoatMediaUpload
Ajouter un bouton "Recadrer" sur chaque image de prévisualisation qui ouvre le recadreur.

### Dans ImageGalleryManager
Ajouter une option de recadrage lors de l'upload de nouvelles images.

### Dans Homepage Settings
Permettre le recadrage de l'image "Pourquoi choisir BB Services" avant l'upload.

## 📐 Ratios Disponibles

- **1:1** : Carré (par défaut)
- **16/9** : Format vidéo/écran large
- **4/3** : Format classique
- **3/2** : Format photo classique
- **Personnalisé** : N'importe quel ratio

## 🎨 Interface

- **Zone de recadrage** : Cadre bleu avec overlay sombre autour
- **Contrôles** :
  - Glisser-déposer pour repositionner
  - Molette de souris pour zoomer
  - Slider pour ajuster le zoom précisément
- **Actions** :
  - "Annuler" : Ferme sans appliquer
  - "Appliquer" : Génère le fichier recadré

## 🔄 Prochaines Étapes

Pour activer le recadrage dans une interface spécifique :

1. Importer le composant `ImageCropper`
2. Ajouter un état pour gérer l'affichage
3. Ajouter un bouton "Recadrer" sur les images
4. Gérer le fichier recadré retourné

**Note** : Le composant est prêt à être utilisé mais n'est pas encore intégré dans les interfaces existantes. Il peut être ajouté à la demande.
