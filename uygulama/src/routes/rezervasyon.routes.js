const router = require('express').Router();
const oturum = require('../middleware/oturum');
const c = require('../controllers/rezervasyon.controller');

router.use(oturum);
router.post('/', c.yap);

module.exports = router;
