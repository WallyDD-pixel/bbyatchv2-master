# Script de vérification de malware pour Windows

## 📋 Description

Script PowerShell pour scanner votre PC Windows à la recherche de malwares connus (xmrig, moneroocean, systemwatcher, scanner_linux) et patterns malveillants.

## 🚀 Utilisation

### Méthode 1 : Exécution directe
```powershell
powershell -ExecutionPolicy Bypass -File verifier-malware-windows.ps1
```

### Méthode 2 : Depuis PowerShell
```powershell
# Ouvrir PowerShell en tant qu'administrateur
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\verifier-malware-windows.ps1
```

### Méthode 3 : Clic droit → Exécuter avec PowerShell
1. Clic droit sur `verifier-malware-windows.ps1`
2. Sélectionner "Exécuter avec PowerShell"

## 🔍 Ce que le script vérifie

1. **Processus malveillants** - Recherche les processus xmrig, moneroocean, systemwatcher, scanner_linux
2. **Fichiers suspects** - Scan dans Downloads, Desktop, Documents, TEMP
3. **Tâches planifiées** - Vérifie les tâches Windows suspectes
4. **Services Windows** - Recherche les services malveillants
5. **Connexions réseau** - Détecte les connexions vers l'IP malveillante (178.16.52.253)
6. **Fichiers de démarrage** - Vérifie les entrées de démarrage automatique
7. **Utilisation CPU/Mémoire** - Détecte les processus consommant beaucoup de ressources
8. **Fichiers récents suspects** - Scan des fichiers récemment modifiés dans TEMP

## 📊 Résultats

### Si aucun malware détecté
- ✅ Message de confirmation
- ✅ Recommandations de sécurité

### Si malware détecté
- 🚨 Liste détaillée des problèmes
- 📄 Rapport sauvegardé sur le Bureau
- ⚠️ Instructions pour nettoyer

## 🔒 Sécurité

Le script est **lecture seule** :
- ✅ Ne modifie rien sur votre système
- ✅ Ne supprime aucun fichier
- ✅ Ne fait que scanner et rapporter

## ⚠️ Si des malwares sont détectés

1. **Arrêter les processus** :
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -match 'xmrig|moneroocean|miner'} | Stop-Process -Force
   ```

2. **Supprimer les fichiers suspects** manuellement

3. **Supprimer les tâches planifiées** :
   ```powershell
   Unregister-ScheduledTask -TaskName 'NOM_DE_LA_TACHE' -Confirm:$false
   ```

4. **Exécuter un scan antivirus complet**

5. **Redémarrer l'ordinateur**

## 📅 Fréquence recommandée

- **Hebdomadaire** : Pour une surveillance régulière
- **Après installation de logiciels** : Pour vérifier qu'aucun malware n'a été installé
- **Si comportement suspect** : CPU élevé, ralentissements, etc.

## 🔧 Dépannage

### Erreur "Execution Policy"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Besoin de droits administrateur
- Clic droit sur PowerShell → "Exécuter en tant qu'administrateur"
- Puis exécuter le script

---

**Note :** Ce script complète mais ne remplace pas un antivirus professionnel.
