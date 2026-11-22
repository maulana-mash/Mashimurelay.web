/**
 * pdf_report_generator.js
 * Generator Dokumen Laporan Praktikum PDF 2 Halaman (100% Offline)
 * 
 * Halaman 1: Landscape (A4) - Gambar Skematik Rangkaian CAD Proteus-Style (Latar Putih, Orthogonal)
 * Halaman 2: Portrait (A4) - Tabel Bill of Materials (BOM) & Etiket Identitas Siswa di Bagian Bawah
 * 
 * Standar: Vokasi SMK Teknik Elektro & Otomotif
 */

(function (window) {
  'use strict';

  // Kamus Penamaan Komponen Standar Vokasi
  function getVocationalComponentName(svgData, fallback) {
    if (!svgData) return fallback || 'Komponen';
    const s = String(svgData).toLowerCase();

    if (s.includes('flasher')) return 'Flasher Elektronik (Lampu Sein)';
    if (s.includes('battery') || s.includes('dcpower')) return 'Baterai / Akumulator (Sumber DC)';
    if (s.includes('horn') || s.includes('klakson')) return 'Klakson Listrik (Electric Horn)';
    if (s.includes('delayon') || s.includes('ton')) return 'Timer On-Delay Relay (TON)';
    if (s.includes('delayoff') || s.includes('tof')) return 'Timer Off-Delay Relay (TOF)';
    if (s.includes('relaycoil') || s === 'coil') return 'Kumparan Relay Elektromagnetik';
    if (s.includes('lampblink')) return 'Lampu Indikator Kedip (Blinker)';
    if (s.includes('lamp')) return 'Lampu Filamen / Indikator (Pilot Lamp)';
    if (s.includes('buttonno') || s === 'button_no') return 'Tombol Tekan NO (Push Button Normally Open)';
    if (s.includes('buttonnc') || s === 'button_nc') return 'Tombol Tekan NC (Push Button Normally Closed)';
    if (s.includes('emergency')) return 'Tombol Darurat (Emergency Stop Switch)';
    if (s.includes('fuse')) return 'Sekring Pengaman (Blade Fuse)';
    if (s.includes('overload') || s.includes('tor')) return 'Thermal Overload Relay (TOR)';
    if (s.includes('mcb')) return 'Miniature Circuit Breaker (MCB)';
    if (s.includes('motor3p')) return 'Motor Listrik 3 Fasa AC';
    if (s.includes('motordc') || s.includes('starter')) return 'Motor Listrik DC / Motor Starter';
    if (s.includes('wiper')) return 'Motor Wiper Kaca Depan';
    if (s.includes('contactor')) return 'Kontaktor Utama (Magnetic Contactor)';
    if (s.includes('ground')) return 'Terminal Massa Rangka (Chassis Ground)';
    if (s.includes('switch3p') || s.includes('hazard')) return 'Saklar Kombinasi Sein & Hazard';
    if (s.includes('switch') || s.includes('key')) return 'Kunci Kontak / Saklar Utama';
    
    return fallback || svgData;
  }

  // Konversi String SVG ke Image PNG Data URL secara Asinkron
  function svgToPngDataUrl(svgString, width, height) {
    return new Promise((resolve) => {
      try {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const scale = 2; // Resolusi ganda (High DPI) untuk cetak tajam
            canvas.width = Math.max(Math.round(width * scale), 48);
            canvas.height = Math.max(Math.round(height * scale), 48);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
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

  // Render Thumbnail Komponen Mandiri (Ukuran Kotak Seragam 1:1)
  async function renderComponentThumbnail(svgData) {
    const compDef = (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[svgData]) ? COMPONENTS_DATA[svgData] : null;
    if (!compDef || !compDef.graphics) return null;

    // Bersihkan warna stroke dan atribut inkscape/sodipodi agar lolos validasi XML
    let graphics = compDef.graphics
      .replace(/#ffffff/gi, '#0f172a')
      .replace(/stroke:\s*white/gi, 'stroke:#0f172a')
      .replace(/stroke-width:\s*2(px)?/gi, 'stroke-width:2.5px')
      .replace(/inkscape:[a-zA-Z0-9_-]+="[^"]*"/g, '')
      .replace(/sodipodi:[a-zA-Z0-9_-]+="[^"]*"/g, '');

    const w = compDef.width || 60;
    const h = compDef.height || 60;
    const maxDim = Math.max(w, h);
    const pad = 12;
    const boxW = maxDim + pad * 2;
    const boxH = maxDim + pad * 2;
    const offsetX = (maxDim - w) / 2;
    const offsetY = (maxDim - h) / 2;

    const svgStr = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" width="120" height="120" viewBox="0 0 ${boxW} ${boxH}">
        <rect x="0" y="0" width="${boxW}" height="${boxH}" fill="#ffffff"/>
        <g transform="translate(${pad + offsetX}, ${pad + offsetY})">
          ${graphics}
        </g>
      </svg>
    `;

    return await svgToPngDataUrl(svgStr, 120, 120);
  }

  // Tangkap Skematik Rangkaian Kanvas dengan Latar Putih Bersih (Proteus CAD Style)
  async function generateCircuitSchematicImage(canvas) {
    if (!canvas || !canvas.elements || canvas.elements.length === 0) {
      return null;
    }

    const elements = canvas.elements;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const el of elements) {
      const compDef = (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[el.svgData]) ? COMPONENTS_DATA[el.svgData] : null;
      const bw = compDef ? (compDef.width || 60) : 60;
      const bh = compDef ? (compDef.height || 60) : 60;
      const maxDim = Math.max(bw, bh);
      minX = Math.min(minX, el.position.x - maxDim);
      minY = Math.min(minY, el.position.y - maxDim - 30);
      maxX = Math.max(maxX, el.position.x + maxDim);
      maxY = Math.max(maxY, el.position.y + maxDim + 30);
    }

    const pad = 70;
    const boxX = minX - pad;
    const boxY = minY - pad;
    const boxW = Math.max(maxX - minX + pad * 2, 300);
    const boxH = Math.max(maxY - minY + pad * 2, 200);

    // Kloning DOM group wires dan elements agar rute kabel & penataan identik
    let wiresSvg = '';
    let elementsSvg = '';

    if (canvas.wiresGroup) {
      const wiresClone = canvas.wiresGroup.cloneNode(true);
      const paths = wiresClone.querySelectorAll('path');
      paths.forEach(p => {
        p.setAttribute('stroke', '#0f172a');
        p.setAttribute('stroke-width', '2.6');
        p.setAttribute('fill', 'none');
      });
      wiresSvg = wiresClone.innerHTML;
    }

    if (canvas.elementsGroup) {
      const elemsClone = canvas.elementsGroup.cloneNode(true);
      elemsClone.querySelectorAll('.selection-box, .element-lock-badge, .component-hitbox').forEach(el => el.remove());

      // Ganti stroke putih menjadi charcoal CAD
      elemsClone.querySelectorAll('path, circle, line, rect, polyline, polygon').forEach(node => {
        const stroke = node.getAttribute('stroke');
        if (stroke === '#ffffff' || stroke === 'white' || !stroke) {
          if (node.tagName.toLowerCase() !== 'circle' || node.getAttribute('fill') !== '#ffffff') {
            node.setAttribute('stroke', '#0f172a');
          }
        }
        if (node.style && node.style.stroke === 'rgb(255, 255, 255)') {
          node.style.stroke = '#0f172a';
        }
      });

      // Sesuaikan teks tag dan komentar agar kontras & terbaca
      elemsClone.querySelectorAll('.element-tag').forEach(t => {
        t.setAttribute('fill', '#0284c7');
        t.setAttribute('font-weight', '700');
        t.setAttribute('font-family', 'sans-serif');
        t.setAttribute('font-size', '13px');
      });

      // Sesuaikan visibilitas nama komponen (comment) sesuai pengaturan pengguna
      const showComponentNames = (typeof localStorage !== 'undefined') ? (localStorage.getItem('mashimu_show_component_names') === 'true') : false;
      if (!showComponentNames) {
        elemsClone.querySelectorAll('.element-comment').forEach(c => c.remove());
      } else {
        elemsClone.querySelectorAll('.element-comment').forEach(c => {
          c.setAttribute('fill', '#334155');
          c.setAttribute('font-weight', '600');
          c.setAttribute('font-family', 'sans-serif');
          c.setAttribute('font-size', '11px');
        });
      }

      elemsClone.querySelectorAll('.element-timer-badge').forEach(b => {
        b.setAttribute('fill', '#0f172a');
        b.setAttribute('font-weight', '700');
      });

      elemsClone.querySelectorAll('.element-custom-text').forEach(t => {
        const curFill = (t.getAttribute('fill') || '#93c5fd').trim().toLowerCase();
        if (curFill === '#ffffff' || curFill === '#f8fafc' || curFill === 'white') {
          t.setAttribute('fill', '#0f172a'); // Kontras hitam CAD di atas kertas putih
        } else if (curFill === '#fbbf24') {
          t.setAttribute('fill', '#d97706'); // Amber gelap agar terbaca jelas di atas kertas putih
        }
      });

      elementsSvg = elemsClone.innerHTML;
    }

    const cleanedWires = (wiresSvg || '')
      .replace(/inkscape:[a-zA-Z0-9_-]+="[^"]*"/g, '')
      .replace(/sodipodi:[a-zA-Z0-9_-]+="[^"]*"/g, '');
    const cleanedElements = (elementsSvg || '')
      .replace(/inkscape:[a-zA-Z0-9_-]+="[^"]*"/g, '')
      .replace(/sodipodi:[a-zA-Z0-9_-]+="[^"]*"/g, '');

    const svgStr = `
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" width="${boxW}" height="${boxH}" viewBox="${boxX} ${boxY} ${boxW} ${boxH}">
        <rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" fill="#ffffff"/>
        <g id="wiresCad">${cleanedWires}</g>
        <g id="elementsCad">${cleanedElements}</g>
      </svg>
    `;

    const dataUrl = await svgToPngDataUrl(svgStr, boxW, boxH);
    return {
      dataUrl,
      width: boxW,
      height: boxH
    };
  }

  // Ekstraksi Daftar Komponen (Bill of Materials) dari Kanvas
  function extractCircuitBom(canvas) {
    if (!canvas || !canvas.elements) return [];
    const elements = canvas.elements;
    const groups = new Map();

    for (const el of elements) {
      if (el.svgData === 'text') continue;
      const compDef = (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[el.svgData]) ? COMPONENTS_DATA[el.svgData] : null;
      const key = el.svgData;

      if (!groups.has(key)) {
        let name = (compDef && compDef.info && compDef.info.name) || (compDef && compDef.name) || el.comment || el.svgData;
        name = getVocationalComponentName(el.svgData, name);

        let specs = '-';
        const isTimer = el.svgData.includes('Delay') || el.svgData.includes('Timer') || el.svgData.includes('Flasher');
        if (isTimer && el.valueTimeOn !== undefined && el.valueTimeOn !== null) {
          specs = `Preset Waktu: ${Number(el.valueTimeOn).toFixed(1)} s`;
        } else if (el.lampColor) {
          specs = `Warna Indikator: ${String(el.lampColor).toUpperCase()} (12V DC)`;
        } else if (el.svgData.includes('battery') || el.svgData.includes('dcPower') || el.svgData.includes('source')) {
          specs = '12V DC Sumber Catu Daya';
        } else if (el.svgData.includes('fuse')) {
          specs = 'Sekring Pengaman (Blade Fuse)';
        } else if (el.svgData.includes('relay') || el.svgData.includes('coil')) {
          specs = '12V DC Kumparan Elektromagnetik';
        } else if (el.svgData.includes('button')) {
          specs = 'Saklar Tekan Pegas (Momentary)';
        } else if (el.svgData.includes('horn') || el.svgData.includes('buzzer') || el.svgData.includes('bell') || el.svgData.includes('siren')) {
          specs = '12V DC Indikator Suara';
        } else {
          specs = el.value || (compDef && compDef.info && compDef.info.description) || 'Standar CAD Industri';
        }

        groups.set(key, {
          svgData: el.svgData,
          compDef: compDef,
          name: name,
          tags: [],
          specs: specs,
          count: 0
        });
      }

      const grp = groups.get(key);
      grp.count += 1;
      if (el.tag && !grp.tags.includes(el.tag)) {
        grp.tags.push(el.tag);
      }
    }

    return Array.from(groups.values());
  }

  // Fungsi Utama Pembuatan dan Pengunduhan Laporan PDF 2 Halaman
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
      studentSchool: 'SMK Negeri 2',
      practiceDate: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
    }, studentInfo || {});

    // Inisialisasi Halaman 1: Portrait A4 (210 x 297 mm)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const upperTitle = String(info.projectTitle || 'RANGKAIAN SKEMATIK KELISTRIKAN').toUpperCase();
    const elemCount = canvas.elements ? canvas.elements.length : 0;
    const wireCount = canvas.connectors ? canvas.connectors.length : 0;

    // =========================================================================
    // HALAMAN 1 (PORTRAIT): SKEMATIK RANGKAIAN CAD & ETIKET IDENTITAS SISWA
    // =========================================================================
    // Bingkai Luar Gambar Teknik
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.7);
    doc.rect(10, 10, 190, 274);

    // Garis Aksen Ganda
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.25);
    doc.rect(11.5, 11.5, 187, 271);

    // Header Bar Skematik (Bagian Atas Lembar Kerja)
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 190, 16, 'FD');

    // Teks Header Atas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(2, 132, 199);
    doc.text('MASHIMURELAY SIMULATOR', 15, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    const headerTitle = upperTitle.length > 36 ? upperTitle.substring(0, 34) + '...' : upperTitle;
    doc.text(headerTitle, 105, 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('LEMBAR KERJA SKEMATIK CAD', 195, 20, { align: 'right' });

    // Render Gambar Skematik Rangkaian Kanvas (Area Tengah)
    const schematic = await generateCircuitSchematicImage(canvas);
    if (schematic && schematic.dataUrl) {
      const maxW = 184;
      const maxH = 208;
      const scale = Math.min(maxW / schematic.width, maxH / schematic.height);
      const imgW = schematic.width * scale;
      const imgH = schematic.height * scale;
      const posX = 13 + (maxW - imgW) / 2;
      const posY = 28 + (maxH - imgH) / 2;

      doc.addImage(schematic.dataUrl, 'PNG', posX, posY, imgW, imgH, undefined, 'FAST');
    }

    // =========================================================================
    // ETIKET IDENTITAS SISWA CAD (BAGIAN BAWAH HALAMAN 1 — STANDAR GAMBAR TEKNIK)
    // =========================================================================
    const etiketX = 10;
    const etiketY = 239;
    const etiketW = 190;
    const etiketH = 45;

    // Kotak Luar Etiket
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.rect(etiketX, etiketY, etiketW, etiketH, 'FD');

    // Header Strip Etiket
    doc.setFillColor(241, 245, 249);
    doc.rect(etiketX, etiketY, etiketW, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('ETIKET IDENTITAS SISWA & LEMBAR PRAKTIKUM CAD', etiketX + etiketW / 2, etiketY + 4.2, { align: 'center' });

    // Pembatas Vertikal Antara Kolom Kiri dan Kanan
    const midX = etiketX + 112;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.line(midX, etiketY + 6, midX, etiketY + etiketH);

    // Pembatas Horizontal 4 Baris (Tinggi per baris ~9.75 mm)
    const rowH = (etiketH - 6) / 4;
    doc.line(etiketX, etiketY + 6 + rowH, etiketX + etiketW, etiketY + 6 + rowH);
    doc.line(etiketX, etiketY + 6 + rowH * 2, etiketX + etiketW, etiketY + 6 + rowH * 2);
    doc.line(etiketX, etiketY + 6 + rowH * 3, etiketX + etiketW, etiketY + 6 + rowH * 3);

    // Kolom Kiri:
    // Baris 1: Judul Proyek / Praktikum
    let cY = etiketY + 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('JUDUL PROYEK / TUGAS:', etiketX + 3, cY + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const projDisplay = String(info.projectTitle || 'RANGKAIAN KELISTRIKAN').substring(0, 50);
    doc.text(projDisplay, etiketX + 3, cY + 7.5);

    // Baris 2: Nama Siswa / Murid
    cY += rowH;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('NAMA SISWA / PRAKTIKAN:', etiketX + 3, cY + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(info.studentName || '-').substring(0, 48), etiketX + 3, cY + 7.5);

    // Baris 3: Kelas & Jurusan
    cY += rowH;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('KELAS / KOMPETENSI KEAHLIAN:', etiketX + 3, cY + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(info.studentClass || '-').substring(0, 48), etiketX + 3, cY + 7.5);

    // Baris 4: Sekolah / Instansi
    cY += rowH;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('SEKOLAH / INSTANSI PENDIDIKAN:', etiketX + 3, cY + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(info.studentSchool || '-').substring(0, 48), etiketX + 3, cY + 7.5);

    // Kolom Kanan:
    // Baris 1: Tanggal Praktikum
    cY = etiketY + 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('TANGGAL PRAKTIKUM:', midX + 3, cY + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(info.practiceDate || '-').substring(0, 32), midX + 3, cY + 7.5);

    // Baris 2: NIS / No. Presensi
    cY += rowH;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('NIS / NO. PRESENSI:', midX + 3, cY + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(info.studentNis || '-').substring(0, 32), midX + 3, cY + 7.5);

    // Baris 3: Status Dokumen CAD
    cY += rowH;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('STATUS DOKUMEN CAD:', midX + 3, cY + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text('TERVERIFIKASI CAD RESMI', midX + 3, cY + 7.5);

    // Baris 4: Ringkasan Entitas Sirkuit
    cY += rowH;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL ENTITAS SIRKUIT:', midX + 3, cY + 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(2, 132, 199);
    doc.text(`${elemCount} Komponen  |  ${wireCount} Jalur Kabel`, midX + 3, cY + 7.5);

    // =========================================================================
    // HALAMAN 2+ (PORTRAIT): DAFTAR KOMPONEN & SPESIFIKASI (BILL OF MATERIALS)
    // =========================================================================
    doc.addPage('a4', 'portrait');

    // Data Komponen (BOM) & Penyiapan Gambar Thumbnail
    const bomItems = extractCircuitBom(canvas);
    const thumbnails = [];

    for (const item of bomItems) {
      const thumb = await renderComponentThumbnail(item.svgData);
      thumbnails.push(thumb);
    }

    const tableRows = bomItems.map((item, idx) => [
      String(idx + 1),
      '', // Diisi oleh hook didDrawCell
      item.name,
      item.tags.length > 0 ? item.tags.join(', ') : '-',
      item.specs,
      String(item.count)
    ]);

    // Render Tabel BOM Menggunakan jsPDF-AutoTable (Dukungan Multi-Halaman Bebas Overflow)
    if (typeof doc.autoTable !== 'function') {
      const plugin = window.jspdfAutoTable || window.jspdfPluginAutoTable;
      if (plugin && typeof plugin.applyPlugin === 'function') {
        plugin.applyPlugin(jsPDF);
      } else if (typeof window.applyPlugin === 'function') {
        window.applyPlugin(jsPDF);
      }
    }

    const tableConfig = {
      startY: 29,
      margin: { top: 29, bottom: 15, left: 10, right: 10 },
      tableWidth: 190,
      head: [['No', 'Simbol CAD', 'Nama Komponen', 'Tag / Simbol', 'Spesifikasi / Keterangan', 'Jumlah']],
      body: tableRows,
      theme: 'grid',
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
        fontSize: 7.5,
        textColor: [15, 23, 42],
        valign: 'middle',
        cellPadding: 1.5,
        minCellHeight: 14
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 50, halign: 'left' },
        3: { cellWidth: 26, halign: 'center' },
        4: { cellWidth: 69, halign: 'left' },
        5: { cellWidth: 14, halign: 'center' }
      },
      didDrawPage: function (data) {
        // Gambar Border & Header pada setiap halaman tabel BOM (Halaman 2, 3, dst)
        const currentDocPage = (doc.internal && typeof doc.internal.getNumberOfPages === 'function') ? doc.internal.getNumberOfPages() : (data.pageNumber + 1);

        // Bingkai Luar Gambar Teknik
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.7);
        doc.rect(10, 10, 190, 274);

        // Garis Aksen Ganda
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.25);
        doc.rect(11.5, 11.5, 187, 271);

        // Header Bar Halaman BOM
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.4);
        doc.rect(10, 10, 190, 16, 'FD');

        // Baris 1: Judul Halaman BOM
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text('DAFTAR KOMPONEN & SPESIFIKASI (BILL OF MATERIALS)', 105, 17, { align: 'center' });

        // Baris 2: Sub-info Proyek & Lembar
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(2, 132, 199);
        doc.text(('PROYEK: ' + upperTitle).substring(0, 55), 14, 23.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`LEMBAR ${currentDocPage}`, 196, 23.5, { align: 'right' });
      },
      didDrawCell: function (data) {
        if (data.section === 'body' && data.column.index === 1) {
          const rowIdx = data.row.index;
          const thumbImg = thumbnails[rowIdx];
          if (thumbImg) {
            const dim = 11; // Ukuran kotak thumbnail 11x11 mm
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
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      if (p === 1) {
        doc.text(`Dokumen ini dihasilkan secara otomatis oleh Mashimurelay CAD Simulator • Tanggal Cetak: ${info.practiceDate}`, 12, 289);
        doc.text(`Halaman 1 dari ${totalPages}`, 198, 289, { align: 'right' });
      } else {
        doc.text('Dokumen ini dihasilkan secara otomatis oleh Mashimurelay CAD Simulator', 12, 289);
        doc.text(`Halaman ${p} dari ${totalPages}`, 198, 289, { align: 'right' });
      }
    }

    // Unduh Berkas PDF
    const safeFileName = (info.projectTitle || 'Laporan_Praktikum')
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
