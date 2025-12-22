# Solution Simple - Pas de Compilation Native

## 🎯 Le Problème

Votre app est juste du TypeScript/Next.js, mais `npm install` essaie de compiler `esbuild` (une dépendance de Next.js) en binaire natif, ce qui nécessite beaucoup de mémoire.

## ✅ Solution Simple

Au lieu de compiler esbuild, on utilise un **binaire précompilé** qui existe déjà.

### Option 1: Script Automatique (Recommandé)

```bash
cd ~/bbyatchv2-master
bash deploy/install-simple.sh
```

Ce script :
1. ✅ Installe esbuild avec un binaire précompilé (pas de compilation)
2. ✅ Installe le reste avec `--ignore-scripts` (évite les scripts problématiques)
3. ✅ Exécute seulement les scripts essentiels après

### Option 2: Manuel (Une Ligne)

```bash
cd ~/bbyatchv2-master

# Installer esbuild d'abord (binaire précompilé)
npm install esbuild@latest --save-dev --legacy-peer-deps --no-audit

# Installer le reste sans scripts post-install
npm install --legacy-peer-deps --no-audit --ignore-scripts

# Rebuild seulement ce qui est nécessaire
npm rebuild
```

## 🔍 Pourquoi ça marche?

- `esbuild` a des **binaires précompilés** pour toutes les plateformes
- En l'installant explicitement d'abord, npm utilise le binaire au lieu de compiler
- `--ignore-scripts` évite d'exécuter les scripts post-install qui pourraient compiler d'autres choses
- `npm rebuild` exécute seulement les scripts vraiment nécessaires

## 🚀 Après l'Installation

Une fois installé, relancez le déploiement normal :

```bash
bash deploy/deploy.sh
```

Le script de déploiement a été mis à jour pour utiliser cette méthode automatiquement.

## 💡 Alternative: Utiliser Turbopack

Next.js 15 supporte Turbopack qui évite esbuild :

```bash
# Dans package.json, utilisez:
npm run build:turbo  # au lieu de npm run build
```

Mais ce n'est pas nécessaire si la solution simple fonctionne.

## 📝 Note

Cette solution évite complètement le problème de mémoire car :
- ✅ Pas de compilation Go (esbuild est écrit en Go)
- ✅ Utilise des binaires précompilés
- ✅ Moins de scripts post-install = moins de mémoire utilisée

