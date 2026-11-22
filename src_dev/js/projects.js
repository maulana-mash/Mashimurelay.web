/**
 * Mashimurelay Project & Multi-Canvas Manager
 * LocalStorage persistence, multi-canvas creation, templates, and dashboard orchestration
 */

const STORAGE_KEY_PROJECTS = 'mashimurelay_projects_v2';
const STORAGE_KEY_ACTIVE_ID = 'mashimurelay_active_project_id_v2';

class MashimurelayProjectManager {
  constructor(canvasInstance, onProjectLoaded) {
    this.canvas = canvasInstance;
    this.onProjectLoaded = onProjectLoaded;
    this.projects = [];
    this.activeProjectId = null;

    this.init();
  }

  init() {
    // Aggressively clean up legacy storage keys completely so old workspace projects are purged
    try {
      localStorage.removeItem('mashimurelay_projects_v1');
      localStorage.removeItem('mashimurelay_active_project_id_v1');
      localStorage.removeItem('mashimurelay_projects');
      localStorage.removeItem('mashimurelay_projects_v1');
      localStorage.removeItem('mashimurelay_active_project_id_v1');
    } catch (e) {
      console.warn('Storage purge warning:', e);
    }

    this.loadFromStorage();

    // Filter out any legacy or corrupted projects from earlier versions
    const legacyPatterns = [
      /dol\s*starter/i,
      /lampu\s*sign/i,
      /hazard/i,
      /motor\s*starter/i,
      /rangakaian_sederhana__demo__\d+/i
    ];
    this.projects = this.projects.filter(p => {
      if (!p || !p.name) return false;
      return !legacyPatterns.some(pattern => pattern.test(p.name));
    });

    if (this.projects.length === 0) {
      this.initDefaultProjects();
    }

    const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    const existing = this.projects.find(p => p.id === savedActiveId);
    if (existing) {
      this.activeProjectId = existing.id;
    } else {
      this.activeProjectId = this.projects[0].id;
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, this.activeProjectId);
    }
  }

  initDefaultProjects() {
    const defaultList = [];

    // Base Template 1: Rangkaian Sederhana (Demo)
    if (typeof CIRCUIT_EXAMPLES !== 'undefined' && CIRCUIT_EXAMPLES.rangkaian_sederhana) {
      defaultList.push({
        id: 'proj_demo_sederhana',
        name: 'Rangkaian Sederhana (Demo)',
        description: 'Sirkuit demonstrasi dasar Mashimurelay dengan beban lampu seri, lampu berkedip, kontaktor relay, bel listrik, sirine, buzzer, dan saklar kontrol.',
        circuit: JSON.parse(JSON.stringify(CIRCUIT_EXAMPLES.rangkaian_sederhana.circuit)),
        updatedAt: new Date().toISOString(),
        itemCount: CIRCUIT_EXAMPLES.rangkaian_sederhana.circuit.data.length,
        isTemplate: true
      });
    }

    // Base Template 2: Blank Canvas
    defaultList.push({
      id: 'proj_blank_canvas',
      name: 'Canvas Baru (Lembar Kosong)',
      description: 'Lembar kerja sirkuit baru yang bersih siap untuk merancang.',
      circuit: {
        header: { generator: 'Mashimurelay', '3.0.0.30': '1.0', created_at: new Date().toISOString() },
        data: []
      },
      updatedAt: new Date().toISOString(),
      itemCount: 0,
      isTemplate: false
    });

    this.projects = defaultList;
    this.saveToStorage();
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (raw) {
        this.projects = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load projects from storage:', e);
      this.projects = [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(this.projects));
    } catch (e) {
      console.warn('Failed to save projects to storage:', e);
    }
  }

  getActiveProject() {
    return this.projects.find(p => p.id === this.activeProjectId) || this.projects[0];
  }

  // Auto-save current canvas state into active project
  autoSaveCurrent(force = false) {
    if (!this.canvas || !this.activeProjectId) return;
    if (this.canvas.isReviewMode) return; // Strict guard: never auto-save student review tabs
    const isAutoSaveOn = localStorage.getItem('mashimurelay_autosave_enabled') !== 'false';
    if (!isAutoSaveOn && !force) return;

    const proj = this.projects.find(p => p.id === this.activeProjectId);
    if (!proj) return;

    proj.circuit = this.canvas.getCircuitJson();
    proj.itemCount = (proj.circuit && proj.circuit.data) ? proj.circuit.data.length : 0;
    proj.updatedAt = new Date().toISOString();
    this.saveToStorage();
  }

  // Save specific project into internal storage
  saveProject(projectId, circuitData = null) {
    if (this.canvas && this.canvas.isReviewMode) return false;
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) return false;
    if (circuitData) {
      proj.circuit = circuitData;
    } else if (proj.id === this.activeProjectId && this.canvas) {
      proj.circuit = this.canvas.getCircuitJson();
    }
    proj.itemCount = (proj.circuit && proj.circuit.data) ? proj.circuit.data.length : 0;
    proj.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return true;
  }

  // Load a specific project into canvas
  openProject(projectId) {
    if (this.canvas && this.canvas.isReviewMode && window.reviewTabManager) {
      window.reviewTabManager.exitReviewMode();
    }
    // Save current active project first
    this.autoSaveCurrent();

    const target = this.projects.find(p => p.id === projectId);
    if (!target) return false;

    this.activeProjectId = target.id;
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, target.id);

    this.canvas.loadCircuit(target.circuit);
    if (this.onProjectLoaded) {
      this.onProjectLoaded(target);
    }
    return true;
  }

  // Create a brand new project canvas
  createNewProject(name = null, initialCircuit = null) {
    this.autoSaveCurrent();

    const timestamp = Date.now();
    const projName = (name && name.trim()) ? name.trim() : `Sirkuit Baru #${this.projects.length + 1}`;
    const circuit = initialCircuit ? JSON.parse(JSON.stringify(initialCircuit)) : {
      header: { generator: 'Mashimurelay', '3.0.0.30': '1.0', created_at: new Date().toISOString() },
      data: []
    };

    const newProject = {
      id: 'proj_' + timestamp,
      name: projName,
      description: initialCircuit ? 'Sirkuit yang diimpor/dibuat' : 'Canvas lembar kerja baru',
      circuit: circuit,
      updatedAt: new Date().toISOString(),
      itemCount: circuit.data ? circuit.data.length : 0,
      isTemplate: false
    };

    this.projects.unshift(newProject);
    this.saveToStorage();
    this.openProject(newProject.id);
    return newProject;
  }

  // Duplicate an existing project
  duplicateProject(projectId) {
    const src = this.projects.find(p => p.id === projectId);
    if (!src) return null;

    const copy = {
      id: 'proj_' + Date.now(),
      name: `${src.name} (Salinan)`,
      description: src.description,
      circuit: JSON.parse(JSON.stringify(src.circuit)),
      updatedAt: new Date().toISOString(),
      itemCount: src.itemCount,
      isTemplate: false
    };

    this.projects.unshift(copy);
    this.saveToStorage();
    return copy;
  }

  // Rename a project
  renameProject(projectId, newName) {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj || !newName || !newName.trim()) return false;
    proj.name = newName.trim();
    proj.updatedAt = new Date().toISOString();
    this.saveToStorage();
    return true;
  }

  // Delete a project
  deleteProject(projectId) {
    if (this.projects.length <= 1) {
      alert('Tidak dapat menghapus canvas terakhir. Minimal harus ada 1 sirkuit.');
      return false;
    }

    const idx = this.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return false;

    this.projects.splice(idx, 1);
    this.saveToStorage();

    // If deleted project was active, switch to first available
    if (this.activeProjectId === projectId) {
      this.openProject(this.projects[0].id);
    }
    return true;
  }

  // Helper to get clean, filesystem-safe filename matching canvas/project name
  getSafeProjectFileName(proj, customFileName = null) {
    let rawName = (customFileName && customFileName.trim())
      ? customFileName.trim()
      : ((proj && proj.name && proj.name.trim()) ? proj.name.trim() : 'Rangkaian Sederhana (Demo)');

    // 1. Strip redundant extensions at the end (.smrl, .txt, .json)
    rawName = rawName.replace(/(\.smrl|\.txt|\.json)+$/gi, '').trim();

    // 2. Remove OS-forbidden characters: \ / : * ? " < > | and ASCII control characters (0x00-0x1F, 0x80-0x9F)
    let safeName = rawName.replace(/[\\/:*?"<>|\x00-\x1F\x80-\x9F]/g, '');

    // 3. Normalize multiple spaces into a single space
    safeName = safeName.replace(/\s+/g, ' ');

    // 4. Remove trailing dots or spaces which are invalid in Windows
    safeName = safeName.replace(/[. ]+$/, '').trim();

    // 5. Guard against Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
    const windowsReserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    if (!safeName || windowsReserved.test(safeName)) {
      safeName = 'Sirkuit';
    }

    return safeName;
  }

  // Export a project as .smrl file (Native Windows Dialog supported)
  async exportProject(projectId, customFileName = null) {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) return;

    if (proj.id === this.activeProjectId && this.canvas) {
      proj.circuit = this.canvas.getCircuitJson();
    }

    const jsonStr = JSON.stringify(proj.circuit, null, 2);
    const safeName = this.getSafeProjectFileName(proj, customFileName);
    const fileName = `${safeName}.smrl`;

    if (window.TauriBridge && window.TauriBridge.isTauri()) {
      const savedPath = await window.TauriBridge.saveCircuitFile(
        fileName,
        jsonStr,
        'smrl',
        'Berkas Sirkuit Mashimurelay (*.smrl)'
      );
      if (savedPath && typeof showToast === 'function') {
        showToast(`Tersimpan di: ${savedPath}`);
      }
      return savedPath;
    }

    const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 3000);
  }

  // Export a project as legacy .txt file (Native Windows Dialog supported)
  async exportProjectTxt(projectId, customFileName = null) {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) return;

    if (proj.id === this.activeProjectId && this.canvas) {
      proj.circuit = this.canvas.getCircuitJson();
    }

    const b64Str = (typeof exportCircuitToLegacyTxt === 'function')
      ? exportCircuitToLegacyTxt(proj.circuit, true)
      : JSON.stringify(proj.circuit);
    const safeName = this.getSafeProjectFileName(proj, customFileName);
    const fileName = `${safeName}.txt`;

    if (window.TauriBridge && window.TauriBridge.isTauri()) {
      const savedPath = await window.TauriBridge.saveCircuitFile(
        fileName,
        b64Str,
        'txt',
        'Mashimurelay Text Format (*.txt)'
      );
      if (savedPath && typeof showToast === 'function') {
        showToast(`Tersimpan di: ${savedPath}`);
      }
      return savedPath;
    }

    const blob = new Blob([b64Str], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
      URL.revokeObjectURL(url);
    }, 3000);
  }

  // Import a project from native Windows file dialog
  async importProjectNative() {
    if (window.TauriBridge && window.TauriBridge.isTauri()) {
      const fileData = await window.TauriBridge.openCircuitFile();
      if (fileData && fileData.content) {
        let circuitObj = null;
        try {
          circuitObj = JSON.parse(fileData.content);
        } catch (e) {
          if (typeof importCircuitFromLegacyTxt === 'function') {
            circuitObj = importCircuitFromLegacyTxt(fileData.content);
          }
        }
        if (circuitObj) {
          const cleanName = fileData.file_name.replace(/\.[^/.]+$/, "");
          const proj = this.createNewProject(cleanName, circuitObj);
          if (typeof showToast === 'function') {
            showToast(`Sirkuit "${cleanName}" berhasil dimuat!`);
          }
          return proj;
        }
      }
    }
    return null;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.MashimurelayProjectManager = MashimurelayProjectManager;
}
