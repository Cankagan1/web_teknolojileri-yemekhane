const router = require('express').Router();
const oturum = require('../middleware/oturum');
const c = require('../controllers/auth.controller');

router.post('/giris', c.giris);
router.post('/cikis', c.cikis);
router.get('/ben', oturum, c.ben);

module.exports = router;
