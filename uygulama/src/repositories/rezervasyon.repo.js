const { yazma } = require('../db');

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

module.exports = { kullanicininRezervasyonlari, yap };
