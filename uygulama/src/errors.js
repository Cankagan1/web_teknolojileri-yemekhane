// Hata yönetimi: prosedürlerin Türkçe mesajları (SQLSTATE 45000) arayüze aynen iletilir.
class UygulamaHatasi extends Error {
  constructor(mesaj, durum = 400) {
    super(mesaj);
    this.durum = durum;
  }
}

// async controller'daki hataları Express'in hata işleyicisine taşır
const sarmala = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function hataIsleyici(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof UygulamaHatasi) {
    return res.status(err.durum).json({ hata: err.message });
  }
  if (err && err.sqlState === '45000') {
    return res.status(400).json({ hata: err.sqlMessage });
  }
  console.error(err);
  res.status(500).json({ hata: 'Beklenmeyen bir hata oluştu.' });
}

module.exports = { UygulamaHatasi, sarmala, hataIsleyici };
