#!/bin/bash

# Script pour installer une version spécifique de npm globalement
# Usage: ./install-npm-version.sh [version]
# Exemple: ./install-npm-version.sh 11.7.0

set -e

VERSION=${1:-11.7.0}

echo "🔧 Installation de npm version $VERSION..."

# Vérifier que sudo est disponible
if ! command -v sudo &> /dev/null; then
    echo "❌ Erreur: sudo n'est pas disponible. Exécutez ce script en tant que root."
    exit 1
fi

# Installer npm globalement avec sudo
sudo npm install -g npm@${VERSION}

# Vérifier l'installation
echo ""
echo "✅ Installation terminée!"
echo "📦 Version de npm installée:"
npm --version

echo ""
echo "✨ npm $VERSION a été installé avec succès!"

