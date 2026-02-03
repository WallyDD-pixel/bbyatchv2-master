# Installation de Git sur Amazon Linux

## Installation de Git

```bash
# Mettre à jour le système
sudo dnf update -y

# Installer Git
sudo dnf install -y git
```

## Vérifier l'installation

```bash
git --version
```

## Cloner le dépôt

```bash
cd ~
git clone https://github.com/WallyDD-pixel/bbyatchv2-master.git
cd bbyatchv2-master
```

## Installation complète des dépendances (après Git)

```bash
# Installer Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Installer PM2
sudo npm install -g pm2

# Installer Nginx
sudo dnf install -y nginx
```
