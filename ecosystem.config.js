module.exports = {
  apps: [{
    name: 'online-chat',
    cwd: '/var/www/online-chat',
    script: '.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
    },
    instances: 1,
    exec_mode: 'fork',
    error_file: '/var/log/online-chat.err.log',
    out_file: '/var/log/online-chat.out.log',
    log_file: '/var/log/online-chat.combined.log',
    time: true
  }]
}