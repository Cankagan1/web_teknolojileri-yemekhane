const { okuma, yazma } = require('../db');

// Hareket geçmişi bir liste olduğu için replikadan okunur.
async function hareketler(kullaniciId) {
  const [s] = await okuma.query(
    `SELECT id, tur, tutar, olusturma_zamani AS zaman
       FROM bakiye_hareketleri WHERE kullanici_id = ? ORDER BY id DESC LIMIT 50`,
    [kullaniciId]
  );
  return s;
}

async function yukle(kullaniciId, tutar) {
  const [sonuc] = await yazma.query('CALL sp_bakiye_yukle(?, ?)', [kullaniciId, tutar]);
  return sonuc[0][0]; // { yeni_bakiye }
}

module.exports = { hareketler, yukle };
