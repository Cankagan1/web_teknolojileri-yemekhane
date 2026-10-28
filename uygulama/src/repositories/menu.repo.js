const { okuma } = require('../db');

async function yemekhaneleriGetir() {
  const [s] = await okuma.query('SELECT id, ad, kapasite FROM yemekhaneler ORDER BY id');
  return s;
}

async function ogunleriGetir() {
  const [s] = await okuma.query('SELECT id, ad, son_rezervasyon_saati AS sonSaat FROM ogunler ORDER BY id');
  return s;
}

// Menü başlığı: hazır view'dan (v_menu_detay)
async function menuBul(yemekhaneId, tarih, ogunId) {
  const [s] = await okuma.query(
    `SELECT menu_id AS menuId, yemekhane_ad AS yemekhane, tarih, ogun_ad AS ogun,
            son_rezervasyon_saati AS sonSaat, ogrenci_fiyat AS ogrenciFiyat, personel_fiyat AS personelFiyat,
            toplam_kalori AS toplamKalori, vejetaryen_mi AS vejetaryen, alerjenler
       FROM v_menu_detay
      WHERE yemekhane_id = ? AND tarih = ? AND ogun_id = ?`,
    [yemekhaneId, tarih, ogunId]
  );
  return s[0] || null;
}

// Menüdeki yemekler, kategori sırasıyla; her yemeğin alerjenleriyle birlikte
async function menuYemekleri(menuId) {
  const [s] = await okuma.query(
    `SELECT y.id, y.ad, k.ad AS kategori, y.kalori, y.vejetaryen,
            GROUP_CONCAT(a.ad ORDER BY a.ad SEPARATOR ',') AS alerjenler
       FROM menu_yemekleri my
       JOIN yemekler y ON y.id = my.yemek_id
       JOIN yemek_kategorileri k ON k.id = y.kategori_id
       LEFT JOIN yemek_alerjenleri ya ON ya.yemek_id = y.id
       LEFT JOIN alerjenler a ON a.id = ya.alerjen_id
      WHERE my.menu_id = ?
      GROUP BY y.id, y.ad, k.ad, k.sira, y.kalori, y.vejetaryen
      ORDER BY k.sira, y.id`,
    [menuId]
  );
  return s;
}

module.exports = { yemekhaneleriGetir, ogunleriGetir, menuBul, menuYemekleri };
