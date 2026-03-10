// ─── Server Configuration ─────────────────────────────────────────────────────
// All environment variables resolved here. Import this instead of process.env.

const config = {
  port:       parseInt(process.env.PORT    || '3001', 10),
  wsPort:     parseInt(process.env.WS_PORT || '3002', 10),
  jwtSecret:  process.env.JWT_SECRET || 'chatavar_dev_secret_change_in_prod',
  jwtExpiry:  process.env.JWT_EXPIRY || '30d',
  clientUrl:  process.env.CLIENT_URL || 'http://localhost:3000',
  dbPath:     process.env.DB_PATH    || './data/chatavar.db',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  allowedOrigins: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:8080',
  ],
};

module.exports = config;
