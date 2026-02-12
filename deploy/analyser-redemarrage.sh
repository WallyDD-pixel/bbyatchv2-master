#!/bin/bash

# Script pour analyser pourquoi le serveur a redémarré
# Usage: bash deploy/analyser-redemarrage.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "🔍 ANALYSE DU REDÉMARRAGE DU SERVEUR"
echo "=========================================="
echo ""

# 1. Informations sur le dernier redémarrage
echo -e "${YELLOW}[1/10] Informations sur le redémarrage...${NC}"
echo "Uptime actuel:"
uptime
echo ""
echo "Date/heure du dernier boot:"
who -b 2>/dev/null || last reboot | head -1
echo ""
echo "Heure actuelle:"
date
echo ""

# 2. Vérifier l'espace disque (cause probable)
echo -e "${YELLOW}[2/10] Utilisation disque...${NC}"
df -h
echo ""
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo -e "${RED}⚠️  DISQUE QUASI PLEIN ($DISK_USAGE%) - C'est probablement la cause du problème!${NC}"
elif [ "$DISK_USAGE" -gt 80 ]; then
    echo -e "${YELLOW}⚠️  Disque presque plein ($DISK_USAGE%)${NC}"
else
    echo -e "${GREEN}✓ Espace disque OK ($DISK_USAGE%)${NC}"
fi
echo ""

# 3. Vérifier les logs système pour les erreurs avant le redémarrage
echo -e "${YELLOW}[3/10] Logs système avant le redémarrage...${NC}"
if [ -f /var/log/syslog ]; then
    echo "Dernières lignes de syslog avant redémarrage:"
    sudo tail -50 /var/log/syslog | grep -E "(error|Error|ERROR|fail|Fail|FAIL|panic|Panic|OOM|out of memory|disk full)" || echo "Aucune erreur trouvée dans les dernières lignes"
elif [ -f /var/log/messages ]; then
    echo "Dernières lignes de messages avant redémarrage:"
    sudo tail -50 /var/log/messages | grep -E "(error|Error|ERROR|fail|Fail|FAIL|panic|Panic|OOM|out of memory|disk full)" || echo "Aucune erreur trouvée"
fi
echo ""

# 4. Vérifier les logs journalctl pour les erreurs critiques
echo -e "${YELLOW}[4/10] Erreurs critiques dans journalctl...${NC}"
echo "Erreurs des dernières 24h:"
sudo journalctl --since "24 hours ago" -p err --no-pager | tail -30 || echo "Impossible d'accéder aux logs journalctl"
echo ""

# 5. Vérifier les logs de redémarrage
echo -e "${YELLOW}[5/10] Historique des redémarrages...${NC}"
if [ -f /var/log/wtmp ]; then
    last reboot | head -5
else
    echo "Fichier wtmp non disponible"
fi
echo ""

# 6. Vérifier les logs d'erreurs kernel
echo -e "${YELLOW}[6/10] Erreurs kernel récentes...${NC}"
if [ -f /var/log/kern.log ]; then
    sudo tail -50 /var/log/kern.log | grep -E "(error|Error|ERROR|fail|Fail|panic|Panic|OOM)" || echo "Aucune erreur kernel trouvée"
elif command -v dmesg &> /dev/null; then
    echo "Derniers messages kernel:"
    dmesg | tail -30 | grep -E "(error|Error|ERROR|fail|Fail|panic|Panic|OOM|out of memory)" || echo "Aucune erreur kernel trouvée"
fi
echo ""

# 7. Vérifier les problèmes avec systemd-journald (vu dans vos logs)
echo -e "${YELLOW}[7/10] Problèmes systemd-journald...${NC}"
echo "Statut de systemd-journald:"
sudo systemctl status systemd-journald --no-pager | head -15
echo ""
echo "Espace utilisé par les logs journal:"
sudo journalctl --disk-usage
echo ""
echo "Vérification des erreurs journald:"
sudo journalctl -u systemd-journald --since "7 days ago" --no-pager | grep -E "(error|Error|ERROR|fail|Fail|deleted|removed)" | tail -20 || echo "Aucune erreur récente"
echo ""

# 8. Vérifier les gros fichiers qui pourraient remplir le disque
echo -e "${YELLOW}[8/10] Top 10 plus gros fichiers/dossiers...${NC}"
echo "Recherche des gros fichiers (peut prendre du temps)..."
sudo du -h / 2>/dev/null | sort -rh | head -10
echo ""

# 9. Vérifier les logs volumineux
echo -e "${YELLOW}[9/10] Taille des fichiers de logs...${NC}"
echo "Taille des fichiers de logs principaux:"
sudo du -sh /var/log/* 2>/dev/null | sort -rh | head -10
echo ""

# 10. Vérifier les processus qui consomment beaucoup de ressources
echo -e "${YELLOW}[10/10] Processus consommant le plus de ressources...${NC}"
echo "Top 5 CPU:"
ps aux --sort=-%cpu | head -6
echo ""
echo "Top 5 Mémoire:"
ps aux --sort=-%mem | head -6
echo ""

echo "=========================================="
echo "📋 RÉSUMÉ ET RECOMMANDATIONS"
echo "=========================================="
echo ""

# Analyse automatique
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
JOURNAL_SIZE=$(sudo journalctl --disk-usage 2>/dev/null | awk '{print $3}' | head -1)

echo "Utilisation disque: ${DISK_USAGE}%"
if [ ! -z "$JOURNAL_SIZE" ]; then
    echo "Taille des logs journal: $JOURNAL_SIZE"
fi
echo ""

if [ "$DISK_USAGE" -gt 90 ]; then
    echo -e "${RED}🚨 PROBLÈME CRITIQUE: Disque presque plein!${NC}"
    echo ""
    echo "Actions immédiates recommandées:"
    echo "  1. Nettoyer les logs anciens:"
    echo "     sudo journalctl --vacuum-time=7d"
    echo "     sudo journalctl --vacuum-size=500M"
    echo ""
    echo "  2. Supprimer les fichiers temporaires:"
    echo "     sudo rm -rf /tmp/*"
    echo "     sudo rm -rf /var/tmp/*"
    echo ""
    echo "  3. Nettoyer les paquets inutilisés:"
    echo "     sudo apt autoremove -y"
    echo "     sudo apt autoclean"
    echo ""
    echo "  4. Trouver et supprimer les gros fichiers:"
    echo "     sudo du -h / | sort -rh | head -20"
    echo ""
fi

echo ""
echo "Commandes utiles pour prévenir les redémarrages:"
echo "  - Surveiller l'espace disque: watch -n 60 'df -h'"
echo "  - Nettoyer automatiquement les logs: sudo journalctl --vacuum-time=7d"
echo "  - Voir les logs en temps réel: sudo journalctl -f"
echo "  - Vérifier les erreurs système: sudo journalctl -p err"
echo ""

