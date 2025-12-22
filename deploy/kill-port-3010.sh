#!/bin/bash

# Script pour tuer tous les processus utilisant le port 3010
# Usage: bash deploy/kill-port-3010.sh

set -e

PORT=3010

echo "🔍 Recherche des processus utilisant le port $PORT..."

# Méthode 1: lsof
echo "Méthode 1: lsof"
PIDS=$(sudo lsof -ti:$PORT 2>/dev/null || echo "")
if [ -n "$PIDS" ]; then
    echo "Processus trouvés avec lsof: $PIDS"
    for PID in $PIDS; do
        echo "Tuer le processus $PID..."
        sudo kill -9 $PID 2>/dev/null || true
    done
fi

# Méthode 2: fuser
echo "Méthode 2: fuser"
if command -v fuser &> /dev/null; then
    sudo fuser -k $PORT/tcp 2>/dev/null || true
fi

# Méthode 3: netstat + kill
echo "Méthode 3: netstat"
NETSTAT_PIDS=$(sudo netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1 | grep -v "^$" || echo "")
if [ -n "$NETSTAT_PIDS" ]; then
    echo "Processus trouvés avec netstat: $NETSTAT_PIDS"
    for PID in $NETSTAT_PIDS; do
        echo "Tuer le processus $PID..."
        sudo kill -9 $PID 2>/dev/null || true
    done
fi

# Méthode 4: ss + kill
echo "Méthode 4: ss"
SS_PIDS=$(sudo ss -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' || echo "")
if [ -n "$SS_PIDS" ]; then
    echo "Processus trouvés avec ss: $SS_PIDS"
    for PID in $SS_PIDS; do
        echo "Tuer le processus $PID..."
        sudo kill -9 $PID 2>/dev/null || true
    done
fi

sleep 2

# Vérifier que le port est libre
echo ""
echo "Vérification finale..."
if sudo lsof -ti:$PORT > /dev/null 2>&1; then
    echo "❌ Le port $PORT est toujours utilisé!"
    echo "Processus restants:"
    sudo lsof -i:$PORT
    echo ""
    echo "Tentative de tuer avec killall..."
    sudo killall -9 node 2>/dev/null || true
    sleep 2
else
    echo "✅ Le port $PORT est maintenant libre!"
fi

# Vérification finale
if sudo lsof -ti:$PORT > /dev/null 2>&1; then
    echo "❌ Le port est toujours utilisé après toutes les tentatives"
    exit 1
else
    echo "✅ Port $PORT libéré avec succès!"
fi



