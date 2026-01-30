#!/bin/bash

# Script pour analyser en détail tous les packages npm avec postinstall
# Usage: bash deploy/analyser-packages-postinstall.sh

echo "=== ANALYSE DES PACKAGES NPM AVEC POSTINSTALL ==="
echo ""

PROJECT_DIR="$HOME/bbyatchv2-master"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Répertoire du projet non trouvé: $PROJECT_DIR"
    exit 1
fi

# Trouver tous les package.json avec postinstall
echo "Recherche des packages avec scripts postinstall..."
PACKAGES=$(find "$PROJECT_DIR/node_modules" -name "package.json" -exec grep -l '"postinstall"' {} \; 2>/dev/null)

if [ -z "$PACKAGES" ]; then
    echo "✅ Aucun package avec postinstall trouvé"
    exit 0
fi

PACKAGE_COUNT=$(echo "$PACKAGES" | wc -l)
echo "📦 $PACKAGE_COUNT package(s) avec postinstall trouvé(s)"
echo ""

SUSPICIOUS_COUNT=0

# Analyser chaque package
echo "$PACKAGES" | while read pkg_file; do
    # Extraire le nom du package depuis le chemin
    PACKAGE_NAME=$(echo "$pkg_file" | sed "s|$PROJECT_DIR/node_modules/||" | sed "s|/package.json||" | cut -d'/' -f1-2)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Package: $PACKAGE_NAME"
    echo "📍 Fichier: $pkg_file"
    echo ""
    
    # Extraire le script postinstall
    POSTINSTALL_SCRIPT=$(grep -A 20 '"postinstall"' "$pkg_file" | head -25)
    
    if [ ! -z "$POSTINSTALL_SCRIPT" ]; then
        echo "📝 Script postinstall:"
        echo "$POSTINSTALL_SCRIPT" | sed 's/^/  /'
        echo ""
        
        # Vérifier les patterns suspects
        SUSPICIOUS=false
        
        # Vérifier wget/curl avec URLs
        if echo "$POSTINSTALL_SCRIPT" | grep -E "wget.*http|curl.*http" >/dev/null 2>&1; then
            echo "⚠️  ALERTE: Contient wget/curl avec URL HTTP"
            SUSPICIOUS=true
        fi
        
        # Vérifier l'IP suspecte
        if echo "$POSTINSTALL_SCRIPT" | grep "178.16.52.253" >/dev/null 2>&1; then
            echo "🚨 ALERTE CRITIQUE: Contient l'IP suspecte 178.16.52.253"
            SUSPICIOUS=true
        fi
        
        # Vérifier "1utig"
        if echo "$POSTINSTALL_SCRIPT" | grep "1utig" >/dev/null 2>&1; then
            echo "🚨 ALERTE CRITIQUE: Contient '1utig'"
            SUSPICIOUS=true
        fi
        
        # Vérifier les pipes vers sh
        if echo "$POSTINSTALL_SCRIPT" | grep -E "\|.*sh|\|.*bash" >/dev/null 2>&1; then
            echo "⚠️  ALERTE: Contient un pipe vers sh/bash"
            SUSPICIOUS=true
        fi
        
        # Vérifier les commandes système suspectes
        if echo "$POSTINSTALL_SCRIPT" | grep -E "eval|exec|system|spawn" >/dev/null 2>&1; then
            echo "⚠️  ALERTE: Contient des commandes système potentiellement dangereuses"
            SUSPICIOUS=true
        fi
        
        if [ "$SUSPICIOUS" = true ]; then
            SUSPICIOUS_COUNT=$((SUSPICIOUS_COUNT + 1))
            echo "❌ PACKAGE SUSPECT DÉTECTÉ!"
        else
            echo "✅ Script postinstall semble normal"
        fi
    else
        echo "⚠️  Script postinstall non trouvé ou vide"
    fi
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Résumé:"
echo "   Total packages avec postinstall: $PACKAGE_COUNT"
echo "   Packages suspects: $SUSPICIOUS_COUNT"
echo ""

if [ $SUSPICIOUS_COUNT -gt 0 ]; then
    echo "🚨 ATTENTION: Des packages suspects ont été détectés!"
    echo "   Il est recommandé de:"
    echo "   1. Supprimer node_modules: rm -rf $PROJECT_DIR/node_modules"
    echo "   2. Supprimer package-lock.json: rm -f $PROJECT_DIR/package-lock.json"
    echo "   3. Réinstaller: cd $PROJECT_DIR && npm install"
    echo "   4. Vérifier à nouveau avec ce script"
else
    echo "✅ Aucun package suspect détecté dans les scripts postinstall"
fi
