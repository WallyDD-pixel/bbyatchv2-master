# Fix SSM Session Manager KMS Permissions

## Problème
L'erreur indique que le rôle IAM n'a pas les permissions KMS nécessaires pour Session Manager.

## Solution : Créer une politique gérée et l'attacher

### Option 1 : Via AWS Console

1. **Créer une politique gérée** :
   - Allez dans IAM → Policies → Create policy
   - Onglet JSON, collez le contenu de `fix-ssm-kms-policy.json`
   - Nommez-la : `SSM-SessionManager-KMS-Access`
   - Créez la politique

2. **Attacher la politique au rôle** :
   - Allez dans IAM → Roles
   - Trouvez : `AWS-QuickSetup-SSM-DefaultEC2MgmtRole-eu-north-1`
   - Cliquez sur "Add permissions" → "Attach policies"
   - Recherchez et sélectionnez `SSM-SessionManager-KMS-Access`
   - Attachez

### Option 2 : Via AWS CLI

```bash
# Créer la politique
aws iam create-policy \
  --policy-name SSM-SessionManager-KMS-Access \
  --policy-document file://fix-ssm-kms-policy.json

# Attacher au rôle (remplacez ACCOUNT_ID par votre ID de compte)
aws iam attach-role-policy \
  --role-name AWS-QuickSetup-SSM-DefaultEC2MgmtRole-eu-north-1 \
  --policy-arn arn:aws:iam::088167544089:policy/SSM-SessionManager-KMS-Access
```

### Option 3 : Solution rapide - Utiliser une clé KMS différente

Si vous ne pouvez pas modifier les permissions, vous pouvez configurer Session Manager pour utiliser une clé KMS différente ou désactiver le chiffrement :

1. Allez dans Systems Manager → Preferences → Session Manager
2. Modifiez la configuration pour utiliser une clé KMS que vous contrôlez, ou désactivez le chiffrement

### Option 4 : Utiliser EC2 Instance Connect (sans KMS)

1. Dans la console EC2, sélectionnez votre instance
2. Cliquez sur "Connect" → "EC2 Instance Connect"
3. Cela ouvre un terminal dans le navigateur sans besoin de KMS

## Vérification

Après avoir ajouté les permissions, attendez 1-2 minutes puis réessayez Session Manager.
