module.exports = {
  apps: [
    {
      name: 'bbyatchv2-preprod',
      script: 'npm',
      args: 'run start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
        // Charger .env via dotenv ou export avant pm2 start
      },
      autorestart: false, // Désactive le redémarrage automatique
      max_restarts: 0, // Pas de redémarrages
      watch: false,
      time: true,
    }
  ]
};
