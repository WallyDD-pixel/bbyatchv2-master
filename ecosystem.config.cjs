// Charger les variables d'environnement depuis .env manuellement
const fs = require('fs');
const path = require('path');

// Fonction pour charger .env sans dépendance externe
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        // Gérer les valeurs entre guillemets
        const match = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Retirer les guillemets au début et à la fin si présents
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

module.exports = {
  apps: [
    {
      name: 'bbyatch',
      script: './node_modules/.bin/next',
      args: 'start -p 3003',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3003,
        DATABASE_URL: process.env.DATABASE_URL,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        STRIPE_TEST_SK: process.env.STRIPE_TEST_SK,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        NODE_OPTIONS: '--max-old-space-size=2048',
      },
      max_restarts: 5,
      min_uptime: '30s',
      restart_delay: 10000,
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
