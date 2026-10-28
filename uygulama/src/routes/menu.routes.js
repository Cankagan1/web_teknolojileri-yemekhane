const router = require('express').Router();
const oturum = require('../middleware/oturum');
const c = require('../controllers/menu.controller');

router.use(oturum);
router.get('/referans', c.referans);
router.get('/gunun', c.gununMenusu);

module.exports = router;
