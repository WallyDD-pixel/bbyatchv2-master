module.exports = {
  apps: [
    {
      name: 'bbyatchv2-preprod',
      script: 'npm',
      args: 'run start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        // Charger .env via systemd ou shell export avant pm2 start
      },
      max_restarts: 10,
      min_uptime: '5s',
      restart_delay: 4000,
      watch: false,
      time: true,
    }
  ]
};
