const { UygulamaHatasi } = require('../errors');

// oturum middleware'inden SONRA kullanılır
module.exports = (req, res, next) => {
  if (!req.kullanici || req.kullanici.rol !== 'yonetici') {
    return next(new UygulamaHatasi('Bu işlem için yönetici olmalısınız.', 403));
  }
  next();
};
