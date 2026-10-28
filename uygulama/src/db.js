// İki ayrı bağlantı havuzu: yazma -> kaynak (primary), okuma -> replika.
const mysql = require('mysql2/promise');
const c = require('./config');

function havuzOlustur(host) {
  return mysql.createPool({
    host,
    port: 3306,
    user: c.db.user,
    password: c.db.password,
    database: c.db.database,
    charset: 'utf8mb4',
    timezone: '+03:00',
    dateStrings: true,    // DATE alanları "2026-10-27" metni olarak gelsin
    decimalNumbers: true, // DECIMAL alanları sayı olarak gelsin
    waitForConnections: true,
    connectionLimit: 10,
  });
}

module.exports = {
  yazma: havuzOlustur(c.db.primaryHost),
  okuma: havuzOlustur(c.db.replicaHost),
};
