# 🔧 Guide pour réparer la connexion SSH

## Problème
Connexion SSH timeout - impossible de se connecter au serveur.

## ✅ Vérifications AWS (déjà faites)
- Port 22 (SSH) : ✅ Ouvert avec source 0.0.0.0/0
- Le groupe de sécurité AWS est correct

## Causes possibles (le problème est sur le serveur)
1. **Pare-feu UFW** a bloqué le port 22 localement (le malware peut l'avoir fait)
2. **Service SSH arrêté** (le malware peut l'avoir arrêté)
3. **Serveur en panne** ou surchargé
4. **Le malware** a modifié les règles iptables/UFW
5. **IP publique a changé** (vérifiez dans la console AWS)

## Solutions

### Solution 1 : Vérifier et corriger le groupe de sécurité AWS

1. **Connectez-vous à la console AWS**
2. **Allez dans EC2 → Security Groups**
3. **Trouvez le groupe de sécurité** associé à votre instance
4. **Vérifiez les règles entrantes (Inbound Rules)** :
   - Doit avoir une règle pour le port 22 (SSH)
   - Source : Votre IP ou `0.0.0.0/0` (temporairement)
5. **Si la règle n'existe pas ou est incorrecte** :
   - Cliquez sur "Edit inbound rules"
   - Ajoutez une règle :
     - Type: SSH
     - Port: 22
     - Source: Votre IP publique (ou `0.0.0.0/0` temporairement)
     - Description: "SSH access"

### Solution 2 : Utiliser AWS Systems Manager Session Manager (RECOMMANDÉ)

Si Session Manager est configuré, vous pouvez vous connecter sans SSH :

```bash
aws ssm start-session --target i-VOTRE_INSTANCE_ID
```

**Ou via la console AWS :**
- EC2 → Instances → Sélectionner l'instance
- Bouton "Connect" → Onglet "Session Manager"
- Cliquez sur "Connect"

### Solution 3 : Redémarrer l'instance avec User Data pour réparer SSH

1. **Console AWS → EC2 → Instances**
2. **Sélectionner l'instance**
3. **Actions → Instance Settings → Edit User Data**
4. **Copier le contenu de `deploy/user-data-reparer-ssh.sh`**
5. **Actions → Instance State → Reboot**
6. **Attendre 2-3 minutes**
7. **Réessayer la connexion SSH**

Le script User Data réparera automatiquement SSH au démarrage.

### Solution 3 : Redémarrer l'instance via la console AWS

1. **Console AWS → EC2 → Instances**
2. **Sélectionnez votre instance**
3. **Actions → Instance State → Reboot** (ou Start si arrêtée)

### Solution 4 : Créer une nouvelle instance et migrer (dernier recours)

Si rien ne fonctionne, vous pouvez :
1. Créer un snapshot de votre volume EBS
2. Créer une nouvelle instance avec le bon groupe de sécurité
3. Attacher le volume au snapshot

## Vérifications à faire

### 1. Vérifier l'état de l'instance
- Console AWS → EC2 → Instances
- Vérifiez que l'instance est "Running"
- Vérifiez l'IP publique

### 2. Vérifier le groupe de sécurité
- Console AWS → EC2 → Security Groups
- Vérifiez les règles entrantes pour le port 22

### 3. Tester la connectivité
```bash
# Depuis votre machine locale
ping ec2-13-60-198-28.eu-north-1.compute.amazonaws.com
telnet ec2-13-60-198-28.eu-north-1.compute.amazonaws.com 22
```

## Après avoir récupéré l'accès SSH

Une fois que vous pouvez vous reconnecter, exécutez immédiatement :

```bash
# 1. Vérifier si UFW bloque le port 22
sudo ufw status
sudo ufw allow 22/tcp
sudo ufw reload

# 2. Exécuter le script de nettoyage
cd ~/bbyatch/bbyatchv2-master
chmod +x deploy/eliminer-et-bloquer-malware.sh
sudo bash deploy/eliminer-et-bloquer-malware.sh

# 3. Vérifier les règles iptables (si UFW n'est pas utilisé)
sudo iptables -L -n | grep 22
```

## Prévention future

1. **Ne jamais bloquer complètement le port 22** avec UFW
2. **Utiliser des règles spécifiques** : `sudo ufw allow from VOTRE_IP to any port 22`
3. **Sauvegarder les règles UFW** avant de les modifier
4. **Utiliser AWS Systems Manager** comme backup pour l'accès
