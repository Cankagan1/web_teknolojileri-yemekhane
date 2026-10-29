const repo = require('../repositories/yonetim.repo');
const onbellek = require('../onbellek');
const { UygulamaHatasi, sarmala } = require('../errors');

function bugun() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
}
const TARIH = /^\d{4}-\d{2}-\d{2}$/;

const rapor = sarmala(async (req, res) => {
  const yemekhaneId = Number(req.query.yemekhane);
  const baslangic = req.query.baslangic || bugun();
  if (!Number.isInteger(yemekhaneId)) throw new UygulamaHatasi('Yemekhane seçmelisiniz.');
  if (!TARIH.test(baslangic)) throw new UygulamaHatasi('Tarih biçimi YYYY-AA-GG olmalı.');
  const satirlar = await repo.menuRaporu(yemekhaneId, baslangic);
  res.json({
    baslangic,
    menuler: satirlar.map((r) => ({
      ...r,
      gecmis: !!r.gecmis,
      ortalamaPuan: r.ortalamaPuan === null ? null : Number(r.ortalamaPuan),
      doluluk: r.kapasite ? Math.round((r.dolu * 100) / r.kapasite) : 0,
    })),
  });
});

const yemekler = sarmala(async (req, res) => {
  const liste = await repo.tumYemekler();
  res.json(liste.map((y) => ({ ...y, vejetaryen: !!y.vejetaryen })));
});

const getir = sarmala(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new UygulamaHatasi('Geçersiz menü.');
  const sonuc = await repo.menuGetir(id);
  if (!sonuc) throw new UygulamaHatasi('Menü bulunamadı.', 404);
  res.json(sonuc);
});

// Fiyat ve yemek listesi doğrulaması (oluşturma ve güncelleme için ortak)
function ortakGirdi(b) {
  const ogrenciFiyat = Math.round(Number(b.ogrenciFiyat) * 100) / 100;
  const personelFiyat = Math.round(Number(b.personelFiyat) * 100) / 100;
  for (const f of [ogrenciFiyat, personelFiyat]) {
    if (!Number.isFinite(f) || f < 0 || f > 1000) throw new UygulamaHatasi('Fiyat 0 ile 1000 TL arasında olmalı.');
  }
  const yemekIds = [...new Set((Array.isArray(b.yemekIds) ? b.yemekIds : []).map(Number))];
  if (yemekIds.length < 1 || yemekIds.length > 12 || !yemekIds.every((y) => Number.isInteger(y) && y > 0)) {
    throw new UygulamaHatasi('Menüye 1 ile 12 arasında yemek seçmelisiniz.');
  }
  return { ogrenciFiyat, personelFiyat, yemekIds };
}

const olustur = sarmala(async (req, res) => {
  const b = req.body || {};
  const yemekhaneId = Number(b.yemekhaneId);
  const ogunId = Number(b.ogunId);
  if (!Number.isInteger(yemekhaneId) || !Number.isInteger(ogunId)) throw new UygulamaHatasi('Yemekhane ve öğün seçmelisiniz.');
  if (!TARIH.test(b.tarih || '')) throw new UygulamaHatasi('Tarih biçimi YYYY-AA-GG olmalı.');
  if (b.tarih < bugun()) throw new UygulamaHatasi('Geçmiş bir tarihe menü eklenemez.');

  const menuId = await repo.olustur({ yemekhaneId, ogunId, tarih: b.tarih, ...ortakGirdi(b) });
  await onbellek.menuyuSil(yemekhaneId, b.tarih, ogunId);
  res.status(201).json({ menuId });
});

const guncelle = sarmala(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new UygulamaHatasi('Geçersiz menü.');
  const mevcut = await repo.menuGetir(id);
  if (!mevcut) throw new UygulamaHatasi('Menü bulunamadı.', 404);
  if (mevcut.menu.tarih < bugun()) throw new UygulamaHatasi('Geçmiş tarihli menü düzenlenemez.');

  await repo.guncelle(id, ortakGirdi(req.body || {}));
  // Menü değişti: Aşama 3'te Redis'teki eski kayıt burada silinecek
  await onbellek.menuyuSil(mevcut.menu.yemekhaneId, mevcut.menu.tarih, mevcut.menu.ogunId);
  res.json({ mesaj: 'Menü güncellendi.' });
});

module.exports = { rapor, yemekler, getir, olustur, guncelle };
