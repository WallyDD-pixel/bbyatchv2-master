#!/bin/bash

# Script à exécuter sur le serveur pour créer le fichier SQL combiné
# Usage: bash deploy/create-migrations-sql-on-server.sh

set -e

OUTPUT_FILE="deploy/all-migrations.sql"

echo "📝 Génération du fichier SQL combiné de toutes les migrations..."

# Vider le fichier de sortie
> "$OUTPUT_FILE"

# Ajouter un en-tête
cat >> "$OUTPUT_FILE" << 'EOF'
-- ============================================
-- Migrations Prisma combinées pour Supabase
-- ============================================
-- Exécutez ce fichier dans Supabase > SQL Editor
-- ============================================

EOF

# Parcourir toutes les migrations dans l'ordre
for migration_dir in prisma/migrations/*/; do
    if [ -d "$migration_dir" ] && [ -f "$migration_dir/migration.sql" ]; then
        migration_name=$(basename "$migration_dir")
        echo "Ajout de: $migration_name"
        
        # Ajouter un commentaire avec le nom de la migration
        echo "" >> "$OUTPUT_FILE"
        echo "-- Migration: $migration_name" >> "$OUTPUT_FILE"
        echo "-- ============================================" >> "$OUTPUT_FILE"
        
        # Ajouter le contenu de la migration
        cat "$migration_dir/migration.sql" >> "$OUTPUT_FILE"
        
        echo "" >> "$OUTPUT_FILE"
    fi
done

echo ""
echo "✅ Fichier généré: $OUTPUT_FILE"
echo ""
echo "📋 Prochaines étapes:"
echo "  1. Ouvrez Supabase > SQL Editor"
echo "  2. Copiez le contenu de $OUTPUT_FILE"
echo "  3. Collez et exécutez dans SQL Editor"
echo "  4. Vérifiez que toutes les tables sont créées"
echo "  5. Déployez l'application: bash deploy/deploy-sans-migrations.sh"







