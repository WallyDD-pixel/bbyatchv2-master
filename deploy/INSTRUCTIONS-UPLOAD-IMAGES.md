# Instructions pour résoudre l'erreur 413 (Upload d'images)

## Limites configurées

### Nginx
- `client_max_body_size 50m` (dans `deploy/nginx-preprod.conf`)

### Next.js
- `bodySizeLimit: "50mb"` dans `next.config.ts`

### Supabase Storage
- Maximum 10MB par fichier image
- Maximum 45MB pour l'ensemble des fichiers uploadés en une seule fois

## Après modification de nginx, exécuter :

```bash
# Sur le VPS
cd /home/ubuntu/bbyatchv2-master
sudo nginx -t
sudo systemctl reload nginx
```

## Recommandations

- Si vous uploadez plusieurs images, assurez-vous que leur taille totale ne dépasse pas 45MB
- Réduisez la taille des images avant upload si nécessaire (max 10MB par image)
- En cas d'erreur 413, uploadez les images une par une ou réduisez leur taille
