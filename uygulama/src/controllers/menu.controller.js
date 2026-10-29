const repo = require('../repositories/menu.repo');
const rezRepo = require('../repositories/rezervasyon.repo');
const profilRepo = require('../repositories/profil.repo');
const onbellek = require('../onbellek');
const { UygulamaHatasi, sarmala } = require('../errors');

// Bugünün tarihi İstanbul saatiyle: "2026-10-27"
function bugun() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
}

const referans = sarmala(async (req, res) => {
  const [yemekhaneler, ogunler] = await Promise.all([repo.yemekhaneleriGetir(), repo.ogunleriGetir()]);
  res.json({ yemekhaneler, ogunler, bugun: bugun() });
});

// Günün menüsü kullanıcıdan bağımsızdır, bu yüzden Redis'te saklanır: menu:{yemekhane}:{tarih}:{ogun}
// Kullanıcıya özel şeyler (fiyat, alerjen uyarısı) önbelleğe girmez, her istekte eklenir.
async function menuVerisi(yemekhaneId, tarih, ogunId) {
  const anahtar = onbellek.menuAnahtari(yemekhaneId, tarih, ogunId);
  const saklanan = await onbellek.menuGetir(yemekhaneId, tarih, ogunId);
  if (saklanan) {
    console.log(`[ÖNBELLEK] ${anahtar} Redis'ten geldi`);
    return saklanan;
  }

  const menu = await repo.menuBul(yemekhaneId, tarih, ogunId);
  if (!menu) return null;
  const yemekler = (await repo.menuYemekleri(menu.menuId)).map((y) => ({
    ...y,
    vejetaryen: !!y.vejetaryen,
    alerjenler: y.alerjenler ? y.alerjenler.split(',') : [],
  }));
  const veri = {
    menu: {
      ...menu,
      vejetaryen: !!menu.vejetaryen,
      alerjenler: menu.alerjenler ? menu.alerjenler.split(', ') : [],
      // Aşama 4 ile eklenen alan: bu alanı taşımayan eski önbellek kayıtları açılışta temizlenir
      yarimPorsiyonVar: menu.yarimOran !== null,
    },
    yemekler,
  };
  await onbellek.menuYaz(yemekhaneId, tarih, ogunId, veri);
  console.log(`[ÖNBELLEK] ${anahtar} veritabanından geldi, Redis'e yazıldı`);
  return veri;
}

const gununMenusu = sarmala(async (req, res) => {
  const yemekhaneId = Number(req.query.yemekhane);
  const ogunId = Number(req.query.ogun);
  const tarih = req.query.tarih || bugun();
  if (!Number.isInteger(yemekhaneId) || !Number.isInteger(ogunId)) {
    throw new UygulamaHatasi('Yemekhane ve öğün seçmelisiniz.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) throw new UygulamaHatasi('Tarih biçimi YYYY-AA-GG olmalı.');

  const veri = await menuVerisi(yemekhaneId, tarih, ogunId);
  if (!veri) throw new UygulamaHatasi('Bu öğün için menü bulunamadı.', 404);

  // Kullanıcıya özel kısım: rol fiyatı ve alerjen uyarıları
  const ogrenci = req.kullanici.rol === 'ogrenci';
  const alerjenleri = new Set(await profilRepo.kullaniciAlerjenAdlari(req.kullanici.id));
  const yemekler = veri.yemekler.map((y) => ({ ...y, uyari: y.alerjenler.filter((a) => alerjenleri.has(a)) }));
  const m = veri.menu;
  res.json({
    menu: {
      ...m,
      fiyat: ogrenci ? m.ogrenciFiyat : m.personelFiyat,
      yarimFiyat: m.yarimPorsiyonVar ? (ogrenci ? m.yarimOgrenciFiyat : m.yarimPersonelFiyat) : null,
      uyari: m.alerjenler.filter((a) => alerjenleri.has(a)),
    },
    yemekler,
  });
});

// Düğmenin ne göstereceğine sunucu karar verir; arayüz yalnızca gösterir.
function eylemBelirle(menu, rez) {
  if (rez && rez.durum === 'aktif') return 'rezerve';
  if (rez && rez.durum === 'kullanildi') return 'kullanildi';
  if (menu.gecti) return 'sure_doldu';
  if (menu.bos <= 0) return 'dolu';
  return 'rezerve_et';
}

const haftalik = sarmala(async (req, res) => {
  const yemekhaneId = Number(req.query.yemekhane);
  const baslangic = req.query.baslangic || bugun();
  if (!Number.isInteger(yemekhaneId)) throw new UygulamaHatasi('Yemekhane seçmelisiniz.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(baslangic)) throw new UygulamaHatasi('Tarih biçimi YYYY-AA-GG olmalı.');

  const menuler = await repo.haftalikMenuler(yemekhaneId, baslangic);
  const rezervasyonlar = await rezRepo.kullanicininRezervasyonlari(req.kullanici.id, menuler.map((m) => m.menuId));
  const rezHaritasi = new Map(rezervasyonlar.map((r) => [r.menuId, r]));
  const alerjenleri = new Set(await profilRepo.kullaniciAlerjenAdlari(req.kullanici.id));
  const ogrenci = req.kullanici.rol === 'ogrenci';

  // günlere grupla
  const gunler = [];
  for (const m of menuler) {
    const rez = rezHaritasi.get(m.menuId) || null;
    const kayit = {
      ...m,
      gecti: !!m.gecti,
      vejetaryen: !!m.vejetaryen,
      fiyat: ogrenci ? m.ogrenciFiyat : m.personelFiyat,
      yarimVar: m.yarimOgrenciFiyat !== null,
      yarimFiyat: ogrenci ? m.yarimOgrenciFiyat : m.yarimPersonelFiyat,
      porsiyon: rez ? rez.porsiyon : null,
      uyari: (m.alerjenler ? m.alerjenler.split(', ') : []).filter((a) => alerjenleri.has(a)),
      eylem: eylemBelirle(m, rez),
    };
    let gun = gunler[gunler.length - 1];
    if (!gun || gun.tarih !== m.tarih) {
      gun = { tarih: m.tarih, menuler: [] };
      gunler.push(gun);
    }
    gun.menuler.push(kayit);
  }
  res.json({ baslangic, gunler });
});

module.exports = { referans, gununMenusu, haftalik };
