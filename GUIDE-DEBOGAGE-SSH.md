# 🔍 GUIDE DE DÉBOGAGE SSH - CONNEXION VPS

## 🚨 PROBLÈME
Impossible de se connecter au VPS via SSH depuis votre machine locale, mais vous avez accès à AWS CloudShell.

## 📋 DIAGNOSTIC RAPIDE DEPUIS CLOUDSHELL

### Étape 1: Identifier votre Instance ID

Depuis CloudShell, exécutez:

```bash
# Lister toutes vos instances
aws ec2 describe-instances \
  --region eu-north-1 \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress,Tags[?Key==`Name`].Value|[0]]' \
  --output table
```

Notez l'**Instance ID** (format: `i-xxxxxxxxxxxxxxxxx`)

### Étape 2: Vérifier l'état de l'instance

```bash
# Remplacez i-XXXXXXXXX par votre Instance ID
INSTANCE_ID="i-XXXXXXXXX"
REGION="eu-north-1"

aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].[InstanceId,State.Name,PublicIpAddress]' \
  --output table
```

**États possibles:**
- `running` ✅ - L'instance fonctionne
- `stopped` ❌ - L'instance est arrêtée
- `stopping` ⏳ - En cours d'arrêt
- `pending` ⏳ - En cours de démarrage

### Étape 3: Démarrer l'instance si elle est arrêtée

```bash
# Si l'instance est stopped
aws ec2 start-instances --instance-ids $INSTANCE_ID --region $REGION

# Attendre que l'instance démarre (30-60 secondes)
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION

# Récupérer la nouvelle IP publique
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text
```

### Étape 4: Vérifier les Security Groups

```bash
# Récupérer le Security Group ID
SG_ID=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

echo "Security Group: $SG_ID"

# Vérifier les règles entrantes
aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]' \
  --output table
```

**Vérifiez que:**
- Il y a une règle pour le port **22** (SSH)
- La source est `0.0.0.0/0` (tout le monde) ou votre IP

### Étape 5: Ajouter la règle SSH si manquante

```bash
# Récupérer votre IP publique actuelle
YOUR_IP=$(curl -s https://checkip.amazonaws.com)
echo "Votre IP: $YOUR_IP"

# Option 1: Autoriser depuis votre IP uniquement (RECOMMANDÉ)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr $YOUR_IP/32 \
  --region $REGION

# Option 2: Autoriser depuis partout (moins sécurisé)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0 \
  --region $REGION
```

### Étape 6: Tester la connectivité depuis CloudShell

```bash
# Récupérer l'IP publique
INSTANCE_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

# Tester le port 22
timeout 5 bash -c "</dev/tcp/$INSTANCE_IP/22" && echo "✅ Port 22 accessible" || echo "❌ Port 22 inaccessible"

# Tenter une connexion SSH (si vous avez la clé dans CloudShell)
# ssh -i /path/to/key.pem ec2-user@$INSTANCE_IP
```

## 🔧 SOLUTIONS PAR PROBLÈME

### Problème 1: Instance arrêtée
```bash
aws ec2 start-instances --instance-ids $INSTANCE_ID --region $REGION
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
```

### Problème 2: Security Group bloque SSH
```bash
# Autoriser SSH depuis partout (temporaire pour test)
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0 \
  --region $REGION
```

### Problème 3: IP publique a changé
```bash
# Récupérer la nouvelle IP
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text
```

### Problème 4: Mauvaises permissions sur la clé .pem
```bash
# Sur votre machine locale (Windows PowerShell)
icacls bbyatchv6.pem /inheritance:r
icacls bbyatchv6.pem /grant:r "%USERNAME%:R"
```

Ou sur Linux/Mac:
```bash
chmod 400 bbyatchv6.pem
```

### Problème 5: Service SSH ne répond pas sur l'instance

Depuis CloudShell, utilisez **AWS Systems Manager Session Manager**:

```bash
# Se connecter via Session Manager (sans SSH)
aws ssm start-session \
  --target $INSTANCE_ID \
  --region $REGION
```

Une fois connecté, vérifiez le service SSH:
```bash
sudo systemctl status sshd
sudo systemctl start sshd
sudo systemctl enable sshd
```

## 🎯 COMMANDE COMPLÈTE DE DIAGNOSTIC

Copiez-collez ce script dans CloudShell:

```bash
#!/bin/bash
INSTANCE_ID="i-XXXXXXXXX"  # REMPLACER
REGION="eu-north-1"

echo "=== ÉTAT DE L'INSTANCE ==="
aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].[InstanceId,State.Name,PublicIpAddress]' \
  --output table

echo ""
echo "=== SECURITY GROUPS ==="
SG_ID=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

aws ec2 describe-security-groups \
  --group-ids $SG_ID \
  --region $REGION \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`22`]' \
  --output table

echo ""
echo "=== TEST DE CONNECTIVITÉ ==="
INSTANCE_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --region $REGION \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

timeout 5 bash -c "</dev/tcp/$INSTANCE_IP/22" 2>/dev/null && echo "✅ Port 22 accessible" || echo "❌ Port 22 inaccessible"
```

## 📝 CONNEXION FINALE

Une fois tout corrigé, depuis votre machine locale:

```bash
# Windows PowerShell
ssh -i bbyatchv6.pem ec2-user@13.53.171.192

# Ou avec la nouvelle IP si elle a changé
ssh -i bbyatchv6.pem ec2-user@NOUVELLE_IP
```

## 🆘 SI RIEN NE FONCTIONNE

Utilisez **AWS Systems Manager Session Manager** pour vous connecter sans SSH:

1. Dans la console AWS → EC2 → Instances
2. Sélectionnez votre instance
3. Cliquez sur "Connect" → "Session Manager"
4. Cliquez sur "Connect"

Cela vous donnera un accès direct à l'instance pour diagnostiquer le problème SSH.
