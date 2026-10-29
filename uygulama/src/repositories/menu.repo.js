const { okuma } = require('../db');

async function yemekhaneleriGetir() {
  const [s] = await okuma.query('SELECT id, ad, kapasite FROM yemekhaneler ORDER BY id');
  return s;
}

async function ogunleriGetir() {
  const [s] = await okuma.query('SELECT id, ad, son_rezervasyon_saati AS sonSaat FROM ogunler ORDER BY id');
  return s;
}

// Menü başlığı: hazır view'dan (v_menu_detay) + öğünün yarım porsiyon oranı.
// Yarım porsiyon fiyatı veriden hesaplanır (oran ogunler tablosunda), kodda sabit yoktur.
async function menuBul(yemekhaneId, tarih, ogunId) {
  const [s] = await okuma.query(
    `SELECT d.menu_id AS menuId, d.yemekhane_ad AS yemekhane, d.tarih, d.ogun_ad AS ogun,
            d.son_rezervasyon_saati AS sonSaat, d.ogrenci_fiyat AS ogrenciFiyat, d.personel_fiyat AS personelFiyat,
            og.yarim_porsiyon_orani AS yarimOran,
            ROUND(d.ogrenci_fiyat * og.yarim_porsiyon_orani, 2) AS yarimOgrenciFiyat,
            ROUND(d.personel_fiyat * og.yarim_porsiyon_orani, 2) AS yarimPersonelFiyat,
            d.toplam_kalori AS toplamKalori, d.vejetaryen_mi AS vejetaryen, d.alerjenler
       FROM v_menu_detay d
       JOIN ogunler og ON og.id = d.ogun_id
      WHERE d.yemekhane_id = ? AND d.tarih = ? AND d.ogun_id = ?`,
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

// Bir yemekhanenin 7 günlük menüleri: başlık view'ı + doluluk view'ı, replikadan.
// "gecti": son rezervasyon saati geçti mi (sunucu saatiyle hesaplanır, tarayıcı saatine güvenilmez)
async function haftalikMenuler(yemekhaneId, baslangic) {
  const [s] = await okuma.query(
    `SELECT d.menu_id AS menuId, d.tarih, d.ogun_id AS ogunId, d.ogun_ad AS ogun,
            d.son_rezervasyon_saati AS sonSaat, d.ogrenci_fiyat AS ogrenciFiyat, d.personel_fiyat AS personelFiyat,
            ROUND(d.ogrenci_fiyat * og.yarim_porsiyon_orani, 2) AS yarimOgrenciFiyat,
            ROUND(d.personel_fiyat * og.yarim_porsiyon_orani, 2) AS yarimPersonelFiyat,
            d.toplam_kalori AS toplamKalori, d.vejetaryen_mi AS vejetaryen, d.yemekler, d.alerjenler,
            o.bos, o.kapasite,
            (TIMESTAMP(d.tarih, d.son_rezervasyon_saati) <= NOW()) AS gecti
       FROM v_menu_detay d
       JOIN v_menu_doluluk o ON o.menu_id = d.menu_id
       JOIN ogunler og ON og.id = d.ogun_id
      WHERE d.yemekhane_id = ? AND d.tarih BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
      ORDER BY d.tarih, d.ogun_id`,
    [yemekhaneId, baslangic, baslangic]
  );
  return s;
}

module.exports = { yemekhaneleriGetir, ogunleriGetir, menuBul, menuYemekleri, haftalikMenuler };
