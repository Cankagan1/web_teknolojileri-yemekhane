const bcrypt = require('bcryptjs');
const repo = require('../repositories/kullanici.repo');
const sessions = require('../sessions');
const { UygulamaHatasi, sarmala } = require('../errors');
const { oturumSuresiMs } = require('../config');

const giris = sarmala(async (req, res) => {
  const { email, sifre } = req.body || {};
  if (!email || !sifre) throw new UygulamaHatasi('E-posta ve şifre gerekli.');

  const kullanici = await repo.epostayaGore(String(email).trim().toLowerCase());
  const dogru = kullanici && (await bcrypt.compare(String(sifre), kullanici.sifreHash));
  if (!dogru) throw new UygulamaHatasi('E-posta veya şifre hatalı.', 401);

  const oturumKullanicisi = { id: kullanici.id, adSoyad: kullanici.adSoyad, rol: kullanici.rol };
  const token = await sessions.olustur(oturumKullanicisi);
  res.cookie('oturum', token, { httpOnly: true, sameSite: 'lax', maxAge: oturumSuresiMs });
  res.json(oturumKullanicisi);
});

const cikis = sarmala(async (req, res) => {
  if (req.cookies.oturum) await sessions.sil(req.cookies.oturum);
  res.clearCookie('oturum');
  res.json({ mesaj: 'Çıkış yapıldı.' });
});

const ben = sarmala(async (req, res) => {
  const bakiye = await repo.bakiyeGetir(req.kullanici.id);
  res.json({ ...req.kullanici, bakiye });
});

module.exports = { giris, cikis, ben };
