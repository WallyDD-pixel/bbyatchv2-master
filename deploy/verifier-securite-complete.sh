#!/bin/bash
# Script de vérification complète de la sécurité anti-malware

echo "🔒 === VÉRIFICATION COMPLÈTE DE LA SÉCURITÉ ==="
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
OK=0
WARN=0
ERROR=0

# Fonction de vérification
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        ((OK++))
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        ((ERROR++))
        return 1
    fi
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARN++))
}

echo "1️⃣ Vérification des scripts de sécurité..."
echo ""

# Vérifier que les scripts existent
[ -f "deploy/eliminer-malware-complet.sh" ] && check "Script eliminer-malware-complet.sh existe" || ERROR++
[ -f "deploy/monitor-memory-and-malware.sh" ] && check "Script monitor-memory-and-malware.sh existe" || ERROR++

# Vérifier que les scripts sont exécutables
[ -x "deploy/eliminer-malware-complet.sh" ] && check "Script eliminer-malware-complet.sh est exécutable" || warn "Script eliminer-malware-complet.sh n'est pas exécutable (chmod +x)"
[ -x "deploy/monitor-memory-and-malware.sh" ] && check "Script monitor-memory-and-malware.sh est exécutable" || warn "Script monitor-memory-and-malware.sh n'est pas exécutable (chmod +x)"

echo ""
echo "2️⃣ Vérification des crontabs..."
echo ""

# Vérifier le monitoring mémoire dans crontab root
if sudo crontab -l 2>/dev/null | grep -q "monitor-memory-and-malware"; then
    check "Monitoring mémoire installé dans crontab root"
    echo "   Détails: $(sudo crontab -l 2>/dev/null | grep monitor-memory-and-malware)"
else
    warn "Monitoring mémoire NON installé dans crontab root"
    echo "   Commande à exécuter:"
    echo "   (sudo crontab -l 2>/dev/null | grep -v monitor-memory-and-malware; echo '*/5 * * * * /home/ec2-user/bbyatchv2-master/deploy/monitor-memory-and-malware.sh') | sudo crontab -"
fi

# Vérifier le script de détection dans crontab root
if sudo crontab -l 2>/dev/null | grep -q "detect-malware"; then
    check "Script detect-malware.sh installé dans crontab root"
    echo "   Détails: $(sudo crontab -l 2>/dev/null | grep detect-malware)"
else
    warn "Script detect-malware.sh NON installé dans crontab root"
    echo "   Le script eliminer-malware-complet.sh devrait l'installer automatiquement"
fi

echo ""
echo "3️⃣ Vérification des processus malveillants actifs..."
echo ""

# Vérifier les processus
MALWARE_FOUND=false
for pattern in xmrig monero moneroocean systemwatcher systemdpw system-check scanner_linux; do
    if pgrep -f "$pattern" > /dev/null 2>&1; then
        echo -e "${RED}❌ Processus malveillant détecté: $pattern${NC}"
        ps aux | grep -E "$pattern" | grep -v grep
        MALWARE_FOUND=true
        ((ERROR++))
    fi
done

if [ "$MALWARE_FOUND" = false ]; then
    check "Aucun processus malveillant détecté"
fi

echo ""
echo "4️⃣ Vérification des répertoires malveillants..."
echo ""

# Vérifier les répertoires
DIRS_FOUND=false
for dir in ~/moneroocean /root/moneroocean /tmp/moneroocean /var/tmp/moneroocean /opt/moneroocean /tmp/.systemdpw /root/.systemdpw ~/.systemdpw /tmp/.system /root/.system ~/.system; do
    if [ -d "$dir" ] || [ -f "$dir" ]; then
        echo -e "${RED}❌ Répertoire/fichier suspect détecté: $dir${NC}"
        DIRS_FOUND=true
        ((ERROR++))
    fi
done

if [ "$DIRS_FOUND" = false ]; then
    check "Aucun répertoire malveillant détecté"
fi

echo ""
echo "5️⃣ Vérification des crontabs suspects..."
echo ""

# Vérifier les crontabs
CRON_FOUND=false

# Crontab root
if sudo crontab -l 2>/dev/null | grep -qE "xmrig|monero|systemwatcher|systemdpw|system-check|scanner_linux|curl.*sh|wget.*sh"; then
    echo -e "${RED}❌ Crontab root suspect détecté!${NC}"
    sudo crontab -l 2>/dev/null | grep -E "xmrig|monero|systemwatcher|systemdpw|system-check|scanner_linux|curl.*sh|wget.*sh"
    CRON_FOUND=true
    ((ERROR++))
fi

# Crontab utilisateur
if crontab -l 2>/dev/null | grep -qE "xmrig|monero|systemwatcher|systemdpw|system-check|scanner_linux|curl.*sh|wget.*sh"; then
    echo -e "${RED}❌ Crontab utilisateur suspect détecté!${NC}"
    crontab -l 2>/dev/null | grep -E "xmrig|monero|systemwatcher|systemdpw|system-check|scanner_linux|curl.*sh|wget.*sh"
    CRON_FOUND=true
    ((ERROR++))
fi

if [ "$CRON_FOUND" = false ]; then
    check "Aucun crontab suspect détecté"
fi

echo ""
echo "6️⃣ Vérification des services systemd suspects..."
echo ""

# Vérifier les services
SERVICE_FOUND=false
for service in moneroocean_miner xmrig miner monero systemwatcher systemdpw system-check scanner_linux; do
    if sudo systemctl list-units --all 2>/dev/null | grep -q "$service"; then
        echo -e "${RED}❌ Service suspect détecté: $service${NC}"
        SERVICE_FOUND=true
        ((ERROR++))
    fi
done

if [ "$SERVICE_FOUND" = false ]; then
    check "Aucun service suspect détecté"
fi

echo ""
echo "7️⃣ Vérification des logs de monitoring..."
echo ""

# Vérifier les logs
if [ -f "/var/log/memory-malware-monitor.log" ]; then
    check "Log de monitoring mémoire existe"
    echo "   Dernières lignes:"
    sudo tail -3 /var/log/memory-malware-monitor.log 2>/dev/null | sed 's/^/   /'
else
    warn "Log de monitoring mémoire n'existe pas encore (sera créé au premier run)"
fi

if [ -f "/var/log/malware-detection.log" ]; then
    check "Log de détection malware existe"
    echo "   Dernières lignes:"
    sudo tail -3 /var/log/malware-detection.log 2>/dev/null | sed 's/^/   /'
else
    warn "Log de détection malware n'existe pas encore (sera créé au premier run)"
fi

echo ""
echo "8️⃣ Vérification de la mémoire..."
echo ""

# Vérifier la mémoire
available_mb=$(free -m | awk 'NR==2{print $7}')
echo "   Mémoire disponible: ${available_mb} MiB"

if [ "$available_mb" -lt 200 ]; then
    warn "Mémoire faible (< 200 MiB) - Le monitoring devrait se déclencher"
else
    check "Mémoire suffisante (${available_mb} MiB >= 200 MiB)"
fi

echo ""
echo "9️⃣ Vérification des clés SSH..."
echo ""

# Vérifier les clés SSH
user_keys=$(wc -l < ~/.ssh/authorized_keys 2>/dev/null || echo 0)
root_keys=$(sudo wc -l < /root/.ssh/authorized_keys 2>/dev/null || echo 0)

echo "   Clés SSH utilisateur: $user_keys"
echo "   Clés SSH root: $root_keys"

if [ "$user_keys" -gt 5 ] || [ "$root_keys" -gt 5 ]; then
    warn "Nombre élevé de clés SSH - Vérifiez manuellement"
else
    check "Nombre de clés SSH raisonnable"
fi

echo ""
echo "🔟 Recommandations de sécurité..."
echo ""

# Vérifier Fail2Ban
if command -v fail2ban-client &> /dev/null; then
    check "Fail2Ban est installé"
    sudo systemctl is-active fail2ban > /dev/null 2>&1 && check "Fail2Ban est actif" || warn "Fail2Ban n'est pas actif"
else
    warn "Fail2Ban n'est pas installé (optionnel mais recommandé)"
fi

# Vérifier le firewall
if command -v ufw &> /dev/null; then
    ufw status | grep -q "Status: active" && check "UFW firewall est actif" || warn "UFW firewall n'est pas actif"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --state 2>/dev/null | grep -q "running" && check "Firewalld est actif" || warn "Firewalld n'est pas actif"
else
    warn "Aucun firewall détecté (recommandé d'en installer un)"
fi

echo ""
echo "=== RÉSUMÉ ==="
echo ""
echo -e "${GREEN}✅ Vérifications OK: $OK${NC}"
echo -e "${YELLOW}⚠️  Avertissements: $WARN${NC}"
echo -e "${RED}❌ Erreurs: $ERROR${NC}"
echo ""

if [ $ERROR -eq 0 ]; then
    echo -e "${GREEN}✅ Système sécurisé - Aucun malware détecté${NC}"
    echo ""
    echo "📋 Actions recommandées pour maintenir la sécurité:"
    echo "   1. Vérifiez régulièrement les logs: sudo tail -f /var/log/memory-malware-monitor.log"
    echo "   2. Changez régulièrement les mots de passe"
    echo "   3. Limitez l'accès SSH (firewall)"
    echo "   4. Installez Fail2Ban si ce n'est pas fait"
    echo "   5. Surveillez la mémoire: free -h"
else
    echo -e "${RED}❌ Des problèmes de sécurité ont été détectés!${NC}"
    echo ""
    echo "🔧 Actions à prendre:"
    echo "   1. Exécutez: sudo bash deploy/eliminer-malware-complet.sh"
    echo "   2. Installez le monitoring: voir section 2 ci-dessus"
    echo "   3. Vérifiez les clés SSH: cat ~/.ssh/authorized_keys"
    echo "   4. Relancez ce script après correction"
fi

echo ""
