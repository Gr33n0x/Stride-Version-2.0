// ==========================================
// GOOGLE DRIVE BACKUP & RESTORE - STRIDE PWA
// Data disimpan dalam appDataFolder (folder tersembunyi, hanya app ini boleh akses).
// ==========================================

const CLIENT_ID = '70199002080-3lo68amnmeakb7p7l66ptr40jk7qklb0.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';
const BACKUP_NAME = 'stride_backup.json';
const EXCLUDED_KEYS = ['stride_drive_last_backup'];

let accessToken = null;
let tokenExpiry = 0;

function setDriveStatus(msg, isError = false) {
  const el = document.getElementById('drive-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'text-[10px] text-center ' + (isError ? 'text-rose-400' : 'text-slate-400');
}

// Mesti dipanggil terus dari klik butang supaya popup log masuk tidak disekat browser.
function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (accessToken && Date.now() < tokenExpiry) return resolve(accessToken);
    if (!navigator.onLine) return reject(new Error('Tiada sambungan internet.'));
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      return reject(new Error('Google API belum dimuatkan. Semak internet dan muat semula halaman.'));
    }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          return reject(new Error(resp.error_description || resp.error || 'Log masuk Google gagal.'));
        }
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (Number(resp.expires_in) - 60) * 1000;
        resolve(accessToken);
      },
      error_callback: (err) => {
        reject(new Error(err && err.type === 'popup_closed' ? 'Tetingkap log masuk ditutup.' : 'Log masuk Google gagal.'));
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

async function driveFetch(url, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) accessToken = null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive API ${res.status}: ${text.slice(0, 150)}`);
  }
  return res;
}

async function findBackupFile() {
  const q = encodeURIComponent(`name='${BACKUP_NAME}' and trashed=false`);
  const url =
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}` +
    `&orderBy=modifiedTime%20desc&pageSize=1&fields=files(id,modifiedTime)`;
  const res = await driveFetch(url);
  const data = await res.json();
  return data.files && data.files.length ? data.files[0] : null;
}

function collectStrideData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('stride_') && !EXCLUDED_KEYS.includes(key)) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

function formatDriveTime(iso) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '-' : d.toLocaleString('ms-MY');
}

// ---------- BACKUP ----------
async function backupToDrive() {
  try {
    setDriveStatus('Menyambung ke Google Drive...');
    const existing = await findBackupFile();

    const payload = {
      app: 'stride',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: collectStrideData(),
    };

    // Fail baru perlu parents; kemas kini fail sedia ada tidak boleh ada parents.
    const metadata = existing
      ? { name: BACKUP_NAME }
      : { name: BACKUP_NAME, parents: ['appDataFolder'] };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

    const base = 'https://www.googleapis.com/upload/drive/v3/files';
    const url = existing
      ? `${base}/${existing.id}?uploadType=multipart&fields=id,modifiedTime`
      : `${base}?uploadType=multipart&fields=id,modifiedTime`;

    const res = await driveFetch(url, { method: existing ? 'PATCH' : 'POST', body: form });
    const result = await res.json();

    localStorage.setItem('stride_drive_last_backup', result.modifiedTime || new Date().toISOString());
    setDriveStatus(`Backup berjaya: ${formatDriveTime(result.modifiedTime)}`);
    const reminder = document.getElementById('backup-reminder');
    if (reminder) reminder.classList.add('hidden');
  } catch (err) {
    console.error('Ralat backup:', err);
    setDriveStatus(`Backup gagal: ${err.message}`, true);
  }
}

// ---------- RESTORE ----------
async function restoreFromDrive() {
  try {
    setDriveStatus('Mencari backup di Google Drive...');
    const file = await findBackupFile();
    if (!file) {
      setDriveStatus('Tiada backup ditemui di Google Drive.', true);
      return;
    }

    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
    const payload = await res.json();

    if (!payload || payload.app !== 'stride' || typeof payload.data !== 'object' || payload.data === null) {
      throw new Error('Format backup tidak sah.');
    }
    const keys = Object.keys(payload.data).filter((k) => k.startsWith('stride_'));

    // Pastikan rekod boleh dibaca sebelum menggantikan apa-apa data
    ['stride_records', 'stride_service_records'].forEach((k) => {
      if (k in payload.data && !Array.isArray(JSON.parse(payload.data[k]))) {
        throw new Error(`Data ${k} dalam backup rosak.`);
      }
    });

    const when = formatDriveTime(file.modifiedTime);
    if (!(await uiConfirm(`Restore backup bertarikh ${when}?\n\nSemua data semasa dalam peranti ini akan DIGANTIKAN.`, 'Restore'))) {
      setDriveStatus('Restore dibatalkan.');
      return;
    }

    // Buang data Stride semasa, kemudian tulis data backup
    const existingKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('stride_') && !EXCLUDED_KEYS.includes(k)) existingKeys.push(k);
    }
    existingKeys.forEach((k) => localStorage.removeItem(k));
    keys.forEach((k) => localStorage.setItem(k, String(payload.data[k])));

    uiToast('Restore berjaya. Aplikasi akan dimuat semula.');
    setTimeout(() => location.reload(), 1200);
  } catch (err) {
    console.error('Ralat restore:', err);
    setDriveStatus(`Restore gagal: ${err.message}`, true);
  }
}
