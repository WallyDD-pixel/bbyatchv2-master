#!/usr/bin/env node

// Script wrapper pour démarrer Next.js avec un port dynamique
const { spawn } = require('child_process');
const path = require('path');

// Récupérer le port depuis la variable d'environnement ou utiliser 3010 par défaut
const port = process.env.PORT || 3010;

console.log(`🚀 Démarrage de Next.js sur le port ${port}...`);

// Démarrer Next.js avec le port spécifié
const nextProcess = spawn('node_modules/.bin/next', ['start', '-p', port.toString()], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port.toString(),
    NODE_ENV: 'production'
  }
});

nextProcess.on('error', (error) => {
  console.error('❌ Erreur lors du démarrage:', error);
  process.exit(1);
});

nextProcess.on('exit', (code) => {
  console.log(`⚠️  Next.js s'est arrêté avec le code ${code}`);
  process.exit(code || 0);
});

// Gérer les signaux de terminaison
process.on('SIGTERM', () => {
  console.log('📴 Réception de SIGTERM, arrêt de Next.js...');
  nextProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📴 Réception de SIGINT, arrêt de Next.js...');
  nextProcess.kill('SIGINT');
});

