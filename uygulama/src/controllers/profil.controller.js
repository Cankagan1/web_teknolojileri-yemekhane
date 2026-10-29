const repo = require('../repositories/profil.repo');
const { UygulamaHatasi, sarmala } = require('../errors');

const getir = sarmala(async (req, res) => {
  const id = req.kullanici.id;
  const [bilgi, tum, secili] = await Promise.all([repo.bilgiGetir(id), repo.tumAlerjenler(), repo.kullaniciAlerjenIdleri(id)]);
  res.json({ ...bilgi, alerjenler: tum.map((a) => ({ ...a, secili: secili.includes(a.id) })) });
});

const alerjenKaydet = sarmala(async (req, res) => {
  const ham = req.body && req.body.alerjenIds;
  if (!Array.isArray(ham)) throw new UygulamaHatasi('Alerjen listesi gerekli.');
  const idler = [...new Set(ham.map(Number))];
  if (idler.length > 14 || !idler.every((a) => Number.isInteger(a) && a > 0)) {
    throw new UygulamaHatasi('Geçersiz alerjen seçimi.');
  }
  await repo.alerjenleriKaydet(req.kullanici.id, idler);
  res.json({ mesaj: 'Alerjen tercihleriniz kaydedildi.' });
});

module.exports = { getir, alerjenKaydet };
