// Tek Redis istemcisi: menü önbelleği ve oturum deposu bunu kullanır.
const { createClient } = require('redis');
const { redis: ayar } = require('./config');

const istemci = createClient({ url: `redis://${ayar.host}:${ayar.port}` });
istemci.on('error', (e) => console.error('Redis hatası:', e.message));

module.exports = istemci;
