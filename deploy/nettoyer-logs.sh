#!/bin/bash

# Script de nettoyage automatique des logs pour éviter que le disque se remplisse
# Usage: bash deploy/nettoyer-logs.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🧹 NETTOYAGE DES LOGS"
echo "=========================================="
echo ""

# Vérifier l'espace disque avant
echo -e "${YELLOW}Espace disque AVANT nettoyage:${NC}"
df -h /
echo ""

# 1. Nettoyer les logs systemd-journald
echo -e "${YELLOW}[1/5] Nettoyage des logs systemd-journald...${NC}"
echo "Taille actuelle des logs journal:"
sudo journalctl --disk-usage
echo ""
echo "Nettoyage (conservation de 7 jours ou max 500MB)..."
sudo journalctl --vacuum-time=7d
sudo journalctl --vacuum-size=500M
echo ""
echo "Taille après nettoyage:"
sudo journalctl --disk-usage
echo ""

# 2. Nettoyer les fichiers temporaires
echo -e "${YELLOW}[2/5] Nettoyage des fichiers temporaires...${NC}"
echo "Nettoyage de /tmp et /var/tmp..."
sudo find /tmp -type f -atime +7 -delete 2>/dev/null
sudo find /var/tmp -type f -atime +7 -delete 2>/dev/null
echo "✓ Fait"
echo ""

# 3. Nettoyer les paquets inutilisés
echo -e "${YELLOW}[3/5] Nettoyage des paquets inutilisés...${NC}"
if command -v apt &> /dev/null; then
    sudo apt autoremove -y
    sudo apt autoclean
elif command -v yum &> /dev/null; then
    sudo yum autoremove -y
    sudo yum clean all
fi
echo "✓ Fait"
echo ""

# 4. Nettoyer les logs PM2 si présents
echo -e "${YELLOW}[4/5] Nettoyage des logs PM2...${NC}"
if command -v pm2 &> /dev/null; then
    echo "Taille des logs PM2 avant:"
    du -sh ~/.pm2/logs 2>/dev/null || echo "Pas de logs PM2"
    pm2 flush
    echo "✓ Logs PM2 nettoyés"
else
    echo "PM2 non installé"
fi
echo ""

# 5. Nettoyer les logs Nginx anciens
echo -e "${YELLOW}[5/5] Nettoyage des logs Nginx anciens...${NC}"
if [ -d /var/log/nginx ]; then
    echo "Taille des logs Nginx avant:"
    sudo du -sh /var/log/nginx
    # Garder seulement les 7 derniers jours
    sudo find /var/log/nginx -name "*.log.*" -type f -mtime +7 -delete 2>/dev/null
    echo "✓ Logs Nginx anciens supprimés"
    echo "Taille après:"
    sudo du -sh /var/log/nginx
else
    echo "Nginx non installé"
fi
echo ""

# Vérifier l'espace disque après
echo -e "${YELLOW}Espace disque APRÈS nettoyage:${NC}"
df -h /
echo ""

echo "=========================================="
echo "✅ NETTOYAGE TERMINÉ"
echo "=========================================="
echo ""
echo "Pour automatiser ce nettoyage, ajoutez cette ligne à crontab:"
echo "  0 2 * * 0 bash ~/nettoyer-logs.sh >> /var/log/cleanup.log 2>&1"
echo ""
echo "Cela nettoiera automatiquement tous les dimanches à 2h du matin."
echo ""

