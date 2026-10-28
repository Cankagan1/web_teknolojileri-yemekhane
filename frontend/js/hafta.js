// Ekran: Haftalık menü ve rezervasyon.
// Düğmenin durumu (eylem) sunucudan gelir; burada iş kuralı yok, yalnızca gösterim.
const durum = { yemekhaneler: [], yemekhane: null, baslangic: null, bakiye: 0, adSoyad: '', gunler: [] };

function uyari(mesaj) { document.getElementById('uyari').textContent = mesaj || ''; }
function kullaniciYaz() {
  document.getElementById('kullanici').textContent = `${durum.adSoyad} · Bakiye ${TL(durum.bakiye)}`;
}
function hataIsle(e) {
  if (e.durum === 401) { location.href = 'index.html'; return; }
  uyari(e.message);
}

function gunEkle(tarih, n) {
  const d = new Date(tarih + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function gunAdi(tarih) {
  return new Date(tarih + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function baslat() {
  try {
    const ben = await api('/ben');
    durum.adSoyad = ben.adSoyad;
    durum.bakiye = ben.bakiye;
    const ref = await api('/menu/referans');
    durum.yemekhaneler = ref.yemekhaneler;
    durum.yemekhane = ref.yemekhaneler[0].id;
    durum.baslangic = ref.bugun;
  } catch (e) { hataIsle(e); return; }
  kullaniciYaz();
  sekmeleriCiz();
  yukle();
}

function sekmeleriCiz() {
  document.getElementById('yemekhane-sekmeleri').replaceChildren(
    ...durum.yemekhaneler.map((y) =>
      el('button', {
        class: 'dugme', type: 'button', 'aria-pressed': String(y.id === durum.yemekhane),
        onclick: () => { durum.yemekhane = y.id; sekmeleriCiz(); yukle(); },
      }, y.ad))
  );
}

async function yukle() {
  uyari('');
  document.getElementById('gunler').replaceChildren(el('p', { class: 'soluk' }, 'Yükleniyor...'));
  try {
    const v = await api(`/menu/haftalik?yemekhane=${durum.yemekhane}&baslangic=${durum.baslangic}`);
    durum.gunler = v.gunler;
    ciz();
  } catch (e) { hataIsle(e); }
}

function eylemOgesi(m) {
  switch (m.eylem) {
    case 'rezerve':    return el('span', { class: 'damga' }, 'Rezerve');
    case 'kullanildi': return el('span', { class: 'damga kirmizi' }, 'Kullanıldı');
    case 'dolu':       return el('button', { class: 'dugme', type: 'button', disabled: '' }, 'Dolu');
    case 'sure_doldu': return el('button', { class: 'dugme', type: 'button', disabled: '' }, 'Süre doldu');
    default:           return el('button', { class: 'dugme', type: 'button', onclick: () => rezerveEt(m) }, 'Rezerve et');
  }
}

function ciz() {
  const kapsayici = document.getElementById('gunler');
  if (durum.gunler.length === 0) {
    kapsayici.replaceChildren(el('section', { class: 'fis' }, el('p', { class: 'soluk' }, 'Bu aralıkta menü yok.')));
    return;
  }
  kapsayici.replaceChildren(
    ...durum.gunler.map((gun) =>
      el('section', { class: 'fis' },
        el('h2', { class: 'baslik gun-baslik' }, gunAdi(gun.tarih)),
        el('hr', { class: 'kesik' }),
        ...gun.menuler.map((m) =>
          el('div', { class: 'menu-satiri' },
            el('div', { class: 'satir' },
              el('strong', {}, `${m.ogun} · son ${m.sonSaat.slice(0, 5)}`),
              el('span', { class: 'sag' }, TL(m.fiyat))),
            el('div', { class: 'soluk kucuk' }, m.yemekler || ''),
            el('div', { class: 'satir' },
              el('span', { class: 'soluk kucuk' }, `${m.toplamKalori} kcal · ${m.bos} boş yer`),
              eylemOgesi(m))
          )
        )
      )
    )
  );
}

async function rezerveEt(m) {
  uyari('');
  try {
    const sonuc = await api('/rezervasyon', { method: 'POST', body: JSON.stringify({ menuId: m.menuId }) });
    // Bakiye prosedürün döndürdüğü (kaynaktan gelen) değerdir; replikadan tekrar okumayız.
    durum.bakiye = sonuc.yeniBakiye;
    m.eylem = 'rezerve';
    m.bos -= 1;
    kullaniciYaz();
  } catch (e) { hataIsle(e); }
  ciz();
}

document.getElementById('onceki').addEventListener('click', () => { durum.baslangic = gunEkle(durum.baslangic, -7); yukle(); });
document.getElementById('sonraki').addEventListener('click', () => { durum.baslangic = gunEkle(durum.baslangic, 7); yukle(); });
document.getElementById('cikis').addEventListener('click', async () => {
  await api('/cikis', { method: 'POST' }).catch(() => {});
  location.href = 'index.html';
});

baslat();
