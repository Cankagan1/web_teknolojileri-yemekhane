const router = require('express').Router();
const oturum = require('../middleware/oturum');
const c = require('../controllers/profil.controller');

router.use(oturum);
router.get('/', c.getir);
router.put('/alerjenler', c.alerjenKaydet);

module.exports = router;
