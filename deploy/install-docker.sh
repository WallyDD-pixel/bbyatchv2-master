#!/bin/bash

# Script d'installation de Docker sur Ubuntu

echo "🐳 Installation de Docker..."

# Mettre à jour les paquets
sudo apt update

# Installer les dépendances
sudo apt install -y ca-certificates curl gnupg lsb-release

# Ajouter la clé GPG officielle de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Configurer le dépôt Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker Engine et Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Ajouter l'utilisateur ubuntu au groupe docker (pour éviter d'utiliser sudo)
sudo usermod -aG docker ubuntu

# Démarrer Docker
sudo systemctl start docker
sudo systemctl enable docker

echo "✅ Docker installé avec succès!"
echo ""
echo "⚠️  IMPORTANT: Vous devez vous déconnecter et vous reconnecter pour que les permissions Docker fonctionnent."
echo "   Ou exécutez: newgrp docker"

