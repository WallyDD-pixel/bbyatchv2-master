# Résolution du conflit de dépendances

## Problème

Conflit entre `nodemailer@7.0.12` et `next-auth@4.24.11` qui demande `nodemailer@^6.6.5`.

## Solution appliquée

Downgrade de `nodemailer` vers la version `^6.9.15` qui est compatible avec `next-auth@4.24.11`.

## Alternative (si nécessaire)

Si vous devez absolument utiliser nodemailer 7.x, vous pouvez:

```bash
npm install --legacy-peer-deps
```

Cela installera les dépendances en ignorant les conflits de peer dependencies. nodemailer 7.x est généralement rétrocompatible avec 6.x pour l'usage basique.

## Installation

```bash
npm install
```

Les nouvelles dépendances de sécurité seront installées:
- validator
- zod
- sanitize-html
- zxcvbn
