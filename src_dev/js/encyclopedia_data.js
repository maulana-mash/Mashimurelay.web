/**
 * Mashimurelay Component Encyclopedia Technical Knowledge Base
 * Standardized to IEC 60617, IEC 60947, EN 50005, IEC 60034-8 & Mashimurelay Electrical Curriculum
 * Enriched with Comprehensive Descriptions, Physics Simulation Mechanisms, and Full Terminal I/O Mappings
 */

window.COMPONENT_ENCYCLOPEDIA_KNOWLEDGE = Object.freeze({
  "sourceL1": {
    "name": "Sumber Fasa L1 (R / Fasa 1)",
    "desc": "Terminal catu daya fasa tunggal L1 (Fasa R) pada sistem tegangan bolak-balik (AC) 50/60 Hz berstandar IEC 60038.",
    "how": "Menjadi titik awal (node sumber potensial) yang mengalirkan arus listrik bolak-balik 230V terhadap netral atau 400V terhadap L2/L3. Pada simulasi Mashimurelay, kawat yang terhubung ke L1 akan menyala merah terang saat daya mengalir.",
    "io": [
      {
        "pin": "L1",
        "type": "OUTPUT",
        "desc": "Output Fasa Aktif L1 (230V AC fasa-netral / 400V AC fasa-fasa ke rangkaian daya atau kontrol)"
      }
    ]
  },
  "sourceL2": {
    "name": "Sumber Fasa L2 (S / Fasa 2)",
    "desc": "Terminal catu daya fasa L2 (Fasa S) pada sistem 3-fasa simetris dengan pergeseran sudut fasa 120° listrik terhadap L1.",
    "how": "Menyuplai fasa kedua untuk rangkaian daya 3-fasa. Bersama L1 dan L3 membentuk medan magnet putar pada stator motor listrik. Kawat aktif menyala kuning/emas saat simulasi berjalan.",
    "io": [
      {
        "pin": "L2",
        "type": "OUTPUT",
        "desc": "Output Fasa Aktif L2 (Tegangan 400V AC terhadap L1/L3, beda fasa 120°)"
      }
    ]
  },
  "sourceL3": {
    "name": "Sumber Fasa L3 (T / Fasa 3)",
    "desc": "Terminal catu daya fasa L3 (Fasa T) pada sistem 3-fasa simetris dengan pergeseran sudut fasa 240° listrik terhadap L1.",
    "how": "Menyuplai fasa ketiga untuk melengkapi sistem 3-fasa seimbang. Urutan fasa L1-L2-L3 menentukan arah putaran motor (Forward). Kawat aktif menyala abu-abu/biru pada simulasi.",
    "io": [
      {
        "pin": "L3",
        "type": "OUTPUT",
        "desc": "Output Fasa Aktif L3 (Tegangan 400V AC terhadap L1/L2, beda fasa 240°)"
      }
    ]
  },
  "sourceL1L2L3": {
    "name": "Catu Daya 3-Fasa (L1-L2-L3)",
    "desc": "Kombinasi rel terminal tiga fasa (L1, L2, L3) 400V AC terintegrasi untuk penyaluran daya motor induksi dan kontaktor daya.",
    "how": "Menyuplai ketiga fasa secara serempak. Dalam simulasi, komponen ini adalah simpul catu daya utama rangkaian daya motor (Power Circuit). Menghubungkan kontaktor utama ke sumber ini memungkinkan motor berputar.",
    "io": [
      {
        "pin": "L1",
        "type": "OUTPUT",
        "desc": "Terminal Output Fasa 1 (R)"
      },
      {
        "pin": "L2",
        "type": "OUTPUT",
        "desc": "Terminal Output Fasa 2 (S)"
      },
      {
        "pin": "L3",
        "type": "OUTPUT",
        "desc": "Terminal Output Fasa 3 (T)"
      }
    ]
  },
  "sourceL1L2L3N": {
    "name": "Catu Daya 3-Fasa 4-Kawat (L1-L2-L3-N)",
    "desc": "Rel terminal catu daya lengkap 3-fasa 400V AC ditambah penghantar Netral (N) untuk instalasi panel terpadu daya dan kontrol.",
    "how": "Menyediakan tegangan 400V AC antar-fasa untuk beban motor 3-fasa sekaligus tegangan 230V AC antara salah satu fasa ke Netral (N) untuk menyuplai rangkaian kendali (koil, timer, lampu indikator).",
    "io": [
      {
        "pin": "L1, L2, L3",
        "type": "OUTPUT",
        "desc": "Tiga terminal fasa daya utama 400V AC"
      },
      {
        "pin": "N",
        "type": "NEUTRAL",
        "desc": "Terminal Netral penghantar balik rangkaian kontrol 230V AC"
      }
    ]
  },
  "sourceN": {
    "name": "Terminal Netral (Neutral - N)",
    "desc": "Titik bintang netral (Star Point 0V referensi) transformator distribusi tenaga listrik.",
    "how": "Berfungsi sebagai konduktor arus balik (Return Path) bagi seluruh rangkaian kontrol 1-fasa 230V AC (ujung koil A2, beban lampu X2, buzzer). Pada simulasi, kabel netral aktif menyala cyan/biru terang saat membawa arus balik.",
    "io": [
      {
        "pin": "N",
        "type": "NEUTRAL",
        "desc": "Terminal Netral (Titik referensi nol volt AC)"
      }
    ]
  },
  "sourcePE": {
    "name": "Pembumian Pengaman (Protective Earth - PE)",
    "desc": "Konduktor proteksi pembumian (Grounding) berstandar IEC 60364 untuk keselamatan sengatan listrik.",
    "how": "Dihubungkan ke bodi logam motor, sasis panel, dan terminal PE transformator/genset. Berfungsi membuang arus bocor isolasi langsung ke tanah guna mencegah tegangan sentuh berbahaya pada operator.",
    "io": [
      {
        "pin": "PE",
        "type": "GROUND",
        "desc": "Terminal Proteksi Pembumian Pengaman (Ground)"
      }
    ]
  },
  "sourceGnd": {
    "name": "Ground Pembumian Sirkuit",
    "desc": "Titik referensi bumi (Ground/Massa) untuk stabilisasi potensial nol sirkuit kendali dan instrumen.",
    "how": "Menetapkan titik nol mutlak bagi rangkaian kelistrikan, menyerap arus transien, serta meminimalkan gangguan induksi elektromagnetik (EMI) pada perangkat kendali.",
    "io": [
      {
        "pin": "0",
        "type": "GROUND",
        "desc": "Terminal Sambungan Grounding Elektroda Bumi"
      }
    ]
  },
  "sourcePlus": {
    "name": "Terminal Positif DC (+24V / +12V)",
    "desc": "Sumber catu daya arus searah (DC) polaritas positif untuk otomasi industri modern.",
    "how": "Mengalirkan arus DC stabil untuk menyuplai koil relay DC, sensor proximity, PLC, timer elektronik, dan katup solenoid. Pada simulasi, garis kabel positif menyala merah cerah.",
    "io": [
      {
        "pin": "+",
        "type": "OUTPUT",
        "desc": "Output Daya Arus Searah Positif (+V DC)"
      }
    ]
  },
  "sourceNegative": {
    "name": "Terminal Negatif DC (0V / -DC)",
    "desc": "Terminal polaritas negatif / ground referensi bagi sistem daya arus searah (DC).",
    "how": "Berfungsi sebagai jalur arus balik sirkuit DC. Pada rangkaian DC, beban semikonduktor (seperti dioda) sangat bergantung pada polaritas ini agar tidak terjadi reverse bias yang menghambat aliran listrik.",
    "io": [
      {
        "pin": "-",
        "type": "NEUTRAL",
        "desc": "Terminal Arus Balik Negatif DC (0V / -DC)"
      }
    ]
  },
  "battery": {
    "name": "Baterai Akumulator DC (Aki 12V / 24V)",
    "desc": "Sumber energi elektrokimia portabel penyimpan arus searah DC mandiri tanpa ketergantungan pada jaringan PLN.",
    "how": "Mengubah energi kimia internal menjadi potensial listrik DC konstan. Dalam simulasi Mashimurelay, baterai dapat langsung menyalakan lampu DC, relay darurat, atau motor starter genset secara mandiri.",
    "io": [
      {
        "pin": "+",
        "type": "OUTPUT",
        "desc": "Terminal Kutub Positif Baterai (+12V/+24V DC)"
      },
      {
        "pin": "-",
        "type": "NEUTRAL",
        "desc": "Terminal Kutub Negatif Baterai (Massa/0V DC)"
      }
    ]
  },
  "powerSupply": {
    "name": "Power Supply Step-Down AC ke DC (SMPS Multi-Tegangan)",
    "desc": "Unit konverter switching (Switched-Mode Power Supply) penurun tegangan AC industri menjadi tegangan DC stabil.",
    "how": "Menerima masukan tegangan AC fleksibel (220V AC Low Voltage antara LV-C atau 380V AC High Voltage antara HV-C), lalu menyearahkan dan meregulasi output menjadi arus searah DC stabil (+ dan -) berisolasi galvanis.",
    "io": [
      {
        "pin": "LV",
        "type": "INPUT",
        "desc": "Input Fasa Rendah (Low Voltage 220V–240V AC)"
      },
      {
        "pin": "C",
        "type": "NEUTRAL",
        "desc": "Input Netral / Common AC masukan"
      },
      {
        "pin": "HV",
        "type": "INPUT",
        "desc": "Input Fasa Tinggi (High Voltage 380V–400V AC antar-fasa)"
      },
      {
        "pin": "PE",
        "type": "GROUND",
        "desc": "Terminal Ground pengaman sasis power supply"
      },
      {
        "pin": "+ (x2)",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Positif Arus Searah (+24V DC terisolasi)"
      },
      {
        "pin": "- (x2)",
        "type": "NEUTRAL",
        "desc": "Terminal Keluaran Negatif Arus Searah (0V / -DC)"
      }
    ]
  },
  "powerSupply2": {
    "name": "Power Supply AC/DC Industri Kompak",
    "desc": "Adaptor catu daya rel DIN kompak penyearah 230V AC ke 24V DC dengan proteksi arus lebih.",
    "how": "Menerima fasa (L) dan netral (N) 230V AC, mengubahnya menjadi tegangan kontrol DC halus untuk menggerakkan modul relai dan indikator otomasi di dalam panel kontrol.",
    "io": [
      {
        "pin": "L",
        "type": "INPUT",
        "desc": "Input Fasa AC 220V–230V 50Hz"
      },
      {
        "pin": "N",
        "type": "NEUTRAL",
        "desc": "Input Netral AC"
      },
      {
        "pin": "+",
        "type": "OUTPUT",
        "desc": "Output DC Positif (+24V DC)"
      },
      {
        "pin": "-",
        "type": "NEUTRAL",
        "desc": "Output DC Negatif (0V DC)"
      }
    ]
  },
  "generator3ph": {
    "name": "Generator Set 3-Fasa (Genset Cadangan Otomatis)",
    "desc": "Pembangkit listrik tenaga generator sinkron 3-fasa 400V AC cadangan darurat dengan modul starter otomatis.",
    "how": "Dapat dioperasikan dalam 2 mode: Mode Manual (langsung menghasilkan daya 3-fasa saat RUN) atau Mode Otomatis (Genset standby, dan baru menyala berputar saat kontak remote start C1-C2 terhubung oleh sistem ATS).",
    "io": [
      {
        "pin": "L1, L2, L3",
        "type": "OUTPUT",
        "desc": "Tiga terminal daya fasa keluaran generator (380V/400V AC)"
      },
      {
        "pin": "N",
        "type": "NEUTRAL",
        "desc": "Titik bintang Netral keluaran generator"
      },
      {
        "pin": "C1, C2",
        "type": "CONTROL",
        "desc": "Pasangan kontak Remote Start (Hubungkan via saklar/kontak ATS untuk menyalakan genset di mode Auto)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "breaker1p": {
    "name": "Miniature Circuit Breaker 1-Pole (MCB 1P)",
    "desc": "Pemutus sirkuit fasa tunggal otomatis dengan proteksi termal (beban lebih) dan magnetik (hubung singkat).",
    "how": "Memutus jalur fasa seketika saat arus melampaui kurva trip atau terjadi korsleting fasa-ke-netral. Digunakan khusus mengamankan sirkuit kendali di panel.",
    "io": [
      {
        "pin": "1",
        "type": "INPUT",
        "desc": "Terminal Masukan Fasa (Line In dari Sumber L1)"
      },
      {
        "pin": "2",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Terproteksi (Load Out ke Rangkaian Kontrol / Tombol)"
      }
    ],
    "simVideo": "short_circuit"
  },
  "breaker2p": {
    "name": "Miniature Circuit Breaker 2-Pole (MCB 2P)",
    "desc": "Pemutus sirkuit dua kutub simultan untuk instalasi 1-fasa 2-kawat (Fasa + Netral) atau DC 2-kutub.",
    "how": "Kedua kutub dikopel secara mekanis. Jika salah satu kutub mendeteksi arus gangguan, kedua kontak (1-2 dan 3-4) membuka secara serempak.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Terminal Masukan Fasa dan Netral (Line In)"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Terproteksi (Load Out)"
      }
    ],
    "simVideo": "short_circuit"
  },
  "breaker3p": {
    "name": "Miniature Circuit Breaker 3-Pole (MCB 3P)",
    "desc": "Pemutus daya tiga kutub untuk proteksi saluran utama 3-fasa 400V AC rangkaian tenaga motor.",
    "how": "Mengamankan ketiga fasa L1-L2-L3 secara simultan. Jika terjadi hubung singkat antar-fasa atau beban berlebih, tuas trip menjatuhkan ketiga kutub sekaligus.",
    "io": [
      {
        "pin": "1, 3, 5",
        "type": "INPUT",
        "desc": "Input Saluran 3-Fasa (L1, L2, L3)"
      },
      {
        "pin": "2, 4, 6",
        "type": "OUTPUT",
        "desc": "Output Daya Terproteksi ke Kontaktor Utama (U, V, W)"
      }
    ],
    "simVideo": "short_circuit"
  },
  "breaker4p": {
    "name": "Miniature Circuit Breaker 4-Pole (MCB 4P)",
    "desc": "Pemutus daya empat kutub (3 Fasa + Netral) untuk proteksi total instalasi gedung dan panel genset.",
    "how": "Memutus ketiga fasa dan jalur netral serempak, mencegah pergeseran titik netral dan mengisolasi total tegangan saat perawatan.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Input 3-Fasa (L1, L2, L3) dan Netral (N)"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Output Terproteksi menuju sistem beban 4-kawat"
      }
    ],
    "simVideo": "short_circuit"
  },
  "breaker": {
    "name": "Motor Protection Circuit Breaker 3P (MPCB)",
    "desc": "Pemutus sirkuit pelindung motor terpadu (Manual Motor Starter) pengganti kombinasi MCB + Thermal Overload.",
    "how": "Mengintegrasikan mekanisme trip bimetal terkalibrasi khusus arus FLA motor dan solenoida magnetik instan kecepatan tinggi (13x In) untuk proteksi rotor terkunci.",
    "io": [
      {
        "pin": "1, 3, 5",
        "type": "INPUT",
        "desc": "Terminal Masukan Daya Jaringan 3-Fasa (L1, L2, L3)"
      },
      {
        "pin": "2, 4, 6",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Langsung ke Belitan Motor (T1, T2, T3)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "motorBreaker1p": {
    "name": "Motor Breaker 1-Pole (MPCB 1P)",
    "desc": "Pengaman motor induksi 1-fasa dengan kurva trip termal khusus beban induktif motor kecil.",
    "how": "Mencegah kerusakan lilitan motor 1-fasa saat mengalami macet mekanis pada poros beban dengan karakteristik trip kelas 10.",
    "io": [
      {
        "pin": "1",
        "type": "INPUT",
        "desc": "Input Fasa Daya"
      },
      {
        "pin": "2",
        "type": "OUTPUT",
        "desc": "Output Daya ke Motor 1-Fasa"
      }
    ],
    "simVideo": "short_circuit"
  },
  "motorBreaker2p": {
    "name": "Motor Breaker 2-Pole (MPCB 2P)",
    "desc": "Pengaman motor 1-fasa 230V kutub ganda pemutus fasa dan netral serempak.",
    "how": "Memutus fasa dan netral sekaligus saat motor mengalami panas berlebih atau hubung singkat pada kapasitor start.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Input Fasa dan Netral Masukan"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Output Fasa dan Netral ke Terminal Motor"
      }
    ],
    "simVideo": "short_circuit"
  },
  "motorBreaker3p": {
    "name": "Motor Breaker 3-Pole Standar (MPCB 3P)",
    "desc": "Pemutus tenaga motor 3-fasa dengan tombol putar ON-OFF manual dan proteksi termomagnetik terpadu.",
    "how": "Dapat diaktifkan secara manual sebagai saklar penyala motor langsung, sekaligus melindungi motor secara otomatis jika terjadi fasa hilang atau arus berlebih.",
    "io": [
      {
        "pin": "1, 3, 5",
        "type": "INPUT",
        "desc": "Input 3-Fasa L1-L2-L3"
      },
      {
        "pin": "2, 4, 6",
        "type": "OUTPUT",
        "desc": "Output Terproteksi ke Kontaktor / Motor"
      }
    ],
    "simVideo": "dol_starter"
  },
  "motorBreaker4p": {
    "name": "Motor Breaker 4-Pole (MPCB 4P)",
    "desc": "Motor breaker 4 kutub untuk instalasi motor khusus atau sistem transfer ATS dengan isolasi netral.",
    "how": "Memutus 3 fasa daya dan 1 jalur kontrol/netral secara bersamaan saat mendeteksi trip beban lebih.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Input 4-Kutub L1, L2, L3, N"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Output 4-Kutub ke Beban Terproteksi"
      }
    ],
    "simVideo": "short_circuit"
  },
  "tmBreaker1p": {
    "name": "Thermal-Magnetic Breaker 1-Pole (MCCB/MCB TM 1P)",
    "desc": "Pemutus tenaga termal-magnetik 1 kutub dengan kapasitas pemutusan (*breaking capacity*) tinggi.",
    "how": "Mengombinasikan pemutusan beban lambat oleh elemen panas bimetal dan pemutusan sekejap oleh jangkar magnetik saat hubung singkat besar.",
    "io": [
      {
        "pin": "1",
        "type": "INPUT",
        "desc": "Line In (Fasa Masuk)"
      },
      {
        "pin": "2",
        "type": "OUTPUT",
        "desc": "Load Out (Fasa Keluar Terproteksi)"
      }
    ],
    "simVideo": "short_circuit"
  },
  "tmBreaker2p": {
    "name": "Thermal-Magnetic Breaker 2-Pole (TM 2P)",
    "desc": "Pemutus termal-magnetik 2 kutub untuk proteksi rangkaian DC tegangan tinggi atau AC 2-fasa.",
    "how": "Memutuskan kedua kutub secara simultan ketika salah satu atau kedua kutub mendeteksi arus lebih batas nominal.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Line In Kutub 1 dan Kutub 2"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Load Out Kutub 1 dan Kutub 2"
      }
    ],
    "simVideo": "short_circuit"
  },
  "tmBreaker3p": {
    "name": "Thermal-Magnetic Breaker 3-Pole (TM 3P / MCCB)",
    "desc": "Molded Case Circuit Breaker (MCCB) 3-fasa untuk panel distribusi utama (MDB/SDP).",
    "how": "Menjadi induk pengaman rangkaian tenaga motor berdaya menengah-besar dengan pemadaman busur api menggunakan arc chute.",
    "io": [
      {
        "pin": "1, 3, 5",
        "type": "INPUT",
        "desc": "Input Daya 3-Fasa L1, L2, L3"
      },
      {
        "pin": "2, 4, 6",
        "type": "OUTPUT",
        "desc": "Output Daya Terproteksi Menuju Busbar / Sub-Panel"
      }
    ],
    "simVideo": "short_circuit"
  },
  "tmBreaker4p": {
    "name": "Thermal-Magnetic Breaker 4-Pole (TM 4P / MCCB 4P)",
    "desc": "MCCB 4 kutub untuk proteksi feeder utama 3-fasa 4-kawat lengkap dengan proteksi kutub netral.",
    "how": "Memberikan proteksi menyeluruh terhadap gangguan hubung singkat fase-ke-fase maupun fase-ke-netral pada kabel induk feeder.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Input Feeder 3 Fasa + Netral"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Output Terproteksi Feeder 4-Kawat"
      }
    ],
    "simVideo": "short_circuit"
  },
  "fuse1p": {
    "name": "Sekering Pengaman 1-Kutub (Cartridge Fuse 1P)",
    "desc": "Pengaman lebur tabung silindris 1 kutub untuk proteksi hubung singkat rangkaian instrumen.",
    "how": "Kawat lebur perak di dalam tabung sekering akan putus seketika saat dialiri arus korsleting ekstrem, memutus sirkuit secara permanen hingga tabung diganti.",
    "io": [
      {
        "pin": "1",
        "type": "INPUT",
        "desc": "Terminal Masukan Fasa Sumber"
      },
      {
        "pin": "2",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Beban Terproteksi"
      }
    ],
    "simVideo": "short_circuit"
  },
  "fuse2p": {
    "name": "Sekering Pengaman 2-Kutub (Fuse 2P)",
    "desc": "Unit pemegang sekering ganda 2 kutub untuk proteksi saluran fasa dan netral atau kutub positif-negatif DC.",
    "how": "Menampung dua tabung pengaman lebur mandiri untuk melindungi dua konduktor aktif sekaligus.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Input Dua Saluran Aktif"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Output Dua Saluran Terproteksi"
      }
    ],
    "simVideo": "short_circuit"
  },
  "fuse3p": {
    "name": "Sekering Pengaman 3-Kutub (Fuse 3P)",
    "desc": "Blok sekering 3 kutub tipe HRC/NH untuk proteksi arus hubung singkat rangkaian motor 3-fasa.",
    "how": "Memiliki kapasitas pemutusan sangat tinggi (hingga 100kA), melebur cepat saat terjadi hubung singkat tanpa menimbulkan ledakan keluar.",
    "io": [
      {
        "pin": "1, 3, 5",
        "type": "INPUT",
        "desc": "Input 3-Fasa R, S, T"
      },
      {
        "pin": "2, 4, 6",
        "type": "OUTPUT",
        "desc": "Output Daya Terproteksi ke Beban"
      }
    ],
    "simVideo": "short_circuit"
  },
  "fuse4p": {
    "name": "Sekering Pengaman 4-Kutub (Fuse 4P)",
    "desc": "Blok sekering lebur 4 kutub untuk instalasi 3-fasa 4-kawat.",
    "how": "Mengamankan 3 konduktor fasa dan 1 konduktor netral terhadap korsleting parah.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Input 4 Kawat L1-L2-L3-N"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Output 4 Kawat Terproteksi"
      }
    ],
    "simVideo": "short_circuit"
  },
  "fuseSwitch1p": {
    "name": "Sakelar Sekering Pemutus Beban 1P (Fuse Switch Disconnector 1P)",
    "desc": "Kombinasi sakelar pemutus manual dengan sekering lebur terpasang di dalam rumah engsel isolator.",
    "how": "Dapat dibuka secara manual untuk mengisolasi sirkuit dengan aman, dan sekering di dalamnya otomatis melebur jika terjadi hubung singkat.",
    "io": [
      {
        "pin": "1",
        "type": "INPUT",
        "desc": "Terminal Masukan Daya"
      },
      {
        "pin": "2",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Terproteksi Sekering"
      }
    ],
    "simVideo": "short_circuit"
  },
  "fuseSwitch1pn": {
    "name": "Sakelar Sekering Pemutus Beban 1P+N",
    "desc": "Sakelar sekering 1 fasa terproteksi lebur ditambah 1 pisau pemutus netral tanpa sekering.",
    "how": "Kutub fasa dilindungi oleh elemen sekering, sedangkan kutub netral dibuka oleh pisau isolasi saat engsel ditarik terbuka.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Input Fasa (1) dan Netral (3)"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Output Fasa Tersekering (2) dan Netral Terisolasi (4)"
      }
    ],
    "simVideo": "short_circuit"
  },
  "fuseSwitch2p": {
    "name": "Sakelar Sekering Pemutus Beban 2P",
    "desc": "Sakelar pemutus 2 kutub dengan sekering lebur ganda untuk proteksi sirkuit DC atau 2-kawat AC.",
    "how": "Kedua engsel kutub ditarik terbuka serentak untuk memutus kedua jalur konduktor aktif.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Input Kutub 1 dan Kutub 2"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Output Terproteksi Kutub 1 dan Kutub 2"
      }
    ],
    "simVideo": "short_circuit"
  },
  "fuseSwitch3p": {
    "name": "Sakelar Sekering Pemutus Beban 3P (NH Fuse Switch Disconnector)",
    "desc": "Sakelar pemutus beban 3-fasa tipe pisau dengan 3 buah sekering pisau NH terintegrasi.",
    "how": "Sering digunakan sebagai saklar pemutus utama (Incomer) pada panel distribusi LV. Mengisolasi 3-fasa secara visual saat handel pintu ditarik.",
    "io": [
      {
        "pin": "1, 3, 5",
        "type": "INPUT",
        "desc": "Input 3-Fasa L1, L2, L3"
      },
      {
        "pin": "2, 4, 6",
        "type": "OUTPUT",
        "desc": "Output Terproteksi 3-Fasa ke Busbar"
      }
    ],
    "simVideo": "short_circuit"
  },
  "fuseSwitch3pn": {
    "name": "Sakelar Sekering Pemutus Beban 3P+N",
    "desc": "Sakelar pemutus 3-fasa terproteksi lebur plus 1 kutub pemutus netral solid isolasi.",
    "how": "Mengamankan ketiga jalur fasa beban motor sekaligus memutus penghantar netral untuk keamanan isolasi total.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Input 3 Fasa (1,3,5) dan Netral (7)"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Output 3 Fasa Tersekering (2,4,6) dan Netral (8)"
      }
    ],
    "simVideo": "short_circuit"
  },
  "fuseSwitch4p": {
    "name": "Sakelar Sekering Pemutus Beban 4P",
    "desc": "Sakelar pemutus beban 4 kutub dengan 4 buah sekering lebur pada seluruh kutubnya.",
    "how": "Memproteksi dan mengisolasi keempat konduktor saluran kabel distribusi secara mandiri.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Input 4 Saluran Daya"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Output 4 Saluran Terproteksi"
      }
    ],
    "simVideo": "short_circuit"
  },
  "isolator1p": {
    "name": "Sakelar Isolator Pemutus Beban 1P (Disconnector 1P)",
    "desc": "Sakelar manual pemutus tanpa proteksi otomatis untuk pemutusan tampak (*visible isolation*) jalur 1-fasa.",
    "how": "Hanya berfungsi sebagai sakelar pemutus mekanis untuk menjamin sirkuit bebas tegangan saat dilakukan pemeliharaan fisik.",
    "io": [
      {
        "pin": "13",
        "type": "INPUT",
        "desc": "Terminal Masukan Fasa"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Terisolasi"
      }
    ]
  },
  "isolator2p": {
    "name": "Sakelar Isolator Pemutus Beban 2P",
    "desc": "Sakelar isolator 2 kutub mekanis simultan untuk memutus fasa dan netral atau dua kutub DC.",
    "how": "Memutuskan kedua konduktor secara bersamaan saat tuas diputar ke posisi OFF (0).",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Input Masukan Kutub 1 dan 2"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Output Terputus Kutub 1 dan 2"
      }
    ]
  },
  "isolator3p": {
    "name": "Sakelar Isolator Pemutus Beban 3P (Main Switch 3P)",
    "desc": "Sakelar isolator utama 3 kutub putar (Rotary Isolator) untuk pemutus daya lokal motor 3-fasa.",
    "how": "Dipasang dekat motor di lapangan (*local isolator*) agar teknisi dapat memutus daya 3-fasa langsung saat perbaikan tanpa ke panel pusat.",
    "io": [
      {
        "pin": "1, 3, 5",
        "type": "INPUT",
        "desc": "Input 3-Fasa Masukan"
      },
      {
        "pin": "2, 4, 6",
        "type": "OUTPUT",
        "desc": "Output 3-Fasa ke Motor"
      }
    ]
  },
  "isolator4p": {
    "name": "Sakelar Isolator Pemutus Beban 4P",
    "desc": "Sakelar isolator 4 kutub untuk pemutusan total 3 fasa dan netral pada sistem genset atau incoming.",
    "how": "Memutus keempat jalur konduktor serentak tanpa menimbulkan percikan arc ke sasis.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Input 3-Fasa + Netral"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Output 3-Fasa + Netral Terisolasi"
      }
    ]
  },
  "overload1p": {
    "name": "Thermal Overload Relay 1-Pole (TOR 1P)",
    "desc": "Relai beban lebih termal 1 kutub bimetal untuk pengaman motor 1-fasa.",
    "how": "Elemen pemanas bimetal membengkok saat dialiri arus motor berlebih secara terus-menerus, memicu kontak trip.",
    "io": [
      {
        "pin": "1",
        "type": "INPUT",
        "desc": "Masukan Arus Beban Motor"
      },
      {
        "pin": "2",
        "type": "OUTPUT",
        "desc": "Keluaran Arus ke Motor"
      }
    ],
    "simVideo": "thermal_overload"
  },
  "overload2p": {
    "name": "Thermal Overload Relay 2-Pole (TOR 2P)",
    "desc": "Relai beban lebih termal 2 kutub untuk proteksi motor pompa/kompresor 1-fasa 230V.",
    "how": "Dua strip bimetal bekerja memantau arus pada konduktor fasa dan netral motor.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Masukan Arus Kutub 1 dan Kutub 2"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Keluaran Arus Terproteksi ke Motor"
      }
    ],
    "simVideo": "thermal_overload"
  },
  "overload3p": {
    "name": "Thermal Overload Relay 3-Pole (TOR 3P / -F1)",
    "desc": "Relai proteksi beban lebih termal 3-fasa standar industri dengan mekanisme bimetal dan kontak bantu trip.",
    "how": "Dipasang langsung di bawah kontaktor utama. Memiliki 3 elemen bimetal daya (1-2, 3-4, 5-6). Jika motor kelebihan beban atau macet, panas membengkokkan bimetal dan men-trigger mekanisme trip: kontak NC 95-96 membuka untuk memutus koil kontaktor, sedangkan kontak NO 97-98 menutup menyalakan lampu indikator trip.",
    "io": [
      {
        "pin": "1, 3, 5",
        "type": "INPUT",
        "desc": "Terminal Kontak Utama Masukan (Terhubung ke terminal T1, T2, T3 kontaktor)"
      },
      {
        "pin": "2, 4, 6",
        "type": "OUTPUT",
        "desc": "Terminal Kontak Utama Keluaran (Terhubung ke terminal U, V, W motor listrik)"
      }
    ],
    "simVideo": "thermal_overload"
  },
  "phaseFailure": {
    "name": "Phase Failure Relay (PFR / Phase Sequence Relay)",
    "desc": "Relai pemantau tegangan dan urutan fasa jaringan listrik 3-fasa untuk mencegah kerusakan motor.",
    "how": "Memantau ketiga fasa L1, L2, L3 secara real-time. Jika urutan fasa benar dan simetris, relai aktif normal (lampu hijau menyala via kontak bantu NO 11-14). Jika terjadi salah satu fasa putus (Single Phasing) atau urutan terbalik (Phase Reversal), relai langsung TRIP memutus kontak kendali dan menyalakan lampu merah alarm (NC 11-12).",
    "io": [
      {
        "pin": "L1",
        "type": "INPUT",
        "desc": "Input Sensing Fasa L1 (R)"
      },
      {
        "pin": "L2",
        "type": "INPUT",
        "desc": "Input Sensing Fasa L2 (S)"
      },
      {
        "pin": "L3",
        "type": "INPUT",
        "desc": "Input Sensing Fasa L3 (T)"
      }
    ]
  },
  "rccbBreaker2p": {
    "name": "Residual Current Circuit Breaker 2-Pole (RCCB / ELCB 2P)",
    "desc": "Pengaman arus bocor tanah (Earth Leakage) 2 kutub untuk proteksi manusia terhadap sengatan listrik.",
    "how": "Menggunakan transformator arus toroidal diferensial (Core Balance CT). Jika arus fasa tidak sama dengan arus netral (selisih arus bocor >30mA mengalir ke tanah via tubuh manusia), relai seketika trip memutus sirkuit dalam waktu <40ms.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Input Fasa (1) dan Netral (3)"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Output Fasa (2) dan Netral (4) Terproteksi Arus Bocor"
      }
    ],
    "simVideo": "short_circuit"
  },
  "rccbBreaker4p": {
    "name": "Residual Current Circuit Breaker 4-Pole (RCCB / ELCB 4P)",
    "desc": "Pengaman arus bocor tanah 4 kutub untuk instalasi 3-fasa 4-kawat industri.",
    "how": "Membandingkan penjumlahan vektor arus ketiga fasa dan netral. Jika jumlah vektor arus tidak nol (ada arus bocor tanah), seluruh 4 kutub langsung terputus serempak.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Input 3-Fasa (1,3,5) dan Netral (7)"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Output Beban Terproteksi Arus Bocor"
      }
    ],
    "simVideo": "short_circuit"
  },
  "rcboBreaker2p": {
    "name": "RCBO 2-Pole (RCCB + MCB Terpadu)",
    "desc": "Pengaman gabungan lengkap 2 kutub: Proteksi Arus Bocor Tanah + Beban Lebih + Hubung Singkat.",
    "how": "Menggabungkan sensor toroidal residual, bimetal beban lebih, dan solenoid hubung singkat dalam satu modul 2-pole.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Input Fasa dan Netral Masukan"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Output Terproteksi Menyeluruh (Bocor + Korslet + Overload)"
      }
    ],
    "simVideo": "short_circuit"
  },
  "rcboBreaker4p": {
    "name": "RCBO 4-Pole (RCCB + MCB 3-Fasa Terpadu)",
    "desc": "Pengaman gabungan 4 kutub industri: Proteksi Arus Bocor 3-Fasa + Beban Lebih + Korsleting.",
    "how": "Memberikan proteksi tertinggi pada panel utama motor, mengamankan operator dari sengatan dan peralatan dari kebakaran.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Input Feeder 3 Fasa + Netral"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Output Beban Terproteksi Menyeluruh"
      }
    ],
    "simVideo": "short_circuit"
  },
  "buttonNO": {
    "name": "Push Button Normally Open (Tombol Start NO)",
    "desc": "Tombol tekan sesaat (momentary switch) hijau untuk memulai / menyalakan rangkaian kendali.",
    "how": "Dalam keadaan normal kontak terbuka (13-14 terbuka). Saat ditekan dan ditahan, kontak menutup menghubungkan arus ke koil kontaktor. Saat dilepas, kontak kembali membuka pegas (membutuhkan kontak bantu pengunci 13-14 agar koil tetap ON).",
    "io": [
      {
        "pin": "13",
        "type": "INPUT",
        "desc": "Terminal Masukan Kontak NO (Dari sumber kontrol / Stop)"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Kontak NO (Menuju terminal koil A1 kontaktor)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "buttonNC": {
    "name": "Push Button Normally Closed (Tombol Stop NC)",
    "desc": "Tombol tekan sesaat merah untuk mematikan / menghentikan rangkaian kendali kontaktor.",
    "how": "Dalam keadaan normal kontak tertutup (11-12 menyambung). Saat ditekan, kontak membuka sesaat dan memutuskan aliran arus ke koil kontaktor, meruntuhkan sirkuit pengunci self-holding sehingga motor mati.",
    "io": [
      {
        "pin": "11",
        "type": "INPUT",
        "desc": "Terminal Masukan Kontak NC (Dari MCB kontrol / kontak 96 TOR)"
      },
      {
        "pin": "12",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Kontak NC (Menuju terminal 13 tombol Start NO)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "buttonCON": {
    "name": "Push Button Changeover (Tombol Tukar SPDT)",
    "desc": "Tombol tekan sesaat dengan 1 kutub bersama (Common) dan 2 arah kontak (NC dan NO).",
    "how": "Terminal 11 terhubung ke 12 (NC) saat normal. Saat ditekan, kontak 11-12 membuka dan secara bersamaan kontak 11-14 (NO) menutup.",
    "io": [
      {
        "pin": "11",
        "type": "INPUT",
        "desc": "Terminal Bersama (Common Masukan)"
      },
      {
        "pin": "12",
        "type": "OUTPUT",
        "desc": "Terminal Kontak Normally Closed (NC Keluaran saat diam)"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "Terminal Kontak Normally Open (NO Keluaran saat ditekan)"
      }
    ]
  },
  "buttonNONC": {
    "name": "Push Button Double Contact (NC + NO Terpisah)",
    "desc": "Tombol tekan industri dengan dua blok kontak independen: 1 blok NC dan 1 blok NO dalam satu aktuator tekan.",
    "how": "Saat tombol ditekan, blok NC (11-12) membuka sekaligus blok NO (13-14) menutup. Sering digunakan pada tombol Start Forward-Reverse untuk mechanical interlocking.",
    "io": [
      {
        "pin": "11, 12",
        "type": "CONTROL",
        "desc": "Pasangan Kontak NC (11 Input, 12 Output - Membuka saat ditekan)"
      },
      {
        "pin": "13, 14",
        "type": "CONTROL",
        "desc": "Pasangan Kontak NO (13 Input, 14 Output - Menutup saat ditekan)"
      }
    ]
  },
  "buttonCrossover": {
    "name": "Push Button Crossover (Tombol Silang 4-Terminal)",
    "desc": "Tombol tekan sesaat dengan konfigurasi pertukaran silang dua kutub.",
    "how": "Menghubungkan jalur diagonal silang saat ditekan untuk membalik polaritas sinyal kontrol.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Pasangan Input Masukan Sinyal"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Pasangan Output Keluaran Tersilang"
      }
    ]
  },
  "emergencyNC": {
    "name": "Emergency Stop NC (Tombol Jamur Darurat NC)",
    "desc": "Tombol darurat tipe jamur merah (*Mushroom Head*) berkunci (*Latch/Twist to Reset*) sesuai standar ISO 13850.",
    "how": "Wajib dipasang seri di hulu seluruh rangkaian kontrol. Saat ditekan, kontak membuka seketika dan mengunci di posisi terbuka hingga diputar/ditarik manual. Memadamkan seluruh sistem kontrol demi keselamatan kerja.",
    "io": [
      {
        "pin": "11",
        "type": "INPUT",
        "desc": "Masukan Fasa Kontrol dari Pengaman"
      },
      {
        "pin": "12",
        "type": "OUTPUT",
        "desc": "Keluaran Fasa Kontrol ke Sirkuit Operasi"
      }
    ],
    "simVideo": "dol_starter"
  },
  "emergencyNO": {
    "name": "Emergency Stop NO (Tombol Jamur Kontak NO)",
    "desc": "Tombol darurat kontak Normally Open untuk pemicu sinyal alarm darurat.",
    "how": "Menutup kontak saat ditekan mengunci untuk mengaktifkan sirine bahaya atau input darurat PLC.",
    "io": [
      {
        "pin": "13",
        "type": "INPUT",
        "desc": "Input Sinyal Alarm"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "Output Sinyal ke Sirine / Lampu Strobo Darurat"
      }
    ]
  },
  "emergencyCON": {
    "name": "Emergency Stop Changeover (SPDT Emergency)",
    "desc": "Tombol jamur darurat dengan kontak tukar Common-NC-NO berkunci.",
    "how": "Saat ditekan, memutus sirkuit utama (11-12) dan seketika menyambungkan sirkuit indikasi darurat (11-14).",
    "io": [
      {
        "pin": "11",
        "type": "INPUT",
        "desc": "Terminal Common Bersama Masukan"
      },
      {
        "pin": "12",
        "type": "OUTPUT",
        "desc": "Kontak NC (Jalur kontrol sistem operasi)"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "Kontak NO (Jalur alarm peringatan bahaya)"
      }
    ]
  },
  "emergencyNONC": {
    "name": "Emergency Stop Double (NC + NO Bebas)",
    "desc": "Tombol jamur darurat industri standar keselamatan kategori 4 dengan kontak ganda NC dan NO terpisah.",
    "how": "Blok kontak NC 11-12 memutus koil kontaktor daya, sedangkan blok kontak NO 13-14 mengirimkan sinyal interupsi ke modul safety.",
    "io": [
      {
        "pin": "11, 12",
        "type": "CONTROL",
        "desc": "Kontak NC Pemutus Sirkuit Kontrol Daya"
      },
      {
        "pin": "13, 14",
        "type": "CONTROL",
        "desc": "Kontak NO Penyala Alarm Darurat / PLC Input"
      }
    ]
  },
  "rollerNO": {
    "name": "Limit Switch Roller NO (Sakelar Batas NO)",
    "desc": "Sakelar batas mekanis tuas rol (*Roller Lever Limit Switch*) kontak Normally Open.",
    "how": "Diaktifkan oleh gerakan fisik objek (misal sangkar lift barang atau silinder hidrolik menyentuh rol). Kontak 13-14 menutup saat tuas tertekan.",
    "io": [
      {
        "pin": "13",
        "type": "INPUT",
        "desc": "Input Sinyal Deteksi Batas"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "Output Sinyal Menutup saat Rol Tertekan Objek"
      }
    ]
  },
  "rollerNC": {
    "name": "Limit Switch Roller NC (Sakelar Batas NC)",
    "desc": "Sakelar batas mekanis tuas rol kontak Normally Closed untuk pembatas langkah gerak mesin (*Over-travel Stop*).",
    "how": "Dalam kondisi bebas kontak tertutup (11-12 menyambung). Ketika mesin mencapai titik batas ekstrem dan menabrak rol, kontak membuka seketika menghentikan motor.",
    "io": [
      {
        "pin": "11",
        "type": "INPUT",
        "desc": "Input Jalur Kontrol Gerak Motor"
      },
      {
        "pin": "12",
        "type": "OUTPUT",
        "desc": "Output Membuka Mematikan Motor saat Batas Tercapai"
      }
    ]
  },
  "rollerCON": {
    "name": "Limit Switch Roller CON (SPDT Limit Switch)",
    "desc": "Sakelar batas tuas rol dengan kontak alih Changeover Common-NC-NO.",
    "how": "Saat rol tertekan, memutus arah gerak saat ini (11-12) dan mengaktifkan rangkaian arah berikutnya / indikator posisi (11-14).",
    "io": [
      {
        "pin": "11",
        "type": "INPUT",
        "desc": "Common Masukan"
      },
      {
        "pin": "12",
        "type": "OUTPUT",
        "desc": "NC Terputus saat Rol Terbentur"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "NO Terhubung saat Rol Terbentur"
      }
    ]
  },
  "rollerNONC": {
    "name": "Limit Switch Roller Double (NC + NO Terpisah)",
    "desc": "Sakelar pembatas gerak rol industri dengan kontak ganda independen 11-12 NC dan 23-24 NO.",
    "how": "Menghentikan motor melalui kontak NC 11-12 sekaligus memberikan sinyal konfirmasi posisi sampai ke lampu/PLC via kontak NO 23-24.",
    "io": [
      {
        "pin": "11, 12",
        "type": "CONTROL",
        "desc": "Kontak NC Penghenti Gerak Motor"
      },
      {
        "pin": "23, 24",
        "type": "CONTROL",
        "desc": "Kontak NO Indikator Posisi / Interlock"
      }
    ]
  },
  "switchNO": {
    "name": "Sakelar Pemilih NO (Selector Switch NO)",
    "desc": "Sakelar putar 2 posisi (0 - 1) dengan kontak Normally Open pengunci posisi (Maintained).",
    "how": "Saat diputar ke posisi 1, kontak 13-14 menutup dan tetap tertutup tanpa perlu ditahan oleh operator.",
    "io": [
      {
        "pin": "13",
        "type": "INPUT",
        "desc": "Terminal Masukan Fasa Kontrol"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Aktif saat Posisi 1"
      }
    ]
  },
  "switchNC": {
    "name": "Sakelar Pemilih NC (Selector Switch NC)",
    "desc": "Sakelar putar 2 posisi kontak Normally Closed.",
    "how": "Kontak 11-12 menyambung di posisi 0, dan membuka saat diputar ke posisi 1.",
    "io": [
      {
        "pin": "11",
        "type": "INPUT",
        "desc": "Masukan Kontrol"
      },
      {
        "pin": "12",
        "type": "OUTPUT",
        "desc": "Keluaran Terputus di Posisi 1"
      }
    ]
  },
  "switchCON": {
    "name": "Sakelar Tukar / Sakelar Hotel (Two-Way Switch SPDT)",
    "desc": "Sakelar pengalih 1 kutub 2 arah untuk sistem kontrol penerangan tangga atau kontrol 2 lokasi.",
    "how": "Memilih antara jalur 11-12 atau jalur 11-14. Jika dipasang berpasangan, lampu dapat dinyalakan atau dimatikan dari dua tempat berbeda secara independen.",
    "io": [
      {
        "pin": "11",
        "type": "INPUT",
        "desc": "Terminal Induk Common (Masukan Fasa Sumber)"
      },
      {
        "pin": "12",
        "type": "OUTPUT",
        "desc": "Terminal Cabang Arah 1 (Jalur Kawat Travel 1)"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "Terminal Cabang Arah 2 (Jalur Kawat Travel 2)"
      }
    ]
  },
  "switchNONC": {
    "name": "Sakelar Selector 2-Posisi Ganda (NC + NO)",
    "desc": "Sakelar putar maintained dengan dua blok kontak terpisah 11-12 NC dan 13-14 NO.",
    "how": "Saat diputar ON, memutuskan sirkuit pertama dan mengaktifkan sirkuit kedua secara bersamaan.",
    "io": [
      {
        "pin": "11, 12",
        "type": "CONTROL",
        "desc": "Kontak NC Membuka saat Posisi ON"
      },
      {
        "pin": "13, 14",
        "type": "CONTROL",
        "desc": "Kontak NO Menutup saat Posisi ON"
      }
    ]
  },
  "switchCrossover": {
    "name": "Sakelar Silang (Intermediate / Cross Switch)",
    "desc": "Sakelar silang 4 terminal untuk mengontrol beban lampu dari 3 tempat atau lebih.",
    "how": "Membalik koneksi antara pasangan input (1,3) dan output (2,4) secara diagonal bersilang.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Pasangan Masukan Jalur Kawat Travel dari Sakelar Tukar 1"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Pasangan Keluaran Jalur Kawat Travel ke Sakelar Tukar 2"
      }
    ]
  },
  "switch3p0": {
    "name": "Sakelar Selector 3-Posisi Netral (I - 0 - II / Auto-Off-Manual)",
    "desc": "Sakelar pemilih putar 3 posisi dengan posisi nol (0) netral di tengah untuk pemilihan mode kerja panel.",
    "how": "Posisi 0 = OFF (Netral terbuka total). Posisi 1 (I) = Menghubungkan Common 2 ke Terminal 1 (Mode Auto). Posisi 2 (II) = Menghubungkan Common 2 ke Terminal 3 (Mode Manual). Pada simulasi Mashimurelay, posisi switch dapat diklik langsung di kanvas atau via inspector.",
    "io": [
      {
        "pin": "2",
        "type": "INPUT",
        "desc": "Terminal Common Utama Masukan Fasa"
      },
      {
        "pin": "1",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Posisi I (Contoh: Mode Otomatis / Sensor)"
      },
      {
        "pin": "3",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Posisi II (Contoh: Mode Manual / Push Button)"
      }
    ]
  },
  "switch3p": {
    "name": "Sakelar Selector 3-Posisi Berurutan (I - II - III)",
    "desc": "Sakelar putar pemilihan 3 tingkat tanpa posisi netral untuk kontrol multi-kecepatan atau multi-beban.",
    "how": "Memilih salah satu dari 3 kontak keluaran (2, 3, 4) dari terminal sumber masukan 1 secara berurutan.",
    "io": [
      {
        "pin": "1",
        "type": "INPUT",
        "desc": "Terminal Common Masukan Daya"
      },
      {
        "pin": "2",
        "type": "OUTPUT",
        "desc": "Output Posisi I (Kecepatan 1 / Beban 1)"
      },
      {
        "pin": "3",
        "type": "OUTPUT",
        "desc": "Output Posisi II (Kecepatan 2 / Beban 2)"
      },
      {
        "pin": "4",
        "type": "OUTPUT",
        "desc": "Output Posisi III (Kecepatan 3 / Beban 3)"
      }
    ]
  },
  "coil": {
    "name": "Koil Kontaktor / Relai Elektromagnetik (-KM / -K)",
    "desc": "Kumparan kawat tembaga elektromagnetik penggerak inti besi kontaktor magnetik atau relai kendali.",
    "how": "Ketika terminal A1 dan A2 dialiri tegangan nominal (misal 230V AC), kumparan menghasilkan fluks magnet kuat yang menarik jangkar besi (armature) ke bawah. Hal ini menutup semua kontak utama kontaktor (1-2, 3-4, 5-6) dan mengubah status kontak bantu (NO 13-14 menutup, NC 21-22 membuka). Pada simulasi Mashimurelay, koil menyala merah/hijau terang disertai efek bunyi klik mekanikal.",
    "io": [
      {
        "pin": "A1",
        "type": "INPUT",
        "desc": "Terminal Masukan Fasa / Positif Koil (Dari rangkaian kendali tombol Start/pengunci)"
      },
      {
        "pin": "A2",
        "type": "NEUTRAL",
        "desc": "Terminal Arus Balik Netral / Negatif Koil"
      }
    ],
    "simVideo": "dol_starter"
  },
  "coilDelayOn": {
    "name": "Koil Relai Timer On-Delay (-KT / Timer Delay On)",
    "desc": "Relai penunda waktu hidup (On-Delay Time Relay) elektromagnetik/elektronik.",
    "how": "Saat koil A1-A2 diberi tegangan, pewaktu internal mulai menghitung mundur sesuai nilai preset (misal 5.0s). Selama masa hitung, kontak bantu belum berubah. Begitu waktu tunda habis (Time-Up), kontak bantu berasosiasi (NO 67-68 menutup, NC 55-56 membuka). Jika tegangan A1-A2 terputus sewaktu-waktu, timer langsung me-reset ke kondisi awal.",
    "io": [
      {
        "pin": "A1",
        "type": "INPUT",
        "desc": "Input Fasa Pemicu Pewaktu (Tegangan Kontrol)"
      },
      {
        "pin": "A2",
        "type": "NEUTRAL",
        "desc": "Input Netral Relai Pewaktu"
      }
    ],
    "simVideo": "dol_starter"
  },
  "coilDelayOff": {
    "name": "Koil Relai Timer Off-Delay (-KT / Timer Delay Off)",
    "desc": "Relai penunda waktu mati (Off-Delay Time Relay) penahan kontak setelah sumber listrik diputus.",
    "how": "Saat koil A1-A2 diberi tegangan, kontak bantu langsung berubah seketika tanpa jeda. Namun saat tegangan A1-A2 diputus (OFF), kontak bantu tetap tertahan aktif selama waktu delay yang disetel, baru kemudian kembali membuka/menutup ke posisi normal.",
    "io": [
      {
        "pin": "A1",
        "type": "INPUT",
        "desc": "Input Tegangan Kontrol Koil Off-Delay"
      },
      {
        "pin": "A2",
        "type": "NEUTRAL",
        "desc": "Input Netral Koil Off-Delay"
      }
    ],
    "simVideo": "dol_starter"
  },
  "coilDelayOnOff": {
    "name": "Koil Timer Kombinasi On-Off Delay (-KT)",
    "desc": "Pewaktu terpadu yang menerapkan penundaan waktu saat aktivasi (On-Delay) dan saat deaktivasi (Off-Delay).",
    "how": "Menunda sesaat saat dinyalakan dan menahan sesaat saat dimatikan, ideal untuk kontrol ventilasi gas berbahaya dan pre-lubrication mesin industri.",
    "io": [
      {
        "pin": "A1",
        "type": "INPUT",
        "desc": "Input Sinyal Pemicu On-Off Delay"
      },
      {
        "pin": "A2",
        "type": "NEUTRAL",
        "desc": "Input Netral Timer"
      }
    ]
  },
  "flasher": {
    "name": "Flasher Otomotif (Inline Flasher)",
    "desc": "Komponen kelistrikan yang digunakan untuk menghasilkan sinyal kedipan pada lampu sein atau lampu tanda peringatan (hazard) secara periodik otomatis.",
    "how": "Arus masuk melalui terminal 49 dan diteruskan ke beban lampu melalui terminal 49a. Flasher secara otomatis menyambung dan memutus aliran arus secara periodik langsung, menghasilkan efek kedipan lampu yang teratur.",
    "io": [
      {
        "pin": "49",
        "type": "INPUT",
        "desc": "Input Daya Positif (dari Saklar Kontak)"
      },
      {
        "pin": "49a",
        "type": "OUTPUT",
        "desc": "Output Berkedip (ke Beban Lampu / Saklar Sein)"
      }
    ]
  },
  "coilFlasher": {
    "name": "Koil Relai Flasher / Flicker (-KT / Asymmetric Timer)",
    "desc": "Relai pewaktu kedip asimetris siklis otomatis yang beroperasi berulang tanpa henti.",
    "how": "Ketika koil A1-A2 menerima daya, relai mengaktifkan dan menonaktifkan kontak secara bergantian terus-menerus (ON selama T_on, lalu OFF selama T_off). Di Mashimurelay, interval ON dan OFF dapat disetel terpisah melalui panel properties.",
    "io": [
      {
        "pin": "A1",
        "type": "INPUT",
        "desc": "Input Daya Suplai Siklus Kedip"
      },
      {
        "pin": "A2",
        "type": "NEUTRAL",
        "desc": "Terminal Netral Pembalik Arus"
      }
    ]
  },
  "coilLatch": {
    "name": "Koil Relai Impuls / Latching Relay (-K / Relai Tangga)",
    "desc": "Relai bistabil (Impulse Relay) yang mengubah status kontak setiap menerima satu pulsa tegangan.",
    "how": "Pulsa tegangan pertama pada A1-A2 mengunci kontak ke posisi ON permanen (meskipun tegangan A1-A2 telah hilang). Pulsa tegangan kedua pada A1-A2 memicu tuas mekanik melepaskan kuncian ke posisi OFF.",
    "io": [
      {
        "pin": "A1",
        "type": "INPUT",
        "desc": "Terminal Masukan Pulsa Tegangan Pemicu"
      },
      {
        "pin": "A2",
        "type": "NEUTRAL",
        "desc": "Terminal Netral Pulsa"
      }
    ]
  },
  "coilSolenoid": {
    "name": "Koil Katup Solenoida Elektro-Pneumatik (+EV / Solenoid Valve)",
    "desc": "Aktuator kumparan elektromagnetik penggerak katup fluida, angin pneumatik, atau oli hidrolik.",
    "how": "Saat dialiri arus A1-A2, medan magnet menarik plunger katup untuk membuka aliran fluida/udara silinder pneumatik.",
    "io": [
      {
        "pin": "A1",
        "type": "INPUT",
        "desc": "Input Sinyal Penggerak Katup Solenoid"
      },
      {
        "pin": "A2",
        "type": "NEUTRAL",
        "desc": "Netral Katup Solenoid"
      }
    ]
  },
  "contactNO": {
    "name": "Kontak Bantu Normally Open (Aux Contact NO 13-14)",
    "desc": "Kontak bantu sesaat normally open berpasangan dengan koil kontaktor (-KM) atau relai (-K).",
    "how": "Berfungsi utama sebagai kontak pengunci mandiri (Self-Holding / Latching) yang dipasang paralel dengan push button Start. Saat koil aktif, kontak 13-14 menutup mengalirkan arus mem-bypass tombol Start.",
    "io": [
      {
        "pin": "13",
        "type": "INPUT",
        "desc": "Terminal Masukan NO (Terhubung paralel ke input Start NO)"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran NO (Terhubung paralel ke output Start NO / Koil A1)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "contactNC": {
    "name": "Kontak Bantu Normally Closed (Aux Contact NC 11-12 / 21-22)",
    "desc": "Kontak bantu normally closed untuk proteksi interlock elektrik antar-kontaktor berlawanan.",
    "how": "Dalam kondisi normal tertutup. Saat koil kontaktor pasangannya aktif, kontak ini membuka. Pada rangkaian Forward-Reverse atau Star-Delta, NC kontaktor 1 dipasang seri ke koil kontaktor 2 untuk mencegah kedua kontaktor aktif bersamaan yang menyebabkan korsleting antar-fasa.",
    "io": [
      {
        "pin": "11",
        "type": "INPUT",
        "desc": "Terminal Masukan Fasa Interlock"
      },
      {
        "pin": "12",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Menuju Koil Kontaktor Lawan"
      }
    ],
    "simVideo": "dol_starter"
  },
  "contactCON": {
    "name": "Kontak Bantu Changeover (SPDT Aux Contact 11-12-14)",
    "desc": "Kontak bantu alih satu kutub dua arah pada relai kontrol.",
    "how": "Terminal 11 terhubung ke 12 (NC) saat koil mati, dan berpindah terhubung ke 14 (NO) saat koil energized.",
    "io": [
      {
        "pin": "11",
        "type": "INPUT",
        "desc": "Terminal Common Bersama Masukan"
      },
      {
        "pin": "12",
        "type": "OUTPUT",
        "desc": "Kontak NC (Menghubungkan sinyal saat relai OFF)"
      },
      {
        "pin": "14",
        "type": "OUTPUT",
        "desc": "Kontak NO (Menghubungkan sinyal saat relai ON)"
      }
    ]
  },
  "contactNONC": {
    "name": "Kontak Bantu Ganda Bebas (NC + NO 11-12 & 23-24)",
    "desc": "Kombinasi 1 pasang kontak NC dan 1 pasang kontak NO independen dalam satu blok aksesori.",
    "how": "Memberikan fleksibilitas pengawatan interlock dan pengunci dalam satu blok komponen.",
    "io": [
      {
        "pin": "11, 12",
        "type": "CONTROL",
        "desc": "Pasangan Kontak NC (Membuka saat koil aktif)"
      },
      {
        "pin": "23, 24",
        "type": "CONTROL",
        "desc": "Pasangan Kontak NO (Menutup saat koil aktif)"
      }
    ]
  },
  "contactNODelayOn": {
    "name": "Kontak Tunda Hidup NO (On-Delay Contact NO 67-68)",
    "desc": "Kontak bantu tunda waktu Normally Open sesuai standar EN 50005.",
    "how": "Diberi Tag sama dengan koil timer (-KT1). Saat koil timer aktif, kontak ini tetap terbuka selama masa hitung mundur, dan baru menutup sempurna setelah waktu tunda tercapai (misal untuk memindahkan rangkaian Star ke Delta).",
    "io": [
      {
        "pin": "67",
        "type": "INPUT",
        "desc": "Terminal Masukan Kontak Tunda NO"
      },
      {
        "pin": "68",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Kontak Tunda NO (Menutup setelah Time-Up)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "contactNCDelayOn": {
    "name": "Kontak Tunda Hidup NC (On-Delay Contact NC 55-56)",
    "desc": "Kontak bantu tunda waktu Normally Closed sesuai standar EN 50005.",
    "how": "Menyambung saat normal dan selama masa hitung mundur timer. Begitu waktu tunda habis, kontak 55-56 membuka seketika (contoh: mematikan kontaktor Star saat transisi ke Delta).",
    "io": [
      {
        "pin": "55",
        "type": "INPUT",
        "desc": "Terminal Masukan Kontak Tunda NC"
      },
      {
        "pin": "56",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Kontak Tunda NC (Membuka setelah Time-Up)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "contactCONDelayOn": {
    "name": "Kontak Tunda Hidup Tukar (On-Delay SPDT 55-56-58)",
    "desc": "Kontak alih tunda waktu Common-NC-NO untuk pengalihan sirkuit otomatis berbasis waktu.",
    "how": "Terminal 55 mengalirkan arus ke 56 (NC) selama delay, lalu berpindah serentak ke 58 (NO) saat delay berakhir.",
    "io": [
      {
        "pin": "55",
        "type": "INPUT",
        "desc": "Terminal Common Masukan Kontak Timer"
      },
      {
        "pin": "56",
        "type": "OUTPUT",
        "desc": "Output NC Tunda (Membuka setelah delay)"
      },
      {
        "pin": "58",
        "type": "OUTPUT",
        "desc": "Output NO Tunda (Menutup setelah delay)"
      }
    ]
  },
  "contactNONCDelayOn": {
    "name": "Kontak Tunda Hidup Ganda (On-Delay NC 55-56 & NO 67-68)",
    "desc": "Pasangan kontak tunda waktu NC dan NO independen untuk otomasi starter motor Star-Delta.",
    "how": "NC 55-56 memutuskan kontaktor bintang Star tepat sebelum NO 67-68 menyalakan kontaktor segitiga Delta.",
    "io": [
      {
        "pin": "55, 56",
        "type": "CONTROL",
        "desc": "Kontak NC Delay (Membuka saat timer selesai menghitung)"
      },
      {
        "pin": "67, 68",
        "type": "CONTROL",
        "desc": "Kontak NO Delay (Menutup saat timer selesai menghitung)"
      }
    ]
  },
  "contactNODelayOff": {
    "name": "Kontak Tunda Mati NO (Off-Delay Contact NO 67-68)",
    "desc": "Kontak Normally Open yang menutup seketika saat koil menyala dan tertahan menutup saat koil dimatikan.",
    "how": "Tetap menyalurkan arus selama durasi Off-Delay meskipun saklar pengendali utama sudah dipadamkan.",
    "io": [
      {
        "pin": "67",
        "type": "INPUT",
        "desc": "Masukan Kontak Off-Delay NO"
      },
      {
        "pin": "68",
        "type": "OUTPUT",
        "desc": "Keluaran Kontak Tertahan Menutup selama masa Off-Delay"
      }
    ]
  },
  "contactNCDelayOff": {
    "name": "Kontak Tunda Mati NC (Off-Delay Contact NC 55-56)",
    "desc": "Kontak Normally Closed yang membuka seketika saat koil menyala dan tertahan membuka saat koil mati.",
    "how": "Menahan rangkaian lain agar tidak langsung hidup kembali sebelum periode pendinginan/delay selesai.",
    "io": [
      {
        "pin": "55",
        "type": "INPUT",
        "desc": "Masukan Kontak Off-Delay NC"
      },
      {
        "pin": "56",
        "type": "OUTPUT",
        "desc": "Keluaran Kontak Tertahan Membuka selama masa Off-Delay"
      }
    ]
  },
  "contactCONDelayOff": {
    "name": "Kontak Tunda Mati Tukar (Off-Delay SPDT 55-56-58)",
    "desc": "Kontak alih tunda mati dengan Common 55, NC 56, dan NO 58.",
    "how": "Menjaga status peralihan kontak selama waktu tunda pasca matinya koil pemicu.",
    "io": [
      {
        "pin": "55",
        "type": "INPUT",
        "desc": "Terminal Common Masukan"
      },
      {
        "pin": "56",
        "type": "OUTPUT",
        "desc": "Output NC Tertahan"
      },
      {
        "pin": "58",
        "type": "OUTPUT",
        "desc": "Output NO Tertahan"
      }
    ]
  },
  "contactNONCDelayOff": {
    "name": "Kontak Tunda Mati Ganda (Off-Delay NC 55-56 & NO 67-68)",
    "desc": "Blok kontak ganda tunda mati independen untuk sistem keselamatan deselerasi mesin industri.",
    "how": "Mengamankan sistem pengereman dinamis motor dengan mempertahankan daya rem selama waktu deselerasi.",
    "io": [
      {
        "pin": "55, 56",
        "type": "CONTROL",
        "desc": "Kontak NC Tertahan Membuka selama Off-Delay"
      },
      {
        "pin": "67, 68",
        "type": "CONTROL",
        "desc": "Kontak NO Tertahan Menutup selama Off-Delay"
      }
    ]
  },
  "contactor1p": {
    "name": "Kontaktor Daya Utama 1-Pole (Power Contactor 1P)",
    "desc": "Sakelar daya elektromagnetik kutub tunggal untuk menyambung beban pemanas atau motor 1-fasa berarus besar.",
    "how": "Kontak utama 1-2 digerakkan oleh koil dengan tag sama (-KM). Saat koil energized, kontak menutup kuat mengalirkan arus daya beban.",
    "io": [
      {
        "pin": "1",
        "type": "INPUT",
        "desc": "Terminal Masukan Daya Line 1 (L1)"
      },
      {
        "pin": "2",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Daya Beban (T1)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "contactor2p": {
    "name": "Kontaktor Daya Utama 2-Pole (Power Contactor 2P)",
    "desc": "Kontaktor daya 2 kutub untuk beban fasa-netral atau pemutus beban DC daya tinggi.",
    "how": "Mengalirkan arus daya besar pada jalur 1-2 dan 3-4 secara serempak saat koil magnetik aktif.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Masukan Daya Kutub 1 dan Kutub 2 (L1, L2 / Fasa, Netral)"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Keluaran Daya Beban Kutub 1 dan Kutub 2 (T1, T2)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "contactor3p": {
    "name": "Kontaktor Daya Utama 3-Pole (Three-Pole Power Contactor -KM1)",
    "desc": "Kontaktor magnetik daya utama 3-fasa standar industri untuk rangkaian Direct-On-Line (DOL), Forward-Reverse, dan Star-Delta.",
    "how": "Memiliki 3 pasang kontak daya kokoh (1-2, 3-4, 5-6) yang dikopel ke jangkar koil magnetik -KM1. Saat koil A1-A2 diberi tegangan, ketiga kontak daya menutup serempak menyalurkan daya 400V AC dari MCB menuju motor induksi 3-fasa. Pada simulasi Mashimurelay, kawat daya tebal akan menyala sesuai potensial fasanya.",
    "io": [
      {
        "pin": "1, 3, 5",
        "type": "INPUT",
        "desc": "Terminal Masukan Daya Jaringan (1/L1, 3/L2, 5/L3)"
      },
      {
        "pin": "2, 4, 6",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Daya ke Beban / Overload (2/T1, 4/T2, 6/T3)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "contactor4p": {
    "name": "Kontaktor Daya Utama 4-Pole (Power Contactor 4P)",
    "desc": "Kontaktor daya 4 kutub untuk sistem sakelar pemindah daya otomatis ATS (Automatic Transfer Switch).",
    "how": "Menghubungkan atau memutus 3 jalur fasa dan 1 jalur netral secara simultan untuk memindahkan suplai daya dari PLN ke Genset tanpa risiko pergeseran netral.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Masukan Daya 4-Kawat (1/L1, 3/L2, 5/L3, 7/N)"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Keluaran Daya 4-Kawat Terkopel (2/T1, 4/T2, 6/T3, 8/N)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "contactorNC1p": {
    "name": "Kontaktor Daya NC 1-Pole",
    "desc": "Kontaktor daya normally closed 1 kutub yang memutus beban daya saat koil aktif.",
    "how": "Menghubungkan daya saat koil mati, dan memutuskan daya beban saat koil energized.",
    "io": [
      {
        "pin": "1",
        "type": "INPUT",
        "desc": "Masukan Daya NC"
      },
      {
        "pin": "2",
        "type": "OUTPUT",
        "desc": "Keluaran Daya NC"
      }
    ]
  },
  "contactorNC2p": {
    "name": "Kontaktor Daya NC 2-Pole",
    "desc": "Kontaktor daya normally closed 2 kutub untuk sistem penghentian darurat daya ganda.",
    "how": "Membuka kedua kontak daya 1-2 dan 3-4 seketika saat koil pengendali mendapat tegangan.",
    "io": [
      {
        "pin": "1, 3",
        "type": "INPUT",
        "desc": "Masukan Daya 2-Kutub NC"
      },
      {
        "pin": "2, 4",
        "type": "OUTPUT",
        "desc": "Keluaran Daya 2-Kutub NC"
      }
    ]
  },
  "contactorNC3p": {
    "name": "Kontaktor Daya NC 3-Pole",
    "desc": "Kontaktor daya 3 kutub normally closed untuk pengereman dinamis motor (*dynamic braking*).",
    "how": "Menghubungkan resistor pengereman ke lilitan motor saat kontaktor utama mati, dan membuka saat kontaktor jalan aktif.",
    "io": [
      {
        "pin": "1, 3, 5",
        "type": "INPUT",
        "desc": "Masukan 3-Fasa NC"
      },
      {
        "pin": "2, 4, 6",
        "type": "OUTPUT",
        "desc": "Keluaran 3-Fasa NC ke Resistor Pengereman"
      }
    ]
  },
  "contactorNC4p": {
    "name": "Kontaktor Daya NC 4-Pole",
    "desc": "Kontaktor daya 4 kutub normally closed untuk isolasi fail-safe sistem daya 4-kawat.",
    "how": "Membuka seluruh 4 kutub daya saat sistem proteksi mengaktifkan koil kontaktor.",
    "io": [
      {
        "pin": "1, 3, 5, 7",
        "type": "INPUT",
        "desc": "Input 4-Kutub NC"
      },
      {
        "pin": "2, 4, 6, 8",
        "type": "OUTPUT",
        "desc": "Output 4-Kutub NC"
      }
    ]
  },
  "motor1ph": {
    "name": "Motor Induksi 1-Fasa (Single-Phase AC Motor)",
    "desc": "Motor listrik arus bolak-balik fasa tunggal 230V AC untuk pompa air, kipas blower, dan kompresor.",
    "how": "Berputar ketika terminal 1 dialiri fasa dan terminal 2 terhubung ke netral. Di dalam motor terdapat belitan utama dan belitan bantu dengan kapasitor geser fasa.",
    "io": [
      {
        "pin": "1",
        "type": "INPUT",
        "desc": "Terminal Fasa Masukan (230V AC)"
      },
      {
        "pin": "2",
        "type": "NEUTRAL",
        "desc": "Terminal Netral Arus Balik"
      }
    ],
    "simVideo": "dol_starter"
  },
  "motor3ph": {
    "name": "Motor Induksi 3-Fasa Sangkar Tupai (Three-Phase Induction Motor - M 3~)",
    "desc": "Motor listrik arus bolak-balik 3-fasa rotor sangkar tupai (*Squirrel Cage*) standar industri IEC 60034.",
    "how": "Tiga belitan stator menerima tegangan 3-fasa seimbang (U, V, W) yang menghasilkan medan magnet putar pada celah udara, menginduksi arus pada batang rotor dan memutar poros motor. Pada simulasi Mashimurelay, motor berputar searah jarum jam (CW) jika urutan fasa U-V-W normal, dan berputar berlawanan jarum jam (CCW) jika dua fasa masukan ditukar.",
    "io": [
      {
        "pin": "U",
        "type": "INPUT",
        "desc": "Terminal Belitan Fasa 1 (Terhubung ke T1 kontaktor)"
      },
      {
        "pin": "V",
        "type": "INPUT",
        "desc": "Terminal Belitan Fasa 2 (Terhubung ke T2 kontaktor)"
      },
      {
        "pin": "W",
        "type": "INPUT",
        "desc": "Terminal Belitan Fasa 3 (Terhubung ke T3 kontaktor)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "motorDC": {
    "name": "Motor Listrik Arus Searah (DC Motor M =)",
    "desc": "Motor listrik bertenaga DC dengan karakteristik torsi awal tinggi dan kemudahan kendali kecepatan.",
    "how": "Berputar saat terminal X1 dialiri potensial positif (+) dan X2 dialiri potensial negatif (-). Arah putaran motor dapat dibalik seketika dari searah jarum jam (CW) ke berlawanan jarum jam (CCW) cukup dengan menukar polaritas kabel masukan pada X1 dan X2.",
    "io": [
      {
        "pin": "X1",
        "type": "INPUT",
        "desc": "Terminal Angker 1 (Kutub Positif DC untuk putaran CW)"
      },
      {
        "pin": "X2",
        "type": "NEUTRAL",
        "desc": "Terminal Angker 2 (Kutub Negatif DC untuk putaran CW)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "motorStarDelta": {
    "name": "Motor 3-Fasa Star-Delta 6-Terminal (Star/Delta Motor)",
    "desc": "Motor induksi 3-fasa dengan keenam ujung belitan stator dikeluarkan ke kotak terminal sesuai IEC 60034-8.",
    "how": "Memiliki 6 terminal: U1, V1, W1 (ujung awal) dan W2, U2, V2 (ujung akhir). Pada saat start awal (Star), terminal W2-U2-V2 dihubung singkat oleh kontaktor bintang untuk menurunkan arus start hingga 1/3 In. Setelah beberapa detik (dikendalikan timer), kontaktor bintang membuka dan kontaktor delta menghubungkan U1-W2, V1-U2, W1-V2 ke tegangan jala-jala penuh.",
    "io": [
      {
        "pin": "U1, V1, W1",
        "type": "INPUT",
        "desc": "Ujung Awal Belitan Stator (Terhubung ke Kontaktor Utama)"
      },
      {
        "pin": "W2, U2, V2",
        "type": "OUTPUT",
        "desc": "Ujung Akhir Belitan Stator (Terhubung ke Kontaktor Star dan Kontaktor Delta)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "motorDhalander": {
    "name": "Motor 3-Fasa Dahlander 2-Kecepatan (Dahlander Pole-Changing Motor)",
    "desc": "Motor induksi dua kecepatan dengan belitan tunggal bertapped tengah (*tapped winding*) berasio kecepatan 1:2.",
    "how": "Menghasilkan kecepatan rendah (*Low Speed*) saat daya 3-fasa dihubungkan ke terminal U1, V1, W1 (konfigurasi Segitiga Seri). Menghasilkan kecepatan tinggi (*High Speed*) saat U1-V1-W1 dihubung singkat dan daya 3-fasa dimasukkan ke terminal U2, V2, W2 (konfigurasi Bintang Paralel Ganda YY).",
    "io": [
      {
        "pin": "U1, V1, W1",
        "type": "INPUT",
        "desc": "Terminal Kecepatan Rendah (Konfigurasi Delta)"
      },
      {
        "pin": "U2, V2, W2",
        "type": "INPUT",
        "desc": "Terminal Kecepatan Tinggi (Konfigurasi Bintang Ganda YY)"
      }
    ],
    "simVideo": "dol_starter"
  },
  "motorTwoSpeeds": {
    "name": "Motor 3-Fasa 2-Kecepatan Belitan Terpisah (Separate Winding Two-Speed Motor)",
    "desc": "Motor listrik 3-fasa dengan dua set belitan stator independen yang memiliki jumlah kutub berbeda.",
    "how": "Setiap kecepatan memiliki belitan mandiri. Menyuplai U1-V1-W1 memutar motor pada kecepatan 1 (misal 950 RPM 6-pole). Menyuplai U2-V2-W2 memutar motor pada kecepatan 2 (misal 1450 RPM 4-pole). Kedua set belitan wajib di-interlock agar tidak mendapat daya bersamaan.",
    "io": [
      {
        "pin": "U1, V1, W1",
        "type": "INPUT",
        "desc": "Terminal Masukan 3-Fasa Belitan Kecepatan 1"
      },
      {
        "pin": "U2, V2, W2",
        "type": "INPUT",
        "desc": "Terminal Masukan 3-Fasa Belitan Kecepatan 2"
      }
    ],
    "simVideo": "dol_starter"
  },
  "lamp": {
    "name": "Lampu Indikator Panel (Pilot Lamp)",
    "desc": "Lampu sinyal visual LED industri untuk menunjukkan status operasional rangkaian kendali.",
    "how": "Menyala terang ketika terminal X1 mendapat fasa dan X2 terhubung ke netral. Di Mashimurelay, warna lampu dapat diubah (Merah untuk Stop/Trip, Hijau untuk Running, Kuning/Orange untuk Standby/Peringatan, Biru, Putih).",
    "io": [
      {
        "pin": "X1",
        "type": "INPUT",
        "desc": "Terminal Masukan Fasa / Positif Sinyal Lampu"
      },
      {
        "pin": "X2",
        "type": "NEUTRAL",
        "desc": "Terminal Arus Balik Netral / Negatif"
      }
    ],
    "simVideo": "dol_starter"
  },
  "lampBlink": {
    "name": "Lampu Indikator Berkedip (Flashing Pilot Lamp)",
    "desc": "Lampu sinyal visual dengan osilator kedip internal untuk tanda bahaya atau peringatan darurat.",
    "how": "Otomatis berkedip berulang (*pulsing flash*) saat dialiri tegangan X1-X2 untuk menarik perhatian operator saat terjadi trip beban lebih atau alarm sistem.",
    "io": [
      {
        "pin": "X1",
        "type": "INPUT",
        "desc": "Terminal Fasa Masukan Lampu Kedip"
      },
      {
        "pin": "X2",
        "type": "NEUTRAL",
        "desc": "Terminal Netral Lampu Kedip"
      }
    ],
    "simVideo": "thermal_overload"
  },
  "buzzer": {
    "name": "Buzzer Alarm Piezoelektrik",
    "desc": "Perangkat penghasil sinyal suara frekuensi tinggi bernada konstan untuk alarm peringatan panel.",
    "how": "Menghasilkan bunyi dengung audio saat terminal X1 dan X2 dialiri tegangan, sering dikombinasikan dengan kontak NO 97-98 TOR saat motor trip.",
    "io": [
      {
        "pin": "X1",
        "type": "INPUT",
        "desc": "Terminal Tegangan Pemicu Suara"
      },
      {
        "pin": "X2",
        "type": "NEUTRAL",
        "desc": "Terminal Netral / Ground Audio"
      }
    ],
    "simVideo": "thermal_overload"
  },
  "ring": {
    "name": "Bel Listrik Elektromekanikal (Bell Ring)",
    "desc": "Bel listrik mekanik pemukul lonceng untuk sinyal awal start mesin konveyor pabrik.",
    "how": "Menghasilkan suara denting lonceng berulang saat diberi tegangan untuk memperingatkan pekerja sebelum mesin besar mulai bergerak.",
    "io": [
      {
        "pin": "X1",
        "type": "INPUT",
        "desc": "Masukan Sinyal Bel"
      },
      {
        "pin": "X2",
        "type": "NEUTRAL",
        "desc": "Terminal Netral Bel"
      }
    ]
  },
  "siren": {
    "name": "Sirine Alarm Industri (Motorized Industrial Siren)",
    "desc": "Sirine bervolume tinggi dengan suara melengking keras untuk evakuasi darurat atau bahaya kritis.",
    "how": "Mengeluarkan suara peringatan berdesibel tinggi saat dipicu oleh sensor kebakaran atau tombol Emergency Stop NO.",
    "io": [
      {
        "pin": "X1",
        "type": "INPUT",
        "desc": "Masukan Daya Sirine Alarm"
      },
      {
        "pin": "X2",
        "type": "NEUTRAL",
        "desc": "Netral Sirine"
      }
    ]
  },
  "arrowSource": {
    "name": "Panah Pemancar Sinyal Nirkabel (Source Arrow - Ref 1 Out)",
    "desc": "Simbol panah referensi pemancar sinyal antar-lembar kerja (Cross-Reference Link) tanpa kabel fisik.",
    "how": "Memancarkan potensial listrik ke simbol panah penerima (Destination Arrow) yang memiliki Tag identik. Arus listrik melompat secara nirkabel sehingga sirkuit tetap rapi tanpa kabel yang bersilangan.",
    "io": [
      {
        "pin": "0",
        "type": "INPUT",
        "desc": "Terminal Masukan Sinyal yang akan dipancarkan"
      }
    ]
  },
  "arrowDestination": {
    "name": "Panah Penerima Sinyal Nirkabel (Destination Arrow - Ref 1 In)",
    "desc": "Simbol panah referensi penerima sinyal nirkabel dari panah sumber.",
    "how": "Menerima potensial listrik secara instan dari arrowSource yang bertag sama dan meneruskannya ke beban hilir.",
    "io": [
      {
        "pin": "0",
        "type": "OUTPUT",
        "desc": "Terminal Keluaran Sinyal Terhubung dari Sumber Panah"
      }
    ]
  },
  "diode": {
    "name": "Dioda Penyearah Semikonduktor (Silicon Rectifier Diode)",
    "desc": "Komponen semikonduktor satu arah (P-N Junction) penyearah arus bolak-balik menjadi arus searah.",
    "how": "Mengalirkan arus listrik hanya dari Anoda (Pin 0) menuju Katoda (Pin 1) saat tegangan anoda lebih positif (Forward Bias). Memblokir aliran arus total saat dipasang terbalik (Reverse Bias).",
    "io": [
      {
        "pin": "0",
        "type": "INPUT",
        "desc": "Anoda (Terminal Masukan Arus Positif)"
      },
      {
        "pin": "1",
        "type": "OUTPUT",
        "desc": "Katoda (Terminal Keluaran Beban Arus Searah)"
      }
    ]
  },
  "junction2p": {
    "name": "Sambungan Kawat Lurus (Connection Wire 2P)",
    "desc": "Segmen kawat penghantar lurus untuk menghubungkan dua titik rangkaian.",
    "how": "Meneruskan potensial tegangan listrik secara langsung tanpa rugi tegangan antara pin 0 dan pin 1.",
    "io": [
      {
        "pin": "0, 1",
        "type": "CONTROL",
        "desc": "Dua Titik Terminal Sambungan Kawat Lurus"
      }
    ]
  },
  "junction2p90": {
    "name": "Sambungan Kawat Siku 90° (Connection Wire 90°)",
    "desc": "Segmen kawat belokan sudut siku 90 derajat untuk estetika pengawatan diagram ortogonal.",
    "how": "Membelokkan jalur aliran arus listrik 90 derajat secara rapi.",
    "io": [
      {
        "pin": "0, 1",
        "type": "CONTROL",
        "desc": "Dua Titik Terminal Sambungan Belokan Siku"
      }
    ]
  },
  "junction3p": {
    "name": "Sambungan Percabangan Tiga Kawat (T-Junction 3P)",
    "desc": "Simpul percabangan listrik 3 arah (titik simpul node kelistrikan).",
    "how": "Membagi satu aliran arus listrik menjadi dua cabang paralel sesuai hukum Kirchhoff 1.",
    "io": [
      {
        "pin": "0, 1, 2",
        "type": "CONTROL",
        "desc": "Tiga Titik Terminal Simpul Percabangan T"
      }
    ]
  },
  "junction4p": {
    "name": "Sambungan Persilangan Empat Kawat (Cross Junction 4P)",
    "desc": "Simpul percabangan listrik 4 arah yang saling terhubung di satu titik potensial.",
    "how": "Menghubungkan empat jalur konduktor sekaligus pada potensial listrik yang identik.",
    "io": [
      {
        "pin": "0, 1, 2, 3",
        "type": "CONTROL",
        "desc": "Empat Titik Terminal Simpul Silang Bersama"
      }
    ]
  },
  "junctionPE": {
    "name": "Sambungan Pembumian Khusus (Ground Connection Link)",
    "desc": "Simpul khusus penyambungan konduktor proteksi pembumian PE.",
    "how": "Memastikan integritas jalur grounding dari bodi motor kembali ke elektroda tanah.",
    "io": [
      {
        "pin": "PE",
        "type": "GROUND",
        "desc": "Terminal Sambungan Konduktor Proteksi Bumi"
      }
    ]
  },
  "text": {
    "name": "Kotak Anotasi Teks Bebas (Schematic Text Label)",
    "desc": "Label teks keterangan bebas untuk judul rangkaian, penomoran kabel, spesifikasi daya, atau catatan diagram.",
    "how": "Elemen grafis non-listrik. Ukuran font dan isi teks dapat disunting langsung melalui panel properties di sebelah kanan kanvas.",
    "io": []
  }
});
