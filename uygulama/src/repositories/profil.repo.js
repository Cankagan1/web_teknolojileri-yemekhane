const { okuma, yazma } = require('../db');
const { UygulamaHatasi } = require('../errors');

async function bilgiGetir(kullaniciId) {
  const [s] = await okuma.query(
    'SELECT id, ad_soyad AS adSoyad, email, rol, ogrenci_no AS ogrenciNo FROM kullanicilar WHERE id = ?',
    [kullaniciId]
  );
  return s[0] || null;
}

async function tumAlerjenler() {
  const [s] = await okuma.query('SELECT id, ad FROM alerjenler ORDER BY ad');
  return s;
}

// Kullanıcının kendi tercihleri kaynaktan okunur: kaydettiği şey hemen görünmeli (replika gecikmesi olabilir).
async function kullaniciAlerjenIdleri(kullaniciId) {
  const [s] = await yazma.query('SELECT alerjen_id AS id FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
  return s.map((x) => x.id);
}

async function kullaniciAlerjenAdlari(kullaniciId) {
  const [s] = await yazma.query(
    `SELECT a.ad FROM kullanici_alerjenleri ka JOIN alerjenler a ON a.id = ka.alerjen_id WHERE ka.kullanici_id = ?`,
    [kullaniciId]
  );
  return s.map((x) => x.ad);
}

// Eski seçimi silip yenisini yazar; tek işlemde, yarım kalmaz.
async function alerjenleriKaydet(kullaniciId, alerjenIds) {
  const b = await yazma.getConnection();
  try {
    await b.beginTransaction();
    await b.query('DELETE FROM kullanici_alerjenleri WHERE kullanici_id = ?', [kullaniciId]);
    if (alerjenIds.length) {
      await b.query('INSERT INTO kullanici_alerjenleri (kullanici_id, alerjen_id) VALUES ?', [alerjenIds.map((a) => [kullaniciId, a])]);
    }
    await b.commit();
  } catch (e) {
    await b.rollback();
    if (e.code === 'ER_NO_REFERENCED_ROW_2') throw new UygulamaHatasi('Seçilen alerjenlerden biri bulunamadı.');
    throw e;
  } finally {
    b.release();
  }
}

module.exports = { bilgiGetir, tumAlerjenler, kullaniciAlerjenIdleri, kullaniciAlerjenAdlari, alerjenleriKaydet };
