const sessions = require('../sessions');
const { UygulamaHatasi, sarmala } = require('../errors');
const { oturumSuresiMs } = require('../config');

// Geçerli oturum yoksa 401 döner; varsa req.kullanici doldurulur.
module.exports = sarmala(async (req, res, next) => {
  const token = req.cookies.oturum;
  const kullanici = token ? await sessions.getir(token) : null;
  if (!kullanici) throw new UygulamaHatasi('Oturum açmanız gerekiyor.', 401);
  res.cookie('oturum', token, { httpOnly: true, sameSite: 'lax', maxAge: oturumSuresiMs });
  req.kullanici = kullanici;
  next();
});
