// Veri katmanı: SQL yalnızca repository dosyalarında bulunur.
const { okuma, yazma } = require('../db');

async function epostayaGore(email) {
  const [satirlar] = await okuma.query(
    'SELECT id, ad_soyad AS adSoyad, rol, sifre_hash AS sifreHash FROM kullanicilar WHERE email = ?',
    [email]
  );
  return satirlar[0] || null;
}

// Bakiye hep kaynaktan okunur: replikasyon gecikmesi yüzünden eski değer görünmesin.
async function bakiyeGetir(id) {
  const [satirlar] = await yazma.query('SELECT bakiye FROM kullanicilar WHERE id = ?', [id]);
  return satirlar[0] ? satirlar[0].bakiye : null;
}

module.exports = { epostayaGore, bakiyeGetir };
