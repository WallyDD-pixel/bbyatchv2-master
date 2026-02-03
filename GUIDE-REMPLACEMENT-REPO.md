# Guide : Remplacer le dépôt GitHub infecté par la version propre

## ⚠️ ATTENTION
Cette opération va **remplacer complètement** le dépôt GitHub distant par votre version locale nettoyée. Tous les fichiers infectés sur GitHub seront supprimés.

## 📋 Étapes

### 1. Ajouter tous les changements
```bash
git add -A
```

### 2. Créer un commit
```bash
git commit -m "Security: Complete cleanup - Remove all malware, redundant scripts and documentation"
```

### 3. Remplacer le dépôt GitHub (force push)
```bash
git push origin main --force
```

**⚠️ Cette commande va écraser complètement le dépôt distant !**

## ✅ Après le push

1. Vérifiez sur GitHub que tous les fichiers infectés ont été supprimés
2. Vérifiez que les nouveaux scripts de sécurité sont présents :
   - `verifier-apres-npm-install.sh`
   - `cleanup-malware-complete.sh`
   - `install-protection.sh`
   - `monitor-malware.sh`
   - `harden-security.sh`
   - `deploy/analyser-packages-postinstall.sh`

3. Sur vos nouveaux serveurs, clonez depuis GitHub :
   ```bash
   git clone https://github.com/WallyDD-pixel/bbyatchv2-master.git
   ```

## 🔒 Sécurité

Après avoir remplacé le dépôt :
- ✅ Le code source est propre (vérifié)
- ✅ Tous les scripts redondants sont supprimés
- ✅ Tous les fichiers de documentation redondants sont supprimés
- ✅ Les scripts de sécurité sont en place

---

**Important :** Après le force push, tous les serveurs devront faire un `git pull --force` ou être re-clonés pour obtenir la version propre.
