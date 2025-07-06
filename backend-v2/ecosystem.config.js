module.exports = {
  apps: [
    {
      name: 'bookedbarber-backend',
      script: 'uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8000 --reload',
      cwd: './backend-v2',
      interpreter: 'python3',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        ENVIRONMENT: 'development',
        PYTHONUNBUFFERED: '1'
      },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      log_file: 'logs/backend-combined.log',
      time: true
    },
    {
      name: 'bookedbarber-frontend',
      script: 'npm',
      args: 'run dev',
      cwd: './backend-v2/frontend-v2',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: '../logs/frontend-error.log',
      out_file: '../logs/frontend-out.log',
      log_file: '../logs/frontend-combined.log',
      time: true
    },
    {
      name: 'bookedbarber-redis',
      script: 'redis-server',
      args: '--port 6379 --maxmemory 256mb --maxmemory-policy allkeys-lru',
      instances: 1,
      autorestart: true,
      watch: false,
      error_file: 'logs/redis-error.log',
      out_file: 'logs/redis-out.log',
      log_file: 'logs/redis-combined.log',
      time: true
    }
  ],

  // Deploy configuration (optional)
  deploy: {
    development: {
      key: '~/.ssh/id_rsa',
      user: 'deploy',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/bookedbarber.git',
      path: '/var/www/bookedbarber',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env development'
    }
  }
};