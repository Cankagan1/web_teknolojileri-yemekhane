// Ekran: Profil. Kişisel bilgiler ve alerjen tercihleri. Menülerde bu alerjenleri içeren yemekler uyarıyla gösterilir.
const durum = { profil: null, secili: new Set() };
const ROL = { ogrenci: 'Öğrenci', personel: 'Personel', yonetici: 'Yönetici' };

function uyari(m) { document.getElementById('uyari').textContent = m || ''; }
function bilgi(m) { document.getElementById('bilgi').textContent = m || ''; }
function hataIsle(e) { if (e.durum === 401) { location.href = 'index.html'; return; } bilgi(''); uyari(e.message); }

async function baslat() {
  try {
    durum.profil = await api('/profil');
  } catch (e) { hataIsle(e); return; }
  durum.secili = new Set(durum.profil.alerjenler.filter((a) => a.secili).map((a) => a.id));
  document.getElementById('kullanici').textContent = durum.profil.adSoyad;
  ciz();
}

function ciz() {
  const p = durum.profil;
  const satir = (ad, deger) => el('div', { class: 'satir' }, el('span', { class: 'soluk' }, ad), el('span', {}, deger));

  const kutular = p.alerjenler.map((a) => {
    const kutu = el('input', { type: 'checkbox', onchange: (e) => { if (e.target.checked) durum.secili.add(a.id); else durum.secili.delete(a.id); } });
    kutu.checked = durum.secili.has(a.id);
    return el('label', { class: 'onay-satiri' }, kutu, a.ad);
  });

  document.getElementById('icerik').replaceChildren(
    el('section', { class: 'fis' },
      el('h1', { class: 'baslik' }, 'Profil'),
      el('hr', { class: 'kesik' }),
      satir('Ad soyad', p.adSoyad),
      satir('E-posta', p.email),
      satir('Rol', ROL[p.rol] || p.rol),
      p.ogrenciNo ? satir('Öğrenci no', p.ogrenciNo) : ''),
    el('section', { class: 'fis' },
      el('h1', { class: 'baslik' }, 'Alerjenlerim'),
      el('p', { class: 'alt-baslik' }, 'Seçtikleriniz menülerde uyarıyla gösterilir'),
      el('hr', { class: 'kesik' }),
      ...kutular,
      el('button', { class: 'dugme tam', type: 'button', onclick: kaydet }, 'Kaydet')));
}

async function kaydet() {
  uyari(''); bilgi('');
  try {
    await api('/profil/alerjenler', { method: 'PUT', body: JSON.stringify({ alerjenIds: [...durum.secili] }) });
    bilgi('Alerjen tercihleriniz kaydedildi.');
  } catch (e) { hataIsle(e); }
}

document.getElementById('cikis').addEventListener('click', async () => {
  await api('/cikis', { method: 'POST' }).catch(() => {});
  location.href = 'index.html';
});
baslat();
