// Menü önbelleği (Redis). Anahtar menu:{yemekhane_id}:{tarih}:{ogun_id}.
// Süre: o günün sonuna kadar. Yönetici menüyü değiştirince anahtar silinir.
// Önbellek bozulursa uygulama yine çalışır (veritabanından okur).
const redis = require('./redis');

const menuAnahtari = (yemekhaneId, tarih, ogunId) => `menu:${yemekhaneId}:${tarih}:${ogunId}`;

// İstanbul saatiyle günün bitmesine kalan saniye (en az 60)
function gunSonunaKalanSn() {
  const [s, d, sn] = new Date().toLocaleTimeString('sv-SE', { timeZone: 'Europe/Istanbul', hour12: false }).split(':').map(Number);
  return Math.max(60, 86400 - (s * 3600 + d * 60 + sn));
}

async function menuGetir(yemekhaneId, tarih, ogunId) {
  try {
    const deger = await redis.get(menuAnahtari(yemekhaneId, tarih, ogunId));
    return deger ? JSON.parse(deger) : null;
  } catch (e) {
    console.error('Önbellek okunamadı:', e.message);
    return null;
  }
}

async function menuYaz(yemekhaneId, tarih, ogunId, veri) {
  try {
    await redis.set(menuAnahtari(yemekhaneId, tarih, ogunId), JSON.stringify(veri), { EX: gunSonunaKalanSn() });
  } catch (e) {
    console.error('Önbelleğe yazılamadı:', e.message);
  }
}

async function menuyuSil(yemekhaneId, tarih, ogunId) {
  try {
    const silinen = await redis.del(menuAnahtari(yemekhaneId, tarih, ogunId));
    console.log(`[ÖNBELLEK] ${menuAnahtari(yemekhaneId, tarih, ogunId)} silindi (${silinen} kayıt)`);
  } catch (e) {
    console.error('Önbellek silinemedi:', e.message);
  }
}

// Açılışta çalışır: Aşama 4 öncesi yapıda (yarimPorsiyonVar alanı olmayan) kayıtları siler.
// Eski kayıtlar kalırsa arayüz porsiyon seçeneğini göstermez.
async function eskiYapidakileriTemizle() {
  let silinen = 0;
  try {
    for await (const anahtar of redis.scanIterator({ MATCH: 'menu:*', COUNT: 100 })) {
      let gecerli = false;
      try {
        const veri = JSON.parse(await redis.get(anahtar));
        gecerli = !!(veri && veri.menu && 'yarimPorsiyonVar' in veri.menu);
      } catch (e) { gecerli = false; }
      if (!gecerli) {
        await redis.del(anahtar);
        silinen += 1;
      }
    }
    console.log(`[ÖNBELLEK] Eski yapıdaki ${silinen} menü kaydı temizlendi`);
  } catch (e) {
    console.error('Eski önbellek temizlenemedi:', e.message);
  }
}

module.exports = { menuAnahtari, menuGetir, menuYaz, menuyuSil, eskiYapidakileriTemizle };
