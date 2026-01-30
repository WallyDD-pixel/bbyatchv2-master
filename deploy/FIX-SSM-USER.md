# Fix : Utilisateur SSM inexistant

## Problème
Session Manager essaie de se connecter avec l'utilisateur `bbyatch` qui n'existe pas sur le serveur.

## Solution 1 : Créer l'utilisateur `bbyatch` (Recommandé)

### Via EC2 Instance Connect

1. **Console AWS** → **EC2** → **Instances**
2. Sélectionnez votre instance
3. **Connect** → **EC2 Instance Connect** → **Connect**

Une fois connecté :

```bash
# Créer l'utilisateur bbyatch
sudo useradd -m -s /bin/bash bbyatch

# Ajouter l'utilisateur au groupe sudo (optionnel, pour les privilèges admin)
sudo usermod -aG wheel bbyatch  # Amazon Linux 2023
# ou
sudo usermod -aG sudo bbyatch   # Ubuntu/Debian

# Vérifier que l'utilisateur existe
id bbyatch
```

### Vérifier les utilisateurs existants

```bash
# Lister les utilisateurs
cat /etc/passwd | grep -E "ec2-user|admin|bbyatch"
```

## Solution 2 : Configurer SSM pour utiliser un utilisateur existant

Si vous préférez utiliser `ec2-user` ou `admin` :

### Via AWS CLI (CloudShell)

```bash
# Vérifier la configuration actuelle
aws ssm describe-instance-information \
  --instance-information-filter-list key=InstanceIds,valueSet=i-0f72f180aeeaedf7e

# Modifier la configuration SSM pour utiliser ec2-user
aws ssm send-command \
  --instance-ids "i-0f72f180aeeaedf7e" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["sudo usermod -aG ssm-user ec2-user"]' \
  --comment "Add ec2-user to ssm-user group"
```

### Ou créer l'utilisateur via Systems Manager

```bash
# Créer l'utilisateur bbyatch via SSM
aws ssm send-command \
  --instance-ids "i-0f72f180aeeaedf7e" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "sudo useradd -m -s /bin/bash bbyatch",
    "sudo usermod -aG wheel bbyatch",
    "id bbyatch"
  ]' \
  --comment "Create bbyatch user for SSM"
```

## Solution 3 : Utiliser l'utilisateur par défaut (ec2-user)

Si vous voulez utiliser `ec2-user` (qui existe déjà sur Amazon Linux) :

### Modifier la configuration SSM Document

1. **Console AWS** → **Systems Manager** → **Session Manager** → **Preferences**
2. Cliquez sur **Edit**
3. Dans **Shell profile - Linux**, changez :
   - **RunAs enabled** : Désactivé (utilisera l'utilisateur par défaut)
   - Ou **RunAs default user** : `ec2-user`

## Solution 4 : Créer l'utilisateur via un script de démarrage

Si vous avez accès au serveur via une autre méthode (SSH direct, EC2 Instance Connect) :

```bash
# Se connecter au serveur
# Puis exécuter :

sudo useradd -m -s /bin/bash bbyatch
sudo usermod -aG wheel bbyatch

# Vérifier
id bbyatch
groups bbyatch
```

## Vérification

Après avoir créé l'utilisateur, attendez 1-2 minutes puis réessayez Session Manager.

## Alternative : Utiliser EC2 Instance Connect

En attendant, vous pouvez utiliser **EC2 Instance Connect** qui fonctionne avec l'utilisateur par défaut (`ec2-user`).

1. **Console AWS** → **EC2** → **Instances**
2. **Connect** → **EC2 Instance Connect** → **Connect**

Une fois connecté, créez l'utilisateur `bbyatch` :

```bash
sudo useradd -m -s /bin/bash bbyatch
sudo usermod -aG wheel bbyatch
id bbyatch
```
