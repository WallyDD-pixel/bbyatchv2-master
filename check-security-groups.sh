#!/bin/bash

echo "🔍 Vérification de la configuration réseau AWS"
echo "=============================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Obtenir les métadonnées de l'instance
echo -e "${BLUE}1️⃣ Informations de l'instance EC2...${NC}"
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "Non disponible")
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "Non disponible")
PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4 2>/dev/null || echo "Non disponible")
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null || echo "Non disponible")

echo "   Instance ID: $INSTANCE_ID"
echo "   IP publique: $PUBLIC_IP"
echo "   IP privée: $PRIVATE_IP"
echo "   Région: $REGION"
echo ""

# Vérifier si AWS CLI est installé
echo -e "${BLUE}2️⃣ Vérification de la configuration des Security Groups...${NC}"
if command -v aws &> /dev/null; then
    echo "   AWS CLI disponible"
    
    # Obtenir les Security Groups
    if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "Non disponible" ]; then
        echo "   Récupération des Security Groups..."
        SECURITY_GROUPS=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' --output text 2>/dev/null || echo "")
        
        if [ -n "$SECURITY_GROUPS" ]; then
            echo "   Security Groups trouvés:"
            for sg in $SECURITY_GROUPS; do
                echo "      $sg"
            done
            echo ""
            echo "   ⚠️  Pour voir les règles détaillées, exécutez dans la console AWS:"
            echo "      aws ec2 describe-security-groups --group-ids $SECURITY_GROUPS"
        else
            echo -e "   ${YELLOW}⚠️  Impossible de récupérer les Security Groups${NC}"
        fi
    else
        echo -e "   ${YELLOW}⚠️  Instance ID non disponible${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  AWS CLI non installé${NC}"
    echo ""
    echo "   Pour installer AWS CLI:"
    echo "      curl 'https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip' -o 'awscliv2.zip'"
    echo "      unzip awscliv2.zip"
    echo "      sudo ./aws/install"
fi
echo ""

# Vérifier iptables
echo -e "${BLUE}3️⃣ Vérification des règles iptables...${NC}"
if command -v iptables &> /dev/null; then
    echo "   Règles SSH (port 22):"
    sudo iptables -L -n -v | grep -A 5 "tcp dpt:22" | sed 's/^/      /'
    echo ""
    echo "   Règles HTTP/HTTPS:"
    sudo iptables -L -n -v | grep -E "dpt:(80|443)" | sed 's/^/      /'
else
    echo -e "   ${YELLOW}⚠️  iptables non disponible${NC}"
fi
echo ""

# Instructions manuelles
echo "=============================================="
echo -e "${YELLOW}📋 Instructions pour vérifier les Security Groups manuellement:${NC}"
echo ""
echo "1. Connectez-vous à la console AWS"
echo "2. Allez dans EC2 > Instances"
echo "3. Sélectionnez votre instance: $INSTANCE_ID"
echo "4. Cliquez sur l'onglet 'Security'"
echo "5. Cliquez sur le Security Group"
echo "6. Vérifiez les règles Inbound:"
echo ""
echo "   ✅ BON: SSH (22) autorisé uniquement depuis 90.90.82.243"
echo "   ❌ MAUVAIS: SSH (22) autorisé depuis 0.0.0.0/0 (toutes les IPs)"
echo ""
echo "Si SSH est ouvert à 0.0.0.0/0, c'est la VULNÉRABILITÉ PRINCIPALE !"
echo "C'est probablement comme ça que le malware revient !"
echo ""
echo "Pour corriger:"
echo "  1. Modifiez la règle SSH pour autoriser uniquement votre IP"
echo "  2. Ou supprimez la règle 0.0.0.0/0 et ajoutez votre IP"
echo ""
