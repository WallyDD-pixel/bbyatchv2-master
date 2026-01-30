# Fix SSH Connection - Commandes CloudShell

## Via AWS CloudShell

1. **Ouvrez AWS CloudShell** (icône terminal en haut de la console AWS)

2. **Exécutez ces commandes une par une** :

```bash
# Créer la politique KMS
aws iam create-policy \
  --policy-name SSM-KMS-Decrypt-Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "kms:Decrypt",
          "kms:DescribeKey"
        ],
        "Resource": "arn:aws:kms:eu-north-1:088167544089:key/3a10b9b1-f39b-4b57-85a9-af730b64c885"
      }
    ]
  }' \
  --description "Allow SSM Session Manager to decrypt KMS key"
```

Si la politique existe déjà, vous obtiendrez une erreur. Dans ce cas, récupérez l'ARN :

```bash
# Récupérer l'ARN de la politique existante
aws iam list-policies --query "Policies[?PolicyName=='SSM-KMS-Decrypt-Access'].Arn" --output text
```

Puis attachez-la au rôle :

```bash
# Attacher la politique au rôle (remplacez POLICY_ARN par l'ARN obtenu ci-dessus)
aws iam attach-role-policy \
  --role-name AWS-QuickSetup-SSM-DefaultEC2MgmtRole-eu-north-1 \
  --policy-arn POLICY_ARN
```

Ou si vous avez l'ARN complet :

```bash
aws iam attach-role-policy \
  --role-name AWS-QuickSetup-SSM-DefaultEC2MgmtRole-eu-north-1 \
  --policy-arn arn:aws:iam::088167544089:policy/SSM-KMS-Decrypt-Access
```

## Vérification

```bash
# Vérifier que la politique est attachée
aws iam list-attached-role-policies \
  --role-name AWS-QuickSetup-SSM-DefaultEC2MgmtRole-eu-north-1
```

## Alternative : Débannir votre IP via Systems Manager

Si vous arrivez à vous connecter via EC2 Instance Connect ou une autre méthode :

```bash
# Obtenir votre IP
curl -s https://api.ipify.org

# Débannir votre IP (remplacez YOUR_IP)
sudo fail2ban-client set sshd unban YOUR_IP

# Vérifier le statut
sudo fail2ban-client status sshd
```
