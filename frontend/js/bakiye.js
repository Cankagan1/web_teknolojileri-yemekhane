// Ekran: Bakiye (güncel bakiye, hareket geçmişi, yükleme).
const durum = { bakiye: 0, adSoyad: '', hareketler: [] };
const TUR = { yukleme: 'Yükleme', rezervasyon: 'Rezervasyon', iade: 'İade' };

function uyari(m) { document.getElementById('uyari').textContent = m || ''; }
function hataIsle(e) { if (e.durum === 401) { location.href = 'index.html'; return; } uyari(e.message); }

async function baslat() {
  try {
    const ben = await api('/ben');
    durum.adSoyad = ben.adSoyad;
    const v = await api('/bakiye');
    durum.bakiye = v.bakiye;
    durum.hareketler = v.hareketler;
  } catch (e) { hataIsle(e); return; }
  ciz();
}

function ciz() {
  document.getElementById('kullanici').textContent = durum.adSoyad;
  const tutarKutusu = el('input', { id: 'tutar', type: 'number', min: '1', max: '2000', step: '1', inputmode: 'decimal', placeholder: 'Tutar (TL)' });
  const hizli = el('div', { class: 'hizli' },
    ...[50, 100, 200].map((t) => el('button', { class: 'dugme ikincil', type: 'button', onclick: () => { tutarKutusu.value = t; } }, `${t} TL`)));
  const form = el('form', { onsubmit: (o) => { o.preventDefault(); yukle(tutarKutusu.value); } },
    el('label', { for: 'tutar' }, 'Bakiye yükle'), tutarKutusu, hizli,
    el('button', { class: 'dugme tam', type: 'submit' }, 'Yükle'));

  const satirlar = durum.hareketler.map((h) =>
    el('div', { class: 'satir' },
      el('span', {}, el('strong', {}, TUR[h.tur] || h.tur), el('span', { class: 'soluk kucuk' }, ` ${h.zaman.slice(0, 16)}`)),
      el('span', { class: h.tutar >= 0 ? 'pozitif' : 'negatif' }, (h.tutar > 0 ? '+' : '') + TL(h.tutar))));

  document.getElementById('icerik').replaceChildren(
    el('section', { class: 'fis' },
      el('h1', { class: 'baslik' }, 'Güncel bakiye'),
      el('div', { class: 'buyuk-bakiye' }, TL(durum.bakiye)),
      el('hr', { class: 'kesik' }), form),
    el('section', { class: 'fis' },
      el('h1', { class: 'baslik' }, 'Hareketler'),
      el('hr', { class: 'kesik' }),
      ...(satirlar.length ? satirlar : [el('p', { class: 'soluk' }, 'Henüz hareket yok.')])));
}

async function yukle(tutar) {
  uyari('');
  try {
    const sonuc = await api('/bakiye/yukle', { method: 'POST', body: JSON.stringify({ tutar }) });
    durum.bakiye = sonuc.yeniBakiye; // kaynaktan gelen değer
    // Listeyi replikadan yeniden çekmek yerine yeni satırı yerel ekliyoruz (replika milisaniyeler geriden gelebilir)
    const zaman = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' });
    durum.hareketler.unshift({ id: 'yeni-' + Date.now(), tur: 'yukleme', tutar: Number(tutar), zaman });
  } catch (e) { hataIsle(e); }
  ciz();
}

document.getElementById('cikis').addEventListener('click', async () => {
  await api('/cikis', { method: 'POST' }).catch(() => {});
  location.href = 'index.html';
});
baslat();
