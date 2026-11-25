/**
 * pdf_report_generator.js
 * Generator Dokumen Laporan Praktikum PDF Multi-Halaman (100% Offline, A4 Portrait)
 *
 * Halaman 1 : Portrait (A4) - Gambar Skematik CAD (Latar Putih, Penomoran Pin IEC/DIN)
 *             + Etiket Identitas Siswa & Kotak Nilai/Paraf Guru di Bagian Bawah
 * Halaman 2+: Portrait (A4) - Tabel Bill of Materials (BOM) Bebas Overflow & Identik Android
 *
 * Standar: Vokasi SMK Teknik Elektro (TITL/IML) & Otomotif (TKR/TSM)
 */

(function (window) {
  'use strict';

  // =========================================================================
  // 1. FILTER KOMPONEN NON-BOM & DETEKSI SISTEM TEGANGAN (AC / DC)
  // =========================================================================
  function isNonBomElement(svgData) {
    if (!svgData) return true;
    const s = String(svgData).toLowerCase();
    if (s === 'text') return true;
    if (s.startsWith('junction') || s.startsWith('connection')) return true;
    return false;
  }

  function detectSystemType(elements) {
    let has3Ph = false;
    let has1Ph = false;
    let hasDc = false;
    for (const el of (elements || [])) {
      const s = String(el.svgData || '').toLowerCase();
      if (
        s === 'sourcel1l2l3' || s === 'sourcel1l2l3n' || s === 'generator3ph' ||
        s === 'motor3ph' || s === 'motorstardelta' || s === 'motordhalander' ||
        s === 'motortwospeeds' || s === 'phasefailure'
      ) {
        has3Ph = true;
      } else if (s === 'sourcel1' || s === 'sourcel2' || s === 'sourcel3' || s === 'sourcen' || s === 'motor1ph') {
        has1Ph = true;
      } else if (
        s === 'battery' || s === 'sourceplus' || s === 'sourcenegative' ||
        s === 'powersupply' || s === 'powersupply2' || s === 'motordc' || s === 'flasher'
      ) {
        hasDc = true;
      }
    }
    if (hasDc && !has3Ph && !has1Ph) return { mode: 'DC', label: '12V DC', controlLabel: '12V DC' };
    if (has3Ph) return { mode: 'AC3', label: '380V AC (3 Fasa)', controlLabel: '220V AC' };
    if (has1Ph) return { mode: 'AC1', label: '220V AC', controlLabel: '220V AC' };
    return { mode: 'GENERIC', label: 'Standar IEC', controlLabel: 'Standar IEC' };
  }

  function formatLampColorId(rawColor) {
    const c = String(rawColor || 'yellow').trim().toLowerCase();
    switch (c) {
      case 'green': return 'Hijau';
      case 'red': return 'Merah';
      case 'blue': return 'Biru';
      case 'white': return 'Putih';
      case 'orange': return 'Oranye';
      case 'yellow':
      default: return 'Kuning';
    }
  }

  // =========================================================================
  // 2. KAMUS PENAMAAN & SPESIFIKASI KOMPONEN STANDAR VOKASI (100% AKURAT)
  // =========================================================================
  function getVocationalComponentName(svgData, fallback) {
    if (!svgData) return fallback || 'Komponen';
    const raw = String(svgData);
    const s = raw.toLowerCase();

    // Sumber Daya (Sources)
    if (s === 'battery') return 'Baterai / Akumulator 12V DC';
    if (s === 'sourceplus') return 'Terminal Sumber Positif (+)';
    if (s === 'sourcenegative') return 'Terminal Massa / Negatif (-)';
    if (s === 'sourcel1') return 'Sumber Fasa L1 (AC)';
    if (s === 'sourcel2') return 'Sumber Fasa L2 (AC)';
    if (s === 'sourcel3') return 'Sumber Fasa L3 (AC)';
    if (s === 'sourcen') return 'Terminal Netral (N)';
    if (s === 'sourcel1l2l3') return 'Sumber 3 Fasa (L1-L2-L3)';
    if (s === 'sourcel1l2l3n') return 'Sumber 3 Fasa + Netral (3P+N)';
    if (s === 'sourcepe' || s === 'sourcegnd') return 'Terminal Pembumian (PE / Ground)';
    if (s === 'powersupply' || s === 'powersupply2') return 'Catu Daya DC (Power Supply)';
    if (s === 'generator3ph') return 'Generator 3 Fasa AC';

    // Proteksi (Protections)
    if (s === 'breaker1p') return 'MCB 1 Kutub (1P)';
    if (s === 'breaker2p') return 'MCB 2 Kutub (2P)';
    if (s === 'breaker3p') return 'MCB 3 Kutub (3P)';
    if (s === 'breaker4p') return 'MCB 4 Kutub (4P)';
    if (s === 'breaker' || s === 'motorbreaker3p') return 'Motor Circuit Breaker 3P (MPCB)';
    if (s === 'motorbreaker1p') return 'Motor Circuit Breaker 1P (MPCB)';
    if (s === 'motorbreaker2p') return 'Motor Circuit Breaker 2P (MPCB)';
    if (s === 'motorbreaker4p') return 'Motor Circuit Breaker 4P (MPCB)';
    if (s.startsWith('tmbreaker')) return `MCB Thermal-Magnetik ${raw.slice(-2).toUpperCase()}`;
    if (s.startsWith('rcbobreaker')) return `RCBO (ELCB + MCB) ${raw.slice(-2).toUpperCase()}`;
    if (s.startsWith('rccbbreaker')) return `RCCB / ELCB ${raw.slice(-2).toUpperCase()}`;
    if (s === 'fuse1p') return 'Sekring Pengaman 1P (Fuse)';
    if (s === 'fuse2p') return 'Sekring Pengaman 2P (Fuse)';
    if (s === 'fuse3p') return 'Sekring Pengaman 3P (Fuse)';
    if (s === 'fuse4p') return 'Sekring Pengaman 4P (Fuse)';
    if (s.startsWith('fuseswitch')) return 'Saklar Sekring (Fuse Switch)';
    if (s.startsWith('isolator')) return `Saklar Pemisah (Isolator ${raw.slice(-2).toUpperCase()})`;
    if (s === 'overload1p' || s === 'overload2p' || s === 'overload3p') return 'Thermal Overload Relay (TOR)';
    if (s === 'phasefailure') return 'Phase Failure Relay (PFR)';

    // Koil & Timer (Coils)
    if (s === 'coil') return 'Koil Kontaktor / Relay';
    if (s === 'coildelayon') return 'Timer On-Delay Relay (TON)';
    if (s === 'coildelayoff') return 'Timer Off-Delay Relay (TOF)';
    if (s === 'coildelayonoff') return 'Timer On-Off Delay Relay';
    if (s === 'coilflasher' || s === 'flasher') return 'Unit Flasher Elektronik (Kedip)';
    if (s === 'coillatch') return 'Impulse / Latching Relay';
    if (s === 'coilsolenoid') return 'Koil Solenoid Elektromagnetik';

    // Kontaktor Daya (Contactors)
    if (s === 'contactor1p') return 'Kontaktor Daya Utama NO (1P)';
    if (s === 'contactor2p') return 'Kontaktor Daya Utama NO (2P)';
    if (s === 'contactor3p') return 'Kontaktor Daya Utama NO (3P)';
    if (s === 'contactor4p') return 'Kontaktor Daya Utama NO (4P)';
    if (s === 'contactornc1p') return 'Kontaktor Daya Utama NC (1P)';
    if (s === 'contactornc2p') return 'Kontaktor Daya Utama NC (2P)';
    if (s === 'contactornc3p') return 'Kontaktor Daya Utama NC (3P)';
    if (s === 'contactornc4p') return 'Kontaktor Daya Utama NC (4P)';

    // Kontak Bantu & Kontak Timer (Auxiliaries)
    if (s === 'contactno') return 'Kontak Bantu NO';
    if (s === 'contactnc') return 'Kontak Bantu NC';
    if (s === 'contactcon') return 'Kontak Tukar (Changeover SPDT)';
    if (s === 'contactnonc') return 'Kontak Bantu Ganda (NO + NC)';
    if (s === 'contactnodelayon') return 'Kontak Timer NO (On-Delay)';
    if (s === 'contactncdelayon') return 'Kontak Timer NC (On-Delay)';
    if (s === 'contactcondelayon') return 'Kontak Timer Tukar (On-Delay)';
    if (s === 'contactnoncdelayon') return 'Kontak Timer Ganda (On-Delay)';
    if (s === 'contactnodelayoff') return 'Kontak Timer NO (Off-Delay)';
    if (s === 'contactncdelayoff') return 'Kontak Timer NC (Off-Delay)';
    if (s === 'contactcondelayoff') return 'Kontak Timer Tukar (Off-Delay)';
    if (s === 'contactnoncdelayoff') return 'Kontak Timer Ganda (Off-Delay)';

    // Tombol Tekan & Saklar (Switches)
    if (s === 'buttonno') return 'Tombol Tekan NO (Push Button)';
    if (s === 'buttonnc') return 'Tombol Tekan NC (Push Button)';
    if (s === 'buttoncon') return 'Tombol Tekan Tukar (PB SPDT)';
    if (s === 'buttonnonc') return 'Tombol Tekan Ganda (PB NO+NC)';
    if (s === 'buttoncrossover') return 'Tombol Tekan Silang (Crossover)';
    if (s.startsWith('emergency')) return 'Tombol Darurat (Emergency Stop)';
    if (s === 'switchno') return 'Saklar Tunggal NO (Toggle / Kunci)';
    if (s === 'switchnc') return 'Saklar Tunggal NC';
    if (s === 'switchcon') return 'Saklar Tukar (SPDT / Dimmer)';
    if (s === 'switchnonc') return 'Saklar Ganda (NO + NC)';
    if (s === 'switch3p0') return 'Saklar Selektor 3 Posisi (I-0-II)';
    if (s === 'switch3p') return 'Saklar Selektor 3 Posisi (I-II-III)';
    if (s === 'switchcrossover') return 'Saklar Silang (Intermediate)';
    if (s.startsWith('roller')) return 'Limit Switch (Saklar Batas)';

    // Beban & Motor (Loads & Motors)
    if (s === 'lamp') return 'Lampu Indikator (Pilot Lamp)';
    if (s === 'lampblink') return 'Lampu Indikator Kedip (Blinker)';
    if (s === 'buzzer') return 'Buzzer / Klakson Listrik';
    if (s === 'ring') return 'Bel Listrik (Alarm Bell)';
    if (s === 'siren') return 'Sirine / Klakson Alarm';
    if (s === 'motor3ph') return 'Motor Induksi 3 Fasa AC';
    if (s === 'motor1ph') return 'Motor Induksi 1 Fasa AC';
    if (s === 'motordc') return 'Motor Listrik DC';
    if (s === 'motorstardelta') return 'Motor 3 Fasa Star-Delta';
    if (s === 'motordhalander') return 'Motor 3 Fasa Dahlander';
    if (s === 'motortwospeeds') return 'Motor 3 Fasa 2 Kecepatan';
    if (s === 'diode') return 'Dioda Penyearah / Isolasi';
    if (s === 'arrowsource') return 'Panah Referensi Sumber';
    if (s === 'arrowdestination') return 'Panah Referensi Tujuan';

    return fallback || raw;
  }

  function buildGroupSpecs(svgData, groupEls, sys) {
    const s = String(svgData || '').toLowerCase();
    const voltCtrl = sys.controlLabel;

    // Timer & Flasher: gabungkan semua preset unik
    if (s === 'coildelayon' || s === 'coildelayoff' || s === 'coildelayonoff' || s === 'coilflasher' || s === 'flasher') {
      const presets = [];
      for (const el of groupEls) {
        if (el.valueTimeOn !== undefined && el.valueTimeOn !== null && !isNaN(Number(el.valueTimeOn))) {
          const onStr = Number(el.valueTimeOn).toFixed(1) + 's';
          const lbl = (s === 'coildelayonoff' && el.valueTimeOff > 0)
            ? `ON ${onStr} / OFF ${Number(el.valueTimeOff).toFixed(1)}s`
            : onStr;
          if (!presets.includes(lbl)) presets.push(lbl);
        }
      }
      const pText = presets.length > 0 ? `Preset: ${presets.join(', ')}` : 'Pengatur Waktu';
      return `${pText} (${voltCtrl})`;
    }

    // Lampu: gabungkan semua warna unik dalam kelompok
    if (s === 'lamp' || s === 'lampblink') {
      const colors = [];
      for (const el of groupEls) {
        const col = formatLampColorId(el.lampColor);
        if (!colors.includes(col)) colors.push(col);
      }
      const blinkNote = s === 'lampblink' ? ', Kedip' : '';
      return `Warna: ${colors.join(', ')}${blinkNote} (${voltCtrl})`;
    }

    // Sumber Daya
    if (s === 'battery') return 'Sumber Catu Daya DC 12V';
    if (s === 'sourceplus') return 'Sumber Tegangan Positif (+12V DC)';
    if (s === 'sourcenegative') return 'Jalur Massa / Negatif (- DC)';
    if (s === 'sourcel1') return 'Sumber Fasa Tunggal 220V AC';
    if (s === 'sourcel2' || s === 'sourcel3') return 'Sumber Fasa 220V / 380V AC';
    if (s === 'sourcen') return 'Jalur Netral 220V AC';
    if (s === 'sourcel1l2l3') return 'Catu Daya 3 Fasa 380V AC';
    if (s === 'sourcel1l2l3n') return 'Catu Daya 3 Fasa + Netral 380V/220V AC';
    if (s === 'sourcepe' || s === 'sourcegnd') return 'Proteksi Pembumian (Earth / PE)';
    if (s === 'powersupply' || s === 'powersupply2') return 'Konverter Catu Daya AC ke DC';
    if (s === 'generator3ph') return 'Pembangkit 3 Fasa 380V AC';

    // Proteksi
    if (s === 'breaker1p') return 'Pengaman Arus Lebih 1 Fasa (220V AC)';
    if (s === 'breaker2p') return 'Pengaman Arus Lebih 2 Kutub';
    if (s === 'breaker3p' || s === 'breaker4p') return 'Pengaman Arus Lebih 3 Fasa (380V AC)';
    if (s === 'breaker' || s.startsWith('motorbreaker')) return 'Pengaman Motor Thermal-Magnetik';
    if (s.startsWith('tmbreaker')) return 'Pengaman Beban Lebih & Hubung Singkat';
    if (s.startsWith('rcbo')) return 'Proteksi Arus Bocor & Arus Lebih';
    if (s.startsWith('rccb')) return 'Proteksi Arus Bocor ke Tanah';
    if (s.startsWith('fuse') && !s.startsWith('fuseswitch')) {
      return sys.mode === 'DC' ? 'Sekring Pengaman Blade Fuse (12V DC)' : 'Sekring Pengaman Arus Lebih';
    }
    if (s.startsWith('fuseswitch')) return 'Pemutus Beban Berpengaman Sekring';
    if (s.startsWith('isolator')) return 'Saklar Pemisah Rangkaian';
    if (s.startsWith('overload')) return 'Proteksi Beban Lebih Motor (Bimetal)';
    if (s === 'phasefailure') return 'Proteksi Kegagalan & Urutan Fasa';

    // Koil & Kontaktor & Kontak
    if (s === 'coil') return `Kumparan Elektromagnetik (${voltCtrl})`;
    if (s === 'coilsolenoid') return `Kumparan Solenoid Aktuator (${voltCtrl})`;
    if (s === 'coillatch') return `Relay Pengunci Impuls (${voltCtrl})`;
    if (s.startsWith('contactornc')) return 'Kontak Daya Utama Normally Closed';
    if (s.startsWith('contactor')) return 'Kontak Daya Utama Normally Open';
    if (s === 'contactno') return 'Kontak Bantu Normally Open';
    if (s === 'contactnc') return 'Kontak Bantu Normally Closed';
    if (s === 'contactcon') return 'Kontak Tukar 5-Kaki (NO-NC)';
    if (s === 'contactnonc') return 'Kontak Bantu Ganda (NO + NC)';
    if (s.includes('delayon')) return 'Kontak Timer Tunda Hidup (TON)';
    if (s.includes('delayoff')) return 'Kontak Timer Tunda Mati (TOF)';

    // Tombol & Saklar
    if (s === 'buttonno') return 'Saklar Tekan Pegas (Normally Open)';
    if (s === 'buttonnc') return 'Saklar Tekan Pegas (Normally Closed)';
    if (s.startsWith('button')) return 'Saklar Tekan Pegas (Momentary)';
    if (s.startsWith('emergency')) return 'Saklar Darurat Pengunci (Latch)';
    if (s === 'switchno') return 'Saklar Pengunci Normally Open';
    if (s === 'switchnc') return 'Saklar Pengunci Normally Closed';
    if (s === 'switchcon') return 'Saklar Pengalih 2 Arah (Changeover)';
    if (s === 'switch3p0') return 'Saklar Selektor 3 Posisi (Kiri-Off-Kanan)';
    if (s === 'switch3p') return 'Saklar Selektor 3 Arah';
    if (s.startsWith('switch')) return 'Saklar Kendali Manual';
    if (s.startsWith('roller')) return 'Saklar Batas Mekanik (Limit Switch)';

    // Beban & Motor & Lainnya
    if (s === 'buzzer' || s === 'ring' || s === 'siren') return `Indikator Suara / Alarm (${voltCtrl})`;
    if (s === 'motor3ph') return 'Motor Induksi 3 Fasa 380V AC';
    if (s === 'motor1ph') return 'Motor Induksi 1 Fasa 220V AC';
    if (s === 'motordc') return `Aktuator Motor DC (${sys.mode === 'DC' ? '12V DC' : voltCtrl})`;
    if (s === 'motorstardelta') return 'Motor 3 Fasa 6-Terminal (Star-Delta)';
    if (s === 'motordhalander' || s === 'motortwospeeds') return 'Motor 3 Fasa 2 Kecepatan';
    if (s === 'diode') return 'Semikonduktor Penyearah / Isolasi Arus';

    return 'Standar CAD Industri (IEC 60617)';
  }

  // =========================================================================
  // 3. UTILITAS KONVERSI SVG -> PNG & KONTRAST WARNA CETAK KERTAS PUTIH
  // =========================================================================
  function darkenForWhitePaper(rawColor) {
    const c = String(rawColor || '#0f172a').trim().toLowerCase();
    if (c === '#ffffff' || c === '#f8fafc' || c === '#f1f5f9' || c === 'white') return '#0f172a';
    if (c === '#fbbf24' || c === '#fde047' || c === 'yellow') return '#b45309';
    if (c === '#38bdf8' || c === '#93c5fd' || c === '#60a5fa' || c === '#00e5ff' || c === '#00ffff') return '#0369a1';
    if (c === '#34d399' || c === '#4ade80' || c === '#86efac') return '#047857';
    if (c === '#f87171' || c === '#fca5a5') return '#b91c1c';
    if (c === '#94a3b8' || c === '#cbd5e1') return '#475569';
    if (c === '#c084fc' || c === '#a78bfa') return '#6d28d9';
    return rawColor;
  }

  function svgToPngDataUrl(svgString, width, height, options) {
    const opts = options || {};
    const transparent = !!opts.transparent;
    const scale = opts.scale || 2.5;
    return new Promise((resolve) => {
      try {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const targetW = Math.min(Math.max(Math.round(width * scale), 48), 3200);
            const targetH = Math.min(Math.max(Math.round(height * scale), 48), 3200);
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!transparent) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
          } catch (err) {
            URL.revokeObjectURL(url);
            resolve(null);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Render Thumbnail Komponen Mandiri (Transparan 1:1, Frame-0 Bersih agar menyatu dengan zebra row!)
  async function renderComponentThumbnail(svgData) {
    const compDef = (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[svgData]) ? COMPONENTS_DATA[svgData] : null;
    if (!compDef || !compDef.graphics) return null;

    let graphics = compDef.graphics
      .replace(/inkscape:[a-zA-Z0-9_-]+="[^"]*"/g, '')
      .replace(/sodipodi:[a-zA-Z0-9_-]+="[^"]*"/g, '');

    // Saring hanya path yang tampil pada Frame 0 (kondisi istirahat/CAD murni, tanpa efek animasi aktif)
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${graphics}</svg>`,
        'image/svg+xml'
      );
      const rootSvg = xmlDoc.documentElement;
      if (rootSvg && !rootSvg.querySelector('parsererror')) {
        const allFrameIds = new Set();
        const frame0Ids = new Set();
        if (Array.isArray(compDef.frames) && compDef.frames.length > 0) {
          compDef.frames.forEach((fr, idx) => {
            (fr.paths || []).forEach((p) => {
              if (p && p.id) {
                allFrameIds.add(p.id);
                if (idx === 0) frame0Ids.add(p.id);
              }
            });
          });
        }
        // Hapus path animasi frame >= 1 (mis. fill merah/oranye motor berputar, kontak tertutup frame 1)
        if (allFrameIds.size > 0 && frame0Ids.size > 0) {
          rootSvg.querySelectorAll('[id]').forEach((el) => {
            const id = el.getAttribute('id');
            if (allFrameIds.has(id) && !frame0Ids.has(id)) {
              el.remove();
            }
          });
        }
        // Standarisasi warna tinta cetak charcoal (#0f172a)
        rootSvg.querySelectorAll('path, circle, line, rect, polyline, polygon, ellipse').forEach((node) => {
          const idLow = (node.getAttribute('id') || '').toLowerCase();
          const styleAttr = node.getAttribute('style') || '';
          if (idLow.startsWith('textpath')) {
            node.setAttribute('fill', '#0f172a');
            if (styleAttr) {
              node.setAttribute('style', styleAttr.replace(/fill\s*:\s*[^;]+/gi, 'fill:#0f172a'));
            }
          } else {
            const stroke = (node.getAttribute('stroke') || '').trim().toLowerCase();
            if (stroke === '#ffffff' || stroke === 'white' || stroke === '#ffff00' || stroke === '#f8fafc') {
              node.setAttribute('stroke', '#0f172a');
            }
            if (styleAttr) {
              node.setAttribute(
                'style',
                styleAttr
                  .replace(/stroke\s*:\s*(#ffffff|#f8fafc|#f9f9f9|white|#ffff00)/gi, 'stroke:#0f172a')
                  .replace(/stroke-width\s*:\s*2(px)?/gi, 'stroke-width:2.6px')
              );
            }
          }
        });
        graphics = new XMLSerializer().serializeToString(rootSvg)
          .replace(/^<svg[^>]*>/i, '')
          .replace(/<\/svg>$/i, '');
      }
    } catch (_) {
      graphics = graphics
        .replace(/#ffffff/gi, '#0f172a')
        .replace(/#f8fafc/gi, '#0f172a')
        .replace(/stroke:\s*white/gi, 'stroke:#0f172a')
        .replace(/stroke:\s*#ffff00/gi, 'stroke:#0f172a')
        .replace(/stroke-width:\s*2(px)?/gi, 'stroke-width:2.6px');
    }

    const w = compDef.width || 60;
    const h = compDef.height || 60;
    const maxDim = Math.max(w, h);
    const pad = 12;
    const boxW = maxDim + pad * 2;
    const boxH = maxDim + pad * 2;
    const offsetX = (maxDim - w) / 2;
    const offsetY = (maxDim - h) / 2;

    const svgStr = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="120" height="120" viewBox="0 0 ${boxW} ${boxH}">
        <g transform="translate(${pad + offsetX}, ${pad + offsetY})">
          ${graphics}
        </g>
      </svg>
    `;

    return await svgToPngDataUrl(svgStr, 120, 120, { transparent: true, scale: 2 });
  }

  // =========================================================================
  // 4. TANGKAP SKEMATIK RANGKAIAN KANVAS (KERTAS PUTIH + PIN IEC/DIN)
  // =========================================================================
  async function generateCircuitSchematicImage(canvas) {
    if (!canvas || !canvas.elements || canvas.elements.length === 0) {
      return null;
    }

    const elements = canvas.elements;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // 1. Hitung bounding box komponen + teks anotasi
    for (const el of elements) {
      if (el.svgData === 'text') {
        const displayText = String(el.comment || el.tag || '');
        const fs = Number(el.fontSize || el.indexFontSize || 16);
        const estHalfW = Math.max(50, displayText.length * fs * 0.34) + 16;
        const estHalfH = Math.max(16, fs * 0.9) + 10;
        minX = Math.min(minX, el.position.x - estHalfW);
        minY = Math.min(minY, el.position.y - estHalfH);
        maxX = Math.max(maxX, el.position.x + estHalfW);
        maxY = Math.max(maxY, el.position.y + estHalfH);
        continue;
      }

      const compDef = (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[el.svgData]) ? COMPONENTS_DATA[el.svgData] : null;
      const bw = compDef ? (compDef.width || 60) : 60;
      const bh = compDef ? (compDef.height || 60) : 60;
      const rot = (((el.rotation || 0) % 4) + 4) % 4;
      const effW = (rot === 1 || rot === 3) ? bh : bw;
      const effH = (rot === 1 || rot === 3) ? bw : bh;

      minX = Math.min(minX, el.position.x - effW * 0.5 - 28);
      minY = Math.min(minY, el.position.y - effH * 0.5 - 32);
      maxX = Math.max(maxX, el.position.x + effW * 0.5 + 42); // Ruang badge pin sisi kanan
      maxY = Math.max(maxY, el.position.y + effH * 0.5 + 28);
    }

    // 2. Perluas bounding box agar seluruh jalur kawat & busbar terluar tidak pernah terpotong
    if (canvas.wiresGroup) {
      const wirePaths = canvas.wiresGroup.querySelectorAll('path');
      const numRegex = /-?\d+(?:\.\d+)?/g;
      wirePaths.forEach((p) => {
        if (p.classList && (p.classList.contains('wire-hitbox') || p.classList.contains('wire-drag-handle'))) return;
        const d = p.getAttribute('d') || '';
        const nums = d.match(numRegex);
        if (nums && nums.length >= 2) {
          for (let i = 0; i + 1 < nums.length; i += 2) {
            const wx = parseFloat(nums[i]);
            const wy = parseFloat(nums[i + 1]);
            if (!isNaN(wx) && !isNaN(wy)) {
              minX = Math.min(minX, wx - 16);
              minY = Math.min(minY, wy - 16);
              maxX = Math.max(maxX, wx + 16);
              maxY = Math.max(maxY, wy + 16);
            }
          }
        }
      });
    }

    if (!isFinite(minX)) {
      minX = 0; minY = 0; maxX = 400; maxY = 300;
    }

    const pad = 36;
    const boxX = minX - pad;
    const boxY = minY - pad;
    const boxW = Math.max(maxX - minX + pad * 2, 260);
    const boxH = Math.max(maxY - minY + pad * 2, 200);

    // 3. Kloning Kawat (Wires) - Hitam CAD Solid
    let wiresSvg = '';
    if (canvas.wiresGroup) {
      const wiresClone = canvas.wiresGroup.cloneNode(true);
      wiresClone.querySelectorAll('.wire-hitbox, .wire-drag-handle, .wire-glow, .wire-flow-anim, .wire-segment-handle').forEach((n) => n.remove());
      wiresClone.querySelectorAll('path').forEach((p) => {
        p.setAttribute('stroke', '#0f172a');
        p.setAttribute('stroke-width', '2.5');
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('stroke-linejoin', 'round');
        p.removeAttribute('stroke-dasharray');
        p.removeAttribute('filter');
        if (p.style) {
          p.style.stroke = '#0f172a';
          p.style.strokeDasharray = 'none';
          p.style.filter = 'none';
        }
      });
      wiresSvg = wiresClone.innerHTML;
    }

    // 4. Kloning Komponen (Elements) - Tinta CAD Gelap & Warna Kontras Cetak
    let elementsSvg = '';
    if (canvas.elementsGroup) {
      const elemsClone = canvas.elementsGroup.cloneNode(true);
      elemsClone.querySelectorAll('.selection-box, .element-lock-badge, .component-hitbox, .terminal-hit-target').forEach((el) => el.remove());

      // Ubah seluruh stroke terang/putih menjadi charcoal CAD (#0f172a)
      elemsClone.querySelectorAll('path, circle, line, rect, polyline, polygon, ellipse').forEach((node) => {
        if (node.classList && (node.classList.contains('terminal-label-badge') || node.classList.contains('terminal-dot'))) return;
        const stroke = (node.getAttribute('stroke') || '').trim().toLowerCase();
        const styleStroke = (node.style && node.style.stroke) ? node.style.stroke.trim().toLowerCase() : '';

        const isLightStroke = (s) => (
          s === '#ffffff' || s === 'white' || s === '#f8fafc' || s === '#f1f5f9' ||
          s === '#e2e8f0' || s === '#cbd5e1' || s === '#ffff00' ||
          s === 'rgb(255, 255, 255)' || s === 'rgb(248, 250, 252)' || s === 'rgb(255, 255, 0)'
        );

        if (isLightStroke(stroke) || (!stroke && !styleStroke && node.tagName.toLowerCase() !== 'rect' && !node.getAttribute('fill'))) {
          node.setAttribute('stroke', '#0f172a');
        }
        if (isLightStroke(styleStroke)) {
          node.style.stroke = '#0f172a';
        }

        // Pastikan teks jalur vektor (textPath motor/sumber) tetap gelap
        const idAttr = (node.getAttribute('id') || '').toLowerCase();
        if (idAttr.startsWith('textpath')) {
          const fillAttr = (node.getAttribute('fill') || '').trim().toLowerCase();
          if (isLightStroke(fillAttr) || !fillAttr) {
            node.setAttribute('fill', '#0f172a');
          }
          if (node.style && isLightStroke(node.style.fill)) {
            node.style.fill = '#0f172a';
          }
        }
      });

      // Tag Komponen (-KM1, -S1, dll.)
      elemsClone.querySelectorAll('.element-tag').forEach((t) => {
        t.setAttribute('fill', '#0369a1');
        t.setAttribute('font-weight', '700');
        t.setAttribute('font-family', 'sans-serif');
        t.setAttribute('font-size', '12.5px');
        if (t.style) t.style.fill = '#0369a1';
      });

      // Komentar / Nama Komponen sesuai setting pengguna
      const showComponentNames = (typeof localStorage !== 'undefined')
        ? (localStorage.getItem('mashimu_show_component_names') === 'true')
        : false;
      if (!showComponentNames) {
        elemsClone.querySelectorAll('.element-comment').forEach((c) => c.remove());
      } else {
        elemsClone.querySelectorAll('.element-comment').forEach((c) => {
          c.setAttribute('fill', '#334155');
          c.setAttribute('font-weight', '600');
          c.setAttribute('font-family', 'sans-serif');
          c.setAttribute('font-size', '10.5px');
          if (c.style) c.style.fill = '#334155';
        });
      }

      // Badge Timer Preset
      elemsClone.querySelectorAll('.element-timer-badge').forEach((b) => {
        b.setAttribute('fill', '#334155');
        b.setAttribute('font-weight', '700');
        b.setAttribute('font-family', 'sans-serif');
        b.setAttribute('font-size', '10px');
        if (b.style) b.style.fill = '#334155';
      });

      // Teks Anotasi Kustom: gelapkan warna pastel agar tajam di atas kertas putih
      elemsClone.querySelectorAll('.element-custom-text').forEach((t) => {
        const curFill = t.getAttribute('fill') || (t.style && t.style.fill) || '#0f172a';
        const printCol = darkenForWhitePaper(curFill);
        t.setAttribute('fill', printCol);
        t.setAttribute('font-family', 'sans-serif');
        t.setAttribute('font-weight', '700');
        if (t.style) t.style.fill = printCol;
      });

      elementsSvg = elemsClone.innerHTML;
    }

    // 5. Kloning Pin Terminal & Penomoran Pin (canvas.pinsGroup) - Mode Cetak Kertas Putih
    let pinsSvg = '';
    const showPinLabels = (
      (canvas.svg && !canvas.svg.classList.contains('hide-terminal-labels')) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('mashimu_show_terminal_labels') === 'true')
    );

    if (canvas.pinsGroup) {
      const pinsClone = canvas.pinsGroup.cloneNode(true);
      pinsClone.querySelectorAll('.terminal-hit-target').forEach((el) => el.remove());

      pinsClone.querySelectorAll('.terminal-dot').forEach((dot) => {
        if (dot.classList.contains('terminal-unconnected')) {
          dot.setAttribute('r', '3.0');
          dot.setAttribute('fill', '#ffffff');
          dot.setAttribute('stroke', '#0f172a');
          dot.setAttribute('stroke-width', '1.4');
        } else if (dot.classList.contains('terminal-junction')) {
          dot.setAttribute('r', '4.2');
          dot.setAttribute('fill', '#0f172a');
          dot.setAttribute('stroke', '#ffffff');
          dot.setAttribute('stroke-width', '1.4');
        } else {
          dot.setAttribute('r', '3.0');
          dot.setAttribute('fill', '#0f172a');
          dot.setAttribute('stroke', '#ffffff');
          dot.setAttribute('stroke-width', '1.2');
        }
      });

      if (!showPinLabels) {
        pinsClone.querySelectorAll('.terminal-label-badge, .terminal-label').forEach((n) => n.remove());
      } else {
        pinsClone.querySelectorAll('.terminal-label-badge').forEach((rect) => {
          rect.setAttribute('fill', '#f1f5f9');
          rect.setAttribute('fill-opacity', '0.96');
          rect.setAttribute('stroke', '#94a3b8');
          rect.setAttribute('stroke-width', '0.85');
          rect.setAttribute('rx', '3');
          rect.setAttribute('ry', '3');
          if (rect.style) {
            rect.style.fill = '#f1f5f9';
            rect.style.stroke = '#94a3b8';
            rect.style.display = 'inline';
          }
        });
        pinsClone.querySelectorAll('.terminal-label').forEach((txt) => {
          txt.setAttribute('fill', '#0f172a');
          txt.setAttribute('font-family', 'sans-serif');
          txt.setAttribute('font-size', '9.5px');
          txt.setAttribute('font-weight', '700');
          if (txt.style) {
            txt.style.fill = '#0f172a';
            txt.style.display = 'inline';
          }
        });
      }

      pinsSvg = pinsClone.innerHTML;
    }

    const cleanXml = (str) => (str || '')
      .replace(/inkscape:[a-zA-Z0-9_-]+="[^"]*"/g, '')
      .replace(/sodipodi:[a-zA-Z0-9_-]+="[^"]*"/g, '');

    const svgStr = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${boxW}" height="${boxH}" viewBox="${boxX} ${boxY} ${boxW} ${boxH}">
        <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" fill="#ffffff"/>
        <g id="wiresCad">${cleanXml(wiresSvg)}</g>
        <g id="elementsCad">${cleanXml(elementsSvg)}</g>
        <g id="pinsCad">${cleanXml(pinsSvg)}</g>
      </svg>
    `;

    const dataUrl = await svgToPngDataUrl(svgStr, boxW, boxH, { transparent: false, scale: 2.5 });
    return {
      dataUrl,
      width: boxW,
      height: boxH
    };
  }

  // =========================================================================
  // 5. EKSTRAKSI DAFTAR KOMPONEN (BILL OF MATERIALS - HANYA KOMPONEN LISTRIK)
  // =========================================================================
  function extractCircuitBom(canvas) {
    if (!canvas || !canvas.elements) return [];
    const elements = canvas.elements;
    const sys = detectSystemType(elements);
    const groups = new Map();

    for (const el of elements) {
      if (isNonBomElement(el.svgData)) continue;
      const compDef = (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[el.svgData]) ? COMPONENTS_DATA[el.svgData] : null;
      const key = el.svgData;

      if (!groups.has(key)) {
        const fallbackName = (compDef && compDef.info && compDef.info.name) || (compDef && compDef.name) || el.svgData;
        groups.set(key, {
          svgData: el.svgData,
          compDef: compDef,
          name: getVocationalComponentName(el.svgData, fallbackName),
          tags: [],
          elements: [],
          specs: '-',
          count: 0
        });
      }

      const grp = groups.get(key);
      grp.count += 1;
      grp.elements.push(el);
      if (el.tag && String(el.tag).trim() !== '' && !grp.tags.includes(el.tag)) {
        grp.tags.push(el.tag);
      }
    }

    const result = Array.from(groups.values());
    for (const grp of result) {
      grp.specs = buildGroupSpecs(grp.svgData, grp.elements, sys);
    }
    return result;
  }

  // =========================================================================
  // 6. HELPER BINGKAI GANDA A4 PORTRAIT (HALAMAN 1 & HALAMAN BOM)
  // =========================================================================
  function drawPageFrame(doc) {
    // Bingkai Luar Gambar Teknik (10..200 mm x 10..284 mm)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.65);
    doc.rect(10, 10, 190, 274);

    // Garis Aksen Ganda Dalam (11.8..198.2 mm x 11.8..282.2 mm)
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.22);
    doc.rect(11.8, 11.8, 186.4, 270.4);
  }

  // =========================================================================
  // 7. FUNGSI UTAMA PEMBUATAN LAPORAN PDF MULTI-HALAMAN (A4 PORTRAIT)
  // =========================================================================
  async function generateCircuitPdfReport(canvas, studentInfo) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      throw new Error('Pustaka jsPDF belum termuat.');
    }

    if (!canvas || !canvas.elements || canvas.elements.length === 0) {
      throw new Error('Kanvas sirkuit masih kosong. Silakan letakkan komponen terlebih dahulu sebelum mencetak laporan.');
    }

    const { jsPDF } = window.jspdf;
    const info = Object.assign({
      projectTitle: 'RANGKAIAN SKEMATIK KELISTRIKAN',
      studentName: '-',
      studentClass: '-',
      studentNis: '-',
      studentSchool: '-',
      practiceDate: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    }, studentInfo || {});

    const cleanVal = (v, def = '-') => {
      const s = String(v === undefined || v === null ? '' : v).trim();
      return s.length > 0 ? s : def;
    };

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const upperTitle = cleanVal(info.projectTitle, 'RANGKAIAN SKEMATIK KELISTRIKAN').toUpperCase();
    const bomItems = extractCircuitBom(canvas);
    const realComponentCount = bomItems.reduce((sum, item) => sum + item.count, 0);
    const wireCount = canvas.connectors ? canvas.connectors.length : 0;

    // =========================================================================
    // HALAMAN 1 (A4 PORTRAIT): SKEMATIK CAD + ETIKET IDENTITAS & NILAI/PARAF
    // =========================================================================
    drawPageFrame(doc);

    // Header Bar Atas (2 tingkat rapi — judul panjang tidak pernah tabrakan!)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.45);
    doc.rect(10, 10, 190, 17, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(2, 132, 199);
    doc.text('MASHIMURELAY CAD SIMULATOR', 14.5, 15.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text('LEMBAR KERJA SKEMATIK', 195.5, 15.2, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const headerTitle = upperTitle.length > 58 ? upperTitle.substring(0, 56) + '...' : upperTitle;
    doc.text(headerTitle, 105, 23.2, { align: 'center' });

    // Area Skematik Rangkaian (y = 29 .. 235 mm)
    const schematic = await generateCircuitSchematicImage(canvas);
    if (schematic && schematic.dataUrl) {
      const areaX = 14;
      const areaY = 29;
      const maxW = 182;
      const maxH = 205;
      const scale = Math.min(maxW / schematic.width, maxH / schematic.height);
      const imgW = schematic.width * scale;
      const imgH = schematic.height * scale;
      const posX = areaX + (maxW - imgW) / 2;
      const posY = areaY + (maxH - imgH) / 2;

      doc.addImage(schematic.dataUrl, 'PNG', posX, posY, imgW, imgH, undefined, 'FAST');
    }

    // =========================================================================
    // ETIKET IDENTITAS SISWA + KOTAK NILAI & PARAF GURU (BAWAH HALAMAN 1)
    // =========================================================================
    const etiketX = 10;
    const etiketY = 237;
    const etiketW = 190;
    const etiketH = 47;
    const stripH = 6;
    const bodyY = etiketY + stripH; // 243
    const bodyH = etiketH - stripH; // 41

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.45);
    doc.rect(etiketX, etiketY, etiketW, etiketH, 'FD');

    // Header Strip Etiket
    doc.setFillColor(241, 245, 249);
    doc.rect(etiketX, etiketY, etiketW, stripH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(15, 23, 42);
    doc.text('ETIKET IDENTITAS SISWA & PENILAIAN PRAKTIKUM CAD', etiketX + etiketW / 2, etiketY + 4.2, { align: 'center' });

    // 3 Zona Kolom: Kiri (99mm) | Tengah (57mm) | Kanan Nilai & Paraf (34mm)
    const col1W = 99;
    const col2W = 57;
    const col2X = etiketX + col1W;       // 109
    const col3X = col2X + col2W;         // 166
    const col3W = etiketW - col1W - col2W; // 34

    // Garis Pemisah Vertikal Kolom
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.28);
    doc.line(col2X, bodyY, col2X, etiketY + etiketH);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.35);
    doc.line(col3X, bodyY, col3X, etiketY + etiketH);

    // Garis Pemisah Horizontal 4 Baris pada Kolom Kiri & Tengah
    const rowH = bodyH / 4; // 10.25 mm
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.22);
    for (let r = 1; r <= 3; r++) {
      doc.line(etiketX, bodyY + rowH * r, col3X, bodyY + rowH * r);
    }

    // Garis Pemisah Kotak NILAI (atas 44%) dan PARAF GURU (bawah 56%) di Kolom Kanan
    const gradeSplitY = bodyY + 18;
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.28);
    doc.line(col3X, gradeSplitY, etiketX + etiketW, gradeSplitY);

    // Helper gambar label + nilai di kolom Kiri & Tengah
    const drawEtiketField = (x, rowIndex, label, value, opts) => {
      const o = opts || {};
      const rTop = bodyY + rowH * rowIndex;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(100, 116, 139);
      doc.text(label, x + 2.8, rTop + 3.6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(o.fontSize || 7.5);
      const rgb = o.color || [15, 23, 42];
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      const maxLen = o.maxLen || 44;
      const vStr = cleanVal(value, '-');
      const disp = vStr.length > maxLen ? vStr.substring(0, maxLen - 2) + '...' : vStr;
      doc.text(disp, x + 2.8, rTop + 8.0);
    };

    // Kolom Kiri
    drawEtiketField(etiketX, 0, 'JUDUL PROYEK / TUGAS:', info.projectTitle, { maxLen: 46 });
    drawEtiketField(etiketX, 1, 'NAMA SISWA / PRAKTIKAN:', info.studentName, { maxLen: 44, fontSize: 8 });
    drawEtiketField(etiketX, 2, 'KELAS / KOMPETENSI KEAHLIAN:', info.studentClass, { maxLen: 46 });
    drawEtiketField(etiketX, 3, 'SEKOLAH / INSTANSI:', info.studentSchool, { maxLen: 46 });

    // Kolom Tengah
    drawEtiketField(col2X, 0, 'TANGGAL PRAKTIKUM:', info.practiceDate, { maxLen: 26 });
    drawEtiketField(col2X, 1, 'NIS / NO. PRESENSI:', info.studentNis, { maxLen: 26 });
    drawEtiketField(col2X, 2, 'TOTAL ENTITAS SIRKUIT:', `${realComponentCount} Komponen  |  ${wireCount} Kabel`, { maxLen: 30, color: [2, 132, 199] });
    drawEtiketField(col2X, 3, 'STATUS DOKUMEN:', 'TERVERIFIKASI CAD', { maxLen: 26, color: [5, 150, 105] });

    // Kolom Kanan: NILAI (atas) & PARAF GURU (bawah)
    const col3CenterX = col3X + col3W / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text('NILAI', col3CenterX, bodyY + 4.2, { align: 'center' });

    doc.text('PARAF GURU', col3CenterX, gradeSplitY + 4.2, { align: 'center' });
    // Garis tipis tempat tanda tangan guru di bagian bawah kotak paraf
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(col3X + 5, etiketY + etiketH - 4.2, etiketX + etiketW - 5, etiketY + etiketH - 4.2);

    // =========================================================================
    // HALAMAN 2+ (A4 PORTRAIT): TABEL BILL OF MATERIALS (BOM)
    // =========================================================================
    doc.addPage('a4', 'portrait');

    const thumbnails = [];
    for (const item of bomItems) {
      const thumb = await renderComponentThumbnail(item.svgData);
      thumbnails.push(thumb);
    }

    const tableRows = bomItems.map((item, idx) => [
      String(idx + 1),
      '', // Thumbnail dirender melalui didDrawCell
      item.name,
      item.tags.length > 0 ? item.tags.join(', ') : '-',
      item.specs,
      String(item.count)
    ]);

    if (tableRows.length === 0) {
      tableRows.push(['-', '', 'Tidak ada komponen listrik terdeteksi', '-', '-', '0']);
    }

    // Baris Ringkasan Total di kaki tabel
    const footerRow = [
      {
        content: `TOTAL KOMPONEN LISTRIK (${bomItems.length} Jenis Komponen)`,
        colSpan: 5,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontSize: 7.5
        }
      },
      {
        content: String(realComponentCount),
        styles: {
          halign: 'center',
          fontStyle: 'bold',
          fillColor: [241, 245, 249],
          textColor: [2, 132, 199],
          fontSize: 8
        }
      }
    ];

    if (typeof doc.autoTable !== 'function') {
      const plugin = window.jspdfAutoTable || window.jspdfPluginAutoTable;
      if (plugin && typeof plugin.applyPlugin === 'function') {
        plugin.applyPlugin(jsPDF);
      } else if (typeof window.applyPlugin === 'function') {
        window.applyPlugin(jsPDF);
      }
    }

    // Tabel ditempatkan RAPI DI DALAM bingkai aksen dalam (x = 14.5 .. 195.5 mm, y >= 31 mm)
    const tableConfig = {
      startY: 31,
      margin: { top: 31, bottom: 18, left: 14.5, right: 14.5 },
      tableWidth: 181,
      head: [['No', 'Simbol', 'Nama Komponen', 'Tag', 'Spesifikasi / Keterangan', 'Jml']],
      body: tableRows,
      foot: [footerRow],
      showFoot: 'lastPage',
      theme: 'grid',
      styles: {
        lineColor: [203, 213, 225],
        lineWidth: 0.22,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        font: 'helvetica',
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
        valign: 'middle',
        cellPadding: 2.2
      },
      bodyStyles: {
        font: 'helvetica',
        fontSize: 7.4,
        textColor: [15, 23, 42],
        valign: 'middle',
        cellPadding: { top: 1.8, bottom: 1.8, left: 2.0, right: 2.0 },
        minCellHeight: 12.5
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        valign: 'middle',
        cellPadding: 2.2,
        lineColor: [148, 163, 184],
        lineWidth: 0.3
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 21, halign: 'center' },
        2: { cellWidth: 48, halign: 'left', fontStyle: 'bold' },
        3: { cellWidth: 27, halign: 'center', fontStyle: 'bold', textColor: [2, 132, 199] },
        4: { cellWidth: 62, halign: 'left', textColor: [51, 65, 85] },
        5: { cellWidth: 14, halign: 'center', fontStyle: 'bold' }
      },
      didDrawPage: function (data) {
        const currentDocPage = (doc.internal && typeof doc.internal.getNumberOfPages === 'function')
          ? doc.internal.getNumberOfPages()
          : (data.pageNumber + 1);

        drawPageFrame(doc);

        // Header Bar Halaman BOM (identik dengan Halaman 1)
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.45);
        doc.rect(10, 10, 190, 17, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(2, 132, 199);
        const projSub = 'PROYEK: ' + (upperTitle.length > 52 ? upperTitle.substring(0, 50) + '...' : upperTitle);
        doc.text(projSub, 14.5, 15.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139);
        doc.text(`LEMBAR ${currentDocPage}`, 195.5, 15.2, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text('DAFTAR KOMPONEN & SPESIFIKASI (BILL OF MATERIALS)', 105, 23.2, { align: 'center' });
      },
      didDrawCell: function (data) {
        if (data.section === 'body' && data.column.index === 1) {
          const rowIdx = data.row.index;
          const thumbImg = thumbnails[rowIdx];
          if (thumbImg) {
            const dim = 9.8;
            const posX = data.cell.x + (data.cell.width - dim) / 2;
            const posY = data.cell.y + (data.cell.height - dim) / 2;
            doc.addImage(thumbImg, 'PNG', posX, posY, dim, dim, undefined, 'FAST');
          }
        }
      }
    };

    if (typeof doc.autoTable === 'function') {
      doc.autoTable(tableConfig);
    } else if (typeof window.autoTable === 'function') {
      window.autoTable(doc, tableConfig);
    }

    // =========================================================================
    // PENOMORAN FOOTER DINAMIS (HALAMAN X DARI Y) DI SELURUH HALAMAN
    // =========================================================================
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Dokumen dihasilkan otomatis oleh Mashimurelay CAD Simulator  •  Tanggal Cetak: ${cleanVal(info.practiceDate)}`,
        11.5,
        289.5
      );
      doc.text(`Halaman ${p} dari ${totalPages}`, 198.5, 289.5, { align: 'right' });
    }

    // Unduh Berkas PDF
    const safeFileName = cleanVal(info.projectTitle, 'Laporan_Praktikum')
      .replace(/(\.smrl|\.txt|\.json|\.pdf)+$/gi, '')
      .replace(/[\\/:*?"<>|\x00-\x1F\x80-\x9F]/g, '')
      .trim() || 'Laporan_Praktikum';

    doc.save(`${safeFileName}_Laporan_Praktikum.pdf`);
    return doc;
  }

  // Ekspor Global
  window.generateCircuitPdfReport = generateCircuitPdfReport;
  window.MashimurelayPdfReport = {
    generateCircuitPdfReport,
    extractCircuitBom,
    renderComponentThumbnail
  };

})(window);
