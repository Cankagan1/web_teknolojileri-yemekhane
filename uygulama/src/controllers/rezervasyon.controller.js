const repo = require('../repositories/rezervasyon.repo');
const { UygulamaHatasi, sarmala } = require('../errors');

// Kurallar (bakiye, kapasite, son saat, mükerrer kayıt) stored procedure'de;
// burada yalnızca girdi doğrulanır. Prosedürün Türkçe hata mesajı errors.js ile arayüze gider.
const yap = sarmala(async (req, res) => {
  const menuId = Number(req.body && req.body.menuId);
  if (!Number.isInteger(menuId) || menuId < 1) throw new UygulamaHatasi('Geçersiz menü.');
  const sonuc = await repo.yap(req.kullanici.id, menuId);
  res.status(201).json({ rezervasyonId: sonuc.rezervasyon_id, yeniBakiye: sonuc.yeni_bakiye });
});

// Arayüzün göstereceği durum sunucuda belirlenir
function listeEylemi(r) {
  if (r.durum === 'aktif') return r.gecti ? 'sure_doldu' : 'iptal_edilebilir';
  return r.durum; // kullanildi | iptal
}

const listele = sarmala(async (req, res) => {
  const satirlar = await repo.listele(req.kullanici.id);
  res.json(
    satirlar.map((r) => ({
      id: r.id,
      durum: r.durum,
      eylem: listeEylemi(r),
      tarih: r.tarih,
      ogun: r.ogun,
      yemekhane: r.yemekhane,
      sonSaat: r.sonSaat,
      toplamKalori: r.toplamKalori,
      yemekler: r.yemekler,
      fiyat: req.kullanici.rol === 'ogrenci' ? r.ogrenciFiyat : r.personelFiyat,
    }))
  );
});

const iptalEt = sarmala(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new UygulamaHatasi('Geçersiz rezervasyon.');
  const sonuc = await repo.iptalEt(req.kullanici.id, id);
  res.json({ yeniBakiye: sonuc.yeni_bakiye });
});

module.exports = { yap, listele, iptalEt };
