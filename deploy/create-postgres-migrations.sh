#!/bin/bash

# Script pour créer les migrations PostgreSQL depuis SQLite
# Usage: bash deploy/create-postgres-migrations.sh

set -e

OUTPUT_FILE="deploy/all-migrations-postgres.sql"

echo "🔄 Création des migrations PostgreSQL pour Supabase..."

> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'
-- ============================================
-- Migrations Prisma pour PostgreSQL (Supabase)
-- ============================================
-- Exécutez ce fichier dans Supabase > SQL Editor
-- ============================================

EOF

for migration_dir in prisma/migrations/*/; do
    if [ -d "$migration_dir" ] && [ -f "$migration_dir/migration.sql" ]; then
        migration_name=$(basename "$migration_dir")
        echo "Traitement de: $migration_name"
        
        echo "" >> "$OUTPUT_FILE"
        echo "-- Migration: $migration_name" >> "$OUTPUT_FILE"
        echo "-- ============================================" >> "$OUTPUT_FILE"
        
        # Lire et convertir le fichier
        while IFS= read -r line; do
            # Ignorer les lignes PRAGMA
            if [[ "$line" =~ ^PRAGMA ]]; then
                continue
            fi
            
            # Ignorer les commentaires de warning SQLite
            if [[ "$line" =~ ^/\* ]] || [[ "$line" =~ ^\*/ ]]; then
                continue
            fi
            
            # Convertir AUTOINCREMENT en SERIAL
            line="${line//AUTOINCREMENT/SERIAL}"
            
            # Convertir DATETIME en TIMESTAMP
            line="${line//DATETIME/TIMESTAMP}"
            
            # Convertir DEFAULT CURRENT_TIMESTAMP en DEFAULT NOW()
            line="${line//DEFAULT CURRENT_TIMESTAMP/DEFAULT NOW()}"
            
            # Convertir DEFAULT true en DEFAULT TRUE
            line="${line//DEFAULT true/DEFAULT TRUE}"
            line="${line//DEFAULT false/DEFAULT FALSE}"
            
            # Pour les tables avec DEFAULT 1, utiliser SERIAL avec valeur initiale
            if [[ "$line" =~ "DEFAULT 1" ]] && [[ "$line" =~ "PRIMARY KEY" ]]; then
                line="${line//SERIAL DEFAULT 1/SERIAL}"
                # Ajouter une séquence après la création de table
                echo "$line" >> "$OUTPUT_FILE"
                if [[ "$line" =~ "CREATE TABLE" ]]; then
                    table_name=$(echo "$line" | sed -n 's/.*CREATE TABLE "\([^"]*\)".*/\1/p')
                    if [ -n "$table_name" ] && [[ "$migration_name" == *"baseline"* ]]; then
                        echo "SELECT setval(pg_get_serial_sequence('\"$table_name\"', 'id'), 1, false);" >> "$OUTPUT_FILE"
                    fi
                fi
                continue
            fi
            
            # Écrire la ligne convertie
            echo "$line" >> "$OUTPUT_FILE"
        done < "$migration_dir/migration.sql"
        
        echo "" >> "$OUTPUT_FILE"
    fi
done

echo ""
echo "✅ Fichier PostgreSQL généré: $OUTPUT_FILE"
echo ""
echo "⚠️  IMPORTANT: Vérifiez manuellement le fichier avant de l'exécuter dans Supabase"
echo "   Certaines conversions peuvent nécessiter des ajustements"




