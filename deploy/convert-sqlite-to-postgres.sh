#!/bin/bash

# Script pour convertir les migrations SQLite en PostgreSQL
# Usage: bash deploy/convert-sqlite-to-postgres.sh

set -e

OUTPUT_FILE="deploy/all-migrations-postgres.sql"

echo "🔄 Conversion des migrations SQLite vers PostgreSQL..."

# Vider le fichier de sortie
> "$OUTPUT_FILE"

# Ajouter un en-tête
cat >> "$OUTPUT_FILE" << 'EOF'
-- ============================================
-- Migrations Prisma converties pour PostgreSQL (Supabase)
-- ============================================
-- Exécutez ce fichier dans Supabase > SQL Editor
-- ============================================

EOF

# Parcourir toutes les migrations dans l'ordre
for migration_dir in prisma/migrations/*/; do
    if [ -d "$migration_dir" ] && [ -f "$migration_dir/migration.sql" ]; then
        migration_name=$(basename "$migration_dir")
        echo "Conversion de: $migration_name"
        
        # Ajouter un commentaire avec le nom de la migration
        echo "" >> "$OUTPUT_FILE"
        echo "-- Migration: $migration_name" >> "$OUTPUT_FILE"
        echo "-- ============================================" >> "$OUTPUT_FILE"
        
        # Lire le fichier et convertir
        cat "$migration_dir/migration.sql" | \
        # Convertir AUTOINCREMENT en SERIAL
        sed 's/AUTOINCREMENT/SERIAL/g' | \
        # Convertir DATETIME en TIMESTAMP
        sed 's/DATETIME/TIMESTAMP/g' | \
        # Supprimer les lignes PRAGMA (spécifique à SQLite)
        grep -v '^PRAGMA' | \
        # Convertir DEFAULT CURRENT_TIMESTAMP en DEFAULT NOW()
        sed 's/DEFAULT CURRENT_TIMESTAMP/DEFAULT NOW()/g' | \
        # Convertir DEFAULT true en DEFAULT TRUE (PostgreSQL préfère majuscules)
        sed 's/DEFAULT true/DEFAULT TRUE/g' | \
        # Convertir DEFAULT false en DEFAULT FALSE
        sed 's/DEFAULT false/DEFAULT FALSE/g' | \
        # Supprimer les commentaires de warning SQLite
        sed '/^\/\*/,/^\*\//d' | \
        # Nettoyer les lignes vides multiples
        sed '/^$/N;/^\n$/d' >> "$OUTPUT_FILE"
        
        echo "" >> "$OUTPUT_FILE"
    fi
done

echo ""
echo "✅ Fichier PostgreSQL généré: $OUTPUT_FILE"
echo ""
echo "📋 Prochaines étapes:"
echo "  1. Ouvrez Supabase > SQL Editor"
echo "  2. Copiez le contenu de $OUTPUT_FILE"
echo "  3. Collez et exécutez dans SQL Editor"
echo "  4. Vérifiez que toutes les tables sont créées"








