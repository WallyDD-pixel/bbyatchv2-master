#!/bin/bash

echo "🔍 DIAGNOSTIC DE CONNEXION SSH"
echo "================================"
echo ""

# Variables
INSTANCE_ID="i-XXXXXXXXX"  # À REMPLACER avec votre instance ID
INSTANCE_IP="13.53.171.192"
REGION="eu-north-1"

echo "📋 ÉTAPE 1: Vérifier l'état de l'instance"
echo "-------------------------------------------"
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].[InstanceId,State.Name,PublicIpAddress,PrivateIpAddress]' \
  --output table

echo ""
echo "📋 ÉTAPE 2: Vérifier les Security Groups"
echo "-------------------------------------------"
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].SecurityGroups[*].[GroupId,GroupName]' \
  --output table

echo ""
echo "📋 ÉTAPE 3: Vérifier les règles du Security Group"
echo "-------------------------------------------"
SG_ID=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

echo "Security Group ID: $SG_ID"
echo ""
aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]' \
  --output table

echo ""
echo "📋 ÉTAPE 4: Tester la connectivité réseau"
echo "-------------------------------------------"
echo "Test de connexion au port 22..."
timeout 5 bash -c "</dev/tcp/$INSTANCE_IP/22" 2>/dev/null && echo "✅ Port 22 accessible" || echo "❌ Port 22 inaccessible"

echo ""
echo "📋 ÉTAPE 5: Vérifier les logs système (si accessible)"
echo "-------------------------------------------"
echo "Tentative de connexion SSH..."
ssh -v -o ConnectTimeout=5 -o StrictHostKeyChecking=no ec2-user@$INSTANCE_IP 2>&1 | head -20

echo ""
echo "📋 ÉTAPE 6: Vérifier les métriques CloudWatch"
echo "-------------------------------------------"
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$INSTANCE_ID \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average \
  --region $REGION \
  --output table

echo ""
echo "✅ DIAGNOSTIC TERMINÉ"
echo ""
echo "🔧 SOLUTIONS POSSIBLES:"
echo "1. Si l'instance est 'stopped': aws ec2 start-instances --instance-ids $INSTANCE_ID --region $REGION"
echo "2. Si le port 22 est bloqué: Ouvrir le Security Group pour autoriser SSH (0.0.0.0/0 ou votre IP)"
echo "3. Si l'instance ne répond pas: Redémarrer l'instance"
echo "4. Vérifier que la clé .pem a les bonnes permissions: chmod 400 bbyatchv6.pem"
