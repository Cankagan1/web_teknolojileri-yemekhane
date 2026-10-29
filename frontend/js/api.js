// Arayüz tarafı yalnızca bu fonksiyonla API'ye konuşur; iş kuralı burada yok.
async function api(yol, secenekler = {}) {
  const yanit = await fetch('/api' + yol, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...secenekler,
  });
  const veri = await yanit.json().catch(() => ({}));
  if (!yanit.ok) {
    const hata = new Error(veri.hata || 'Bir hata oluştu.');
    hata.durum = yanit.status;
    throw hata;
  }
  return veri;
}

// Güvenli DOM oluşturucu: metinleri textContent ile yazar (HTML enjeksiyonu olmaz)
function el(etiket, ozellikler = {}, ...cocuklar) {
  const e = document.createElement(etiket);
  for (const [anahtar, deger] of Object.entries(ozellikler)) {
    if (anahtar === 'class') e.className = deger;
    else if (anahtar.startsWith('on')) e.addEventListener(anahtar.slice(2), deger);
    else e.setAttribute(anahtar, deger);
  }
  for (const c of cocuklar.flat()) e.append(c instanceof Node ? c : document.createTextNode(c));
  return e;
}

const TL = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';

// Ortak gezinme çubuğu: sayfada <nav id="gezinme"> varsa doldurulur.
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('gezinme');
  if (!nav) return;
  const sayfalar = [['menu.html', 'Bugün'], ['hafta.html', 'Hafta'], ['rezervasyonlarim.html', 'Fişlerim'], ['bakiye.html', 'Bakiye'], ['degerlendirme.html', 'Puanla']];
  const aktif = location.pathname.split('/').pop() || 'index.html';
  nav.replaceChildren(...sayfalar.map(([adres, ad]) => {
    const a = el('a', { href: adres }, ad);
    if (adres === aktif) a.setAttribute('aria-current', 'page');
    return a;
  }));
});
