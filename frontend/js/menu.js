// Ekran: Günün menüsü. Veri /api/menu/gunun'dan gelir, burada yalnızca gösterilir.
const durum = { yemekhane: null, ogun: null, referans: null };

async function baslat() {
  try {
    const ben = await api('/ben');
    document.getElementById('kullanici').textContent = `${ben.adSoyad} · Bakiye ${TL(ben.bakiye)}`;
    durum.referans = await api('/menu/referans');
  } catch (e) {
    if (e.durum === 401) { location.href = 'index.html'; return; }
    document.getElementById('fis').replaceChildren(el('p', { class: 'hata' }, e.message));
    return;
  }
  durum.yemekhane = durum.referans.yemekhaneler[0].id;
  durum.ogun = ogunSec(durum.referans.ogunler);
  sekmeleriCiz();
  menuYukle();
}

// Saate göre varsayılan öğün: ~10'a kadar kahvaltı/öğle, sonra akşam
function ogunSec(ogunler) {
  const saat = new Date().getHours();
  return (saat < 9 ? ogunler[0] : saat < 14 ? ogunler[1] : ogunler[2]).id;
}

function sekmeleriCiz() {
  const { yemekhaneler, ogunler } = durum.referans;
  const dugme = (ad, secili, tikla) =>
    el('button', { class: 'dugme', type: 'button', 'aria-pressed': String(secili), onclick: tikla }, ad);
  document.getElementById('yemekhane-sekmeleri').replaceChildren(
    ...yemekhaneler.map((y) => dugme(y.ad, y.id === durum.yemekhane, () => { durum.yemekhane = y.id; sekmeleriCiz(); menuYukle(); }))
  );
  document.getElementById('ogun-sekmeleri').replaceChildren(
    ...ogunler.map((o) => dugme(o.ad, o.id === durum.ogun, () => { durum.ogun = o.id; sekmeleriCiz(); menuYukle(); }))
  );
}

async function menuYukle() {
  const fis = document.getElementById('fis');
  fis.replaceChildren(el('p', { class: 'soluk' }, 'Yükleniyor...'));
  try {
    const { menu, yemekler } = await api(`/menu/gunun?yemekhane=${durum.yemekhane}&ogun=${durum.ogun}`);
    fisiCiz(fis, menu, yemekler);
  } catch (e) {
    if (e.durum === 401) { location.href = 'index.html'; return; }
    fis.replaceChildren(el('p', { class: 'hata' }, e.message));
  }
}

function fisiCiz(fis, menu, yemekler) {
  const parcalar = [
    el('h1', { class: 'baslik' }, `${menu.yemekhane} · ${menu.ogun}`),
    el('p', { class: 'alt-baslik' }, `${menu.tarih} · Rezervasyon son saati ${menu.sonSaat.slice(0, 5)}`),
  ];

  // Profildeki alerjenleri içeren menü: üstte genel uyarı
  if (menu.uyari.length) {
    parcalar.push(el('div', { class: 'uyari-kutusu', role: 'alert' },
      `⚠ Bu menü profilinizdeki alerjenleri içeriyor: ${menu.uyari.join(', ')}`));
  }
  parcalar.push(el('hr', { class: 'kesik' }));

  // yemekler kategori sırasıyla gelir; kategori değişince başlık koy
  let sonKategori = null;
  for (const y of yemekler) {
    if (y.kategori !== sonKategori) {
      parcalar.push(el('div', { class: 'kategori' }, y.kategori));
      sonKategori = y.kategori;
    }
    parcalar.push(el('div', { class: 'satir' }, el('span', {}, y.ad), el('span', { class: 'sag' }, `${y.kalori} kcal`)));
    if (y.uyari.length) parcalar.push(el('div', { class: 'uyari-satiri' }, `⚠ Alerjen uyarısı: ${y.uyari.join(', ')}`));
  }

  parcalar.push(el('hr', { class: 'kesik' }));
  parcalar.push(el('div', { class: 'toplam' }, el('span', {}, 'Toplam'), el('span', {}, `${menu.toplamKalori} kcal`)));
  parcalar.push(el('div', { class: 'toplam' }, el('span', {}, 'Fiyatınız'), el('span', {}, TL(menu.fiyat))));
  if (menu.yarimPorsiyonVar) {
    parcalar.push(el('div', { class: 'satir soluk' }, el('span', {}, 'Yarım porsiyon'), el('span', {}, TL(menu.yarimFiyat))));
  }
  parcalar.push(el('hr', { class: 'kesik' }));

  if (menu.vejetaryen) parcalar.push(el('span', { class: 'damga' }, 'Vejetaryen'));
  if (menu.alerjenler.length) {
    parcalar.push(el('div', { class: 'kategori' }, 'İçerdiği alerjenler'));
    parcalar.push(el('div', {}, menu.alerjenler.map((a) => el('span', { class: 'etiket' }, a))));
  }
  fis.replaceChildren(...parcalar);
}

document.getElementById('cikis').addEventListener('click', async () => {
  await api('/cikis', { method: 'POST' }).catch(() => {});
  location.href = 'index.html';
});

baslat();
