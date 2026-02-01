#!/bin/bash

echo "🔍 Audit de sécurité complet - Identification des failles"
echo "========================================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VULNERABILITIES=0

# 1. Vérifier les clés SSH autorisées
echo -e "${BLUE}1️⃣ Vérification des clés SSH autorisées...${NC}"
AUTH_KEYS="$HOME/.ssh/authorized_keys"
if [ -f "$AUTH_KEYS" ]; then
    KEY_COUNT=$(wc -l < "$AUTH_KEYS" 2>/dev/null || echo "0")
    echo "   Nombre de clés: $KEY_COUNT"
    
    # Vérifier les clés suspectes
    SUSPECT_KEYS=$(grep -E "(moneroocean|miner|xmrig|systemwatcher|scanner)" "$AUTH_KEYS" 2>/dev/null || true)
    if [ -n "$SUSPECT_KEYS" ]; then
        echo -e "   ${RED}⚠️  VULNÉRABILITÉ: Clés SSH suspectes trouvées !${NC}"
        echo "$SUSPECT_KEYS" | sed 's/^/      /'
        VULNERABILITIES=$((VULNERABILITIES + 1))
    else
        echo -e "   ${GREEN}✅ Clés SSH propres${NC}"
    fi
    
    # Afficher toutes les clés
    echo "   Toutes les clés autorisées:"
    cat "$AUTH_KEYS" | while read line; do
        if [ -n "$line" ] && [[ ! "$line" =~ ^# ]]; then
            KEY_TYPE=$(echo "$line" | awk '{print $1}')
            KEY_FINGERPRINT=$(echo "$line" | awk '{print $3}')
            echo "      Type: $KEY_TYPE | Commentaire: ${KEY_FINGERPRINT:-aucun}"
        fi
    done
else
    echo -e "   ${YELLOW}⚠️  Fichier authorized_keys non trouvé${NC}"
fi
echo ""

# 2. Vérifier les permissions SSH
echo -e "${BLUE}2️⃣ Vérification des permissions SSH...${NC}"
if [ -d "$HOME/.ssh" ]; then
    SSH_PERMS=$(stat -c "%a" "$HOME/.ssh" 2>/dev/null || stat -f "%OLp" "$HOME/.ssh" 2>/dev/null || echo "unknown")
    if [ "$SSH_PERMS" != "700" ] && [ "$SSH_PERMS" != "755" ]; then
        echo -e "   ${RED}⚠️  VULNÉRABILITÉ: Permissions .ssh incorrectes: $SSH_PERMS (devrait être 700)${NC}"
        VULNERABILITIES=$((VULNERABILITIES + 1))
    else
        echo -e "   ${GREEN}✅ Permissions .ssh OK: $SSH_PERMS${NC}"
    fi
    
    if [ -f "$AUTH_KEYS" ]; then
        AUTH_PERMS=$(stat -c "%a" "$AUTH_KEYS" 2>/dev/null || stat -f "%OLp" "$AUTH_KEYS" 2>/dev/null || echo "unknown")
        if [ "$AUTH_PERMS" != "600" ] && [ "$AUTH_PERMS" != "644" ]; then
            echo -e "   ${RED}⚠️  VULNÉRABILITÉ: Permissions authorized_keys incorrectes: $AUTH_PERMS (devrait être 600)${NC}"
            VULNERABILITIES=$((VULNERABILITIES + 1))
        else
            echo -e "   ${GREEN}✅ Permissions authorized_keys OK: $AUTH_PERMS${NC}"
        fi
    fi
else
    echo -e "   ${YELLOW}⚠️  Dossier .ssh non trouvé${NC}"
fi
echo ""

# 3. Vérifier la configuration SSH
echo -e "${BLUE}3️⃣ Vérification de la configuration SSH serveur...${NC}"
SSH_CONFIG="/etc/ssh/sshd_config"
if [ -f "$SSH_CONFIG" ]; then
    # Vérifier PermitRootLogin
    ROOT_LOGIN=$(sudo grep -E "^PermitRootLogin" "$SSH_CONFIG" 2>/dev/null | tail -1 || echo "PermitRootLogin yes")
    if [[ "$ROOT_LOGIN" =~ yes ]]; then
        echo -e "   ${RED}⚠️  VULNÉRABILITÉ: Root login activé !${NC}"
        echo "      $ROOT_LOGIN"
        VULNERABILITIES=$((VULNERABILITIES + 1))
    else
        echo -e "   ${GREEN}✅ Root login désactivé${NC}"
    fi
    
    # Vérifier PasswordAuthentication
    PASSWORD_AUTH=$(sudo grep -E "^PasswordAuthentication" "$SSH_CONFIG" 2>/dev/null | tail -1 || echo "PasswordAuthentication yes")
    if [[ "$PASSWORD_AUTH" =~ yes ]]; then
        echo -e "   ${YELLOW}⚠️  Authentification par mot de passe activée (moins sécurisé)${NC}"
        echo "      $PASSWORD_AUTH"
    else
        echo -e "   ${GREEN}✅ Authentification par mot de passe désactivée${NC}"
    fi
    
    # Vérifier les ports
    SSH_PORT=$(sudo grep -E "^Port" "$SSH_CONFIG" 2>/dev/null | tail -1 || echo "Port 22")
    echo "   $SSH_PORT"
else
    echo -e "   ${YELLOW}⚠️  Fichier sshd_config non trouvé${NC}"
fi
echo ""

# 4. Vérifier tous les crontabs
echo -e "${BLUE}4️⃣ Vérification des crontabs (utilisateur et système)...${NC}"

# Crontab utilisateur
USER_CRON=$(crontab -l 2>/dev/null || echo "")
if [ -n "$USER_CRON" ]; then
    echo "   Crontab utilisateur:"
    echo "$USER_CRON" | while read line; do
        if [[ "$line" =~ (wget|curl|bash|sh).*http ]] || [[ "$line" =~ (systemwatcher|scanner_linux|xmrig|moneroocean|miner) ]]; then
            echo -e "      ${RED}⚠️  VULNÉRABILITÉ: Ligne suspecte: $line${NC}"
            VULNERABILITIES=$((VULNERABILITIES + 1))
        else
            echo "      $line"
        fi
    done
else
    echo -e "   ${GREEN}✅ Aucun crontab utilisateur${NC}"
fi

# Crontab système
if [ -f /etc/crontab ]; then
    echo "   Crontab système (/etc/crontab):"
    sudo cat /etc/crontab | while read line; do
        if [[ "$line" =~ (wget|curl|bash|sh).*http ]] || [[ "$line" =~ (systemwatcher|scanner_linux|xmrig|moneroocean|miner) ]]; then
            echo -e "      ${RED}⚠️  VULNÉRABILITÉ: Ligne suspecte: $line${NC}"
            VULNERABILITIES=$((VULNERABILITIES + 1))
        elif [[ ! "$line" =~ ^# ]] && [ -n "$line" ]; then
            echo "      $line"
        fi
    done
fi

# Crontabs dans /etc/cron.d
if [ -d /etc/cron.d ]; then
    echo "   Crontabs dans /etc/cron.d:"
    for cron_file in /etc/cron.d/*; do
        if [ -f "$cron_file" ]; then
            SUSPECT=$(sudo grep -E "(wget|curl|bash|sh).*http|systemwatcher|scanner_linux|xmrig|moneroocean|miner" "$cron_file" 2>/dev/null || true)
            if [ -n "$SUSPECT" ]; then
                echo -e "      ${RED}⚠️  VULNÉRABILITÉ dans $cron_file:${NC}"
                echo "$SUSPECT" | sed 's/^/         /'
                VULNERABILITIES=$((VULNERABILITIES + 1))
            fi
        fi
    done
fi
echo ""

# 5. Vérifier les services systemd
echo -e "${BLUE}5️⃣ Vérification des services systemd...${NC}"
SERVICES=$(systemctl list-units --type=service --all 2>/dev/null | grep -E "(systemwatcher|scanner|xmrig|moneroocean|miner)" || true)
if [ -n "$SERVICES" ]; then
    echo -e "   ${RED}⚠️  VULNÉRABILITÉ: Services suspects trouvés !${NC}"
    echo "$SERVICES" | sed 's/^/      /'
    VULNERABILITIES=$((VULNERABILITIES + 1))
else
    echo -e "   ${GREEN}✅ Aucun service suspect${NC}"
fi
echo ""

# 6. Vérifier les fichiers de démarrage
echo -e "${BLUE}6️⃣ Vérification des fichiers de démarrage...${NC}"
STARTUP_FILES=(
    "$HOME/.bashrc"
    "$HOME/.bash_profile"
    "$HOME/.profile"
    "$HOME/.zshrc"
    "/etc/rc.local"
    "/etc/profile"
)

for file in "${STARTUP_FILES[@]}"; do
    if [ -f "$file" ]; then
        SUSPECT=$(grep -E "(systemwatcher|scanner_linux|xmrig|moneroocean|miner|wget.*sh|curl.*sh)" "$file" 2>/dev/null || true)
        if [ -n "$SUSPECT" ]; then
            echo -e "   ${RED}⚠️  VULNÉRABILITÉ dans $file:${NC}"
            echo "$SUSPECT" | sed 's/^/      /'
            VULNERABILITIES=$((VULNERABILITIES + 1))
        fi
    fi
done

if [ $VULNERABILITIES -eq 0 ]; then
    echo -e "   ${GREEN}✅ Aucun fichier de démarrage suspect${NC}"
fi
echo ""

# 7. Vérifier les fichiers suspects dans le système
echo -e "${BLUE}7️⃣ Recherche de fichiers suspects...${NC}"
SUSPECT_FILES=$(find ~ -maxdepth 3 -type f \( -name "*systemwatcher*" -o -name "*scanner_linux*" -o -name "*xmrig*" -o -name "*moneroocean*" -o -name "*miner*" \) 2>/dev/null || true)
if [ -n "$SUSPECT_FILES" ]; then
    echo -e "   ${RED}⚠️  Fichiers suspects trouvés:${NC}"
    echo "$SUSPECT_FILES" | sed 's/^/      /'
    VULNERABILITIES=$((VULNERABILITIES + 1))
else
    echo -e "   ${GREEN}✅ Aucun fichier suspect trouvé${NC}"
fi
echo ""

# 8. Vérifier les logs d'authentification
echo -e "${BLUE}8️⃣ Analyse des logs d'authentification SSH (dernières 50 lignes)...${NC}"
if [ -f /var/log/auth.log ]; then
    LOG_FILE="/var/log/auth.log"
elif [ -f /var/log/secure ]; then
    LOG_FILE="/var/log/secure"
else
    LOG_FILE=""
fi

if [ -n "$LOG_FILE" ]; then
    echo "   Fichier: $LOG_FILE"
    echo "   Connexions SSH récentes:"
    sudo tail -50 "$LOG_FILE" | grep -E "(Accepted|Failed|Invalid)" | tail -10 | sed 's/^/      /'
    
    echo ""
    echo "   Tentatives de connexion échouées (suspectes):"
    FAILED_ATTEMPTS=$(sudo grep "Failed password" "$LOG_FILE" | tail -20 | awk '{print $NF}' | sort | uniq -c | sort -rn | head -5)
    if [ -n "$FAILED_ATTEMPTS" ]; then
        echo "$FAILED_ATTEMPTS" | sed 's/^/      /'
    else
        echo "      Aucune"
    fi
else
    echo -e "   ${YELLOW}⚠️  Fichier de log d'authentification non trouvé${NC}"
fi
echo ""

# 9. Vérifier les connexions réseau actives
echo -e "${BLUE}9️⃣ Connexions réseau actives suspectes...${NC}"
SUSPECT_CONNECTIONS=$(sudo netstat -tunp 2>/dev/null | grep -E "(xmrig|moneroocean|miner|systemwatcher|scanner)" || ss -tunp 2>/dev/null | grep -E "(xmrig|moneroocean|miner|systemwatcher|scanner)" || true)
if [ -n "$SUSPECT_CONNECTIONS" ]; then
    echo -e "   ${RED}⚠️  Connexions suspectes:${NC}"
    echo "$SUSPECT_CONNECTIONS" | sed 's/^/      /'
    VULNERABILITIES=$((VULNERABILITIES + 1))
else
    echo -e "   ${GREEN}✅ Aucune connexion suspecte${NC}"
fi
echo ""

# 10. Vérifier les permissions des fichiers critiques
echo -e "${BLUE}🔟 Vérification des permissions des fichiers critiques...${NC}"
CRITICAL_FILES=(
    "$HOME/.ssh/authorized_keys"
    "$HOME/.bashrc"
    "$HOME/.bash_profile"
    "/etc/crontab"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        PERMS=$(stat -c "%a" "$file" 2>/dev/null || stat -f "%OLp" "$file" 2>/dev/null || echo "unknown")
        WORLD_WRITABLE=$([ -w "$file" ] && [ "$(stat -c "%a" "$file" 2>/dev/null | cut -c3)" -ge 2 ] && echo "yes" || echo "no")
        if [ "$WORLD_WRITABLE" = "yes" ]; then
            echo -e "   ${RED}⚠️  VULNÉRABILITÉ: $file est accessible en écriture (perms: $PERMS)${NC}"
            VULNERABILITIES=$((VULNERABILITIES + 1))
        fi
    fi
done
echo ""

# 11. Résumé des vulnérabilités
echo "========================================================"
if [ $VULNERABILITIES -gt 0 ]; then
    echo -e "${RED}⚠️  $VULNERABILITIES vulnérabilité(s) trouvée(s) !${NC}"
    echo ""
    echo "📋 Actions recommandées:"
    echo "   1. Supprimez les clés SSH suspectes de ~/.ssh/authorized_keys"
    echo "   2. Corrigez les permissions: chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
    echo "   3. Nettoyez les crontabs suspects"
    echo "   4. Désactivez les services suspects"
    echo "   5. Changez tous les mots de passe"
    echo "   6. Vérifiez les logs pour identifier la source de l'attaque"
else
    echo -e "${GREEN}✅ Aucune vulnérabilité majeure détectée${NC}"
    echo ""
    echo "💡 Le malware peut revenir via:"
    echo "   - Une clé SSH compromise"
    echo "   - Un mot de passe faible"
    echo "   - Une faille dans une application web"
    echo "   - Un accès physique ou via la console AWS"
fi
echo ""

# 12. Recommandations de sécurité
echo -e "${BLUE}📋 Recommandations de sécurité:${NC}"
echo "   1. Utilisez uniquement des clés SSH (désactivez les mots de passe)"
echo "   2. Limitez l'accès SSH à votre IP uniquement (Security Groups AWS + iptables)"
echo "   3. Installez fail2ban (déjà fait ✅)"
echo "   4. Surveillez régulièrement les logs: sudo tail -f /var/log/auth.log"
echo "   5. Changez régulièrement les clés SSH"
echo "   6. Utilisez des mots de passe forts pour tous les comptes"
echo "   7. Mettez à jour le système régulièrement: sudo yum update"
echo "   8. Vérifiez les Security Groups AWS pour limiter l'accès"
echo ""
