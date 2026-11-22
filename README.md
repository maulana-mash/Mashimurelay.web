<div align="center">
  <img src="assets/logo_mashimurelay.png" alt="Mashimurelay Logo" width="140" />

  <h1>Mashimurelay</h1>
  <p><strong>Industrial Electromechanical Relay & Motor Control CAD Simulator</strong></p>

  <p>
    <a href="https://mashimurelay.vercel.app/">
      <img src="https://img.shields.io/badge/Live_Demo-mashimurelay.vercel.app-0284c7?style=flat-square" alt="Live Web Simulator" />
    </a>
    <img src="https://img.shields.io/badge/Standard-IEC_60617-1e293b?style=flat-square" alt="IEC 60617 Standard" />
    <img src="https://img.shields.io/badge/Components-117_Industrial_Symbols-0f766e?style=flat-square" alt="117 Components" />
    <img src="https://img.shields.io/badge/Platforms-Web_%7C_Windows_%7C_Android-334155?style=flat-square" alt="Platforms" />
    <img src="https://img.shields.io/badge/Dependencies-Zero_External_Libs-475569?style=flat-square" alt="Zero Dependencies" />
  </p>
</div>

---

## Overview

**Mashimurelay** adalah perangkat lunak Computer-Aided Design (CAD) dan simulator waktu nyata (*real-time*) untuk perancangan rangkaian kontrol relay elektromekanikal serta instalasi motor listrik industri berstandar **IEC 60617**.

Dirancang khusus untuk kebutuhan pendidikan vokasi, pelatihan ketenagalistrikan, dan rekayasa otomasi industri, Mashimurelay mengintegrasikan **Discrete-Event Equipotential Graph Solver** dengan iterasi titik tetap (*fixed-point iteration*) yang mampu menyelesaikan topologi rangkaian AC 1-fasa, AC 3-fasa, maupun DC secara presisi pada laju 60 FPS tanpa ketergantungan pustaka eksternal.

---

## Core Engineering Capabilities

### 1. Discrete-Event Equipotential Circuit Solver
- **Multi-Rail Bitmask Propagation**: Melacak distribusi potensial `L1`, `L2`, `L3`, `N`, `PE`, `DC+`, dan `DC-` secara simultan melalui algoritma *Breadth-First Search* (BFS) pada graf konduktif.
- **Series & Parallel Load Resolution**: Menyelesaikan pembagian arus pada beban pasif 2-terminal yang disusun seri maupun paralel menggunakan penelusuran lintasan berarah *Depth-First Search* (DFS), termasuk konduksi searah pada semikonduktor dioda (*forward-bias* vs *reverse-bias*).
- **Fixed-Point Convergence Loop**: Mengevaluasi umpan balik instan antara koil kontaktor, relay tunda waktu (*timer*), kontak bantu (*auxiliary contacts*), serta *interlock* mekanis hingga mencapai titik ekuilibrium dalam satu siklus frame.
- **Fault & Thermal Protection Modeling**: Mendeteksi hubung singkat (*short circuit*) antar-fasa, fasa-ke-netral, dan panas berlebih DC (*DC overheat*), lengkap dengan karakteristik peleburan sekring (*fuse thermal melting*) serta pengujian *trip* pada *Thermal Overload Relay*.

### 2. Complete IEC 60617 Component Library (117 Symbols)
Seluruh simbol komponen dirender dalam format vektor SVG presisi tinggi yang dikelompokkan ke dalam 9 kategori standar industri:

| Kategori | Cakupan Komponen Utama |
| :--- | :--- |
| **Sources** | Suplai Fasa (`L1`, `L2`, `L3`, `3P`, `3P+N`), Netral (`N`), Ground (`PE`), Suplai DC (`+`, `-`, Battery), Power Supply AC/DC (1P & 3P dengan input kondisional), Generator 3-Fasa (Manual & Auto Control `C1-C2`). |
| **Protections** | Circuit Breaker / MCB (1P–4P), Thermal-Magnetic Breaker, Motor Protection Breaker, RCCB, RCBO, Fuse (1P–3P + N), Fuse-Switch Disconnector, Isolator, Thermal Overload Relay (1P–3P dengan fitur *Test-Trip*). |
| **Switches** | Saklar Manual (`NO`, `NC`, `CON`), Saklar Selektor 3-Posisi (`I-0-II` & `I-II-III`), Pushbutton (`NO`, `NC`, `CON`, `NONC`, `Crossover`), Emergency Stop (`NO`, `NC`, `CON`, `NONC`), Limit Switch, Roller, Pedal, Key, Pressure, Temperature, Float, Flow, & Proximity Sensor. |
| **Contactors** | Kontaktor Daya Utama `NO` dan `NC` (1-Pole hingga 4-Pole) dengan sinkronisasi tag referensi koil (`-KM`). |
| **Coils & Timers** | Koil Kontaktor Standar, Latching Relay Coil, Solenoid Coil, On-Delay Timer (`KT`), Off-Delay Timer, On-Off Delay Timer, Flasher / Blinker Relay, dan Phase Failure Relay (`PFR`). |
| **Auxiliaries** | Kontak Bantu Instan (`NO`, `NC`, `CON`, `NONC`), Kontak Bantu Tunda Waktu (*On-Delay*, *Off-Delay*, *On-Off Delay*), serta Kontak Bantu *Thermal Overload* (`95-96` NC & `97-98` NO). |
| **Motors** | Motor Induksi 3-Fasa (`U1, V1, W1`), Motor 3-Fasa 6-Terminal *Star-Delta* (`U1, V1, W1 - W2, U2, V2`), Motor Dahlander 2-Kecepatan, Motor 2-Belitan Terpisah, Motor Induksi 1-Fasa, dan Motor DC (mendukung deteksi putaran *Clockwise* & *Counter-Clockwise*). |
| **Loads** | Lampu Indikator (5 pilihan spektrum warna), Lampu Kedip (*Blinking Lamp*), Buzzer, Siren, dan Bell / Ring dengan sintesis audio waktu nyata. |
| **Others** | Terminal Block, Junction Node, *Cross-Reference Arrows* (`arrowSource` & `arrowDestination` dengan tautan otomatis `-REF1`), Dioda Penyearah, dan Anotasi Teks CAD. |

### 3. Pedagogical & Engineering Productivity Tools
- **Kit Praktikum Guru (Teacher Lock Mode)**: Memungkinkan instruktur mengunci posisi dan properti komponen tertentu pada soal praktikum siswa, dilengkapi ekspor/impor kode QR terenkripsi.
- **Technical PDF Report Generator**: Menghasilkan dokumen laporan teknis skematik rangkaian beserta daftar komponen (*Bill of Materials*) siap cetak.
- **Built-in Industrial Templates**: Menyediakan rangkaian standar siap uji, meliputi *Direct On-Line (DOL) Starter*, *Forward-Reverse Interlock*, dan *Automatic Star-Delta Starter*.
- **Encyclopedia & Interactive Video Guide**: Dokumentasi teknis internal untuk setiap komponen beserta panduan interaktif penggunaan ruang kerja CAD.

---

## Multi-Platform Ecosystem

Mashimurelay dibangun dalam arsitektur tiga platform yang saling kompatibel melalui format berkas proyek standar (`.smrl` / `.srelay`):

1. **[Mashimurelay Web](https://github.com/maulana-mash/Mashimurelay-Web)** (`PWA & Online Simulator`) — **Repositori ini.**
   Berjalan langsung di peramban modern (Desktop & Mobile) dengan dukungan *Service Worker* untuk pengoperasian penuh secara luring (*offline-first*).
   - **Akses Online**: [https://mashimurelay.vercel.app/](https://mashimurelay.vercel.app/)
2. **[Mashimurelay Windows Desktop](https://github.com/maulana-mash/Mashimurelay.exe)** (`Rust Tauri v2 Desktop`)
   Aplikasi desktop native Windows dengan jejak memori minimal, microserver Hotspot LAN offline, pengelolaan sesi kelas/ujian, serta tersedia dalam edisi *Standalone Portable* (`Mashimurelay.exe`) dan *NSIS Installer* (`Mashimurelay_Setup.exe`).
3. **[Mashimurelay Android](https://github.com/maulana-mash/Mashimurelay.apk)** (`100% Pure Kotlin Native`)
   Aplikasi Android native murni (`com.mashimurelay.app`) dengan akselerasi perangkat keras `android.graphics.Canvas` 60–120 FPS tanpa ketergantungan WebView untuk perangkat siswa di laboratorium.

---

## Running Locally (Web Workspace)

Proyek ini tidak memerlukan proses instalasi *dependency* eksternal (`npm install` tidak diperlukan untuk menjalankan aplikasi).

### Opsi 1: Mode Standalone App Window
Jalankan skrip peluncur berikut untuk membuka simulator dalam jendela aplikasi mandiri:
```bat
run-webview-app.bat
```

### Opsi 2: Mode Browser Standar
Jalankan server HTTP lokal bawaan:
```bat
run-browser.bat
```
Atau menggunakan Python secara langsung:
```bash
python serve.py
```
Kemudian buka `http://localhost:8080` pada peramban Anda.

### Build & Minification Pipeline (Development -> Production)
Seluruh kode sumber pengembangan yang bersih berada di dalam direktori `src_dev/`. Untuk mengompilasi, meminifikasi, dan menyinkronkan bundel produksi ke direktori root, `dist/`, `public/`, serta proyek Windows dan Android, jalankan:
```bash
node scripts/build-secure.js
```

---

## Repository Structure

```text
mashimurelay-web/
├── src_dev/                     # Clean development source code
│   ├── index.html               # Main CAD & workspace markup
│   ├── components.json          # IEC 60617 component definitions & pin topology
│   ├── css/
│   │   └── style.css            # Dark engineering theme (#121216) & layout styles
│   └── js/
│       ├── engine.js            # Equipotential graph solver & state machine engine
│       ├── canvas.js            # Interactive SVG/Canvas CAD renderer & wire router
│       ├── app.js               # Workspace controller, inspector, & UI orchestration
│       ├── components_data.js   # Vector symbol registry & geometry metadata
│       ├── encyclopedia_data.js # Technical reference database for all components
│       ├── examples_data.js     # Pre-built industrial motor control templates
│       ├── pdf_report_generator.js # Vector schematic & BOM PDF exporter
│       └── sound_manager.js     # Web Audio API electromechanical sound synthesizer
├── assets/                      # SVG vector symbols, icons, and Android APK distribution
├── dist/                        # Minified production bundle (Netlify / static hosting)
├── public/                      # Static mirror bundle
├── scripts/
│   ├── build-secure.js          # Controlled minification & cross-platform sync script
│   └── build-dist.js            # Distribution packaging helper
├── netlify.toml                 # Netlify headers, caching, and deployment rules
├── manifest.json                # Progressive Web App (PWA) manifest
└── sw.js                        # Offline-first Service Worker
```

---

## License & Attribution

Copyright © 2026 **Mashimurelay Engineering Project (Mash Maulana)**. All rights reserved.
Designed and engineered for electrical engineering education, vocational training, and industrial automation simulation.

> **Standards & Original Asset Notice:** All 117 electrical schematic symbols conform to the open international public standard **IEC 60617 / DIN EN 60617** and are independently generated as clean-room vector SVGs. The equipotential graph simulation engine, per-net fault isolation, protection auto-trip logic, Teacher Lab Mode, and interactive audio synthesizer are original engineering implementations of Mashimurelay.
