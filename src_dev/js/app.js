/**
 * Mashimurelay Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  let canvas = null;
  const isOverloadRelay = window.isOverloadRelay || function(svgData) {
    if (!svgData) return false;
    const s = svgData.toLowerCase();
    return s.startsWith('overload') || s.includes('thermal');
  };
  const isPlainFuse = window.isPlainFuse || function(svgData) {
    if (!svgData) return false;
    return svgData.startsWith('fuse') && !svgData.startsWith('fuseSwitch');
  };

  window.playFuseBlownSound = function() {
    try {
      const audioCtx = window.simAudioContext || new (window.AudioContext || window.webkitAudioContext)();
      window.simAudioContext = audioCtx;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;

      // 1. Noise burst (suara letupan kaca / percikan sekring lebur)
      const bufferSize = Math.floor(audioCtx.sampleRate * 0.08);
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.015));
      }
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.85, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      whiteNoise.start(now);

      // 2. Low-end punch (hentakan putus busur listrik)
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.07);
      oscGain.gain.setValueAtTime(0.9, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
      osc.connect(oscGain);
      oscGain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.075);
    } catch (e) {
      console.warn('Audio fuse pop error:', e);
    }
  };

  const escapeHtml = function(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const svgEl = document.getElementById('circuitSvg');
  const alertBanner = document.getElementById('shortCircuitAlert');
  const statusBadge = document.getElementById('statusBadge');
  const btnRun = document.getElementById('btnRun');
  const btnStop = document.getElementById('btnStop');
  const btnQuickSave = document.getElementById('btnQuickSave');
  const btnRotate = document.getElementById('btnRotate');
  const btnDelete = document.getElementById('btnDelete');
  const btnFit = document.getElementById('btnFit');
  const btnClear = document.getElementById('btnClear');
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnToggleTheme = document.getElementById('btnToggleTheme');
  const settingThemeGroup = document.getElementById('settingThemeGroup');
  const btnToggleSound = document.getElementById('btnToggleSound');
  const btnAutoSaveToggle = document.getElementById('btnAutoSaveToggle');
  const autoSaveStatusText = document.getElementById('autoSaveStatusText');
  const btnDashAutoSaveToggle = document.getElementById('btnDashAutoSaveToggle');
  const dashAutoSaveStatusText = document.getElementById('dashAutoSaveStatusText');
  const btnOpen = document.getElementById('btnOpen');
  const btnSave = document.getElementById('btnSave');
  const btnSaveTxt = document.getElementById('btnSaveTxt');
  const btnSaveAs = document.getElementById('btnSaveAs');
  const btnInstructions = document.getElementById('btnInstructions');
  const btnSettings = document.getElementById('btnSettings');
  const btnAbout = document.getElementById('btnAbout');
  const toastNotification = document.getElementById('toastNotification');
  const fileInput = document.getElementById('fileInput');
  const selectExamples = document.getElementById('selectExamples');
  const inspectorContent = document.getElementById('inspectorContent');
  const canvasContextMenu = document.getElementById('canvasContextMenu');

  let toastTimer = null;
  function showToast(msg, isSuccess = true) {
    if (!toastNotification) return;
    toastNotification.textContent = msg;
    toastNotification.className = 'toast-notification toast-show' + (isSuccess ? ' toast-success' : '');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastNotification.className = 'toast-notification';
    }, 2800);
  }
  const paletteContainer = document.getElementById('paletteContainer');
  const searchInput = document.getElementById('paletteSearch');
  const btnTogglePalette = document.getElementById('btnTogglePalette');
  const btnToggleInspector = document.getElementById('btnToggleInspector');
  const sidebarEl = document.querySelector('.sidebar');
  const inspectorEl = document.querySelector('.inspector');
  let activeDraggedComponentSvg = null;

  // Dashboard & Multi-Canvas DOM elements
  const btnDashboard = document.getElementById('btnDashboard');
  const btnNewCanvas = document.getElementById('btnNewCanvas');
  const activeProjectBadge = document.getElementById('activeProjectBadge');
  const activeProjectName = document.getElementById('activeProjectName');
  const modalDashboard = document.getElementById('modalDashboard');
  const btnCloseDashboard = document.getElementById('btnCloseDashboard');
  const btnDashNew = document.getElementById('btnDashNew');
  const projectGrid = document.getElementById('projectGrid');
  const projectCount = document.getElementById('projectCount');

  // Navigation Drawer DOM elements
  const btnOpenNavDrawer = document.getElementById('btnOpenNavDrawer');
  const navDrawer = document.getElementById('navDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerProjectSubtitle = document.getElementById('drawerProjectSubtitle');
  const drawerItemWorkspace = document.getElementById('drawerItemWorkspace');
  const drawerItemSave = document.getElementById('drawerItemSave');
  const drawerItemSaveAs = document.getElementById('drawerItemSaveAs');
  const drawerItemInstructions = document.getElementById('drawerItemInstructions');
  const drawerItemAbout = document.getElementById('drawerItemAbout');
  const drawerItemSettings = document.getElementById('drawerItemSettings');
  const drawerItemKit = document.getElementById('drawerItemKit');
  const btnOpenKitModal = document.getElementById('btnOpenKitModal');

  // Assignment Kit Modal DOM elements
  const modalAssignmentKit = document.getElementById('modalAssignmentKit');
  const btnCloseAssignmentKit = document.getElementById('btnCloseAssignmentKit');
  const btnCancelKit = document.getElementById('btnCancelKit');
  const btnSaveKit = document.getElementById('btnSaveKit');
  const kitToggleActive = document.getElementById('kitToggleActive');
  const inputKitName = document.getElementById('inputKitName');
  const kitComponentsSelectorGrid = document.getElementById('kitComponentsSelectorGrid');
  const kitSelectedCount = document.getElementById('kitSelectedCount');
  const kitSearchInput = document.getElementById('kitSearchInput');
  const paletteKitBanner = document.getElementById('paletteKitBanner');
  const paletteKitTitle = document.getElementById('paletteKitTitle');
  const btnManageActiveKit = document.getElementById('btnManageActiveKit');

  // Drawer Modals DOM elements
  const modalSaveAs = document.getElementById('modalSaveAs');
  const btnCloseSaveAs = document.getElementById('btnCloseSaveAs');
  const btnExportSmrlOption = document.getElementById('btnExportSmrlOption');
  const btnExportTxtOption = document.getElementById('btnExportTxtOption');
  const btnExportPdfOption = document.getElementById('btnExportPdfOption');
  const btnSaveDuplicateOption = document.getElementById('btnSaveDuplicateOption');
  const btnExportQrOption = document.getElementById('btnExportQrOption');
  const inputSaveAsFileName = document.getElementById('inputSaveAsFileName');

  // PDF Export & Student Profile Confirmation Modal DOM elements
  const modalPdfStudentInfo = document.getElementById('modalPdfStudentInfo');
  const btnClosePdfStudentInfo = document.getElementById('btnClosePdfStudentInfo');
  const btnCancelPdfExport = document.getElementById('btnCancelPdfExport');
  const btnConfirmGeneratePdf = document.getElementById('btnConfirmGeneratePdf');
  const inputPdfProjectTitle = document.getElementById('inputPdfProjectTitle');
  const inputPdfStudentName = document.getElementById('inputPdfStudentName');
  const inputPdfStudentClass = document.getElementById('inputPdfStudentClass');
  const inputPdfStudentNis = document.getElementById('inputPdfStudentNis');
  const inputPdfStudentSchool = document.getElementById('inputPdfStudentSchool');
  const inputPdfDate = document.getElementById('inputPdfDate');

  // Teacher Task Setup Modal DOM elements
  const modalTeacherTaskSetup = document.getElementById('modalTeacherTaskSetup');
  const btnCloseTeacherTaskSetup = document.getElementById('btnCloseTeacherTaskSetup');
  const btnCancelTeacherTaskSetup = document.getElementById('btnCancelTeacherTaskSetup');
  const btnConfirmTeacherTaskSetup = document.getElementById('btnConfirmTeacherTaskSetup');
  const inputTeacherTaskTitle = document.getElementById('inputTeacherTaskTitle');
  const inputTeacherTaskClass = document.getElementById('inputTeacherTaskClass');
  const inputTeacherTaskSchool = document.getElementById('inputTeacherTaskSchool');
  let pendingTaskDistributionMode = 'qr';

  // QR Circuit Export Modal DOM elements
  const modalQrExport = document.getElementById('modalQrExport');
  const btnCloseQrExport = document.getElementById('btnCloseQrExport');
  const btnCloseQrModalBtn = document.getElementById('btnCloseQrModalBtn');
  const qrCircuitTitle = document.getElementById('qrCircuitTitle');
  const qrLockStatusBadge = document.getElementById('qrLockStatusBadge');
  const qrKitStatusBadge = document.getElementById('qrKitStatusBadge');
  const qrClassBadge = document.getElementById('qrClassBadge');
  const qrSchoolBadge = document.getElementById('qrSchoolBadge');
  const qrCanvas = document.getElementById('qrCanvas');
  const btnDownloadQrPng = document.getElementById('btnDownloadQrPng');
  const btnCopyQrPayload = document.getElementById('btnCopyQrPayload');

  // Classroom Hotspot Server DOM elements
  const btnClassroomHotspotOption = document.getElementById('btnClassroomHotspotOption');
  const modalClassroomHotspot = document.getElementById('modalClassroomHotspot');
  const btnCloseClassroomModal = document.getElementById('btnCloseClassroomModal');
  const qrHotspotCanvas = document.getElementById('qrHotspotCanvas');
  const hotspotTaskTitle = document.getElementById('hotspotTaskTitle');
  const hotspotServerUrlText = document.getElementById('hotspotServerUrlText');
  const submissionCountBadge = document.getElementById('submissionCountBadge');
  const classroomSubmissionsTbody = document.getElementById('classroomSubmissionsTbody');
  const btnChangeClassroomFolder = document.getElementById('btnChangeClassroomFolder');
  const btnOpenClassroomFolder = document.getElementById('btnOpenClassroomFolder');
  const classroomFolderPathDisplay = document.getElementById('classroomFolderPathDisplay');
  const btnStopClassroomServer = document.getElementById('btnStopClassroomServer');
  const hotspotStatusLabel = document.getElementById('hotspotStatusLabel');
  const btnClassroomModePraktikum = document.getElementById('btnClassroomModePraktikum');
  const btnClassroomModeUjian = document.getElementById('btnClassroomModeUjian');
  const classroomModeDescIcon = document.getElementById('classroomModeDescIcon');
  const classroomModeDescText = document.getElementById('classroomModeDescText');
  let currentClassroomExamMode = false;
  let classroomPollInterval = null;

  const modalSettings = document.getElementById('modalSettings');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const settingAutoSaveCheckbox = document.getElementById('settingAutoSaveCheckbox');
  const settingGridSelect = document.getElementById('settingGridSelect');
  const settingGlowCheckbox = document.getElementById('settingGlowCheckbox');
  const settingTerminalLabelsCheckbox = document.getElementById('settingTerminalLabelsCheckbox');
  const settingSoundCheckbox = document.getElementById('settingSoundCheckbox');
  const settingComponentNamesCheckbox = document.getElementById('settingComponentNamesCheckbox');
  const btnSettingsClearCanvas = document.getElementById('btnSettingsClearCanvas');

  const modalWhatsNew = document.getElementById('modalWhatsNew');
  const btnCloseWhatsNew = document.getElementById('btnCloseWhatsNew');

  const modalInstructions = document.getElementById('modalInstructions');
  const btnCloseInstructions = document.getElementById('btnCloseInstructions');

  const modalAbout = document.getElementById('modalAbout');
  const btnCloseAbout = document.getElementById('btnCloseAbout');

  const floatingPill = document.getElementById('floatingPill');
  const pillLabel = document.getElementById('pillLabel');
  const pillSwitchOptions = document.getElementById('pillSwitchOptions');
  const pillEditControls = document.getElementById('pillEditControls');
  const pillBtnRotate = document.getElementById('pillBtnRotate');
  const pillBtnTag = document.getElementById('pillBtnTag');
  const pillBtnDelete = document.getElementById('pillBtnDelete');

  const CHANGEOVER_SWITCHES = new Set([
    'switchcon',
    'switchcrossover',
    'buttoncon',
    'buttoncrossover',
    'emergencycon',
    'rollercon',
    'contactcon',
    'contactcondelayon',
    'contactcondelayoff'
  ]);

  function isChangeoverSwitch(svgData) {
    if (!svgData) return false;
    const lower = svgData.toLowerCase();
    return CHANGEOVER_SWITCHES.has(lower) || lower.endsWith('con') || lower.includes('crossover');
  }

  function isPushButton(svgData) {
    if (!svgData) return false;
    if (typeof window.isPushButton === 'function') return window.isPushButton(svgData);
    const s = svgData.toLowerCase();
    const compDef = (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[svgData]) ? COMPONENTS_DATA[svgData] : null;
    const isTypeBtn = compDef && (compDef.type === 'button' || (compDef.info && compDef.info.type === 'button'));
    return isTypeBtn || s.startsWith('button');
  }

  function setPushButtonState(elemId, isPressed) {
    if (!canvas) return;
    if (isPressed) {
      canvas.activePressedButtonId = elemId;
    } else if (canvas.activePressedButtonId === elemId) {
      canvas.activePressedButtonId = null;
    }

    if (canvas.engine) {
      canvas.engine.setButtonPressed(elemId, isPressed);
    }

    if (canvas.isSimulating) {
      canvas.simResult = canvas.engine.step({ elements: canvas.elements, connectors: canvas.connectors }, 0);
      canvas.updateSimulationVisuals();
    } else {
      const group = canvas.elementsGroup.querySelector(`[data-id="${elemId}"]`);
      if (group && canvas.applyFrameToElementGroup) {
        canvas.applyFrameToElementGroup(group, elemId, isPressed ? 1 : 0);
      }
    }

    if ('vibrate' in navigator && isPressed) {
      navigator.vibrate(20);
    }

    updatePushButtonUI(elemId, isPressed);
  }

  function updatePushButtonUI(elemId, isPressed) {
    // 1. Update Inspector Button if currently inspecting this element
    const inspBtn = document.getElementById('btnInspPushButton');
    if (inspBtn && parseInt(inspBtn.dataset.elemId) === elemId) {
      if (isPressed) {
        inspBtn.classList.remove('btn-push-off');
        inspBtn.classList.add('btn-push-on');
        const dot = inspBtn.querySelector('.push-status-dot');
        if (dot) { dot.classList.remove('dot-off'); dot.classList.add('dot-on'); }
        const txt = inspBtn.querySelector('.push-status-text');
        if (txt) txt.textContent = 'ON';
      } else {
        inspBtn.classList.remove('btn-push-on');
        inspBtn.classList.add('btn-push-off');
        const dot = inspBtn.querySelector('.push-status-dot');
        if (dot) { dot.classList.remove('dot-on'); dot.classList.add('dot-off'); }
        const txt = inspBtn.querySelector('.push-status-text');
        if (txt) txt.textContent = 'OFF';
      }
    }

    // 2. Update Floating Pill Button if currently showing this element
    const pillBtn = document.getElementById('btnPillPushButton');
    if (pillBtn && parseInt(pillBtn.dataset.elemId) === elemId) {
      if (isPressed) {
        pillBtn.classList.remove('is-released-off');
        pillBtn.classList.add('is-pressed-on');
        const dot = pillBtn.querySelector('.pill-push-dot');
        if (dot) { dot.classList.remove('dot-off'); dot.classList.add('dot-on'); }
        const txt = pillBtn.querySelector('.pill-push-text');
        if (txt) txt.textContent = 'ON';
      } else {
        pillBtn.classList.remove('is-pressed-on');
        pillBtn.classList.add('is-released-off');
        const dot = pillBtn.querySelector('.pill-push-dot');
        if (dot) { dot.classList.remove('dot-on'); dot.classList.add('dot-off'); }
        const txt = pillBtn.querySelector('.pill-push-text');
        if (txt) txt.textContent = 'OFF';
      }
    }
  }

  function bindMomentaryEvents(btn, elemId) {
    let isDown = false;

    const press = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (isDown) return;
      isDown = true;
      setPushButtonState(elemId, true);
    };

    const release = (ev) => {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      if (!isDown) return;
      isDown = false;
      setPushButtonState(elemId, false);
    };

    btn.addEventListener('mousedown', press);
    btn.addEventListener('touchstart', press, { passive: false });

    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });

    const winRelease = () => {
      if (isDown) release();
    };
    window.addEventListener('mouseup', winRelease);
    window.addEventListener('touchend', winRelease);
  }

  function renderSwitchOptions(item) {
    if (!pillSwitchOptions) return;
    pillSwitchOptions.innerHTML = '';
    pillSwitchOptions.style.display = 'inline-flex';

    const stored = (canvas.engine && canvas.engine.manualStates) ? canvas.engine.manualStates.get(item.id) : undefined;
    let options = [];

    if (isOverloadRelay(item.svgData)) {
      const isTripped = !!stored || !!(canvas.engine && canvas.engine.overloadTripped && canvas.engine.overloadTripped.get(item.id));
      options = [
        { pos: 0, val: false, label: 'NORMAL', isActive: !isTripped, isZero: false },
        { pos: 1, val: true,  label: 'TRIP',   isActive: isTripped,  isZero: true }
      ];
    } else if (isPushButton(item.svgData)) {
      const isPressed = (canvas && canvas.activePressedButtonId === item.id) || (canvas && canvas.engine && !!canvas.engine.manualStates.get(item.id));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btnPillPushButton';
      btn.dataset.elemId = item.id;
      btn.className = `pill-momentary-btn ${isPressed ? 'is-pressed-on' : 'is-released-off'}`;
      btn.title = 'Tekan & Tahan Push Button';
      btn.innerHTML = `
        <span class="pill-push-dot ${isPressed ? 'dot-on' : 'dot-off'}"></span>
        <span class="pill-push-text">${isPressed ? 'ON' : 'OFF'}</span>
      `;
      bindMomentaryEvents(btn, item.id);
      pillSwitchOptions.appendChild(btn);
      return;
    } else if (item.svgData === 'switch3p0') {
      // 3-posisi: I - 0 - II
      // 0: Pos I, 1: Pos 0 (OFF), 2: Pos II
      const curPos = (stored !== undefined) ? stored : 1;
      options = [
        { pos: 0, label: 'Pos I', isActive: curPos === 0, isZero: false },
        { pos: 1, label: 'Pos 0', isActive: curPos === 1, isZero: true },
        { pos: 2, label: 'Pos II', isActive: curPos === 2, isZero: false }
      ];
    } else if (item.svgData === 'switch3p') {
      // 3-posisi: 1 - 2 - 3
      const curPos = (stored !== undefined) ? stored : 0;
      options = [
        { pos: 0, label: 'Pos 1', isActive: curPos === 0, isZero: false },
        { pos: 1, label: 'Pos 2', isActive: curPos === 1, isZero: false },
        { pos: 2, label: 'Pos 3', isActive: curPos === 2, isZero: false }
      ];
    } else if (isChangeoverSwitch(item.svgData)) {
      // 2-posisi Changeover: Pos 1 / Pos 2 (Saklar Tukar SPDT / Crossover)
      const curState = !!stored;
      options = [
        { pos: 0, val: false, label: 'Pos 1', isActive: !curState, isZero: false },
        { pos: 1, val: true,  label: 'Pos 2', isActive: curState,  isZero: false }
      ];
    } else if (isPlainFuse(item.svgData)) {
      // Fuse 1P..4P: ON (intact, frame 0, conducts) vs OFF (blown, frame 1, breaks)
      const isFuseOff = stored === false;
      options = [
        { pos: 1, val: false, label: 'OFF', isActive: isFuseOff, isZero: true },
        { pos: 0, val: true,  label: 'ON',  isActive: !isFuseOff, isZero: false }
      ];
    } else {
      // 2-posisi standar: OFF / ON (Saklar biasa, Breaker, Push Button)
      const curState = !!stored;
      options = [
        { pos: 0, val: false, label: 'OFF', isActive: !curState, isZero: true },
        { pos: 1, val: true,  label: 'ON',  isActive: curState,  isZero: false }
      ];
    }

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pill-pos-btn ${opt.isActive ? (opt.isZero ? 'is-active-zero' : 'is-active-pos') : ''}`;
      btn.textContent = opt.label;
      btn.title = `Ganti ke ${opt.label}`;

      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();

        if (item.svgData === 'switch3p0' || item.svgData === 'switch3p') {
          canvas.engine.setSwitchPosition(item.id, opt.pos);
        } else {
          canvas.engine.manualStates.set(item.id, opt.val);
          if (item.svgData && item.svgData.includes('emergency') && canvas.engine.emergencyLatched) {
            canvas.engine.emergencyLatched.set(item.id, opt.val);
          }
          if (isOverloadRelay(item.svgData) && canvas.engine.overloadTripped) {
            canvas.engine.overloadTripped.set(item.id, opt.val);
          }
          if (isPlainFuse(item.svgData) && opt.val) {
            canvas.engine.fuseBlownElements.delete(item.id);
          }
        }

        if ('vibrate' in navigator) {
          navigator.vibrate(opt.isZero ? 15 : [20, 30, 20]);
        }

        if (canvas.isSimulating) {
          canvas.simResult = canvas.engine.step({ elements: canvas.elements, connectors: canvas.connectors }, 0);
          canvas.updateSimulationVisuals();
        } else {
          const group = canvas.elementsGroup.querySelector(`[data-id="${item.id}"]`);
          if (group) canvas.applyFrameToElementGroup(group, item.id, opt.pos);
        }

        renderSwitchOptions(item);
        updateInspector(item);
      });

      pillSwitchOptions.appendChild(btn);
    });
  }

  const btnDismissAlert = document.getElementById('btnDismissAlert');
  let alertDismissedByUser = false;

  if (btnDismissAlert) {
    btnDismissAlert.addEventListener('click', (e) => {
      e.stopPropagation();
      alertDismissedByUser = true;
      if (alertBanner) {
        alertBanner.style.display = 'none';
        alertBanner.classList.remove('pill-active');
      }
    });
  }

  function updateFloatingPill(item) {
    if (!floatingPill) return;
    if (!item || item.type !== 'ElectricalElement') {
      floatingPill.style.display = 'none';
      if (alertBanner) alertBanner.classList.remove('pill-active');
      return;
    }

    const compDef = COMPONENTS_DATA[item.svgData];
    pillLabel.textContent = item.tag || (compDef ? compDef.name : 'Elemen');

    const isSwitch = (item.svgData === 'switch3p0' || item.svgData === 'switch3p' || isChangeoverSwitch(item.svgData) || isOverloadRelay(item.svgData) || (compDef && (compDef.category === 'switches' || compDef.category === 'protections')));

    if (canvas.isSimulating) {
      if (pillEditControls) pillEditControls.style.display = 'none';
      if (isSwitch) {
        renderSwitchOptions(item);
        floatingPill.style.display = 'flex';
      } else {
        floatingPill.style.display = 'none';
      }
    } else {
      if (pillEditControls) pillEditControls.style.display = 'inline-flex';
      if (isSwitch) {
        renderSwitchOptions(item);
      } else {
        if (pillSwitchOptions) {
          pillSwitchOptions.innerHTML = '';
          pillSwitchOptions.style.display = 'none';
        }
      }
      floatingPill.style.display = 'flex';
    }

    // Pastikan posisi alert short circuit tidak bertumpukan dengan floating pill
    if (alertBanner && alertBanner.style.display !== 'none') {
      if (floatingPill.style.display === 'flex') {
        alertBanner.classList.add('pill-active');
      } else {
        alertBanner.classList.remove('pill-active');
      }
    }
  }

  // Auto-Save State & UI Management (Default: OFF across all platforms)
  let isAutoSaveEnabled = localStorage.getItem('mashimurelay_autosave_enabled') === 'true';
  let autoSaveDebounceTimer = null;
  let hasUnsavedChanges = false;
  let isBypassingExitGuard = false;

  function updateAutoSaveUI() {
    const statusText = isAutoSaveEnabled ? 'ON' : 'OFF';
    if (autoSaveStatusText) autoSaveStatusText.textContent = statusText;
    if (dashAutoSaveStatusText) dashAutoSaveStatusText.textContent = statusText;
    if (settingAutoSaveCheckbox) settingAutoSaveCheckbox.checked = isAutoSaveEnabled;

    if (btnAutoSaveToggle) {
      if (isAutoSaveEnabled) {
        btnAutoSaveToggle.classList.add('is-active');
        btnAutoSaveToggle.classList.remove('is-inactive');
        btnAutoSaveToggle.title = 'Simpan Otomatis AKTIF. Klik untuk menonaktifkan.';
      } else {
        btnAutoSaveToggle.classList.remove('is-active');
        btnAutoSaveToggle.classList.add('is-inactive');
        btnAutoSaveToggle.title = 'Simpan Otomatis NONAKTIF. Klik untuk mengaktifkan.';
      }
    }
    if (btnDashAutoSaveToggle) {
      if (isAutoSaveEnabled) {
        btnDashAutoSaveToggle.classList.add('is-active');
        btnDashAutoSaveToggle.classList.remove('is-inactive');
      } else {
        btnDashAutoSaveToggle.classList.remove('is-active');
        btnDashAutoSaveToggle.classList.add('is-inactive');
      }
    }
  }

  function toggleAutoSave() {
    isAutoSaveEnabled = !isAutoSaveEnabled;
    localStorage.setItem('mashimurelay_autosave_enabled', isAutoSaveEnabled ? 'true' : 'false');
    updateAutoSaveUI();
    if (isAutoSaveEnabled) {
      showToast('Auto-Save AKTIF: Perubahan disimpan otomatis.');
      if (projectManager) {
        projectManager.autoSaveCurrent();
        hasUnsavedChanges = false;
      }
    } else {
      showToast('Auto-Save NONAKTIF: Gunakan tombol Simpan atau Ctrl+S.');
    }
  }

  if (btnAutoSaveToggle) btnAutoSaveToggle.addEventListener('click', toggleAutoSave);
  if (btnDashAutoSaveToggle) btnDashAutoSaveToggle.addEventListener('click', toggleAutoSave);
  updateAutoSaveUI();

  // =========================================================================
  // Unified Scroll Reset & Modal Lifecycle Controller
  // =========================================================================
  function resetPanelScroll(target) {
    if (!target) return;
    const el = (typeof target === 'string') ? document.querySelector(target) : target;
    if (!el) return;

    try {
      if (typeof el.scrollTop === 'number') {
        el.scrollTop = 0;
      }
      const scrollContainers = el.querySelectorAll ? el.querySelectorAll(
        '.modal-dashboard-body, .modal-instructions-body, .modal-body, .drawer-body, .palette-scroll, #paletteContainer, .sidebar, .inspector-body, #projectGrid, #encycloGrid, .inst-section, .category-items'
      ) : [];

      scrollContainers.forEach(container => {
        if (container && typeof container.scrollTop === 'number') {
          container.scrollTop = 0;
        }
      });
    } catch (e) {
      // ignore
    }

    requestAnimationFrame(() => {
      try {
        if (typeof el.scrollTop === 'number') el.scrollTop = 0;
        const containers = el.querySelectorAll ? el.querySelectorAll(
          '.modal-dashboard-body, .modal-instructions-body, .modal-body, .drawer-body, .palette-scroll, #paletteContainer, .sidebar, .inspector-body, #projectGrid, #encycloGrid, .inst-section, .category-items'
        ) : [];
        containers.forEach(container => {
          if (container && typeof container.scrollTop === 'number') {
            container.scrollTop = 0;
          }
        });
      } catch (e) {
        // ignore
      }
    });
  }

  function showModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = 'flex';
    resetPanelScroll(modalEl);
  }

  function hideModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = 'none';
    resetPanelScroll(modalEl);
  }

  // Desktop Toolbar Dialog & File Handlers
  let isOpeningCircuitDialog = false;
  async function triggerOpenCircuitDialog() {
    if (isOpeningCircuitDialog) return;
    isOpeningCircuitDialog = true;
    try {
      if (typeof TauriBridge !== 'undefined' && TauriBridge.isTauri()) {
        const res = await TauriBridge.openCircuitFile(
          'Berkas Sirkuit Mashimurelay (*.smrl, *.txt, *.json)',
          ['smrl', 'txt', 'json']
        );
        if (res && res.content) {
          let circuit = null;
          if (res.content.trim().startsWith('{')) {
            try { circuit = JSON.parse(res.content); } catch (e) {}
          }
          if (!circuit || !circuit.data) {
            circuit = parseLegacyCircuitTxt(res.content);
          }
          const baseName = res.file_name.replace(/\.[^/.]+$/, '');
          if (typeof importTeacherModulesFromCircuit === 'function' && circuit) {
            importTeacherModulesFromCircuit(circuit);
          }
          if (projectManager && circuit) {
            projectManager.createNewProject(baseName, circuit);
          } else if (circuit) {
            canvas.loadCircuit(circuit);
          }
          closeDashboard();
          showToast(`File "${res.file_name}" berhasil dibuka!`, true);
        }
        return;
      }
      if (fileInput) fileInput.click();
    } catch (e) {
      console.warn('Open circuit dialog note:', e);
    } finally {
      setTimeout(() => {
        isOpeningCircuitDialog = false;
      }, 400);
    }
  }

  if (btnOpen) {
    btnOpen.addEventListener('click', triggerOpenCircuitDialog);
  }

  if (btnSaveAs) {
    btnSaveAs.addEventListener('click', () => {
      const curProj = projectManager ? projectManager.getActiveProject() : null;
      const curName = curProj ? curProj.name : (activeProjectName ? activeProjectName.textContent.trim() : 'Sirkuit');
      if (inputSaveAsFileName) {
        inputSaveAsFileName.value = curName;
      }
      showModal(modalSaveAs);
      if (inputSaveAsFileName) {
        setTimeout(() => inputSaveAsFileName.select(), 100);
      }
    });
  }

  if (btnInstructions) {
    btnInstructions.addEventListener('click', () => {
      showModal(modalInstructions);
      openInstructionsModal();
    });
  }

  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      if (settingAutoSaveCheckbox) settingAutoSaveCheckbox.checked = isAutoSaveEnabled;
      if (settingTerminalLabelsCheckbox) {
        settingTerminalLabelsCheckbox.checked = localStorage.getItem('mashimu_show_terminal_labels') === 'true';
      }
      if (settingSoundCheckbox && window.soundManager) {
        settingSoundCheckbox.checked = !window.soundManager.isMuted;
      }
      if (settingComponentNamesCheckbox) {
        settingComponentNamesCheckbox.checked = localStorage.getItem('mashimu_show_component_names') === 'true';
      }
      showModal(modalSettings);
    });
  }

  if (btnAbout) {
    btnAbout.addEventListener('click', () => {
      showModal(modalAbout);
    });
  }

  // Navigation Drawer Logic & Handlers
  function openNavDrawer() {
    if (navDrawer) navDrawer.classList.add('open');
    if (drawerBackdrop) drawerBackdrop.classList.add('open');
    if (drawerProjectSubtitle && projectManager) {
      const p = projectManager.getActiveProject();
      if (p) drawerProjectSubtitle.textContent = p.name;
    }
  }

  function closeNavDrawer() {
    if (navDrawer) navDrawer.classList.remove('open');
    if (drawerBackdrop) drawerBackdrop.classList.remove('open');
  }

  if (btnOpenNavDrawer) {
    btnOpenNavDrawer.addEventListener('click', (e) => {
      e.stopPropagation();
      openNavDrawer();
    });
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeNavDrawer);
  }

  if (drawerItemWorkspace) {
    drawerItemWorkspace.addEventListener('click', () => {
      closeNavDrawer();
      openDashboard();
    });
  }

  if (drawerItemSave) {
    drawerItemSave.addEventListener('click', () => {
      closeNavDrawer();
      quickSaveProject();
    });
  }

  if (drawerItemSaveAs) {
    drawerItemSaveAs.addEventListener('click', () => {
      closeNavDrawer();
      const curProj = projectManager ? projectManager.getActiveProject() : null;
      const curName = curProj ? curProj.name : (activeProjectName ? activeProjectName.textContent.trim() : 'Sirkuit');
      if (inputSaveAsFileName) {
        inputSaveAsFileName.value = curName;
      }
      showModal(modalSaveAs);
      if (inputSaveAsFileName) {
        setTimeout(() => inputSaveAsFileName.select(), 100);
      }
    });
  }

  if (drawerItemInstructions) {
    drawerItemInstructions.addEventListener('click', () => {
      closeNavDrawer();
      showModal(modalInstructions);
      openInstructionsModal();
    });
  }

  if (drawerItemAbout) {
    drawerItemAbout.addEventListener('click', () => {
      closeNavDrawer();
      showModal(modalAbout);
    });
  }

  if (drawerItemSettings) {
    drawerItemSettings.addEventListener('click', () => {
      closeNavDrawer();
      if (settingAutoSaveCheckbox) settingAutoSaveCheckbox.checked = isAutoSaveEnabled;
      showModal(modalSettings);
    });
  }

  // =========================================================================
  // Teacher Assignment Kit Modal Controller
  // =========================================================================
  const KIT_PRESETS = {
    dol: {
      name: 'Praktikum 1 - DOL Starter',
      components: ['sourceL1', 'sourceL2', 'sourceL3', 'sourceN', 'sourcePE', 'breaker1p', 'breaker3p', 'overload3p', 'contactor3p', 'buttonNO', 'buttonNC', 'coil', 'contactNO', 'lamp', 'motor3ph']
    },
    forward_reverse: {
      name: 'Praktikum 2 - Forward-Reverse Starter',
      components: ['sourceL1', 'sourceL2', 'sourceL3', 'sourceN', 'sourcePE', 'breaker1p', 'breaker3p', 'overload3p', 'contactor3p', 'buttonNO', 'buttonNC', 'coil', 'contactNO', 'contactNC', 'lamp', 'motor3ph']
    },
    star_delta: {
      name: 'Praktikum 3 - Star-Delta Starter',
      components: ['sourceL1', 'sourceL2', 'sourceL3', 'sourceN', 'sourcePE', 'breaker1p', 'breaker3p', 'overload3p', 'contactor3p', 'buttonNO', 'buttonNC', 'coil', 'coilDelayOn', 'contactNO', 'contactNC', 'contactNODelayOn', 'lamp', 'motorStarDelta']
    },
    timer: {
      name: 'Praktikum - Rangkaian Timer & Flasher',
      components: ['sourceL1', 'sourceN', 'breaker1p', 'buttonNO', 'buttonNC', 'coil', 'coilDelayOn', 'coilDelayOff', 'coilFlasher', 'contactNO', 'contactNC', 'contactNODelayOn', 'contactNCDelayOn', 'contactNODelayOff', 'contactNCDelayOff', 'lamp', 'lampBlink']
    },
    basic: {
      name: 'Praktikum Dasar Sirkuit Kontrol',
      components: ['sourceL1', 'sourceN', 'breaker1p', 'switchNO', 'buttonNO', 'buttonNC', 'coil', 'contactNO', 'contactNC', 'lamp']
    }
  };

  let tempKitSelected = new Set();

  function renderKitComponentGrid(searchQuery = '') {
    if (!kitComponentsSelectorGrid || typeof COMPONENTS_DATA === 'undefined') return;
    kitComponentsSelectorGrid.innerHTML = '';
    const q = (searchQuery || '').toLowerCase().trim();

    const categoryMeta = {
      sources: { title: 'Sources & Power' },
      protections: { title: 'Circuit Protections' },
      switches: { title: 'Switches & Buttons' },
      contactors: { title: 'Contactors & Relays' },
      coils: { title: 'Coils & Timers' },
      auxiliaries: { title: 'Auxiliary Contacts' },
      motors: { title: 'Motors & Drives' },
      loads: { title: 'Loads & Signalling' },
      others: { title: 'Wiring & Junctions' }
    };

    const categories = {
      sources: [],
      protections: [],
      switches: [],
      contactors: [],
      coils: [],
      auxiliaries: [],
      motors: [],
      loads: [],
      others: []
    };

    for (const [key, comp] of Object.entries(COMPONENTS_DATA)) {
      const cat = (comp.info && comp.info.category) || comp.category || 'others';
      const targetCat = categories[cat] ? cat : 'others';
      const cleanName = (window.COMPONENT_DISPLAY_NAMES && window.COMPONENT_DISPLAY_NAMES[key]) || (comp.info && comp.info.name) || comp.name || key;
      const tagType = comp.tagType || (comp.info && comp.info.tagType) || '';

      if (q) {
        const matches = cleanName.toLowerCase().includes(q) || key.toLowerCase().includes(q) || cat.toLowerCase().includes(q) || tagType.toLowerCase().includes(q);
        if (!matches) continue;
      }

      categories[targetCat].push({
        key,
        comp,
        name: cleanName,
        tagType,
        category: targetCat
      });
    }

    let totalVisible = 0;

    for (const [catKey, items] of Object.entries(categories)) {
      if (items.length === 0) continue;
      totalVisible += items.length;

      const meta = categoryMeta[catKey] || { title: catKey };
      const selectedInCat = items.filter(it => tempKitSelected.has(it.key)).length;

      const sectionEl = document.createElement('div');
      sectionEl.className = 'kit-cat-section';

      const headerEl = document.createElement('div');
      headerEl.className = 'kit-cat-header';
      headerEl.innerHTML = `
        <div class="kit-cat-header-left">
          <span class="kit-cat-title">${meta.title}</span>
          <span class="kit-cat-badge ${selectedInCat > 0 ? 'has-selected' : ''}">${selectedInCat} / ${items.length} dipilih</span>
        </div>
        <div class="kit-cat-header-actions">
          <button type="button" class="btn-kit-cat-action btn-cat-all" title="Pilih semua komponen di kategori ${meta.title}">Pilih Semua</button>
          <button type="button" class="btn-kit-cat-action btn-cat-none" title="Kosongkan pilihan di kategori ${meta.title}">Kosongkan</button>
        </div>
      `;

      const btnAll = headerEl.querySelector('.btn-cat-all');
      btnAll.addEventListener('click', (e) => {
        e.stopPropagation();
        items.forEach(it => tempKitSelected.add(it.key));
        renderKitComponentGrid(kitSearchInput ? kitSearchInput.value : '');
      });

      const btnNone = headerEl.querySelector('.btn-cat-none');
      btnNone.addEventListener('click', (e) => {
        e.stopPropagation();
        items.forEach(it => tempKitSelected.delete(it.key));
        renderKitComponentGrid(kitSearchInput ? kitSearchInput.value : '');
      });

      const gridEl = document.createElement('div');
      gridEl.className = 'kit-cat-grid';

      items.forEach(it => {
        const isChecked = tempKitSelected.has(it.key);
        const card = document.createElement('label');
        card.className = `kit-comp-tile ${isChecked ? 'is-selected' : ''}`;
        card.title = `${it.name} (${it.key})`;

        let iconHtml = '';
        if (it.comp && it.comp.graphics) {
          const vb = it.comp.viewBox || `0 0 ${it.comp.width || 120} ${it.comp.height || 120}`;
          iconHtml = `<svg viewBox="${vb}" class="kit-comp-svg" aria-hidden="true">${it.comp.graphics}</svg>`;
        } else {
          iconHtml = `<img src="assets/icons/${it.key}.svg" alt="" class="kit-comp-img" loading="lazy" onerror="this.style.display='none'" />`;
        }

        card.innerHTML = `
          <input type="checkbox" data-key="${it.key}" ${isChecked ? 'checked' : ''} />
          <div class="kit-comp-icon-box">
            ${iconHtml}
          </div>
          <div class="kit-comp-info">
            <div class="kit-comp-name">${it.name}</div>
            <div class="kit-comp-sub">
              ${it.tagType ? `<span class="kit-comp-tag-badge">${it.tagType}</span>` : ''}
              <span class="kit-comp-key-muted">${it.key}</span>
            </div>
          </div>
        `;

        const chk = card.querySelector('input[type="checkbox"]');
        chk.addEventListener('change', (e) => {
          if (e.target.checked) {
            tempKitSelected.add(it.key);
            card.classList.add('is-selected');
          } else {
            tempKitSelected.delete(it.key);
            card.classList.remove('is-selected');
          }
          if (kitSelectedCount) kitSelectedCount.textContent = tempKitSelected.size;

          const curCatSel = items.filter(x => tempKitSelected.has(x.key)).length;
          const badge = headerEl.querySelector('.kit-cat-badge');
          if (badge) {
            badge.textContent = `${curCatSel} / ${items.length} dipilih`;
            if (curCatSel > 0) badge.classList.add('has-selected');
            else badge.classList.remove('has-selected');
          }
        });

        gridEl.appendChild(card);
      });

      sectionEl.appendChild(headerEl);
      sectionEl.appendChild(gridEl);
      kitComponentsSelectorGrid.appendChild(sectionEl);
    }

    if (totalVisible === 0) {
      kitComponentsSelectorGrid.innerHTML = `
        <div style="text-align: center; padding: 28px 14px; color: var(--text-muted); font-size: 13px;">
          Tidak ditemukan komponen yang cocok dengan pencarian "<strong>${searchQuery}</strong>".
        </div>
      `;
    }

    if (kitSelectedCount) kitSelectedCount.textContent = tempKitSelected.size;
  }


  function openAssignmentKitModal() {
    const curKit = (canvas && canvas.circuit && canvas.circuit.assignmentKit) ? canvas.circuit.assignmentKit : null;
    if (kitToggleActive) kitToggleActive.checked = !!(curKit && curKit.enabled);
    if (inputKitName) inputKitName.value = (curKit && curKit.name) ? curKit.name : '';

    if (curKit && Array.isArray(curKit.allowedComponents)) {
      tempKitSelected = new Set(curKit.allowedComponents);
    } else {
      tempKitSelected = new Set();
    }

    if (kitSearchInput) kitSearchInput.value = '';
    renderKitComponentGrid();
    showModal(modalAssignmentKit);
  }

  function initAssignmentKitUI() {
    if (btnCloseAssignmentKit) btnCloseAssignmentKit.addEventListener('click', () => hideModal(modalAssignmentKit));
    if (btnCancelKit) btnCancelKit.addEventListener('click', () => hideModal(modalAssignmentKit));

    if (drawerItemKit) {
      drawerItemKit.addEventListener('click', () => {
        closeNavDrawer();
        openAssignmentKitModal();
      });
    }

    if (btnOpenKitModal) {
      btnOpenKitModal.addEventListener('click', () => {
        openAssignmentKitModal();
      });
    }

    if (btnManageActiveKit) {
      btnManageActiveKit.addEventListener('click', () => {
        openAssignmentKitModal();
      });
    }

    if (kitSearchInput) {
      kitSearchInput.addEventListener('input', (e) => {
        renderKitComponentGrid(e.target.value);
      });
    }

    // Presets
    document.querySelectorAll('.kit-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        if (preset === 'all') {
          if (typeof COMPONENTS_DATA !== 'undefined') {
            tempKitSelected = new Set(Object.keys(COMPONENTS_DATA));
          }
        } else if (preset === 'clear') {
          tempKitSelected.clear();
        } else if (KIT_PRESETS[preset]) {
          const p = KIT_PRESETS[preset];
          tempKitSelected = new Set(p.components);
          if (inputKitName) inputKitName.value = p.name;
          if (kitToggleActive) kitToggleActive.checked = true;
        }
        renderKitComponentGrid(kitSearchInput ? kitSearchInput.value : '');
      });
    });

    if (btnSaveKit) {
      btnSaveKit.addEventListener('click', () => {
        const isEnabled = kitToggleActive ? kitToggleActive.checked : false;
        const kitName = (inputKitName && inputKitName.value.trim()) ? inputKitName.value.trim() : 'Kit Praktikum Guru';
        const allowed = Array.from(tempKitSelected);

        if (isEnabled && allowed.length === 0) {
          showToast('Pilih minimal 1 komponen untuk mengaktifkan kit praktikum.', false);
          return;
        }

        const newKit = {
          enabled: isEnabled,
          name: kitName,
          allowedComponents: allowed
        };

        if (canvas) {
          canvas.setAssignmentKit(newKit);
        }

        hideModal(modalAssignmentKit);
        showToast(isEnabled ? `Kit Praktikum Guru "${kitName}" diterapkan! (${allowed.length} komponen)` : 'Pembatasan perpustakaan komponen dinonaktifkan.', true);
      });
    }

    const btnSaveKitAsModule = document.getElementById('btnSaveKitAsModule');
    if (btnSaveKitAsModule) {
      btnSaveKitAsModule.addEventListener('click', () => {
        const prefillTitle = (inputKitName && inputKitName.value.trim()) ? inputKitName.value.trim() : '';
        const prefillAllowed = Array.from(tempKitSelected);
        hideModal(modalAssignmentKit);
        if (typeof window.openCustomModuleEditorModal === 'function') {
          window.openCustomModuleEditorModal(null, {
            title: prefillTitle,
            allowedComponents: prefillAllowed
          });
        }
      });
    }
  }

  initAssignmentKitUI();

  // Save As Modal Options Handlers
  if (btnCloseSaveAs) {
    btnCloseSaveAs.addEventListener('click', () => {
      hideModal(modalSaveAs);
    });
  }

  if (btnExportSmrlOption) {
    btnExportSmrlOption.addEventListener('click', () => {
      const customName = inputSaveAsFileName ? inputSaveAsFileName.value.trim() : '';
      hideModal(modalSaveAs);
      if (projectManager) {
        if (customName) {
          projectManager.renameProject(projectManager.activeProjectId, customName);
          updateActiveProjectDisplay(projectManager.getActiveProject());
        }
        projectManager.autoSaveCurrent();
        projectManager.exportProject(projectManager.activeProjectId, customName);
      } else {
        const rawName = customName || (activeProjectName ? activeProjectName.textContent.trim() : 'Rangkaian Sederhana (Demo)');
        const safeName = rawName.replace(/(\.smrl|\.txt|\.json)+$/gi, '').replace(/[\\/:*?"<>|\x00-\x1F\x80-\x9F]/g, '').trim() || 'Sirkuit';
        const jsonStr = JSON.stringify(canvas.getCircuitJson(), null, 2);
        const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${safeName}.smrl`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(url);
        }, 3000);
      }
    });
  }

  if (btnExportTxtOption) {
    btnExportTxtOption.addEventListener('click', () => {
      const customName = inputSaveAsFileName ? inputSaveAsFileName.value.trim() : '';
      hideModal(modalSaveAs);
      if (projectManager) {
        if (customName) {
          projectManager.renameProject(projectManager.activeProjectId, customName);
          updateActiveProjectDisplay(projectManager.getActiveProject());
        }
        projectManager.autoSaveCurrent();
        projectManager.exportProjectTxt(projectManager.activeProjectId, customName);
      } else {
        const rawName = customName || (activeProjectName ? activeProjectName.textContent.trim() : 'Rangkaian Sederhana (Demo)');
        const safeName = rawName.replace(/(\.smrl|\.txt|\.json)+$/gi, '').replace(/[\\/:*?"<>|\x00-\x1F\x80-\x9F]/g, '').trim() || 'Sirkuit';
        const txt = exportCircuitToLegacyTxt(canvas.getCircuitJson());
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${safeName}.txt`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(url);
        }, 3000);
      }
    });
  }

  // Handler Format PDF (Laporan Praktikum 2 Halaman)
  if (btnExportPdfOption) {
    btnExportPdfOption.addEventListener('click', () => {
      if (!canvas || !canvas.elements || canvas.elements.length === 0) {
        showToast('Kanvas sirkuit masih kosong. Tambahkan komponen sebelum mencetak PDF.');
        return;
      }

      hideModal(modalSaveAs);

      // Sinkronisasi nama judul proyek aktif
      const customName = inputSaveAsFileName ? inputSaveAsFileName.value.trim() : '';
      const currentTitle = customName || (activeProjectName ? activeProjectName.textContent.trim() : 'Rangkaian Sederhana');
      if (inputPdfProjectTitle) {
        inputPdfProjectTitle.value = currentTitle;
      }

      // Muat profil siswa dari penyimpanan lokal atau metadata sirkuit aktif jika tersedia
      if (inputPdfStudentName) {
        inputPdfStudentName.value = localStorage.getItem('mashimu_student_name') || '';
      }
      if (inputPdfStudentClass) {
        const defaultClass = (canvas && canvas.circuit && (canvas.circuit.class || (canvas.circuit.header && canvas.circuit.header.class))) 
          || localStorage.getItem('mashimu_student_class') 
          || localStorage.getItem('mashimu_teacher_class') 
          || '';
        inputPdfStudentClass.value = defaultClass;
      }
      if (inputPdfStudentSchool) {
        const defaultSchool = (canvas && canvas.circuit && (canvas.circuit.school || (canvas.circuit.header && canvas.circuit.header.school))) 
          || localStorage.getItem('mashimu_student_school') 
          || localStorage.getItem('mashimu_teacher_school') 
          || '';
        inputPdfStudentSchool.value = defaultSchool;
      }
      if (inputPdfStudentNis) {
        inputPdfStudentNis.value = localStorage.getItem('mashimu_student_nis') || '';
      }
      if (inputPdfDate) {
        inputPdfDate.value = new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      }

      showModal(modalPdfStudentInfo);
    });
  }

  if (btnClosePdfStudentInfo) {
    btnClosePdfStudentInfo.addEventListener('click', () => {
      hideModal(modalPdfStudentInfo);
    });
  }

  if (btnCancelPdfExport) {
    btnCancelPdfExport.addEventListener('click', () => {
      hideModal(modalPdfStudentInfo);
    });
  }

  if (btnConfirmGeneratePdf) {
    btnConfirmGeneratePdf.addEventListener('click', async () => {
      const projTitle = inputPdfProjectTitle ? inputPdfProjectTitle.value.trim() : '';
      const name = inputPdfStudentName ? inputPdfStudentName.value.trim() : '';
      const sClass = inputPdfStudentClass ? inputPdfStudentClass.value.trim() : '';
      const sSchool = inputPdfStudentSchool ? inputPdfStudentSchool.value.trim() : '';
      const nis = inputPdfStudentNis ? inputPdfStudentNis.value.trim() : '';
      const dateStr = inputPdfDate ? inputPdfDate.value.trim() : '';

      // Simpan data profil siswa untuk kemudahan penggunaan berulang
      if (name) localStorage.setItem('mashimu_student_name', name);
      if (sClass) localStorage.setItem('mashimu_student_class', sClass);
      if (sSchool) localStorage.setItem('mashimu_student_school', sSchool);
      if (nis) localStorage.setItem('mashimu_student_nis', nis);

      const origBtnText = btnConfirmGeneratePdf.textContent;
      btnConfirmGeneratePdf.disabled = true;
      btnConfirmGeneratePdf.textContent = 'Menyusun Laporan PDF...';

      try {
        if (typeof window.generateCircuitPdfReport !== 'function') {
          throw new Error('Modul pembuat PDF belum termuat sempurna.');
        }

        await window.generateCircuitPdfReport(canvas, {
          projectTitle: projTitle || 'Rangkaian Skematik Kelistrikan',
          studentName: name || '-',
          studentClass: sClass || '-',
          studentNis: nis || '-',
          studentSchool: sSchool || 'SMK Negeri 2',
          practiceDate: dateStr || new Date().toLocaleDateString('id-ID')
        });

        hideModal(modalPdfStudentInfo);
        showToast('Laporan Praktikum PDF berhasil diunduh.');
      } catch (err) {
        console.error('PDF Generation Error:', err);
        showToast('Gagal mencetak PDF: ' + (err.message || err));
      } finally {
        btnConfirmGeneratePdf.disabled = false;
        btnConfirmGeneratePdf.textContent = origBtnText;
      }
    });
  }

  if (btnSaveDuplicateOption) {
    btnSaveDuplicateOption.addEventListener('click', () => {
      hideModal(modalSaveAs);
      if (projectManager) {
        const curProj = projectManager.getActiveProject();
        const customName = inputSaveAsFileName ? inputSaveAsFileName.value.trim() : '';
        const baseName = customName || (curProj ? curProj.name : 'Sirkuit');
        const newName = prompt('Beri nama untuk salinan proyek baru:', `${baseName} (Salinan)`);
        if (newName && newName.trim()) {
          projectManager.createNewProject(newName.trim(), canvas.getCircuitJson());
          showToast(`Salinan proyek "${newName.trim()}" berhasil dibuat!`);
        }
      }
    });
  }

  let currentQrPayload = '';

  async function openCircuitQrExportModal(customCircuitName, teacherClass, teacherSchool) {
    if (!modalQrExport || !qrCanvas) return;
    
    const circuitJson = canvas.getCircuitJson();
    const curName = customCircuitName || (projectManager ? (projectManager.getActiveProject()?.name || 'Sirkuit') : 'Sirkuit');
    circuitJson.name = curName;

    const finalClass = teacherClass !== undefined ? teacherClass : (localStorage.getItem('mashimu_teacher_class') || '');
    const finalSchool = teacherSchool !== undefined ? teacherSchool : (localStorage.getItem('mashimu_teacher_school') || '');

    // Attach active assignment kit if active
    if (canvas && canvas.circuit && canvas.circuit.assignmentKit && canvas.circuit.assignmentKit.enabled) {
      circuitJson.assignmentKit = JSON.parse(JSON.stringify(canvas.circuit.assignmentKit));
    }

    if (qrCircuitTitle) qrCircuitTitle.textContent = curName;

    // Count teacher-locked components
    let lockedCount = 0;
    if (circuitJson.data && Array.isArray(circuitJson.data)) {
      lockedCount = circuitJson.data.filter(el => el.teacherLocked || el.locked).length;
    }
    
    if (qrLockStatusBadge) {
      if (lockedCount > 0) {
        qrLockStatusBadge.textContent = `${lockedCount} Komponen Terkunci`;
        qrLockStatusBadge.style.color = '#10b981';
      } else {
        qrLockStatusBadge.textContent = 'Komponen Bebas';
        qrLockStatusBadge.style.color = '#94a3b8';
      }
    }

    if (qrKitStatusBadge) {
      if (circuitJson.assignmentKit && circuitJson.assignmentKit.enabled) {
        qrKitStatusBadge.textContent = `${circuitJson.assignmentKit.name || 'Kit Terbatas'}`;
        qrKitStatusBadge.style.color = '#a78bfa';
      } else {
        qrKitStatusBadge.textContent = 'Semua Komponen Bebas';
        qrKitStatusBadge.style.color = '#94a3b8';
      }
    }

    if (qrClassBadge) {
      qrClassBadge.textContent = finalClass || '-';
    }

    if (qrSchoolBadge) {
      qrSchoolBadge.textContent = finalSchool || '-';
    }

    // Minify circuit payload: strip default/redundant properties for ultra-chunky, blur-friendly QR modules
    const compactCircuit = {
      name: curName,
      data: []
    };
    if (finalClass) compactCircuit.class = finalClass;
    if (finalSchool) compactCircuit.school = finalSchool;
    if (circuitJson.assignmentKit && circuitJson.assignmentKit.enabled) {
      compactCircuit.assignmentKit = {
        enabled: true,
        name: circuitJson.assignmentKit.name || 'Kit Praktikum Guru',
        allowedComponents: circuitJson.assignmentKit.allowedComponents || []
      };
    }
    const attachedQrModules = typeof getSelectedTeacherTaskModules === 'function' ? getSelectedTeacherTaskModules() : [];
    if (attachedQrModules.length > 0) {
      // Versi ringkas tanpa exampleCircuit agar QR Code tetap ringan dan mudah dipindai
      const compactMods = attachedQrModules.map(m => ({
        id: m.id,
        title: m.title,
        track: m.track,
        subject: m.subject,
        level: m.level,
        duration: m.duration,
        author: m.author,
        summary: m.summary,
        objectives: m.objectives || [],
        safetyK3: m.safetyK3 || [],
        theory: m.theory || '',
        steps: m.steps || [],
        checks: m.checks || [],
        allowedComponents: m.allowedComponents || []
      }));
      if (JSON.stringify(compactMods).length <= 3600) {
        compactCircuit.customModules = compactMods;
      } else {
        // Jika terlalu banyak teks untuk QR statis, ambil metadata + kit saja
        compactCircuit.customModules = compactMods.map(m => ({
          id: m.id,
          title: m.title,
          track: m.track,
          subject: m.subject,
          author: m.author,
          summary: (m.summary || '').slice(0, 180),
          steps: (m.steps || []).slice(0, 6),
          checks: (m.checks || []).slice(0, 5),
          allowedComponents: m.allowedComponents || []
        }));
      }
    }
    if (Array.isArray(circuitJson.data)) {
      compactCircuit.data = circuitJson.data.map(item => {
        const isConnector = item.type === 'Connector' || item.type === 'wire' || (typeof item.idElementNode1 === 'number' && item.idElementNode1 > 0);
        if (isConnector) {
          const wire = {
            type: 'Connector',
            id: item.id,
            idElementNode1: item.idElementNode1,
            idNode1: (typeof item.idNode1 === 'number') ? item.idNode1 : 0,
            idElementNode2: item.idElementNode2,
            idNode2: (typeof item.idNode2 === 'number') ? item.idNode2 : 0
          };
          if (item.margins) {
            const m = {};
            if (item.margins.start) m.start = item.margins.start;
            if (item.margins.center) m.center = item.margins.center;
            if (item.margins.end) m.end = item.margins.end;
            if (Object.keys(m).length > 0) wire.margins = m;
          }
          return wire;
        } else {
          const posX = (item.position && typeof item.position.x === 'number') ? item.position.x : ((typeof item.x === 'number') ? item.x : 0);
          const posY = (item.position && typeof item.position.y === 'number') ? item.position.y : ((typeof item.y === 'number') ? item.y : 0);
          const el = {
            type: 'ElectricalElement',
            id: item.id,
            svgData: item.svgData || 'coil',
            x: Math.round(posX),
            y: Math.round(posY)
          };
          if (item.tag) el.tag = item.tag;
          if (item.comment) el.comment = item.comment;
          if (item.rotation) el.rotation = item.rotation;
          if (item.teacherLocked) el.teacherLocked = true;
          if (item.locked && !item.teacherLocked) el.locked = true;
          if (item.valueTimeOn !== undefined && item.valueTimeOn !== 2) el.valueTimeOn = item.valueTimeOn;
          if (item.presetTime && item.presetTime !== 5 && item.presetTime !== 0) el.presetTime = item.presetTime;
          if (item.lampColor && item.lampColor !== 'yellow') el.lampColor = item.lampColor;
          if (item.fontSize && item.fontSize !== 24) el.fontSize = item.fontSize;
          if (item.textColor && item.textColor !== '#93c5fd') el.textColor = item.textColor;
          if (Array.isArray(item.terminalTags) && item.terminalTags.length > 0) el.terminalTags = item.terminalTags;
          return el;
        }
      });
    }

    const minifiedJson = JSON.stringify(compactCircuit);

    try {
      let payload = '';
      if (typeof CompressionStream !== 'undefined') {
        const stream = new Blob([minifiedJson]).stream().pipeThrough(new CompressionStream('deflate'));
        const buffer = await new Response(stream).arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        payload = 'smrl://v1/' + base64url;
      } else {
        const utf8Bytes = new TextEncoder().encode(minifiedJson);
        let bin = '';
        for (let i = 0; i < utf8Bytes.length; i++) bin += String.fromCharCode(utf8Bytes[i]);
        payload = 'smrl://v0/' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }

      currentQrPayload = payload;

      if (typeof qrcode !== 'undefined') {
        // Use Level 'L' (7% error correction) for the cleanest, largest module pixels
        const qr = qrcode(0, 'L');
        qr.addData(payload);
        qr.make();

        const moduleCount = qr.getModuleCount();
        const margin = 4;
        const totalModules = moduleCount + margin * 2;
        const targetSize = 280;
        const cellSize = Math.max(2, Math.floor(targetSize / totalModules));
        const actualSize = cellSize * totalModules;

        qrCanvas.width = actualSize;
        qrCanvas.height = actualSize;
        const ctx = qrCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, actualSize, actualSize);

        ctx.fillStyle = '#0f172a';
        for (let r = 0; r < moduleCount; r++) {
          for (let c = 0; c < moduleCount; c++) {
            if (qr.isDark(r, c)) {
              ctx.fillRect((c + margin) * cellSize, (r + margin) * cellSize, cellSize, cellSize);
            }
          }
        }
      }
      showModal(modalQrExport);
    } catch (err) {
      console.error('[QR Export Error]:', err);
      showToast('Gagal membuat QR Code sirkuit: ' + err.message);
    }
  }

  // ============================================================================
  // TEACHER JOBSHEET PDF ATTACHMENT MODULE
  // ============================================================================
  const TEACHER_JOBSHEET_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

  const teacherJobsheetState = {
    file: null,
    filename: '',
    sizeBytes: 0,
    base64Data: null
  };

  function formatJobsheetFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function readPdfFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const commaIndex = result.indexOf(',');
        if (commaIndex === -1) {
          reject(new Error('Format data berkas tidak valid.'));
          return;
        }
        const pureBase64 = result.slice(commaIndex + 1).trim();
        if (!pureBase64) {
          reject(new Error('Berkas PDF kosong.'));
          return;
        }
        resolve(pureBase64);
      };
      reader.onerror = () => {
        reject(new Error('Gagal membaca berkas PDF dari perangkat.'));
      };
      reader.readAsDataURL(file);
    });
  }

  function showTeacherJobsheetError(message) {
    const errEl = document.getElementById('teacherJobsheetError');
    if (!errEl) return;
    if (message) {
      errEl.textContent = message;
      errEl.style.display = 'block';
    } else {
      errEl.textContent = '';
      errEl.style.display = 'none';
    }
  }

  function renderTeacherJobsheetUI() {
    const dropzone = document.getElementById('teacherJobsheetDropzone');
    const preview = document.getElementById('teacherJobsheetPreview');
    const fileNameEl = document.getElementById('teacherJobsheetFileName');
    const fileSizeEl = document.getElementById('teacherJobsheetFileSize');

    if (!dropzone || !preview || !fileNameEl || !fileSizeEl) return;

    if (teacherJobsheetState.base64Data && teacherJobsheetState.filename) {
      dropzone.style.display = 'none';
      preview.style.display = 'flex';
      fileNameEl.textContent = teacherJobsheetState.filename;
      fileNameEl.title = teacherJobsheetState.filename;
      fileSizeEl.textContent = `Dokumen PDF - ${formatJobsheetFileSize(teacherJobsheetState.sizeBytes)}`;
    } else {
      dropzone.style.display = 'flex';
      preview.style.display = 'none';
      fileNameEl.textContent = '';
      fileSizeEl.textContent = '';
    }
  }

  function clearTeacherJobsheetAttachment() {
    teacherJobsheetState.file = null;
    teacherJobsheetState.filename = '';
    teacherJobsheetState.sizeBytes = 0;
    teacherJobsheetState.base64Data = null;

    const fileInput = document.getElementById('inputTeacherJobsheetFile');
    if (fileInput) {
      fileInput.value = '';
    }

    showTeacherJobsheetError('');
    renderTeacherJobsheetUI();
  }

  async function handleTeacherJobsheetSelection(file) {
    showTeacherJobsheetError('');
    if (!file) return;

    const lowerName = (file.name || '').toLowerCase();
    const isPdfMime = file.type === 'application/pdf';
    const isPdfExtension = lowerName.endsWith('.pdf');

    if (!isPdfMime && !isPdfExtension) {
      showTeacherJobsheetError('Hanya berkas berformat PDF (.pdf) yang didukung.');
      return;
    }

    if (file.size <= 0) {
      showTeacherJobsheetError('Berkas PDF kosong dan tidak dapat dilampirkan.');
      return;
    }

    if (file.size > TEACHER_JOBSHEET_MAX_BYTES) {
      showTeacherJobsheetError(
        `Ukuran berkas (${formatJobsheetFileSize(file.size)}) melebihi batas maksimum 25 MB.`
      );
      return;
    }

    try {
      const base64Data = await readPdfFileAsBase64(file);
      teacherJobsheetState.file = file;
      teacherJobsheetState.filename = file.name;
      teacherJobsheetState.sizeBytes = file.size;
      teacherJobsheetState.base64Data = base64Data;
      renderTeacherJobsheetUI();
    } catch (err) {
      clearTeacherJobsheetAttachment();
      showTeacherJobsheetError(err && err.message ? err.message : 'Gagal memproses berkas PDF.');
    }
  }

  function initTeacherJobsheetControls() {
    const fileInput = document.getElementById('inputTeacherJobsheetFile');
    const btnSelect = document.getElementById('btnSelectTeacherJobsheet');
    const btnChange = document.getElementById('btnChangeTeacherJobsheet');
    const btnRemove = document.getElementById('btnRemoveTeacherJobsheet');
    const dropzone = document.getElementById('teacherJobsheetDropzone');

    if (btnSelect && fileInput) {
      btnSelect.addEventListener('click', () => {
        fileInput.click();
      });
    }

    if (btnChange && fileInput) {
      btnChange.addEventListener('click', () => {
        fileInput.click();
      });
    }

    if (btnRemove) {
      btnRemove.addEventListener('click', () => {
        clearTeacherJobsheetAttachment();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', async (event) => {
        const selectedFile = event.target.files && event.target.files[0] ? event.target.files[0] : null;
        if (selectedFile) {
          await handleTeacherJobsheetSelection(selectedFile);
        }
        fileInput.value = '';
      });
    }

    if (dropzone) {
      dropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropzone.style.borderColor = '#f59e0b';
        dropzone.style.backgroundColor = 'rgba(217, 119, 6, 0.12)';
      });

      dropzone.addEventListener('dragleave', (event) => {
        event.preventDefault();
        dropzone.style.borderColor = '#475569';
        dropzone.style.backgroundColor = 'rgba(15, 23, 42, 0.55)';
      });

      dropzone.addEventListener('drop', async (event) => {
        event.preventDefault();
        dropzone.style.borderColor = '#475569';
        dropzone.style.backgroundColor = 'rgba(15, 23, 42, 0.55)';
        const droppedFile = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]
          ? event.dataTransfer.files[0]
          : null;
        if (droppedFile) {
          await handleTeacherJobsheetSelection(droppedFile);
        }
      });
    }

    renderTeacherJobsheetUI();
  }

  initTeacherJobsheetControls();

  function openTeacherTaskSetupModal(mode, customName) {
    pendingTaskDistributionMode = mode || 'qr';
    renderTeacherJobsheetUI();
    if (typeof renderTeacherTaskModulesPicker === 'function') {
      renderTeacherTaskModulesPicker();
    }
    const curProj = projectManager ? projectManager.getActiveProject() : null;
    const defaultTaskName = customName || (curProj ? curProj.name : ((canvas && canvas.circuit && canvas.circuit.header && canvas.circuit.header.name) || 'Rangkaian Tugas Praktikum'));
    
    if (inputTeacherTaskTitle) {
      inputTeacherTaskTitle.value = defaultTaskName;
    }
    if (inputTeacherTaskClass) {
      inputTeacherTaskClass.value = localStorage.getItem('mashimu_teacher_class') || '';
    }
    if (inputTeacherTaskSchool) {
      inputTeacherTaskSchool.value = localStorage.getItem('mashimu_teacher_school') || '';
    }

    if (btnConfirmTeacherTaskSetup) {
      btnConfirmTeacherTaskSetup.textContent = pendingTaskDistributionMode === 'hotspot' ? 'Mulai Sesi Hotspot' : 'Lanjutkan ke QR Code';
    }

    showModal(modalTeacherTaskSetup);

    setTimeout(() => {
      if (inputTeacherTaskClass && !inputTeacherTaskClass.value) {
        inputTeacherTaskClass.focus();
      } else if (inputTeacherTaskSchool && !inputTeacherTaskSchool.value) {
        inputTeacherTaskSchool.focus();
      } else if (inputTeacherTaskTitle) {
        inputTeacherTaskTitle.focus();
      }
    }, 150);
  }

  if (btnCloseTeacherTaskSetup) {
    btnCloseTeacherTaskSetup.addEventListener('click', () => {
      hideModal(modalTeacherTaskSetup);
    });
  }

  if (btnCancelTeacherTaskSetup) {
    btnCancelTeacherTaskSetup.addEventListener('click', () => {
      hideModal(modalTeacherTaskSetup);
    });
  }

  if (btnConfirmTeacherTaskSetup) {
    btnConfirmTeacherTaskSetup.addEventListener('click', () => {
      const taskTitle = inputTeacherTaskTitle ? inputTeacherTaskTitle.value.trim() : '';
      const teacherClass = inputTeacherTaskClass ? inputTeacherTaskClass.value.trim() : '';
      const teacherSchool = inputTeacherTaskSchool ? inputTeacherTaskSchool.value.trim() : '';

      if (teacherClass) localStorage.setItem('mashimu_teacher_class', teacherClass);
      if (teacherSchool) localStorage.setItem('mashimu_teacher_school', teacherSchool);

      hideModal(modalTeacherTaskSetup);

      if (pendingTaskDistributionMode === 'hotspot') {
        openClassroomHotspotModal(taskTitle, teacherClass, teacherSchool);
      } else {
        openCircuitQrExportModal(taskTitle, teacherClass, teacherSchool);
      }
    });
  }

  if (btnExportQrOption) {
    btnExportQrOption.addEventListener('click', () => {
      const customName = inputSaveAsFileName ? inputSaveAsFileName.value.trim() : '';
      hideModal(modalSaveAs);
      openTeacherTaskSetupModal('qr', customName);
    });
  }

  if (btnCloseQrExport) {
    btnCloseQrExport.addEventListener('click', () => {
      hideModal(modalQrExport);
    });
  }

  if (btnCloseQrModalBtn) {
    btnCloseQrModalBtn.addEventListener('click', () => {
      hideModal(modalQrExport);
    });
  }

  if (btnDownloadQrPng && qrCanvas) {
    btnDownloadQrPng.addEventListener('click', () => {
      try {
        const url = qrCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const title = (qrCircuitTitle ? qrCircuitTitle.textContent.trim() : 'Sirkuit').replace(/[\\/:*?"<>|\x00-\x1F\x80-\x9F]/g, '');
        a.download = `QR_Tugas_${title || 'Sirkuit'}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) a.parentNode.removeChild(a);
        }, 3000);
        showToast('Gambar QR Code berhasil diunduh!');
      } catch (err) {
        showToast('Gagal mengunduh gambar QR: ' + err.message);
      }
    });
  }

  if (btnCopyQrPayload) {
    btnCopyQrPayload.addEventListener('click', async () => {
      if (currentQrPayload) {
        try {
          await navigator.clipboard.writeText(currentQrPayload);
          showToast('Kode sirkuit berhasil disalin ke clipboard!');
        } catch (err) {
          showToast('Gagal menyalin kode sirkuit.');
        }
      }
    });
  }

  // Classroom Hotspot Server Handlers
  const classroomFirewallBanner = document.getElementById('classroomFirewallBanner');
  const classroomFirewallTitle = document.getElementById('classroomFirewallTitle');
  const classroomFirewallDetail = document.getElementById('classroomFirewallDetail');
  const btnAllowClassroomFirewall = document.getElementById('btnAllowClassroomFirewall');
  const btnAllowClassroomFirewallText = document.getElementById('btnAllowClassroomFirewallText');

  function renderClassroomFirewallState(fw) {
    if (!classroomFirewallBanner) return;
    if (!fw || !fw.status || fw.status === 'unknown') {
      classroomFirewallBanner.style.display = 'none';
      return;
    }

    classroomFirewallBanner.style.display = 'flex';
    classroomFirewallBanner.classList.remove('is-allowed', 'is-warning', 'is-blocked');

    if (fw.status === 'allowed') {
      classroomFirewallBanner.classList.add('is-allowed');
      if (classroomFirewallTitle) classroomFirewallTitle.textContent = 'Windows Firewall: Terbuka (Whitelist Aktif)';
      if (classroomFirewallDetail) classroomFirewallDetail.textContent = fw.detail || 'HP siswa siap terhubung ke Hotspot Guru.';
      if (btnAllowClassroomFirewall) btnAllowClassroomFirewall.style.display = 'none';
    } else if (fw.status === 'blocked') {
      classroomFirewallBanner.classList.add('is-blocked');
      if (classroomFirewallTitle) classroomFirewallTitle.textContent = 'Akses Hotspot Terblokir Windows Firewall';
      if (classroomFirewallDetail) classroomFirewallDetail.textContent = fw.detail || 'Kemungkinan sebelumnya menekan Batal. Klik tombol di kanan untuk membuka blokir.';
      if (btnAllowClassroomFirewall) btnAllowClassroomFirewall.style.display = 'inline-flex';
      if (btnAllowClassroomFirewallText) btnAllowClassroomFirewallText.textContent = 'Buka Blokir Firewall';
    } else {
      classroomFirewallBanner.classList.add('is-warning');
      if (classroomFirewallTitle) classroomFirewallTitle.textContent = 'Whitelist Windows Firewall Belum Lengkap';
      if (classroomFirewallDetail) classroomFirewallDetail.textContent = fw.detail || 'Pasang whitelist (Private & Public) agar HP siswa bebas hambatan.';
      if (btnAllowClassroomFirewall) btnAllowClassroomFirewall.style.display = 'inline-flex';
      if (btnAllowClassroomFirewallText) btnAllowClassroomFirewallText.textContent = 'Pasang Whitelist';
    }
  }

  async function refreshClassroomFirewallBanner() {
    if (!classroomFirewallBanner || !window.TauriBridge || !window.TauriBridge.isTauri()) return;
    try {
      const fw = await window.TauriBridge.checkClassroomFirewallStatus();
      renderClassroomFirewallState(fw);
    } catch (_) {}
  }

  if (btnAllowClassroomFirewall) {
    btnAllowClassroomFirewall.addEventListener('click', async () => {
      if (!window.TauriBridge || !window.TauriBridge.isTauri()) return;
      btnAllowClassroomFirewall.disabled = true;
      const prevLabel = btnAllowClassroomFirewallText ? btnAllowClassroomFirewallText.textContent : '';
      if (btnAllowClassroomFirewallText) btnAllowClassroomFirewallText.textContent = 'Memproses...';
      try {
        const fw = await window.TauriBridge.allowClassroomFirewall();
        renderClassroomFirewallState(fw);
        if (fw && fw.status === 'allowed') {
          showToast('Whitelist Windows Firewall aktif! HP siswa siap terhubung.', true);
        } else {
          showToast('Status Firewall diperbarui. Pastikan memilih Yes saat izin Administrator muncul.');
        }
      } catch (err) {
        const msg = typeof err === 'string' ? err : (err && err.message ? err.message : 'Gagal mengatur Firewall');
        showToast(msg);
        if (btnAllowClassroomFirewallText && prevLabel) btnAllowClassroomFirewallText.textContent = prevLabel;
      } finally {
        btnAllowClassroomFirewall.disabled = false;
      }
    });
  }

  async function openClassroomHotspotModal(customName, teacherClass, teacherSchool) {
    if (!modalClassroomHotspot) return;

    const taskName = customName || (canvas && canvas.circuit && canvas.circuit.header && canvas.circuit.header.name) || 'Rangkaian_Tugas_Praktikum';
    const finalClass = teacherClass !== undefined ? teacherClass : (localStorage.getItem('mashimu_teacher_class') || '');
    const finalSchool = teacherSchool !== undefined ? teacherSchool : (localStorage.getItem('mashimu_teacher_school') || '');

    if (!window.TauriBridge || !window.TauriBridge.isTauri()) {
      openCircuitQrExportModal(taskName, finalClass, finalSchool);
      showToast('Mode Web: Membagikan tugas via QR Code langsung (Siap discan siswa)', true);
      return;
    }

    renderClassroomSubmissions([]);

    const hasJobsheet = Boolean(teacherJobsheetState.base64Data && teacherJobsheetState.filename);
    const attachedHotspotModules = typeof getSelectedTeacherTaskModules === 'function' ? getSelectedTeacherTaskModules() : [];
    const hasCustomModules = attachedHotspotModules.length > 0;
    const rawCircuit = {
      header: {
        generator: 'Mashimurelay',
        version: '1.0',
        name: taskName,
        class: finalClass,
        school: finalSchool,
        created_at: new Date().toISOString()
      },
      class: finalClass,
      school: finalSchool,
      assignmentKit: canvas && canvas.circuit ? canvas.circuit.assignmentKit : undefined,
      jobsheet: {
        available: hasJobsheet,
        filename: hasJobsheet ? teacherJobsheetState.filename : null,
        sizeBytes: hasJobsheet ? teacherJobsheetState.sizeBytes : 0,
        endpoint: hasJobsheet ? '/jobsheet.pdf' : null
      },
      modulesMeta: {
        available: hasCustomModules,
        count: attachedHotspotModules.length,
        endpoint: hasCustomModules ? '/modules.json' : null
      },
      customModules: hasCustomModules ? attachedHotspotModules : undefined,
      data: canvas.circuit ? canvas.circuit.data : []
    };
    const jsonString = JSON.stringify(rawCircuit, null, 2);
    const modulesJsonString = hasCustomModules ? JSON.stringify(attachedHotspotModules) : null;

    try {
      showToast('Memulai server Hotspot guru...');
      const serverInfo = await window.TauriBridge.startClassroomServer(
        taskName,
        jsonString,
        teacherJobsheetState.base64Data,
        teacherJobsheetState.filename,
        modulesJsonString
      );
      if (!serverInfo) {
        showToast('Gagal menyalakan server Hotspot.');
        return;
      }

      if (hotspotTaskTitle) hotspotTaskTitle.textContent = taskName;
      if (hotspotServerUrlText) hotspotServerUrlText.textContent = serverInfo.url;
      if (hotspotStatusLabel) hotspotStatusLabel.textContent = `Server aktif di ${serverInfo.ip}:${serverInfo.port}`;
      if (classroomFolderPathDisplay && serverInfo.save_dir) {
        classroomFolderPathDisplay.textContent = serverInfo.save_dir;
        classroomFolderPathDisplay.title = serverInfo.save_dir;
      }

      // Render clean, chunky QR code of the short URL
      if (typeof qrcode !== 'undefined' && qrHotspotCanvas) {
        const qr = qrcode(0, 'M');
        qr.addData(serverInfo.url);
        qr.make();

        const moduleCount = qr.getModuleCount();
        const margin = 2;
        const totalModules = moduleCount + margin * 2;
        const targetSize = 160;
        const cellSize = Math.max(2, Math.floor(targetSize / totalModules));
        const actualSize = cellSize * totalModules;

        qrHotspotCanvas.width = actualSize;
        qrHotspotCanvas.height = actualSize;
        const ctx = qrHotspotCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, actualSize, actualSize);
        ctx.fillStyle = '#0f172a';
        for (let r = 0; r < moduleCount; r++) {
          for (let c = 0; c < moduleCount; c++) {
            if (qr.isDark(r, c)) {
              ctx.fillRect((c + margin) * cellSize, (r + margin) * cellSize, cellSize, cellSize);
            }
          }
        }
      }

      showModal(modalClassroomHotspot);
      window.classroomHotspotSessionActive = true;
      if (modalClassroomHotspot) {
        modalClassroomHotspot.classList.remove('classroom-hotspot-docked', 'is-minimized');
      }

      updateClassroomModeUI(false);
      refreshClassroomFirewallBanner();

      // Start live poll of submissions
      if (classroomPollInterval) clearInterval(classroomPollInterval);
      const pollSubmissions = async () => {
        const status = await window.TauriBridge.getClassroomStatus();
        if (status) {
          if (status.submissions) {
            renderClassroomSubmissions(status.submissions);
          }
          if (status.server_info && status.server_info.save_dir && classroomFolderPathDisplay) {
            classroomFolderPathDisplay.textContent = status.server_info.save_dir;
            classroomFolderPathDisplay.title = status.server_info.save_dir;
          }
          if (status.exam_mode !== undefined && status.exam_mode !== currentClassroomExamMode) {
            updateClassroomModeUI(status.exam_mode);
          }
        }
      };
      await pollSubmissions();
      classroomPollInterval = setInterval(pollSubmissions, 500);

    } catch (err) {
      console.error('Classroom server error:', err);
      showToast('Gagal memulai server Hotspot: ' + (err.message || err));
    }
  }

  let lastSubmissionsRenderHash = '';
  let classroomSubmissionsData = [];

  function renderClassroomSubmissions(submissions) {
    if (!classroomSubmissionsTbody) return;
    const list = Array.isArray(submissions) ? submissions : [];
    classroomSubmissionsData = list;
    if (submissionCountBadge) submissionCountBadge.textContent = list.length;

    if (list.length === 0) {
      if (lastSubmissionsRenderHash !== '__empty__') {
        lastSubmissionsRenderHash = '__empty__';
        classroomSubmissionsTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 22px; color: var(--text-muted); font-size: 11px;">
              Belum ada tugas yang dikumpulkan siswa.
            </td>
          </tr>
        `;
      }
      return;
    }

    // Urutan: Siswa yang paling cepat mengumpulkan berada paling atas (urutan kedatangan pertama di server)
    const sorted = [...list];
    const currentHash = sorted.map((s, idx) => `${s.presensi_no || ''}_${s.student_name || ''}_${s.timestamp || ''}_${s.revision || 1}_${idx}`).join('|');

    if (currentHash === lastSubmissionsRenderHash) {
      // Data stabil, JANGAN rebuild innerHTML agar event click tidak pernah terlepas!
      return;
    }
    lastSubmissionsRenderHash = currentHash;

    classroomSubmissionsTbody.innerHTML = sorted.map((sub, idx) => `
      <tr style="border-bottom: 1px solid var(--border-color); background: ${idx === 0 ? 'rgba(16, 185, 129, 0.08)' : 'transparent'};">
        <td style="padding: 7px 10px; text-align: center;">
          ${idx === 0 
            ? '<span style="background: rgba(16, 185, 129, 0.16); color: var(--accent-success); border: 1px solid rgba(16, 185, 129, 0.45); padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; white-space: nowrap;">#1 Tercepat</span>'
            : `<span style="color: var(--text-muted); font-size: 11px; font-family: monospace; font-weight: 600;">#${idx + 1}</span>`
          }
        </td>
        <td style="padding: 7px 10px; text-align: center; font-weight: 700; color: var(--accent-primary); font-family: monospace;">${escapeHtml(sub.presensi_no || '-')}</td>
        <td style="padding: 7px 10px; font-weight: 600; color: var(--text-primary);">
          ${escapeHtml(sub.student_name || 'Siswa')}
          ${sub.revision && sub.revision > 1 ? `<span style="background: rgba(245, 158, 11, 0.18); color: var(--accent-warning); border: 1px solid rgba(245, 158, 11, 0.4); padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-left: 6px; vertical-align: middle;">Revisi ${sub.revision}</span>` : ''}
        </td>
        <td style="padding: 7px 10px; text-align: center; color: var(--text-secondary); font-size: 11px; font-family: monospace;">${escapeHtml(sub.timestamp || '-')}</td>
        <td style="padding: 7px 10px; text-align: center;">
          <button type="button" class="btn btn-sm btn-load-student-task" data-sub-idx="${idx}" style="padding: 3px 8px; font-size: 11px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); color: var(--accent-primary); cursor: pointer;">
            Buka di Kanvas
          </button>
        </td>
      </tr>
    `).join('');
  }
  window.renderClassroomSubmissions = renderClassroomSubmissions;

  // Event delegation tunggal dan instan untuk tombol "Buka di Kanvas" (1x klik langsung respon)
  if (classroomSubmissionsTbody) {
    classroomSubmissionsTbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-load-student-task');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-sub-idx'), 10);
      if (isNaN(idx)) return;

      const sub = classroomSubmissionsData[idx];
      if (sub && sub.content) {
        try {
          // Modal hotspot tetap terpaku di tab workspace utama guru; sembunyikan di tab siswa yang dibuka
          if (modalClassroomHotspot) {
            modalClassroomHotspot.style.display = 'none';
            modalClassroomHotspot.classList.remove('classroom-hotspot-docked', 'is-minimized');
          }

          if (window.reviewTabManager) {
            window.reviewTabManager.openReviewTab(sub, idx, classroomSubmissionsData);
          } else if (canvas.importCircuit) {
            const parsed = typeof sub.content === 'string' ? JSON.parse(sub.content) : sub.content;
            canvas.importCircuit(parsed);
            showToast(`Memuat tugas siswa: ${sub.student_name} (Presensi ${sub.presensi_no})`);
          }
        } catch (err) {
          console.error('Error opening student task:', err);
          showToast('Gagal memuat tugas siswa: ' + err.message);
        }
      }
    });
  }

  if (btnClassroomHotspotOption) {
    btnClassroomHotspotOption.addEventListener('click', () => {
      const customName = inputSaveAsFileName ? inputSaveAsFileName.value.trim() : '';
      hideModal(modalSaveAs);
      openTeacherTaskSetupModal('hotspot', customName);
    });
  }

  if (btnCloseClassroomModal) {
    btnCloseClassroomModal.addEventListener('click', () => {
      window.classroomHotspotSessionActive = false;
      hideModal(modalClassroomHotspot);
      if (modalClassroomHotspot) {
        modalClassroomHotspot.classList.remove('classroom-hotspot-docked', 'is-minimized');
      }
      if (classroomPollInterval) {
        clearInterval(classroomPollInterval);
        classroomPollInterval = null;
      }
    });
  }

  function updateClassroomModeUI(isExam) {
    currentClassroomExamMode = !!isExam;
    if (btnClassroomModePraktikum && btnClassroomModeUjian) {
      if (isExam) {
        btnClassroomModeUjian.style.background = '#ef4444';
        btnClassroomModeUjian.style.color = '#ffffff';
        btnClassroomModePraktikum.style.background = 'transparent';
        btnClassroomModePraktikum.style.color = 'var(--text-secondary)';
      } else {
        btnClassroomModePraktikum.style.background = '#3b82f6';
        btnClassroomModePraktikum.style.color = '#ffffff';
        btnClassroomModeUjian.style.background = 'transparent';
        btnClassroomModeUjian.style.color = 'var(--text-secondary)';
      }
    }
    if (classroomModeDescText) {
      classroomModeDescText.textContent = isExam
        ? 'Mode Ujian Aktif: Siswa hanya dapat mengumpulkan 1 kali. Pengiriman ulang oleh perangkat yang sama akan ditolak otomatis oleh server.'
        : 'Siswa diizinkan mengumpulkan berulang kali untuk perbaikan/revisi. Setiap revisi akan menimpa berkas lama dan mencatat nomor revisi.';
    }
    if (classroomModeDescIcon) {
      classroomModeDescIcon.innerHTML = isExam
        ? '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>'
        : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>';
      classroomModeDescIcon.setAttribute('stroke', isExam ? '#ef4444' : '#38bdf8');
    }
  }

  if (btnClassroomModePraktikum) {
    btnClassroomModePraktikum.addEventListener('click', async () => {
      if (window.TauriBridge && window.TauriBridge.setClassroomExamMode) {
        await window.TauriBridge.setClassroomExamMode(false);
      }
      updateClassroomModeUI(false);
      showToast('Mode Praktikum diaktifkan (Siswa bebas revisi tugas).');
    });
  }

  if (btnClassroomModeUjian) {
    btnClassroomModeUjian.addEventListener('click', async () => {
      if (window.TauriBridge && window.TauriBridge.setClassroomExamMode) {
        await window.TauriBridge.setClassroomExamMode(true);
      }
      updateClassroomModeUI(true);
      showToast('Mode Ujian diaktifkan (Pengumpulan tugas dikunci 1 kali).');
    });
  }

  if (btnStopClassroomServer) {
    btnStopClassroomServer.addEventListener('click', async () => {
      window.classroomHotspotSessionActive = false;
      if (window.TauriBridge && window.TauriBridge.isTauri()) {
        await window.TauriBridge.stopClassroomServer();
      }
      if (classroomPollInterval) {
        clearInterval(classroomPollInterval);
        classroomPollInterval = null;
      }
      renderClassroomSubmissions([]);
      hideModal(modalClassroomHotspot);
      if (modalClassroomHotspot) {
        modalClassroomHotspot.classList.remove('classroom-hotspot-docked', 'is-minimized');
      }
      showToast('Sesi kelas Hotspot dihentikan. Data pengumpulan di-reset.');
    });
  }

  if (btnOpenClassroomFolder) {
    btnOpenClassroomFolder.addEventListener('click', async () => {
      if (window.TauriBridge && window.TauriBridge.isTauri()) {
        await window.TauriBridge.openClassroomFolder();
      }
    });
  }

  if (btnChangeClassroomFolder) {
    btnChangeClassroomFolder.addEventListener('click', async () => {
      if (window.TauriBridge && window.TauriBridge.selectClassroomFolder) {
        try {
          const newPath = await window.TauriBridge.selectClassroomFolder();
          if (newPath) {
            if (classroomFolderPathDisplay) {
              classroomFolderPathDisplay.textContent = newPath;
              classroomFolderPathDisplay.title = newPath;
            }
            showToast('Folder penyimpanan diubah ke: ' + newPath);
          }
        } catch (e) {
          showToast('Gagal mengubah folder: ' + (e.message || e));
        }
      } else {
        showToast('Fitur pemilihan folder lokal hanya tersedia di versi desktop Windows.');
      }
    });
  }

  // Settings Modal Handlers
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      hideModal(modalSettings);
    });
  }

  if (settingAutoSaveCheckbox) {
    settingAutoSaveCheckbox.addEventListener('change', (e) => {
      isAutoSaveEnabled = e.target.checked;
      localStorage.setItem('mashimurelay_autosave_enabled', isAutoSaveEnabled ? 'true' : 'false');
      updateAutoSaveUI();
      if (isAutoSaveEnabled) {
        showToast('Auto-Save AKTIF: Perubahan disimpan otomatis.');
        if (projectManager) projectManager.autoSaveCurrent();
      } else {
        showToast('Auto-Save NONAKTIF.');
      }
    });
  }

  if (settingGridSelect) {
    settingGridSelect.addEventListener('change', (e) => {
      const newGrid = parseInt(e.target.value, 10) || 30;
      canvas.gridSize = newGrid;
      const gridPattern = document.getElementById('gridPattern');
      if (gridPattern) {
        gridPattern.setAttribute('width', newGrid);
        gridPattern.setAttribute('height', newGrid);
        const dotEl = gridPattern.querySelector('.grid-pattern-dot');
        if (dotEl) {
          dotEl.setAttribute('cx', String(newGrid / 2));
          dotEl.setAttribute('cy', String(newGrid / 2));
        }
        const lineEl = gridPattern.querySelector('.grid-pattern-line');
        if (lineEl) {
          lineEl.setAttribute('d', `M ${newGrid} 0 L 0 0 0 ${newGrid}`);
        }
      }
      canvas.render();
      showToast(`Ukuran grid disetel ke ${newGrid}px`);
    });
  }

  // Canvas Grid Style Controller ('both' | 'dots' | 'lines' | 'none')
  const GRID_STYLE_STORAGE_KEY = 'mashimurelay_grid_style';
  const VALID_GRID_STYLES = ['both', 'dots', 'lines', 'none'];
  const GRID_STYLE_LABELS = {
    both: 'Kombinasi',
    dots: 'Titik',
    lines: 'Garis',
    none: 'Polos'
  };
  const settingGridStyleGroup = document.getElementById('settingGridStyleGroup');

  function applyGridStyle(styleId, notify = false) {
    const next = VALID_GRID_STYLES.includes(styleId) ? styleId : 'both';
    document.documentElement.setAttribute('data-grid', next);
    try { localStorage.setItem(GRID_STYLE_STORAGE_KEY, next); } catch (_) {}
    if (settingGridStyleGroup) {
      settingGridStyleGroup.querySelectorAll('[data-grid-opt]').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-grid-opt') === next);
      });
    }
    if (notify) {
      showToast('Grid Kanvas: ' + (GRID_STYLE_LABELS[next] || 'Kombinasi'), true);
    }
  }

  const initialGridStyle = (() => {
    try { return localStorage.getItem(GRID_STYLE_STORAGE_KEY) || 'both'; } catch (_) { return 'both'; }
  })();
  applyGridStyle(initialGridStyle, false);

  if (settingGridStyleGroup) {
    settingGridStyleGroup.querySelectorAll('[data-grid-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        applyGridStyle(btn.getAttribute('data-grid-opt'), true);
      });
    });
  }

  if (settingGlowCheckbox) {
    const savedGlow = localStorage.getItem('mashimurelay_wire_glow');
    settingGlowCheckbox.checked = (savedGlow !== null) ? (savedGlow === 'true') : true;
    settingGlowCheckbox.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      if (canvas) {
        canvas.enableWireGlow = isEnabled;
        if (canvas.isSimulating) {
          canvas.updateSimulationVisuals();
        }
      }
      localStorage.setItem('mashimurelay_wire_glow', isEnabled ? 'true' : 'false');
      showToast(isEnabled ? 'Pendaran kabel (glow) diaktifkan' : 'Pendaran kabel (glow) dinonaktifkan');
    });
  }

  // Helper: Sinkronisasi visibilitas Label Terminal & Nama Komponen di kanvas
  function applyCanvasVisibilitySettings() {
    // Default OFF/Mati untuk Label Terminal sesuai permintaan pengguna
    const showTerminalLabels = localStorage.getItem('mashimu_show_terminal_labels') === 'true';
    const showComponentNames = localStorage.getItem('mashimu_show_component_names') === 'true';

    if (svgEl) {
      svgEl.classList.toggle('hide-terminal-labels', !showTerminalLabels);
      svgEl.classList.toggle('hide-component-names', !showComponentNames);
    }
  }

  // Inisialisasi awal visibilitas saat aplikasi dimuat
  applyCanvasVisibilitySettings();

  if (settingTerminalLabelsCheckbox) {
    // Default OFF: hanya dicentang jika nilai eksplisit 'true' tersimpan
    settingTerminalLabelsCheckbox.checked = localStorage.getItem('mashimu_show_terminal_labels') === 'true';
    settingTerminalLabelsCheckbox.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      localStorage.setItem('mashimu_show_terminal_labels', isEnabled ? 'true' : 'false');
      applyCanvasVisibilitySettings();
      showToast(isEnabled ? 'Label terminal diaktifkan' : 'Label terminal dinonaktifkan', true);
    });
  }

  if (settingSoundCheckbox) {
    settingSoundCheckbox.checked = window.soundManager ? !window.soundManager.isMuted : true;
    settingSoundCheckbox.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      if (window.soundManager) {
        window.soundManager.setMuted(!isEnabled);
        updateSoundButtonUI();
      }
      showToast(isEnabled ? 'Efek suara sirkuit diaktifkan' : 'Efek suara sirkuit dinonaktifkan', true);
    });
  }

  // Sinkronisasi checkbox suara jika diubah lewat shortcut keyboard (M) atau tombol toolbar
  window.addEventListener('sound-mute-changed', (e) => {
    if (settingSoundCheckbox && e.detail) {
      settingSoundCheckbox.checked = !e.detail.isMuted;
    }
  });

  if (settingComponentNamesCheckbox) {
    settingComponentNamesCheckbox.checked = localStorage.getItem('mashimu_show_component_names') === 'true';
    settingComponentNamesCheckbox.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      localStorage.setItem('mashimu_show_component_names', isEnabled ? 'true' : 'false');
      applyCanvasVisibilitySettings();
      showToast(isEnabled ? 'Nama komponen kanvas diaktifkan' : 'Nama komponen kanvas dinonaktifkan', true);
    });
  }

  if (btnSettingsClearCanvas) {
    btnSettingsClearCanvas.addEventListener('click', () => {
      hideModal(modalSettings);
      if (btnClear) btnClear.click();
    });
  }


  // Ensure pure dark mode across all sessions
  try {
    localStorage.removeItem('mashimurelay_theme');
    document.body.classList.remove('theme-light');
  } catch (_) {}

  // What's New & Unlock & About Handlers
  if (btnCloseWhatsNew) {
    btnCloseWhatsNew.addEventListener('click', () => {
      hideModal(modalWhatsNew);
    });
  }

  if (btnCloseInstructions) {
    btnCloseInstructions.addEventListener('click', () => {
      hideModal(modalInstructions);
      if (window.simVideoPlayer) window.simVideoPlayer.pause();
      stopEasterEggBgm(true);
    });
  }

  // Instructions Tab Switching Handlers
  const instTabs = document.querySelectorAll('.inst-tab');
  instTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      instTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.querySelectorAll('.inst-section').forEach(sec => {
        sec.classList.remove('active');
        sec.style.display = 'none';
        sec.scrollTop = 0;
      });
      const targetSec = document.getElementById(targetId);
      if (targetSec) {
        targetSec.classList.add('active');
        targetSec.style.display = (targetId === 'tabVideoSim' ? 'flex' : 'block');
        targetSec.scrollTop = 0;
      }
      resetPanelScroll(modalInstructions);
      if (targetId === 'tabVideoSim' && window.simVideoPlayer) {
        window.simVideoPlayer.renderStepsList();
        window.simVideoPlayer.renderFrame();
        stopEasterEggBgm(true);
      } else if (targetId === 'tabComponents') {
        if (window.simVideoPlayer) {
          window.simVideoPlayer.pause();
        }
        renderEncyclopediaGallery();
      } else {
        if (window.simVideoPlayer) {
          window.simVideoPlayer.pause();
        }
        stopEasterEggBgm(true);
      }
    });
  });

  // Horizontal wheel scroll helper for desktop PC mouse users
  const setupHorizontalWheelScroll = (selectorOrEl) => {
    const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
    if (!el || el._hasWheelScroll) return;
    el._hasWheelScroll = true;
    el.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  };
  setupHorizontalWheelScroll('.instructions-tabs');

  // Instructions & Encyclopedia System
  let activeEncycloCategory = 'all';
  let activeEncycloQuery = '';

  function openInstructionsModal() {
    resetPanelScroll(modalInstructions);
    setupHorizontalWheelScroll('.instructions-tabs');
    const mount = document.getElementById('simVideoPlayerMount');
    if (mount && window.simVideoPlayer && !mount.hasChildNodes()) {
      window.simVideoPlayer.init(mount);
    } else if (window.simVideoPlayer) {
      window.simVideoPlayer.renderFrame();
    }
    setTimeout(() => {
      setupHorizontalWheelScroll('.sim-video-pills');
    }, 100);
    renderEncyclopediaGallery();
    resetPanelScroll(modalInstructions);
  }

  // Easter Egg Background Audio System
  let activeEasterEggAudio = null;
  let activeEasterEggTrack = null;
  let audioFadeInterval = null;

  function startAudioFadeIn(audio) {
    clearInterval(audioFadeInterval);
    let vol = audio.volume;
    audioFadeInterval = setInterval(() => {
      vol += 0.05;
      if (vol >= 0.65) {
        vol = 0.65;
        clearInterval(audioFadeInterval);
      }
      if (activeEasterEggAudio) activeEasterEggAudio.volume = vol;
    }, 80);
  }

  function playEasterEggBgm(trackUrl) {
    if (activeEasterEggTrack === trackUrl && activeEasterEggAudio && !activeEasterEggAudio.paused) {
      return;
    }
    stopEasterEggBgm(false);

    try {
      const audio = new Audio(trackUrl);
      audio.loop = true;
      audio.volume = 0;
      activeEasterEggAudio = audio;
      activeEasterEggTrack = trackUrl;

      const triggerPlayback = () => {
        if (!activeEasterEggAudio || activeEasterEggTrack !== trackUrl) return;
        const playPromise = activeEasterEggAudio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            startAudioFadeIn(activeEasterEggAudio);
          }).catch(err => {
            console.log('Easter egg audio awaiting user interaction gesture:', err);
          });
        }
      };

      triggerPlayback();

      const unlockOnGesture = () => {
        if (activeEasterEggAudio && activeEasterEggAudio.paused && activeEasterEggTrack === trackUrl) {
          triggerPlayback();
        }
        window.removeEventListener('pointerdown', unlockOnGesture);
        window.removeEventListener('click', unlockOnGesture);
        window.removeEventListener('keydown', unlockOnGesture);
      };

      window.addEventListener('pointerdown', unlockOnGesture, { once: true });
      window.addEventListener('click', unlockOnGesture, { once: true });
      window.addEventListener('keydown', unlockOnGesture, { once: true });
    } catch (e) {
      console.error('Easter egg audio error:', e);
    }
  }

  function stopEasterEggBgm(smooth = true) {
    clearInterval(audioFadeInterval);
    if (!activeEasterEggAudio) {
      activeEasterEggTrack = null;
      return;
    }

    const audioToStop = activeEasterEggAudio;
    activeEasterEggAudio = null;
    activeEasterEggTrack = null;

    if (!smooth) {
      try {
        audioToStop.pause();
        audioToStop.currentTime = 0;
      } catch (e) {}
      return;
    }

    try {
      let vol = audioToStop.volume;
      const fadeOutInterval = setInterval(() => {
        vol -= 0.1;
        if (vol <= 0) {
          vol = 0;
          clearInterval(fadeOutInterval);
          try {
            audioToStop.pause();
            audioToStop.currentTime = 0;
          } catch (e) {}
        } else {
          audioToStop.volume = vol;
        }
      }, 50);
    } catch (e) {
      try { audioToStop.pause(); } catch (_) {}
    }
  }

  const SECRET_DEV_TRIGGERS = new Set([
    'pesan-dev',
    'pesan dev',
    'pesan developer',
    'pesan mash',
    'pesan-mash',
    'pesan-mash-dev',
    'pesan mash dev'
  ]);

  const SECRET_LOVER_TRIGGERS = new Set([
    'zaamoll-secret',
    'zaamoll secret',
    'zaamoll-special',
    'zaamoll special',
    'special zaamoll',
    'special-zaamoll'
  ]);

  function attachEasterEggCardAudioTriggers(card) {
    const triggerAudio = () => {
      if (activeEasterEggAudio && activeEasterEggAudio.paused) {
        activeEasterEggAudio.play().then(() => {
          startAudioFadeIn(activeEasterEggAudio);
        }).catch(() => {});
      }
    };
    ['mouseenter', 'pointerenter', 'pointermove', 'mouseover', 'pointerdown', 'click', 'touchstart'].forEach(evt => {
      card.addEventListener(evt, triggerAudio, { passive: true });
    });
  }

  function createSpecialLoverEasterEggCard() {
    const card = document.createElement('div');
    card.className = 'encyclo-card encyclo-card-special';
    card.innerHTML = `
      <div class="encyclo-special-header">
        <div class="encyclo-special-header-row">
          <div class="encyclo-special-title">Pesan untuk Orang Tersayang</div>
          <div class="encyclo-special-badge">SPECIAL</div>
        </div>
        <div class="badges-row">
          <span class="encyclo-special-tag">Tag: <span>Lover</span></span>
          <span class="encyclo-special-archive-badge">Secret Archive</span>
        </div>
      </div>
      <div class="encyclo-special-collage-box">
        <div class="encyclo-special-collage-container">
          <img src="assets/icons/lover_collage.svg" alt="Lover Collage" />
        </div>
      </div>
      <div class="encyclo-special-partner-box">
        <div class="encyclo-special-partner-text">
          Maulana <span class="name-highlight">&ldquo;Mash&rdquo;</span> Henutama dan<br>Halimatuz <span class="name-highlight">&ldquo;Izza&rdquo;</span> Zahroh
        </div>
      </div>
      <div class="encyclo-special-msg-box">
        <div class="encyclo-special-msg-header">
          <span class="encyclo-special-msg-badge">Love Message</span>
        </div>
        <div class="encyclo-special-msg-content">
          Terima kasih sudah membersamai developer selama pembuatan dan pengembangan software ini. Terima kasih banyak atas tenaga, waktu, pikiran, dan supportnya, sengg. Maaf yaa, selalu ngerepotin kamu, bikin ngambek kamu, dan menghilang demi porject ini （*＾-＾*）. <span class="highlight-love">LOVE YOU BANYAKK SAYANGG ❤❤❤</span>
        </div>
      </div>
    `;
    attachEasterEggCardAudioTriggers(card);
    return card;
  }

  function createDevEasterEggCard() {
    const card = document.createElement('div');
    card.className = 'encyclo-card encyclo-card-secret';
    card.innerHTML = `
      <div class="encyclo-card-header">
        <div class="encyclo-icon-box encyclo-secret-icon-box">
          <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <clipPath id="devPhotoClipApp">
                <rect x="4" y="4" width="112" height="112" rx="20" />
              </clipPath>
              <linearGradient id="avatarBorderGradApp" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#38bdf8" />
                <stop offset="100%" stop-color="#0284c7" />
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="112" height="112" rx="20" fill="#0b1120" />
            <image href="assets/icons/developer_avatar.png" x="4" y="4" width="112" height="112" clip-path="url(#devPhotoClipApp)" preserveAspectRatio="xMidYMid slice" />
            <rect x="4" y="4" width="112" height="112" rx="20" fill="none" stroke="url(#avatarBorderGradApp)" stroke-width="3" />
            <circle cx="16" cy="16" r="2.5" fill="#38bdf8" />
            <circle cx="104" cy="16" r="2.5" fill="#38bdf8" />
            <circle cx="16" cy="104" r="2.5" fill="#38bdf8" />
            <circle cx="104" cy="104" r="2.5" fill="#38bdf8" />
          </svg>
        </div>
        <div class="encyclo-header-meta">
          <div class="encyclo-secret-title-row">
            <div class="encyclo-title">Pesan <span style="color: #38bdf8;">&ldquo;Mash&rdquo;</span> Developer</div>
            <div class="encyclo-secret-badge">SECRET</div>
          </div>
          <div class="encyclo-badges-row">
            <span class="encyclo-tag-badge">Tag: Message</span>
            <span class="encyclo-cat-badge">Secret Archive</span>
          </div>
        </div>
      </div>
      <div class="encyclo-desc" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(51, 65, 85, 0.55); border-radius: 12px; padding: 16px 18px;">
        <div class="encyclo-secret-headline">Terima Kasih Semuanya, Selamat Telah Menemukan Rahasia Ini :D</div>
        <div style="font-size: 13.5px; line-height: 1.65; color: #cbd5e1; text-align: justify;">
          Saya di sini sebagai pengembang dari software Mashimurelay ini sangat berterimakasih kepada seluruh pengguna yang telah mau menggunakan dan memanfaatkan software ini untuk perkembangan pendidikan teknik di Indonesia. Terima kasih untuk Guru yang mau berbagi ilmu dan Murid yang mau menerima ilmu, serta Kalian yang sudah bekerja keras sampai saat ini. Tidak lupa juga untuk Antigravity yang sudah sangat membantu developer dalam pengembangan software ini dari awal sampai akhir. <strong style="color: #38bdf8;">TETAP SEMANGAT!!!</strong>
        </div>
      </div>
      <div class="encyclo-secret-motto">
        &ldquo;Do better than yesterday, be the best for today, and doing greatfull for tomorrow&rdquo;
      </div>
      <div class="encyclo-secret-meta">
        <div class="encyclo-secret-meta-row">
          <span class="encyclo-secret-meta-label">Tanggal</span>
          <span class="encyclo-secret-meta-val">23-10-2026</span>
        </div>
        <div class="encyclo-secret-meta-row">
          <span class="encyclo-secret-meta-label">Tujuan</span>
          <span class="encyclo-secret-meta-val">Skripsi developer (. ❛ ᴗ ❛.)</span>
        </div>
        <div class="encyclo-secret-meta-row">
          <span class="encyclo-secret-meta-label">Harapan</span>
          <span class="encyclo-secret-meta-val">Semoga kerja keras ini berguna dan bermanfaat untuk kita semua</span>
        </div>
      </div>
    `;
    attachEasterEggCardAudioTriggers(card);
    return card;
  }

  function renderEncyclopediaGallery() {
    const grid = document.getElementById('encycloGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (typeof COMPONENTS_DATA === 'undefined') return;

    const query = activeEncycloQuery.toLowerCase().trim();
    let count = 0;
    const knowledgeBase = window.COMPONENT_ENCYCLOPEDIA_KNOWLEDGE || {};

    // Secret Easter Egg Trigger Check
    if (activeEncycloCategory === 'all' && SECRET_DEV_TRIGGERS.has(query)) {
      grid.appendChild(createDevEasterEggCard());
      count++;
      playEasterEggBgm('assets/sounds/secret_dev_bgm.m4a');
    } else if (activeEncycloCategory === 'all' && SECRET_LOVER_TRIGGERS.has(query)) {
      grid.appendChild(createSpecialLoverEasterEggCard());
      count++;
      playEasterEggBgm('assets/sounds/special_lover_bgm.m4a');
    } else {
      stopEasterEggBgm(true);
    }

    for (const [k, v] of Object.entries(COMPONENTS_DATA)) {
      const cat = v.category || (v.info && v.info.category) || 'others';
      const name = (window.COMPONENT_DISPLAY_NAMES && window.COMPONENT_DISPLAY_NAMES[k]) || v.name || (v.info && v.info.name) || k;
      const tagType = v.tagType || (v.info && v.info.tagType) || '-';
      const knowledge = knowledgeBase[k] || {};
      const displayName = knowledge.name || name;

      // Category filter
      if (activeEncycloCategory !== 'all' && cat !== activeEncycloCategory) continue;

      // Search query filter (search across name, standard technical name, tag, category, desc, how, and terminal pins)
      if (query) {
        const ioSearch = Array.isArray(knowledge.io) ? knowledge.io.map(i => `${i.pin} ${i.desc}`).join(' ') : '';
        const searchTerms = `${name} ${displayName} ${k} ${cat} ${tagType} ${knowledge.desc || ''} ${knowledge.how || ''} ${ioSearch}`.toLowerCase();
        if (!searchTerms.includes(query)) {
          continue;
        }
      }

      count++;
      const desc = knowledge.desc || (v.info && v.info.description) || `Komponen kelistrikan kategori ${cat}.`;
      const how = knowledge.how || 'Mengalirkan arus dan sinyal kontrol pada diagram skematik otomasi.';
      const simVideo = knowledge.simVideo || (
        k.includes('thermal') || k.includes('overload') ? 'thermal_overload' :
        k.includes('timer_on') || k.includes('ton') || k.includes('delay_on') ? 'on_delay' :
        k.includes('timer_off') || k.includes('toff') || k.includes('delay_off') ? 'off_delay' :
        k.includes('breaker') || k.includes('mcb') || k.includes('fuse') ? 'short_circuit' :
        k.includes('horn') || k.includes('klakson') ? 'klakson_relay' :
        k.includes('flasher') || k.includes('sein') || k.includes('hazard') ? 'lampu_sein_flasher' :
        k.includes('headlamp') || k.includes('lampu_kepala') ? 'lampu_kepala_relay' :
        k.includes('starter') || k.includes('bendix') ? 'motor_starter_bendix' :
        k.includes('wiper') ? 'wiper_auto_stop' :
        k.includes('ignition') || k.includes('tci') || k.includes('pengapian') ? 'pengapian_tci' :
        k.includes('coil') || k.includes('contactor') || k.includes('motor') || k.includes('button') ? 'dol_starter' : null
      );

      const ioList = Array.isArray(knowledge.io) ? knowledge.io : [];
      let ioHtml = '';
      if (ioList.length > 0) {
        const ioItems = ioList.map(item => {
          const typeClass = (item.type || 'io').toLowerCase();
          return `
            <div class="encyclo-io-item">
              <span class="encyclo-pin-badge pin-${typeClass}">${item.pin}</span>
              <span class="encyclo-pin-desc">${item.desc}</span>
            </div>
          `;
        }).join('');
        ioHtml = `
          <div class="encyclo-io-section">
            <div class="encyclo-io-title">Jalur Terminal Input &amp; Output:</div>
            <div class="encyclo-io-grid">
              ${ioItems}
            </div>
          </div>
        `;
      }

      let iconHtml = '';
      if (v && v.graphics) {
        const vb = v.viewBox || `0 0 ${v.width || 120} ${v.height || 120}`;
        iconHtml = `<svg viewBox="${vb}" class="encyclo-icon-svg" aria-hidden="true">${v.graphics}</svg>`;
      } else {
        iconHtml = `<img src="assets/icons/${k}.svg" alt="" class="encyclo-icon-img" loading="lazy" onerror="this.style.display='none'" />`;
      }

      const fullName = knowledge.name || name;

      const card = document.createElement('div');
      card.className = 'encyclo-card';
      card.innerHTML = `
        <div class="encyclo-card-header">
          <div class="encyclo-icon-box">
            ${iconHtml}
          </div>
          <div class="encyclo-header-meta">
            <div class="encyclo-title">${name}</div>
            <div class="encyclo-badges-row">
              <span class="encyclo-tag-badge">Tag: ${tagType}</span>
              <span class="encyclo-cat-badge">${cat}</span>
            </div>
          </div>
        </div>
        <div class="encyclo-desc">
          ${fullName && fullName !== name ? `<div class="encyclo-fullname"><strong>Nama Lengkap:</strong> ${fullName}</div>` : ''}
          <div class="encyclo-explanation"><strong>Penjelasan:</strong> ${desc}</div>
        </div>
        <div class="encyclo-how"><strong>Mekanisme Kerja:</strong> ${how}</div>
        ${ioHtml}
        ${simVideo ? `<button class="btn-watch-sim" data-sim="${simVideo}">▶ Tonton Video Simulasi</button>` : ''}
      `;

      // Button to watch simulation
      const btnSim = card.querySelector('.btn-watch-sim');
      if (btnSim) {
        btnSim.addEventListener('click', () => {
          const targetSim = btnSim.getAttribute('data-sim');
          // Switch tab to tabVideoSim
          const tabBtn = document.querySelector('.inst-tab[data-tab="tabVideoSim"]');
          if (tabBtn) tabBtn.click();
          if (window.simVideoPlayer) {
            window.simVideoPlayer.loadVideo(targetSim);
            window.simVideoPlayer.play();
          }
        });
      }

      grid.appendChild(card);
    }

    if (count === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-muted); font-size: 13px;">
          Tidak ada komponen yang cocok dengan kata kunci "<strong>${activeEncycloQuery}</strong>".
        </div>
      `;
    }
  }

  // Setup Encyclopedia filters & search
  const encycloSearchInput = document.getElementById('encycloSearchInput');
  if (encycloSearchInput) {
    const handleSearchInput = (e) => {
      activeEncycloQuery = e.target.value;
      renderEncyclopediaGallery();
      if (activeEasterEggAudio && activeEasterEggAudio.paused) {
        activeEasterEggAudio.play().then(() => {
          startAudioFadeIn(activeEasterEggAudio);
        }).catch(() => {});
      }
    };
    encycloSearchInput.addEventListener('input', handleSearchInput);
    encycloSearchInput.addEventListener('keydown', (e) => {
      setTimeout(() => {
        if (activeEasterEggAudio && activeEasterEggAudio.paused) {
          activeEasterEggAudio.play().then(() => {
            startAudioFadeIn(activeEasterEggAudio);
          }).catch(() => {});
        }
      }, 20);
    });
  }

  const filterContainer = document.getElementById('encycloFilters');
  if (filterContainer) {
    filterContainer.querySelectorAll('.encyclo-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filterContainer.querySelectorAll('.encyclo-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeEncycloCategory = btn.getAttribute('data-cat') || 'all';
        renderEncyclopediaGallery();
      });
    });
  }

  if (btnCloseAbout) {
    btnCloseAbout.addEventListener('click', () => {
      hideModal(modalAbout);
    });
  }

  // Dismiss overlay when clicking outside
  [modalSaveAs, modalTeacherTaskSetup, modalPdfStudentInfo, modalSettings, modalWhatsNew, modalInstructions, modalAbout, modalDashboard, modalQrExport, modalAssignmentKit, modalClassroomHotspot, document.getElementById('modalPracticalModules'), document.getElementById('modalCustomModuleEditor')].forEach(m => {
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) {
          if (m === modalClassroomHotspot && window.classroomHotspotSessionActive) {
            // Hotspot panel tetap terpaku di tab workspace utama sampai sesi diakhiri oleh guru
            return;
          }
          hideModal(m);
          if (m === modalInstructions) {
            if (window.simVideoPlayer) window.simVideoPlayer.pause();
            stopEasterEggBgm(true);
          }
        }
      });
    }
  });

  // Fullscreen Mode Management
  function triggerCanvasFit() {
    if (!canvas) return;
    canvas.fitToScreen();
    setTimeout(() => { if (canvas) canvas.fitToScreen(); }, 60);
    setTimeout(() => { if (canvas) canvas.fitToScreen(); }, 220);
  }

  function updateFullscreenUI() {
    const isFs = !!document.fullscreenElement || document.body.classList.contains('is-fullscreen');
    if (btnFullscreen) {
      if (isFs) {
        btnFullscreen.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg><span class="btn-text-label">Keluar Fullscreen</span>';
        btnFullscreen.title = 'Keluar dari mode layar penuh (F11 / Esc)';
      } else {
        btnFullscreen.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg><span class="btn-text-label">Fullscreen</span>';
        btnFullscreen.title = 'Layar Penuh / Fullscreen (F11)';
      }
    }
  }

  function toggleFullscreen() {
    hideCanvasContextMenu();
    if (!document.fullscreenElement && !document.body.classList.contains('is-fullscreen')) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          document.body.classList.add('is-fullscreen');
          updateFullscreenUI();
          triggerCanvasFit();
        });
      } else {
        document.body.classList.add('is-fullscreen');
        updateFullscreenUI();
        triggerCanvasFit();
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          document.body.classList.remove('is-fullscreen');
          updateFullscreenUI();
          triggerCanvasFit();
        });
      } else {
        document.body.classList.remove('is-fullscreen');
        updateFullscreenUI();
        triggerCanvasFit();
      }
    }
  }

  if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => {
    hideCanvasContextMenu();
    if (document.fullscreenElement) {
      document.body.classList.add('is-fullscreen');
    } else {
      document.body.classList.remove('is-fullscreen');
    }
    updateFullscreenUI();
    triggerCanvasFit();
  });

  const canvasContainerEl = document.querySelector('.canvas-container');
  if (canvasContainerEl && window.ResizeObserver) {
    let lastContainerW = canvasContainerEl.clientWidth;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const currentW = Math.round(entry.contentRect.width);
        if (Math.abs(currentW - lastContainerW) > 60) {
          lastContainerW = currentW;
          if (document.body.classList.contains('is-fullscreen') && canvas) {
            canvas.fitToScreen();
          }
        }
      }
    });
    resizeObserver.observe(canvasContainerEl);
  }

  // =========================================================================
  // Canvas Pop-up Properties Context Menu Controller
  // =========================================================================
  function canShowCanvasContextMenu() {
    const isFs = !!(document.fullscreenElement || document.body.classList.contains('is-fullscreen') || document.body.classList.contains('fullscreen'));
    const isSim = canvas && canvas.isSimulating;
    const isRev = document.body.classList.contains('review-mode-active') || (canvas && canvas.isReviewMode);
    return !isFs && !isSim && !isRev;
  }

  function hideCanvasContextMenu() {
    if (!canvasContextMenu) return;
    canvasContextMenu.classList.remove('is-visible');
    canvasContextMenu.setAttribute('aria-hidden', 'true');
    canvasContextMenu.innerHTML = '';
  }

  function showCanvasContextMenu(type, data, clientX, clientY, worldPos) {
    if (!canShowCanvasContextMenu()) {
      hideCanvasContextMenu();
      return;
    }

    if (!canvasContextMenu) return;
    canvasContextMenu.innerHTML = '';

    const escapeHtml = (str) => {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    if (type === 'ELEMENT') {
      const elem = data;
      const compDef = (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[elem.svgData]) ? COMPONENTS_DATA[elem.svgData] : {};
      const isTextComp = (elem.svgData === 'text');
      const isLocked = Boolean(elem.locked);
      const isTimerCoil = ['coilDelayOn', 'coilDelayOff', 'coilDelayOnOff', 'coilFlasher'].includes(elem.svgData);

      // Header
      const header = document.createElement('div');
      header.className = 'ctx-header';
      header.innerHTML = `
        <div class="ctx-title-group">
          <span class="ctx-icon">${isTextComp ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>'}</span>
          <span class="ctx-title" title="${escapeHtml(compDef.name || elem.svgData)}">${escapeHtml(compDef.name || elem.svgData)}</span>
        </div>
        <span class="ctx-badge" id="ctxHeaderBadge">${escapeHtml(elem.tag || (isTextComp ? 'Teks' : '-'))}</span>
      `;
      canvasContextMenu.appendChild(header);

      // Inline Properties Form
      const formGroup = document.createElement('div');
      formGroup.className = 'ctx-form-group';

      if (!isTextComp) {
        const fieldTag = document.createElement('div');
        fieldTag.className = 'ctx-field';
        fieldTag.innerHTML = `
          <label for="ctxInputTag">Tag / ID</label>
          <input type="text" id="ctxInputTag" class="ctx-input" value="${escapeHtml(elem.tag || '')}" placeholder="e.g. -KM1, -S1" autocomplete="off" />
        `;
        formGroup.appendChild(fieldTag);
      }

      const fieldComment = document.createElement('div');
      fieldComment.className = 'ctx-field';
      fieldComment.innerHTML = `
        <label for="ctxInputComment">${isTextComp ? 'Isi Teks' : 'Komentar'}</label>
        <input type="text" id="ctxInputComment" class="ctx-input" value="${escapeHtml(elem.comment || '')}" placeholder="${isTextComp ? 'Tulis teks...' : 'e.g. Pompa Utama'}" autocomplete="off" />
      `;
      formGroup.appendChild(fieldComment);

      if (isTextComp) {
        const fieldColors = document.createElement('div');
        fieldColors.className = 'ctx-field';
        fieldColors.innerHTML = `
          <label>Warna Teks</label>
          <div style="display: flex; gap: 7px; margin-top: 5px;">
            ${Object.keys(window.TEXT_COLORS || {}).map(cKey => {
              const c = window.TEXT_COLORS[cKey];
              const curHex = elem.textColor || '#93c5fd';
              const isActive = (curHex.toLowerCase() === c.hex.toLowerCase() || curHex.toLowerCase() === c.id);
              return `<button type="button" class="ctx-text-color-btn" data-color="${c.hex}" title="${c.name}" style="background: ${c.hex}; border: 2px solid ${isActive ? '#38bdf8' : c.border}; width: 22px; height: 22px; border-radius: 50%; cursor: pointer; outline: none; transform: ${isActive ? 'scale(1.15)' : 'scale(1)'};"></button>`;
            }).join('')}
          </div>
        `;
        fieldColors.querySelectorAll('.ctx-text-color-btn').forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const color = btn.getAttribute('data-color');
            if (canvas.pushHistoryState) canvas.pushHistoryState();
            elem.textColor = color;
            canvas.render();
            updateInspector(elem);
            hideCanvasContextMenu();
            showToast('Warna teks CAD diperbarui', true);
          };
        });
        formGroup.appendChild(fieldColors);
      }

      if (isTimerCoil) {
        let timerLabel = 'Timer (s)';
        if (elem.svgData === 'coilFlasher') timerLabel = 'Flash (s)';
        else if (elem.svgData === 'coilDelayOff') timerLabel = 'Off-Delay';
        else if (elem.svgData === 'coilDelayOn') timerLabel = 'Preset (s)';

        const fieldTimer = document.createElement('div');
        fieldTimer.className = 'ctx-field';
        fieldTimer.innerHTML = `
          <label for="ctxInputTimer">${timerLabel}</label>
          <input type="number" id="ctxInputTimer" class="ctx-input" step="0.1" min="0.1" value="${elem.valueTimeOn !== undefined ? elem.valueTimeOn : 2.0}" autocomplete="off" />
        `;
        formGroup.appendChild(fieldTimer);
      }

      canvasContextMenu.appendChild(formGroup);

      // Divider
      const div1 = document.createElement('div');
      div1.className = 'ctx-divider';
      canvasContextMenu.appendChild(div1);

      // Actions: Lock Toggle (Ctrl+L)
      const btnLock = document.createElement('button');
      btnLock.type = 'button';
      btnLock.className = 'ctx-item';
      btnLock.innerHTML = `
        <span class="ctx-item-label">${isLocked ? 'Buka Kunci Posisi' : 'Kunci Posisi'}</span>
        <span class="ctx-kbd">Ctrl+L</span>
      `;
      btnLock.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        const res = canvas.toggleLockSelected();
        if (res && res.count > 0) {
          showToast(res.locked ? `Posisi komponen berhasil dikunci (terkunci di Android).` : `Posisi komponen berhasil dibuka.`, true);
        }
      };
      canvasContextMenu.appendChild(btnLock);

      // Rotate
      const btnRotateItem = document.createElement('button');
      btnRotateItem.type = 'button';
      btnRotateItem.className = 'ctx-item';
      btnRotateItem.disabled = isLocked;
      btnRotateItem.innerHTML = `
        <span class="ctx-item-label">Putar 90°</span>
        <span class="ctx-kbd">R</span>
      `;
      btnRotateItem.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        if (isLocked) {
          showToast('Komponen terkunci, tidak dapat diputar. Buka kunci dengan Ctrl+L.', false);
          return;
        }
        canvas.rotateSelected();
      };
      canvasContextMenu.appendChild(btnRotateItem);

      // Copy
      const btnCopyItem = document.createElement('button');
      btnCopyItem.type = 'button';
      btnCopyItem.className = 'ctx-item';
      btnCopyItem.innerHTML = `
        <span class="ctx-item-label">Salin</span>
        <span class="ctx-kbd">Ctrl+C</span>
      `;
      btnCopyItem.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        const res = canvas.copySelection();
        if (res.count > 0) showToast(`Komponen disalin ke clipboard.`, true);
      };
      canvasContextMenu.appendChild(btnCopyItem);

      // Duplicate
      const btnDupItem = document.createElement('button');
      btnDupItem.type = 'button';
      btnDupItem.className = 'ctx-item';
      btnDupItem.innerHTML = `
        <span class="ctx-item-label">Duplikat</span>
        <span class="ctx-kbd">Ctrl+D</span>
      `;
      btnDupItem.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        const res = canvas.duplicateSelection(30);
        if (res.count > 0) showToast(`Berhasil menduplikat komponen.`, true);
      };
      canvasContextMenu.appendChild(btnDupItem);

      // Open Full Inspector
      const btnOpenInsp = document.createElement('button');
      btnOpenInsp.type = 'button';
      btnOpenInsp.className = 'ctx-item';
      btnOpenInsp.innerHTML = `
        <span class="ctx-item-label">Buka Panel Properti Penuh</span>
        <span class="ctx-kbd">Inspector</span>
      `;
      btnOpenInsp.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        if (inspectorEl && inspectorEl.classList.contains('is-collapsed')) {
          updateInspectorVisibilityUI(false);
        }
        updateInspector(elem);
      };
      canvasContextMenu.appendChild(btnOpenInsp);

      // Divider
      const div2 = document.createElement('div');
      div2.className = 'ctx-divider';
      canvasContextMenu.appendChild(div2);

      // Delete
      const btnDeleteItem = document.createElement('button');
      btnDeleteItem.type = 'button';
      btnDeleteItem.className = 'ctx-item is-danger';
      btnDeleteItem.disabled = isLocked;
      btnDeleteItem.innerHTML = `
        <span class="ctx-item-label">Hapus Komponen</span>
        <span class="ctx-kbd">Del</span>
      `;
      btnDeleteItem.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        if (isLocked) {
          showToast('Komponen terkunci, tidak dapat dihapus. Buka kunci dengan Ctrl+L.', false);
          return;
        }
        canvas.deleteSelected();
      };
      canvasContextMenu.appendChild(btnDeleteItem);

      // Form input event listeners with keyboard isolation
      const tagIn = canvasContextMenu.querySelector('#ctxInputTag');
      if (tagIn) {
        tagIn.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter' || e.key === 'Escape') hideCanvasContextMenu();
        });
        tagIn.addEventListener('input', (e) => {
          e.stopPropagation();
          const v = e.target.value.trim().toUpperCase();
          elem.tag = v;
          const badge = canvasContextMenu.querySelector('#ctxHeaderBadge');
          if (badge) badge.textContent = v || '-';
          canvas.render();
          updateInspector(elem);
        });
      }

      const commentIn = canvasContextMenu.querySelector('#ctxInputComment');
      if (commentIn) {
        commentIn.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter' || e.key === 'Escape') hideCanvasContextMenu();
        });
        commentIn.addEventListener('input', (e) => {
          e.stopPropagation();
          elem.comment = e.target.value;
          canvas.render();
          updateInspector(elem);
        });
      }

      const timerIn = canvasContextMenu.querySelector('#ctxInputTimer');
      if (timerIn) {
        timerIn.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter' || e.key === 'Escape') hideCanvasContextMenu();
        });
        timerIn.addEventListener('input', (e) => {
          e.stopPropagation();
          const val = parseFloat(e.target.value);
          if (!isNaN(val) && val >= 0.1) {
            elem.valueTimeOn = val;
            canvas.render();
            updateInspector(elem);
          }
        });
      }

    } else if (type === 'MULTI') {
      const elements = data || [];
      const count = elements.length;
      const allLocked = elements.length > 0 && elements.every(e => !!e.locked);
      const isGrouped = elements.length > 0 && elements.every(e => !!e.groupId && e.groupId === elements[0].groupId);

      // Header
      const header = document.createElement('div');
      header.className = 'ctx-header';
      header.innerHTML = `
        <div class="ctx-title-group">
          <span class="ctx-title">Multi-Seleksi</span>
        </div>
        <span class="ctx-badge">${count} Komponen</span>
      `;
      canvasContextMenu.appendChild(header);

      // Lock All (Ctrl+L)
      const btnMultiLock = document.createElement('button');
      btnMultiLock.type = 'button';
      btnMultiLock.className = 'ctx-item';
      btnMultiLock.innerHTML = `
        <span class="ctx-item-label">${allLocked ? 'Buka Kunci Posisi Semua' : 'Kunci Posisi Semua'}</span>
        <span class="ctx-kbd">Ctrl+L</span>
      `;
      btnMultiLock.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        const res = canvas.toggleLockSelected();
        if (res && res.count > 0) {
          showToast(res.locked ? `Posisi ${res.count} komponen berhasil dikunci (terkunci di Android).` : `Posisi ${res.count} komponen berhasil dibuka.`, true);
        }
      };
      canvasContextMenu.appendChild(btnMultiLock);

      // Rotate All
      const btnMultiRotate = document.createElement('button');
      btnMultiRotate.type = 'button';
      btnMultiRotate.className = 'ctx-item';
      btnMultiRotate.disabled = allLocked;
      btnMultiRotate.innerHTML = `
        <span class="ctx-item-label">Putar Semua</span>
        <span class="ctx-kbd">R</span>
      `;
      btnMultiRotate.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        canvas.rotateSelected();
      };
      canvasContextMenu.appendChild(btnMultiRotate);

      // Group / Ungroup
      const btnMultiGroup = document.createElement('button');
      btnMultiGroup.type = 'button';
      btnMultiGroup.className = 'ctx-item';
      btnMultiGroup.innerHTML = `
        <span class="ctx-item-label">${isGrouped ? 'Pisahkan Grup' : 'Gabungkan Grup'}</span>
        <span class="ctx-kbd">${isGrouped ? 'Ctrl+Shift+G' : 'Ctrl+G'}</span>
      `;
      btnMultiGroup.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        if (isGrouped) {
          const res = canvas.ungroupSelection();
          if (res.success) showToast(`Berhasil memisahkan ${res.count} komponen dari grup.`, true);
        } else {
          const res = canvas.groupSelection();
          if (res.success) showToast(`Berhasil menggabungkan ${res.count} komponen menjadi satu grup.`, true);
        }
      };
      canvasContextMenu.appendChild(btnMultiGroup);

      // Divider
      const div1 = document.createElement('div');
      div1.className = 'ctx-divider';
      canvasContextMenu.appendChild(div1);

      // Copy All
      const btnMultiCopy = document.createElement('button');
      btnMultiCopy.type = 'button';
      btnMultiCopy.className = 'ctx-item';
      btnMultiCopy.innerHTML = `
        <span class="ctx-item-label">Salin Semua</span>
        <span class="ctx-kbd">Ctrl+C</span>
      `;
      btnMultiCopy.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        const res = canvas.copySelection();
        if (res.count > 0) showToast(`${res.count} komponen disalin ke clipboard.`, true);
      };
      canvasContextMenu.appendChild(btnMultiCopy);

      // Duplicate All
      const btnMultiDup = document.createElement('button');
      btnMultiDup.type = 'button';
      btnMultiDup.className = 'ctx-item';
      btnMultiDup.innerHTML = `
        <span class="ctx-item-label">Duplikat Semua</span>
        <span class="ctx-kbd">Ctrl+D</span>
      `;
      btnMultiDup.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        const res = canvas.duplicateSelection(30);
        if (res.count > 0) showToast(`Berhasil menduplikat ${res.count} komponen.`, true);
      };
      canvasContextMenu.appendChild(btnMultiDup);

      // Divider
      const div2 = document.createElement('div');
      div2.className = 'ctx-divider';
      canvasContextMenu.appendChild(div2);

      // Delete All
      const btnMultiDelete = document.createElement('button');
      btnMultiDelete.type = 'button';
      btnMultiDelete.className = 'ctx-item is-danger';
      btnMultiDelete.disabled = allLocked;
      btnMultiDelete.innerHTML = `
        <span class="ctx-item-label">Hapus Semua (${count})</span>
        <span class="ctx-kbd">Del</span>
      `;
      btnMultiDelete.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        canvas.deleteSelected();
      };
      canvasContextMenu.appendChild(btnMultiDelete);

    } else if (type === 'WIRE') {
      const wire = data;
      const el1 = canvas.circuit.data.find(d => d.id === wire.idElementNode1);
      const el2 = canvas.circuit.data.find(d => d.id === wire.idElementNode2);
      const name1 = el1 ? (el1.tag || el1.svgData) : 'Node1';
      const name2 = el2 ? (el2.tag || el2.svgData) : 'Node2';

      // Header
      const header = document.createElement('div');
      header.className = 'ctx-header';
      header.innerHTML = `
        <div class="ctx-title-group">
          <span class="ctx-title">Kawat Sambungan</span>
        </div>
        <span class="ctx-badge">Wire #${wire.id}</span>
      `;
      canvasContextMenu.appendChild(header);

      // Info
      const info = document.createElement('div');
      info.className = 'ctx-wire-info';
      info.innerHTML = `
        <span>${escapeHtml(name1)} (Pin ${wire.idNode1})</span>
        <span class="ctx-wire-arrow">→</span>
        <span>${escapeHtml(name2)} (Pin ${wire.idNode2})</span>
      `;
      canvasContextMenu.appendChild(info);

      // Form
      const formGroup = document.createElement('div');
      formGroup.className = 'ctx-form-group';
      const fieldOffset = document.createElement('div');
      fieldOffset.className = 'ctx-field';
      fieldOffset.innerHTML = `
        <label for="ctxInputWireCenter">Offset Jalur</label>
        <input type="number" id="ctxInputWireCenter" class="ctx-input" step="30" value="${wire.margins ? wire.margins.center : 0}" autocomplete="off" />
      `;
      formGroup.appendChild(fieldOffset);
      canvasContextMenu.appendChild(formGroup);

      // Divider
      const div1 = document.createElement('div');
      div1.className = 'ctx-divider';
      canvasContextMenu.appendChild(div1);

      // Delete Wire
      const btnDeleteWire = document.createElement('button');
      btnDeleteWire.type = 'button';
      btnDeleteWire.className = 'ctx-item is-danger';
      btnDeleteWire.innerHTML = `
        <span class="ctx-item-label">Hapus Kawat</span>
        <span class="ctx-kbd">Del</span>
      `;
      btnDeleteWire.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        canvas.deleteSelected();
      };
      canvasContextMenu.appendChild(btnDeleteWire);

      const wireCenterIn = canvasContextMenu.querySelector('#ctxInputWireCenter');
      if (wireCenterIn) {
        wireCenterIn.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter' || e.key === 'Escape') hideCanvasContextMenu();
        });
        wireCenterIn.addEventListener('input', (e) => {
          e.stopPropagation();
          if (!wire.margins) wire.margins = { start: 0, center: 0, end: 0 };
          wire.margins.center = parseFloat(e.target.value) || 0;
          canvas.render();
          updateInspector(wire);
        });
      }

    } else {
      // CANVAS Background
      const hasClip = canvas.clipboard && canvas.clipboard.elements && canvas.clipboard.elements.length > 0;
      const hasSelection = (canvas.selectedElementIds && canvas.selectedElementIds.size > 0) || canvas.selectedConnectorId !== null;

      // Header
      const header = document.createElement('div');
      header.className = 'ctx-header';
      header.innerHTML = `
        <div class="ctx-title-group">
          <span class="ctx-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg></span>
          <span class="ctx-title">Kanvas Mashimurelay</span>
        </div>
        <span class="ctx-badge">Zoom ${Math.round(canvas.zoom * 100)}%</span>
      `;
      canvasContextMenu.appendChild(header);

      // Paste
      const btnPaste = document.createElement('button');
      btnPaste.type = 'button';
      btnPaste.className = 'ctx-item';
      btnPaste.disabled = !hasClip;
      btnPaste.innerHTML = `
        <span class="ctx-item-label">Tempel di Sini (Paste)</span>
        <span class="ctx-kbd">Ctrl+V</span>
      `;
      btnPaste.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        const res = canvas.pasteClipboard(worldPos);
        if (res.count > 0) {
          showToast(`Berhasil menempelkan ${res.count} komponen di posisi kursor!`, true);
        } else {
          showToast('Clipboard kosong. Salin (Ctrl+C) komponen terlebih dahulu.', false);
        }
      };
      canvasContextMenu.appendChild(btnPaste);

      // Select All
      const btnSelectAll = document.createElement('button');
      btnSelectAll.type = 'button';
      btnSelectAll.className = 'ctx-item';
      btnSelectAll.innerHTML = `
        <span class="ctx-item-label">Pilih Semua</span>
        <span class="ctx-kbd">Ctrl+A</span>
      `;
      btnSelectAll.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        const res = canvas.selectAll();
        if (res.count > 0) {
          showToast(`Seluruh komponen terpilih (${res.count} komponen)`, true);
        }
      };
      canvasContextMenu.appendChild(btnSelectAll);

      // Clear Selection
      const btnClearSel = document.createElement('button');
      btnClearSel.type = 'button';
      btnClearSel.className = 'ctx-item';
      btnClearSel.disabled = !hasSelection;
      btnClearSel.innerHTML = `
        <span class="ctx-item-label">Bersihkan Seleksi</span>
        <span class="ctx-kbd">Esc</span>
      `;
      btnClearSel.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        canvas.selectedElementIds.clear();
        canvas.selectedConnectorId = null;
        canvas.render();
        updateInspector(null);
      };
      canvasContextMenu.appendChild(btnClearSel);

      // Divider
      const div1 = document.createElement('div');
      div1.className = 'ctx-divider';
      canvasContextMenu.appendChild(div1);

      // Fit View
      const btnFitView = document.createElement('button');
      btnFitView.type = 'button';
      btnFitView.className = 'ctx-item';
      btnFitView.innerHTML = `
        <span class="ctx-item-label">Sesuaikan Layar (Fit View)</span>
        <span class="ctx-kbd">Fit</span>
      `;
      btnFitView.onclick = (e) => {
        e.stopPropagation();
        hideCanvasContextMenu();
        canvas.fitToScreen();
      };
      canvasContextMenu.appendChild(btnFitView);
    }

    // Position and Viewport Clamping
    canvasContextMenu.classList.add('is-visible');
    canvasContextMenu.setAttribute('aria-hidden', 'false');

    const MARGIN = 10;
    const menuWidth = canvasContextMenu.offsetWidth || 270;
    const menuHeight = canvasContextMenu.offsetHeight || 280;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = clientX;
    let top = clientY;

    if (left + menuWidth + MARGIN > vw) {
      left = Math.max(MARGIN, vw - menuWidth - MARGIN);
    }
    if (top + menuHeight + MARGIN > vh) {
      top = Math.max(MARGIN, vh - menuHeight - MARGIN);
    }

    canvasContextMenu.style.left = `${left}px`;
    canvasContextMenu.style.top = `${top}px`;
  }

  // Dismiss context menu on click outside
  document.addEventListener('mousedown', (e) => {
    if (canvasContextMenu && canvasContextMenu.classList.contains('is-visible') && !canvasContextMenu.contains(e.target) && e.button !== 2) {
      hideCanvasContextMenu();
    }
  });

  window.addEventListener('resize', hideCanvasContextMenu);

  // Initialize Canvas
  canvas = new MashimurelayCanvas(svgEl, {
    onShowContextMenu: (type, data, clientX, clientY, worldPos) => {
      showCanvasContextMenu(type, data, clientX, clientY, worldPos);
    },
    onDismissContextMenu: () => {
      hideCanvasContextMenu();
    },
    onSelect: (item) => {
      updateInspector(item);
      updateFloatingPill(item);
    },
    onSwitchClicked: (elem) => {
      updateFloatingPill(elem);
      updateInspector(elem);
    },
    onButtonStateChange: (elemId, isPressed) => {
      updatePushButtonUI(elemId, isPressed);
    },
    onHistoryChange: (canUndo, canRedo) => {
      if (btnUndo) btnUndo.disabled = !canUndo;
      if (btnRedo) btnRedo.disabled = !canRedo;
    },
    onCircuitChanged: () => {
      hasUnsavedChanges = true;
      if (isAutoSaveEnabled) {
        if (autoSaveDebounceTimer) clearTimeout(autoSaveDebounceTimer);
        autoSaveDebounceTimer = setTimeout(() => {
          if (projectManager) {
            projectManager.autoSaveCurrent();
            hasUnsavedChanges = false;
          }
        }, 1200);
      }
    },
    onSelfWireAttempt: () => {
      showToast('Kabel tidak dapat dihubungkan ke komponen yang sama!', false);
    },
    onLockedMoveAttempt: () => {
      showToast('Posisi komponen dikunci. Tekan Ctrl+L untuk membuka kunci.', false);
    },
    onTeacherLockedMoveAttempt: () => {
      showToast('Posisi komponen dikunci oleh Guru untuk praktikum wiring!', false);
    },
    onAssignmentKitChanged: (kit) => {
      buildPalette(paletteSearch ? paletteSearch.value : '');
    },
    onSimulationRestrictedAction: (msg) => {
      showToast(`${msg}`, false);
    },
    onSimulationStateChange: (state) => {
      hideCanvasContextMenu();
      if (floatingPill) floatingPill.style.display = 'none';
      alertDismissedByUser = false;

      if (state === 'RUNNING') {
        statusBadge.className = 'status-badge status-running';
        statusBadge.textContent = 'RUNNING';
        btnRun.style.display = 'none';
        btnStop.style.display = 'inline-flex';
        if (btnRotate) {
          btnRotate.classList.add('btn-toolbar-disabled');
          btnRotate.style.opacity = '0.5';
          btnRotate.style.cursor = 'not-allowed';
        }
        if (btnDelete) {
          btnDelete.classList.add('btn-toolbar-disabled');
          btnDelete.style.opacity = '0.5';
          btnDelete.style.cursor = 'not-allowed';
        }
        if (sidebarEl) {
          sidebarEl.classList.remove('mobile-open');
          sidebarEl.classList.add('palette-simulation-locked');
        }
        if (inspectorEl) inspectorEl.classList.remove('mobile-open');
      } else {
        statusBadge.className = 'status-badge status-stopped';
        statusBadge.textContent = 'STOPPED';
        btnRun.style.display = 'inline-flex';
        btnStop.style.display = 'none';
        if (btnRotate) {
          btnRotate.classList.remove('btn-toolbar-disabled');
          btnRotate.style.opacity = '1';
          btnRotate.style.cursor = 'pointer';
        }
        if (btnDelete) {
          btnDelete.classList.remove('btn-toolbar-disabled');
          btnDelete.style.opacity = '1';
          btnDelete.style.cursor = 'pointer';
        }
        if (sidebarEl) {
          sidebarEl.classList.remove('palette-simulation-locked');
        }
        if (alertBanner) {
          alertBanner.style.display = 'none';
          alertBanner.classList.remove('pill-active');
          alertBanner.classList.remove('alert-fuse-blown');
        }
      }
      const curItem = canvas.circuit.data.find(d => d.id === canvas.selectedElementId) ||
                      canvas.circuit.data.find(d => d.id === canvas.selectedConnectorId);
      updateInspector(curItem);
    },
    onShortCircuit: (isShort, shortInfo) => {
      if (!canvas) return;
      const syncAlertUI = () => {
        if (!canvas.isSimulating) {
          alertDismissedByUser = false;
          if (alertBanner) {
            alertBanner.style.display = 'none';
            alertBanner.classList.remove('pill-active', 'alert-fuse-blown');
          }
          if (statusBadge) {
            statusBadge.className = 'status-badge status-stopped';
            statusBadge.textContent = 'STOPPED';
          }
          return;
        }
        const sim = canvas.simResult || {};
        const isShortNow = !!sim.shortCircuit;
        const isDcNow = !!sim.isDcOverheat;
        const isEarthNow = !!sim.isEarthLeakage;
        const trippedEarth = sim.trippedEarthLeakageTags || [];
        const trippedShort = sim.trippedBreakerTags || [];
        const isFuseNow = !!sim.isFuseBlown;

        const alertTextEl = alertBanner ? alertBanner.querySelector('.alert-text') : null;
        const showAlert = (badgeClass, badgeText, htmlMsg, isAmber) => {
          if (statusBadge) {
            statusBadge.className = `status-badge ${badgeClass}`;
            statusBadge.textContent = badgeText;
          }
          if (alertBanner) {
            alertBanner.classList.toggle('alert-fuse-blown', !!isAmber);
            if (!alertDismissedByUser) {
              if (alertTextEl) alertTextEl.innerHTML = htmlMsg;
              alertBanner.style.display = 'inline-flex';
              alertBanner.classList.toggle('pill-active', !!(floatingPill && floatingPill.style.display !== 'none'));
            }
          }
        };

        if (isShortNow && isDcNow) {
          showAlert('status-short-circuit', 'DC OVERHEAT!', '<strong>DC OVERHEAT!</strong> Kutub (+) dan (-) terhubung tanpa beban', false);
        } else if (isShortNow) {
          showAlert('status-short-circuit', 'SHORT CIRCUIT!', '<strong>SHORT CIRCUIT!</strong> Periksa sambungan fasa / netral pada jalur oranye', false);
        } else if (isEarthNow) {
          showAlert('status-short-circuit', 'ARUS BOCOR!', '<strong>ARUS BOCOR TANAH!</strong> Fasa terhubung ke PE/GND — periksa isolasi', false);
        } else if (trippedEarth.length > 0) {
          const tags = trippedEarth.join(', ');
          showAlert('status-fuse-blown', 'ELCB/RCCB TRIP!', `<strong>ELCB/RCCB TRIP (${tags})!</strong> Arus bocor ke tanah terdeteksi`, true);
        } else if (trippedShort.length > 0) {
          const tags = trippedShort.join(', ');
          showAlert('status-fuse-blown', 'BREAKER TRIP!', `<strong>BREAKER TRIP (${tags})!</strong> Hubung singkat terdeteksi — periksa rangkaian`, true);
        } else if (isFuseNow) {
          showAlert('status-fuse-blown', 'FUSE BLOWN!', '<strong>FUSE TERPUTUS!</strong> Matikan simulasi & perbaiki di properti', true);
        } else {
          alertDismissedByUser = false;
          if (alertBanner) {
            alertBanner.style.display = 'none';
            alertBanner.classList.remove('pill-active', 'alert-fuse-blown');
          }
          if (statusBadge) {
            statusBadge.className = 'status-badge status-running';
            statusBadge.textContent = 'RUNNING';
          }
        }
      };
      canvas._syncAlertUI = syncAlertUI;
      syncAlertUI();
    },
    onFuseBlown: (isBlown, newlyBlownFuses) => {
      if (canvas && typeof canvas._syncAlertUI === 'function') {
        canvas._syncAlertUI();
      }
      // Automatically refresh Properties Panel and Floating Pill to OFF if selected element is a blown fuse
      if (newlyBlownFuses && newlyBlownFuses.length > 0) {
        if (canvas.selectedElementId && newlyBlownFuses.includes(canvas.selectedElementId)) {
          const selItem = canvas.circuit.data.find(el => el.id === canvas.selectedElementId);
          if (selItem) {
            updateFloatingPill(selItem);
            updateInspector(selItem);
          }
        }
      }
    },
    onBreakerTripped: (trippedBreakerTags, trippedEarthLeakageTags, newlyTrippedBreakers) => {
      if (newlyTrippedBreakers && newlyTrippedBreakers.length > 0) {
        alertDismissedByUser = false;
        const trippedIds = newlyTrippedBreakers.map(t => t.id);
        if (canvas && canvas.selectedElementId && trippedIds.includes(canvas.selectedElementId)) {
          const selItem = canvas.circuit.data.find(el => el.id === canvas.selectedElementId);
          if (selItem) {
            updateFloatingPill(selItem);
            updateInspector(selItem);
          }
        }
      }
      if (canvas && typeof canvas._syncAlertUI === 'function') {
        canvas._syncAlertUI();
      }
    }
  });

  window.canvas = canvas;

  if (settingGlowCheckbox) {
    canvas.enableWireGlow = settingGlowCheckbox.checked;
  }

  // Mobile Orientation Switcher (Portrait <-> Landscape)
  const btnMobileOrientation = document.getElementById('btnMobileOrientation');
  if (btnMobileOrientation) {
    const updateOrientationBtnText = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      btnMobileOrientation.innerHTML = isLandscape ?
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg><span class="btn-text-label">Portrait</span>' :
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg><span class="btn-text-label">Landscape</span>';
      btnMobileOrientation.title = isLandscape ? 'Kembali ke Tampilan Vertikal (Portrait)' : 'Ubah ke Tampilan Horizontal (Landscape)';
    };

    btnMobileOrientation.addEventListener('click', async () => {
      const isCurrentlyLandscape = window.innerWidth > window.innerHeight;
      const target = isCurrentlyLandscape ? 'portrait' : 'landscape';

      let success = false;
      try {
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          if (!document.fullscreenElement && target === 'landscape') {
            if (document.documentElement.requestFullscreen) {
              await document.documentElement.requestFullscreen().catch(() => {});
            }
          }
          await screen.orientation.lock(target === 'landscape' ? 'landscape' : 'portrait');
          success = true;
        } else if (screen.lockOrientation) {
          screen.lockOrientation(target);
          success = true;
        }
      } catch (err) {
        console.warn('Orientation lock notice:', err);
      }

      if (!success) {
        if (target === 'landscape' && !document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen().catch(() => {});
        } else if (target === 'portrait' && document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
        showToast(target === 'landscape' ? 'Putar HP Anda ke posisi horizontal (Landscape)' : 'Putar HP Anda ke posisi vertikal (Portrait)', false);
      } else {
        showToast(target === 'landscape' ? 'Mode Landscape aktif' : 'Mode Portrait aktif');
      }

      setTimeout(() => {
        updateOrientationBtnText();
        if (canvas) canvas.fitToScreen();
      }, 350);
    });

    window.addEventListener('resize', updateOrientationBtnText);
    if (screen.orientation) {
      screen.orientation.addEventListener('change', () => {
        updateOrientationBtnText();
        setTimeout(() => {
          if (canvas) canvas.fitToScreen();
        }, 300);
      });
    }
    updateOrientationBtnText();
  }

  if (pillBtnRotate) {
    pillBtnRotate.addEventListener('click', () => {
      canvas.rotateSelected();
    });
  }

  if (pillBtnDelete) {
    pillBtnDelete.addEventListener('click', () => {
      canvas.deleteSelected();
      if (floatingPill) floatingPill.style.display = 'none';
    });
  }

  if (pillBtnTag) {
    pillBtnTag.addEventListener('click', () => {
      if (canvas.selectedElementId === null) return;
      const el = canvas.circuit.data.find(d => d.id === canvas.selectedElementId);
      if (!el) return;
      const newTag = prompt('Masukkan Label / Tag untuk komponen ini:', el.tag || '');
      if (newTag !== null) {
        el.tag = newTag.trim();
        canvas.render();
        updateInspector(el);
        updateFloatingPill(el);
      }
    });
  }

  // Populate Palette
  function buildPalette(filterQuery = '') {
    paletteContainer.innerHTML = '';
    const query = filterQuery.toLowerCase().trim();

    // Teacher Assignment Kit Filtering
    const activeKit = (canvas && canvas.circuit && canvas.circuit.assignmentKit && canvas.circuit.assignmentKit.enabled)
      ? canvas.circuit.assignmentKit
      : null;
    const allowedSet = (activeKit && Array.isArray(activeKit.allowedComponents))
      ? new Set(activeKit.allowedComponents)
      : null;

    if (paletteKitBanner && paletteKitTitle) {
      if (activeKit) {
        paletteKitBanner.style.display = 'flex';
        paletteKitTitle.textContent = `${activeKit.name || 'Kit Praktikum Guru'} (${activeKit.allowedComponents.length} Komponen)`;
      } else {
        paletteKitBanner.style.display = 'none';
      }
    }

    const categoryTitles = {
      sources: 'Sources & Power',
      protections: 'Circuit Protections',
      switches: 'Switches & Buttons',
      contactors: 'Contactors',
      coils: 'Coils & Timers',
      auxiliaries: 'Auxiliary Contacts',
      motors: 'Motors',
      loads: 'Loads & Signalling',
      others: 'Wiring & Junctions'
    };

    let categories = (typeof COMPONENT_CATEGORIES !== 'undefined') ? COMPONENT_CATEGORIES : null;
    if (!categories && typeof COMPONENTS_DATA !== 'undefined') {
      categories = {};
      for (const [k, v] of Object.entries(COMPONENTS_DATA)) {
        const cat = v.category || (v.info && v.info.category) || 'others';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push({
          svg: k,
          name: v.name || k,
          category: cat,
          width: v.width || 120,
          height: v.height || 120
        });
      }
    }
    if (!categories) return;

    for (const [catKey, items] of Object.entries(categories)) {
      const filtered = items.filter(it => {
        if (allowedSet && !allowedSet.has(it.svg)) return false;
        return !query || it.name.toLowerCase().includes(query) || it.svg.toLowerCase().includes(query);
      });

      if (filtered.length === 0) continue;

      const groupEl = document.createElement('div');
      groupEl.className = 'category-group';

      const headerEl = document.createElement('div');
      headerEl.className = 'category-header';
      headerEl.innerHTML = `<span>${categoryTitles[catKey] || catKey}</span><span>${filtered.length}</span>`;

      const itemsEl = document.createElement('div');
      itemsEl.className = 'category-items';

      filtered.forEach(it => {
        const card = document.createElement('div');
        card.className = 'component-card';
        card.title = `${it.name} (Klik untuk tengah kanvas, atau Drag & Drop ke posisi mana saja)`;
        card.setAttribute('draggable', 'false');
        card.dataset.svg = it.svg;

        const compDef = (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[it.svg]) ? COMPONENTS_DATA[it.svg] : null;
        let iconHtml = '';
        if (compDef && compDef.graphics) {
          const vb = compDef.viewBox || `0 0 ${compDef.width || 120} ${compDef.height || 120}`;
          iconHtml = `<svg viewBox="${vb}" class="component-card-svg" aria-hidden="true">${compDef.graphics}</svg>`;
        } else {
          iconHtml = `<img src="assets/icons/${it.svg}.svg" alt="" loading="lazy" draggable="false" onerror="this.style.display='none'" />`;
        }

        card.innerHTML = `
          ${iconHtml}
          <span class="component-title">${it.name}</span>
        `;

        let isBeingDragged = false;

        // CAD Pointer Engine (Zero-OLE Dragging for 100% reliable desktop & web placement)
        card.addEventListener('pointerdown', (e) => {
          if (e.button !== 0 || canvas.isSimulating) return;
          const startX = e.clientX;
          const startY = e.clientY;
          let hasMovedEnough = false;
          let dragGhost = null;

          const onPointerMove = (moveEv) => {
            const dist = Math.hypot(moveEv.clientX - startX, moveEv.clientY - startY);
            if (!hasMovedEnough && dist > 5) {
              hasMovedEnough = true;
              isBeingDragged = true;
              activeDraggedComponentSvg = it.svg;
              document.body.classList.add('is-palette-dragging');
              card.classList.add('is-dragging');

              dragGhost = document.createElement('div');
              dragGhost.className = 'component-drag-ghost';
              dragGhost.innerHTML = iconHtml;
              document.body.appendChild(dragGhost);
            }

            if (hasMovedEnough && dragGhost) {
              dragGhost.style.left = moveEv.clientX + 'px';
              dragGhost.style.top = moveEv.clientY + 'px';

              const canvasCont = document.querySelector('.canvas-container');
              if (canvasCont) {
                const rect = canvasCont.getBoundingClientRect();
                const isOverCanvas = moveEv.clientX >= rect.left && moveEv.clientX <= rect.right && moveEv.clientY >= rect.top && moveEv.clientY <= rect.bottom;
                canvasCont.classList.toggle('canvas-drag-hover', isOverCanvas);
              }
            }
          };

          const onPointerUp = (upEv) => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);

            if (dragGhost && dragGhost.parentNode) {
              dragGhost.parentNode.removeChild(dragGhost);
            }
            document.body.classList.remove('is-palette-dragging');
            card.classList.remove('is-dragging');

            const canvasCont = document.querySelector('.canvas-container');
            if (canvasCont) {
              canvasCont.classList.remove('canvas-drag-hover');
            }

            if (hasMovedEnough) {
              const rect = canvasCont ? canvasCont.getBoundingClientRect() : null;
              if (rect && upEv.clientX >= rect.left && upEv.clientX <= rect.right && upEv.clientY >= rect.top && upEv.clientY <= rect.bottom) {
                const compDef = window.COMPONENTS_DATA ? window.COMPONENTS_DATA[it.svg] : null;
                const compWidth = (compDef && compDef.width) ? compDef.width : 60;
                const compHeight = (compDef && compDef.height) ? compDef.height : 60;
                const worldPos = canvas.screenToWorld(upEv.clientX, upEv.clientY);
                const targetX = worldPos.x - compWidth / 2;
                const targetY = worldPos.y - compHeight / 2;

                if (canvas.selectedElementIds) {
                  canvas.selectedElementIds.clear();
                }
                const newElem = canvas.addElement(it.svg, targetX, targetY);
                if (newElem) {
                  const compName = compDef && (compDef.name || (compDef.info && compDef.info.name)) ? (compDef.name || compDef.info.name) : it.name;
                  showToast(`${compName} ditempatkan pada posisi kursor`);
                }
              }

              setTimeout(() => {
                isBeingDragged = false;
                activeDraggedComponentSvg = null;
              }, 150);
            }
          };

          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUp);
          window.addEventListener('pointercancel', onPointerUp);
        });

        card.addEventListener('click', () => {
          if (isBeingDragged) return;
          if (canvas.isSimulating) {
            showToast('Hentikan simulasi terlebih dahulu untuk menambahkan komponen.', false);
            return;
          }
          if (canvas.selectedElementIds) {
            canvas.selectedElementIds.clear();
          }
          canvas.addElement(it.svg);
          if (window.innerWidth <= 860 && sidebarEl) {
            sidebarEl.classList.remove('mobile-open');
          }
        });
        itemsEl.appendChild(card);
      });

      // Accordion toggle
      headerEl.addEventListener('click', () => {
        const isHidden = itemsEl.style.display === 'none';
        itemsEl.style.display = isHidden ? 'grid' : 'none';
      });

      groupEl.appendChild(headerEl);
      groupEl.appendChild(itemsEl);
      paletteContainer.appendChild(groupEl);
    }
  }

  buildPalette();

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      buildPalette(e.target.value);
    });
  }

  // Update Inspector
  function updateInspector(item) {
    resetPanelScroll(inspectorEl);
    if (!item) {
      inspectorContent.innerHTML = `<p style="color: var(--text-muted); font-size: 12px; text-align: center; margin-top: 20px;">Select a component or wire to inspect its properties.</p>`;
      return;
    }

    if (item.type === 'MultiSelection') {
      const elements = item.elements || [];
      const count = elements.length;
      const isGrouped = elements.length > 0 && elements.every(e => !!e.groupId && e.groupId === elements[0].groupId);
      const allLocked = elements.length > 0 && elements.every(e => !!e.locked);
      const allTeacherLocked = elements.length > 0 && elements.every(e => !!e.teacherLocked);
      const isSim = canvas && canvas.isSimulating;

      inspectorContent.innerHTML = `
        <div class="prop-group" style="text-align: center; padding: 12px 6px; background: rgba(59, 130, 246, 0.08); border-radius: 8px; border: 1px dashed rgba(59, 130, 246, 0.35); margin-bottom: 16px;">
          <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${count} Komponen Terpilih</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
            ${isGrouped ? 'Tergabung dalam satu grup' : 'Multi-Selection Aktif'}
          </div>
        </div>

        <div class="prop-group">
          <label class="prop-label">Aksi Massal (Batch Actions)</label>
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
            <button id="btnMultiCopy" class="btn btn-sm" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;" ${isSim ? 'disabled' : ''}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Salin Komponen (Ctrl+C)
            </button>
            <button id="btnMultiDuplicate" class="btn btn-sm" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;" ${isSim ? 'disabled' : ''}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> Duplikat Seleksi (Ctrl+D)
            </button>
            <button id="btnMultiRotate" class="btn btn-sm" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;" ${isSim ? 'disabled' : ''}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg> Putar Semua (R)
            </button>
            <button id="btnMultiLock" class="btn btn-sm" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; ${allLocked ? 'background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: var(--accent-success);' : ''}" ${isSim ? 'disabled' : ''}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> ${allLocked ? 'Buka Kunci Posisi Semua (Ctrl+L)' : 'Kunci Posisi Semua (Ctrl+L)'}
            </button>
            <button id="btnMultiGroup" class="btn btn-sm btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;" ${isSim ? 'disabled' : ''}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Gabungkan Grup (Ctrl+G)
            </button>
            ${isGrouped || elements.some(e => !!e.groupId) ? `
            <button id="btnMultiUngroup" class="btn btn-sm" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--accent-danger); border-color: rgba(239, 68, 68, 0.45);" ${isSim ? 'disabled' : ''}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg> Pisahkan Grup (Ctrl+Shift+G)
            </button>` : ''}
            <button id="btnMultiDelete" class="btn btn-sm btn-danger" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px;" ${isSim ? 'disabled' : ''}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Hapus Semua (Del)
            </button>
          </div>
        </div>

        <div class="prop-group" style="margin-top: 14px;">
          <label class="prop-label">Daftar Komponen (${count})</label>
          <div style="max-height: 140px; overflow-y: auto; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px; font-size: 11px;">
            ${elements.map(el => {
              const comp = COMPONENTS_DATA[el.svgData] || {};
              return `<div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid var(--border-color);">
                <span style="color: var(--accent-primary); font-weight: 600;">${el.tag || 'Tanpa Tag'}</span>
                <span style="color: var(--text-muted);">${comp.name || el.svgData}</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      `;

      // Event listeners for multi-selection buttons
      const btnMultiCopy = document.getElementById('btnMultiCopy');
      if (btnMultiCopy) {
        btnMultiCopy.addEventListener('click', () => {
          const res = canvas.copySelection();
          if (res.count > 0) showToast(`${res.count} komponen disalin ke clipboard!`, true);
        });
      }
      const btnMultiDuplicate = document.getElementById('btnMultiDuplicate');
      if (btnMultiDuplicate) {
        btnMultiDuplicate.addEventListener('click', () => {
          const res = canvas.duplicateSelection(30);
          if (res.count > 0) showToast(`Berhasil menduplikat ${res.count} komponen!`, true);
        });
      }
      const btnMultiRotate = document.getElementById('btnMultiRotate');
      if (btnMultiRotate) {
        btnMultiRotate.addEventListener('click', () => {
          canvas.rotateSelected();
        });
      }
      const btnMultiLock = document.getElementById('btnMultiLock');
      if (btnMultiLock) {
        btnMultiLock.addEventListener('click', () => {
          const nextLock = !allLocked;
          const res = canvas.lockSelectedElements(nextLock);
          showToast(nextLock ? `Berhasil mengunci posisi ${res.count} komponen (terkunci di Android)!` : `Berhasil membuka kunci posisi ${res.count} komponen!`, true);
          const selEls = canvas.elements.filter(d => canvas.selectedElementIds.has(d.id));
          updateInspector({ type: 'MultiSelection', elements: selEls });
        });
      }
      const btnMultiGroup = document.getElementById('btnMultiGroup');
      if (btnMultiGroup) {
        btnMultiGroup.addEventListener('click', () => {
          const res = canvas.groupSelection();
          if (res.success) {
            showToast(`Berhasil menggabungkan ${res.count} komponen menjadi satu grup!`, true);
            const selEls = canvas.elements.filter(d => canvas.selectedElementIds.has(d.id));
            updateInspector({ type: 'MultiSelection', elements: selEls });
          } else {
            showToast('Pilih minimal 2 komponen untuk digabungkan.', false);
          }
        });
      }
      const btnMultiUngroup = document.getElementById('btnMultiUngroup');
      if (btnMultiUngroup) {
        btnMultiUngroup.addEventListener('click', () => {
          const res = canvas.ungroupSelection();
          if (res.success) {
            showToast(`Berhasil memisahkan ${res.count} komponen dari grup.`, true);
            const selEls = canvas.elements.filter(d => canvas.selectedElementIds.has(d.id));
            updateInspector({ type: 'MultiSelection', elements: selEls });
          }
        });
      }
      const btnMultiDelete = document.getElementById('btnMultiDelete');
      if (btnMultiDelete) {
        btnMultiDelete.addEventListener('click', () => {
          canvas.deleteSelected();
        });
      }
      return;
    }

    if (item.type === 'ElectricalElement') {
      const compDef = COMPONENTS_DATA[item.svgData] || {};
      const isTimerCoil = ['coilDelayOn', 'coilDelayOff', 'coilDelayOnOff', 'coilFlasher'].includes(item.svgData) ||
        (!!compDef.timerType && compDef.timerType !== 'flashLight' && compDef.timerType !== 'phase' && item.svgData !== 'lampBlink');
      const isTextComp = (item.svgData === 'text');

      const stored = (canvas.engine && canvas.engine.manualStates) ? canvas.engine.manualStates.get(item.id) : undefined;
      const curPos3p0 = (stored !== undefined) ? stored : 1;
      const curPos3p = (stored !== undefined) ? stored : 0;
      const curStateChangeover = !!stored;

      let timerLabel = 'Timer Preset (Detik)';
      if (item.svgData === 'coilFlasher') timerLabel = 'Interval Kedip / Flash (Detik)';
      else if (item.svgData === 'coilDelayOff') timerLabel = 'Off-Delay (Detik)';
      else if (item.svgData === 'coilDelayOn') timerLabel = 'On-Delay Preset (Detik)';

      const isSim = canvas && canvas.isSimulating;

      inspectorContent.innerHTML = `
        ${isSim ? `<div class="prop-sim-lock-banner" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; padding: 7px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Simulasi Berjalan (Mode Baca Saja)</div>` : ''}
        <div class="prop-group">
          <label class="prop-label">Component</label>
          <div style="font-weight: 700; font-size: 13px; color: var(--accent-primary);">${compDef.name || item.svgData}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${item.svgData}.svg</div>
        </div>
        ${!isTextComp ? `
        <div class="prop-group">
          <label class="prop-label">Tag (Identifier)</label>
          <input type="text" id="propTag" class="prop-input" value="${item.tag || ''}" placeholder="e.g. -KM1, -S1" ${isSim ? 'readonly data-sim-locked="true" style="opacity: 0.6; cursor: not-allowed;"' : ''} />
        </div>` : ''}
        <div class="prop-group">
          <label class="prop-label">${isTextComp ? 'Isi Teks (Text Content)' : 'Comment'}</label>
          <input type="text" id="propComment" class="prop-input" value="${item.comment || ''}" placeholder="${isTextComp ? 'Tulis teks di sini...' : 'e.g. Main Contactor'}" ${isSim ? 'readonly data-sim-locked="true" style="opacity: 0.6; cursor: not-allowed;"' : ''} />
        </div>
        ${isTextComp ? `
        <div class="prop-group">
          <label class="prop-label">Ukuran Huruf / Font Size</label>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" id="propFontSizeRange" min="12" max="120" step="2" value="${item.fontSize || item.indexFontSize || 24}" ${isSim ? 'data-sim-locked="true" style="flex: 1; opacity: 0.6; cursor: not-allowed;"' : 'style="flex: 1;"'} />
            <input type="number" id="propFontSizeNum" min="10" max="144" value="${item.fontSize || item.indexFontSize || 24}" class="prop-input" ${isSim ? 'readonly data-sim-locked="true" style="width: 65px; margin: 0; text-align: center; opacity: 0.6; cursor: not-allowed;"' : 'style="width: 65px; margin: 0; text-align: center;"'} />
            <span style="font-size: 11px; color: var(--text-muted);">px</span>
          </div>
          <div style="display: flex; gap: 4px; margin-top: 6px;">
            <button class="btn btn-sm btn-size-preset" data-size="16" ${isSim ? 'data-sim-locked="true" style="flex: 1; padding: 4px 2px; opacity: 0.6; cursor: not-allowed;"' : 'style="flex: 1; padding: 4px 2px;"'}>16px</button>
            <button class="btn btn-sm btn-size-preset" data-size="24" ${isSim ? 'data-sim-locked="true" style="flex: 1; padding: 4px 2px; opacity: 0.6; cursor: not-allowed;"' : 'style="flex: 1; padding: 4px 2px;"'}>24px</button>
            <button class="btn btn-sm btn-size-preset" data-size="40" ${isSim ? 'data-sim-locked="true" style="flex: 1; padding: 4px 2px; opacity: 0.6; cursor: not-allowed;"' : 'style="flex: 1; padding: 4px 2px;"'}>40px</button>
            <button class="btn btn-sm btn-size-preset" data-size="70" ${isSim ? 'data-sim-locked="true" style="flex: 1; padding: 4px 2px; opacity: 0.6; cursor: not-allowed;"' : 'style="flex: 1; padding: 4px 2px;"'}>Judul (70)</button>
          </div>
        </div>
        <div class="prop-group">
          <label class="prop-label">Warna Teks CAD</label>
          <div class="text-color-palette" style="display: flex; gap: 8px; margin-top: 8px; align-items: center; ${isSim ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
            ${Object.keys(window.TEXT_COLORS || {}).map(cKey => {
              const c = window.TEXT_COLORS[cKey];
              const curHex = item.textColor || '#93c5fd';
              const isActive = (curHex.toLowerCase() === c.hex.toLowerCase() || curHex.toLowerCase() === c.id);
              return `<button type="button" class="text-color-btn ${isActive ? 'active' : ''}" data-color="${c.hex}" title="${c.name}" style="background: ${c.hex}; border: 2.5px solid ${isActive ? '#38bdf8' : c.border}; width: 28px; height: 28px; border-radius: 50%; cursor: ${isSim ? 'not-allowed' : 'pointer'}; transition: all 0.15s ease; outline: none; transform: ${isActive ? 'scale(1.15)' : 'scale(1)'};" ${isSim ? 'data-sim-locked="true"' : ''}></button>`;
            }).join('')}
          </div>
        </div>` : ''}
        ${isTimerCoil ? `
        <div class="prop-group">
          <label class="prop-label">${timerLabel}</label>
          <input type="number" step="0.1" min="0.1" id="propTime" class="prop-input" value="${item.valueTimeOn !== undefined ? item.valueTimeOn : 2.0}" ${isSim ? 'readonly data-sim-locked="true" style="opacity: 0.6; cursor: not-allowed;"' : ''} />
        </div>
        ${(item.svgData === 'coilDelayOnOff') ? `
        <div class="prop-group">
          <label class="prop-label">Off-Delay Preset (Detik)</label>
          <input type="number" step="0.1" min="0.1" id="propTimeOff" class="prop-input" value="${item.valueTimeOff !== undefined ? item.valueTimeOff : 0.0}" ${isSim ? 'readonly data-sim-locked="true" style="opacity: 0.6; cursor: not-allowed;"' : ''} />
        </div>` : ''}` : ''}
        ${item.svgData === 'switch3p0' ? `
        <div class="prop-group">
          <label class="prop-label">Posisi Saklar (I - 0 - II)</label>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button class="btn btn-sm btn-pos ${curPos3p0 === 0 ? 'btn-primary' : ''}" data-pos="0" style="flex: 1; padding: 6px 2px;">Pos I (Kiri)</button>
            <button class="btn btn-sm btn-pos ${curPos3p0 === 1 ? 'btn-primary' : ''}" data-pos="1" style="flex: 1; padding: 6px 2px;">Pos 0 (OFF)</button>
            <button class="btn btn-sm btn-pos ${curPos3p0 === 2 ? 'btn-primary' : ''}" data-pos="2" style="flex: 1; padding: 6px 2px;">Pos II (Kanan)</button>
          </div>
        </div>` : ''}
        ${item.svgData === 'switch3p' ? `
        <div class="prop-group">
          <label class="prop-label">Posisi Saklar (I - II - III)</label>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button class="btn btn-sm btn-pos ${curPos3p === 0 ? 'btn-primary' : ''}" data-pos="0" style="flex: 1; padding: 6px 2px;">Posisi I</button>
            <button class="btn btn-sm btn-pos ${curPos3p === 1 ? 'btn-primary' : ''}" data-pos="1" style="flex: 1; padding: 6px 2px;">Posisi II</button>
            <button class="btn btn-sm btn-pos ${curPos3p === 2 ? 'btn-primary' : ''}" data-pos="2" style="flex: 1; padding: 6px 2px;">Posisi III</button>
          </div>
        </div>` : ''}
        ${(!isPushButton(item.svgData) && isChangeoverSwitch(item.svgData)) ? `
        <div class="prop-group">
          <label class="prop-label">Posisi Saklar (Pos 1 - Pos 2)</label>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button class="btn btn-sm btn-pos ${!curStateChangeover ? 'btn-primary' : ''}" data-pos="0" data-val="false" style="flex: 1; padding: 6px 2px;">Pos 1</button>
            <button class="btn btn-sm btn-pos ${curStateChangeover ? 'btn-primary' : ''}" data-pos="1" data-val="true" style="flex: 1; padding: 6px 2px;">Pos 2</button>
          </div>
        </div>` : ''}
        ${isPlainFuse(item.svgData) ? `
        <div class="prop-group">
          <label class="prop-label">Kondisi Sekring (ON - OFF)</label>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button class="btn btn-sm btn-pos ${stored === false ? 'btn-primary' : ''}" data-pos="1" data-val="false" style="flex: 1; padding: 6px 2px;">OFF</button>
            <button class="btn btn-sm btn-pos ${stored !== false ? 'btn-primary' : ''}" data-pos="0" data-val="true" style="flex: 1; padding: 6px 2px;">ON</button>
          </div>
          ${(canvas.engine && canvas.engine.fuseBlownElements && canvas.engine.fuseBlownElements.has(item.id)) ? `
            <div style="font-size: 11px; color: #ef4444; font-weight: 600; margin-top: 6px; display: flex; align-items: center; gap: 4px;">
              <span>Sekring putus (melebur akibat hubung singkat / DC Overheat). Klik ON untuk mengganti sekring baru.</span>
            </div>
          ` : ''}
        </div>` : ''}
        ${isOverloadRelay(item.svgData) ? `
        <div class="prop-group">
          <label class="prop-label">Kondisi Overload (NORMAL - TRIP)</label>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button class="btn btn-sm btn-pos ${(!stored && !(canvas.engine && canvas.engine.overloadTripped && canvas.engine.overloadTripped.get(item.id))) ? 'btn-primary' : ''}" data-pos="0" data-val="false" style="flex: 1; padding: 6px 2px;">NORMAL</button>
            <button class="btn btn-sm btn-pos ${(!!stored || !!(canvas.engine && canvas.engine.overloadTripped && canvas.engine.overloadTripped.get(item.id))) ? 'btn-primary' : ''}" data-pos="1" data-val="true" style="flex: 1; padding: 6px 2px;">TRIP</button>
          </div>
        </div>` : ''}
        ${(!isPushButton(item.svgData) && !isChangeoverSwitch(item.svgData) && item.svgData !== 'switch3p0' && item.svgData !== 'switch3p' && !isOverloadRelay(item.svgData) && !isPlainFuse(item.svgData) && (compDef && (compDef.category === 'switches' || compDef.category === 'protections'))) ? `
        <div class="prop-group">
          <label class="prop-label">Status Saklar (OFF - ON)</label>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button class="btn btn-sm btn-pos ${(!stored) ? 'btn-primary' : ''}" data-pos="0" data-val="false" style="flex: 1; padding: 6px 2px;">OFF</button>
            <button class="btn btn-sm btn-pos ${(!!stored) ? 'btn-primary' : ''}" data-pos="1" data-val="true" style="flex: 1; padding: 6px 2px;">ON</button>
          </div>
        </div>` : ''}
        ${isPushButton(item.svgData) ? `
        <div class="prop-group">
          <label class="prop-label">Status Push Button</label>
          <div style="margin-top: 6px;">
            <button type="button" id="btnInspPushButton" data-elem-id="${item.id}" class="btn btn-sm btn-momentary-push ${((canvas.activePressedButtonId === item.id) || (canvas.engine && !!canvas.engine.manualStates.get(item.id))) ? 'btn-push-on' : 'btn-push-off'}" style="width: 100%; padding: 8px 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; user-select: none;">
              <span class="push-status-dot ${((canvas.activePressedButtonId === item.id) || (canvas.engine && !!canvas.engine.manualStates.get(item.id))) ? 'dot-on' : 'dot-off'}"></span>
              <span class="push-status-text">${((canvas.activePressedButtonId === item.id) || (canvas.engine && !!canvas.engine.manualStates.get(item.id))) ? 'ON' : 'OFF'}</span>
            </button>
          </div>
          <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 4px;">
            Tekan & tahan tombol ini atau komponen di kanvas.
          </span>
        </div>` : ''}
        ${(item.svgData === 'lamp' || item.svgData === 'lampBlink') ? `
        <div class="prop-group">
          <label class="prop-label">Warna Lampu (${(window.LAMP_COLORS && window.LAMP_COLORS[item.lampColor || 'yellow']) ? window.LAMP_COLORS[item.lampColor || 'yellow'].name : 'Kuning'})</label>
          <div class="lamp-color-palette" style="display: flex; gap: 8px; margin-top: 8px; align-items: center; ${isSim ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
            ${['white', 'yellow', 'red', 'green', 'blue'].map(cKey => {
              const c = window.LAMP_COLORS[cKey];
              const isActive = (item.lampColor || 'yellow') === cKey;
              return `<button type="button" class="lamp-color-btn ${isActive ? 'active' : ''}" data-color="${cKey}" title="${c.name}" style="background: ${c.hex}; border: 2.5px solid ${isActive ? '#38bdf8' : c.border}; width: 28px; height: 28px; border-radius: 50%; cursor: ${isSim ? 'not-allowed' : 'pointer'}; transition: all 0.15s ease; outline: none; box-shadow: ${isActive ? '0 0 10px ' + c.glow : 'none'}; transform: ${isActive ? 'scale(1.15)' : 'scale(1)'};" ${isSim ? 'data-sim-locked="true"' : ''}></button>`;
            }).join('')}
          </div>
        </div>` : ''}
        <div class="prop-group">
          <label class="prop-label">Rotation</label>
          <div style="font-size: 13px; font-weight: 600;">${((typeof normalizeRotation === 'function' ? normalizeRotation(item.rotation) : (item.rotation || 0)) * 90)}°</div>
        </div>
        <div class="prop-group">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <label class="prop-label" style="margin-bottom: 2px;">Kunci Posisi (Lock)</label>
              <div style="font-size: 11px; color: ${item.locked ? '#10b981' : 'var(--text-muted)'}; font-weight: ${item.locked ? '600' : 'normal'};">
                ${item.locked ? 'Terkunci (Permanen di Android, Ctrl+L)' : 'Bebas Dipindah (Ctrl+L)'}
              </div>
            </div>
            <label class="switch-toggle switch-lock" style="position: relative; display: inline-block; width: 44px; height: 24px; cursor: pointer; flex-shrink: 0; margin: 0;">
              <input type="checkbox" id="propLockPos" ${item.locked ? 'checked' : ''} ${isSim ? 'disabled' : ''} style="opacity: 0; width: 0; height: 0;">
              <span class="switch-slider" style="border-radius: 24px; ${item.locked ? 'background-color: #10b981;' : ''}"></span>
            </label>
          </div>
        </div>
        <div class="prop-group">
          <label class="prop-label" style="display: flex; justify-content: space-between; align-items: center;">
            <span>Kode Terminal (Pin I/O)</span>
            <span style="font-size: 10px; color: var(--text-muted); font-weight: normal;">Kustomisasi IEC</span>
          </label>
          ${(compDef && compDef.nodes && compDef.nodes.length > 0) ? `
            <div class="terminal-tags-editor" style="display: flex; flex-direction: column; gap: 6px; margin-top: 6px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border: 1px solid var(--border-subtle, #2d3148);">
              ${compDef.nodes.map((n, i) => {
                const currentTag = (item.terminalTags && item.terminalTags[i] !== undefined && item.terminalTags[i] !== '') ? item.terminalTags[i] : (n.tag || '');
                const nodeTypeLabel = n.type ? n.type.toUpperCase() : 'PIN';
                return `
                  <div class="terminal-tag-row" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <span style="font-size: 11px; color: var(--text-secondary); font-family: monospace; min-width: 80px;">
                      Pin ${i} <span style="font-size: 9px; opacity: 0.7; padding: 1px 4px; background: rgba(255,255,255,0.06); border-radius: 3px;">${nodeTypeLabel}</span>
                    </span>
                    <input type="text" class="prop-input terminal-tag-input" data-node-idx="${i}" value="${currentTag}" maxlength="8" placeholder="${n.tag || '-'}" style="width: 72px; text-align: center; font-weight: 700; font-family: monospace; color: #38bdf8; padding: 3px 6px; border-radius: 4px;" ${isSim ? 'disabled' : ''}>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="font-size: 11px; font-family: monospace; color: var(--text-muted); padding: 4px 0;">Tidak ada terminal pin</div>
          `}
        </div>
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button id="btnInspRotate" class="btn" ${isSim || item.teacherLocked ? 'data-sim-locked="true" style="flex: 1; opacity: 0.5; cursor: not-allowed;"' : 'style="flex: 1;"'} ${item.teacherLocked ? 'title="Komponen dikunci oleh Guru"' : ''}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 4px;"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>Rotate</button>
          <button id="btnInspDelete" class="btn btn-danger" ${isSim || item.teacherLocked ? 'data-sim-locked="true" style="flex: 1; opacity: 0.5; cursor: not-allowed;"' : 'style="flex: 1;"'} ${item.teacherLocked ? 'title="Komponen dikunci oleh Guru"' : ''}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>Delete</button>
        </div>
      `;

      // Switch position buttons in Inspector
      inspectorContent.querySelectorAll('.btn-pos').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const pos = parseInt(ev.currentTarget.getAttribute('data-pos'));
          const valAttr = ev.currentTarget.getAttribute('data-val');
          if (item.svgData === 'switch3p0' || item.svgData === 'switch3p') {
            canvas.engine.setSwitchPosition(item.id, pos);
          } else {
            const boolVal = valAttr !== null ? (valAttr === 'true') : (pos === 1);
            canvas.engine.manualStates.set(item.id, boolVal);
            if (item.svgData && item.svgData.startsWith('emergency')) {
              canvas.engine.emergencyLatched.set(item.id, boolVal);
            }
            if (isOverloadRelay(item.svgData)) {
              canvas.engine.overloadTripped.set(item.id, boolVal);
            }
            if (isPlainFuse(item.svgData) && boolVal) {
              canvas.engine.fuseBlownElements.delete(item.id);
            }
          }

          if ('vibrate' in navigator) {
            navigator.vibrate(15);
          }

          if (canvas.isSimulating) {
            canvas.simResult = canvas.engine.step({ elements: canvas.elements, connectors: canvas.connectors }, 0);
            canvas.updateSimulationVisuals();
          } else {
            const group = canvas.elementsGroup.querySelector(`[data-id="${item.id}"]`);
            if (group) canvas.applyFrameToElementGroup(group, item.id, pos);
          }

          renderSwitchOptions(item);
          updateInspector(item);
        });
      });

      // Push button momentary handler in Inspector
      const inspPushBtn = inspectorContent.querySelector('#btnInspPushButton');
      if (inspPushBtn) {
        bindMomentaryEvents(inspPushBtn, item.id);
      }

      // Lamp color picker handler in Inspector
      inspectorContent.querySelectorAll('.lamp-color-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const color = ev.currentTarget.getAttribute('data-color');
          item.lampColor = color;
          if (canvas.pushHistoryState) canvas.pushHistoryState();

          const elemGroup = canvas.elementsGroup.querySelector(`[data-id="${item.id}"]`);
          if (elemGroup) {
            const frameIdx = (canvas.isSimulating && canvas.simResult) ? (canvas.simResult.elementFrames.get(item.id) || 0) : 0;
            canvas.applyFrameToElementGroup(elemGroup, item.id, frameIdx);
          }
          if (canvas.isSimulating) {
            canvas.updateSimulationVisuals();
          } else {
            canvas.render();
          }
          updateInspector(item);
          if (canvas.options && canvas.options.onCircuitChanged) {
            canvas.options.onCircuitChanged();
          }
        });
      });

      // Text color picker handler in Inspector
      inspectorContent.querySelectorAll('.text-color-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          const color = ev.currentTarget.getAttribute('data-color');
          if (canvas.pushHistoryState) canvas.pushHistoryState();
          item.textColor = color;
          canvas.render();
          updateInspector(item);
          if (canvas.options && canvas.options.onCircuitChanged) {
            canvas.options.onCircuitChanged();
          }
          showToast('Warna teks CAD diperbarui', true);
        });
      });

      // Terminal Tags (Pin I/O) Input Handlers
      inspectorContent.querySelectorAll('.terminal-tag-input').forEach(input => {
        input.addEventListener('change', () => {
          if (canvas.pushHistoryState) canvas.pushHistoryState();
        });
        input.addEventListener('input', (e) => {
          const idx = parseInt(e.target.getAttribute('data-node-idx'));
          const val = e.target.value.trim();
          if (!item.terminalTags || !Array.isArray(item.terminalTags)) {
            item.terminalTags = [];
          }
          if (compDef && compDef.nodes) {
            while (item.terminalTags.length < compDef.nodes.length) {
              const curIdx = item.terminalTags.length;
              item.terminalTags.push(compDef.nodes[curIdx].tag || '');
            }
          }
          item.terminalTags[idx] = val;
          canvas.render();
          if (canvas.options && canvas.options.onCircuitChanged) {
            canvas.options.onCircuitChanged();
          }
        });
      });

      const tagIn = document.getElementById('propTag');
      if (tagIn) {
        tagIn.addEventListener('input', (e) => {
          item.tag = e.target.value.trim() || null;
          canvas.render();
        });
      }

      const commentIn = document.getElementById('propComment');
      if (commentIn) {
        commentIn.addEventListener('input', (e) => {
          item.comment = e.target.value.trim() || null;
          canvas.render();
        });
      }

      const fontRange = document.getElementById('propFontSizeRange');
      const fontNum = document.getElementById('propFontSizeNum');
      if (fontRange && fontNum) {
        const setSize = (val) => {
          const num = Math.max(10, Math.min(200, parseInt(val) || 24));
          item.fontSize = num;
          item.indexFontSize = num;
          fontRange.value = num;
          fontNum.value = num;
          canvas.render();
        };
        fontRange.addEventListener('input', (e) => setSize(e.target.value));
        fontNum.addEventListener('input', (e) => setSize(e.target.value));
        inspectorContent.querySelectorAll('.btn-size-preset').forEach(btn => {
          btn.addEventListener('click', (ev) => {
            setSize(ev.currentTarget.getAttribute('data-size'));
          });
        });
      }

      const timeIn = document.getElementById('propTime');
      if (timeIn) {
        const updateTimeOn = (rawVal) => {
          const val = parseFloat(rawVal);
          if (!isNaN(val) && val > 0) {
            item.valueTimeOn = val;
            // Sync to all elements sharing the same tag (e.g. coil & auxiliary contacts)
            if (item.tag) {
              canvas.circuit.data.forEach(d => {
                if (d.type === 'ElectricalElement' && d.tag === item.tag) {
                  d.valueTimeOn = val;
                }
              });
            }
            if (canvas.isSimulating && canvas.engine && canvas.engine.timerStates) {
              const tState = canvas.engine.timerStates.get(item.id);
              if (tState) tState.presetMs = val * 1000;
            }
            // Update badge in element group if present
            const grp = canvas.elementsGroup.querySelector(`[data-id="${item.id}"]`);
            if (grp) {
              const badge = grp.querySelector('.element-timer-badge');
              if (badge) badge.textContent = `⏱ ${val.toFixed(1)}s`;
            }
            if (canvas.options && canvas.options.onCircuitChanged) {
              canvas.options.onCircuitChanged();
            }
          }
        };

        timeIn.addEventListener('input', (e) => {
          updateTimeOn(e.target.value);
        });

        timeIn.addEventListener('blur', (e) => {
          const val = parseFloat(e.target.value);
          if (isNaN(val) || val <= 0) {
            timeIn.value = item.valueTimeOn || 2.0;
          } else {
            item.valueTimeOn = val;
            if (canvas.render && !canvas.isSimulating) canvas.render();
          }
        });
      }

      const timeOffIn = document.getElementById('propTimeOff');
      if (timeOffIn) {
        timeOffIn.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val) && val >= 0) {
            item.valueTimeOff = val;
            if (item.tag) {
              canvas.circuit.data.forEach(d => {
                if (d.type === 'ElectricalElement' && d.tag === item.tag) {
                  d.valueTimeOff = val;
                }
              });
            }
            if (canvas.isSimulating && canvas.engine && canvas.engine.timerStates) {
              const tState = canvas.engine.timerStates.get(item.id);
              if (tState) tState.presetOffMs = val * 1000;
            }
            if (canvas.options && canvas.options.onCircuitChanged) {
              canvas.options.onCircuitChanged();
            }
          }
        });
      }

      const propLockPos = document.getElementById('propLockPos');
      if (propLockPos) {
        propLockPos.addEventListener('change', (e) => {
          if (canvas.isSimulating) return;
          const isLocked = e.target.checked;
          item.locked = isLocked;
          item.teacherLocked = isLocked;
          if (canvas.pushHistoryState) canvas.pushHistoryState();
          canvas.render();
          updateInspector(item);
          if (canvas.options && canvas.options.onCircuitChanged) {
            canvas.options.onCircuitChanged();
          }
          showToast(isLocked ? 'Posisi komponen berhasil dikunci (terkunci di Android)!' : 'Kunci posisi komponen berhasil dibuka!', true);
        });
      }

      document.getElementById('btnInspRotate').addEventListener('click', () => {
        if (canvas.isSimulating) {
          showToast('Hentikan simulasi terlebih dahulu untuk memutar komponen.', false);
          return;
        }
        if (item.teacherLocked || item.locked) {
          showToast('Posisi komponen ini dikunci (Ctrl+L). Buka kunci terlebih dahulu untuk memutar.', false);
          return;
        }
        canvas.rotateSelected();
      });
      document.getElementById('btnInspDelete').addEventListener('click', () => {
        if (canvas.isSimulating) {
          showToast('Hentikan simulasi terlebih dahulu untuk menghapus komponen.', false);
          return;
        }
        if (item.teacherLocked) {
          showToast('Komponen dikunci oleh Guru (Teacher Locked). Buka Kunci Guru terlebih dahulu untuk menghapus.', false);
          return;
        }
        canvas.deleteSelected();
      });

      if (isSim) {
        inspectorContent.onclick = (ev) => {
          if (ev.target.closest('.btn-pos, #btnInspPushButton')) return;
          ev.preventDefault();
          ev.stopPropagation();
          showToast('Hentikan simulasi terlebih dahulu untuk mengedit properti komponen.', false);
        };
        inspectorContent.onpointerdown = (ev) => {
          if (ev.target.closest('.btn-pos, #btnInspPushButton')) return;
          if (ev.target.matches('input[type="range"], input[data-sim-locked="true"], button[data-sim-locked="true"]')) {
            ev.preventDefault();
          }
        };
      } else {
        inspectorContent.onclick = null;
        inspectorContent.onpointerdown = null;
      }

    } else if (item.type === 'Connector') {
      const isSim = canvas && canvas.isSimulating;
      const el1 = canvas.elements.find(e => e.id === item.idElementNode1);
      const el2 = canvas.elements.find(e => e.id === item.idElementNode2);
      const name1 = el1 ? (el1.tag || el1.svgData) : 'Node1';
      const name2 = el2 ? (el2.tag || el2.svgData) : 'Node2';

      inspectorContent.innerHTML = `
        ${isSim ? `<div class="prop-sim-lock-banner" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; padding: 7px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Simulasi Berjalan (Mode Baca Saja)</div>` : ''}
        <div class="prop-group">
          <label class="prop-label">Wire Connection</label>
          <div style="font-weight: 700; font-size: 13px; color: var(--accent-primary);">Wire #${item.id}</div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
            ${name1} (pin ${item.idNode1}) → ${name2} (pin ${item.idNode2})
          </div>
        </div>
        <div class="prop-group">
          <label class="prop-label">Center Channel Offset (px)</label>
          <input type="number" step="30" id="propWireCenter" class="prop-input" value="${item.margins ? item.margins.center : 0}" ${isSim ? 'readonly data-sim-locked="true" style="opacity: 0.6; cursor: not-allowed;"' : ''} />
        </div>
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button id="btnInspDeleteWire" class="btn btn-danger" ${isSim ? 'data-sim-locked="true" style="flex: 1; opacity: 0.5; cursor: not-allowed;"' : 'style="flex: 1;"'}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>Delete Wire</button>
        </div>
      `;

      const centerIn = document.getElementById('propWireCenter');
      centerIn.addEventListener('input', (e) => {
        if (canvas.isSimulating) return;
        if (!item.margins) item.margins = { start: 0, center: 0, end: 0 };
        item.margins.center = parseFloat(e.target.value) || 0;
        canvas.render();
      });

      document.getElementById('btnInspDeleteWire').addEventListener('click', () => {
        if (canvas.isSimulating) {
          showToast('Hentikan simulasi terlebih dahulu untuk menghapus kawat.', false);
          return;
        }
        canvas.deleteSelected();
      });

      if (isSim) {
        inspectorContent.onclick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          showToast('Hentikan simulasi terlebih dahulu untuk mengedit properti kawat.', false);
        };
        inspectorContent.onpointerdown = (ev) => {
          if (ev.target.matches('input[data-sim-locked="true"], button[data-sim-locked="true"]')) {
            ev.preventDefault();
          }
        };
      } else {
        inspectorContent.onclick = null;
        inspectorContent.onpointerdown = null;
      }
    }
  }

  // Toolbar Handlers
  btnRun.addEventListener('click', () => canvas.startSimulation());
  btnStop.addEventListener('click', () => canvas.stopSimulation());
  if (btnRotate) {
    btnRotate.addEventListener('click', () => {
      if (canvas.isSimulating) {
        showToast('Hentikan simulasi terlebih dahulu untuk memutar komponen.', false);
        return;
      }
      canvas.rotateSelected();
    });
  }
  btnDelete.addEventListener('click', () => {
    if (canvas.isSimulating) {
      showToast('Hentikan simulasi terlebih dahulu untuk menghapus komponen.', false);
      return;
    }
    canvas.deleteSelected();
  });
  btnFit.addEventListener('click', () => canvas.fitToScreen());
  btnClear.addEventListener('click', () => {
    if (canvas.isSimulating) {
      showToast('Hentikan simulasi terlebih dahulu untuk mengosongkan kanvas.', false);
      return;
    }
    if (confirm('Clear the entire canvas?')) {
      canvas.clear();
    }
  });

  if (btnUndo) {
    btnUndo.addEventListener('click', () => {
      if (canvas.isSimulating) {
        showToast('Hentikan simulasi terlebih dahulu untuk membatalkan (undo).', false);
        return;
      }
      canvas.undo();
    });
  }

  if (btnRedo) {
    btnRedo.addEventListener('click', () => {
      if (canvas.isSimulating) {
        showToast('Hentikan simulasi terlebih dahulu untuk mengulangi (redo).', false);
        return;
      }
      canvas.redo();
    });
  }

  // Direct Save to Workspace (Local Project Persistence)
  function quickSaveProject() {
    if (projectManager) {
      projectManager.autoSaveCurrent(true);
      hasUnsavedChanges = false;
      const p = projectManager.getActiveProject();
      showToast(`Sirkuit "${p ? p.name : 'Sirkuit'}" berhasil disimpan ke lembar kerja!`, true);
    } else {
      hasUnsavedChanges = false;
      showToast('Sirkuit berhasil disimpan ke lembar kerja!', true);
    }
    if (activeProjectBadge) {
      activeProjectBadge.classList.add('badge-saved-pulse');
      setTimeout(() => {
        activeProjectBadge.classList.remove('badge-saved-pulse');
      }, 1200);
    }
    if (btnQuickSave) {
      const origText = btnQuickSave.innerHTML;
      btnQuickSave.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg><span class="btn-text-label">Tersimpan</span>';
      btnQuickSave.classList.add('btn-saved-pulse');
      setTimeout(() => {
        btnQuickSave.innerHTML = origText;
        btnQuickSave.classList.remove('btn-saved-pulse');
      }, 1400);
    }
  }

  if (btnQuickSave) {
    btnQuickSave.addEventListener('click', quickSaveProject);
  }

  // Sound Engine Mute Toggle & UI
  // =========================================================================
  // THEME SYSTEM CONTROLLER ('dark' | 'light')
  // =========================================================================
  const THEME_STORAGE_KEY = 'mashimurelay_theme';
  const VALID_THEMES = ['dark', 'light'];
  const THEME_LABELS = {
    dark: 'Dark CAD',
    light: 'Light Paper'
  };
  const THEME_META_COLORS = {
    dark: '#1a1a24',
    light: '#ffffff'
  };

  function updateThemeControlsUI(themeId) {
    const isLight = themeId === 'light';
    if (btnToggleTheme) {
      btnToggleTheme.innerHTML = isLight
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
      btnToggleTheme.title = isLight
        ? 'Tema Aktif: Light Paper — Klik untuk Dark CAD'
        : 'Tema Aktif: Dark CAD — Klik untuk Light Paper';
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', THEME_META_COLORS[themeId] || '#1a1a24');
    if (settingThemeGroup) {
      settingThemeGroup.querySelectorAll('.theme-opt-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme-opt') === themeId);
      });
    }
  }

  function applyTheme(themeId, notify = false) {
    const next = VALID_THEMES.includes(themeId) ? themeId : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch (_) {}
    updateThemeControlsUI(next);
    if (typeof canvas !== 'undefined' && canvas) {
      canvas.render();
      if (canvas.isSimulating) {
        canvas.updateSimulationVisuals();
      }
    }
    if (notify) {
      showToast('Tema: ' + (THEME_LABELS[next] || 'Dark CAD'), true);
    }
  }

  window.MashimurelayTheme = {
    get: () => document.documentElement.getAttribute('data-theme') || 'dark',
    set: (id) => applyTheme(id, true),
    toggle: () => applyTheme(window.MashimurelayTheme.get() === 'light' ? 'dark' : 'light', true),
    isLight: () => window.MashimurelayTheme.get() === 'light'
  };

  // Initialize saved theme immediately
  const initialTheme = (() => {
    try { return localStorage.getItem(THEME_STORAGE_KEY) || 'dark'; } catch (_) { return 'dark'; }
  })();
  applyTheme(initialTheme, false);

  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      window.MashimurelayTheme.toggle();
    });
  }
  if (settingThemeGroup) {
    settingThemeGroup.querySelectorAll('.theme-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTheme = btn.getAttribute('data-theme-opt');
        if (targetTheme) applyTheme(targetTheme, true);
      });
    });
  }

  function updateSoundButtonUI() {
    if (!btnToggleSound || !window.soundManager) return;
    const isMuted = window.soundManager.isMuted;
    btnToggleSound.innerHTML = isMuted
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px;"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
    btnToggleSound.title = isMuted
      ? 'Suara Simulasi: NONAKTIF / BISU (Klik untuk Menyalakan / Tekan M)'
      : 'Suara Simulasi: AKTIF (Klik untuk Membisukan / Tekan M)';
    btnToggleSound.classList.toggle('btn-sound-muted', isMuted);
  }

  if (btnToggleSound) {
    updateSoundButtonUI();
    btnToggleSound.addEventListener('click', () => {
      if (window.soundManager) {
        window.soundManager.toggleMute();
        updateSoundButtonUI();
        showToast(window.soundManager.isMuted ? 'Suara Simulasi Dinonaktifkan' : 'Suara Simulasi Diaktifkan', true);
      }
    });
  }
  window.addEventListener('sound-mute-changed', updateSoundButtonUI);

  // Keyboard Shortcuts: Ctrl+S (Save), Ctrl+Z (Undo), Ctrl+Shift+Z / Ctrl+Y (Redo), F11 (Fullscreen), M (Mute Sound)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    const targetTag = (e.target.tagName || '').toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea') return;

    if (!e.ctrlKey && !e.metaKey && !e.altKey && (e.key === 'm' || e.key === 'M')) {
      if (window.soundManager) {
        window.soundManager.toggleMute();
        updateSoundButtonUI();
        showToast(window.soundManager.isMuted ? 'Suara Simulasi Dinonaktifkan' : 'Suara Simulasi Diaktifkan', true);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (canvas && canvas.isReviewMode) {
        e.preventDefault();
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        quickSaveProject();
      } else if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canvas.isSimulating) {
          showToast('Hentikan simulasi terlebih dahulu untuk membatalkan/mengulangi aksi.', false);
          return;
        }
        if (e.shiftKey) {
          canvas.redo();
        } else {
          canvas.undo();
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canvas.isSimulating) {
          showToast('Hentikan simulasi terlebih dahulu untuk mengulangi (redo).', false);
          return;
        }
        canvas.redo();
      } else if (e.key.toLowerCase() === 'a' && !e.shiftKey) {
        e.preventDefault();
        if (canvas.isSimulating) {
          showToast('Tidak dapat memilih komponen saat simulasi sedang berjalan.', false);
          return;
        }
        const res = canvas.selectAll();
        if (res.count > 0) {
          showToast(`Seluruh komponen terpilih (${res.count} komponen)`, true);
        } else {
          showToast('Tidak ada komponen di kanvas untuk dipilih.', false);
        }
      } else if (e.key.toLowerCase() === 'c' && !e.shiftKey) {
        e.preventDefault();
        if (canvas.isSimulating) {
          showToast('Tidak dapat menyalin komponen saat simulasi sedang berjalan.', false);
          return;
        }
        const res = canvas.copySelection();
        if (res.count > 0) {
          showToast(`${res.count} komponen disalin ke clipboard!`, true);
        } else {
          showToast('Pilih komponen terlebih dahulu untuk disalin.', false);
        }
      } else if (e.key.toLowerCase() === 'v' && !e.shiftKey) {
        e.preventDefault();
        if (canvas.isSimulating) {
          showToast('Tidak dapat menempel komponen saat simulasi sedang berjalan.', false);
          return;
        }
        const res = canvas.pasteClipboard();
        if (res.count > 0) {
          showToast(`Berhasil menempelkan ${res.count} komponen di tengah visual kanvas!`, true);
        } else {
          showToast('Clipboard kosong. Salin (Ctrl+C) komponen terlebih dahulu.', false);
        }
      } else if (e.key.toLowerCase() === 'd' && !e.shiftKey) {
        e.preventDefault();
        if (canvas.isSimulating) {
          showToast('Tidak dapat menduplikat komponen saat simulasi sedang berjalan.', false);
          return;
        }
        const res = canvas.duplicateSelection(30);
        if (res.count > 0) {
          showToast(`Berhasil menduplikat ${res.count} komponen!`, true);
        } else {
          showToast('Pilih komponen terlebih dahulu untuk diduplikat.', false);
        }
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (canvas.isSimulating) {
          showToast('Tidak dapat menggabung/memisah komponen saat simulasi sedang berjalan.', false);
          return;
        }
        if (e.shiftKey) {
          // Ctrl + Shift + G: Ungroup
          const res = canvas.ungroupSelection();
          if (res.success) {
            showToast(`Berhasil memisahkan ${res.count} komponen dari grup.`, true);
          } else {
            showToast('Pilih komponen yang tergabung dalam grup untuk dipisahkan.', false);
          }
        } else {
          // Ctrl + G: Group
          const res = canvas.groupSelection();
          if (res.success) {
            showToast(`Berhasil menggabungkan ${res.count} komponen menjadi satu grup!`, true);
          } else {
            showToast('Pilih minimal 2 komponen (tahan Shift lalu klik) untuk digabungkan.', false);
          }
        }
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        if (canvas.isSimulating) {
          showToast('Tidak dapat mengunci/membuka posisi komponen saat simulasi sedang berjalan.', false);
          return;
        }
        // Ctrl + L: Toggle Lock (sets both locked & teacherLocked)
        const res = canvas.toggleLockSelected();
        if (res && res.count > 0) {
          showToast(res.locked ? `Posisi ${res.count} komponen berhasil dikunci (terkunci di Android)!` : `Kunci posisi ${res.count} komponen berhasil dibuka!`, true);
          if (canvas.selectedElementIds.size > 1) {
            const selEls = canvas.elements.filter(d => canvas.selectedElementIds.has(d.id));
            updateInspector({ type: 'MultiSelection', elements: selEls });
          } else if (canvas.selectedElementIds.size === 1) {
            const selEl = canvas.elements.find(d => canvas.selectedElementIds.has(d.id));
            updateInspector(selEl);
          }
        } else {
          showToast('Pilih komponen di kanvas terlebih dahulu untuk mengunci posisi (Ctrl+L).', false);
        }
      }
    }
  });

  // Open & Save .smrl and legacy .txt
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (projectManager) {
        projectManager.autoSaveCurrent();
      }
      const rawName = activeProjectName ? activeProjectName.textContent.trim() : 'Rangkaian Sederhana (Demo)';
      const safeName = rawName.replace(/(\.smrl|\.txt|\.json)+$/gi, '').replace(/[\\/:*?"<>|\x00-\x1F\x80-\x9F]/g, '').trim() || 'Sirkuit';
      const jsonStr = JSON.stringify(canvas.getCircuitJson(), null, 2);

      if (typeof TauriBridge !== 'undefined' && TauriBridge.isTauri()) {
        try {
          const savedPath = await TauriBridge.saveCircuitFile(`${safeName}.smrl`, jsonStr, 'smrl', 'Berkas Sirkuit Mashimurelay (*.smrl)');
          if (savedPath) {
            showToast(`Berkas berhasil disimpan: ${savedPath}`);
            return;
          } else {
            return;
          }
        } catch (e) {
          console.warn('Tauri save error, fallback to blob:', e);
        }
      }

      const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${safeName}.smrl`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 3000);
      showToast(`Berkas "${safeName}.smrl" berhasil diunduh!`);
    });
  }

  if (btnSaveTxt) {
    btnSaveTxt.addEventListener('click', async () => {
      if (projectManager) {
        projectManager.autoSaveCurrent();
      }
      const rawName = activeProjectName ? activeProjectName.textContent.trim() : 'Rangkaian Sederhana (Demo)';
      const safeName = rawName.replace(/(\.smrl|\.txt|\.json)+$/gi, '').replace(/[\\/:*?"<>|\x00-\x1F\x80-\x9F]/g, '').trim() || 'Sirkuit';
      const txt = exportCircuitToLegacyTxt(canvas.getCircuitJson());

      if (typeof TauriBridge !== 'undefined' && TauriBridge.isTauri()) {
        try {
          const savedPath = await TauriBridge.saveCircuitFile(`${safeName}.txt`, txt, 'txt', 'Berkas Teks Sirkuit Mashimurelay (*.txt)');
          if (savedPath) {
            showToast(`Berkas legacy TXT berhasil diekspor: ${savedPath}`);
            return;
          } else {
            return;
          }
        } catch (e) {
          console.warn('Tauri saveTxt error, fallback to blob:', e);
        }
      }

      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${safeName}.txt`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        URL.revokeObjectURL(url);
      }, 3000);
      showToast(`Berkas "${safeName}.txt" berhasil diekspor!`);
    });
  }

  function loadCircuitFromFile(file) {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (ext !== '.smrl' && ext !== '.txt') {
      showToast('Format berkas ditolak! Hanya berkas rangkaian .smrl dan .txt yang didukung.', false);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let circuit = null;
        if (text.trim().startsWith('{')) {
          try { circuit = JSON.parse(text); } catch (err) {}
        }
        if (!circuit || !circuit.data) {
          circuit = parseLegacyCircuitTxt(text);
        }

        const baseName = file.name.replace(/\.[^/.]+$/, '');
        if (circuit) {
          const cClass = circuit.class || (circuit.header && circuit.header.class);
          const cSchool = circuit.school || (circuit.header && circuit.header.school);
          if (cClass) localStorage.setItem('mashimu_student_class', cClass);
          if (cSchool) localStorage.setItem('mashimu_student_school', cSchool);
          if (typeof importTeacherModulesFromCircuit === 'function') {
            importTeacherModulesFromCircuit(circuit);
          }
        }
        if (projectManager && circuit) {
          projectManager.createNewProject(baseName, circuit);
        } else {
          canvas.loadCircuit(circuit || text);
        }
        closeDashboard();
        showToast(`Berkas "${file.name}" berhasil dimuat!`, true);
      } catch (err) {
        showToast('Gagal membuka file sirkuit: ' + err.message, false);
      }
    };
    reader.readAsText(file);
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        loadCircuitFromFile(file);
      }
      e.target.value = '';
    });
  }

  // Pre-packaged Examples Dropdown (if present in DOM)
  if (selectExamples) {
    selectExamples.addEventListener('change', (e) => {
      const key = e.target.value;
      if (!key) return;

      if (CIRCUIT_EXAMPLES[key]) {
        const ex = CIRCUIT_EXAMPLES[key];
        if (projectManager) {
          projectManager.createNewProject(ex.name, ex.circuit);
        } else {
          canvas.loadCircuit(ex.circuit);
        }
      } else if (key === 'empty') {
        if (projectManager) {
          projectManager.createNewProject('Canvas Kosong');
        } else {
          canvas.clear();
        }
      }
      e.target.value = '';
    });
  }

  // =========================================================================
  // Project Dashboard & Multi-Canvas Controller
  // =========================================================================
  function updateActiveProjectDisplay(proj) {
    if (activeProjectName && proj) {
      activeProjectName.textContent = proj.name;
    }
    if (drawerProjectSubtitle && proj) {
      drawerProjectSubtitle.textContent = proj.name;
    }
    if (activeProjectBadge && proj) {
      activeProjectBadge.title = `Proyek Aktif: ${proj.name}\nKlik untuk membuka Project Dashboard`;
    }
    if (window.reviewTabManager && proj) {
      window.reviewTabManager.updateWorkspaceName(proj.name);
    }
  }

  function renderProjectGrid() {
    if (!projectGrid || !projectManager) return;
    projectGrid.innerHTML = '';
    const list = projectManager.projects;
    if (projectCount) projectCount.textContent = list.length;

    list.forEach(p => {
      const isActive = p.id === projectManager.activeProjectId;
      const card = document.createElement('div');
      card.className = `project-card ${isActive ? 'project-card-active' : ''}`;

      const updatedDate = new Date(p.updatedAt || Date.now());
      const dateStr = updatedDate.toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const elemCount = (p.circuit && p.circuit.data) ? p.circuit.data.filter(d => d.type === 'ElectricalElement').length : 0;
      const wireCount = (p.circuit && p.circuit.data) ? p.circuit.data.filter(d => d.type === 'Connector').length : 0;

      card.innerHTML = `
        <div class="project-card-header">
          <div class="project-title" title="Klik untuk mengubah nama sirkuit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 5px; flex-shrink: 0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>${p.name} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-left: 4px; opacity: 0.6;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></div>
          ${isActive ? `<span class="project-badge-active">AKTIF</span>` : ''}
        </div>
        <div class="project-meta">
          <span>${elemCount} komponen, ${wireCount} kawat penghubung</span>
          <span>Diubah: ${dateStr}</span>
        </div>
        <div class="project-actions">
          <button class="btn btn-open-project" title="Buka Sirkuit ke Lembar Kerja">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/></svg>
          </button>
          <button class="btn btn-save-project" title="Simpan Sirkuit ke Lembar Kerja">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          </button>
          <button class="btn btn-export-project" title="Ekspor Sirkuit (Save As...)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
          <button class="btn btn-del-project" title="Hapus Sirkuit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
      `;

      // Event Listeners for Project Card
      const titleEl = card.querySelector('.project-title');
      titleEl.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const newName = prompt('Ubah nama lembar kerja / sirkuit:', p.name);
        if (newName && newName.trim()) {
          projectManager.renameProject(p.id, newName.trim());
          if (p.id === projectManager.activeProjectId) {
            updateActiveProjectDisplay(p);
          }
          renderProjectGrid();
        }
      });

      card.querySelector('.btn-open-project').addEventListener('click', () => {
        projectManager.openProject(p.id);
        if (modalDashboard) hideModal(modalDashboard);
        showToast(`Lembar kerja "${p.name}" dibuka!`);
      });

      card.querySelector('.btn-save-project').addEventListener('click', () => {
        if (projectManager) {
          projectManager.saveProject(p.id);
          renderProjectGrid();
          showToast(`Lembar kerja "${p.name}" berhasil disimpan!`, true);
        }
      });

      card.querySelector('.btn-export-project').addEventListener('click', () => {
        if (projectManager) {
          projectManager.openProject(p.id);
        }
        if (inputSaveAsFileName) {
          inputSaveAsFileName.value = p.name;
        }
        hideModal(modalDashboard);
        showModal(modalSaveAs);
        if (inputSaveAsFileName) {
          setTimeout(() => inputSaveAsFileName.select(), 100);
        }
      });

      card.querySelector('.btn-del-project').addEventListener('click', () => {
        if (confirm(`Hapus sirkuit "${p.name}"?`)) {
          projectManager.deleteProject(p.id);
          renderProjectGrid();
          showToast(`Sirkuit "${p.name}" telah dihapus.`);
        }
      });

      projectGrid.appendChild(card);
    });
  }

  // Initialize Project Manager
  const projectManager = new MashimurelayProjectManager(canvas, (proj) => {
    updateActiveProjectDisplay(proj);
    renderProjectGrid();
  });

  // Initialize Excel-style Review Tab Manager
  const reviewTabManager = new ReviewTabManager(canvas, projectManager);
  window.reviewTabManager = reviewTabManager;

  // Load initial active project
  const initialProj = projectManager.getActiveProject();
  if (initialProj) {
    canvas.loadCircuit(initialProj.circuit);
    updateActiveProjectDisplay(initialProj);
  }

  // Dashboard Toggle Handlers
  function openDashboard() {
    if (canvas && canvas.isSimulating && typeof canvas.stopSimulation === 'function') {
      canvas.stopSimulation();
    }
    if (projectManager) projectManager.autoSaveCurrent();
    renderProjectGrid();
    showModal(modalDashboard);
  }

  // Expose for startup loading screen
  window.openProjectDashboard = openDashboard;
  window.addEventListener('mashimurelay:open-workspace', openDashboard);
  if (window.mashimurelayNeedsInitialDashboard) {
    window.mashimurelayNeedsInitialDashboard = false;
    openDashboard();
  }

  function closeDashboard() {
    hideModal(modalDashboard);
  }

  if (btnDashboard) btnDashboard.addEventListener('click', openDashboard);
  if (activeProjectBadge) activeProjectBadge.addEventListener('click', openDashboard);
  if (btnCloseDashboard) btnCloseDashboard.addEventListener('click', closeDashboard);

  // Bottom Excel-bar Shortcuts Button Handler
  const btnOpenShortcutsModal = document.getElementById('btnOpenShortcutsModal');
  if (btnOpenShortcutsModal) {
    btnOpenShortcutsModal.addEventListener('click', () => {
      showModal(modalInstructions);
      if (typeof openInstructionsModal === 'function') {
        openInstructionsModal();
      }
      const shortcutTab = document.querySelector('.inst-tab[data-tab="tabShortcuts"]');
      if (shortcutTab) {
        shortcutTab.click();
      }
    });
  }

  if (modalDashboard) {
    modalDashboard.addEventListener('click', (e) => {
      if (e.target === modalDashboard) closeDashboard();
    });
  }

  // Create New Canvas Handler
  function handleCreateNewCanvas() {
    const defaultName = `Sirkuit Baru #${projectManager.projects.length + 1}`;
    const name = prompt('Masukkan nama untuk Canvas / Sirkuit baru:', defaultName);
    if (name !== null) {
      projectManager.createNewProject(name);
      closeDashboard();
    }
  }

  if (btnNewCanvas) btnNewCanvas.addEventListener('click', handleCreateNewCanvas);
  if (btnDashNew) btnDashNew.addEventListener('click', handleCreateNewCanvas);

  // Template Buttons in Dashboard
  document.querySelectorAll('.btn-use-template').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const templateKey = e.currentTarget.getAttribute('data-template');
      if (templateKey === 'empty') {
        projectManager.createNewProject('Canvas Kosong (Baru)');
      } else if (templateKey === 'rangkaian_sederhana' && CIRCUIT_EXAMPLES.rangkaian_sederhana) {
        projectManager.createNewProject('Rangkaian Sederhana (Demo)', CIRCUIT_EXAMPLES.rangkaian_sederhana.circuit);
      }
      closeDashboard();
    });
  });

  // Dashboard Drag & Drop Dropzone for .smrl & .txt
  const cardDashDropzone = document.getElementById('cardDashDropzone');
  const btnDashImport = document.getElementById('btnDashImport');

  if (btnDashImport) {
    btnDashImport.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerOpenCircuitDialog();
    });
  }

  if (cardDashDropzone) {
    cardDashDropzone.addEventListener('click', () => {
      triggerOpenCircuitDialog();
    });

    cardDashDropzone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      cardDashDropzone.classList.add('is-drag-hover');
    });

    cardDashDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      cardDashDropzone.classList.add('is-drag-hover');
    });

    cardDashDropzone.addEventListener('dragleave', (e) => {
      if (e.relatedTarget && cardDashDropzone.contains(e.relatedTarget)) return;
      cardDashDropzone.classList.remove('is-drag-hover');
    });

    cardDashDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      cardDashDropzone.classList.remove('is-drag-hover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        loadCircuitFromFile(e.dataTransfer.files[0]);
      }
    });
  }

  // Periodic Auto-Save Every 15 Seconds (Hanya saat Auto-Save AKTIF)
  setInterval(() => {
    if (isAutoSaveEnabled && projectManager && !canvas.isSimulating) {
      projectManager.autoSaveCurrent();
      hasUnsavedChanges = false;
    }
  }, 15000);

  // =========================================================================
  // Unsaved Changes Confirmation Modal & Exit Controller (Web & Tauri Windows)
  // =========================================================================
  const modalUnsavedChanges = document.getElementById('modalUnsavedChanges');
  const unsavedProjectName = document.getElementById('unsavedProjectName');
  const btnExitSave = document.getElementById('btnExitSave');
  const btnExitDiscard = document.getElementById('btnExitDiscard');
  const btnExitCancel = document.getElementById('btnExitCancel');

  function showUnsavedChangesModal(callbacks = {}) {
    if (!modalUnsavedChanges) {
      if (callbacks.onDiscard) callbacks.onDiscard();
      return;
    }

    const activeProj = projectManager ? projectManager.getActiveProject() : null;
    if (unsavedProjectName) {
      unsavedProjectName.textContent = activeProj ? activeProj.name : 'Sirkuit Aktif';
    }

    modalUnsavedChanges.style.display = 'flex';

    function cleanup() {
      modalUnsavedChanges.style.display = 'none';
      window.removeEventListener('keydown', handleModalKeys);
    }

    function handleModalKeys(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
        if (callbacks.onCancel) callbacks.onCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        cleanup();
        if (callbacks.onSave) callbacks.onSave();
      }
    }

    window.addEventListener('keydown', handleModalKeys);

    if (btnExitSave) {
      btnExitSave.onclick = () => {
        cleanup();
        if (callbacks.onSave) callbacks.onSave();
      };
    }

    if (btnExitDiscard) {
      btnExitDiscard.onclick = () => {
        cleanup();
        if (callbacks.onDiscard) callbacks.onDiscard();
      };
    }

    if (btnExitCancel) {
      btnExitCancel.onclick = () => {
        cleanup();
        if (callbacks.onCancel) callbacks.onCancel();
      };
    }
  }

  // 1. Browser Native Tab Close / Reload Guard (beforeunload)
  window.addEventListener('beforeunload', (e) => {
    if (isBypassingExitGuard) return;
    if (isAutoSaveEnabled) {
      if (projectManager && !canvas.isSimulating) {
        projectManager.autoSaveCurrent();
      }
      hasUnsavedChanges = false;
    } else if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });

  // 2. Keyboard Reload Guard (F5 / Ctrl+R / Cmd+R)
  window.addEventListener('keydown', (e) => {
    const isRefresh = e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r');
    if (isRefresh) {
      if (!isAutoSaveEnabled && hasUnsavedChanges) {
        e.preventDefault();
        showUnsavedChangesModal({
          onSave: async () => {
            if (canvas && canvas.isSimulating) canvas.stopSimulation();
            if (projectManager) projectManager.autoSaveCurrent(true);
            hasUnsavedChanges = false;
            isBypassingExitGuard = true;
            window.location.reload();
          },
          onDiscard: () => {
            if (canvas && canvas.isSimulating) canvas.stopSimulation();
            isBypassingExitGuard = true;
            window.location.reload();
          },
          onCancel: () => {}
        });
      } else if (isAutoSaveEnabled && hasUnsavedChanges) {
        if (projectManager && !canvas.isSimulating) {
          projectManager.autoSaveCurrent();
        }
        hasUnsavedChanges = false;
      }
    }
  });

  // 3. Tauri Windows Native Window Close Guard (Alt+F4 / Titlebar [X] / Taskbar Close)
  if (window.__TAURI__ && window.__TAURI__.event) {
    window.__TAURI__.event.listen('mashimu-close-requested', async () => {
      if (isBypassingExitGuard) return;
      if (!isAutoSaveEnabled && hasUnsavedChanges) {
        showUnsavedChangesModal({
          onSave: async () => {
            if (canvas && canvas.isSimulating) canvas.stopSimulation();
            if (projectManager) projectManager.autoSaveCurrent(true);
            hasUnsavedChanges = false;
            isBypassingExitGuard = true;
            await new Promise(r => setTimeout(r, 45));
            if (window.TauriBridge) {
              await window.TauriBridge.forceCloseApp();
            }
          },
          onDiscard: async () => {
            if (canvas && canvas.isSimulating) canvas.stopSimulation();
            isBypassingExitGuard = true;
            if (window.TauriBridge) {
              await window.TauriBridge.forceCloseApp();
            }
          },
          onCancel: () => {}
        });
      } else {
        if (isAutoSaveEnabled && hasUnsavedChanges && projectManager) {
          projectManager.autoSaveCurrent();
          await new Promise(r => setTimeout(r, 45));
        }
        isBypassingExitGuard = true;
        if (window.TauriBridge) {
          await window.TauriBridge.forceCloseApp();
        }
      }
    });
  }

  // Android QR Modal Handlers (Null-safe)
  const btnQr = document.getElementById('btnQr');
  const modalQr = document.getElementById('modalQr');
  const btnCloseQr = document.getElementById('btnCloseQr');
  if (btnQr && modalQr) {
    btnQr.addEventListener('click', () => {
      showModal(modalQr);
    });
  }
  if (btnCloseQr && modalQr) {
    btnCloseQr.addEventListener('click', () => {
      hideModal(modalQr);
    });
  }
  if (modalQr) {
    modalQr.addEventListener('click', (e) => {
      if (e.target === modalQr) hideModal(modalQr);
    });
  }

  // Bulletproof Panel Controller for Desktop WebView2 & Web
  let lastActionTimestamp = 0;
  const DEBOUNCE_MS = 160;

  const getPanelDomRefs = () => ({
    sidebarEl: document.querySelector('.sidebar'),
    inspectorEl: document.querySelector('.inspector'),
    paletteContainer: document.getElementById('paletteContainer') || document.querySelector('.palette-scroll'),
    btnTogglePalette: document.getElementById('btnTogglePalette'),
    btnToggleInspector: document.getElementById('btnToggleInspector'),
    btnCollapseSidebar: document.getElementById('btnCollapseSidebar'),
    btnCollapseInspector: document.getElementById('btnCollapseInspector'),
    btnFloatingOpenPalette: document.getElementById('btnFloatingOpenPalette'),
    btnFloatingOpenInspector: document.getElementById('btnFloatingOpenInspector')
  });

  const safeResetScroll = (el) => {
    try {
      if (!el) return;
      if (typeof resetPanelScroll === 'function') {
        resetPanelScroll(el);
      } else {
        el.scrollTop = 0;
      }
    } catch (_) {}
  };

  const safeShowToast = (msg) => {
    try {
      if (typeof showToast === 'function') {
        showToast(msg);
      }
    } catch (_) {}
  };

  function togglePalette(forceState) {
    if (document.body.classList.contains('review-mode-active') || (canvas && canvas.isReviewMode)) return;
    const refs = getPanelDomRefs();
    if (!refs.sidebarEl) return;
    const currentlyCollapsed = refs.sidebarEl.classList.contains('is-collapsed');
    const nextCollapsed = (typeof forceState === 'boolean') ? forceState : !currentlyCollapsed;

    refs.sidebarEl.classList.toggle('is-collapsed', nextCollapsed);
    refs.sidebarEl.setAttribute('aria-hidden', String(nextCollapsed));

    if (refs.btnTogglePalette) {
      refs.btnTogglePalette.classList.toggle('is-inactive', nextCollapsed);
      refs.btnTogglePalette.setAttribute('aria-expanded', String(!nextCollapsed));
      refs.btnTogglePalette.title = nextCollapsed ? 'Tampilkan Panel Komponen' : 'Sembunyikan Panel Komponen';
    }
    if (refs.btnFloatingOpenPalette) {
      refs.btnFloatingOpenPalette.classList.toggle('is-hidden', !nextCollapsed);
    }
    if (!nextCollapsed) {
      safeResetScroll(refs.sidebarEl);
      safeResetScroll(refs.paletteContainer);
    }
    safeShowToast(nextCollapsed ? 'Panel Komponen disembunyikan' : 'Panel Komponen ditampilkan');
  }

  function toggleInspector(forceState) {
    if (document.body.classList.contains('review-mode-active') || (canvas && canvas.isReviewMode)) return;
    const refs = getPanelDomRefs();
    if (!refs.inspectorEl) return;
    const currentlyCollapsed = refs.inspectorEl.classList.contains('is-collapsed');
    const nextCollapsed = (typeof forceState === 'boolean') ? forceState : !currentlyCollapsed;

    refs.inspectorEl.classList.toggle('is-collapsed', nextCollapsed);
    refs.inspectorEl.setAttribute('aria-hidden', String(nextCollapsed));

    if (refs.btnToggleInspector) {
      refs.btnToggleInspector.classList.toggle('is-inactive', nextCollapsed);
      refs.btnToggleInspector.setAttribute('aria-expanded', String(!nextCollapsed));
      refs.btnToggleInspector.title = nextCollapsed ? 'Tampilkan Panel Properti' : 'Sembunyikan Panel Properti';
    }
    if (refs.btnFloatingOpenInspector) {
      refs.btnFloatingOpenInspector.classList.toggle('is-hidden', !nextCollapsed);
    }
    if (!nextCollapsed) {
      safeResetScroll(refs.inspectorEl);
    }
    safeShowToast(nextCollapsed ? 'Panel Properti disembunyikan' : 'Panel Properti ditampilkan');
  }

  function executePanelAction(actionOrBtnId, event) {
    if (event) {
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    if (document.body.classList.contains('review-mode-active') || (canvas && canvas.isReviewMode)) return;
    const now = performance.now();
    if (now - lastActionTimestamp < DEBOUNCE_MS) return;
    lastActionTimestamp = now;

    switch (actionOrBtnId) {
      case 'btnTogglePalette':
      case 'toggle-palette':
        togglePalette();
        break;
      case 'btnCollapseSidebar':
      case 'collapse-palette':
        togglePalette(true);
        break;
      case 'btnFloatingOpenPalette':
      case 'open-palette':
        togglePalette(false);
        break;
      case 'btnToggleInspector':
      case 'toggle-inspector':
        toggleInspector();
        break;
      case 'btnCollapseInspector':
      case 'collapse-inspector':
        toggleInspector(true);
        break;
      case 'btnFloatingOpenInspector':
      case 'open-inspector':
        toggleInspector(false);
        break;
    }
  }

  // Expose globally for HTML onclick and other modules
  window.togglePalette = togglePalette;
  window.toggleInspector = toggleInspector;
  window.mashimuPanelControl = executePanelAction;

  const PANEL_BTN_SELECTOR = '#btnTogglePalette, #btnCollapseSidebar, #btnFloatingOpenPalette, #btnToggleInspector, #btnCollapseInspector, #btnFloatingOpenInspector, [data-panel-action]';

  function resolvePanelTargetButton(target) {
    if (!target) return null;
    const el = (target.nodeType === 1) ? target : target.parentElement;
    if (!el || typeof el.closest !== 'function') return null;
    return el.closest(PANEL_BTN_SELECTOR);
  }

  // Layer 1: Window Capture Phase on pointerdown - release pointer capture and stop propagation to CAD canvas
  window.addEventListener('pointerdown', (e) => {
    const btn = resolvePanelTargetButton(e.target);
    if (!btn) return;
    try {
      if (e.target && typeof e.target.releasePointerCapture === 'function' && e.target.hasPointerCapture(e.pointerId)) {
        e.target.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    e.stopPropagation();
  }, true);

  // Layer 2: Window Capture Phase on click
  window.addEventListener('click', (e) => {
    const btn = resolvePanelTargetButton(e.target);
    if (!btn) return;
    const actionKey = btn.getAttribute('data-panel-action') || btn.id;
    if (actionKey) {
      e.stopPropagation();
      executePanelAction(actionKey, e);
    }
  }, true);

  // Layer 3: Direct Element Listeners
  const bindDirectPanelButtonListeners = () => {
    document.querySelectorAll(PANEL_BTN_SELECTOR).forEach((btn) => {
      if (btn.dataset.panelBound === 'true') return;
      btn.dataset.panelBound = 'true';

      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
      }, false);

      btn.addEventListener('click', (e) => {
        const actionKey = btn.getAttribute('data-panel-action') || btn.id;
        if (actionKey) {
          e.stopPropagation();
          executePanelAction(actionKey, e);
        }
      }, false);
    });
  };
  bindDirectPanelButtonListeners();

  // Sync initial visibility state
  const initialRefs = getPanelDomRefs();
  if (initialRefs.sidebarEl) {
    const isInitSidebarCollapsed = initialRefs.sidebarEl.classList.contains('is-collapsed');
    if (initialRefs.btnTogglePalette) initialRefs.btnTogglePalette.classList.toggle('is-inactive', isInitSidebarCollapsed);
    if (initialRefs.btnFloatingOpenPalette) initialRefs.btnFloatingOpenPalette.classList.toggle('is-hidden', !isInitSidebarCollapsed);
  }
  if (initialRefs.inspectorEl) {
    const isInitInspectorCollapsed = initialRefs.inspectorEl.classList.contains('is-collapsed');
    if (initialRefs.btnToggleInspector) initialRefs.btnToggleInspector.classList.toggle('is-inactive', isInitInspectorCollapsed);
    if (initialRefs.btnFloatingOpenInspector) initialRefs.btnFloatingOpenInspector.classList.toggle('is-hidden', !isInitInspectorCollapsed);
  }

  // Canvas Drag & Drop Listeners (Drop components anywhere on the canvas)
  const canvasContainer = document.querySelector('.canvas-container');
  if (canvasContainer && canvas) {
    const handleDragEnter = (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
        canvasContainer.classList.add('canvas-drag-hover');
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      canvasContainer.classList.add('canvas-drag-hover');
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      canvasContainer.classList.remove('canvas-drag-hover');
      document.body.classList.remove('is-palette-dragging');

      // Check if user dropped an external .smrl or .txt circuit file onto workspace
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        loadCircuitFromFile(e.dataTransfer.files[0]);
        return;
      }

      const svgName = activeDraggedComponentSvg || (e.dataTransfer && (
        e.dataTransfer.getData('application/x-mashimurelay-component') ||
        e.dataTransfer.getData('text/plain') ||
        e.dataTransfer.getData('text')
      )) || null;
      activeDraggedComponentSvg = null;
      if (!svgName) return;

      if (canvas.isSimulating) {
        showToast('Hentikan simulasi terlebih dahulu untuk menambahkan komponen.', false);
        return;
      }

      const compDef = window.COMPONENTS_DATA ? window.COMPONENTS_DATA[svgName] : null;
      const compWidth = (compDef && compDef.width) ? compDef.width : 60;
      const compHeight = (compDef && compDef.height) ? compDef.height : 60;

      // Convert drop clientX, clientY to world coordinates
      const worldPos = canvas.screenToWorld(e.clientX, e.clientY);
      const targetX = worldPos.x - compWidth / 2;
      const targetY = worldPos.y - compHeight / 2;

      if (canvas.selectedElementIds) {
        canvas.selectedElementIds.clear();
      }
      const newElem = canvas.addElement(svgName, targetX, targetY);
      if (newElem) {
        const compName = compDef && (compDef.name || (compDef.info && compDef.info.name)) ? (compDef.name || compDef.info.name) : svgName;
        showToast(`${compName} ditempatkan pada posisi kursor`);
      }

      if (window.innerWidth <= 860 && sidebarEl) {
        sidebarEl.classList.remove('mobile-open');
      }
    };

    canvasContainer.addEventListener('dragenter', handleDragEnter);
    canvasContainer.addEventListener('dragover', handleDragOver);
    canvasContainer.addEventListener('dragleave', (e) => {
      if (e.relatedTarget && canvasContainer.contains(e.relatedTarget)) return;
      canvasContainer.classList.remove('canvas-drag-hover');
    });
    canvasContainer.addEventListener('drop', handleDrop);

    if (svgEl) {
      svgEl.addEventListener('dragenter', handleDragEnter);
      svgEl.addEventListener('dragover', handleDragOver);
      svgEl.addEventListener('drop', handleDrop);
    }

    // Document & Window-wide preventDefault guarantees WebView2 allows drops
    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
    }, false);

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    }, false);

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
    }, false);

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    }, false);
  }

  // Tap on canvas closes open mobile drawers
  svgEl.addEventListener('pointerdown', () => {
    if (window.innerWidth <= 860) {
      if (sidebarEl) sidebarEl.classList.remove('mobile-open');
      if (inspectorEl) inspectorEl.classList.remove('mobile-open');
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (floatingPill) floatingPill.style.display = 'none';
    }
  });

  // Native Android Back Button integration handler
  window.onMashimurelayBackPressed = () => {
    // -1. Close Floating Pill if open during simulation
    if (floatingPill && floatingPill.style.display !== 'none' && canvas.isSimulating) {
      floatingPill.style.display = 'none';
      return true;
    }
    // 0. Close Dashboard modal if open
    if (modalDashboard && modalDashboard.style.display === 'flex') {
      modalDashboard.style.display = 'none';
      return true;
    }
    // 1. Close QR modal if open
    if (modalQr && modalQr.style.display === 'flex') {
      modalQr.style.display = 'none';
      return true;
    }
    // 2. Close mobile sidebar if open
    if (sidebarEl && sidebarEl.classList.contains('mobile-open')) {
      sidebarEl.classList.remove('mobile-open');
      return true;
    }
    // 3. Close inspector if open
    if (inspectorEl && inspectorEl.classList.contains('mobile-open')) {
      inspectorEl.classList.remove('mobile-open');
      return true;
    }
    // 4. Deselect element/wire if selected
    if (canvas.selectedElementId !== null || canvas.selectedConnectorId !== null) {
      canvas.selectedElementId = null;
      canvas.selectedConnectorId = null;
      canvas.render();
      updateInspector(null);
      return true;
    }
    // 5. Stop simulation if running
    if (canvas.isSimulating) {
      canvas.stopSimulation();
      return true;
    }
    // Return false to allow native exit
    return false;
  };

  // Automatic MutationObserver to reset scroll to top on any modal whenever it becomes visible
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    const obs = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.type === 'attributes' && m.attributeName === 'style') {
          if (modal.style.display !== 'none' && modal.style.display !== '') {
            resetPanelScroll(modal);
          }
        }
      });
    });
    obs.observe(modal, { attributes: true, attributeFilter: ['style'] });
  });

  // Tauri Desktop Startup CLI File Loader
  if (typeof TauriBridge !== 'undefined' && TauriBridge.isTauri()) {
    setTimeout(async () => {
      try {
        const cliFile = await TauriBridge.getCliFileArg();
        if (cliFile && cliFile.content) {
          let circuit = null;
          if (cliFile.content.trim().startsWith('{')) {
            try { circuit = JSON.parse(cliFile.content); } catch (e) {}
          }
          if (!circuit || !circuit.data) {
            circuit = parseLegacyCircuitTxt(cliFile.content);
          }
          const baseName = cliFile.file_name.replace(/\.[^/.]+$/, '');
          if (typeof importTeacherModulesFromCircuit === 'function' && circuit) {
            importTeacherModulesFromCircuit(circuit);
          }
          if (projectManager && circuit) {
            projectManager.createNewProject(baseName, circuit);
          } else if (circuit) {
            canvas.loadCircuit(circuit);
          }
          showToast(`File "${cliFile.file_name}" dibuka dari argument sistem!`);
        }
      } catch (err) {
        console.warn('Tauri CLI arg check note:', err);
      }
    }, 300);
  }

  // =========================================================================
  // Modul Praktikum SMK & Pembuat Modul Mandiri Guru
  // =========================================================================
  const selectedTeacherTaskModuleIds = new Set();

  function getSelectedTeacherTaskModules() {
    if (typeof MashimurelayModules === 'undefined') return [];
    const customs = MashimurelayModules.getCustomModules();
    return customs.filter(m => selectedTeacherTaskModuleIds.has(m.id));
  }

  function importTeacherModulesFromCircuit(circuit) {
    if (!circuit || typeof MashimurelayModules === 'undefined') return 0;
    const incoming = [];
    if (Array.isArray(circuit.customModules)) {
      circuit.customModules.forEach(m => { if (m && typeof m === 'object') incoming.push(m); });
    }
    if (circuit.customModule && typeof circuit.customModule === 'object') {
      incoming.push(circuit.customModule);
    }
    if (incoming.length === 0) return 0;
    const res = MashimurelayModules.upsertCustomModules(incoming);
    if (res && res.total > 0) {
      updatePracticalModulesBadges();
      showToast(`${res.total} Modul Mandiri Guru otomatis tersimpan di menu Modul Praktikum!`, true);
    }
    return res ? res.total : 0;
  }

  function updatePracticalModulesBadges() {
    if (typeof MashimurelayModules === 'undefined') return;
    const stats = MashimurelayModules.getOverallStats();
    const drawerBadge = document.getElementById('drawerModulesBadge');
    const dashPill = document.getElementById('dashModulesProgressPill');
    const headerPill = document.getElementById('pmHeaderProgressBadge');
    const teacherTabCount = document.getElementById('pmTeacherTabCount');

    if (drawerBadge) drawerBadge.textContent = String(stats.totalModules);
    const pillText = `${stats.builtinCompleted} / ${stats.builtinTotal} Selesai${stats.customTotal > 0 ? ` · +${stats.customTotal} Guru` : ''}`;
    if (dashPill) dashPill.textContent = pillText;
    if (headerPill) headerPill.textContent = pillText;
    if (teacherTabCount) teacherTabCount.textContent = String(stats.customTotal);
  }

  function renderTeacherTaskModulesPicker() {
    const listEl = document.getElementById('teacherTaskModulesList');
    const badgeEl = document.getElementById('teacherTaskModulesCountBadge');
    if (!listEl || typeof MashimurelayModules === 'undefined') return;

    const customs = MashimurelayModules.getCustomModules();
    // Bersihkan ID yang sudah tidak ada
    const validIds = new Set(customs.map(m => m.id));
    Array.from(selectedTeacherTaskModuleIds).forEach(id => {
      if (!validIds.has(id)) selectedTeacherTaskModuleIds.delete(id);
    });

    if (badgeEl) {
      badgeEl.textContent = `${selectedTeacherTaskModuleIds.size} dipilih`;
    }

    if (customs.length === 0) {
      listEl.innerHTML = `<div class="teacher-task-modules-empty">Belum ada Modul Mandiri Guru. Klik <strong>+ Buat Modul</strong> untuk menyusun modul praktikum Anda sendiri.</div>`;
      return;
    }

    listEl.innerHTML = '';
    customs.forEach(mod => {
      const checked = selectedTeacherTaskModuleIds.has(mod.id);
      const row = document.createElement('label');
      row.className = `teacher-task-module-item ${checked ? 'is-selected' : ''}`;
      const kitCnt = Array.isArray(mod.allowedComponents) ? mod.allowedComponents.length : 0;
      const trackLabel = mod.track === 'industri' ? 'Industri' : (mod.track === 'otomotif' ? 'Otomotif' : 'Umum');
      row.innerHTML = `
        <input type="checkbox" ${checked ? 'checked' : ''} />
        <div style="min-width: 0; flex: 1;">
          <div style="font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(mod.title)}</div>
          <div style="font-size: 10.5px; color: var(--text-secondary);">${escapeHtml(trackLabel)} · ${escapeHtml(mod.subject || 'Modul Guru')}${kitCnt > 0 ? ` · Kit ${kitCnt} komponen` : ''}</div>
        </div>
      `;
      const cb = row.querySelector('input[type="checkbox"]');
      cb.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedTeacherTaskModuleIds.add(mod.id);
          row.classList.add('is-selected');
        } else {
          selectedTeacherTaskModuleIds.delete(mod.id);
          row.classList.remove('is-selected');
        }
        if (badgeEl) badgeEl.textContent = `${selectedTeacherTaskModuleIds.size} dipilih`;
      });
      listEl.appendChild(row);
    });
  }

  (function initPracticalModulesUI() {
    if (typeof MashimurelayModules === 'undefined') return;

    const drawerItemModules = document.getElementById('drawerItemModules');
    const btnDashOpenModules = document.getElementById('btnDashOpenModules');
    const modalPracticalModules = document.getElementById('modalPracticalModules');
    const btnClosePracticalModules = document.getElementById('btnClosePracticalModules');
    const btnOpenCustomModuleEditor = document.getElementById('btnOpenCustomModuleEditor');
    const pmListView = document.getElementById('pmListView');
    const pmDetailView = document.getElementById('pmDetailView');
    const pmCardsGrid = document.getElementById('pmCardsGrid');
    const pmSearchInput = document.getElementById('pmSearchInput');
    const btnPmBackToList = document.getElementById('btnPmBackToList');
    const pmDetailContent = document.getElementById('pmDetailContent');
    const pmDetailOwnerActions = document.getElementById('pmDetailOwnerActions');
    const btnPmEditCustom = document.getElementById('btnPmEditCustom');
    const btnPmDeleteCustom = document.getElementById('btnPmDeleteCustom');
    const btnPmWatchVideo = document.getElementById('btnPmWatchVideo');
    const btnPmWatchVideoLabel = document.getElementById('btnPmWatchVideoLabel');
    const btnPmWatchVideoSecondary = document.getElementById('btnPmWatchVideoSecondary');
    const btnPmWatchVideoSecondaryLabel = document.getElementById('btnPmWatchVideoSecondaryLabel');
    const btnPmOpenExample = document.getElementById('btnPmOpenExample');
    const btnPmStartPractice = document.getElementById('btnPmStartPractice');
    const btnPmStartPracticeLabel = document.getElementById('btnPmStartPracticeLabel');

    // Custom Module Editor Elements
    const modalCustomModuleEditor = document.getElementById('modalCustomModuleEditor');
    const btnCloseCustomModuleEditor = document.getElementById('btnCloseCustomModuleEditor');
    const btnCancelCustomModuleEditor = document.getElementById('btnCancelCustomModuleEditor');
    const btnSaveCustomModule = document.getElementById('btnSaveCustomModule');
    const customModuleEditorTitle = document.getElementById('customModuleEditorTitle');
    const cmeModuleId = document.getElementById('cmeModuleId');
    const cmeTitle = document.getElementById('cmeTitle');
    const cmeTrack = document.getElementById('cmeTrack');
    const cmeSubject = document.getElementById('cmeSubject');
    const cmeAuthor = document.getElementById('cmeAuthor');
    const cmeDuration = document.getElementById('cmeDuration');
    const cmeSummary = document.getElementById('cmeSummary');
    const cmeObjectives = document.getElementById('cmeObjectives');
    const cmeSafety = document.getElementById('cmeSafety');
    const cmeTheory = document.getElementById('cmeTheory');
    const cmeSteps = document.getElementById('cmeSteps');
    const cmeChecks = document.getElementById('cmeChecks');
    const cmeAttachCurrentCircuit = document.getElementById('cmeAttachCurrentCircuit');
    const cmeKitCount = document.getElementById('cmeKitCount');
    const cmeKitSearch = document.getElementById('cmeKitSearch');
    const cmeKitGrid = document.getElementById('cmeKitGrid');
    const btnCmeCopyActiveKit = document.getElementById('btnCmeCopyActiveKit');
    const btnCmeClearKit = document.getElementById('btnCmeClearKit');
    const btnQuickCreateModuleFromTask = document.getElementById('btnQuickCreateModuleFromTask');

    let activeTrackFilter = 'all';
    let activeSearchQuery = '';
    let activeDetailModuleId = null;
    let cmeSelectedComponents = new Set();
    let cmeExistingExampleCircuit = null;
    let cmeReturnToTaskSetup = false;

    const VIDEO_LABELS = {
      dol_starter: 'Video: DOL Starter',
      on_delay: 'Video: Timer On-Delay',
      off_delay: 'Video: Timer Off-Delay',
      thermal_overload: 'Video: Thermal Overload (TOR)',
      short_circuit: 'Video: MCB Short Circuit',
      klakson_relay: 'Video: Klakson Relay',
      lampu_sein_flasher: 'Video: Lampu Sein & Flasher',
      lampu_kepala_relay: 'Video: Headlamp Relay 5-Kaki',
      motor_starter_bendix: 'Video: Motor Starter Solenoid',
      wiper_auto_stop: 'Video: Wiper Auto-Stop',
      pengapian_tci: 'Video: Pengapian TCI'
    };

    function getComponentDisplayName(key) {
      if (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[key] && COMPONENTS_DATA[key].name) {
        return COMPONENTS_DATA[key].name;
      }
      return key;
    }

    function openVideoInInstructions(videoId) {
      if (!videoId) return;
      hideModal(modalPracticalModules);
      showModal(modalInstructions);
      if (typeof openInstructionsModal === 'function') {
        openInstructionsModal();
      }
      const videoTab = document.querySelector('.inst-tab[data-tab="tabVideoSim"]');
      if (videoTab) {
        videoTab.click();
      }
      setTimeout(() => {
        if (window.simVideoPlayer && typeof window.simVideoPlayer.loadVideo === 'function') {
          window.simVideoPlayer.loadVideo(videoId);
        }
      }, 120);
    }

    function renderModulesGrid() {
      if (!pmCardsGrid) return;
      updatePracticalModulesBadges();

      const allMods = MashimurelayModules.getAllModules();
      const q = activeSearchQuery.trim().toLowerCase();

      const filtered = allMods.filter(mod => {
        if (activeTrackFilter === 'guru') {
          if (mod.isBuiltin) return false;
        } else if (activeTrackFilter !== 'all') {
          if (mod.track !== activeTrackFilter) return false;
        }
        if (q) {
          const hay = [
            mod.code, mod.title, mod.subject, mod.author, mod.summary, mod.theory,
            ...(mod.allowedComponents || []).map(getComponentDisplayName)
          ].join(' ').toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        if (activeTrackFilter === 'guru' && !q) {
          pmCardsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; border: 1px dashed var(--border-color); border-radius: 10px; color: var(--text-secondary);">
              <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;">Belum Ada Modul Mandiri Guru</div>
              <div style="font-size: 12px; max-width: 440px; margin: 0 auto 14px auto; line-height: 1.5;">
                Buat modul praktikum Anda sendiri (atau terima modul dari QR Tugas Guru). Modul guru tersimpan lokal di perangkat dan bisa dilampirkan sekaligus pada penugasan siswa.
              </div>
              <button type="button" id="btnEmptyCreateTeacherMod" class="btn btn-sm btn-primary" style="font-weight: 600;">+ Buat Modul Mandiri Pertama</button>
            </div>
          `;
          const btnEmpty = document.getElementById('btnEmptyCreateTeacherMod');
          if (btnEmpty) {
            btnEmpty.addEventListener('click', () => openCustomModuleEditorModal(null));
          }
        } else {
          pmCardsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 36px 20px; color: var(--text-muted); font-size: 13px;">
              Tidak ditemukan modul yang cocok dengan filter atau kata kunci pencarian.
            </div>
          `;
        }
        return;
      }

      pmCardsGrid.innerHTML = '';
      filtered.forEach(mod => {
        const comp = MashimurelayModules.getModuleCompletion(mod);
        const card = document.createElement('div');
        card.className = `pm-card ${comp.completed ? 'is-completed' : ''}`;

        const badgeClass = !mod.isBuiltin
          ? 'is-guru'
          : (mod.track === 'otomotif' ? 'is-otomotif' : 'is-industri');
        const badgeText = !mod.isBuiltin
          ? (mod.track === 'industri' ? 'Modul Guru · Industri' : (mod.track === 'otomotif' ? 'Modul Guru · Otomotif' : 'Modul Guru'))
          : (mod.track === 'otomotif' ? 'Otomotif · TKR/TSM' : 'Industri · TITL');

        const kitCount = Array.isArray(mod.allowedComponents) ? mod.allowedComponents.length : 0;
        const progressLabel = comp.total > 0
          ? (comp.completed ? `Selesai (${comp.done}/${comp.total})` : `Ceklis ${comp.done}/${comp.total}`)
          : 'Siap Dipelajari';

        card.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 7px;">
            <div class="pm-card-top">
              <span class="pm-track-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
              <span class="pm-card-code">${escapeHtml(mod.code || 'MOD')}</span>
            </div>
            <div class="pm-card-title">${escapeHtml(mod.title)}</div>
            <div class="pm-card-summary">${escapeHtml(mod.summary || mod.theory || 'Panduan praktikum simulasi rangkaian.')}</div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div class="pm-card-meta">
              <span>${escapeHtml(mod.level || 'Mandiri')}</span>
              <span>·</span>
              <span>${escapeHtml(mod.duration || '45 Menit')}</span>
              ${kitCount > 0 ? `<span>·</span><span>Kit ${kitCount} komp.</span>` : ''}
            </div>
            <div class="pm-card-footer">
              <span class="pm-progress-chip ${comp.completed ? 'is-done' : ''}">${escapeHtml(progressLabel)}</span>
              <div class="pm-card-actions">
                ${!mod.isBuiltin ? `
                  <button type="button" class="pm-card-mini-btn btn-card-edit-mod" data-id="${escapeHtml(mod.id)}">Edit</button>
                  <button type="button" class="pm-card-mini-btn is-danger btn-card-del-mod" data-id="${escapeHtml(mod.id)}">Hapus</button>
                ` : `<span style="font-size: 11px; font-weight: 600; color: var(--accent-primary);">Buka &rarr;</span>`}
              </div>
            </div>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-card-edit-mod')) {
            e.stopPropagation();
            openCustomModuleEditorModal(mod);
            return;
          }
          if (e.target.closest('.btn-card-del-mod')) {
            e.stopPropagation();
            confirmDeleteCustomModule(mod);
            return;
          }
          openModuleDetail(mod.id);
        });

        pmCardsGrid.appendChild(card);
      });
    }

    function confirmDeleteCustomModule(mod) {
      if (!mod || mod.isBuiltin) return;
      const ok = window.confirm(`Hapus modul guru "${mod.title}" dari penyimpanan lokal perangkat ini?`);
      if (!ok) return;
      MashimurelayModules.deleteCustomModule(mod.id);
      selectedTeacherTaskModuleIds.delete(mod.id);
      updatePracticalModulesBadges();
      renderTeacherTaskModulesPicker();
      if (activeDetailModuleId === mod.id) {
        showListView();
      } else {
        renderModulesGrid();
      }
      showToast(`Modul "${mod.title}" telah dihapus dari perangkat.`, true);
    }

    function showListView() {
      activeDetailModuleId = null;
      if (pmDetailView) pmDetailView.style.display = 'none';
      if (pmListView) pmListView.style.display = 'flex';
      renderModulesGrid();
    }

    function openModuleDetail(moduleId) {
      const mod = MashimurelayModules.getModuleById(moduleId);
      if (!mod || !pmDetailContent) return;
      activeDetailModuleId = mod.id;

      if (pmListView) pmListView.style.display = 'none';
      if (pmDetailView) pmDetailView.style.display = 'flex';
      if (pmDetailOwnerActions) {
        pmDetailOwnerActions.style.display = mod.isBuiltin ? 'none' : 'flex';
      }

      const checkedSet = new Set(MashimurelayModules.getCheckedIndices(mod.id));
      const comp = MashimurelayModules.getModuleCompletion(mod);
      const badgeClass = !mod.isBuiltin
        ? 'is-guru'
        : (mod.track === 'otomotif' ? 'is-otomotif' : 'is-industri');
      const badgeText = !mod.isBuiltin
        ? 'Modul Mandiri Guru (Lokal)'
        : (mod.track === 'otomotif' ? 'Track Otomotif (TKR/TSM)' : 'Track Industri (TITL/IML)');

      const objectivesHtml = (mod.objectives && mod.objectives.length > 0)
        ? `<ol class="pm-list">${mod.objectives.map(o => `<li>${escapeHtml(o)}</li>`).join('')}</ol>`
        : '<div style="font-size: 12px; color: var(--text-muted);">Belum ada rincian tujuan pembelajaran.</div>';

      const k3Html = (mod.safetyK3 && mod.safetyK3.length > 0)
        ? `<ul class="pm-list">${mod.safetyK3.map(k => `<li>${escapeHtml(k)}</li>`).join('')}</ul>`
        : '<div style="font-size: 12px; color: var(--text-muted);">Periksa isolasi sumber daya dan polaritas sebelum simulasi.</div>';

      const pinTableHtml = (mod.pinTable && mod.pinTable.length > 0)
        ? `
          <table class="pm-pin-table">
            <thead><tr><th>Terminal / Kode</th><th>Fungsi &amp; Keterangan</th></tr></thead>
            <tbody>
              ${mod.pinTable.map(p => `<tr><td class="pm-pin-code">${escapeHtml(p.code)}</td><td>${escapeHtml(p.desc)}</td></tr>`).join('')}
            </tbody>
          </table>
        `
        : '';

      const bomHtml = (mod.allowedComponents && mod.allowedComponents.length > 0)
        ? `<div class="pm-bom-chips">${mod.allowedComponents.map(k => `<span class="pm-bom-chip">${escapeHtml(getComponentDisplayName(k))}</span>`).join('')}</div>`
        : '<div style="font-size: 12px; color: var(--text-muted);">Bebas menggunakan seluruh perpustakaan 117 komponen.</div>';

      const stepsHtml = (mod.steps && mod.steps.length > 0)
        ? `<ol class="pm-list">${mod.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`
        : '<div style="font-size: 12px; color: var(--text-muted);">Rangkai komponen sesuai petunjuk guru di kelas.</div>';

      const checksHtml = (mod.checks && mod.checks.length > 0)
        ? `<div class="pm-check-list" id="pmDetailCheckList">
            ${mod.checks.map((c, idx) => {
              const isChk = checkedSet.has(idx);
              return `
                <label class="pm-check-item ${isChk ? 'is-checked' : ''}" data-idx="${idx}">
                  <input type="checkbox" ${isChk ? 'checked' : ''} />
                  <span>${escapeHtml(c)}</span>
                </label>
              `;
            }).join('')}
          </div>`
        : '<div style="font-size: 12px; color: var(--text-muted);">Belum ada item ceklis pengujian.</div>';

      pmDetailContent.innerHTML = `
        <div class="pm-detail-hero">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="pm-track-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
              <span class="pm-card-code">${escapeHtml(mod.code || 'MOD')}</span>
              <span class="pm-pill-mini" id="pmDetailCompletionPill">${comp.total > 0 ? `${comp.done}/${comp.total} Ceklis (${comp.percent}%)` : 'Siap Praktik'}</span>
            </div>
            <span style="font-size: 11px; color: var(--text-muted);">
              ${escapeHtml(mod.subject || '')}${mod.author ? ` · ${escapeHtml(mod.author)}` : ''} · ${escapeHtml(mod.duration || '45 Menit')}
            </span>
          </div>
          <h4 class="pm-detail-title">${escapeHtml(mod.title)}</h4>
          <p class="pm-detail-sub">${escapeHtml(mod.summary || '')}</p>
        </div>

        <div class="pm-detail-grid">
          <div class="pm-section-box">
            <h5 class="pm-section-title">Tujuan Pembelajaran</h5>
            ${objectivesHtml}
          </div>
          <div class="pm-section-box is-k3">
            <h5 class="pm-section-title">Keselamatan Kerja (K3)</h5>
            ${k3Html}
          </div>
        </div>

        <div class="pm-section-box">
          <h5 class="pm-section-title">Ringkasan Teori &amp; Kode Terminal (IEC / DIN)</h5>
          <p class="pm-theory-text">${escapeHtml(mod.theory || 'Ikuti prinsip sambungan sesuai standar gambar teknik listrik.')}</p>
          ${pinTableHtml}
        </div>

        <div class="pm-section-box">
          <h5 class="pm-section-title">Daftar Komponen Praktikum (BOM — ${(mod.allowedComponents || []).length} Komponen)</h5>
          ${bomHtml}
        </div>

        <div class="pm-detail-grid">
          <div class="pm-section-box">
            <h5 class="pm-section-title">Langkah Wiring Bertahap</h5>
            ${stepsHtml}
          </div>
          <div class="pm-section-box">
            <h5 class="pm-section-title">Ceklis Pengujian Mandiri</h5>
            ${checksHtml}
          </div>
        </div>
      `;

      pmDetailContent.scrollTop = 0;

      // Bind interactive checklist
      const checkItems = pmDetailContent.querySelectorAll('.pm-check-item');
      checkItems.forEach(item => {
        const cb = item.querySelector('input[type="checkbox"]');
        const idx = parseInt(item.getAttribute('data-idx'), 10);
        if (cb && !isNaN(idx)) {
          cb.addEventListener('change', () => {
            MashimurelayModules.toggleCheck(mod.id, idx);
            item.classList.toggle('is-checked', cb.checked);
            const nextComp = MashimurelayModules.getModuleCompletion(mod);
            const pill = document.getElementById('pmDetailCompletionPill');
            if (pill) pill.textContent = `${nextComp.done}/${nextComp.total} Ceklis (${nextComp.percent}%)`;
            updatePracticalModulesBadges();
          });
        }
      });

      // Configure action buttons
      if (btnPmWatchVideo) {
        if (mod.videoId) {
          btnPmWatchVideo.style.display = 'inline-flex';
          if (btnPmWatchVideoLabel) btnPmWatchVideoLabel.textContent = VIDEO_LABELS[mod.videoId] || 'Tonton Video Simulasi';
        } else {
          btnPmWatchVideo.style.display = 'none';
        }
      }

      if (btnPmWatchVideoSecondary) {
        if (mod.secondaryVideoId) {
          btnPmWatchVideoSecondary.style.display = 'inline-flex';
          if (btnPmWatchVideoSecondaryLabel) btnPmWatchVideoSecondaryLabel.textContent = VIDEO_LABELS[mod.secondaryVideoId] || 'Video Tambahan';
        } else {
          btnPmWatchVideoSecondary.style.display = 'none';
        }
      }

      if (btnPmOpenExample) {
        btnPmOpenExample.style.display = (mod.exampleCircuit && Array.isArray(mod.exampleCircuit.data) && mod.exampleCircuit.data.length > 0)
          ? 'inline-flex'
          : 'none';
      }

      if (btnPmStartPracticeLabel) {
        const kitCnt = Array.isArray(mod.allowedComponents) ? mod.allowedComponents.length : 0;
        btnPmStartPracticeLabel.textContent = kitCnt > 0 ? `Mulai Latihan (+ Kit ${kitCnt} Komp.)` : 'Mulai Latihan di Kanvas Baru';
      }
    }

    function openPracticalModulesModal(initialTrack) {
      if (initialTrack) {
        activeTrackFilter = initialTrack;
        document.querySelectorAll('.pm-filter-tab').forEach(t => {
          t.classList.toggle('active', t.getAttribute('data-track') === activeTrackFilter);
        });
      }
      showListView();
      if (pmCardsGrid) pmCardsGrid.scrollTop = 0;
      showModal(modalPracticalModules);
    }

    // Custom Module Editor Kit Grid Renderer
    function renderCmeKitGrid(searchQuery = '') {
      if (!cmeKitGrid || typeof COMPONENTS_DATA === 'undefined') return;
      const q = (searchQuery || '').trim().toLowerCase();
      cmeKitGrid.innerHTML = '';

      const items = Object.keys(COMPONENTS_DATA)
        .map(key => ({ key, comp: COMPONENTS_DATA[key], name: COMPONENTS_DATA[key].name || key }))
        .filter(it => !q || it.name.toLowerCase().includes(q) || it.key.toLowerCase().includes(q));

      const gridEl = document.createElement('div');
      gridEl.className = 'kit-category-grid';

      items.forEach(it => {
        const isChecked = cmeSelectedComponents.has(it.key);
        const card = document.createElement('label');
        card.className = `kit-comp-tile ${isChecked ? 'is-selected' : ''}`;
        card.title = `${it.name} (${it.key})`;

        let iconHtml = '';
        if (it.comp && it.comp.graphics) {
          const vb = it.comp.viewBox || `0 0 ${it.comp.width || 120} ${it.comp.height || 120}`;
          iconHtml = `<svg viewBox="${vb}" class="kit-comp-svg" aria-hidden="true">${it.comp.graphics}</svg>`;
        } else {
          iconHtml = `<img src="assets/icons/${it.key}.svg" alt="" class="kit-comp-img" loading="lazy" onerror="this.style.display='none'" />`;
        }

        card.innerHTML = `
          <input type="checkbox" ${isChecked ? 'checked' : ''} />
          <div class="kit-comp-icon-box">${iconHtml}</div>
          <div class="kit-comp-info">
            <div class="kit-comp-name">${escapeHtml(it.name)}</div>
            <div class="kit-comp-sub"><span class="kit-comp-key-muted">${escapeHtml(it.key)}</span></div>
          </div>
        `;
        const chk = card.querySelector('input[type="checkbox"]');
        chk.addEventListener('change', (e) => {
          if (e.target.checked) {
            cmeSelectedComponents.add(it.key);
            card.classList.add('is-selected');
          } else {
            cmeSelectedComponents.delete(it.key);
            card.classList.remove('is-selected');
          }
          if (cmeKitCount) cmeKitCount.textContent = String(cmeSelectedComponents.size);
        });
        gridEl.appendChild(card);
      });

      if (items.length === 0) {
        cmeKitGrid.innerHTML = `<div style="text-align: center; padding: 18px; color: var(--text-muted); font-size: 12px;">Komponen tidak ditemukan.</div>`;
      } else {
        cmeKitGrid.appendChild(gridEl);
      }
      if (cmeKitCount) cmeKitCount.textContent = String(cmeSelectedComponents.size);
    }

    function openCustomModuleEditorModal(existingMod = null, prefill = null) {
      cmeExistingExampleCircuit = (existingMod && existingMod.exampleCircuit) ? existingMod.exampleCircuit : null;
      const isEdit = Boolean(existingMod && existingMod.id);

      if (customModuleEditorTitle) {
        customModuleEditorTitle.textContent = isEdit ? 'EDIT MODUL MANDIRI GURU' : 'BUAT MODUL MANDIRI GURU';
      }
      if (cmeModuleId) cmeModuleId.value = isEdit ? existingMod.id : '';
      if (cmeTitle) cmeTitle.value = isEdit ? (existingMod.title || '') : (prefill && prefill.title ? prefill.title : '');
      if (cmeTrack) cmeTrack.value = isEdit ? (existingMod.track || 'industri') : 'industri';
      if (cmeSubject) cmeSubject.value = isEdit ? (existingMod.subject || '') : (localStorage.getItem('mashimu_teacher_class') || '');
      if (cmeAuthor) cmeAuthor.value = isEdit ? (existingMod.author || '') : (localStorage.getItem('mashimu_teacher_school') || 'Guru Pengampu');
      if (cmeDuration) cmeDuration.value = isEdit ? (existingMod.duration || '45 Menit') : '45 Menit';
      if (cmeSummary) cmeSummary.value = isEdit ? (existingMod.summary || '') : '';
      if (cmeObjectives) cmeObjectives.value = isEdit ? (existingMod.objectives || []).join('\n') : '';
      if (cmeSafety) cmeSafety.value = isEdit ? (existingMod.safetyK3 || []).join('\n') : '';
      if (cmeTheory) cmeTheory.value = isEdit ? (existingMod.theory || '') : '';
      if (cmeSteps) cmeSteps.value = isEdit ? (existingMod.steps || []).join('\n') : '';
      if (cmeChecks) cmeChecks.value = isEdit ? (existingMod.checks || []).join('\n') : '';
      if (cmeAttachCurrentCircuit) cmeAttachCurrentCircuit.checked = false;

      if (isEdit && Array.isArray(existingMod.allowedComponents)) {
        cmeSelectedComponents = new Set(existingMod.allowedComponents);
      } else if (prefill && Array.isArray(prefill.allowedComponents)) {
        cmeSelectedComponents = new Set(prefill.allowedComponents);
      } else {
        cmeSelectedComponents = new Set();
      }

      if (cmeKitSearch) cmeKitSearch.value = '';
      renderCmeKitGrid('');
      showModal(modalCustomModuleEditor);
      setTimeout(() => { if (cmeTitle) cmeTitle.focus(); }, 100);
    }
    window.openCustomModuleEditorModal = openCustomModuleEditorModal;

    // Bind navigation & buttons
    if (drawerItemModules) {
      drawerItemModules.addEventListener('click', () => {
        closeNavDrawer();
        openPracticalModulesModal();
      });
    }

    if (btnDashOpenModules) {
      btnDashOpenModules.addEventListener('click', () => {
        closeDashboard();
        openPracticalModulesModal();
      });
    }

    if (btnClosePracticalModules) {
      btnClosePracticalModules.addEventListener('click', () => hideModal(modalPracticalModules));
    }

    if (btnPmBackToList) {
      btnPmBackToList.addEventListener('click', showListView);
    }

    if (btnOpenCustomModuleEditor) {
      btnOpenCustomModuleEditor.addEventListener('click', () => {
        cmeReturnToTaskSetup = false;
        openCustomModuleEditorModal(null);
      });
    }

    if (btnQuickCreateModuleFromTask) {
      btnQuickCreateModuleFromTask.addEventListener('click', () => {
        cmeReturnToTaskSetup = true;
        openCustomModuleEditorModal(null);
      });
    }

    if (btnPmEditCustom) {
      btnPmEditCustom.addEventListener('click', () => {
        const mod = MashimurelayModules.getModuleById(activeDetailModuleId);
        if (mod && !mod.isBuiltin) {
          cmeReturnToTaskSetup = false;
          openCustomModuleEditorModal(mod);
        }
      });
    }

    if (btnPmDeleteCustom) {
      btnPmDeleteCustom.addEventListener('click', () => {
        const mod = MashimurelayModules.getModuleById(activeDetailModuleId);
        if (mod && !mod.isBuiltin) confirmDeleteCustomModule(mod);
      });
    }

    if (btnPmWatchVideo) {
      btnPmWatchVideo.addEventListener('click', () => {
        const mod = MashimurelayModules.getModuleById(activeDetailModuleId);
        if (mod && mod.videoId) openVideoInInstructions(mod.videoId);
      });
    }

    if (btnPmWatchVideoSecondary) {
      btnPmWatchVideoSecondary.addEventListener('click', () => {
        const mod = MashimurelayModules.getModuleById(activeDetailModuleId);
        if (mod && mod.secondaryVideoId) openVideoInInstructions(mod.secondaryVideoId);
      });
    }

    if (btnPmOpenExample) {
      btnPmOpenExample.addEventListener('click', () => {
        const mod = MashimurelayModules.getModuleById(activeDetailModuleId);
        if (!mod || !mod.exampleCircuit) return;
        if (canvas && canvas.isSimulating && typeof canvas.stopSimulation === 'function') {
          canvas.stopSimulation();
        }
        const cloned = JSON.parse(JSON.stringify(mod.exampleCircuit));
        const projName = `Contoh: ${mod.title}`;
        if (projectManager) {
          projectManager.createNewProject(projName, cloned);
        } else if (canvas) {
          canvas.loadCircuit(cloned);
        }
        // Tampilkan penomoran pin terminal agar siswa langsung mempelajari kode terminal IEC / DIN
        if (svgEl) {
          svgEl.classList.remove('hide-terminal-labels');
        }
        if (settingTerminalLabelsCheckbox) {
          settingTerminalLabelsCheckbox.checked = true;
        }
        localStorage.setItem('mashimu_show_terminal_labels', 'true');
        hideModal(modalPracticalModules);
        closeDashboard();
        triggerCanvasFit();
        showToast(`Contoh rangkaian "${mod.title}" dimuat. Tekan RUN untuk simulasi!`, true);
      });
    }

    if (btnPmStartPractice) {
      btnPmStartPractice.addEventListener('click', () => {
        const mod = MashimurelayModules.getModuleById(activeDetailModuleId);
        if (!mod) return;
        if (canvas && canvas.isSimulating && typeof canvas.stopSimulation === 'function') {
          canvas.stopSimulation();
        }
        const allowed = Array.isArray(mod.allowedComponents) ? mod.allowedComponents : [];
        const blankCircuit = {
          header: {
            generator: 'Mashimurelay',
            version: '1.0',
            name: `Latihan: ${mod.title}`,
            created_at: new Date().toISOString()
          },
          data: []
        };
        if (allowed.length > 0) {
          blankCircuit.assignmentKit = {
            enabled: true,
            name: mod.title,
            allowedComponents: allowed.slice()
          };
        }
        if (projectManager) {
          projectManager.createNewProject(`Latihan: ${mod.title}`, blankCircuit);
        } else if (canvas) {
          canvas.loadCircuit(blankCircuit);
        }
        if (canvas && allowed.length > 0 && typeof canvas.setAssignmentKit === 'function') {
          canvas.setAssignmentKit({
            enabled: true,
            name: mod.title,
            allowedComponents: allowed.slice()
          });
        }
        hideModal(modalPracticalModules);
        closeDashboard();
        showToast(
          allowed.length > 0
            ? `Mode Latihan "${mod.title}" dimulai dengan Kit ${allowed.length} komponen!`
            : `Kanvas latihan "${mod.title}" siap digunakan!`,
          true
        );
      });
    }

    // Filter tabs & search
    document.querySelectorAll('.pm-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.pm-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeTrackFilter = tab.getAttribute('data-track') || 'all';
        renderModulesGrid();
      });
    });

    if (pmSearchInput) {
      pmSearchInput.addEventListener('input', (e) => {
        activeSearchQuery = e.target.value || '';
        renderModulesGrid();
      });
    }

    // Editor controls
    if (btnCloseCustomModuleEditor) {
      btnCloseCustomModuleEditor.addEventListener('click', () => hideModal(modalCustomModuleEditor));
    }
    if (btnCancelCustomModuleEditor) {
      btnCancelCustomModuleEditor.addEventListener('click', () => hideModal(modalCustomModuleEditor));
    }
    if (cmeKitSearch) {
      cmeKitSearch.addEventListener('input', (e) => renderCmeKitGrid(e.target.value));
    }
    if (btnCmeCopyActiveKit) {
      btnCmeCopyActiveKit.addEventListener('click', () => {
        const curKit = (canvas && canvas.circuit && canvas.circuit.assignmentKit && Array.isArray(canvas.circuit.assignmentKit.allowedComponents))
          ? canvas.circuit.assignmentKit.allowedComponents
          : [];
        if (curKit.length === 0) {
          showToast('Belum ada Kit Praktikum aktif pada kanvas saat ini.', false);
          return;
        }
        cmeSelectedComponents = new Set(curKit);
        renderCmeKitGrid(cmeKitSearch ? cmeKitSearch.value : '');
        showToast(`${curKit.length} komponen diambil dari Kit Aktif!`, true);
      });
    }
    if (btnCmeClearKit) {
      btnCmeClearKit.addEventListener('click', () => {
        cmeSelectedComponents.clear();
        renderCmeKitGrid(cmeKitSearch ? cmeKitSearch.value : '');
      });
    }

    if (btnSaveCustomModule) {
      btnSaveCustomModule.addEventListener('click', () => {
        const title = cmeTitle ? cmeTitle.value.trim() : '';
        if (!title) {
          showToast('Judul Modul Praktikum wajib diisi.', false);
          if (cmeTitle) cmeTitle.focus();
          return;
        }

        const splitLines = (el) => (el && el.value ? el.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : []);
        const modPayload = {
          id: (cmeModuleId && cmeModuleId.value.trim()) ? cmeModuleId.value.trim() : undefined,
          title: title,
          track: cmeTrack ? cmeTrack.value : 'industri',
          subject: cmeSubject ? cmeSubject.value.trim() : 'Modul Mandiri Guru',
          author: cmeAuthor ? cmeAuthor.value.trim() : 'Guru Pengampu',
          duration: cmeDuration ? (cmeDuration.value.trim() || '45 Menit') : '45 Menit',
          summary: cmeSummary ? cmeSummary.value.trim() : '',
          objectives: splitLines(cmeObjectives),
          safetyK3: splitLines(cmeSafety),
          theory: cmeTheory ? cmeTheory.value.trim() : '',
          steps: splitLines(cmeSteps),
          checks: splitLines(cmeChecks),
          allowedComponents: Array.from(cmeSelectedComponents)
        };

        if (cmeAttachCurrentCircuit && cmeAttachCurrentCircuit.checked && canvas && typeof canvas.getCircuitJson === 'function') {
          const curJson = canvas.getCircuitJson();
          if (curJson && Array.isArray(curJson.data) && curJson.data.length > 0) {
            modPayload.exampleCircuit = JSON.parse(JSON.stringify(curJson));
          }
        } else if (cmeExistingExampleCircuit) {
          modPayload.exampleCircuit = cmeExistingExampleCircuit;
        }

        const saved = MashimurelayModules.saveCustomModule(modPayload);
        if (!saved) {
          showToast('Gagal menyimpan modul mandiri.', false);
          return;
        }

        hideModal(modalCustomModuleEditor);
        updatePracticalModulesBadges();

        if (cmeReturnToTaskSetup) {
          selectedTeacherTaskModuleIds.add(saved.id);
          renderTeacherTaskModulesPicker();
          cmeReturnToTaskSetup = false;
        } else {
          if (modalPracticalModules && modalPracticalModules.style.display !== 'none') {
            if (activeDetailModuleId === saved.id) {
              openModuleDetail(saved.id);
            } else {
              activeTrackFilter = 'guru';
              document.querySelectorAll('.pm-filter-tab').forEach(t => {
                t.classList.toggle('active', t.getAttribute('data-track') === 'guru');
              });
              showListView();
            }
          } else {
            openPracticalModulesModal('guru');
          }
        }

        showToast(`Modul Mandiri "${saved.title}" berhasil disimpan!`, true);
      });
    }

    updatePracticalModulesBadges();
  })();

  // =========================================================================
  // Security Guard (Anti-DevTools, Anti-Ctrl+U, Anti-Native Context Menu)
  // Safely protects simulation logic while keeping form inputs 100% functional
  // =========================================================================
  (function initSecurityGuard() {
    // 1. Prevent default native context menu everywhere on the document
    // (The canvas triggers its own custom pop-up properties menu in normal edit mode)
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    }, { capture: true });

    // 2. Prevent DevTools shortcuts and View Page Source, while leaving form inputs completely unaffected
    window.addEventListener('keydown', (e) => {
      const target = e.target;
      const isEditable = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      const key = e.key ? e.key.toUpperCase() : '';
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // F12 key (DevTools)
      const isF12 = e.key === 'F12' || e.keyCode === 123;
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools Inspect / Console / Element)
      const isDevToolsCombo = ctrlOrCmd && shift && (key === 'I' || key === 'J' || key === 'C');
      // Ctrl+U (View Page Source)
      const isViewSource = ctrlOrCmd && !shift && key === 'U';

      if (isF12 || isDevToolsCombo || isViewSource) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // If user is inside an input or textarea, let normal typing pass through
      if (isEditable) {
        return;
      }
    }, { capture: true });
  })();

  // Global safety cleanup for palette dragging
  window.addEventListener('dragend', () => {
    document.body.classList.remove('is-palette-dragging');
    const container = document.querySelector('.canvas-container');
    if (container) container.classList.remove('canvas-drag-hover');
    document.querySelectorAll('.component-card.is-dragging').forEach(c => c.classList.remove('is-dragging'));
  });
});
