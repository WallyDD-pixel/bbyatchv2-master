#!/bin/bash
# Script pour corriger tous les imports et appels de getServerSession

cd "$(dirname "$0")"

# Trouver tous les fichiers TypeScript dans src/app/api
find src/app/api -type f -name "*.ts" | while read file; do
  # Remplacer les imports
  sed -i 's/import { getServerSession } from "next-auth";/import { getServerSession } from "@\/lib\/auth";/g' "$file"
  sed -i "s/import { getServerSession } from 'next-auth';/import { getServerSession } from '@\/lib\/auth';/g" "$file"
  
  # Supprimer les imports de auth qui ne sont plus nécessaires
  sed -i '/^import { auth } from "@\/lib\/auth";$/d' "$file"
  sed -i "/^import { auth } from '@\/lib\/auth';$/d" "$file"
  
  # Remplacer les appels getServerSession(auth as any) par getServerSession()
  sed -i 's/getServerSession(auth as any)/getServerSession()/g' "$file"
  sed -i "s/getServerSession(auth)/getServerSession()/g" "$file"
  
  echo "✅ Corrigé: $file"
done

echo "✅ Tous les fichiers ont été corrigés !"
