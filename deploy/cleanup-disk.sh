#!/bin/bash

# Script de nettoyage automatique du disque
# Usage: ./cleanup-disk.sh
# À exécuter régulièrement via cron pour éviter que le disque se remplisse

set -e

echo "🧹 Nettoyage du disque en cours..."

# Fonction pour afficher l'espace disque
show_disk_usage() {
    echo ""
    echo "📊 Espace disque avant nettoyage :"
    df -h | grep -E '^/dev/'
    echo ""
}

# Afficher l'espace avant
show_disk_usage

# Nettoyer les logs anciens (garder les 7 derniers jours)
echo "📝 Nettoyage des logs anciens..."
if [ -d "/var/log" ]; then
    find /var/log -name "*.log" -mtime +7 -delete 2>/dev/null || true
    find /var/log -name "*.gz" -mtime +7 -delete 2>/dev/null || true
    echo "✅ Logs anciens nettoyés"
fi

# Nettoyer les fichiers temporaires
echo "🗑️  Nettoyage des fichiers temporaires..."
rm -rf /tmp/* 2>/dev/null || true
rm -rf /var/tmp/* 2>/dev/null || true
echo "✅ Fichiers temporaires nettoyés"

# Nettoyer les packages apt
echo "📦 Nettoyage des packages apt..."
if command -v apt-get &> /dev/null; then
    apt-get autoremove -y 2>/dev/null || true
    apt-get autoclean 2>/dev/null || true
    echo "✅ Packages apt nettoyés"
fi

# Nettoyer les logs PM2 anciens
echo "🔄 Nettoyage des logs PM2..."
if command -v pm2 &> /dev/null; then
    # Vider les logs PM2 si trop volumineux
    PM2_LOG_SIZE=$(du -sm ~/.pm2/logs 2>/dev/null | cut -f1 || echo "0")
    if [ "$PM2_LOG_SIZE" -gt 100 ]; then
        pm2 flush 2>/dev/null || true
        echo "✅ Logs PM2 vidés (taille: ${PM2_LOG_SIZE}MB)"
    else
        echo "ℹ️  Logs PM2 OK (taille: ${PM2_LOG_SIZE}MB)"
    fi
fi

# Nettoyer les node_modules inutiles dans les projets
echo "📚 Recherche de node_modules volumineux..."
if [ -d "/home/ubuntu" ]; then
    # Trouver les node_modules > 100MB
    find /home/ubuntu -name "node_modules" -type d -exec du -sm {} \; 2>/dev/null | \
        awk '$1 > 100 {print $2}' | \
        while read dir; do
            echo "  ⚠️  node_modules volumineux trouvé: $dir ($(du -sh "$dir" | cut -f1))"
            # Optionnel: supprimer (décommentez si nécessaire)
            # rm -rf "$dir"
        done
fi

# Nettoyer les builds Next.js anciens
echo "🏗️  Recherche de builds Next.js anciens..."
if [ -d "/home/ubuntu/bbyatchv2-master" ]; then
    # Garder seulement le dernier build .next
    if [ -d "/home/ubuntu/bbyatchv2-master/.next" ]; then
        NEXT_SIZE=$(du -sm /home/ubuntu/bbyatchv2-master/.next 2>/dev/null | cut -f1 || echo "0")
        echo "  ℹ️  Taille du build Next.js: ${NEXT_SIZE}MB"
    fi
fi

# Nettoyer les snapshots Docker (si Docker est installé)
if command -v docker &> /dev/null; then
    echo "🐳 Nettoyage Docker..."
    docker system prune -f 2>/dev/null || true
    echo "✅ Docker nettoyé"
fi

# Afficher l'espace après nettoyage
echo ""
echo "📊 Espace disque après nettoyage :"
df -h | grep -E '^/dev/'

# Calculer l'espace libéré
BEFORE=$(df / | tail -1 | awk '{print $3}')
AFTER=$(df / | tail -1 | awk '{print $3}')
FREED=$((BEFORE - AFTER))

echo ""
if [ "$FREED" -gt 0 ]; then
    echo "✅ Nettoyage terminé ! Espace libéré: ~${FREED}KB"
else
    echo "✅ Nettoyage terminé !"
fi

# Avertissement si le disque est encore presque plein
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt 80 ]; then
    echo ""
    echo "⚠️  ATTENTION: Le disque est encore à ${USAGE}% d'utilisation !"
    echo "   Considérez libérer plus d'espace manuellement."
    exit 1
elif [ "$USAGE" -gt 70 ]; then
    echo ""
    echo "⚠️  Le disque est à ${USAGE}% d'utilisation. Surveillez l'espace."
fi

echo ""
echo "✨ Nettoyage terminé avec succès !"

