/**
 * Mashimurelay Native Tauri Bridge
 * Connects web frontend to Rust backend commands for native file dialogs and disk I/O
 */
const TauriBridge = {
  isTauri() {
    return typeof window.__TAURI__ !== 'undefined' || typeof window.__TAURI_INTERNALS__ !== 'undefined';
  },

  async invoke(cmd, args = {}) {
    if (window.__TAURI__ && window.__TAURI__.core && typeof window.__TAURI__.core.invoke === 'function') {
      return await window.__TAURI__.core.invoke(cmd, args);
    } else if (window.__TAURI__ && typeof window.__TAURI__.invoke === 'function') {
      return await window.__TAURI__.invoke(cmd, args);
    }
    return null;
  },

  async saveCircuitFile(defaultFilename, content, extension = 'smrl', filterDescription = 'Berkas Sirkuit Mashimurelay (*.smrl)') {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('save_circuit_file', {
        defaultFilename,
        content,
        extension,
        filterDescription
      });
    } catch (e) {
      console.error('Tauri saveCircuitFile error:', e);
      return null;
    }
  },

  async openCircuitFile(filterDescription = 'Berkas Sirkuit Mashimurelay (*.smrl, *.json, *.txt)', extensions = ['smrl', 'json', 'txt']) {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('open_circuit_file', {
        filterDescription,
        extensions
      });
    } catch (e) {
      console.error('Tauri openCircuitFile error:', e);
      return null;
    }
  },

  async saveImageFile(defaultFilename, base64Png) {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('save_image_file', {
        defaultFilename,
        base64Png
      });
    } catch (e) {
      console.error('Tauri saveImageFile error:', e);
      return null;
    }
  },

  async getAppInfo() {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('get_app_info');
    } catch (e) {
      console.error('Tauri getAppInfo error:', e);
      return null;
    }
  },

  async getCliFileArg() {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('get_cli_file_arg');
    } catch (e) {
      console.error('Tauri getCliFileArg error:', e);
      return null;
    }
  },

  async startClassroomServer(taskName, circuitContent, jobsheetBase64 = null, jobsheetFilename = null) {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('start_classroom_server', {
        taskName,
        circuitContent,
        jobsheetBase64,
        jobsheetFilename
      });
    } catch (e) {
      console.error('Tauri startClassroomServer error:', e);
      throw e;
    }
  },

  async stopClassroomServer() {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('stop_classroom_server');
    } catch (e) {
      console.error('Tauri stopClassroomServer error:', e);
      return null;
    }
  },

  async getClassroomStatus() {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('get_classroom_status');
    } catch (e) {
      console.error('Tauri getClassroomStatus error:', e);
      return null;
    }
  },

  async openClassroomFolder() {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('open_classroom_folder');
    } catch (e) {
      console.error('Tauri openClassroomFolder error:', e);
      return null;
    }
  },

  async selectClassroomFolder() {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('select_classroom_folder');
    } catch (e) {
      console.error('Tauri selectClassroomFolder error:', e);
      return null;
    }
  },

  async setClassroomExamMode(examMode) {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('set_classroom_exam_mode', { examMode });
    } catch (e) {
      console.error('Tauri setClassroomExamMode error:', e);
      return null;
    }
  },

  async checkClassroomFirewallStatus() {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('check_classroom_firewall_status');
    } catch (e) {
      console.error('Tauri checkClassroomFirewallStatus error:', e);
      return null;
    }
  },

  async allowClassroomFirewall() {
    if (!this.isTauri()) return null;
    return await this.invoke('allow_classroom_firewall');
  },

  async forceCloseApp() {
    if (!this.isTauri()) return null;
    try {
      return await this.invoke('force_close_app');
    } catch (e) {
      console.error('Tauri forceCloseApp error:', e);
      return null;
    }
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.TauriBridge = TauriBridge;
}
