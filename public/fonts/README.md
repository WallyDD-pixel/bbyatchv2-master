# Polices personnalisées pour BB Yachts

Ce dossier contient les polices personnalisées utilisées sur le site BB Yachts.

## Polices requises

### Nakilla (pour les titres H1)
- `nakilla.woff2` et `nakilla.woff` (poids normal)
- `nakilla-bold.woff2` et `nakilla-bold.woff` (poids gras)

### Aviano (pour les sous-titres H2, H3, H4, H5, H6)
- `aviano.woff2` et `aviano.woff` (poids normal)
- `aviano-bold.woff2` et `aviano-bold.woff` (poids gras)

## Installation

1. Obtenez les fichiers de polices Nakilla et Aviano (avec licence appropriée)
2. Convertissez-les au format web si nécessaire (.woff2 et .woff)
3. Placez les fichiers dans ce dossier avec les noms exacts listés ci-dessus
4. Les polices seront automatiquement chargées via le CSS

## Formats supportés

- **WOFF2** : Format moderne, compression optimale (recommandé)
- **WOFF** : Format de fallback pour les navigateurs plus anciens

## Utilisation dans le code

### Classes Tailwind disponibles
- `font-nakilla` : Applique la police Nakilla
- `font-aviano` : Applique la police Aviano

### Classes CSS personnalisées
- `.title-main` : Titre principal (Nakilla, gras)
- `.title-section` : Titre de section (Nakilla, gras)
- `.subtitle` : Sous-titre (Aviano, semi-gras)
- `.subtitle-light` : Sous-titre léger (Aviano, normal)

### Application automatique
Les polices sont automatiquement appliquées aux éléments HTML :
- `h1` → Nakilla (gras)
- `h2, h3` → Aviano (semi-gras)
- `h4, h5, h6` → Aviano (normal)

## Fallbacks

Si les polices personnalisées ne se chargent pas :
- Nakilla → Playfair Display → serif
- Aviano → Manrope → sans-serif
