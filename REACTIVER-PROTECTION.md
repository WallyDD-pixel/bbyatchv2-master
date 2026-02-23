# Réactiver la protection anti-malware sur le serveur EC2

Si les scripts de protection ont été désactivés ou si le malware est revenu, suivez ces étapes **sur le serveur** (en SSH).

## 1. Nettoyer immédiatement

```bash
cd ~/bbyatchv2-master
chmod +x *.sh
bash cleanup-malware-complete.sh
```

Cela supprime processus, dossiers (moneroocean, xmrig), le backdoor dans `~/.bashrc`, et le binaire dans `/var/tmp/systemd-logind`.

## 2. Vérifier que .bashrc est propre

```bash
grep -E "var/tmp|nohup|systemd-logind|xmrig|moneroocean" ~/.bashrc || echo "OK: rien de suspect"
```

Si une ligne suspecte s’affiche, éditez : `nano ~/.bashrc` et supprimez-la.

## 3. Réinstaller la protection (timer systemd)

```bash
cd ~/bbyatchv2-master
bash install-protection.sh
```

Cela lance :
- `cleanup-malware-complete.sh`
- `harden-security.sh` (UFW, fail2ban, **service + timer systemd**)
- `monitor-malware.sh`

Le **timer systemd** exécute la protection **toutes les 5 minutes** (sans avoir besoin de cron).

## 4. Vérifier que le timer tourne

```bash
sudo systemctl status malware-protection.timer
sudo systemctl list-timers | grep malware
```

Vous devez voir `malware-protection.timer` actif. Si ce n’est pas le cas :

```bash
sudo systemctl enable malware-protection.timer
sudo systemctl start malware-protection.timer
```

## 5. Tester le script de surveillance

```bash
cd ~/bbyatchv2-master
bash monitor-malware.sh
```

Tout doit être vert (aucune menace détectée).

## Résumé

| Élément | Rôle |
|--------|------|
| `cleanup-malware-complete.sh` | Nettoyage one-shot (processus, dossiers, .bashrc, /var/tmp) |
| `monitor-malware.sh` | Même nettoyage + log ; appelé par le timer |
| `malware-protection.service` + `.timer` | Exécution automatique toutes les 5 min |
| `harden-security.sh` | UFW, fail2ban, création du service/timer |

Une fois le dépôt à jour sur le serveur (git pull), les scripts incluent aussi la détection du **backdoor .bashrc** et du **faux systemd-logind** dans `/var/tmp`.
