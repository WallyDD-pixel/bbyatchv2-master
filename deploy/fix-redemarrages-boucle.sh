#!/bin/bash
# Script pour corriger les redémarrages en boucle

set -e

echo "=== CORRECTION DES REDÉMARRAGES EN BOUCLE ==="
echo ""

cd ~/bbyatch/bbyatchv2-master

# 1. Arrêter PM2 complètement
echo "1. Arrêt complet de PM2..."
pm2 stop all || true
pm2 delete all || true
sleep 3

# 2. Tuer tous les processus Node qui traînent
echo "2. Nettoyage des processus Node..."
pkill -9 -f "next-server" || true
pkill -9 -f "node.*3003" || true
pkill -9 -f "node.*3010" || true
sleep 2

# 3. Vérifier les logs PM2 pour identifier l'erreur
echo "3. Vérification des logs d'erreur..."
if [ -f "./logs/pm2-error.log" ]; then
    echo "=== DERNIÈRES ERREURS ==="
    tail -50 ./logs/pm2-error.log | grep -A 10 -B 5 "Error\|error\|ERROR\|crash\|Crash" | tail -30
    echo ""
fi

# 4. Corriger l'incohérence de port
echo "4. Correction de l'incohérence de port..."
# On va utiliser 3003 partout (comme dans package.json)
sed -i 's/PORT: process.env.PORT || 3010/PORT: process.env.PORT || 3003/g' ecosystem.config.cjs
echo "✅ Port corrigé dans ecosystem.config.cjs (3003)"

# 5. Vérifier la configuration Nginx
echo "5. Vérification de la configuration Nginx..."
NGINX_CONFIG="/etc/nginx/sites-enabled/default"
if [ -f "$NGINX_CONFIG" ]; then
    if grep -q "proxy_pass.*3010" "$NGINX_CONFIG"; then
        echo "⚠️  Nginx pointe vers 3010, on le change pour 3003..."
        sudo sed -i 's/proxy_pass http:\/\/127\.0\.0\.1:3010/proxy_pass http:\/\/127.0.0.1:3003/g' "$NGINX_CONFIG"
        sudo sed -i 's/localhost:3010/localhost:3003/g' "$NGINX_CONFIG"
        if sudo nginx -t; then
            sudo systemctl reload nginx
            echo "✅ Nginx reconfiguré pour le port 3003"
        else
            echo "❌ Erreur dans la configuration Nginx"
            exit 1
        fi
    else
        echo "✅ Nginx déjà configuré correctement"
    fi
fi

# 6. Vérifier les variables d'environnement critiques
echo "6. Vérification des variables d'environnement..."
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env manquant !"
    exit 1
fi

REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL")
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" .env 2>/dev/null; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "⚠️  Variables manquantes: ${MISSING_VARS[*]}"
    echo "   Vérifie ton fichier .env"
else
    echo "✅ Variables d'environnement OK"
fi

# 7. Vérifier la connexion à la base de données
echo "7. Test de connexion à la base de données..."
if command -v node &> /dev/null; then
    node -e "
    require('dotenv').config();
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.\$connect()
        .then(() => {
            console.log('✅ Connexion DB OK');
            process.exit(0);
        })
        .catch((e) => {
            console.error('❌ Erreur DB:', e.message);
            process.exit(1);
        });
    " 2>&1 || echo "⚠️  Impossible de tester la DB (node ou dotenv manquant)"
else
    echo "⚠️  Node.js non trouvé, impossible de tester la DB"
fi

# 8. Nettoyer les caches
echo "8. Nettoyage des caches..."
rm -rf .next/cache 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
echo "✅ Caches nettoyés"

# 9. Vérifier la mémoire disponible
echo "9. Vérification de la mémoire..."
free -h
AVAILABLE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ "$AVAILABLE_MEM" -lt 200 ]; then
    echo "⚠️  Mémoire disponible faible: ${AVAILABLE_MEM}MB"
    echo "   L'app risque de crasher par manque de mémoire"
fi

# 10. Corriger getServerSession pour éviter les boucles
echo "10. Vérification de getServerSession..."
if grep -q "fetch.*sessionUrl" src/lib/auth.ts; then
    echo "⚠️  getServerSession utilise fetch() - peut causer des boucles"
    echo "   Si l'app crash au démarrage, c'est probablement à cause de ça"
    echo "   Solution: utiliser directement les cookies sans fetch"
fi

# 11. Redémarrer avec plus de mémoire et meilleure config
echo "11. Redémarrage de l'application..."
export NODE_OPTIONS="--max-old-space-size=2048"
export PORT=3003

# Mettre à jour ecosystem.config.cjs pour limiter les redémarrages
if ! grep -q "max_restarts: 5" ecosystem.config.cjs; then
    sed -i 's/max_restarts: [0-9]*/max_restarts: 5/g' ecosystem.config.cjs
    sed -i 's/min_uptime: .*/min_uptime: "30s"/g' ecosystem.config.cjs
    sed -i 's/restart_delay: [0-9]*/restart_delay: 10000/g' ecosystem.config.cjs
    echo "✅ Configuration PM2 améliorée (max_restarts: 5, min_uptime: 30s, delay: 10s)"
fi

# 12. Démarrer avec PM2
pm2 start ecosystem.config.cjs
sleep 5

# 13. Surveiller les premiers instants
echo "12. Surveillance des premiers instants (10 secondes)..."
for i in {1..10}; do
    sleep 1
    STATUS=$(pm2 jlist | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    RESTARTS=$(pm2 list | grep bbyatch | awk '{print $8}')
    echo "   Seconde $i: Status=$STATUS, Redémarrages=$RESTARTS"
    if [ "$STATUS" = "errored" ] || [ "$STATUS" = "stopped" ]; then
        echo "❌ L'app a crashé ! Vérifie les logs:"
        pm2 logs bbyatch --lines 20 --nostream
        exit 1
    fi
done

# 14. Afficher l'état final
echo ""
echo "=== ÉTAT FINAL ==="
pm2 list
echo ""
echo "=== LOGS RÉCENTS ==="
pm2 logs bbyatch --lines 15 --nostream

# 15. Test de connexion
echo ""
echo "15. Test de connexion locale..."
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3003 | grep -q "200\|404\|500"; then
    echo "✅ Application répond sur localhost:3003"
else
    echo "❌ Application ne répond pas"
    echo "   Vérifie les logs: pm2 logs bbyatch --lines 50"
fi

echo ""
echo "=== FIN DE LA CORRECTION ==="
echo ""
echo "📋 PROCHAINES ÉTAPES:"
echo "1. Surveille les logs: pm2 logs bbyatch --lines 100"
echo "2. Si ça crash encore, vérifie l'erreur exacte dans les logs"
echo "3. Si c'est getServerSession, on devra le corriger dans le code"
