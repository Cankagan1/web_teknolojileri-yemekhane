// Ekran: Rezervasyonlarım (fişlerim). İptal edilebilirlik sunucudan gelir (eylem alanı).
const durum = { liste: [], bakiye: 0, adSoyad: '', filtre: 'hepsi' };
const FILTRELER = [['hepsi', 'Tümü'], ['aktif', 'Aktif'], ['kullanildi', 'Kullanıldı'], ['iptal', 'İptal']];

function uyari(m) { document.getElementById('uyari').textContent = m || ''; }
function ustYaz() { document.getElementById('kullanici').textContent = `${durum.adSoyad} · Bakiye ${TL(durum.bakiye)}`; }
function hataIsle(e) { if (e.durum === 401) { location.href = 'index.html'; return; } uyari(e.message); }
function gunAdi(t) { return new Date(t + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }); }

async function baslat() {
  try {
    const ben = await api('/ben');
    durum.adSoyad = ben.adSoyad;
    durum.bakiye = ben.bakiye;
    durum.liste = await api('/rezervasyon');
  } catch (e) { hataIsle(e); return; }
  ustYaz();
  ciz();
}

function damga(r) {
  if (r.durum === 'kullanildi') return el('span', { class: 'damga kirmizi' }, 'Kullanıldı');
  if (r.durum === 'iptal') return el('span', { class: 'damga kirmizi' }, 'İptal');
  return el('span', { class: 'damga' }, 'Aktif');
}

function eylemOgesi(r) {
  if (r.eylem === 'iptal_edilebilir') {
    return el('button', { class: 'dugme ikincil', type: 'button', onclick: () => iptalEt(r) }, 'İptal et');
  }
  if (r.eylem === 'sure_doldu') return el('span', { class: 'soluk kucuk' }, 'İptal süresi doldu');
  return '';
}

function ciz() {
  const sekmeler = el('div', { class: 'sekmeler' },
    ...FILTRELER.map(([anahtar, ad]) =>
      el('button', { class: 'dugme', type: 'button', 'aria-pressed': String(durum.filtre === anahtar),
        onclick: () => { durum.filtre = anahtar; ciz(); } }, ad)));

  const gorunen = durum.liste.filter((r) => durum.filtre === 'hepsi' || r.durum === durum.filtre);
  const kartlar = gorunen.length
    ? gorunen.map((r) =>
        el('section', { class: 'fis kucuk-fis' + (r.durum === 'iptal' ? ' iptal-fis' : '') },
          el('div', { class: 'satir' }, el('strong', {}, `${r.yemekhane} · ${r.ogun}${r.porsiyon === 'yarim' ? ' (yarım)' : ''}`), damga(r)),
          el('div', { class: 'soluk kucuk gun-baslik' }, `${gunAdi(r.tarih)} · son saat ${r.sonSaat.slice(0, 5)}`),
          el('div', { class: 'kucuk' }, r.yemekler || ''),
          el('div', { class: 'satir' },
            el('span', { class: 'soluk kucuk' }, `${TL(r.fiyat)} · ${r.toplamKalori} kcal`),
            eylemOgesi(r))))
    : [el('section', { class: 'fis kucuk-fis' }, el('p', { class: 'soluk' }, 'Gösterilecek rezervasyon yok.'))];

  document.getElementById('icerik').replaceChildren(sekmeler, ...kartlar);
}

async function iptalEt(r) {
  if (!confirm(`${gunAdi(r.tarih)} ${r.ogun} rezervasyonu iptal edilsin mi?`)) return;
  uyari('');
  try {
    const sonuc = await api(`/rezervasyon/${r.id}/iptal`, { method: 'POST' });
    r.durum = 'iptal';
    r.eylem = 'iptal';
    durum.bakiye = sonuc.yeniBakiye; // iade sonrası bakiye kaynaktan gelir
    ustYaz();
  } catch (e) { hataIsle(e); }
  ciz();
}

document.getElementById('cikis').addEventListener('click', async () => {
  await api('/cikis', { method: 'POST' }).catch(() => {});
  location.href = 'index.html';
});
baslat();
