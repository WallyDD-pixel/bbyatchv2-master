#!/bin/bash
# Script pour créer l'utilisateur bbyatch via Systems Manager (CloudShell)

INSTANCE_ID="i-0f72f180aeeaedf7e"

echo "🔧 Création de l'utilisateur bbyatch sur l'instance..."

# Créer l'utilisateur via SSM
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "sudo useradd -m -s /bin/bash bbyatch",
    "sudo usermod -aG wheel bbyatch",
    "echo \"✅ Utilisateur bbyatch créé\"",
    "id bbyatch",
    "groups bbyatch"
  ]' \
  --comment "Create bbyatch user for SSM Session Manager" \
  --query 'Command.CommandId' --output text)

echo "📋 Commande envoyée. ID: ${COMMAND_ID}"
echo "⏳ Attente de l'exécution (10 secondes)..."
sleep 10

# Vérifier le statut
echo ""
echo "📊 Statut de la commande :"
aws ssm get-command-invocation \
  --command-id "${COMMAND_ID}" \
  --instance-id "${INSTANCE_ID}" \
  --query '[Status, StandardOutputContent, StandardErrorContent]' \
  --output table

echo ""
echo "✅ Vérification terminée."
echo "⏳ Attendez 1-2 minutes, puis réessayez Session Manager."
