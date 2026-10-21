// Tarikh tempatan (YYYY-MM-DD). toISOString() guna UTC, jadi sebelum 8 pagi MYT ia bagi tarikh semalam.
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
let FUND_RATE = 0.05;
const PRESETS = {
    car: { fund: 0.05, items: [['oil','Minyak enjin',10000],['tyre','Tayar',40000],['brake','Pad brek',30000],['battery','Bateri',60000],['aircond','Aircond',20000]] },
    motor: { fund: 0.03, items: [['oil','Minyak enjin',3000],['tyre','Tayar',15000],['brake','Pad brek',12000],['battery','Bateri',30000],['chain','Rantai & gear',20000]] },
    van: { fund: 0.08, items: [['oil','Minyak enjin',7500],['tyre','Tayar',40000],['brake','Pad brek',30000],['battery','Bateri',50000],['aircond','Aircond',20000]] }
};
function applyVehicleDefaults() {
    const v = localStorage.getItem('stride_selected_vehicle') || '';
    const p = PRESETS[/Motosikal|Skuter/.test(v) ? 'motor' : /Van|Lori/.test(v) ? 'van' : 'car'];
    FUND_RATE = p.fund;
    SERVICE_ITEMS = p.items.map(([k, n, km]) => ({ k, n, km }));
    document.querySelectorAll('.fund-rate').forEach(e => e.textContent = FUND_RATE.toFixed(2));
}
let SERVICE_ITEMS = [
    { k: 'oil', n: 'Minyak enjin', km: 10000 }, { k: 'tyre', n: 'Tayar', km: 40000 },
    { k: 'brake', n: 'Pad brek', km: 30000 }, { k: 'battery', n: 'Bateri', km: 60000 },
    { k: 'aircond', n: 'Aircond', km: 20000 }
];
const DOW = ['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'];

function localDateStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

let records = [];
try {
    records = JSON.parse(localStorage.getItem('stride_records')) || [];
} catch (e) {
    records = [];
}

let serviceRecords = [];
try {
    serviceRecords = JSON.parse(localStorage.getItem('stride_service_records')) || [];
} catch (e) {
    serviceRecords = [];
}

let fuelRecords = [];
try { fuelRecords = JSON.parse(localStorage.getItem('stride_fuel_records')) || []; } catch (e) { fuelRecords = []; }
let editingId = null;
let selectedMonth = localStorage.getItem('stride_selected_month') || localDateStr().slice(0, 7);
let fixedMonthly = parseFloat(localStorage.getItem('stride_fixed_monthly')) || 0;

function changeMonth(val) {
    if (!val) return;
    selectedMonth = val;
    localStorage.setItem('stride_selected_month', val);
    renderApp();
}
let dailyTargetValue = parseFloat(localStorage.getItem('stride_daily_target')) || 280;
let monthlyKmTargetValue = parseFloat(localStorage.getItem('stride_monthly_km_target')) || 2000;
let baseOdometer = parseFloat(localStorage.getItem('stride_base_odometer')) || 0;

function changeVehicleType(val) {
    localStorage.setItem('stride_selected_vehicle', val);
    applyVehicleDefaults();
    renderApp();
}

window.addEventListener('DOMContentLoaded', () => {
    const savedVehicle = localStorage.getItem('stride_selected_vehicle');
    const selectElem = document.getElementById('vehicle-type-select');
    if (savedVehicle && selectElem) {
        selectElem.value = savedVehicle;
    }
    applyVehicleDefaults();

    const monthInput = document.getElementById('month-select');
    if (monthInput) monthInput.value = selectedMonth;

    const recordDateInput = document.getElementById('record-date');
    if (recordDateInput && !recordDateInput.value) {
        recordDateInput.value = localDateStr();
    }

    sortRecords();
    renderApp();
});

const trackerForm = document.getElementById('tracker-form');
if (trackerForm) {
    trackerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const date = document.getElementById('record-date').value;
        const income = parseFloat(document.getElementById('income').value) || 0;
        const trips = parseInt(document.getElementById('trips').value) || 0;
        const distance = parseFloat(document.getElementById('distance').value) || 0;
        const fuel = parseFloat(document.getElementById('fuel').value) || 0;
        const toll = parseFloat(document.getElementById('toll').value) || 0;
        const otherExpenses = parseFloat(document.getElementById('other-expenses').value) || 0;
        const hours = parseFloat(document.getElementById('hours').value) || 0;
        const platform = document.getElementById('platform').value || '';
        const odoStart = parseFloat(document.getElementById('odo-start').value) || 0;
        const odoEnd = parseFloat(document.getElementById('odo-end').value) || 0;
        const recId = editingId !== null ? editingId : Date.now();
        let hasReceipt = false;
        try { hasReceipt = await saveReceipt(recId); } catch (err) { alert('Gambar resit gagal disimpan.'); }
        const totalExpenses = fuel + toll + otherExpenses;

        if (income === 0 && distance === 0 && totalExpenses === 0) {
            if (!(await uiConfirm('Pendapatan, jarak dan kos semuanya 0. Simpan sebagai hari cuti?', 'Simpan'))) return;
        }

        if (editingId !== null) {
            records = records.map(rec => {
                if (rec.id === editingId) {
                    return { ...rec, date, income, trips, distance, hours, platform, odoStart, odoEnd, hasReceipt: rec.hasReceipt || hasReceipt, fuel, toll, otherExpenses, totalExpenses, dayOff: false };
                }
                return rec;
            });
            editingId = null;
            const submitBtn = trackerForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerText = "Simpan Rekod";
                submitBtn.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl transition shadow-lg text-sm";
            }
        } else {
            const newRecord = {
                id: recId,
                date,
                income,
                trips,
                distance,
                hours,
                platform,
                odoStart,
                odoEnd,
                hasReceipt,
                fuel,
                toll,
                otherExpenses,
                totalExpenses
            };
            records.unshift(newRecord);
        }

        sortRecords();
        saveAndRefresh();
        this.reset();
        const recordDateInput = document.getElementById('record-date');
        if (recordDateInput) {
            recordDateInput.value = localDateStr();
        }
    });
}

function sortRecords() {
    if (Array.isArray(records)) {
        records.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
}

function saveAndRefresh() {
    sortRecords();
    localStorage.setItem('stride_records', JSON.stringify(records));
    localStorage.setItem('stride_service_records', JSON.stringify(serviceRecords));
    localStorage.setItem('stride_fuel_records', JSON.stringify(fuelRecords));
    renderApp();
}

function renderApp() {
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalKm = 0;
    const monthKey = localDateStr().slice(0, 7);
    const workedDays = new Set();
    let totalHours = 0;
    const dowSum = [0,0,0,0,0,0,0], dowCnt = [0,0,0,0,0,0,0];

    sortRecords();

    const container = document.getElementById('records-container');
    if (container) {
        container.innerHTML = '';
        const shown = records.filter(r => (r.date || '').startsWith(monthKey));
        if (!Array.isArray(records) || shown.length === 0) {
            container.innerHTML = `<div class="text-xs text-slate-400 text-center py-4">Belum ada rekod untuk bulan ini.</div>`;
        } else {
            const listDiv = document.createElement('div');
            listDiv.className = "space-y-2";
            shown.forEach(rec => {
                let inc = Number(rec.income) || 0;
                let exp = Number(rec.totalExpenses) || 0;
                let dist = Number(rec.distance) || 0;
                
                if ((rec.date || '').startsWith(monthKey)) {
                    totalIncome += inc;
                    totalExpenses += exp;
                    totalKm += dist;
                    if (inc > 0 || dist > 0) workedDays.add(rec.date);
                    totalHours += Number(rec.hours) || 0;
                    if (inc > 0) { const dw = new Date(rec.date + 'T00:00:00').getDay(); dowSum[dw] += inc - exp; dowCnt[dw]++; }
                }

                let net = inc - exp;
                const item = document.createElement('div');
                item.className = "bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs";
                item.innerHTML = `
                    <div>
                        <div class="text-slate-200 font-semibold">${esc(rec.date)}${rec.dayOff ? ' 🌴 Cuti' : ''} <span class="text-cyan-400 font-normal">(${dist.toFixed(1)} km)</span></div>
                        <div class="text-slate-400 text-[10px]">Pendapatan: RM ${inc.toFixed(2)} | Kos: RM ${exp.toFixed(2)}${rec.platform ? ' | ' + esc(rec.platform) : ''}${rec.hours ? ' | ' + esc(rec.hours) + 'j' : ''}</div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-emerald-400 font-bold">RM ${net.toFixed(2)}</span>
                        ${rec.hasReceipt ? `<button type="button" onclick="viewReceipt(${Number(rec.id)})" class="px-1">📎</button>` : ''}
                        <button type="button" onclick="editRecord(${Number(rec.id)})" class="text-sky-400 hover:text-sky-300 px-2 py-1 bg-sky-950/50 rounded border border-sky-900/40">Edit</button>
                        <button type="button" onclick="deleteRecord(${Number(rec.id)})" class="text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-950/50 rounded border border-rose-900/40">Padam</button>
                    </div>
                `;
                listDiv.appendChild(item);
            });
            container.appendChild(listDiv);
        }
    }

    let netProfit = totalIncome - totalExpenses;
    let daysCount = Math.max(1, workedDays.size);

    if (document.getElementById('summary-income')) document.getElementById('summary-income').innerText = `RM ${totalIncome.toFixed(2)}`;
    if (document.getElementById('summary-net')) document.getElementById('summary-net').innerText = `RM ${netProfit.toFixed(2)}`;
    if (document.getElementById('summary-expenses')) document.getElementById('summary-expenses').innerText = `RM ${totalExpenses.toFixed(2)}`;
    if (document.getElementById('summary-km')) document.getElementById('summary-km').innerText = `${totalKm.toFixed(1)} km`;
    if (document.getElementById('avg-daily-net')) document.getElementById('avg-daily-net').innerText = `RM ${(netProfit / daysCount).toFixed(2)}`;
    if (document.getElementById('avg-daily-km')) document.getElementById('avg-daily-km').innerText = `${(totalKm / daysCount).toFixed(1)} km`;

    const daysInMonth = new Date(+monthKey.slice(0, 4), +monthKey.slice(5, 7), 0).getDate();
    const isCurrent = monthKey === localDateStr().slice(0, 7);
    const elapsed = isCurrent ? new Date().getDate() : daysInMonth;
    const fundMonth = totalKm * FUND_RATE;
    const fixedCost = fixedMonthly * elapsed / daysInMonth;
    const realProfit = netProfit - fundMonth - fixedCost;
    const setTxt = (id, t) => { const el = document.getElementById(id); if (el) el.innerText = t; };
    setTxt('avg-per-hour', totalHours > 0 ? `RM ${(totalIncome / totalHours).toFixed(2)}` : '-');
    setTxt('avg-per-km', totalKm > 0 ? `RM ${(totalIncome / totalKm).toFixed(2)}` : '-');
    setTxt('real-profit', `RM ${realProfit.toFixed(2)}`);
    setTxt('real-breakdown', `Tabung RM ${fundMonth.toFixed(2)} + Kos tetap RM ${fixedCost.toFixed(2)}`);
    let projText = '';
    if (isCurrent && workedDays.size > 0) projText += `Projeksi hujung bulan: RM ${(realProfit / elapsed * daysInMonth).toFixed(0)}. `;
    const avgs = dowSum.map((v, i) => dowCnt[i] ? v / dowCnt[i] : -Infinity);
    const best = avgs.indexOf(Math.max(...avgs));
    if (dowCnt[best] > 0) projText += `Hari terbaik: ${DOW[best]} (purata RM ${avgs[best].toFixed(0)}).`;
    setTxt('projection-text', projText);
    const rem = document.getElementById('backup-reminder');
    if (rem) {
        const last = Date.parse(localStorage.getItem('stride_drive_last_backup') || '');
        rem.classList.toggle('hidden', !((isNaN(last) || Date.now() - last > 7 * 864e5) && records.length > 0));
    }

    let todayStr = localDateStr();
    let todayIncome = records.filter(r => r.date === todayStr).reduce((sum, r) => sum + (Number(r.income) || 0), 0);
    let dailyPercent = Math.min(100, (todayIncome / (dailyTargetValue || 280)) * 100);
    
    if (document.getElementById('daily-current-text')) document.getElementById('daily-current-text').innerText = `RM ${todayIncome.toFixed(2)}`;
    if (document.getElementById('daily-target-max')) document.getElementById('daily-target-max').innerText = `RM ${(dailyTargetValue || 280).toFixed(2)}`;
    if (document.getElementById('daily-progress-bar')) document.getElementById('daily-progress-bar').style.width = `${dailyPercent}%`;
    if (document.getElementById('daily-target-percent')) document.getElementById('daily-target-percent').innerText = `${dailyPercent.toFixed(0)}%`;

    let monthlyPercent = Math.min(100, (totalKm / (monthlyKmTargetValue || 2500)) * 100);
    if (document.getElementById('monthly-km-current')) document.getElementById('monthly-km-current').innerText = `${totalKm.toFixed(1)} km`;
    if (document.getElementById('monthly-km-max')) document.getElementById('monthly-km-max').innerText = `${monthlyKmTargetValue} km`;
    if (document.getElementById('monthly-km-progress')) document.getElementById('monthly-km-progress').style.width = `${monthlyPercent}%`;
    if (document.getElementById('monthly-km-percent')) document.getElementById('monthly-km-percent').innerText = `${monthlyPercent.toFixed(0)}%`;

    let carFundTotal = totalKm * FUND_RATE;
    if (document.getElementById('car-fund')) document.getElementById('car-fund').innerText = `RM ${carFundTotal.toFixed(2)}`;

    let currentTotalKmForOdo = records.reduce((sum, r) => sum + (Number(r.distance) || 0), 0);
    let currentOdo = baseOdometer + currentTotalKmForOdo;
    if (document.getElementById('current-odometer')) document.getElementById('current-odometer').innerText = `${currentOdo.toFixed(0)} km`;

    const lastServiceRaw = parseFloat(localStorage.getItem('stride_last_service_km'));
    const oilEl = document.getElementById('oil-change-remaining');
    if (oilEl) {
        if (isNaN(lastServiceRaw)) {
            oilEl.innerText = 'belum direkod';
        } else {
            oilEl.innerText = `Baki ${Math.max(0, 10000 - (currentOdo - lastServiceRaw)).toFixed(0)} km`;
        }
    }

    renderPerformanceChart();
    renderServiceHistory();
    renderFuel();
    updateDocumentStatusDisplay();
}

function renderPerformanceChart() {
    const chartContainer = document.getElementById('performance-chart-container');
    if (!chartContainer) return;

    chartContainer.innerHTML = '';
    if (!Array.isArray(records) || records.length === 0) {
        chartContainer.innerHTML = `<div class="w-full text-center text-xs text-slate-500 self-center">Tiada data graf untuk dipaparkan.</div>`;
        return;
    }

    const byDate = {};
    records.forEach(r => {
        if (!r.date) return;
        const d = byDate[r.date] || (byDate[r.date] = { date: r.date, income: 0, totalExpenses: 0 });
        d.income += Number(r.income) || 0;
        d.totalExpenses += Number(r.totalExpenses) || 0;
    });
    let recentRecords = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
    let maxVal = Math.max(...recentRecords.map(r => Math.max(Number(r.income) || 0, Number(r.income - (r.totalExpenses || 0)))), 10);

    let chartFlex = document.createElement('div');
    chartFlex.className = "flex items-end justify-between h-32 w-full px-2 space-x-2";

    recentRecords.forEach(r => {
        let inc = Number(r.income) || 0;
        let net = inc - (Number(r.totalExpenses) || 0);
        
        let incHeight = maxVal > 0 ? Math.max(4, (inc / maxVal) * 100) : 4;
        let netHeight = maxVal > 0 ? Math.max(4, (Math.max(0, net) / maxVal) * 100) : 4;

        let colDiv = document.createElement('div');
        colDiv.className = "flex flex-col items-center h-full justify-end flex-1 text-[9px] text-slate-400";
        colDiv.innerHTML = `
            <div class="flex items-end space-x-1 h-full w-full justify-center">
                <div style="height: ${incHeight}%" class="w-2 bg-emerald-500 rounded-t transition-all" title="Kasar: RM ${inc.toFixed(2)}"></div>
                <div style="height: ${netHeight}%" class="w-2 bg-indigo-500 rounded-t transition-all" title="Bersih: RM ${net.toFixed(2)}"></div>
            </div>
            <span class="mt-1 truncate max-w-[35px] text-[8px]">${r.date ? r.date.slice(5) : ''}</span>
        `;
        chartFlex.appendChild(colDiv);
    });

    chartContainer.appendChild(chartFlex);
}

function renderServiceHistory() {
    const odo = baseOdometer + records.reduce((sum, r) => sum + (Number(r.distance) || 0), 0);
    const box = document.getElementById('service-intervals');
    if (box) {
        box.innerHTML = SERVICE_ITEMS.map(it => {
            const done = serviceRecords.filter(x => (x.item || 'oil') === it.k).map(x => Number(x.km) || 0);
            if (!done.length) return `<div class="flex justify-between text-[11px]"><span class="text-slate-400">${it.n}</span><span class="text-slate-500">belum direkod</span></div>`;
            const left = it.km - (odo - Math.max(...done));
            const cls = left <= 0 ? 'text-rose-400' : left < it.km * 0.1 ? 'text-amber-400' : 'text-cyan-400';
            return `<div class="flex justify-between text-[11px]"><span class="text-slate-300">${it.n}</span><span class="${cls} font-semibold">${left <= 0 ? 'LEWAT ' + Math.round(-left) : 'Baki ' + Math.round(left)} km</span></div>`;
        }).join('');
    }
    const container = document.getElementById('service-history-container');
    if (!container) return;
    if (!Array.isArray(serviceRecords) || serviceRecords.length === 0) {
        container.innerHTML = `Belum ada rekod servis.`;
        return;
    }
    container.innerHTML = '';
    const list = document.createElement('div');
    list.className = "space-y-1.5";
    serviceRecords.forEach(x => {
        const name = (SERVICE_ITEMS.find(it => it.k === (x.item || 'oil')) || {}).n || 'Servis';
        const row = document.createElement('div');
        row.className = "flex justify-between items-center bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-[11px]";
        row.innerHTML = `<span class="text-slate-300">${esc(x.date)} - ${name} (${esc(x.km)} KM)</span><span class="text-amber-400 font-semibold">RM ${(Number(x.cost) || 0).toFixed(2)}</span>`;
        list.appendChild(row);
    });
    container.appendChild(list);
}

function setDailyTarget(val) {
    dailyTargetValue = val;
    localStorage.setItem('stride_daily_target', val);
    renderApp();
}

function setMonthlyKmTarget(val) {
    monthlyKmTargetValue = val;
    localStorage.setItem('stride_monthly_km_target', val);
    renderApp();
}

function toggleVehicleSettings() {
    const panel = document.getElementById('vehicle-settings-panel');
    if (!panel) return;
    
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        let currentTotalKm = records.reduce((sum, r) => sum + (Number(r.distance) || 0), 0);
        document.getElementById('input-base-odometer').value = baseOdometer + currentTotalKm;
        document.getElementById('input-fixed-monthly').value = fixedMonthly || '';
        document.getElementById('input-insurans').value = localStorage.getItem('stride_insurans_expiry') || '';
        document.getElementById('input-roadtax').value = localStorage.getItem('stride_roadtax_expiry') || '';
    } else {
        panel.classList.add('hidden');
    }
}

function saveVehicleSettings() {
    let newOdoInput = parseFloat(document.getElementById('input-base-odometer').value) || 0;
    let insVal = document.getElementById('input-insurans').value;
    let roadVal = document.getElementById('input-roadtax').value;
    fixedMonthly = parseFloat(document.getElementById('input-fixed-monthly').value) || 0;
    localStorage.setItem('stride_fixed_monthly', fixedMonthly);

    let currentTotalKm = records.reduce((sum, r) => sum + (Number(r.distance) || 0), 0);
    baseOdometer = Math.max(0, newOdoInput - currentTotalKm);
    
    localStorage.setItem('stride_base_odometer', baseOdometer);
    if (insVal) localStorage.setItem('stride_insurans_expiry', insVal);
    if (roadVal) localStorage.setItem('stride_roadtax_expiry', roadVal);

    toggleVehicleSettings();
    renderApp();
    alert('Tetapan kenderaan berjaya dikemas kini!');
}

async function logNewService() {
    const odo = Math.round(baseOdometer + records.reduce((sum, r) => sum + (Number(r.distance) || 0), 0));
    const r = await uiForm({ title: 'Log Servis Baru', ok: 'Simpan', fields: [
        { id: 'item', label: 'Servis apa?', type: 'select', options: SERVICE_ITEMS.map(it => [it.k, it.n]) },
        { id: 'km', label: 'KM Servis', type: 'number', value: odo },
        { id: 'cost', label: 'Kos Servis (RM)', type: 'number', step: '0.01', value: '' }],
        validate: v => (parseFloat(v.km) > 0 ? '' : 'Masukkan KM yang sah.') });
    if (!r) return;
    serviceRecords.unshift({ id: Date.now(), date: localDateStr(), item: r.item, km: parseFloat(r.km), cost: parseFloat(r.cost) || 0 });
    if (r.item === 'oil') localStorage.setItem('stride_last_service_km', parseFloat(r.km));
    saveAndRefresh();
}

function getRemainingDays(dateStr) {
    if (!dateStr) return null;
    let today = new Date();
    today.setHours(0,0,0,0);
    let target = new Date(dateStr + 'T00:00:00');
    if (isNaN(target.getTime())) return null;
    let diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
}

function docBadge(label, days) {
    if (days === null) return '';
    const cls = days <= 14 ? 'text-rose-400' : days <= 30 ? 'text-amber-400' : 'text-cyan-400';
    return `<span class="${cls} font-semibold">${label}: ${days < 0 ? 'LUPUT ' + (-days) + ' hari lalu' : 'Baki ' + days + ' hari'}</span>`;
}

function updateDocumentStatusDisplay() {
    const box = document.getElementById('document-status-box');
    if (!box) return;
    const ins = getRemainingDays(localStorage.getItem('stride_insurans_expiry'));
    const road = getRemainingDays(localStorage.getItem('stride_roadtax_expiry'));
    const parts = [docBadge('Insurans', ins), docBadge('Roadtax', road)].filter(Boolean);
    if (!parts.length) {
        box.innerHTML = `Sila klik <strong>Tetapan Kenderaan & Dokumen</strong> di atas untuk tetapkan tarikh luput.`;
        return;
    }
    box.innerHTML = parts.join(' | ') + `<br><button type="button" onclick="downloadReminders()" class="mt-2 text-[11px] text-sky-300 bg-sky-950/50 px-2 py-1 rounded border border-sky-900/40">📅 Tambah peringatan ke kalendar (.ics)</button>`;
}

function downloadReminders() {
    const items = [['Insurans', localStorage.getItem('stride_insurans_expiry')], ['Roadtax', localStorage.getItem('stride_roadtax_expiry')]].filter(x => x[1]);
    if (!items.length) { alert('Tetapkan tarikh luput dahulu.'); return; }
    const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const alarm = (n, p, t) => ['BEGIN:VALARM', `TRIGGER:-P${p}D`, 'ACTION:DISPLAY', `DESCRIPTION:${n} luput dalam ${t} hari`, 'END:VALARM'];
    const events = items.map(([n, d]) => ['BEGIN:VEVENT', `UID:stride-${n}-${d}@stride`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d.replace(/-/g, '')}`, `SUMMARY:${n} kereta tamat tempoh`, ...alarm(n, 30, 30), ...alarm(n, 14, 14), 'END:VEVENT'].join('\r\n'));
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stride//MS//EN', ...events, 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'stride-peringatan.ics';
    document.body.appendChild(a); a.click(); a.remove();
}

function editRecord(id) {
    const rec = records.find(r => r.id === id);
    if (!rec) return;

    document.getElementById('record-date').value = rec.date || '';
    document.getElementById('income').value = rec.income || '';
    document.getElementById('trips').value = rec.trips || '';
    document.getElementById('distance').value = rec.distance || '';
    document.getElementById('hours').value = rec.hours || '';
    document.getElementById('odo-start').value = rec.odoStart || '';
    document.getElementById('odo-end').value = rec.odoEnd || '';
    document.getElementById('platform').value = rec.platform || '';
    document.getElementById('fuel').value = rec.fuel || '';
    document.getElementById('toll').value = rec.toll || '';
    document.getElementById('other-expenses').value = rec.otherExpenses || '';

    editingId = id;
    const submitBtn = document.querySelector('#tracker-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerText = "Kemaskini Rekod";
        submitBtn.className = "w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 rounded-xl transition shadow-lg text-sm";
    }
    window.scrollTo({ top: 400, behavior: 'smooth' });
}

async function deleteRecord(id) {
    if (await uiConfirm('Adakah anda pasti mahu memadam rekod ini?', 'Padam')) {
        records = records.filter(rec => rec.id !== id);
        idbOp('readwrite', s => s.delete(id)).catch(() => {});
        saveAndRefresh();
    }
}

async function clearAllRecords() {
    const ok = await uiForm({ title: 'Padam SEMUA rekod', note: 'Satu fail backup akan dimuat turun dahulu. Tindakan ini tidak boleh dibatalkan.', ok: 'Padam Semua', danger: true, fields: [{ id: 'c', label: 'Taip PADAM untuk sahkan', placeholder: 'PADAM' }], validate: v => (v.c.trim() === 'PADAM' ? '' : 'Taip PADAM dengan tepat.') });
    if (ok) {
        exportJSON();
        idbOp('readwrite', s => s.clear()).catch(() => {});
        records = [];
        saveAndRefresh();
    }
}

function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `stride_backup_${localDateStr()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importJSON() {
    const fileInput = document.getElementById('import-file');
    if (fileInput) fileInput.click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const rawData = JSON.parse(e.target.result);
            if (Array.isArray(rawData)) {
                records = rawData.filter(r => r && /^\d{4}-\d{2}-\d{2}$/.test(r.date)).map((r, i) => ({
                    id: Date.now() + i, date: r.date, income: Number(r.income) || 0, trips: Number(r.trips) || 0,
                    distance: Number(r.distance) || 0, hours: Number(r.hours) || 0, platform: String(r.platform || '').slice(0, 20),
                    fuel: Number(r.fuel) || 0, toll: Number(r.toll) || 0, otherExpenses: Number(r.otherExpenses) || 0,
                    totalExpenses: Number(r.totalExpenses) || 0, dayOff: !!r.dayOff
                }));
                saveAndRefresh();
                alert('Data berjaya diimport!');
            } else {
                alert('Format fail JSON tidak sah.');
            }
        } catch (err) {
            alert('Gagal membaca fail.');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

function exportExcel() {
    let csvContent = "data:text/csv;charset=utf-8,Tarikh,Pendapatan,Trip,Jarak(KM),Minyak,Tol,Lain-lain,Jumlah Kos,Jam Online,Platform,Cuti\n";
    records.forEach(r => {
        csvContent += `"${r.date || ''}",${r.income || 0},${r.trips || 0},${r.distance || 0},${r.fuel || 0},${r.toll || 0},${r.otherExpenses || 0},${r.totalExpenses || 0},${r.hours || 0},"${String(r.platform || '').replace(/"/g, '""')}",${r.dayOff ? 'Ya' : ''}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stride_report_${localDateStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
}
function saveDayOff() {
    const date = document.getElementById('record-date').value || localDateStr();
    records = records.filter(r => r.date !== date || Number(r.income) > 0 || Number(r.distance) > 0);
    records.unshift({ id: Date.now(), date, income: 0, trips: 0, distance: 0, hours: 0, platform: '', fuel: 0, toll: 0, otherExpenses: 0, totalExpenses: 0, dayOff: true });
    saveAndRefresh();
}

// ---------- Start/end odometer ----------
function calcDistance() {
    const a = parseFloat(document.getElementById('odo-start').value), b = parseFloat(document.getElementById('odo-end').value);
    if (a > 0 && b > a) document.getElementById('distance').value = (b - a).toFixed(1);
}

// ---------- Receipts (IndexedDB, compressed JPEG) ----------
function idb() {
    return new Promise((res, rej) => {
        const r = indexedDB.open('stride-receipts', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('r');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
}
async function idbOp(mode, fn) {
    const db = await idb();
    return new Promise((res, rej) => {
        const tx = db.transaction('r', mode);
        const req = fn(tx.objectStore('r'));
        tx.oncomplete = () => res(req && req.result);
        tx.onerror = () => rej(tx.error);
    });
}
function shrinkImage(file, max = 1000) {
    return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => {
            const k = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(img.src);
            c.toBlob(b => b ? res(b) : rej(new Error('gagal')), 'image/jpeg', 0.7);
        };
        img.onerror = rej;
        img.src = URL.createObjectURL(file);
    });
}
async function saveReceipt(id) {
    const f = document.getElementById('receipt-file').files[0];
    if (!f) return false;
    const blob = await shrinkImage(f);
    await idbOp('readwrite', s => s.put(blob, id));
    return true;
}
async function viewReceipt(id) {
    try {
        const blob = await idbOp('readonly', s => s.get(id));
        if (!blob) { alert('Resit tidak ditemui dalam peranti ini.'); return; }
        const url = URL.createObjectURL(blob);
        const ov = document.createElement('div');
        ov.className = 'fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50';
        ov.innerHTML = `<img src="${url}" class="max-h-full max-w-full rounded-xl">`;
        ov.onclick = () => { URL.revokeObjectURL(url); ov.remove(); };
        document.body.appendChild(ov);
    } catch (e) { alert('Gagal membuka resit.'); }
}

// ---------- Fuel fill-up log (full-tank method) ----------
async function addFuelFill() {
    const odo = Math.round(baseOdometer + records.reduce((sum, r) => sum + (Number(r.distance) || 0), 0));
    const r = await uiForm({ title: 'Isi Minyak', note: 'Isi tangki penuh supaya kiraan km/L tepat.', ok: 'Simpan', fields: [
        { id: 'l', label: 'Liter diisi', type: 'number', step: '0.01', placeholder: 'cth: 28.5' },
        { id: 'c', label: 'Jumlah bayaran (RM)', type: 'number', step: '0.01', placeholder: 'cth: 56.70' },
        { id: 'o', label: 'Bacaan odometer (KM)', type: 'number', value: odo }],
        validate: v => {
            const l = parseFloat(v.l);
            if (!(l > 0) || l > 120) return 'Liter nampak tidak betul (1 hingga 120 L). Pastikan bukan bacaan odometer.';
            if (!(parseFloat(v.c) >= 0)) return 'Masukkan jumlah bayaran.';
            if (!(parseFloat(v.o) > 0)) return 'Masukkan bacaan odometer.';
            return '';
        } });
    if (!r) return;
    fuelRecords.push({ id: Date.now(), date: localDateStr(), litres: parseFloat(r.l), cost: parseFloat(r.c), odo: parseFloat(r.o) });
    fuelRecords.sort((a, b) => a.odo - b.odo);
    saveAndRefresh();
}
async function deleteFuel(id) {
    if (await uiConfirm('Padam rekod isi minyak ini?', 'Padam')) { fuelRecords = fuelRecords.filter(f => f.id !== id); saveAndRefresh(); }
}
function renderFuel() {
    const sum = document.getElementById('fuel-summary'), list = document.getElementById('fuel-list');
    if (!sum || !list) return;
    const clean = fuelRecords.map(f => ({ id: Number(f.id), date: f.date, litres: Number(f.litres) || 0, cost: Number(f.cost) || 0, odo: Number(f.odo) || 0 }));
    const rows = clean.map((f, i) => {
        const km = i > 0 ? f.odo - clean[i - 1].odo : 0;
        return { ...f, km, kmpl: km > 0 && f.litres > 0 ? km / f.litres : null };
    });
    const ok = rows.filter(r => r.kmpl);
    const t = ok.reduce((a, r) => ({ km: a.km + r.km, l: a.l + r.litres, c: a.c + r.cost }), { km: 0, l: 0, c: 0 });
    sum.innerHTML = ok.length
        ? `Purata: <strong class="text-cyan-400">${(t.km / t.l).toFixed(1)} km/L</strong> | Kos: <strong class="text-amber-300">RM ${(t.c / t.km).toFixed(2)}/km</strong>`
        : 'Rekod sekurang-kurangnya 2 kali isi minyak (tangki penuh) untuk kira km/L.';
    list.innerHTML = rows.slice(-5).reverse().map(r => `<div class="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-[11px]"><span class="text-slate-300">${esc(r.date)} - ${r.litres.toFixed(1)} L - RM ${r.cost.toFixed(2)}</span><span class="flex items-center gap-2"><span class="text-cyan-400">${r.kmpl ? r.kmpl.toFixed(1) + ' km/L' : '-'}</span><button type="button" onclick="deleteFuel(${r.id})" class="text-rose-400">✕</button></span></div>`).join('');
}

// ---------- Yearly report ----------
async function exportYearly() {
    const yr = await uiForm({ title: 'Laporan Tahunan', ok: 'Muat Turun', fields: [{ id: 'y', label: 'Tahun', type: 'number', value: localDateStr().slice(0, 4) }], validate: v => (/^\d{4}$/.test(v.y.trim()) ? '' : 'Masukkan tahun 4 digit.') });
    if (!yr) return;
    const y = yr.y.trim();
    const MONTHS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogos','Sep','Okt','Nov','Dis'];
    const T = { inc: 0, fuel: 0, toll: 0, oth: 0, exp: 0, km: 0, days: 0, hrs: 0 };
    let csv = 'Bulan,Pendapatan Kasar,Minyak,Tol,Lain-lain,Jumlah Kos,Untung Bersih,KM,Hari Bekerja,Jam Online\n';
    MONTHS.forEach((m, i) => {
        const rs = records.filter(r => (r.date || '').startsWith(`${y}-${String(i + 1).padStart(2, '0')}`));
        const sum = f => rs.reduce((a, r) => a + (Number(r[f]) || 0), 0);
        const days = new Set(rs.filter(r => Number(r.income) > 0 || Number(r.distance) > 0).map(r => r.date)).size;
        const row = { inc: sum('income'), fuel: sum('fuel'), toll: sum('toll'), oth: sum('otherExpenses'), exp: sum('totalExpenses'), km: sum('distance'), days, hrs: sum('hours') };
        Object.keys(T).forEach(k => T[k] += row[k]);
        csv += `${m},${row.inc.toFixed(2)},${row.fuel.toFixed(2)},${row.toll.toFixed(2)},${row.oth.toFixed(2)},${row.exp.toFixed(2)},${(row.inc - row.exp).toFixed(2)},${row.km.toFixed(1)},${row.days},${row.hrs}\n`;
    });
    const svc = serviceRecords.filter(s => (s.date || '').startsWith(y)).reduce((a, s) => a + (Number(s.cost) || 0), 0);
    csv += `JUMLAH ${y},${T.inc.toFixed(2)},${T.fuel.toFixed(2)},${T.toll.toFixed(2)},${T.oth.toFixed(2)},${T.exp.toFixed(2)},${(T.inc - T.exp).toFixed(2)},${T.km.toFixed(1)},${T.days},${T.hrs}\n\n`;
    csv += `Kos servis kenderaan ${y},${svc.toFixed(2)}\nKos tetap tahunan (anggaran),${(fixedMonthly * 12).toFixed(2)}\nUntung selepas servis & kos tetap,${(T.inc - T.exp - svc - fixedMonthly * 12).toFixed(2)}\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `stride_laporan_${y}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
}
