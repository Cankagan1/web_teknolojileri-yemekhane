const repo = require('../repositories/bakiye.repo');
const kullaniciRepo = require('../repositories/kullanici.repo');
const { UygulamaHatasi, sarmala } = require('../errors');

// Güncel bakiye kaynaktan, hareket listesi replikadan gelir.
const getir = sarmala(async (req, res) => {
  const [bakiye, hareketler] = await Promise.all([
    kullaniciRepo.bakiyeGetir(req.kullanici.id),
    repo.hareketler(req.kullanici.id),
  ]);
  res.json({ bakiye, hareketler });
});

// Tutar sınırları (0'dan büyük, en fazla 2000) prosedürde denetlenir.
const yukle = sarmala(async (req, res) => {
  const tutar = Math.round(Number(req.body && req.body.tutar) * 100) / 100;
  if (!Number.isFinite(tutar)) throw new UygulamaHatasi('Geçerli bir tutar girin.');
  const sonuc = await repo.yukle(req.kullanici.id, tutar);
  res.status(201).json({ yeniBakiye: sonuc.yeni_bakiye });
});

module.exports = { getir, yukle };
