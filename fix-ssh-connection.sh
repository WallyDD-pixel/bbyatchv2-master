#!/bin/bash

echo "🔧 CORRECTION DE LA CONNEXION SSH"
echo "=================================="
echo ""

# Variables - À ADAPTER
INSTANCE_ID="i-XXXXXXXXX"  # À REMPLACER
REGION="eu-north-1"
YOUR_IP=$(curl -s https://checkip.amazonaws.com)

echo "Votre IP publique: $YOUR_IP"
echo ""

# 1. VÉRIFIER L'ÉTAT DE L'INSTANCE
echo "📋 Étape 1: Vérifier l'état de l'instance..."
STATE=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)

echo "État actuel: $STATE"

if [ "$STATE" = "stopped" ]; then
    echo "⚠️  L'instance est arrêtée. Démarrage..."
    aws ec2 start-instances --instance-ids $INSTANCE_ID --region $REGION
    echo "⏳ Attente du démarrage (30 secondes)..."
    sleep 30
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
    echo "✅ Instance démarrée"
elif [ "$STATE" = "stopping" ] || [ "$STATE" = "pending" ]; then
    echo "⏳ L'instance est en cours de démarrage/arrêt. Attente..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
    echo "✅ Instance prête"
fi

# 2. RÉCUPÉRER L'IP PUBLIQUE
INSTANCE_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "IP publique de l'instance: $INSTANCE_IP"

# 3. RÉCUPÉRER LE SECURITY GROUP
SG_ID=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

echo "Security Group ID: $SG_ID"

# 4. VÉRIFIER ET AJOUTER LA RÈGLE SSH SI NÉCESSAIRE
echo ""
echo "📋 Étape 2: Vérifier les règles SSH..."
HAS_SSH=$(aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`22`]' \
  --output text)

if [ -z "$HAS_SSH" ]; then
    echo "⚠️  Aucune règle SSH trouvée. Ajout de la règle..."
    
    # Option 1: Autoriser depuis votre IP uniquement (plus sécurisé)
    echo "Ajout de la règle SSH depuis votre IP ($YOUR_IP)..."
    aws ec2 authorize-security-group-ingress \
      --group-id $SG_ID \
      --protocol tcp \
      --port 22 \
      --cidr $YOUR_IP/32 \
      --region $REGION 2>/dev/null && echo "✅ Règle ajoutée depuis votre IP" || echo "⚠️  Règle peut-être déjà existante"
    
    # Option 2: Autoriser depuis partout (moins sécurisé mais fonctionne toujours)
    echo ""
    read -p "Autoriser SSH depuis partout (0.0.0.0/0) ? (o/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        aws ec2 authorize-security-group-ingress \
          --group-id $SG_ID \
          --protocol tcp \
          --port 22 \
          --cidr 0.0.0.0/0 \
          --region $REGION 2>/dev/null && echo "✅ Règle ajoutée (0.0.0.0/0)" || echo "⚠️  Règle peut-être déjà existante"
    fi
else
    echo "✅ Règle SSH trouvée"
fi

# 5. ATTENDRE QUE L'INSTANCE SOIT PRÊTE
echo ""
echo "📋 Étape 3: Attente que l'instance soit prête..."
aws ec2 wait instance-status-ok --instance-ids $INSTANCE_ID --region $REGION
echo "✅ Instance prête"

# 6. TESTER LA CONNEXION
echo ""
echo "📋 Étape 4: Test de connexion SSH..."
echo "Commande à exécuter:"
echo "ssh -i bbyatchv6.pem ec2-user@$INSTANCE_IP"
echo ""

# Test de connectivité
timeout 5 bash -c "</dev/tcp/$INSTANCE_IP/22" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Port 22 accessible"
    echo ""
    echo "🎯 TENTATIVE DE CONNEXION..."
    echo "Si ça ne fonctionne pas, vérifiez:"
    echo "  1. Les permissions du fichier .pem: chmod 400 bbyatchv6.pem"
    echo "  2. Que vous utilisez la bonne clé"
    echo "  3. Les logs système: sudo journalctl -u sshd -n 50"
else
    echo "❌ Port 22 inaccessible"
    echo "Vérifiez:"
    echo "  1. Le Security Group autorise bien le port 22"
    echo "  2. L'instance est bien démarrée"
    echo "  3. Le service SSH est actif sur l'instance"
fi

echo ""
echo "✅ TERMINÉ"
