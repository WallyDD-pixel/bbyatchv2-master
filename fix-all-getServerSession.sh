#!/bin/bash

# Script pour corriger tous les imports et appels de getServerSession

echo "🔧 Correction des imports et appels de getServerSession..."

# Trouver tous les fichiers TypeScript qui utilisent getServerSession
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  # Vérifier si le fichier contient getServerSession
  if grep -q "getServerSession" "$file"; then
    echo "📝 Traitement de: $file"
    
    # Remplacer les imports depuis "next-auth" vers "@/lib/auth"
    sed -i 's/import { getServerSession } from "next-auth";/import { getServerSession } from "@\/lib\/auth";/g' "$file"
    sed -i "s/import { getServerSession } from 'next-auth';/import { getServerSession } from '@\/lib\/auth';/g" "$file"
    
    # Remplacer les appels avec auth par des appels sans paramètres
    sed -i 's/getServerSession(auth as any)/getServerSession()/g' "$file"
    sed -i "s/getServerSession(auth as any)/getServerSession()/g" "$file"
    sed -i 's/getServerSession(auth)/getServerSession()/g' "$file"
    sed -i "s/getServerSession(auth)/getServerSession()/g" "$file"
    
    # Supprimer les imports de auth s'ils ne sont plus utilisés (ligne seule)
    # On vérifie d'abord si auth est encore utilisé ailleurs dans le fichier
    if ! grep -q "auth" "$file" || grep -q "authOptions\|export.*auth" "$file"; then
      # auth est peut-être encore utilisé, on ne le supprime pas
      :
    else
      # Supprimer les imports de auth inutiles (ligne seule)
      sed -i '/^import { auth } from "@\/lib\/auth";$/d' "$file"
      sed -i "/^import { auth } from '@\/lib\/auth';$/d" "$file"
    fi
    
    echo "✅ $file corrigé"
  fi
done

echo "✅ Tous les fichiers ont été corrigés !"
echo ""
echo "📋 Résumé des changements:"
echo "  - Imports: 'next-auth' → '@/lib/auth'"
echo "  - Appels: getServerSession(auth) → getServerSession()"
