const express = require('express');
const cookieParser = require('cookie-parser');
const { port } = require('./config');
const { hataIsleyici } = require('./errors');
const redis = require('./redis');
const onbellek = require('./onbellek');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/api/saglik', (req, res) => res.json({ durum: 'ok' }));
app.use('/api', require('./routes/auth.routes'));
app.use('/api/menu', require('./routes/menu.routes'));
app.use('/api/rezervasyon', require('./routes/rezervasyon.routes'));
app.use('/api/bakiye', require('./routes/bakiye.routes'));
app.use('/api/degerlendirme', require('./routes/degerlendirme.routes'));
app.use('/api/yonetim', require('./routes/yonetim.routes'));
app.use('/api/profil', require('./routes/profil.routes'));
app.use('/api', (req, res) => res.status(404).json({ hata: 'Bulunamadı.' }));
app.use(hataIsleyici);

redis.connect().then(() => onbellek.eskiYapidakileriTemizle()).then(() => {
  app.listen(port, () => console.log(`Uygulama ${port} portunda çalışıyor (Redis bağlı)`));
});
