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

module.exports = { yap };
