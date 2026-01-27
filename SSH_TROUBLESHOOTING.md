# Guide de dépannage SSH pour EC2

## Problèmes courants et solutions

### 1. Vérifier le chemin du fichier .pem
Le fichier `bbyatch.pem` doit être accessible. Vérifiez son emplacement exact.

**Solution :**
```powershell
# Si le fichier est dans un autre répertoire, utilisez le chemin complet
ssh -i "C:\chemin\complet\vers\bbyatch.pem" ubuntu@ec2-13-53-121-224.eu-north-1.compute.amazonaws.com
```

### 2. Permissions du fichier .pem (sur Windows)
Sur Windows, les permissions peuvent parfois poser problème.

**Solution :**
```powershell
# Vérifier les permissions du fichier
icacls "bbyatch.pem"

# Si nécessaire, restreindre les permissions (propriétaire uniquement)
icacls "bbyatch.pem" /inheritance:r
icacls "bbyatch.pem" /grant:r "%USERNAME%:F"
```

### 3. Vérifier la connectivité réseau
Assurez-vous que le serveur est accessible.

**Solution :**
```powershell
# Tester la connexion au port 22
Test-NetConnection -ComputerName ec2-13-53-121-224.eu-north-1.compute.amazonaws.com -Port 22
```

### 4. Vérifier le groupe de sécurité AWS
Le groupe de sécurité de votre instance EC2 doit autoriser le trafic SSH (port 22) depuis votre IP.

**À vérifier dans la console AWS :**
- EC2 → Instances → Sélectionner votre instance
- Onglet "Sécurité" → Vérifier les règles du groupe de sécurité
- Assurez-vous qu'une règle autorise le port 22 depuis votre IP (ou 0.0.0.0/0 pour toutes les IPs)

### 5. Vérifier que l'instance est en cours d'exécution
L'instance EC2 doit être dans l'état "running".

**Dans la console AWS :**
- EC2 → Instances → Vérifier l'état de l'instance

### 6. Utiliser l'option -v pour le débogage
Activez le mode verbeux pour voir où la connexion échoue.

**Solution :**
```powershell
ssh -v -i "bbyatch.pem" ubuntu@ec2-13-53-121-224.eu-north-1.compute.amazonaws.com
```

Pour plus de détails :
```powershell
ssh -vvv -i "bbyatch.pem" ubuntu@ec2-13-53-121-224.eu-north-1.compute.amazonaws.com
```

### 7. Vérifier le nom d'utilisateur
Pour Ubuntu, utilisez `ubuntu`. Pour Amazon Linux, utilisez `ec2-user`.

### 8. Vérifier l'adresse IP publique
L'adresse IP publique peut avoir changé si l'instance a été redémarrée.

**Dans la console AWS :**
- EC2 → Instances → Vérifier l'adresse IP publique actuelle

### 9. Utiliser l'adresse IP au lieu du hostname
Essayez avec l'adresse IP directement :

```powershell
ssh -i "bbyatch.pem" ubuntu@13.53.121.224
```

## Commandes de test rapides

```powershell
# 1. Tester la connectivité
Test-NetConnection -ComputerName 13.53.121.224 -Port 22

# 2. SSH avec mode verbeux
ssh -vvv -i "bbyatch.pem" ubuntu@ec2-13-53-121-224.eu-north-1.compute.amazonaws.com

# 3. SSH avec IP directe
ssh -i "bbyatch.pem" ubuntu@13.53.121.224
```

## Message d'erreur courant : "Permission denied (publickey)"

Si vous obtenez cette erreur :
1. Vérifiez que vous utilisez la bonne clé .pem
2. Vérifiez que la clé est associée à l'instance dans AWS
3. Vérifiez les permissions du fichier .pem
4. Essayez de spécifier explicitement la clé avec `-i`

## Message d'erreur : "Connection timed out"

Si vous obtenez cette erreur :
1. Vérifiez le groupe de sécurité AWS (port 22 doit être ouvert)
2. Vérifiez que l'instance est en cours d'exécution
3. Vérifiez votre connexion Internet
4. Vérifiez que l'adresse IP/hostname est correcte
