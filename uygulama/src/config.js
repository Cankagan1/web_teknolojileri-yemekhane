// Tüm ayarlar ortam değişkenlerinden (docker-compose.yml) gelir.
module.exports = {
  port: 3000,
  db: {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    primaryHost: process.env.DB_PRIMARY_HOST, // yazma
    replicaHost: process.env.DB_REPLICA_HOST, // okuma
  },
  oturumSuresiMs: 30 * 60 * 1000,
};
