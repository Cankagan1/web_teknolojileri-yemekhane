const { okuma, yazma } = require('../db');
const { UygulamaHatasi } = require('../errors');

// Kullanıcının kullandığı (turnikeden geçtiği) menüler ve varsa verdiği oy. Liste -> replika.
async function kullanilanMenuler(kullaniciId) {
  const [s] = await okuma.query(
    `SELECT r.menu_id AS menuId, d.tarih, d.ogun_ad AS ogun, d.yemekhane_ad AS yemekhane, d.yemekler,
            v.puan, v.yorum
       FROM rezervasyonlar r
       JOIN v_menu_detay d ON d.menu_id = r.menu_id
       LEFT JOIN degerlendirmeler v ON v.kullanici_id = r.kullanici_id AND v.menu_id = r.menu_id
      WHERE r.kullanici_id = ? AND r.durum = 'kullanildi'
      ORDER BY d.tarih DESC, d.ogun_id DESC`,
    [kullaniciId]
  );
  return s;
}

// Yalnızca "kullanildi" durumundaki rezervasyonun menüsü değerlendirilebilir:
// koşul INSERT...SELECT içinde olduğu için kontrol ile ekleme tek adımda, yarış durumu olmadan yapılır.
async function ekle(kullaniciId, menuId, puan, yorum) {
  try {
    const [sonuc] = await yazma.query(
      `INSERT INTO degerlendirmeler (kullanici_id, menu_id, puan, yorum)
       SELECT r.kullanici_id, r.menu_id, ?, ?
         FROM rezervasyonlar r
        WHERE r.kullanici_id = ? AND r.menu_id = ? AND r.durum = 'kullanildi'`,
      [puan, yorum, kullaniciId, menuId]
    );
    if (sonuc.affectedRows === 0) {
      throw new UygulamaHatasi('Yalnızca kullandığınız menüyü değerlendirebilirsiniz.');
    }
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new UygulamaHatasi('Bu menüyü zaten değerlendirdiniz.');
    throw e;
  }
}

module.exports = { kullanilanMenuler, ekle };
