#!/bin/bash
# Script pour corriger les permissions KMS via AWS CloudShell

set -e  # Arrêter en cas d'erreur

POLICY_NAME="SSM-KMS-Decrypt-Access"
ROLE_NAME="AWS-QuickSetup-SSM-DefaultEC2MgmtRole-eu-north-1"
ACCOUNT_ID="088167544089"
KMS_KEY_ARN="arn:aws:kms:eu-north-1:088167544089:key/3a10b9b1-f39b-4b57-85a9-af730b64c885"

echo "🔍 Vérification de l'existence de la politique..."

# 1. Vérifier si la politique existe déjà
POLICY_ARN=$(aws iam list-policies --query "Policies[?PolicyName=='${POLICY_NAME}'].Arn" --output text 2>/dev/null || echo "")

if [ -z "$POLICY_ARN" ]; then
  echo "📝 Création de la politique KMS..."
  POLICY_ARN=$(aws iam create-policy \
    --policy-name "${POLICY_NAME}" \
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
    --description "Allow SSM Session Manager to decrypt KMS key" \
    --query 'Policy.Arn' --output text)
  echo "✅ Politique créée: $POLICY_ARN"
else
  echo "✅ Politique existante trouvée: $POLICY_ARN"
fi

# 2. Vérifier si la politique est déjà attachée au rôle
echo "🔍 Vérification de l'attachement au rôle..."
ATTACHED=$(aws iam list-attached-role-policies \
  --role-name "${ROLE_NAME}" \
  --query "AttachedPolicies[?PolicyArn=='${POLICY_ARN}'].PolicyArn" \
  --output text 2>/dev/null || echo "")

if [ -z "$ATTACHED" ]; then
  echo "📎 Attachement de la politique au rôle..."
  aws iam attach-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-arn "${POLICY_ARN}"
  echo "✅ Politique attachée au rôle"
else
  echo "✅ Politique déjà attachée au rôle"
fi

# 3. Vérifier que la politique est attachée
echo ""
echo "📋 Politiques attachées au rôle ${ROLE_NAME}:"
aws iam list-attached-role-policies \
  --role-name "${ROLE_NAME}" \
  --output table

echo ""
echo "✅ Configuration terminée !"
echo "⏳ Attendez 1-2 minutes pour la propagation, puis réessayez Session Manager."
