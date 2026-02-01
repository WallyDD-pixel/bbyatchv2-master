#!/bin/bash

# Script d'installation rapide de toutes les protections

echo "🚀 Installation complète de la protection contre le malware"
echo "=========================================================="
echo ""

cd ~/bbyatchv2-master || exit 1

# Rendre tous les scripts exécutables
chmod +x *.sh

# 1. Nettoyer d'abord
echo "1️⃣ Nettoyage du malware existant..."
bash cleanup-malware-complete.sh

# 2. Durcir la sécurité
echo ""
echo "2️⃣ Durcissement de la sécurité..."
bash harden-security.sh

# 3. Vérifier que tout fonctionne
echo ""
echo "3️⃣ Vérification finale..."
bash monitor-malware.sh

echo ""
echo "✅ Installation terminée !"
echo ""
echo "Le système est maintenant protégé avec:"
echo "  - Nettoyage automatique toutes les 5 minutes"
echo "  - Pare-feu UFW activé"
echo "  - fail2ban pour protéger SSH"
echo "  - SSH sécurisé"
echo "  - Monitoring quotidien"
echo ""
