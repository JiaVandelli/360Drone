/* ═══════════════════════════════════════════════
   360DRONE – Compilatore ATM  |  app.js
   ═══════════════════════════════════════════════ */

// ── COSTANTI 360DRONE ────────────────────────────
const FISSI = {
  tel:  '+39 388 7989630',
  pec:  '360drone@pec.it',
  cc1:  'protocollo@pec.enac.gov.it',
  cc2:  'mobilita.innovativa@enac.gov.it',
  cf:   '97158180584',
};

// PEC destinatario in base alla zona selezionata
const ENTI = {
  'LI P244 – Roma Edifici Istituzionali': 'protocollo.prefrm@pec.interno.it',
  'LI P186 – Carceri Roma':               'protocollo.prefrm@pec.interno.it',
  'LI R – Zona Militare':                 'coa@postacert.aeronautica.difesa.it',
  'CTR Aeroporto Roma Fiumicino':         'torre.fiumicino@enav.it',
  'CTR Aeroporto Roma Ciampino':          'torre.ciampino@enav.it',
};

// Campi da salvare in localStorage
const SAVE_FIELDS = [
  'richiedente','attestato','scopo','localita',
  'lat','lon','dataInizio','dataFine',
  'oraInizio','oraFine','zona','raggio',
  'quota','drone','distAeroporto','fuso',
];

// Stato condiviso
let utcInizioText = '–';
let utcFineText   = '–';
let dmsText       = '';


// ── NAVIGAZIONE ──────────────────────────────────
const PANELS = ['p-dati', 'p-anteprima', 'p-09a', 'p-riepilogo'];
const TABS   = ['tab-dati', 'tab-anteprima', 'tab-09a', 'tab-riepilogo'];

function goPanel(id) {
  PANELS.forEach(p => document.getElementById(p).classList.remove('active'));
  TABS.forEach(t   => document.getElementById(t).classList.remove('active'));

  document.getElementById(id).classList.add('active');
  const idx = PANELS.indexOf(id);
  if (idx >= 0) document.getElementById(TABS[idx]).classList.add('active');

  window.scrollTo(0, 0);

  // Costruzione lazy dei pannelli
  if (id === 'p-anteprima') buildPreview();
  if (id === 'p-09a')       buildATM09();
  if (id === 'p-riepilogo') buildRiepilogo();
}


// ── HELPER LETTURA CAMPI ─────────────────────────
function g(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function getZona()  { return g('zona')  === 'custom-zona'  ? g('zona-custom')  : g('zona'); }
function getDrone() { return g('drone') === 'custom-drone' ? g('drone-custom') : g('drone'); }
function getScopo() { return g('scopo') === 'custom'       ? g('scopo-custom') : g('scopo'); }
function getDestA() {
  const zona = getZona();
  return ENTI[zona] || '— verifica AIP ENR 5.1 —';
}


// ── UTC ──────────────────────────────────────────
function updateUTC() {
  utcInizioText = calcUTC(g('dataInizio'), g('oraInizio'));
  utcFineText   = calcUTC(g('dataFine'),   g('oraFine'));

  document.getElementById('utcInizio').textContent = utcInizioText !== '–' ? utcInizioText : 'UTC: –';
  document.getElementById('utcFine').textContent   = utcFineText   !== '–' ? utcFineText   : 'UTC: –';
}

function calcUTC(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '–';
  const tz = parseInt(g('fuso')) || 1;
  const d  = new Date(`${dateStr}T${timeStr}`);
  if (isNaN(d)) return '–';
  const utc = new Date(d.getTime() - tz * 3600000);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(utc.getUTCDate())}/${pad(utc.getUTCMonth()+1)}/${utc.getUTCFullYear()} ${pad(utc.getUTCHours())}:${pad(utc.getUTCMinutes())} UTC`;
}


// ── COORDINATE DMS ───────────────────────────────
function toDMS(dec, isLat) {
  const abs = Math.abs(dec);
  let deg   = Math.floor(abs);
  let minF  = (abs - deg) * 60;
  let min   = Math.floor(minF);
  let sec   = Math.round((minF - min) * 60);
  if (sec === 60) { sec = 0; min++; }
  if (min === 60) { min = 0; deg++; }
  const dir = isLat ? (dec >= 0 ? 'N' : 'S') : (dec >= 0 ? 'E' : 'W');
  return `${dir} ${deg}°${String(min).padStart(2,'0')}'${String(sec).padStart(2,'0')}"`;
}

function convertDMS() {
  const lat = parseFloat(g('lat'));
  const lon = parseFloat(g('lon'));
  if (isNaN(lat) || isNaN(lon)) { showToast('⚠ Inserisci latitudine e longitudine'); return; }
  dmsText = `Lat ${toDMS(lat, true)} – Lon ${toDMS(lon, false)}`;
  const box = document.getElementById('dmsBox');
  box.textContent = dmsText;
  box.style.display = 'block';
  showToast('✓ Coordinate convertite');
}

// Calcola DMS silenziosamente se non già fatto
function ensureDMS() {
  if (dmsText) return;
  const lat = parseFloat(g('lat'));
  const lon = parseFloat(g('lon'));
  if (!isNaN(lat) && !isNaN(lon)) {
    dmsText = `Lat ${toDMS(lat, true)} – Lon ${toDMS(lon, false)}`;
  }
}


// ── ENTE DESTINATARIO ────────────────────────────
function updateDestA() {
  const isCustom = g('zona') === 'custom-zona';
  document.getElementById('zona-custom-wrap').style.display = isCustom ? 'block' : 'none';

  const dest = ENTI[getZona()] || '– verifica AIP ENR 5.1 –';
  document.getElementById('dest-a-display').textContent = dest;
}


// ── ANTEPRIMA ATM-05B ────────────────────────────
function buildPreview() {
  ensureDMS();
  const zona    = getZona();
  const drone   = getDrone();
  const scopo   = getScopo();
  const destA   = ENTI[zona] || '— verifica AIP ENR 5.1 —';
  const coord   = dmsText ? `${g('localita')} – ${dmsText}` : (g('localita') || '–');
  const quota   = g('quota') || '–';
  const quotaFt = quota !== '–' ? Math.round(parseInt(quota) * 3.28084) : '–';
  const orario  = buildOrario();
  const altreNote = buildAltreNote();

  document.getElementById('mod-preview').innerHTML = `
    <div class="mod-header">
      <div class="mod-logo">ENAC</div>
      <div class="mod-title">
        <div class="big">MODELLO ATM-05</div>
        <div class="small">(All. "A" Circ. ATM-05)</div>
        <div class="small">C.F.: ${FISSI.cf}</div>
      </div>
      <div class="mod-bollo">
        Bollo assolto in modo virtuale<br>
        (aut. Direz. Reg. entrate Lazio N. 135047/98 del 30/11/1998)<br><br>
        Dati fattura BD3 · prot. N. 59172
      </div>
    </div>
    ${modRow('A <sup>(2)</sup>:', `<span class="blue">${destA}</span>`)}
    ${modRow('Cc <sup>(2)</sup>:', `<span class="blue">${FISSI.cc1} ; ${FISSI.cc2}</span>`)}
    ${modRow('Il richiedente <sup>(3)</sup>:', `${g('richiedente')||'–'} – Attestato: ${g('attestato')||'–'}`)}
    ${modRow2('Tel/Mob.:', FISSI.tel, 'E-mail/Pec:', FISSI.pec)}
    <div class="mod-row">
      <div class="mod-section-label">Evento/attività</div>
      <div class="mod-group">
        ${subRow('Tipo di attività <sup>(4)</sup>:', scopo || '–')}
        ${subRow('Tipo aeromobile <sup>(5)</sup>:', drone || '–')}
        ${subRow('Loc. decollo e coordinate <sup>(5)</sup>:', coord)}
        ${subRow('Loc. atterraggio e coordinate <sup>(5)</sup>:', coord + ' (stessa area)')}
        ${subRow("Loc. dove si svolge l'attività:", g('localita') || '–')}
      </div>
    </div>
    <div class="mod-row">
      <div class="mod-section-label">Elementi identificativi dello spazio aereo</div>
      <div class="mod-group">
        ${subRow('Zona R, P o D interessata <sup>(6)</sup>:', zona || '–')}
        ${subRow('Limiti laterali <sup>(6)</sup>:', `Raggio ${g('raggio')||'–'} m con centro nel punto di coordinate geografiche`)}
        ${subRow('Limiti verticali <sup>(7)</sup>:', `inferiore GND / superiore ${quota} m AGL (${quotaFt} ft)`)}
        ${subRow('Ubicazione rispetto al capoluogo:', g('localita') || '–')}
        ${subRow("Distanza dall'ARP/coord. aeroporto:", g('distAeroporto') || '–')}
        ${subRow('Data e orario attività <sup>(8)</sup>:', orario)}
        ${subRow('Altre notizie utili <sup>(9)</sup>:', altreNote)}
      </div>
    </div>
    <div class="mod-row">
      <div class="mod-section-label">Valutazione ATS</div>
      <div class="mod-group">
        ${subRow('Fornitore SNA civile:', '')}
        ${subRow('Fornitore SNA militare:', '')}
      </div>
    </div>
    <div style="padding:10px 14px; font-style:italic; font-size:9px; border-top:1px solid #ccc; font-family:Arial,sans-serif; color:#444; line-height:1.4;">
      Imposta di bollo assolta in modo virtuale ex art. 15 D.P.R. n. 642/1972 su autorizzazione dell'Agenzia delle Entrate prot. N. 59172 del 28/09/2023
    </div>
    <div style="display:flex; justify-content:space-between; padding:12px 14px 14px; font-family:Arial,sans-serif; font-size:10px; border-top:1px solid #ccc;">
      <span>Luogo e data Roma, ${new Date().toLocaleDateString('it-IT')}</span>
      <span>Firma operatore APR____________________________</span>
    </div>
  `;
}

// Helper righe modulo
function modRow(label, value) {
  return `<div class="mod-row">
    <div class="mod-label">${label}</div>
    <div class="mod-value">${value}</div>
  </div>`;
}
function modRow2(l1, v1, l2, v2) {
  return `<div class="mod-row">
    <div class="mod-label">${l1}</div>
    <div class="mod-value" style="border-right:1px solid #ccc;">${v1}</div>
    <div class="mod-label">${l2}</div>
    <div class="mod-value">${v2}</div>
  </div>`;
}
function subRow(label, value) {
  return `<div style="border-bottom:1px solid #e8e8e8; display:flex; align-items:stretch;">
    <div class="mod-label" style="font-size:8px;">${label}</div>
    <div class="mod-value" style="font-size:9.5px;">${value}</div>
  </div>`;
}

function buildOrario() {
  return (utcInizioText !== '–' && utcFineText !== '–')
    ? `Dal ${utcInizioText} al ${utcFineText}`
    : `${g('dataInizio')||'–'} ore ${g('oraInizio')||'–'}–${g('oraFine')||'–'} (locale)`;
}

function buildAltreNote() {
  return `Il sorvolo sarà sempre svolto secondo i parametri della categoria Open (Reg. EU 2019/947, art. 3 e 4). ` +
    `I droni sono dotati di: RTH (return to home), geofencing, classe C0 (Reg. EU 2019/947 e Reg. EU 2019/945). ` +
    `Sarà sempre presente un osservatore per garantire la sicurezza del volo. Il sorvolo durerà il tempo strettamente ` +
    `necessario all'ottenimento delle riprese, sarà sempre condotto in VLOS. Non verranno sorvolati edifici particolari ` +
    `quali: caserme, ospedali, edifici istituzionali ecc... Pilota contattabile al ${FISSI.tel}. ` +
    `Attività interrompibile su richiesta autorità competente.`;
}


// ── PDF ATM-05B ──────────────────────────────────
function generaPDF() {
  if (typeof window.jspdf === 'undefined') { showToast('⚠ Libreria PDF non caricata'); return; }
  ensureDMS();
  const { jsPDF } = window.jspdf;
  const doc     = new jsPDF({ unit: 'mm', format: 'a4' });
  const zona    = getZona();
  const drone   = getDrone();
  const scopo   = getScopo();
  const destA   = ENTI[zona] || '— verifica AIP ENR 5.1 —';
  const coord   = dmsText ? `${g('localita')} – ${dmsText}` : (g('localita') || '–');
  const quota   = g('quota') || '–';
  const quotaFt = quota !== '–' ? Math.round(parseInt(quota) * 3.28084) : '–';
  const orario  = buildOrario();
  const ccFull  = `${FISSI.cc1}; ${FISSI.cc2}`;
  const altreNote = `Il sorvolo sarà svolto in categoria Open (Reg. EU 2019/947). RTH, geofencing, classe C0. ` +
    `Osservatore sempre presente. Sorvolo in VLOS. Pilota al ${FISSI.tel}. Interrompibile su richiesta autorità.`;

  // Intestazione
  doc.setFont('helvetica', 'bold');   doc.setFontSize(16); doc.text('ENAC', 15, 18);
  doc.setFontSize(14); doc.text('MODELLO ATM-05', 195, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`(All. "A" Circ. ATM-05) – C.F.: ${FISSI.cf}`, 195, 24, { align: 'right' });
  doc.text('Bollo assolto in modo virtuale (aut. Direz. Reg. Lazio N.135047/98 del 30/11/1998)', 195, 28, { align: 'right' });

  // Righe
  let y = 34;
  const addRow = (label, val, h = 11) => {
    doc.setDrawColor(180); doc.rect(15, y, 180, h);
    doc.setFont('helvetica', 'bold');   doc.setFontSize(8);  doc.text(label, 17, y + 4.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(doc.splitTextToSize(val || '–', 174), 17, y + 9);
    y += h;
  };

  addRow('A:',                                  destA, 12);
  addRow('Cc:',                                 ccFull, 12);
  addRow('Il richiedente:',                     `${g('richiedente')||'–'} – Attestato: ${g('attestato')||'–'}`, 11);
  addRow('Tel/Mob. / E-mail/Pec:',              `${FISSI.tel} / ${FISSI.pec}`, 11);
  addRow('Tipo di attività:',                   scopo || '–', 11);
  addRow('Tipo aeromobile:',                    drone || '–', 11);
  addRow('Loc. decollo e coordinate (DMS):',    coord, 13);
  addRow('Loc. atterraggio:',                   coord + ' (stessa area)', 13);
  addRow("Loc. dove si svolge l'attività:",     g('localita') || '–', 11);
  addRow('Zona R, P o D interessata:',          zona || '–', 11);
  addRow('Limiti laterali:',                    `Raggio ${g('raggio')||'–'} m dal punto di decollo`, 11);
  addRow('Limiti verticali:',                   `SFC/GND – ${quota} m AGL (${quotaFt} ft)`, 11);
  addRow('Ubicazione rispetto al capoluogo:',   g('localita') || '–', 11);
  addRow("Distanza dall'ARP / aeroporto:",      g('distAeroporto') || '–', 11);
  addRow('Data e orario (UTC):',                orario, 13);
  addRow('Altre notizie utili:',                altreNote, 30);

  // Firma
  const oggi = new Date().toLocaleDateString('it-IT');
  doc.setFontSize(10);
  doc.text(`Luogo e data: Roma, ${oggi}`, 15, y + 10);
  doc.text('Firma operatore APR', 15, y + 22);
  doc.setDrawColor(0); doc.line(15, y + 20, 90, y + 20);
  doc.setFont('helvetica', 'italic');
  doc.text(g('richiedente') || '', 17, y + 27);

  const fname = `ATM-05B_${(zona||'zona').replace(/[^a-z0-9]/gi, '_')}_${g('dataInizio')||'data'}.pdf`;
  doc.save(fname);
  showToast('✓ PDF generato: ' + fname);
}


// ── ATM-09A ──────────────────────────────────────
function buildATM09() {
  ensureDMS();
  const zona  = getZona();
  const drone = getDrone();

  const txt =
`MODELLO ATM-09A – NOTIFICA OPERAZIONI APR
Categoria OPEN – Sottocategoria A1/A3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A:  Torre di Controllo / Gestore aeroporto
Cc: ${FISSI.cc1}
    ${FISSI.cc2}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Il sottoscritto ${g('richiedente')||'–'}, in qualità di operatore APR
attestato n. ${g('attestato')||'–'}, NOTIFICA la seguente operazione:

LOCALITÀ:       ${g('localita')||'–'}
COORDINATE:     ${dmsText||'–'}
ZONA:           ${zona||'–'}
DATA/ORA UTC:   Dal ${utcInizioText} al ${utcFineText}
QUOTA MAX:      ${g('quota')||'–'} m AGL
RAGGIO:         ${g('raggio')||'–'} m
AEROMOBILE:     ${drone||'–'}
SCOPO:          ${getScopo()||'–'}

MISURE DI SICUREZZA:
• Categoria OPEN – VLOS con osservatore dedicato
• RTH e geofencing attivi
• Classe C0 – Reg. EU 2019/947 / 2019/945
• Disponibilità a interruzione immediata su richiesta ATS

CONTATTO H24:   ${FISSI.tel}
PEC OPERATORE:  ${FISSI.pec}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Firma: ${g('richiedente')||'–'}`;

  document.getElementById('atm09-preview').textContent = txt;
}

function copyATM09() {
  const txt = document.getElementById('atm09-preview').textContent;
  navigator.clipboard.writeText(txt).then(() => showToast('✓ ATM-09A copiato'));
}


// ── RIEPILOGO PEC ────────────────────────────────
function buildRiepilogo() {
  ensureDMS();
  const zona  = getZona();
  const destA = ENTI[zona] || '— verifica AIP ENR 5.1 —';
  const ogg   = `Istanza Nulla Osta ATM-05B – ${zona||'[zona]'} – ${utcInizioText} – ${g('richiedente')||'[Operatore]'}`;

  document.getElementById('ogg-pec').textContent   = ogg;
  document.getElementById('r-desta').textContent   = destA;
  document.getElementById('r-rich').textContent    = g('richiedente') || '–';
  document.getElementById('r-att').textContent     = g('attestato')   || '–';
  document.getElementById('r-scopo').textContent   = getScopo()       || '–';
  document.getElementById('r-loc').textContent     = g('localita')    || '–';
  document.getElementById('r-zona').textContent    = zona             || '–';
  document.getElementById('r-coord').textContent   = dmsText          || '–';
  document.getElementById('r-utc').textContent     = `Dal ${utcInizioText} al ${utcFineText}`;
  document.getElementById('r-quota').textContent   = (g('quota')  || '–') + ' m AGL';
  document.getElementById('r-raggio').textContent  = (g('raggio') || '–') + ' m';
  document.getElementById('r-drone').textContent   = getDrone()       || '–';
}

function copyOgg() {
  const txt = document.getElementById('ogg-pec').textContent;
  navigator.clipboard.writeText(txt).then(() => showToast('✓ Oggetto copiato'));
}

function copyTuttoPEC() {
  const zona  = getZona();
  const destA = ENTI[zona] || '— verifica AIP ENR 5.1 —';
  const txt =
`OGGETTO: ${document.getElementById('ogg-pec').textContent}

A: ${destA}
CC: ${FISSI.cc1}; ${FISSI.cc2}; ${FISSI.pec}

DATI PRATICA:
Richiedente:   ${g('richiedente')||'–'}
Attestato:     ${g('attestato')||'–'}
Attività:      ${getScopo()||'–'}
Località:      ${g('localita')||'–'}
Zona:          ${zona||'–'}
Coordinate:    ${dmsText||'–'}
Orario UTC:    Dal ${utcInizioText} al ${utcFineText}
Quota max:     ${g('quota')||'–'} m AGL
Raggio:        ${g('raggio')||'–'} m
Drone:         ${getDrone()||'–'}
Tel:           ${FISSI.tel}
PEC:           ${FISSI.pec}`;

  navigator.clipboard.writeText(txt).then(() => showToast('✓ Riepilogo copiato'));
}


// ── PERSISTENZA ──────────────────────────────────
function saveAll() {
  const data = {};
  SAVE_FIELDS.forEach(f => {
    const el = document.getElementById(f);
    if (el) data[f] = el.value;
  });
  data.dms = dmsText;
  try { localStorage.setItem('360drone_atm2', JSON.stringify(data)); } catch (e) {}
}

function loadAll() {
  try {
    const raw = localStorage.getItem('360drone_atm2');
    if (!raw) return;
    const data = JSON.parse(raw);
    SAVE_FIELDS.forEach(f => {
      const el = document.getElementById(f);
      if (el && data[f] !== undefined) el.value = data[f];
    });
    if (data.dms) {
      dmsText = data.dms;
      const box = document.getElementById('dmsBox');
      box.textContent = data.dms;
      box.style.display = 'block';
    }
  } catch (e) {}
}


// ── TOAST ────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}


// ── SELECT CON CAMPO CUSTOM ──────────────────────
document.getElementById('scopo').addEventListener('change', function () {
  document.getElementById('scopo-custom-wrap').style.display =
    this.value === 'custom' ? 'block' : 'none';
});
document.getElementById('zona').addEventListener('change', function () {
  document.getElementById('zona-custom-wrap').style.display =
    this.value === 'custom-zona' ? 'block' : 'none';
  updateDestA();
});
document.getElementById('drone').addEventListener('change', function () {
  document.getElementById('drone-custom-wrap').style.display =
    this.value === 'custom-drone' ? 'block' : 'none';
});


// ── AUTO-SAVE SU OGNI INPUT ──────────────────────
document.querySelectorAll('input, select, textarea').forEach(el => {
  el.addEventListener('input',  saveAll);
  el.addEventListener('change', saveAll);
});


// ── INIT ─────────────────────────────────────────
(function init() {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('dataInizio').value = today;
  document.getElementById('dataFine').value   = today;
  document.getElementById('oraInizio').value  = '09:00';
  document.getElementById('oraFine').value    = '12:00';

  loadAll();
  updateUTC();
  updateDestA();
})();
