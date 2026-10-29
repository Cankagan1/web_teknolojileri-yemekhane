const { okuma, yazma } = require('../db');
const { UygulamaHatasi } = require('../errors');

// Rapor: menü bazında doluluk ve ortalama puan. Hazır view'lar, replikadan.
async function menuRaporu(yemekhaneId, baslangic) {
  const [s] = await okuma.query(
    `SELECT d.menu_id AS menuId, d.yemekhane_id AS yemekhaneId, d.yemekhane_ad AS yemekhane,
            d.tarih, d.ogun_id AS ogunId, d.ogun_ad AS ogun,
            d.ogrenci_fiyat AS ogrenciFiyat, d.personel_fiyat AS personelFiyat, d.yemekler,
            o.kapasite, o.dolu, p.ortalama_puan AS ortalamaPuan, p.oy_sayisi AS oySayisi,
            (d.tarih < CURDATE()) AS gecmis
       FROM v_menu_detay d
       JOIN v_menu_doluluk o ON o.menu_id = d.menu_id
       JOIN v_menu_puan p ON p.menu_id = d.menu_id
      WHERE d.yemekhane_id = ? AND d.tarih BETWEEN ? AND DATE_ADD(?, INTERVAL 6 DAY)
      ORDER BY d.tarih, d.ogun_id`,
    [yemekhaneId, baslangic, baslangic]
  );
  return s;
}

async function tumYemekler() {
  const [s] = await okuma.query(
    `SELECT y.id, y.ad, y.kalori, y.vejetaryen, k.ad AS kategori
       FROM yemekler y JOIN yemek_kategorileri k ON k.id = y.kategori_id
      ORDER BY k.sira, y.id`
  );
  return s;
}

// Düzenleme formu doğru veriyle açılsın diye kaynaktan okunur.
async function menuGetir(menuId) {
  const [m] = await yazma.query(
    `SELECT id AS menuId, yemekhane_id AS yemekhaneId, tarih, ogun_id AS ogunId,
            ogrenci_fiyat AS ogrenciFiyat, personel_fiyat AS personelFiyat
       FROM menuler WHERE id = ?`,
    [menuId]
  );
  if (!m[0]) return null;
  const [y] = await yazma.query('SELECT yemek_id AS yemekId FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
  return { menu: m[0], yemekIds: y.map((x) => x.yemekId) };
}

// Menü + yemekleri tek işlemde yazılır: ya hepsi olur ya hiçbiri.
async function islemde(fn) {
  const baglanti = await yazma.getConnection();
  try {
    await baglanti.beginTransaction();
    const sonuc = await fn(baglanti);
    await baglanti.commit();
    return sonuc;
  } catch (e) {
    await baglanti.rollback();
    throw e;
  } finally {
    baglanti.release();
  }
}

async function yemekleriYaz(b, menuId, yemekIds) {
  await b.query('INSERT INTO menu_yemekleri (menu_id, yemek_id) VALUES ?', [yemekIds.map((y) => [menuId, y])]);
}

async function olustur(m) {
  try {
    return await islemde(async (b) => {
      const [r] = await b.query(
        'INSERT INTO menuler (yemekhane_id, tarih, ogun_id, ogrenci_fiyat, personel_fiyat) VALUES (?, ?, ?, ?, ?)',
        [m.yemekhaneId, m.tarih, m.ogunId, m.ogrenciFiyat, m.personelFiyat]
      );
      await yemekleriYaz(b, r.insertId, m.yemekIds);
      return r.insertId;
    });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') throw new UygulamaHatasi('Bu yemekhane, tarih ve öğün için zaten bir menü var.');
    if (e.code === 'ER_NO_REFERENCED_ROW_2') throw new UygulamaHatasi('Seçilen yemekhane, öğün veya yemek bulunamadı.');
    throw e;
  }
}

async function guncelle(menuId, m) {
  try {
    await islemde(async (b) => {
      await b.query('UPDATE menuler SET ogrenci_fiyat = ?, personel_fiyat = ? WHERE id = ?',
        [m.ogrenciFiyat, m.personelFiyat, menuId]);
      await b.query('DELETE FROM menu_yemekleri WHERE menu_id = ?', [menuId]);
      await yemekleriYaz(b, menuId, m.yemekIds);
    });
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') throw new UygulamaHatasi('Seçilen yemeklerden biri bulunamadı.');
    throw e;
  }
}

// Kaynaktaki son değişikliğin replikaya ulaşmasını bekler (GTID ile).
// Önbellek, replika eski veriyi tutarken silinirse eski menü yeniden önbelleğe girer; bunu önler.
async function replikaBekle(sureSn = 5) {
  const [g] = await yazma.query('SELECT @@GLOBAL.gtid_executed AS gtid');
  const [s] = await okuma.query('SELECT WAIT_FOR_EXECUTED_GTID_SET(?, ?) AS sonuc', [g[0].gtid, sureSn]);
  if (s[0].sonuc !== 0) console.warn('[UYARI] Replika zaman aşımı içinde yetişemedi');
}

module.exports = { menuRaporu, tumYemekler, menuGetir, olustur, guncelle, replikaBekle };
