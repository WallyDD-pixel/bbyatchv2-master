#!/bin/bash

# Script pour remplacer tous les imports de getServerSession de next-auth par @/lib/auth

echo "Recherche des fichiers à modifier..."

# Trouver tous les fichiers qui importent getServerSession de next-auth
files=$(grep -r "import.*getServerSession.*from.*['\"]next-auth['\"]" src --include="*.ts" --include="*.tsx" -l)

echo "Fichiers trouvés: $(echo "$files" | wc -l)"

# Pour chaque fichier
for file in $files; do
  echo "Modification de $file..."
  
  # Vérifier si auth est déjà importé depuis @/lib/auth
  if grep -q "import.*auth.*from.*['\"]@/lib/auth['\"]" "$file"; then
    # Si auth est déjà importé, ajouter getServerSession à cet import
    sed -i "s/import { auth }/import { auth, getServerSession }/g" "$file"
    sed -i "s/import { auth, /import { auth, getServerSession, /g" "$file" 2>/dev/null || true
    # Supprimer l'ancien import de getServerSession de next-auth
    sed -i "/import { getServerSession } from ['\"]next-auth['\"]/d" "$file"
    sed -i "/import { getServerSession } from [\"']next-auth[\"']/d" "$file"
  else
    # Remplacer l'import de next-auth par @/lib/auth
    sed -i "s/import { getServerSession } from ['\"]next-auth['\"]/import { getServerSession } from '@\/lib\/auth'/g" "$file"
    sed -i "s/import { getServerSession } from [\"']next-auth[\"']/import { getServerSession } from '@\/lib\/auth'/g" "$file"
  fi
  
  # Remplacer getServerSession(auth as any) par getServerSession()
  sed -i "s/getServerSession(auth as any)/getServerSession()/g" "$file"
  sed -i "s/getServerSession(auth)/getServerSession()/g" "$file"
done

echo "Terminé !"
