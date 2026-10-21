// Stride 2.0 "Lancar": tabs, short form, BM/EN toggle, custom targets
(function () {
  const P = [
    ['Kira pendapatan & kos harian','Track daily income & costs'],['TARGET HARIAN','DAILY TARGET'],['TARGET MILEAGE BULANAN','MONTHLY MILEAGE TARGET'],
    ['RINGKASAN PRESTASI','PERFORMANCE SUMMARY'],['Pendapatan Kasar','Gross Income'],['Untung Bersih','Net Profit'],['Untung sebenar','Real profit'],
    ['Purata Untung/Hari','Avg Profit/Day'],['Purata KM/Hari','Avg KM/Day'],['RM/Jam','RM/Hour'],['Selepas tabung','After fund'],['kos tetap bulanan','monthly fixed costs'],
    ['Projeksi hujung bulan','Projected month-end'],['Hari terbaik','Best day'],['purata','avg'],['Jumlah Kos','Total Cost'],['Jumlah KM','Total KM'],
    ['ANALISIS GRAF PRESTASI','PERFORMANCE CHART'],['Tiada data graf untuk dipaparkan.','No chart data to show.'],['TAMBAH REKOD HARIAN','ADD DAILY RECORD'],
    ['Tarikh','Date'],['Jumlah Trip','Trips'],['Odometer Mula','Odometer Start'],['Odometer Tamat','Odometer End'],['Jarak Perjalanan','Distance'],
    ['Jam Online','Hours Online'],['Minyak enjin','Engine oil'],['Minyak hitam','Engine oil'],['Minyak','Fuel'],['Tol','Toll'],['Lain-lain','Other'],['Opsyen','Optional'],['Contoh','e.g.'],
    ['Upload Gambar Resit','Upload Receipt Photo'],['Simpan Rekod','Save Record'],['Tandakan Hari Cuti','Mark Day Off'],['Cuti','Off'],['SEJARAH REKOD','RECORD HISTORY'],
    ['Padam Semua','Delete All'],['Padam','Delete'],['Belum ada rekod untuk bulan ini.','No records for this month.'],['Pendapatan','Income'],['Kos','Cost'],
    ['KESIHATAN & TABUNG KERETA','CAR HEALTH & FUND'],['Tabung Maintenance','Maintenance Fund'],['Tabung','Fund'],['Kos tetap','Fixed cost'],['Auto-kira','Auto-calc'],
    ['Odometer Semasa','Current Odometer'],['Tetapan Kenderaan & Dokumen','Vehicle & Document Settings'],['Log Servis Baru','Log New Service'],['Tayar','Tyres'],
    ['Pad brek','Brake pads'],['Bateri','Battery'],['belum direkod','not recorded'],['SEJARAH SERVIS KENDERAAN','SERVICE HISTORY'],['Belum ada rekod servis.','No service records yet.'],
    ['STATUS DOKUMEN & PUSPAKOM','DOCUMENT & PUSPAKOM STATUS'],['Insurans','Insurance'],['Baki','Left'],['hari','days'],['LUPUT','EXPIRED'],['lalu','ago'],['LEWAT','OVERDUE'],
    ['Tambah peringatan ke kalendar','Add reminders to calendar'],['LOG ISI MINYAK','FUEL LOG'],['Tambah Isi Minyak','Add Fuel Fill-up'],
    ['Rekod sekurang-kurangnya 2 kali isi minyak (tangki penuh) untuk kira km/L.','Log at least 2 full-tank fill-ups to calculate km/L.'],['Purata:','Average:'],
    ['PENGURUSAN DATA','DATA MANAGEMENT'],['Muat Turun Laporan Excel','Download Excel Report'],['Laporan Tahunan','Yearly Report'],['BACKUP GOOGLE DRIVE','GOOGLE DRIVE BACKUP'],
    ['Backup ke Drive','Backup to Drive'],['Restore dari Drive','Restore from Drive'],['Backup berjaya','Backup successful'],['Belum backup dalam 7 hari. Tekan','No backup in 7 days. Tap'],
    ['Kemas Kini Maklumat Kereta & Dokumen','Update Car & Document Info'],['Simpan Tetapan','Save Settings'],['Tutup','Close'],['Luput Insurans','Insurance Expiry'],['Luput Roadtax','Roadtax Expiry'],
    ['Hari Ini','Today'],['Ringkasan','Summary'],['Rekod','Records'],['Kereta','Car'],['Butiran lanjut','More details'],['Sembunyi butiran','Hide details'],['Tetapkan sendiri','Custom'],
    ['Sasaran harian (RM):','Daily target (RM):'],['Sasaran KM bulanan:','Monthly KM target:'],['Servis apa? Taip nombor:','Which service? Type a number:'],['KM Servis:','Service KM:'],
    ['Kos Servis (RM):','Service cost (RM):'],['Liter diisi (isi tangki penuh):','Litres filled (full tank):'],['Jumlah bayaran (RM):','Amount paid (RM):'],
    ['Bacaan odometer (KM):','Odometer reading (KM):'],['Tahun laporan:','Report year:'],['Tiada sambungan internet.','No internet connection.'],['Backup gagal','Backup failed'],['Restore gagal','Restore failed'],['Batal','Cancel'],['Simpan','Save'],['Muat Turun','Download'],['Tahun','Year'],['Servis apa?','Which service?'],['KM Servis','Service KM'],['Kos Servis (RM)','Service cost (RM)'],['Isi Minyak','Fuel Fill-up'],['Isi tangki penuh supaya kiraan km/L tepat.','Fill the tank fully so km/L is accurate.'],['Liter diisi','Litres filled'],['Jumlah bayaran (RM)','Amount paid (RM)'],['Bacaan odometer (KM)','Odometer reading (KM)'],['Padam SEMUA rekod','Delete ALL records'],['Taip PADAM untuk sahkan','Type PADAM to confirm'],['Adakah anda pasti mahu memadam rekod ini?','Are you sure you want to delete this record?'],['Padam rekod isi minyak ini?','Delete this fuel record?'],['Belum layak kuota tambahan BUDI95','Not yet eligible for extra BUDI95 quota'],['Perlu','Need'],['km lagi untuk','more km for'],['Kuota BUDI95','BUDI95 quota'],['L/bulan','L/month'],['Seterusnya','Next'],['pada','at'],['baki','left'],['tertinggi','highest'],['Minyak direkod bulan ini','Fuel logged this month'],['Syarat boleh berubah, semak pengumuman rasmi.','Rules may change; check official announcements.']
  ].sort((a, b) => b[0].length - a[0].length);
  const RX = P.map(([m, e]) => [new RegExp('(?<![A-Za-z])' + m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![A-Za-z])', 'g'), e]);
  let lang = localStorage.getItem('stride_lang') || 'ms';
  const tr = (s) => lang === 'ms' ? s : RX.reduce((a, [r, e]) => a.replace(r, e), s);


  // ---- in-app dialogs (replace browser popups) ----
  const mk = (h) => { const d = document.createElement('div'); d.innerHTML = h; return d.firstElementChild; };
  window.uiToast = function (m, err) {
    const t = mk(`<div class="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] max-w-[90%] bg-slate-800 border ${err ? 'border-rose-500/50 text-rose-200' : 'border-cyan-500/40 text-slate-100'} text-xs rounded-xl px-4 py-2 shadow-lg"></div>`);
    t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  };
  window.uiForm = function (o) {
    return new Promise((res) => {
      const inp = 'w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500';
      const ov = mk('<div class="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4"><form class="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3"></form></div>');
      const f = ov.querySelector('form');
      f.innerHTML = '<h3 class="t text-sm font-bold text-slate-100"></h3><p class="n text-[11px] text-slate-400"></p><div class="fs space-y-3"></div><p class="e text-[11px] text-rose-400 min-h-[1rem]"></p>' +
        `<div class="flex gap-2"><button type="button" class="c flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm border border-slate-700">Batal</button><button type="submit" class="k flex-1 py-2.5 rounded-xl text-sm font-semibold text-white ${o.danger ? 'bg-rose-600' : 'bg-emerald-600'}"></button></div>`;
      f.querySelector('.t').textContent = o.title || '';
      f.querySelector('.n').textContent = o.note || '';
      f.querySelector('.k').textContent = o.ok || 'OK';
      const els = {};
      (o.fields || []).forEach((x) => {
        const w = mk('<div><label class="block text-xs text-slate-400 mb-1"></label></div>'); w.firstChild.textContent = x.label;
        let i;
        if (x.type === 'select') { i = document.createElement('select'); (x.options || []).forEach(([v, l]) => { const op = document.createElement('option'); op.value = v; op.textContent = l; i.appendChild(op); }); }
        else { i = document.createElement('input'); if (x.type === 'number') { i.type = 'number'; i.inputMode = 'decimal'; i.step = x.step || 'any'; } else i.type = 'text'; if (x.placeholder) i.placeholder = x.placeholder; }
        i.className = inp; if (x.value !== undefined) i.value = x.value; w.appendChild(i); f.querySelector('.fs').appendChild(w); els[x.id] = i;
      });
      const close = (v) => { document.removeEventListener('keydown', esc); ov.remove(); res(v); };
      const esc = (e) => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', esc);
      f.querySelector('.c').onclick = () => close(null);
      ov.addEventListener('mousedown', (e) => { if (e.target === ov) close(null); });
      f.onsubmit = (e) => {
        e.preventDefault(); const v = {}; Object.keys(els).forEach((k) => (v[k] = els[k].value));
        const err = o.validate ? o.validate(v) : ''; if (err) { f.querySelector('.e').textContent = err; return; } close(v);
      };
      document.body.appendChild(ov); const first = Object.values(els)[0]; if (first) { first.focus(); if (first.select) first.select(); }
    });
  };
  window.uiConfirm = (msg, ok) => window.uiForm({ title: msg, ok: ok || 'OK', danger: /Padam/.test(ok || ''), fields: [] }).then((r) => !!r);
  window.alert = (m) => window.uiToast(String(m));
  for (const f of ['confirm', 'prompt']) { const o = window[f].bind(window); window[f] = (m, ...r) => o(tr(String(m)), ...r); }

  function updateBudi() {
    try {
      const sec = document.querySelector('main').children[2]; if (!sec) return;
      let p = document.getElementById('budi-status');
      if (!p) { const b = sec.querySelector('button'); if (!b) return; p = document.createElement('p'); p.id = 'budi-status'; p.className = 'text-[11px] text-cyan-300 leading-snug'; b.parentNode.insertAdjacentElement('beforebegin', p); }
      const km = records.filter((r) => (r.date || '').startsWith(selectedMonth)).reduce((s, r) => s + (Number(r.distance) || 0), 0);
      const lt = fuelRecords.filter((f) => (f.date || '').startsWith(selectedMonth)).reduce((s, f) => s + (Number(f.litres) || 0), 0);
      let t = km < 2000 ? `Belum layak kuota tambahan BUDI95. Perlu ${Math.ceil(2000 - km)} km lagi untuk 600 L.`
        : km < 5000 ? `Kuota BUDI95: 600 L/bulan. Seterusnya 800 L pada 5000 km (baki ${Math.ceil(5000 - km)} km).` : 'Kuota BUDI95: 800 L/bulan (tertinggi).';
      if (lt > 0) t += ` Minyak direkod bulan ini: ${lt.toFixed(1)} L.`;
      t += ' Syarat boleh berubah, semak pengumuman rasmi.';
      if (p.__ms !== t) { p.__ms = t; p.textContent = t; }
    } catch (e) {}
  }

  let busy = false;
  function apply() {
    busy = true;
    updateBudi();
    document.documentElement.lang = lang === 'en' ? 'en' : 'ms';
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      if (n.parentNode.closest('script,style')) continue;
      if (n.__t !== n.nodeValue) n.__o = n.nodeValue;
      if (lang === 'en') { n.__t = tr(n.__o); if (n.nodeValue !== n.__t) n.nodeValue = n.__t; } else if (n.__o !== undefined) { if (n.nodeValue !== n.__o) n.nodeValue = n.__o; n.__t = undefined; }
    }
    document.querySelectorAll('[placeholder]').forEach((el) => {
      if (el.__p === undefined || el.getAttribute('placeholder') !== el.__pt) el.__p = el.getAttribute('placeholder');
      el.__pt = tr(el.__p); el.setAttribute('placeholder', el.__pt);
    });
    const lb = document.getElementById('lang-btn'); if (lb) { const x = lang === 'ms' ? 'BM | en' : 'bm | EN'; if (lb.textContent !== x) lb.textContent = x; }
    busy = false;
  }
  let raf = 0;
  new MutationObserver(() => { if (busy || raf) return; raf = requestAnimationFrame(() => { raf = 0; apply(); }); })
    .observe(document.body, { childList: true, subtree: true, characterData: true });

  // ---- tabs ----
  const TABS = { today: [0, 1, 5], stats: [2, 3, 4], records: [6], car: [7, 8], data: [9] };
  function showTab(k) {
    const main = document.querySelector('main');
    [...main.children].forEach((el, i) => el.classList.toggle('hidden', !TABS[k].includes(i)));
    const ft = document.querySelector('footer'); if (ft) ft.classList.toggle('hidden', k !== 'data');
    document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('text-cyan-400', b.dataset.tab === k));
    localStorage.setItem('stride_tab', k); window.scrollTo(0, 0);
  }

  // ---- short form ----
  function setAdv(open) {
    document.querySelectorAll('.adv-field').forEach((el) => el.classList.toggle('hidden', !open));
    const b = document.getElementById('adv-toggle'); if (b) { b.textContent = open ? '▴ Sembunyi butiran' : '▾ Butiran lanjut'; b.dataset.open = open ? '1' : ''; }
    apply();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main'); main.classList.add('pb-24');
    const nav = document.createElement('nav'); nav.id = 'tabbar';
    nav.className = 'fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex justify-around';
    nav.style.paddingBottom = 'env(safe-area-inset-bottom)';
    [['today', '🏠', 'Hari Ini'], ['stats', '📊', 'Ringkasan'], ['records', '🧾', 'Rekod'], ['car', '🚗', 'Kereta'], ['data', '☁️', 'Data']].forEach(([k, i, l]) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.tab = k;
      b.className = 'flex-1 py-2 text-[11px] text-slate-400 flex flex-col items-center gap-0.5';
      b.innerHTML = `<span class="text-lg leading-none">${i}</span><span>${l}</span>`; b.onclick = () => showTab(k); nav.appendChild(b);
    });
    document.body.appendChild(nav);

    const lb = document.createElement('button'); lb.id = 'lang-btn'; lb.type = 'button';
    lb.className = 'fixed top-2 right-3 z-40 text-[11px] bg-slate-800/90 text-cyan-300 border border-slate-700 rounded-full px-2.5 py-1';
    lb.onclick = () => { lang = lang === 'ms' ? 'en' : 'ms'; localStorage.setItem('stride_lang', lang); apply(); }; document.body.appendChild(lb);

    // short form: hide the less-used fields behind one toggle
    const hide = (id, sel) => { const e = document.getElementById(id); const w = e && e.closest(sel); if (w) w.classList.add('adv-field', 'hidden'); };
    hide('trips', 'div'); hide('odo-start', '.grid'); hide('hours', '.grid'); hide('toll', 'div'); hide('other-expenses', 'div'); hide('receipt-file', 'div');
    const sub = document.querySelector('#tracker-form button[type=submit]');
    if (sub) {
      const t = document.createElement('button'); t.type = 'button'; t.id = 'adv-toggle';
      t.className = 'w-full text-xs text-cyan-400 py-1'; t.onclick = () => setAdv(!t.dataset.open); sub.insertAdjacentElement('beforebegin', t);
    }
    setAdv(false);
    const oe = window.editRecord; if (oe) window.editRecord = function (id) { oe(id); setAdv(true); };

    // custom targets
    [['setDailyTarget', 'Sasaran harian (RM):'], ['setMonthlyKmTarget', 'Sasaran KM bulanan:']].forEach(([fn, q]) => {
      const btns = document.querySelectorAll(`[onclick^="${fn}"]`); const last = btns[btns.length - 1]; if (!last) return;
      const c = document.createElement('button'); c.type = 'button'; c.className = last.className; c.textContent = '✏️ Tetapkan sendiri';
      c.onclick = async () => { const r = await window.uiForm({ title: q.replace(':', ''), ok: 'Simpan', fields: [{ id: 'v', label: q.replace(':', ''), type: 'number' }], validate: (v) => (parseFloat(v.v) > 0 ? '' : 'Masukkan nombor lebih daripada 0.') }); if (r) window[fn](parseFloat(r.v)); }; last.parentNode.appendChild(c);
    });

    showTab(localStorage.getItem('stride_tab') || 'today'); apply();
  });
})();
