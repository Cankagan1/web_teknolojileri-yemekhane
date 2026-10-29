// Ekran: Yönetici paneli. Menü oluşturma/düzenleme + menü bazında doluluk ve ortalama puan.
// Yetki ve tüm kurallar sunucuda denetlenir; burada yalnızca form ve gösterim var.
const durum = { yemekhaneler: [], ogunler: [], yemekler: [], yemekhane: null, baslangic: null, bugun: null, menuler: [], form: null };

function uyari(m) { document.getElementById('uyari').textContent = m || ''; }
function bilgi(m) { document.getElementById('bilgi').textContent = m || ''; }
function hataIsle(e) { if (e.durum === 401) { location.href = 'index.html'; return; } bilgi(''); uyari(e.message); }
function gunAdi(t) { return new Date(t + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }); }
function gunEkle(t, n) { const d = new Date(t + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

async function baslat() {
  try {
    const ben = await api('/ben');
    document.getElementById('kullanici').textContent = ben.adSoyad;
    if (ben.rol !== 'yonetici') {
      document.getElementById('icerik').replaceChildren(el('section', { class: 'fis' }, el('p', { class: 'hata' }, 'Bu sayfa yalnızca yöneticiler içindir.')));
      return;
    }
    const ref = await api('/menu/referans');
    durum.yemekhaneler = ref.yemekhaneler;
    durum.ogunler = ref.ogunler;
    durum.yemekhane = ref.yemekhaneler[0].id;
    durum.baslangic = ref.bugun;
    durum.bugun = ref.bugun;
    durum.yemekler = await api('/yonetim/yemekler');
  } catch (e) { hataIsle(e); return; }
  sekmeleriCiz();
  yukle();
}

function sekmeleriCiz() {
  document.getElementById('yemekhane-sekmeleri').replaceChildren(
    ...durum.yemekhaneler.map((y) =>
      el('button', { class: 'dugme', type: 'button', 'aria-pressed': String(y.id === durum.yemekhane),
        onclick: () => { durum.yemekhane = y.id; sekmeleriCiz(); yukle(); } }, y.ad)));
}

async function yukle() {
  uyari('');
  try {
    const v = await api(`/yonetim/menuler?yemekhane=${durum.yemekhane}&baslangic=${durum.baslangic}`);
    durum.menuler = v.menuler;
    ciz();
  } catch (e) { hataIsle(e); }
}

// ---------- liste ----------
function menuKarti(m) {
  const puan = m.oySayisi ? `★ ${m.ortalamaPuan.toFixed(1)} (${m.oySayisi} oy)` : 'Henüz oy yok';
  return el('section', { class: 'fis kucuk-fis' },
    el('div', { class: 'satir' },
      el('strong', { class: 'gun-baslik' }, `${gunAdi(m.tarih)} · ${m.ogun}`),
      m.gecmis ? el('span', { class: 'soluk kucuk' }, 'Geçmiş')
               : el('button', { class: 'dugme ikincil', type: 'button', onclick: () => duzenle(m.menuId) }, 'Düzenle')),
    el('div', { class: 'kucuk' }, m.yemekler || ''),
    el('div', { class: 'soluk kucuk' }, `Öğrenci ${TL(m.ogrenciFiyat)} · Personel ${TL(m.personelFiyat)}`),
    el('div', { class: 'cubuk', role: 'img', 'aria-label': `Doluluk yüzde ${m.doluluk}` },
      el('div', { class: 'cubuk-ic', style: `width:${Math.min(100, m.doluluk)}%` })),
    el('div', { class: 'satir kucuk' },
      el('span', {}, `Doluluk ${m.dolu}/${m.kapasite} (%${m.doluluk})`),
      el('span', { class: 'soluk' }, puan)));
}

function ciz() {
  const ust = durum.form
    ? formKarti()
    : el('button', { class: 'dugme tam', type: 'button', onclick: yeniMenu }, '+ Yeni menü');
  const kartlar = durum.menuler.length
    ? durum.menuler.map(menuKarti)
    : [el('section', { class: 'fis kucuk-fis' }, el('p', { class: 'soluk' }, 'Bu aralıkta menü yok.'))];
  document.getElementById('icerik').replaceChildren(ust, ...kartlar);
}

// ---------- form ----------
function yeniMenu() {
  bilgi(''); uyari('');
  durum.form = { mod: 'yeni', menuId: null, tarih: durum.bugun, yemekhaneId: durum.yemekhane,
    ogunId: durum.ogunler[0].id, ogrFiyat: '', perFiyat: '', secili: new Set() };
  ciz();
}

async function duzenle(menuId) {
  bilgi(''); uyari('');
  try {
    const { menu, yemekIds } = await api(`/yonetim/menuler/${menuId}`);
    durum.form = { mod: 'duzenle', menuId, tarih: menu.tarih, yemekhaneId: menu.yemekhaneId, ogunId: menu.ogunId,
      ogrFiyat: menu.ogrenciFiyat, perFiyat: menu.personelFiyat, secili: new Set(yemekIds) };
    ciz();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) { hataIsle(e); }
}

function secimKutusu(kimlik, secenekler, deger, devreDisi, degisti) {
  const s = el('select', { id: kimlik, onchange: (e) => degisti(Number(e.target.value)) },
    ...secenekler.map((x) => el('option', { value: String(x.id) }, x.ad)));
  s.value = String(deger);
  s.disabled = devreDisi;
  return s;
}

function formKarti() {
  const f = durum.form;
  const duz = f.mod === 'duzenle';

  const tarih = el('input', { id: 'f-tarih', type: 'date', min: durum.bugun, oninput: (e) => { f.tarih = e.target.value; } });
  tarih.value = f.tarih; tarih.disabled = duz;
  const ogr = el('input', { id: 'f-ogr', type: 'number', min: '0', step: '0.5', inputmode: 'decimal', oninput: (e) => { f.ogrFiyat = e.target.value; } });
  ogr.value = f.ogrFiyat;
  const per = el('input', { id: 'f-per', type: 'number', min: '0', step: '0.5', inputmode: 'decimal', oninput: (e) => { f.perFiyat = e.target.value; } });
  per.value = f.perFiyat;

  const yemekSatirlari = [];
  let sonKategori = null;
  for (const y of durum.yemekler) {
    if (y.kategori !== sonKategori) { yemekSatirlari.push(el('div', { class: 'kategori' }, y.kategori)); sonKategori = y.kategori; }
    const kutu = el('input', { type: 'checkbox', onchange: (e) => { if (e.target.checked) f.secili.add(y.id); else f.secili.delete(y.id); } });
    kutu.checked = f.secili.has(y.id);
    yemekSatirlari.push(el('label', { class: 'onay-satiri' }, kutu, `${y.ad} · ${y.kalori} kcal`));
  }

  return el('section', { class: 'fis' },
    el('h1', { class: 'baslik' }, duz ? 'Menüyü düzenle' : 'Yeni menü'),
    el('hr', { class: 'kesik' }),
    el('label', { for: 'f-yemekhane' }, 'Yemekhane'),
    secimKutusu('f-yemekhane', durum.yemekhaneler, f.yemekhaneId, duz, (v) => { f.yemekhaneId = v; }),
    el('div', { class: 'cift-sutun' },
      el('div', {}, el('label', { for: 'f-tarih' }, 'Tarih'), tarih),
      el('div', {}, el('label', { for: 'f-ogun' }, 'Öğün'), secimKutusu('f-ogun', durum.ogunler, f.ogunId, duz, (v) => { f.ogunId = v; }))),
    el('div', { class: 'cift-sutun' },
      el('div', {}, el('label', { for: 'f-ogr' }, 'Öğrenci (TL)'), ogr),
      el('div', {}, el('label', { for: 'f-per' }, 'Personel (TL)'), per)),
    el('hr', { class: 'kesik' }),
    ...yemekSatirlari,
    el('div', { class: 'eylemler' },
      el('button', { class: 'dugme', type: 'button', onclick: kaydet }, 'Kaydet'),
      el('button', { class: 'dugme ikincil', type: 'button', onclick: () => { durum.form = null; uyari(''); ciz(); } }, 'Vazgeç')));
}

async function kaydet() {
  const f = durum.form;
  uyari(''); bilgi('');
  const govde = { ogrenciFiyat: f.ogrFiyat, personelFiyat: f.perFiyat, yemekIds: [...f.secili] };
  try {
    if (f.mod === 'yeni') {
      await api('/yonetim/menuler', { method: 'POST', body: JSON.stringify({ ...govde, yemekhaneId: f.yemekhaneId, tarih: f.tarih, ogunId: f.ogunId }) });
      durum.yemekhane = f.yemekhaneId; // yeni menünün olduğu haftayı göster
      durum.baslangic = f.tarih;
      sekmeleriCiz();
    } else {
      await api(`/yonetim/menuler/${f.menuId}`, { method: 'PUT', body: JSON.stringify(govde) });
    }
    durum.form = null;
    bilgi('Menü kaydedildi, liste güncelleniyor...');
    ciz();
    // Liste replikadan okunur; replikanın değişikliği alması için kısa bir süre bekleriz.
    setTimeout(async () => { await yukle(); bilgi('Menü kaydedildi.'); }, 600);
  } catch (e) { hataIsle(e); }
}

document.getElementById('onceki').addEventListener('click', () => { durum.baslangic = gunEkle(durum.baslangic, -7); yukle(); });
document.getElementById('sonraki').addEventListener('click', () => { durum.baslangic = gunEkle(durum.baslangic, 7); yukle(); });
document.getElementById('cikis').addEventListener('click', async () => {
  await api('/cikis', { method: 'POST' }).catch(() => {});
  location.href = 'index.html';
});
baslat();
