const { okuma, yazma } = require('../db');

// Kullanıcının kendi rezervasyonları KAYNAKTAN okunur: yeni yapılan rezervasyon
// replikaya henüz yansımamış olabilir, kullanıcı kendi işlemini hemen görmeli.
async function kullanicininRezervasyonlari(kullaniciId, menuIdler) {
  if (menuIdler.length === 0) return [];
  const [s] = await yazma.query(
    'SELECT menu_id AS menuId, id AS rezervasyonId, durum FROM rezervasyonlar WHERE kullanici_id = ? AND menu_id IN (?)',
    [kullaniciId, menuIdler]
  );
  return s;
}

// Para hareketi SQL ile yeniden yazılmaz: stored procedure çağrılır.
async function yap(kullaniciId, menuId) {
  const [sonuc] = await yazma.query('CALL sp_rezervasyon_yap(?, ?)', [kullaniciId, menuId]);
  return sonuc[0][0]; // { rezervasyon_id, yeni_bakiye }
}

// Kullanıcının tüm rezervasyonları (liste): replikadan okunur.
async function listele(kullaniciId) {
  const [s] = await okuma.query(
    `SELECT r.id, r.durum, d.tarih, d.ogun_ad AS ogun, d.yemekhane_ad AS yemekhane,
            d.son_rezervasyon_saati AS sonSaat, d.ogrenci_fiyat AS ogrenciFiyat, d.personel_fiyat AS personelFiyat,
            d.toplam_kalori AS toplamKalori, d.yemekler,
            (TIMESTAMP(d.tarih, d.son_rezervasyon_saati) <= NOW()) AS gecti
       FROM rezervasyonlar r
       JOIN v_menu_detay d ON d.menu_id = r.menu_id
      WHERE r.kullanici_id = ?
      ORDER BY d.tarih DESC, d.ogun_id DESC`,
    [kullaniciId]
  );
  return s;
}

// İade dahil tüm para işi sp_rezervasyon_iptal içinde.
async function iptalEt(kullaniciId, rezervasyonId) {
  const [sonuc] = await yazma.query('CALL sp_rezervasyon_iptal(?, ?)', [kullaniciId, rezervasyonId]);
  return sonuc[0][0]; // { yeni_bakiye }
}

module.exports = { kullanicininRezervasyonlari, yap, listele, iptalEt };
