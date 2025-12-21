// Charger les variables d'environnement depuis .env si disponible
try {
  require('dotenv').config();
} catch (e) {
  // dotenv n'est pas installé, on utilisera les variables d'environnement du système
  console.warn('dotenv non disponible, utilisation des variables d\'environnement système');
}

module.exports = {
  apps: [
    {
      name: 'bbyatchv2-preprod',
      script: 'npm',
      args: 'run start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3010,
        DATABASE_URL: process.env.DATABASE_URL,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        STRIPE_TEST_SK: process.env.STRIPE_TEST_SK,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      },
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      watch: false,
      time: true,
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
    }
  ]
};
