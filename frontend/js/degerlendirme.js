// Ekran: Değerlendirme. Kullandığınız menülere 1-5 puan ve yorum. Kurallar sunucuda denetlenir.
const durum = { liste: [], adSoyad: '' };

function uyari(m) { document.getElementById('uyari').textContent = m || ''; }
function hataIsle(e) { if (e.durum === 401) { location.href = 'index.html'; return; } uyari(e.message); }
function gunAdi(t) { return new Date(t + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }); }
const yildizMetni = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

async function baslat() {
  try {
    const ben = await api('/ben');
    document.getElementById('kullanici').textContent = ben.adSoyad;
    durum.liste = await api('/degerlendirme');
  } catch (e) { hataIsle(e); return; }
  ciz();
}

function oyFormu(o) {
  const yildizlar = el('div', { class: 'yildizlar', role: 'group', 'aria-label': 'Puan' },
    ...[1, 2, 3, 4, 5].map((n) =>
      el('button', {
        class: 'yildiz' + (n <= (o.secim || 0) ? ' dolu' : ''), type: 'button', 'aria-label': `${n} puan`,
        'aria-pressed': String(n === o.secim),
        onclick: () => { o.secim = n; ciz(); },
      }, '★')));
  const yorum = el('textarea', {
    placeholder: 'Yorumunuz (isteğe bağlı)', maxlength: '500', 'aria-label': 'Yorum',
    oninput: (e) => { o.taslak = e.target.value; },
  });
  yorum.value = o.taslak || '';
  return el('div', {}, yildizlar, yorum,
    el('button', { class: 'dugme tam', type: 'button', onclick: () => gonder(o) }, 'Gönder'));
}

function ciz() {
  const kartlar = durum.liste.length
    ? durum.liste.map((o) =>
        el('section', { class: 'fis kucuk-fis' },
          el('div', { class: 'satir' }, el('strong', {}, `${o.yemekhane} · ${o.ogun}`),
            o.puan ? el('span', { class: 'damga' }, 'Oylandı') : ''),
          el('div', { class: 'soluk kucuk gun-baslik' }, gunAdi(o.tarih)),
          el('div', { class: 'kucuk' }, o.yemekler || ''),
          el('hr', { class: 'kesik' }),
          o.puan
            ? el('div', {}, el('div', { class: 'sabit-yildiz', 'aria-label': `${o.puan} puan` }, yildizMetni(o.puan)),
                o.yorum ? el('p', { class: 'kucuk' }, o.yorum) : '')
            : oyFormu(o)))
    : [el('section', { class: 'fis kucuk-fis' },
        el('p', { class: 'soluk' }, 'Henüz kullandığınız bir menü yok. Yemekhaneye girişten sonra burada oy verebilirsiniz.'))];
  document.getElementById('icerik').replaceChildren(...kartlar);
}

async function gonder(o) {
  uyari('');
  if (!o.secim) { uyari('Lütfen 1 ile 5 arasında bir puan seçin.'); return; }
  try {
    await api('/degerlendirme', {
      method: 'POST',
      body: JSON.stringify({ menuId: o.menuId, puan: o.secim, yorum: o.taslak || '' }),
    });
    o.puan = o.secim;
    o.yorum = (o.taslak || '').trim() || null;
  } catch (e) { hataIsle(e); }
  ciz();
}

document.getElementById('cikis').addEventListener('click', async () => {
  await api('/cikis', { method: 'POST' }).catch(() => {});
  location.href = 'index.html';
});
baslat();
