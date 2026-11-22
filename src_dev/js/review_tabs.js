/**
 * Mashimurelay Excel-Style Sheet Tabs & Review Session Manager
 * Ephemeral In-App Sheet Tabs, View-Only Canvas Lock, Student Hotspot Queue Navigation
 */

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}

class ReviewTabManager {
  constructor(canvas, projectManager, options = {}) {
    this.canvas = canvas;
    this.projectManager = projectManager;
    this.options = options;

    this.tabs = [
      {
        id: 'workspace',
        type: 'workspace',
        title: 'Workspace Utama',
        circuit: null
      }
    ];
    this.activeTabId = 'workspace';
    this.workspaceStash = null;

    this.hotspotQueue = [];
    this.currentQueueIdx = -1;
    this.savedTeacherLayout = null;

    // Cache DOM Elements
    this.sheetBar = document.getElementById('excelSheetBar');
    this.sheetTabWorkspace = document.getElementById('sheetTabWorkspace');
    this.sheetTabWorkspaceName = document.getElementById('sheetTabWorkspaceName');
    this.studentSheetTabsContainer = document.getElementById('studentSheetTabsContainer');
    this.reviewNavControls = document.getElementById('reviewNavControls');
    this.workspaceNormalControls = document.getElementById('workspaceNormalControls');
    this.reviewQueueCounter = document.getElementById('reviewQueueCounter');
    this.btnPrev = document.getElementById('btnPrevStudentSheet');
    this.btnNext = document.getElementById('btnNextStudentSheet');
    this.btnExitReview = document.getElementById('btnExitReviewMode');
    this.reviewModeBanner = document.getElementById('reviewModeBanner');
    this.reviewBannerTitle = document.getElementById('reviewBannerStudentName') || document.getElementById('reviewBannerTitle');
    this.btnBannerExitReview = document.getElementById('btnExitReviewBanner') || document.getElementById('btnBannerExitReview');
    this.btnOpenShortcutsModal = document.getElementById('btnOpenShortcutsModal');

    this.initListeners();
    this.renderTabs();
  }

  initListeners() {
    if (this.sheetTabWorkspace) {
      this.sheetTabWorkspace.addEventListener('click', () => {
        this.switchToTab('workspace');
      });
    }

    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => {
        this.prevStudent();
      });
    }

    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => {
        this.nextStudent();
      });
    }

    if (this.btnExitReview) {
      this.btnExitReview.addEventListener('click', () => {
        this.exitReviewMode();
      });
    }

    if (this.btnBannerExitReview) {
      this.btnBannerExitReview.addEventListener('click', () => {
        this.closeTab(this.activeTabId);
      });
    }

    if (this.btnOpenShortcutsModal) {
      this.btnOpenShortcutsModal.addEventListener('click', () => {
        this.openShortcutsInstruction();
      });
    }
  }

  updateWorkspaceName(name) {
    if (this.sheetTabWorkspaceName && name) {
      this.sheetTabWorkspaceName.textContent = name;
    }
  }

  resetSimulationAndAlerts() {
    if (this.canvas) {
      if (typeof this.canvas.stopSimulation === 'function') {
        this.canvas.stopSimulation();
      }
      this.canvas.isSimulating = false;
      this.canvas.simResult = null;
      if (this.canvas.engine && typeof this.canvas.engine.reset === 'function') {
        this.canvas.engine.reset(false);
      }
      if (this.canvas.options) {
        if (typeof this.canvas.options.onShortCircuit === 'function') {
          this.canvas.options.onShortCircuit(false, null);
        }
        if (typeof this.canvas.options.onFuseBlown === 'function') {
          this.canvas.options.onFuseBlown(false, []);
        }
        if (typeof this.canvas.options.onSimulationStateChange === 'function') {
          this.canvas.options.onSimulationStateChange('STOPPED');
        }
      }
    }

    const statusBadgeEl = document.getElementById('statusBadge');
    if (statusBadgeEl) {
      statusBadgeEl.className = 'status-badge status-stopped';
      statusBadgeEl.textContent = 'STOPPED';
    }
    const alertBannerEl = document.getElementById('alertBanner');
    if (alertBannerEl) {
      alertBannerEl.style.display = 'none';
      alertBannerEl.classList.remove('pill-active', 'alert-fuse-blown');
    }
    const btnRunEl = document.getElementById('btnRun');
    const btnStopEl = document.getElementById('btnStop');
    if (btnRunEl) btnRunEl.style.display = 'inline-flex';
    if (btnStopEl) btnStopEl.style.display = 'none';
  }

  openReviewTab(sub, queueIdx = -1, allSubmissions = null) {
    if (!sub) return;

    // Save teacher's current circuit to memory before viewing student task
    if (this.activeTabId === 'workspace' && this.canvas) {
      this.resetSimulationAndAlerts();
      this.workspaceStash = this.canvas.getCircuitJson();
      if (this.projectManager) {
        this.projectManager.autoSaveCurrent();
      }

      // Snapshot teacher's panel layout so we can faithfully restore it upon return
      const sidebarEl = document.querySelector('.sidebar');
      const inspectorEl = document.querySelector('.inspector');
      this.savedTeacherLayout = {
        sidebarCollapsed: sidebarEl ? sidebarEl.classList.contains('is-collapsed') : false,
        inspectorCollapsed: inspectorEl ? inspectorEl.classList.contains('is-collapsed') : true
      };
    }

    if (allSubmissions && Array.isArray(allSubmissions)) {
      this.hotspotQueue = allSubmissions;
      this.currentQueueIdx = queueIdx >= 0 ? queueIdx : 0;
    } else if (queueIdx >= 0) {
      this.currentQueueIdx = queueIdx;
    }

    // Parse circuit payload safely
    let circuitData = null;
    try {
      if (typeof sub.content === 'object' && sub.content !== null) {
        circuitData = sub.content;
      } else if (typeof sub.content === 'string') {
        const trimmed = sub.content.trim();
        if (trimmed.startsWith('{')) {
          circuitData = JSON.parse(trimmed);
        } else if (typeof parseLegacyCircuitTxt === 'function') {
          circuitData = parseLegacyCircuitTxt(trimmed);
        }
      }
    } catch (e) {
      if (typeof parseLegacyCircuitTxt === 'function' && typeof sub.content === 'string') {
        try {
          circuitData = parseLegacyCircuitTxt(sub.content);
        } catch (ex) {
          console.error('Failed to parse student circuit:', ex);
        }
      }
    }

    if (!circuitData || !Array.isArray(circuitData.data)) {
      if (typeof showToast === 'function') {
        showToast('Gagal memuat tugas siswa: Format berkas sirkuit tidak valid.');
      }
      return;
    }

    // Two-way normalization for student circuit data (Android elem1Id/node1Idx <-> Web idElementNode1/idNode1)
    for (const item of circuitData.data) {
      if (item.type === 'ElectricalElement' || (!item.type && item.svgData)) {
        if (!item.type) item.type = 'ElectricalElement';
        if (!item.position && item.x !== undefined && item.y !== undefined) {
          item.position = { x: parseFloat(item.x) || 0, y: parseFloat(item.y) || 0 };
        }
      } else if (item.type === 'Connector' || item.type === 'wire' || item.elem1Id !== undefined || (item.idElementNode1 !== undefined && item.idElementNode2 !== undefined)) {
        item.type = 'Connector';
        if (item.idElementNode1 === undefined && item.elem1Id !== undefined) item.idElementNode1 = item.elem1Id;
        if (item.idElementNode2 === undefined && item.elem2Id !== undefined) item.idElementNode2 = item.elem2Id;
        if (item.idNode1 === undefined && item.node1Idx !== undefined) item.idNode1 = item.node1Idx;
        if (item.idNode2 === undefined && item.node2Idx !== undefined) item.idNode2 = item.node2Idx;

        if (item.idElementNode1 !== undefined) item.idElementNode1 = parseInt(item.idElementNode1, 10);
        if (item.idElementNode2 !== undefined) item.idElementNode2 = parseInt(item.idElementNode2, 10);
        if (item.idNode1 !== undefined) item.idNode1 = parseInt(item.idNode1, 10);
        if (item.idNode2 !== undefined) item.idNode2 = parseInt(item.idNode2, 10);

        if (!item.margins) {
          item.margins = {
            start: parseFloat(item.mStart || 0) || 0,
            center: parseFloat(item.mCenter || item.customMidPos || 0) || 0,
            end: parseFloat(item.mEnd || 0) || 0
          };
        }
      }
    }

    const presensi = (sub.presensi_no !== undefined && sub.presensi_no !== null && sub.presensi_no !== '') 
      ? `[${sub.presensi_no}] ` 
      : '';
    const studentName = sub.student_name || 'Siswa';
    const tabTitle = `${presensi}${studentName}`;
    const tabId = 'student_' + (sub.presensi_no ? sub.presensi_no : ('idx_' + this.currentQueueIdx));

    // Check if tab already exists
    let existing = this.tabs.find(t => t.id === tabId);
    if (existing) {
      existing.circuit = circuitData;
      existing.queueIdx = this.currentQueueIdx;
      existing.title = tabTitle;
      existing.studentName = studentName;
      existing.className = sub.class_name || '';
    } else {
      const newTab = {
        id: tabId,
        type: 'student',
        title: tabTitle,
        studentName: studentName,
        presensi: sub.presensi_no || '',
        className: sub.class_name || '',
        circuit: circuitData,
        queueIdx: this.currentQueueIdx
      };
      this.tabs.push(newTab);
    }

    this.switchToTab(tabId);
  }

  switchToTab(tabId) {
    const target = this.tabs.find(t => t.id === tabId);
    if (!target) return;

    this.activeTabId = tabId;
    const modalHotspot = document.getElementById('modalClassroomHotspot');

    // Cleanly stop simulation and clear any short-circuit/overheat/fuse alert from previous tab
    this.resetSimulationAndAlerts();

    if (target.type === 'workspace') {
      // Restore Teacher Workspace Mode
      if (this.canvas) {
        this.canvas.isReviewMode = false;
        if (this.workspaceStash) {
          this.canvas.loadCircuit(this.workspaceStash);
        } else if (this.projectManager) {
          const activeProj = this.projectManager.getActiveProject();
          if (activeProj && activeProj.circuit) {
            this.canvas.loadCircuit(activeProj.circuit);
          }
        }
      }
      this.resetSimulationAndAlerts();

      document.body.classList.remove('review-mode-active');
      if (this.reviewModeBanner) {
        this.reviewModeBanner.style.display = 'none';
      }
      if (this.reviewNavControls) {
        this.reviewNavControls.style.display = 'none';
      }
      if (this.workspaceNormalControls) {
        this.workspaceNormalControls.style.display = 'flex';
      }

      // Restore Teacher's Panels, Pull-Tabs, and Header Toggles
      const sidebarEl = document.querySelector('.sidebar');
      const inspectorEl = document.querySelector('.inspector');
      const btnFloatingOpenPalette = document.getElementById('btnFloatingOpenPalette');
      const btnFloatingOpenInspector = document.getElementById('btnFloatingOpenInspector');
      const btnTogglePalette = document.getElementById('btnTogglePalette');
      const btnToggleInspector = document.getElementById('btnToggleInspector');

      const sideCollapsed = this.savedTeacherLayout ? this.savedTeacherLayout.sidebarCollapsed : false;
      const inspCollapsed = this.savedTeacherLayout ? this.savedTeacherLayout.inspectorCollapsed : true;

      if (sidebarEl) {
        sidebarEl.classList.toggle('is-collapsed', sideCollapsed);
        sidebarEl.classList.toggle('collapsed', sideCollapsed);
        sidebarEl.setAttribute('aria-hidden', String(sideCollapsed));
      }
      if (btnFloatingOpenPalette) {
        btnFloatingOpenPalette.classList.toggle('is-hidden', !sideCollapsed);
      }
      if (btnTogglePalette) {
        btnTogglePalette.classList.toggle('is-inactive', sideCollapsed);
        btnTogglePalette.setAttribute('aria-expanded', String(!sideCollapsed));
      }

      if (inspectorEl) {
        inspectorEl.classList.toggle('is-collapsed', inspCollapsed);
        inspectorEl.classList.toggle('collapsed', inspCollapsed);
        inspectorEl.setAttribute('aria-hidden', String(inspCollapsed));
      }
      if (btnFloatingOpenInspector) {
        btnFloatingOpenInspector.classList.toggle('is-hidden', !inspCollapsed);
      }
      if (btnToggleInspector) {
        btnToggleInspector.classList.toggle('is-inactive', inspCollapsed);
        btnToggleInspector.setAttribute('aria-expanded', String(!inspCollapsed));
      }

      // Jika sesi kelas Hotspot masih aktif, tampilkan kembali modal di Workspace Utama
      if (window.classroomHotspotSessionActive && modalHotspot) {
        modalHotspot.style.display = 'flex';
        modalHotspot.classList.remove('classroom-hotspot-docked', 'is-minimized');
      }

      if (typeof showToast === 'function') {
        showToast('Kembali ke lembar kerja Workspace Guru.');
      }
    } else {
      // Enter Student Review Mode (View-Only & Interactive Simulation)
      document.body.classList.add('review-mode-active');
      if (this.canvas) {
        this.canvas.isReviewMode = true;
        this.canvas.loadCircuit(target.circuit);
        if (typeof this.canvas.zoomToFit === 'function') {
          this.canvas.zoomToFit();
        }
      }
      this.resetSimulationAndAlerts();

      // Pastikan modal Hotspot Guru tersembunyi di tab siswa (tidak melayang / docked di tab siswa)
      if (modalHotspot) {
        modalHotspot.style.display = 'none';
        modalHotspot.classList.remove('classroom-hotspot-docked', 'is-minimized');
      }

      // Automatically collapse palette and inspector sidebars to maximize view
      document.body.classList.remove('palette-open', 'inspector-open', 'drawer-open');
      const sidebarEl = document.querySelector('.sidebar');
      const inspectorEl = document.querySelector('.inspector');
      if (sidebarEl) sidebarEl.classList.add('collapsed', 'is-collapsed');
      if (inspectorEl) inspectorEl.classList.add('collapsed', 'is-collapsed');

      const btnFloatingOpenPalette = document.getElementById('btnFloatingOpenPalette');
      const btnFloatingOpenInspector = document.getElementById('btnFloatingOpenInspector');
      if (btnFloatingOpenPalette) btnFloatingOpenPalette.classList.add('is-hidden');
      if (btnFloatingOpenInspector) btnFloatingOpenInspector.classList.add('is-hidden');

      if (window.mashimuPanelControl) {
        try {
          window.mashimuPanelControl('collapse-palette');
          window.mashimuPanelControl('collapse-inspector');
        } catch (_) {}
      }
      setTimeout(() => {
        const toastEl = document.getElementById('toastNotification');
        if (toastEl) toastEl.classList.remove('toast-show');
      }, 150);

      // Show floating review banner on canvas
      if (this.reviewModeBanner) {
        this.reviewModeBanner.style.display = 'flex';
        if (this.reviewBannerTitle) {
          const classInfo = target.className ? ` (${target.className})` : '';
          this.reviewBannerTitle.textContent = `${target.title}${classInfo}`;
        }
      }

      if (this.reviewNavControls) {
        this.reviewNavControls.style.display = 'flex';
      }
      if (this.workspaceNormalControls) {
        this.workspaceNormalControls.style.display = 'none';
      }

      // Update queue counter & button states
      if (this.currentQueueIdx >= 0 && this.hotspotQueue.length > 0) {
        if (this.reviewQueueCounter) {
          this.reviewQueueCounter.textContent = `${this.currentQueueIdx + 1} / ${this.hotspotQueue.length}`;
        }
        if (this.btnPrev) {
          this.btnPrev.disabled = (this.currentQueueIdx <= 0);
        }
        if (this.btnNext) {
          this.btnNext.disabled = (this.currentQueueIdx >= this.hotspotQueue.length - 1);
        }
      }

      if (typeof showToast === 'function') {
        showToast(`Memeriksa tugas: ${target.title} (Mode Koreksi - Terkunci)`);
      }
    }

    this.renderTabs();
  }

  closeTab(tabId, e) {
    if (e) e.stopPropagation();
    if (tabId === 'workspace') return; // Cannot close workspace

    const idx = this.tabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;

    this.tabs.splice(idx, 1);

    // If the closed tab was active, switch to adjacent student tab or workspace
    if (this.activeTabId === tabId) {
      if (this.tabs.length > 1) {
        const nextTarget = this.tabs[Math.max(1, idx - 1)];
        this.switchToTab(nextTarget.id);
      } else {
        this.switchToTab('workspace');
      }
    } else {
      this.renderTabs();
    }

    // If all student tabs are closed, exit review completely
    if (this.tabs.length <= 1) {
      this.exitReviewMode();
    }
  }

  exitReviewMode() {
    this.tabs = [this.tabs[0]]; // Retain workspace tab only
    this.hotspotQueue = [];
    this.currentQueueIdx = -1;
    this.switchToTab('workspace');
  }

  prevStudent() {
    if (this.currentQueueIdx > 0 && this.hotspotQueue.length > 0) {
      this.currentQueueIdx--;
      const prevSub = this.hotspotQueue[this.currentQueueIdx];
      this.openReviewTab(prevSub, this.currentQueueIdx);
    }
  }

  nextStudent() {
    if (this.currentQueueIdx < this.hotspotQueue.length - 1 && this.hotspotQueue.length > 0) {
      this.currentQueueIdx++;
      const nextSub = this.hotspotQueue[this.currentQueueIdx];
      this.openReviewTab(nextSub, this.currentQueueIdx);
    }
  }

  openShortcutsInstruction() {
    const modalInstructions = document.getElementById('modalInstructions');
    if (!modalInstructions) return;

    if (typeof showModal === 'function') {
      showModal(modalInstructions);
    } else {
      modalInstructions.style.display = 'flex';
    }

    // Switch to tabShortcuts
    const tabs = modalInstructions.querySelectorAll('.inst-tab');
    const sections = modalInstructions.querySelectorAll('.inst-section');
    tabs.forEach(t => t.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));

    const shortcutTabBtn = modalInstructions.querySelector('.inst-tab[data-tab="tabShortcuts"]');
    const shortcutSection = document.getElementById('tabShortcuts');
    if (shortcutTabBtn) shortcutTabBtn.classList.add('active');
    if (shortcutSection) shortcutSection.classList.add('active');
  }

  renderTabs() {
    if (!this.sheetTabWorkspace) return;

    // Update Workspace Tab
    if (this.activeTabId === 'workspace') {
      this.sheetTabWorkspace.classList.add('active');
    } else {
      this.sheetTabWorkspace.classList.remove('active');
    }

    // Render Student Tabs
    if (this.studentSheetTabsContainer) {
      const studentTabs = this.tabs.filter(t => t.type === 'student');
      this.studentSheetTabsContainer.innerHTML = studentTabs.map(tab => {
        const isActive = tab.id === this.activeTabId;
        return `
          <div class="excel-sheet-tab student-sheet-tab ${isActive ? 'active' : ''}" data-tab-id="${tab.id}" title="${escapeHtml(tab.title)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
            <span class="sheet-tab-name">${escapeHtml(tab.title)}</span>
            <span class="sheet-tab-close" data-close-id="${tab.id}" title="Tutup lembar kerja siswa">&times;</span>
          </div>
        `;
      }).join('');

      // Add click listeners to student tabs
      this.studentSheetTabsContainer.querySelectorAll('.student-sheet-tab').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.classList.contains('sheet-tab-close')) return;
          const tabId = el.getAttribute('data-tab-id');
          this.switchToTab(tabId);
        });
      });

      // Add click listeners to close buttons
      this.studentSheetTabsContainer.querySelectorAll('.sheet-tab-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const tabId = btn.getAttribute('data-close-id');
          this.closeTab(tabId, e);
        });
      });
    }
  }
}

window.ReviewTabManager = ReviewTabManager;
