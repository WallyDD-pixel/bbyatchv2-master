#!/bin/bash

echo "🔧 Correction des vulnérabilités détectées"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Corriger les permissions de .bashrc et .bash_profile
echo -e "${BLUE}1️⃣ Correction des permissions des fichiers de démarrage...${NC}"

if [ -f ~/.bashrc ]; then
    CURRENT_PERMS=$(stat -c "%a" ~/.bashrc 2>/dev/null || stat -f "%OLp" ~/.bashrc 2>/dev/null || echo "unknown")
    echo "   .bashrc permissions actuelles: $CURRENT_PERMS"
    chmod 600 ~/.bashrc
    NEW_PERMS=$(stat -c "%a" ~/.bashrc 2>/dev/null || stat -f "%OLp" ~/.bashrc 2>/dev/null || echo "unknown")
    echo -e "   ${GREEN}✅ .bashrc permissions corrigées: $NEW_PERMS${NC}"
else
    echo -e "   ${YELLOW}⚠️  .bashrc non trouvé${NC}"
fi

if [ -f ~/.bash_profile ]; then
    CURRENT_PERMS=$(stat -c "%a" ~/.bash_profile 2>/dev/null || stat -f "%OLp" ~/.bash_profile 2>/dev/null || echo "unknown")
    echo "   .bash_profile permissions actuelles: $CURRENT_PERMS"
    chmod 600 ~/.bash_profile
    NEW_PERMS=$(stat -c "%a" ~/.bash_profile 2>/dev/null || stat -f "%OLp" ~/.bash_profile 2>/dev/null || echo "unknown")
    echo -e "   ${GREEN}✅ .bash_profile permissions corrigées: $NEW_PERMS${NC}"
else
    echo -e "   ${YELLOW}⚠️  .bash_profile non trouvé${NC}"
fi

if [ -f ~/.profile ]; then
    chmod 600 ~/.profile
    echo -e "   ${GREEN}✅ .profile permissions corrigées${NC}"
fi
echo ""

# 2. Vérifier le contenu de .bashrc et .bash_profile pour des scripts suspects
echo -e "${BLUE}2️⃣ Vérification du contenu des fichiers de démarrage...${NC}"

if [ -f ~/.bashrc ]; then
    SUSPECT_CONTENT=$(grep -E "(systemwatcher|scanner_linux|xmrig|moneroocean|miner|wget.*sh|curl.*sh)" ~/.bashrc 2>/dev/null || true)
    if [ -n "$SUSPECT_CONTENT" ]; then
        echo -e "   ${RED}⚠️  Contenu suspect dans .bashrc:${NC}"
        echo "$SUSPECT_CONTENT" | sed 's/^/      /'
    else
        echo -e "   ${GREEN}✅ .bashrc propre${NC}"
    fi
fi

if [ -f ~/.bash_profile ]; then
    SUSPECT_CONTENT=$(grep -E "(systemwatcher|scanner_linux|xmrig|moneroocean|miner|wget.*sh|curl.*sh)" ~/.bash_profile 2>/dev/null || true)
    if [ -n "$SUSPECT_CONTENT" ]; then
        echo -e "   ${RED}⚠️  Contenu suspect dans .bash_profile:${NC}"
        echo "$SUSPECT_CONTENT" | sed 's/^/      /'
    else
        echo -e "   ${GREEN}✅ .bash_profile propre${NC}"
    fi
fi
echo ""

# 3. Vérifier le fichier scanner_deployed.log (suspect car modifié récemment)
echo -e "${BLUE}3️⃣ Vérification du fichier scanner_deployed.log...${NC}"
if [ -f ~/bbyatchv2-master/scanner_deployed.log ]; then
    echo "   Fichier trouvé: ~/bbyatchv2-master/scanner_deployed.log"
    echo "   Taille: $(du -h ~/bbyatchv2-master/scanner_deployed.log | cut -f1)"
    echo "   Dernière modification: $(stat -c "%y" ~/bbyatchv2-master/scanner_deployed.log 2>/dev/null || stat -f "%Sm" ~/bbyatchv2-master/scanner_deployed.log)"
    echo ""
    echo "   Dernières 20 lignes:"
    tail -20 ~/bbyatchv2-master/scanner_deployed.log | sed 's/^/      /'
    echo ""
    read -p "   Voulez-vous supprimer ce fichier ? (o/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[OoYy]$ ]]; then
        rm -f ~/bbyatchv2-master/scanner_deployed.log
        echo -e "   ${GREEN}✅ Fichier supprimé${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Fichier conservé${NC}"
    fi
else
    echo -e "   ${GREEN}✅ Fichier non trouvé${NC}"
fi
echo ""

# 4. Vérifier les fichiers dans deploy/ (faux positifs probablement)
echo -e "${BLUE}4️⃣ Vérification des fichiers dans deploy/...${NC}"
DEPLOY_FILES=(
    "~/bbyatchv2-master/deploy/eliminer-et-bloquer-malware.sh"
    "~/bbyatchv2-master/deploy/eliminer-malware-definitivement.sh"
    "~/bbyatchv2-master/deploy/eliminer-malware-complet.sh"
)

for file in "${DEPLOY_FILES[@]}"; do
    file_expanded=$(eval echo $file)
    if [ -f "$file_expanded" ]; then
        echo "   Fichier: $file_expanded"
        # Vérifier si c'est un script légitime (contient des commentaires ou des commandes de nettoyage)
        if head -5 "$file_expanded" | grep -qE "(#!/bin/bash|#|echo|rm|kill)"; then
            echo -e "      ${GREEN}✅ Semble être un script légitime de nettoyage${NC}"
        else
            echo -e "      ${YELLOW}⚠️  Contenu suspect, vérifiez manuellement${NC}"
        fi
    fi
done
echo ""

# 5. Vérifier les logs d'authentification (trouver le bon fichier)
echo -e "${BLUE}5️⃣ Recherche du fichier de log d'authentification...${NC}"
if [ -f /var/log/secure ]; then
    echo -e "   ${GREEN}✅ Fichier trouvé: /var/log/secure${NC}"
    echo "   Dernières connexions SSH:"
    sudo tail -20 /var/log/secure | grep -E "(Accepted|Failed|Invalid)" | tail -5 | sed 's/^/      /'
elif [ -f /var/log/auth.log ]; then
    echo -e "   ${GREEN}✅ Fichier trouvé: /var/log/auth.log${NC}"
    echo "   Dernières connexions SSH:"
    sudo tail -20 /var/log/auth.log | grep -E "(Accepted|Failed|Invalid)" | tail -5 | sed 's/^/      /'
else
    echo -e "   ${YELLOW}⚠️  Aucun fichier de log trouvé${NC}"
    echo "   Tentative de recherche dans journalctl..."
    sudo journalctl -u sshd --no-pager -n 10 2>/dev/null | grep -E "(Accepted|Failed)" | tail -5 | sed 's/^/      /' || echo "      Aucun log disponible"
fi
echo ""

# 6. Vérifier les Security Groups AWS (via métadonnées)
echo -e "${BLUE}6️⃣ Vérification de la configuration réseau...${NC}"
echo "   IP publique de l'instance:"
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "Non disponible")
echo "      $PUBLIC_IP"
echo ""
echo "   ⚠️  IMPORTANT: Vérifiez les Security Groups AWS dans la console:"
echo "      1. Allez dans EC2 > Security Groups"
echo "      2. Trouvez le Security Group de votre instance"
echo "      3. Vérifiez que SSH (port 22) est limité à votre IP: 90.90.82.243"
echo "      4. Si SSH est ouvert à 0.0.0.0/0, c'est une VULNÉRABILITÉ MAJEURE !"
echo ""

# 7. Résumé
echo "=========================================="
echo -e "${GREEN}✅ Corrections appliquées !${NC}"
echo ""
echo "📋 Actions supplémentaires recommandées:"
echo "   1. Vérifiez les Security Groups AWS (voir ci-dessus)"
echo "   2. Changez la clé SSH si vous suspectez une compromission"
echo "   3. Surveillez les logs: sudo tail -f /var/log/secure"
echo "   4. Vérifiez régulièrement: bash audit-security.sh"
echo ""
