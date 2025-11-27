# 🎨 Guide d'installation des polices Nakilla et Aviano

## ✅ Configuration terminée

La configuration pour utiliser les polices **Nakilla** (titres) et **Aviano** (sous-titres) a été mise en place sur tout le site.

### 📁 Structure actuelle

```
src/
├── styles/
│   └── fonts.css          # Configuration des polices personnalisées
├── app/
│   ├── globals.css         # Import des polices
│   └── layout.tsx          # Configuration Next.js
public/
└── fonts/                  # Dossier pour les fichiers de polices
    └── README.md           # Instructions détaillées
```

## 🔧 Polices actuellement appliquées

### Titres H1 (font-nakilla)
- **Composants mis à jour** :
  - `HeroSlider.tsx` - Titre principal du slider
  - `ExperiencesSection.tsx` - "Nos Expériences"
  - `BoatsSection.tsx` - "Bateaux disponibles"
  - `AboutUsSection.tsx` - "À propos de nous"
  - `WhyChooseSection.tsx` - Titres de section
  - `dashboard/page.tsx` - "Tableau de bord"

### Sous-titres H2, H3, H4, H5, H6 (font-aviano)
- **Composants mis à jour** :
  - `HeroSlider.tsx` - Sous-titre du slider
  - `ExperiencesSection.tsx` - "Découvrez la Méditerranée"
  - `InfoCardsSection.tsx` - Titres des cartes
  - `WhyChooseSection.tsx` - Sous-titres

## 📥 Comment ajouter les vraies polices

### Étape 1 : Obtenir les fichiers de polices

Vous devez obtenir les polices **Nakilla** et **Aviano** aux formats web :
- `.woff2` (format moderne, recommandé)
- `.woff` (fallback pour navigateurs plus anciens)

### Étape 2 : Nommer les fichiers

Placez les fichiers dans `public/fonts/` avec ces noms exacts :

```
public/fonts/
├── nakilla.woff2
├── nakilla.woff
├── nakilla-bold.woff2
├── nakilla-bold.woff
├── aviano.woff2
├── aviano.woff
├── aviano-bold.woff2
└── aviano-bold.woff
```

### Étape 3 : Mettre à jour fonts.css

Remplacez le contenu de `src/styles/fonts.css` par :

```css
/* Polices personnalisées pour BB Yachts */

/* Police Nakilla pour les titres */
@font-face {
  font-family: 'Nakilla';
  src: url('/fonts/nakilla.woff2') format('woff2'),
       url('/fonts/nakilla.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Nakilla';
  src: url('/fonts/nakilla-bold.woff2') format('woff2'),
       url('/fonts/nakilla-bold.woff') format('woff');
  font-weight: bold;
  font-style: normal;
  font-display: swap;
}

/* Police Aviano pour les sous-titres */
@font-face {
  font-family: 'Aviano';
  src: url('/fonts/aviano.woff2') format('woff2'),
       url('/fonts/aviano.woff') format('woff');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Aviano';
  src: url('/fonts/aviano-bold.woff2') format('woff2'),
       url('/fonts/aviano-bold.woff') format('woff');
  font-weight: bold;
  font-style: normal;
  font-display: swap;
}

/* Variables CSS pour les polices */
:root {
  --font-nakilla: 'Nakilla', var(--font-display), 'Playfair Display', serif;
  --font-aviano: 'Aviano', var(--font-montserrat), 'Montserrat', sans-serif;
  --font-body: var(--font-sans), 'Manrope', system-ui, sans-serif;
}

/* Classes utilitaires pour Tailwind */
.font-nakilla {
  font-family: var(--font-nakilla);
}

.font-aviano {
  font-family: var(--font-aviano);
}

/* Application automatique aux éléments HTML */
h1 {
  font-family: var(--font-nakilla);
  font-weight: bold;
}

h2, h3 {
  font-family: var(--font-aviano);
  font-weight: 600;
}

h4, h5, h6 {
  font-family: var(--font-aviano);
  font-weight: 500;
}

/* Classes spécifiques pour le design */
.title-main {
  font-family: var(--font-nakilla);
  font-weight: bold;
}

.title-section {
  font-family: var(--font-nakilla);
  font-weight: 700;
}

.subtitle {
  font-family: var(--font-aviano);
  font-weight: 600;
}

.subtitle-light {
  font-family: var(--font-aviano);
  font-weight: 400;
}
```

## 🎯 Utilisation dans le code

### Classes Tailwind disponibles

```html
<!-- Titre principal avec Nakilla -->
<h1 className="font-nakilla font-bold text-4xl">Titre principal</h1>

<!-- Sous-titre avec Aviano -->
<h2 className="font-aviano font-semibold text-2xl">Sous-titre</h2>

<!-- Classes CSS personnalisées -->
<div className="title-main">Titre principal</div>
<div className="subtitle">Sous-titre</div>
```

### Application automatique

Les polices sont automatiquement appliquées à tous les éléments HTML :
- `h1` → Nakilla (gras)
- `h2, h3` → Aviano (semi-gras)
- `h4, h5, h6` → Aviano (normal)

## 🔄 Polices de fallback actuelles

En attendant les vraies polices, le système utilise :
- **Nakilla** → Playfair Display (Google Fonts)
- **Aviano** → Montserrat (Google Fonts)

## 🚀 Déploiement

1. **Développement** : Les polices se chargent automatiquement via `npm run dev`
2. **Production** : Assurez-vous que le dossier `public/fonts/` est inclus dans le build
3. **Vérification** : Inspectez les éléments dans le navigateur pour confirmer l'application des polices

## 📝 Notes importantes

- **Licences** : Vérifiez que vous avez les droits d'utilisation pour Nakilla et Aviano
- **Performance** : Les fichiers .woff2 sont plus légers et se chargent plus rapidement
- **Compatibilité** : Les fallbacks garantissent l'affichage même si les polices personnalisées échouent
- **Cache** : Videz le cache du navigateur après avoir ajouté les nouvelles polices

## 🔍 Vérification

Pour vérifier que les polices sont correctement appliquées :

1. Ouvrez les outils de développement (F12)
2. Inspectez un titre H1
3. Dans l'onglet "Computed", vérifiez la propriété `font-family`
4. Vous devriez voir "Nakilla" en premier dans la liste

---

✅ **Configuration terminée** - Il ne reste plus qu'à ajouter les fichiers de polices dans `public/fonts/` !
