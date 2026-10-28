// Oturum deposu. Şimdilik bellekte; Aşama 3'te aynı arayüzle Redis'e taşınacak
// (anahtar oturum:{token}, 30 dk, her istekte yenilenir, çıkışta silinir).
const crypto = require('crypto');
const { oturumSuresiMs } = require('./config');

const depo = new Map();

async function olustur(kullanici) {
  const token = crypto.randomUUID();
  depo.set(token, { kullanici, bitis: Date.now() + oturumSuresiMs });
  return token;
}

async function getir(token) {
  const kayit = depo.get(token);
  if (!kayit) return null;
  if (kayit.bitis < Date.now()) {
    depo.delete(token);
    return null;
  }
  kayit.bitis = Date.now() + oturumSuresiMs; // her istekte yenile
  return kayit.kullanici;
}

async function sil(token) {
  depo.delete(token);
}

module.exports = { olustur, getir, sil };
