const repo = require('../repositories/degerlendirme.repo');
const { UygulamaHatasi, sarmala } = require('../errors');

const listele = sarmala(async (req, res) => {
  res.json(await repo.kullanilanMenuler(req.kullanici.id));
});

const ekle = sarmala(async (req, res) => {
  const { menuId, puan, yorum } = req.body || {};
  const menu = Number(menuId);
  const oy = Number(puan);
  if (!Number.isInteger(menu) || menu < 1) throw new UygulamaHatasi('Geçersiz menü.');
  if (!Number.isInteger(oy) || oy < 1 || oy > 5) throw new UygulamaHatasi('Puan 1 ile 5 arasında olmalı.');
  const metin = typeof yorum === 'string' ? yorum.trim() : '';
  if (metin.length > 500) throw new UygulamaHatasi('Yorum en fazla 500 karakter olabilir.');

  await repo.ekle(req.kullanici.id, menu, oy, metin || null);
  res.status(201).json({ mesaj: 'Değerlendirmeniz kaydedildi.' });
});

module.exports = { listele, ekle };
