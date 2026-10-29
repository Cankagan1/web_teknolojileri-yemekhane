// Oturum deposu (Redis). Anahtar oturum:{token}, süre 30 dk, her istekte yenilenir, çıkışta silinir.
// Oturumlar Redis'te durduğu için uygulama container'ı yeniden başlasa da düşmez.
const crypto = require('crypto');
const redis = require('./redis');
const { oturumSuresiMs } = require('./config');

const SURE_SN = Math.round(oturumSuresiMs / 1000);
const anahtar = (token) => `oturum:${token}`;
const TOKEN_BICIMI = /^[0-9a-f-]{36}$/; // çerezden gelen değer anahtar olarak kullanılacağı için biçimi denetlenir

async function olustur(kullanici) {
  const token = crypto.randomUUID();
  await redis.set(anahtar(token), JSON.stringify(kullanici), { EX: SURE_SN });
  return token;
}

// GETEX: değeri okur ve süreyi aynı anda 30 dakikaya geri çeker
async function getir(token) {
  if (!TOKEN_BICIMI.test(token)) return null;
  const deger = await redis.getEx(anahtar(token), { EX: SURE_SN });
  return deger ? JSON.parse(deger) : null;
}

async function sil(token) {
  if (!TOKEN_BICIMI.test(token)) return;
  await redis.del(anahtar(token));
}

module.exports = { olustur, getir, sil };
