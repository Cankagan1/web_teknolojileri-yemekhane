const router = require('express').Router();
const oturum = require('../middleware/oturum');
const c = require('../controllers/degerlendirme.controller');

router.use(oturum);
router.get('/', c.listele);
router.post('/', c.ekle);

module.exports = router;
