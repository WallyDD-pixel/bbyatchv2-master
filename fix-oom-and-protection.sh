#!/bin/bash

set -e

echo "🔧 CORRECTION OOM ET PROTECTION MALWARE"
echo "========================================"

# 1. CRÉER LE SWAP (1GB)
echo ""
echo "📦 Création du swap (1GB)..."
if [ ! -f /swapfile ]; then
    sudo dd if=/dev/zero of=/swapfile bs=1M count=1024 status=progress
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    
    # Rendre permanent
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    fi
    
    echo "✅ Swap créé et activé"
else
    echo "⚠️  Swap existe déjà, activation..."
    sudo swapon /swapfile 2>/dev/null || true
fi

# Vérifier
echo ""
echo "💾 État de la mémoire:"
free -h

# 2. PROTECTION CONTRE LE MALWARE
echo ""
echo "🛡️  Installation de la protection contre system-check..."

# Créer le service
sudo tee /etc/systemd/system/block-system-check.service > /dev/null << 'EOF'
[Unit]
Description=Bloque le malware system-check
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'pkill -9 system-check 2>/dev/null; rm -f /var/tmp/system-check /tmp/system-check /var/tmp/system-check.log /tmp/system-check.log 2>/dev/null'
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Créer le timer
sudo tee /etc/systemd/system/block-system-check.timer > /dev/null << 'EOF'
[Unit]
Description=Timer pour bloquer system-check
Requires=block-system-check.service

[Timer]
OnBootSec=10s
OnUnitActiveSec=1min
Unit=block-system-check.service

[Install]
WantedBy=timers.target
EOF

# Activer
sudo systemctl daemon-reload
sudo systemctl enable block-system-check.timer
sudo systemctl start block-system-check.timer

echo "✅ Protection installée"

# Vérifier
echo ""
echo "🔍 État de la protection:"
sudo systemctl status block-system-check.timer --no-pager -l | head -10

# 3. NETTOYER LE MALWARE SI PRÉSENT (AGRESSIF)
echo ""
echo "🧹 Nettoyage agressif du malware system-check..."

# Tuer tous les processus
echo "  → Arrêt des processus..."
pkill -9 system-check 2>/dev/null || true
ps aux | grep system-check | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
sleep 2

# Supprimer tous les fichiers
echo "  → Suppression des fichiers..."
sudo rm -f /var/tmp/system-check /tmp/system-check 2>/dev/null || true
sudo rm -f /var/tmp/system-check.log /tmp/system-check.log 2>/dev/null || true
sudo find /var/tmp /tmp /home -name "*system-check*" -type f -delete 2>/dev/null || true
sudo find /var/tmp /tmp /home -name "*system*check*" -type f -delete 2>/dev/null || true

# Vérifier les crontabs
echo "  → Vérification des crontabs..."
sudo grep -r "system-check" /etc/cron* 2>/dev/null | while read line; do
    echo "    ⚠️  Trouvé dans crontab: $line"
done || true

# Vérifier les services systemd
echo "  → Vérification des services..."
sudo systemctl list-unit-files | grep -i system-check || true

# Vérifier les processus restants
echo "  → Vérification finale..."
if ps aux | grep -E "system-check|318032" | grep -v grep; then
    echo "    ⚠️  ATTENTION: Des processus suspects sont encore actifs!"
    ps aux | grep -E "system-check|318032" | grep -v grep
else
    echo "    ✅ Aucun processus malware détecté"
fi

echo "✅ Nettoyage terminé"

# 4. REDÉMARRER PM2 AVEC NOUVELLE CONFIG
echo ""
echo "🔄 Redémarrage de PM2 avec nouvelle configuration..."
cd "$(dirname "$0")"

# Arrêter PM2
pm2 stop bbyatch 2>/dev/null || true
pm2 delete bbyatch 2>/dev/null || true

# Redémarrer avec nouvelle config
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ PM2 redémarré"

# Attendre un peu
sleep 5

# Vérifier
echo ""
echo "📊 État de PM2:"
pm2 list

echo ""
echo "📋 Logs récents (10 lignes):"
pm2 logs bbyatch --lines 10 --nostream || true

# 5. VÉRIFICATION FINALE
echo ""
echo "✅ VÉRIFICATIONS FINALES"
echo "========================"
echo ""
echo "💾 Mémoire (avec swap):"
free -h

echo ""
echo "🔍 Processus system-check:"
ps aux | grep system-check | grep -v grep || echo "✅ Aucun processus system-check trouvé"

echo ""
echo "🛡️  Protection active:"
sudo systemctl is-active block-system-check.timer && echo "✅ Protection active" || echo "⚠️  Protection inactive"

echo ""
echo "🚀 PM2:"
pm2 list | grep bbyatch || echo "⚠️  PM2 ne gère pas bbyatch"

echo ""
echo "✅ TERMINÉ!"
echo ""
echo "📝 Commandes utiles:"
echo "  - Voir les logs PM2: pm2 logs bbyatch"
echo "  - Voir l'état mémoire: free -h"
echo "  - Vérifier la protection: sudo systemctl status block-system-check.timer"
echo "  - Vérifier le swap: swapon --show"
