const router = require('express').Router();
const oturum = require('../middleware/oturum');
const yonetici = require('../middleware/yonetici');
const c = require('../controllers/yonetim.controller');

router.use(oturum, yonetici);
router.get('/menuler', c.rapor);
router.get('/yemekler', c.yemekler);
router.get('/menuler/:id', c.getir);
router.post('/menuler', c.olustur);
router.put('/menuler/:id', c.guncelle);

module.exports = router;
