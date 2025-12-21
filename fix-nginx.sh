#!/bin/bash

echo "🔧 Correction de la configuration nginx..."

# Sauvegarder l'ancienne config
echo "1️⃣ Sauvegarde de l'ancienne configuration..."
sudo cp /etc/nginx/sites-enabled/bbyatchv2 /etc/nginx/sites-enabled/bbyatchv2.backup.$(date +%Y%m%d_%H%M%S)

# Créer une nouvelle configuration propre
echo ""
echo "2️⃣ Création d'une nouvelle configuration propre..."

sudo tee /etc/nginx/sites-available/bbyatchv2 > /dev/null << 'NGINX_EOF'
server {
  listen 80;
  listen 443 ssl;
  server_name preprod.bbservicescharter.com;
  
  ssl_certificate /etc/letsencrypt/live/preprod.bbservicescharter.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/preprod.bbservicescharter.com/privkey.pem;

  client_max_body_size 25m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Static cache hints
  location ~* \.(?:css|js|woff2?|ttf|otf|eot)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri @nextjs;
  }

  location ~* \.(?:png|jpe?g|webp|avif|gif|svg|ico)$ {
    add_header Cache-Control "public, max-age=2592000";
    try_files $uri @nextjs;
  }

  location @nextjs {
    proxy_pass http://127.0.0.1:3000;
  }

  # Sécurité basique
  add_header X-Frame-Options SAMEORIGIN;
  add_header X-Content-Type-Options nosniff;
  add_header Referrer-Policy strict-origin-when-cross-origin;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()";
}
NGINX_EOF

# Activer la nouvelle configuration
echo ""
echo "3️⃣ Activation de la nouvelle configuration..."
sudo ln -sf /etc/nginx/sites-available/bbyatchv2 /etc/nginx/sites-enabled/bbyatchv2

# Tester la configuration
echo ""
echo "4️⃣ Test de la configuration nginx..."
if sudo nginx -t; then
    echo "   ✅ Configuration valide"
    echo ""
    echo "5️⃣ Rechargement de nginx..."
    sudo systemctl reload nginx
    echo "   ✅ Nginx rechargé"
else
    echo "   ❌ Erreur dans la configuration !"
    echo "   Restauration de la sauvegarde..."
    sudo cp /etc/nginx/sites-enabled/bbyatchv2.backup.* /etc/nginx/sites-enabled/bbyatchv2
    exit 1
fi

echo ""
echo "✅ Configuration nginx corrigée !"
echo "🔍 Vérifiez maintenant votre site - la redirection malveillante devrait être supprimée."









