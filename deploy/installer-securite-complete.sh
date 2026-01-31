#!/bin/bash
# Script d'installation complète de la sécurité anti-malware

echo "🔒 === INSTALLATION COMPLÈTE DE LA SÉCURITÉ ==="
echo ""

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "1️⃣ Rendre les scripts exécutables..."
chmod +x deploy/eliminer-malware-complet.sh
chmod +x deploy/monitor-memory-and-malware.sh
chmod +x deploy/verifier-securite-complete.sh
echo -e "${GREEN}✅ Scripts rendus exécutables${NC}"
echo ""

echo "2️⃣ Nettoyage initial des malwares..."
sudo bash deploy/eliminer-malware-complet.sh
echo ""

echo "3️⃣ Installation du monitoring mémoire dans crontab..."
# Installer le monitoring mémoire (toutes les 5 minutes)
(sudo crontab -l 2>/dev/null | grep -v "monitor-memory-and-malware"; echo "*/5 * * * * $PWD/deploy/monitor-memory-and-malware.sh") | sudo crontab -

if sudo crontab -l 2>/dev/null | grep -q "monitor-memory-and-malware"; then
    echo -e "${GREEN}✅ Monitoring mémoire installé dans crontab root${NC}"
    echo "   Détails: $(sudo crontab -l 2>/dev/null | grep monitor-memory-and-malware)"
else
    echo -e "${RED}❌ Échec de l'installation du monitoring mémoire${NC}"
    exit 1
fi
echo ""

echo "4️⃣ Vérification que le script detect-malware.sh est installé..."
if [ -f "/usr/local/bin/detect-malware.sh" ]; then
    echo -e "${GREEN}✅ Script detect-malware.sh existe${NC}"
    if sudo crontab -l 2>/dev/null | grep -q "detect-malware"; then
        echo -e "${GREEN}✅ Script detect-malware.sh installé dans crontab${NC}"
    else
        echo -e "${YELLOW}⚠️  Script detect-malware.sh existe mais n'est pas dans crontab${NC}"
        echo "   Le script eliminer-malware-complet.sh devrait l'installer automatiquement"
    fi
else
    echo -e "${YELLOW}⚠️  Script detect-malware.sh n'existe pas encore${NC}"
    echo "   Il sera créé lors du prochain run de eliminer-malware-complet.sh"
fi
echo ""

echo "5️⃣ Création du répertoire de logs si nécessaire..."
sudo mkdir -p /var/log
sudo touch /var/log/memory-malware-monitor.log
sudo touch /var/log/malware-detection.log
sudo chmod 644 /var/log/memory-malware-monitor.log
sudo chmod 644 /var/log/malware-detection.log
echo -e "${GREEN}✅ Logs créés${NC}"
echo ""

echo "6️⃣ Test du monitoring mémoire..."
echo "   Exécution d'un test..."
sudo bash deploy/monitor-memory-and-malware.sh
echo ""

echo "7️⃣ Vérification finale..."
echo ""
bash deploy/verifier-securite-complete.sh

echo ""
echo "=== INSTALLATION TERMINÉE ==="
echo ""
echo -e "${GREEN}✅ La sécurité anti-malware est maintenant installée!${NC}"
echo ""
echo "📋 Ce qui a été installé:"
echo "   ✅ Script de nettoyage complet (eliminer-malware-complet.sh)"
echo "   ✅ Monitoring mémoire automatique (toutes les 5 minutes)"
echo "   ✅ Détection automatique de malware (toutes les 2 minutes via detect-malware.sh)"
echo ""
echo "📊 Surveiller les logs:"
echo "   sudo tail -f /var/log/memory-malware-monitor.log"
echo "   sudo tail -f /var/log/malware-detection.log"
echo ""
echo "🔍 Vérifier la sécurité:"
echo "   bash deploy/verifier-securite-complete.sh"
echo ""
