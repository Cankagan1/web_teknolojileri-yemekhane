const router = require('express').Router();
const oturum = require('../middleware/oturum');
const c = require('../controllers/bakiye.controller');

router.use(oturum);
router.get('/', c.getir);
router.post('/yukle', c.yukle);

module.exports = router;
