const router = require('express').Router();
const oturum = require('../middleware/oturum');
const c = require('../controllers/rezervasyon.controller');

router.use(oturum);
router.get('/', c.listele);
router.post('/', c.yap);
router.post('/:id/iptal', c.iptalEt);

module.exports = router;
