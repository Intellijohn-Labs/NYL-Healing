// PM2 settings for the NYL web app (registration form, patient pass, staff app).
// Start:    pm2 start ecosystem.config.js && pm2 save
// Update:   git pull && npm ci && npm run build && pm2 reload nyl
// Secrets are NOT here: they are in .env.production on the server (never commit that file).
module.exports = {
  apps: [
    {
      name: 'nyl',
      cwd: __dirname, // so Next.js finds .env.production and the build in this folder
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3007',
      instances: 2, // 2 copies share the work; one keeps running if the other restarts
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3007,
      },
      max_memory_restart: '1G', // restart a copy if it uses more than 1 GB
      autorestart: true,
      watch: false,
      time: true, // add time stamps to the logs
    },
  ],
};
