module.exports = {
  apps: [
    {
      name: 'nyl',
      cwd: __dirname, 
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3007',
      instances: 2, 
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3007,
      },
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      time: true, 
    },
  ],
};
