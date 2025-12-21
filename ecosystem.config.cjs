module.exports = {
  apps: [
    {
      name: 'bbyatchv2-preprod',
      script: 'start-server.js', // Utilise le script wrapper qui gère le port dynamiquement
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3010, // Utilise PORT de l'environnement ou 3010 par défaut
        // Charger .env via dotenv ou export avant pm2 start
      },
      autorestart: false, // Désactive le redémarrage automatique
      max_restarts: 0, // Pas de redémarrages
      watch: false,
      time: true,
    }
  ]
};
