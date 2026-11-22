/**
 * Mashimurelay Canvas Controller
 * High-Performance SVG Canvas with Grid Snapping, Pan/Zoom, Wire Drawing, Dual-Mode Hit-Testing, and Realtime Animations
 */

window.LAMP_COLORS = {
  white:  { id: 'white',  name: 'Putih',  hex: '#f8fafc', glow: '#ffffff', filter: 'drop-shadow(0 0 14px rgba(255, 255, 255, 0.95))', border: '#cbd5e1' },
  yellow: { id: 'yellow', name: 'Kuning', hex: '#fbbf24', glow: '#fbbf24', filter: 'drop-shadow(0 0 14px rgba(251, 191, 36, 0.95))',  border: '#f59e0b' },
  red:    { id: 'red',    name: 'Merah',  hex: '#ef4444', glow: '#ef4444', filter: 'drop-shadow(0 0 14px rgba(239, 68, 68, 0.95))',   border: '#dc2626' },
  green:  { id: 'green',  name: 'Hijau',  hex: '#22c55e', glow: '#22c55e', filter: 'drop-shadow(0 0 14px rgba(34, 197, 94, 0.95))',   border: '#16a34a' },
  blue:   { id: 'blue',   name: 'Biru',   hex: '#3b82f6', glow: '#3b82f6', filter: 'drop-shadow(0 0 14px rgba(59, 130, 246, 0.95))',  border: '#2563eb' }
};

window.TEXT_COLORS = {
  blue:   { id: 'blue',   name: 'Biru Muda (Cyan)', hex: '#93c5fd', border: '#38bdf8' },
  white:  { id: 'white',  name: 'Putih',            hex: '#f8fafc', border: '#cbd5e1' },
  yellow: { id: 'yellow', name: 'Kuning',           hex: '#fbbf24', border: '#f59e0b' },
  red:    { id: 'red',    name: 'Merah',            hex: '#ef4444', border: '#dc2626' },
  green:  { id: 'green',  name: 'Hijau',            hex: '#22c55e', border: '#16a34a' },
  gray:   { id: 'gray',   name: 'Abu-abu',          hex: '#94a3b8', border: '#64748b' }
};


function isOverloadRelay(svgData) {
  if (!svgData) return false;
  const s = svgData.toLowerCase();
  return s.startsWith('overload') || s.includes('thermal');
}
window.isOverloadRelay = isOverloadRelay;

function isPlainFuse(svgData) {
  if (!svgData) return false;
  return svgData.startsWith('fuse') && !svgData.startsWith('fuseSwitch');
}
window.isPlainFuse = isPlainFuse;

function isPushButton(svgData) {
  if (!svgData) return false;
  const s = svgData.toLowerCase();
  const compDef = (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[svgData]) ? COMPONENTS_DATA[svgData] : null;
  const isTypeBtn = compDef && (compDef.type === 'button' || (compDef.info && compDef.info.type === 'button'));
  return isTypeBtn || s.startsWith('button');
}
window.isPushButton = isPushButton;

class MashimurelayCanvas {
  constructor(svgElement, options = {}) {
    this.svg = svgElement;
    this.viewportGroup = this.svg.querySelector('#viewportGroup');
    this.wiresGroup = this.svg.querySelector('#wiresGroup');
    this.elementsGroup = this.svg.querySelector('#elementsGroup');
    this.pinsGroup = this.svg.querySelector('#pinsGroup');
    this.overlayGroup = this.svg.querySelector('#overlayGroup');

    if (!this.pinsGroup && this.viewportGroup) {
      this.pinsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      this.pinsGroup.setAttribute('id', 'pinsGroup');
      this.viewportGroup.appendChild(this.pinsGroup);
    }

    this.options = options;
    this.circuit = {
      header: { generator: 'Mashimurelay', '3.0.0.30': '1.0', created_at: new Date().toISOString() },
      data: []
    };

    // Pan & Zoom state
    const isMobileDevice = window.innerWidth <= 860;
    this.zoom = isMobileDevice ? 0.7 : 1.0;
    this.panX = isMobileDevice ? 60 : 100;
    this.panY = isMobileDevice ? 60 : 100;
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.hasMovedDuringPan = false;
    this.isPinching = false;
    this.pinchStartDist = 0;
    this.pinchStartZoom = this.zoom;
    this.pinchMidpoint = { x: 0, y: 0 };
    this.touchActiveOnCanvas = false;

    // Interaction state
    this.selectedElementIds = new Set();
    this.selectedConnectorId = null;
    this.isDraggingElement = false;
    this.draggedElement = null;
    this.dragOffset = { x: 0, y: 0 };
    this.dragStartWorld = { x: 0, y: 0 };
    this.dragInitialPositions = new Map();
    this.hasMovedDuringDrag = false;
    this.pendingSingleSelectId = null;
    this.clipboard = null;
    this.pasteStepCount = 0;
    this.lastPasteCenter = null;
    this.activePressedButtonId = null;

    // Box / Marquee selection state
    this.isShiftPressed = false;
    this.isBoxSelecting = false;
    this.boxSelectStart = { x: 0, y: 0 };
    this.boxSelectEnd = { x: 0, y: 0 };
    this.boxSelectInitialSelection = new Set();
    this.marqueeRect = null;

    // Wire drawing state
    this.isDrawingWire = false;
    this.wireStart = null; // { elementId, nodeId, pos, dir }
    this.rubberbandWire = null;

    // Simulation state
    this.isSimulating = false;
    this.isReviewMode = false;
    this.engine = new MashimurelayEngine();
    this.simAnimFrame = null;
    this.simResult = null;

    this.nextId = 100;
    this.enableWireGlow = localStorage.getItem('mashimurelay_wire_glow') !== 'false';

    // Undo & Redo History state
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 50;
    this.preDragSnapshot = null;

    this.initEventListeners();
    this.updateTransform();
  }

  getComponentBoxSize(compDef, el = null) {
    if (!compDef) return { width: 60, height: 60 };
    let width = compDef.width || 60;
    let height = compDef.height || 60;

    if (el && el.svgData === 'text') {
      const textStr = el.comment || el.tag || 'Teks';
      const fontSize = el.fontSize || el.indexFontSize || 24;
      width = Math.max(90, textStr.length * fontSize * 0.65 + 30);
      height = Math.max(36, fontSize * 1.5 + 16);
      return { width, height };
    }

    // Jika komponen 1-kolom vertikal lurus (semua terminal dx == 0)
    // dan lebarnya 120px di pustaka data, batasi lebar seleksi ke 60px (2 grid)
    // agar hitbox dan selection-box tidak menelan komponen tetangga di jarak 60px
    if (width > 60 && compDef.nodes && compDef.nodes.length > 0) {
      const isSingleColumn = compDef.nodes.every(n => Math.abs(parseFloat(n.dx || 0)) < 15);
      if (isSingleColumn) {
        width = 60;
      }
    }

    return { width, height };
  }

  // Backward compatibility proxy for selectedElementId
  get selectedElementId() {
    if (this.selectedElementIds && this.selectedElementIds.size === 1) {
      return this.selectedElementIds.values().next().value;
    }
    return null;
  }

  set selectedElementId(val) {
    if (!this.selectedElementIds) this.selectedElementIds = new Set();
    this.selectedElementIds.clear();
    if (val !== null && val !== undefined) {
      const el = (this.circuit && this.circuit.data) ? this.circuit.data.find(d => d.id === val) : null;
      if (el) {
        this.addElementWithGroupToSelection(el);
      } else {
        this.selectedElementIds.add(val);
      }
    }
  }

  get elements() {
    return this.circuit.data.filter(d => d.type === 'ElectricalElement');
  }

  get connectors() {
    return this.circuit.data.filter(d => d.type === 'Connector');
  }

  loadCircuit(circuitInput) {
    if (!circuitInput) return;
    let circuit = null;

    if (typeof circuitInput === 'string') {
      const trimmed = circuitInput.trim();
      if (trimmed.startsWith('{')) {
        try {
          circuit = JSON.parse(trimmed);
        } catch (e) {
          console.warn('JSON parse fallback to legacy txt:', e);
        }
      }
      if (!circuit || !circuit.data) {
        circuit = parseLegacyCircuitTxt(trimmed);
      }
    } else if (typeof circuitInput === 'object') {
      circuit = circuitInput;
    }

    if (!circuit || !Array.isArray(circuit.data)) {
      throw new Error('Format file sirkuit tidak valid atau tidak dapat dibaca.');
    }

    this.circuit = JSON.parse(JSON.stringify(circuit));
    for (const item of this.circuit.data) {
      if (item.type === 'ElectricalElement' || (!item.type && item.svgData)) {
        if (!item.type) item.type = 'ElectricalElement';
        if (!item.position && item.x !== undefined && item.y !== undefined) {
          item.position = { x: parseFloat(item.x) || 0, y: parseFloat(item.y) || 0 };
        }
        item.rotation = typeof normalizeRotation === 'function' ? normalizeRotation(item.rotation) : ((parseInt(item.rotation || 0) % 4 + 4) % 4);
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
    let maxId = 0;
    for (const item of this.circuit.data) {
      if (typeof item.id === 'number' && item.id > maxId) maxId = item.id;
    }
    if (this.isSimulating) {
      this.stopSimulation();
    }
    this.nextId = maxId + 1;
    this.selectedElementId = null;
    this.selectedConnectorId = null;
    this.engine.reset(false);
    this.simResult = null;
    if (this.options.onShortCircuit) {
      this.options.onShortCircuit(false, null);
    }
    if (this.options.onFuseBlown) {
      this.options.onFuseBlown(false, []);
    }
    if (this.options.onSimulationStateChange) {
      this.options.onSimulationStateChange('STOPPED');
    }
    this.undoStack = [];
    this.redoStack = [];
    this.notifyHistoryChange();
    if (this.options.onAssignmentKitChanged) {
      this.options.onAssignmentKitChanged(this.circuit.assignmentKit || null);
    }
    this.render();
    this.fitToScreen();
  }

  importCircuit(circuitInput) {
    return this.loadCircuit(circuitInput);
  }

  getCircuitJson() {
    return JSON.parse(JSON.stringify(this.circuit));
  }

  clear() {
    if (this.isReviewMode) return;
    if (this.isSimulating) {
      this.stopSimulation();
    }
    if (this.circuit && this.circuit.data && this.circuit.data.length > 0) {
      this.pushHistoryState();
    }
    this.circuit.data = [];
    this.nextId = 1;
    this.selectedElementId = null;
    this.selectedConnectorId = null;
    this.engine.reset(false);
    this.simResult = null;
    if (this.options.onShortCircuit) {
      this.options.onShortCircuit(false, null);
    }
    if (this.options.onFuseBlown) {
      this.options.onFuseBlown(false, []);
    }
    if (this.options.onSimulationStateChange) {
      this.options.onSimulationStateChange('STOPPED');
    }
    this.render();
    if (this.options.onSelect) this.options.onSelect(null);
    if (this.options.onCircuitChanged && !this.isReviewMode) this.options.onCircuitChanged();
  }

  // Undo & Redo History Management
  pushHistoryState() {
    if (this.isReviewMode) return;
    if (!this.circuit || !Array.isArray(this.circuit.data)) return;
    const snapshot = JSON.stringify(this.circuit.data);
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snapshot) {
      return;
    }
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notifyHistoryChange();
    if (this.options.onCircuitChanged) {
      this.options.onCircuitChanged();
    }
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  notifyHistoryChange() {
    if (this.options.onHistoryChange) {
      this.options.onHistoryChange(this.canUndo(), this.canRedo());
    }
  }

  undo() {
    if (!this.canUndo()) return false;
    const currentSnapshot = JSON.stringify(this.circuit.data);
    this.redoStack.push(currentSnapshot);
    const prevSnapshot = this.undoStack.pop();
    this.circuit.data = JSON.parse(prevSnapshot);
    this.selectedElementId = null;
    this.selectedConnectorId = null;
    this.render();
    if (this.options.onSelect) this.options.onSelect(null);
    this.notifyHistoryChange();
    if (this.options.onCircuitChanged) {
      this.options.onCircuitChanged();
    }
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    const currentSnapshot = JSON.stringify(this.circuit.data);
    this.undoStack.push(currentSnapshot);
    const nextSnapshot = this.redoStack.pop();
    this.circuit.data = JSON.parse(nextSnapshot);
    this.selectedElementId = null;
    this.selectedConnectorId = null;
    this.render();
    if (this.options.onSelect) this.options.onSelect(null);
    this.notifyHistoryChange();
    if (this.options.onCircuitChanged) {
      this.options.onCircuitChanged();
    }
    return true;
  }

  // Coordinate transformations
  screenToWorld(screenX, screenY) {
    const rect = this.svg.getBoundingClientRect();
    const x = (screenX - rect.left - this.panX) / this.zoom;
    const y = (screenY - rect.top - this.panY) / this.zoom;
    return { x, y };
  }

  getViewportCenterWorld() {
    const rect = this.svg.getBoundingClientRect();
    const sidebarEl = document.querySelector('.sidebar');
    const inspectorEl = document.querySelector('.inspector');
    const leftOffset = (sidebarEl && !sidebarEl.classList.contains('is-collapsed')) ? (sidebarEl.offsetWidth || 280) : 0;
    const rightOffset = (inspectorEl && !inspectorEl.classList.contains('is-collapsed')) ? (inspectorEl.offsetWidth || 260) : 0;
    const visibleWidth = Math.max(200, rect.width - leftOffset - rightOffset);
    const cx = rect.left + leftOffset + visibleWidth / 2;
    const cy = rect.top + rect.height / 2;
    return this.screenToWorld(cx, cy);
  }

  updateTransform() {
    if (this.viewportGroup) {
      this.viewportGroup.setAttribute('transform', `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
      this.viewportGroup.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
      this.viewportGroup.style.transformOrigin = '0 0';
    }
    const pattern = this.svg.querySelector('#gridPattern');
    if (pattern) {
      const step = 30 * this.zoom;
      const ox = ((this.panX % step) + step) % step;
      const oy = ((this.panY % step) + step) % step;
      pattern.setAttribute('x', ox);
      pattern.setAttribute('y', oy);
      pattern.setAttribute('width', step);
      pattern.setAttribute('height', step);
    }
  }

  zoomAt(factor, screenX, screenY) {
    const newZoom = Math.min(Math.max(this.zoom * factor, 0.2), 3.0);
    const rect = this.svg.getBoundingClientRect();
    const cx = screenX - rect.left;
    const cy = screenY - rect.top;

    this.panX = cx - (cx - this.panX) * (newZoom / this.zoom);
    this.panY = cy - (cy - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;
    this.updateTransform();
  }

  fitToScreen() {
    const elems = this.elements;
    const isMobileDevice = window.innerWidth <= 860;
    const rect = this.svg.getBoundingClientRect();
    const sidebarEl = document.querySelector('.sidebar');
    const inspectorEl = document.querySelector('.inspector');
    const leftOffset = (sidebarEl && !sidebarEl.classList.contains('is-collapsed')) ? (sidebarEl.offsetWidth || 280) : 0;
    const rightOffset = (inspectorEl && !inspectorEl.classList.contains('is-collapsed')) ? (inspectorEl.offsetWidth || 260) : 0;
    const visibleWidth = Math.max(200, rect.width - leftOffset - rightOffset);
    const visibleHeight = rect.height;

    if (elems.length === 0) {
      this.zoom = isMobileDevice ? 0.7 : 1.0;
      this.panX = isMobileDevice ? 60 : (leftOffset + 40);
      this.panY = isMobileDevice ? 60 : 100;
      this.updateTransform();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elems) {
      minX = Math.min(minX, el.position.x - 60);
      minY = Math.min(minY, el.position.y - 60);
      maxX = Math.max(maxX, el.position.x + 60);
      maxY = Math.max(maxY, el.position.y + 60);
    }

    const margin = isMobileDevice ? 40 : 80;
    const w = maxX - minX + margin * 2;
    const h = maxY - minY + margin * 2;
    const scaleX = visibleWidth / w;
    const scaleY = visibleHeight / h;
    const maxAllowedZoom = isMobileDevice ? 0.95 : 1.5;
    this.zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), maxAllowedZoom);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const centerX = leftOffset + visibleWidth / 2;
    const centerY = visibleHeight / 2;

    this.panX = centerX - midX * this.zoom;
    this.panY = centerY - midY * this.zoom;
    this.updateTransform();
  }

  // Element manipulations
  addElement(svgName, x = null, y = null) {
    if (this.isSimulating) {
      if (this.options.onSimulationRestrictedAction) {
        this.options.onSimulationRestrictedAction('Tidak dapat menambahkan komponen saat simulasi sedang berjalan.');
      }
      return null;
    }

    const compDef = COMPONENTS_DATA[svgName];
    if (!compDef) return null;

    this.pushHistoryState();

    // Reset seleksi lama secara bersih agar komponen baru berdiri sendiri
    if (this.selectedElementIds) {
      this.selectedElementIds.clear();
    }
    this.selectedConnectorId = null;
    this.pendingSingleSelectId = null;

    const worldCenter = (x !== null && y !== null)
      ? { x, y }
      : this.getViewportCenterWorld();

    const snapX = snapToGrid(worldCenter.x);
    const snapY = snapToGrid(worldCenter.y);

    let tag = null;
    const cat = compDef.category;
    if (compDef.type === 'arrow' || svgName === 'arrowSource' || svgName === 'arrowDestination') {
      tag = '-REF1';
    } else if (cat === 'coils') {
      tag = '-K1';
    } else if (cat === 'contactors') {
      tag = '-KM1';
    } else if (cat === 'protections') {
      tag = (svgName.startsWith('overload') || (svgName.startsWith('fuse') && !svgName.startsWith('fuseSwitch'))) ? '-F1' : '-Q1';
    } else if (cat === 'switches') {
      tag = '-S1';
    } else if (cat === 'motors') {
      tag = '-M1';
    } else if (cat === 'loads') {
      tag = '-H1';
    } else if (cat === 'auxiliaries') {
      tag = '-KM1';
    }

    const isTextComp = (svgName === 'text');
    const newElem = {
      svgData: svgName,
      type: 'ElectricalElement',
      id: this.nextId++,
      position: { x: snapX, y: snapY },
      rotation: 0,
      text: null,
      tag: isTextComp ? null : tag,
      comment: isTextComp ? 'Teks Baru' : (compDef.name || null),
      fontSize: isTextComp ? 24 : undefined,
      textColor: isTextComp ? '#93c5fd' : undefined,
      value: null,
      tagVisibility: true,
      margins: null,
      idNode1: null,
      idNode2: null,
      idElementNode1: null,
      idElementNode2: null,
      valueTimeOn: 2.0,
      valueTimeOff: 0.0,
      colorType: 0,
      indexFontSize: isTextComp ? 24 : 5,
      terminalTags: compDef.nodes ? compDef.nodes.map(n => n.tag || '') : [],
      frameIndex: 0
    };

    this.circuit.data.push(newElem);
    this.selectedElementIds.clear();
    this.selectedElementIds.add(newElem.id);
    this.selectedConnectorId = null;
    this.render();
    if (this.options.onSelect) this.options.onSelect(newElem);
    if (this.options.onCircuitChanged) this.options.onCircuitChanged();
    return newElem;
  }

  rotateSelected() {
    if (this.isReviewMode) return;
    if (this.isSimulating) {
      if (this.options.onSimulationRestrictedAction) {
        this.options.onSimulationRestrictedAction('Hentikan simulasi terlebih dahulu untuk memutar komponen.');
      }
      return;
    }
    const targetIds = (this.selectedElementIds && this.selectedElementIds.size > 0)
      ? Array.from(this.selectedElementIds)
      : (this.selectedElementId !== null ? [this.selectedElementId] : []);
    if (targetIds.length === 0) return;

    const hasTeacherLocked = targetIds.some(id => {
      const elem = this.circuit.data.find(d => d.id === id);
      return elem && elem.teacherLocked;
    });
    if (hasTeacherLocked) {
      if (this.options.onSimulationRestrictedAction) {
        this.options.onSimulationRestrictedAction('Komponen dikunci oleh Guru dan tidak dapat diputar.');
      }
      return;
    }

    this.pushHistoryState();
    targetIds.forEach(id => {
      const elem = this.circuit.data.find(d => d.id === id);
      if (elem && elem.type === 'ElectricalElement') {
        const curRot = typeof normalizeRotation === 'function' ? normalizeRotation(elem.rotation) : (parseInt(elem.rotation || 0) % 4);
        elem.rotation = (curRot + 1) % 4;
      }
    });

    this.render();
    if (this.options.onSelect) {
      const selEls = this.elements.filter(d => this.selectedElementIds.has(d.id));
      this.options.onSelect(selEls.length === 1 ? selEls[0] : (selEls.length > 1 ? { type: 'MultiSelection', elements: selEls } : null));
    }
    if (this.options.onCircuitChanged) this.options.onCircuitChanged();
  }

  deleteSelected() {
    if (this.isReviewMode) {
      if (this.options.onSimulationRestrictedAction) {
        this.options.onSimulationRestrictedAction('Rangkaian dalam Mode Review terkunci (View-Only).');
      }
      return;
    }
    if (this.isSimulating) {
      if (this.options.onSimulationRestrictedAction) {
        this.options.onSimulationRestrictedAction('Hentikan simulasi terlebih dahulu untuk menghapus komponen atau kawat.');
      }
      return;
    }
    if (this.selectedElementIds && this.selectedElementIds.size > 0) {
      const hasTeacherLocked = Array.from(this.selectedElementIds).some(id => {
        const el = this.elements.find(d => d.id === id);
        return el && el.teacherLocked;
      });
      if (hasTeacherLocked) {
        if (this.options.onSimulationRestrictedAction) {
          this.options.onSimulationRestrictedAction('Komponen dikunci oleh Guru dan tidak dapat dihapus.');
        }
        return;
      }
      this.pushHistoryState();
      const idsToDelete = new Set(this.selectedElementIds);
      this.circuit.data = this.circuit.data.filter(d => {
        if (idsToDelete.has(d.id)) return false;
        if (d.type === 'Connector' && (idsToDelete.has(d.idElementNode1) || idsToDelete.has(d.idElementNode2))) return false;
        return true;
      });
      for (const id of idsToDelete) {
        if (this.engine) {
          this.engine.manualStates.delete(id);
          this.engine.fuseBlownElements.delete(id);
          this.engine.fuseHeatTimers.delete(id);
        }
      }
      this.selectedElementIds.clear();
      this.render();
      if (this.options.onSelect) this.options.onSelect(null);
      if (this.options.onCircuitChanged) this.options.onCircuitChanged();
      return;
    } else if (this.selectedConnectorId !== null) {
      this.pushHistoryState();
      const id = this.selectedConnectorId;
      this.circuit.data = this.circuit.data.filter(d => d.id !== id);
      this.selectedConnectorId = null;
      this.render();
      if (this.options.onSelect) this.options.onSelect(null);
      if (this.options.onCircuitChanged) this.options.onCircuitChanged();
    }
  }

  // Multi-Selection and Grouping Helpers
  addElementWithGroupToSelection(elem) {
    if (!elem) return;
    if (elem.groupId) {
      const members = this.elements.filter(d => d.groupId === elem.groupId);
      members.forEach(m => this.selectedElementIds.add(m.id));
    } else {
      this.selectedElementIds.add(elem.id);
    }
  }

  removeElementWithGroupFromSelection(elem) {
    if (!elem) return;
    if (elem.groupId) {
      const members = this.elements.filter(d => d.groupId === elem.groupId);
      members.forEach(m => this.selectedElementIds.delete(m.id));
    } else {
      this.selectedElementIds.delete(elem.id);
    }
  }

  // Copy (Ctrl + C)
  copySelection() {
    if (this.isSimulating) return { count: 0, wireCount: 0 };
    const selected = this.elements.filter(d => this.selectedElementIds.has(d.id));
    if (selected.length === 0) return { count: 0, wireCount: 0 };

    const selectedIds = new Set(selected.map(d => d.id));
    const internalWires = this.connectors.filter(c => selectedIds.has(c.idElementNode1) && selectedIds.has(c.idElementNode2));

    this.clipboard = {
      elements: JSON.parse(JSON.stringify(selected)),
      connectors: JSON.parse(JSON.stringify(internalWires))
    };
    this.pasteStepCount = 0;
    return { count: selected.length, wireCount: internalWires.length };
  }

  // Paste (Ctrl + V): Menempatkan komponen langsung di tengah area visual kanvas yang sedang aktif dilihat user
  pasteClipboard(targetCenter = null, keepOriginalOffset = false) {
    if (this.isSimulating) return { count: 0, wireCount: 0 };
    if (!this.clipboard || !this.clipboard.elements || this.clipboard.elements.length === 0) {
      return { count: 0, wireCount: 0 };
    }

    this.pushHistoryState();

    let deltaX = 0;
    let deltaY = 0;

    if (keepOriginalOffset) {
      // Dipakai oleh Ctrl+D (Duplikat): buat salinan dengan offset relatif dari posisi aslinya (+30px)
      this.pasteStepCount += 1;
      const offset = snapToGrid(30 * this.pasteStepCount);
      deltaX = offset;
      deltaY = offset;
    } else {
      // Dipakai oleh Ctrl+V (Paste): letakkan persis di tengah visual kanvas yang sedang aktif dilihat user
      const center = targetCenter || this.getViewportCenterWorld();

      // Hitung titik tengah (bounding box center) dari kumpulan elemen di clipboard
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const src of this.clipboard.elements) {
        minX = Math.min(minX, src.position.x);
        maxX = Math.max(maxX, src.position.x);
        minY = Math.min(minY, src.position.y);
        maxY = Math.max(maxY, src.position.y);
      }
      const clipCenterX = (minX + maxX) / 2;
      const clipCenterY = (minY + maxY) / 2;

      // Jika user telah berpindah/pan ke visual canvas baru, reset cascading step
      if (this.lastPasteCenter) {
        const distFromLast = Math.hypot(center.x - this.lastPasteCenter.x, center.y - this.lastPasteCenter.y);
        if (distFromLast > 45) {
          this.pasteStepCount = 0;
        }
      }
      this.pasteStepCount += 1;
      this.lastPasteCenter = { x: center.x, y: center.y };

      // Geser sedemikian rupa sehingga pusat komponen berada pas di tengah layar visual
      const baseDeltaX = snapToGrid(center.x - clipCenterX);
      const baseDeltaY = snapToGrid(center.y - clipCenterY);

      // Cascading offset (+30px per paste) jika user menekan Ctrl+V berulang kali di area yang sama
      const cascadeOffset = (this.pasteStepCount > 1) ? snapToGrid(30 * (this.pasteStepCount - 1)) : 0;
      deltaX = baseDeltaX + cascadeOffset;
      deltaY = baseDeltaY + cascadeOffset;
    }

    let maxId = this.circuit.data.reduce((max, item) => (typeof item.id === 'number' && item.id > max ? item.id : max), 0);

    const idMap = new Map();
    const groupMap = new Map();
    const newElements = [];
    const newConnectors = [];

    // Remap dan kloning komponen
    for (const src of this.clipboard.elements) {
      const el = JSON.parse(JSON.stringify(src));
      const newId = ++maxId;
      idMap.set(src.id, newId);
      el.id = newId;
      el.position.x = snapToGrid(el.position.x + deltaX);
      el.position.y = snapToGrid(el.position.y + deltaY);

      if (el.tag) {
        const cDef = COMPONENTS_DATA[el.svgData];
        const shouldKeepTag = (el.svgData === 'arrowDestination') ||
          (cDef && (cDef.duplicateTag === 'true' || (cDef.info && cDef.info.duplicateTag === 'true')));
        if (!shouldKeepTag) {
          el.tag = this.generateUniqueTag(el.tag);
        }
      }

      if (src.groupId) {
        if (!groupMap.has(src.groupId)) {
          groupMap.set(src.groupId, 'grp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
        }
        el.groupId = groupMap.get(src.groupId);
      }

      this.circuit.data.push(el);
      newElements.push(el);
    }

    // Remap dan kloning kawat internal
    for (const srcWire of this.clipboard.connectors) {
      const mapped1 = idMap.get(srcWire.idElementNode1);
      const mapped2 = idMap.get(srcWire.idElementNode2);
      if (mapped1 !== undefined && mapped2 !== undefined) {
        const wire = JSON.parse(JSON.stringify(srcWire));
        wire.id = ++maxId;
        wire.idElementNode1 = mapped1;
        wire.idElementNode2 = mapped2;
        this.circuit.data.push(wire);
        newConnectors.push(wire);
      }
    }

    // Aktifkan seleksi pada elemen yang baru di-paste
    this.selectedElementIds.clear();
    this.selectedConnectorId = null;
    newElements.forEach(el => this.selectedElementIds.add(el.id));

    this.render();
    if (this.options.onSelect) {
      this.options.onSelect(newElements.length === 1 ? newElements[0] : { type: 'MultiSelection', elements: newElements });
    }
    if (this.options.onCircuitChanged) {
      this.options.onCircuitChanged();
    }

    return { count: newElements.length, wireCount: newConnectors.length };
  }

  // Duplicate (Ctrl + D): Menduplikasi di dekat komponen asli (+30px)
  duplicateSelection(offset = 30) {
    if (this.isSimulating) return { count: 0, wireCount: 0 };
    if (!this.selectedElementIds || this.selectedElementIds.size === 0) {
      return { count: 0, wireCount: 0 };
    }
    this.copySelection();
    return this.pasteClipboard(null, true);
  }

  // Group (Ctrl + G)
  groupSelection() {
    if (this.isSimulating) return { success: false, count: 0 };
    const selected = this.elements.filter(d => this.selectedElementIds.has(d.id));
    if (selected.length < 2) {
      return { success: false, count: selected.length };
    }

    this.pushHistoryState();
    const newGroupId = 'grp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    for (const el of selected) {
      el.groupId = newGroupId;
    }

    this.render();
    if (this.options.onCircuitChanged) this.options.onCircuitChanged();
    return { success: true, count: selected.length, groupId: newGroupId };
  }

  // Ungroup (Ctrl + Shift + G)
  ungroupSelection() {
    if (this.isSimulating) return { success: false, count: 0 };
    const selected = this.elements.filter(d => this.selectedElementIds.has(d.id));
    const grouped = selected.filter(el => !!el.groupId);
    if (grouped.length === 0) {
      return { success: false, count: 0 };
    }

    this.pushHistoryState();
    const targetGroupIds = new Set(grouped.map(el => el.groupId));
    let count = 0;
    for (const el of this.elements) {
      if (el.groupId && targetGroupIds.has(el.groupId)) {
        delete el.groupId;
        count++;
      }
    }

    this.render();
    if (this.options.onCircuitChanged) this.options.onCircuitChanged();
    return { success: true, count };
  }

  // Lock / Unlock Component Position (Ctrl + L: Locks position, strictly enforced on Android while keeping wiring 100% active)
  lockSelectedElements(lockState = true) {
    if (this.isSimulating) return { count: 0, locked: lockState, teacherLocked: lockState };
    const selIds = (this.selectedElementIds && this.selectedElementIds.size > 0)
      ? Array.from(this.selectedElementIds)
      : (this.selectedElementId ? [this.selectedElementId] : []);
    if (selIds.length === 0) return { count: 0, locked: lockState, teacherLocked: lockState };

    this.pushHistoryState();
    let count = 0;
    for (const id of selIds) {
      const el = this.elements.find(d => d.id === id);
      if (el) {
        el.locked = Boolean(lockState);
        el.teacherLocked = Boolean(lockState);
        count++;
      }
    }

    this.render();
    if (this.options.onSelect) {
      const selEls = this.elements.filter(d => selIds.includes(d.id));
      this.options.onSelect(selEls.length === 1 ? selEls[0] : (selEls.length > 1 ? { type: 'MultiSelection', elements: selEls } : null));
    }
    if (this.options.onCircuitChanged) {
      this.options.onCircuitChanged();
    }
    return { count, locked: Boolean(lockState), teacherLocked: Boolean(lockState) };
  }

  toggleLockSelected() {
    const selIds = (this.selectedElementIds && this.selectedElementIds.size > 0)
      ? Array.from(this.selectedElementIds)
      : (this.selectedElementId ? [this.selectedElementId] : []);
    if (selIds.length === 0) return { count: 0, locked: false, teacherLocked: false };
    const targetEls = this.elements.filter(d => selIds.includes(d.id));
    const allLocked = targetEls.length > 0 && targetEls.every(e => !!e.locked || !!e.teacherLocked);
    const nextState = !allLocked;
    return this.lockSelectedElements(nextState);
  }

  toggleTeacherLockSelected() {
    return this.toggleLockSelected();
  }


  // Teacher Restricted Component Kit
  setAssignmentKit(kit) {
    if (!this.circuit) return;
    this.pushHistoryState();
    if (kit && kit.enabled) {
      this.circuit.assignmentKit = {
        enabled: true,
        name: kit.name || 'Kit Praktikum',
        allowedComponents: Array.isArray(kit.allowedComponents) ? [...kit.allowedComponents] : []
      };
    } else {
      delete this.circuit.assignmentKit;
    }
    if (this.options.onAssignmentKitChanged) {
      this.options.onAssignmentKitChanged(this.circuit.assignmentKit || null);
    }
    if (this.options.onCircuitChanged) {
      this.options.onCircuitChanged();
    }
  }

  generateUniqueTag(baseTag) {
    if (!baseTag) return '';
    const existingTags = new Set(this.elements.map(e => (e.tag || '').toUpperCase()).filter(Boolean));
    if (!existingTags.has(baseTag.toUpperCase())) {
      return baseTag;
    }
    const match = baseTag.match(/^(.*?)(\d+)$/);
    const prefix = match ? match[1] : baseTag;
    let counter = match ? parseInt(match[2], 10) + 1 : 1;
    while (existingTags.has(`${prefix}${counter}`.toUpperCase())) {
      counter++;
    }
    return `${prefix}${counter}`;
  }

  selectAll() {
    if (this.isSimulating) return { count: 0 };
    const elements = this.elements;
    if (!elements || elements.length === 0) return { count: 0 };

    this.selectedElementIds.clear();
    this.selectedConnectorId = null;
    for (const el of elements) {
      this.selectedElementIds.add(el.id);
    }

    this.render();
    if (this.options.onSelect) {
      this.options.onSelect(elements.length === 1 ? elements[0] : { type: 'MultiSelection', elements: [...elements] });
    }
    return { count: elements.length };
  }

  showMarquee(x, y, w, h) {
    if (!this.marqueeRect) {
      this.marqueeRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      this.marqueeRect.setAttribute('class', 'selection-marquee-box');
      this.marqueeRect.setAttribute('pointer-events', 'none');
    }
    this.updateMarquee(x, y, w, h);
    const targetGroup = this.overlayGroup || this.viewportGroup;
    if (targetGroup && this.marqueeRect.parentNode !== targetGroup) {
      targetGroup.appendChild(this.marqueeRect);
    }
  }

  updateMarquee(x, y, w, h) {
    if (!this.marqueeRect) return;
    this.marqueeRect.setAttribute('x', x);
    this.marqueeRect.setAttribute('y', y);
    this.marqueeRect.setAttribute('width', Math.max(0, w));
    this.marqueeRect.setAttribute('height', Math.max(0, h));
    const targetGroup = this.overlayGroup || this.viewportGroup;
    if (targetGroup && this.marqueeRect.parentNode !== targetGroup) {
      targetGroup.appendChild(this.marqueeRect);
    }
  }

  removeMarquee() {
    if (this.marqueeRect && this.marqueeRect.parentNode) {
      this.marqueeRect.parentNode.removeChild(this.marqueeRect);
    }
  }

  // Unified Event Listeners
  initEventListeners() {
    const container = this.svg.parentElement || this.svg;

    // Mouse events
    this.svg.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    container.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isFs = !!(document.fullscreenElement || document.body.classList.contains('is-fullscreen') || document.body.classList.contains('fullscreen'));
      const isSim = this.isSimulating || this.isReviewMode;

      // When simulating, review mode, or fullscreen, do not show any context menu
      if (isSim || isFs) {
        if (this.options.onDismissContextMenu) {
          this.options.onDismissContextMenu();
        }
        return;
      }

      // If user was panning with right mouse button, don't show menu
      if (this.hasMovedDuringPan) {
        this.hasMovedDuringPan = false;
        return;
      }

      const worldPos = this.screenToWorld(e.clientX, e.clientY);

      // Determine context menu target
      let targetType = 'CANVAS';
      let targetData = worldPos;

      if (this.selectedConnectorId !== null) {
        const wire = this.circuit.data.find(d => d.id === this.selectedConnectorId);
        if (wire) {
          targetType = 'WIRE';
          targetData = wire;
        }
      } else if (this.selectedElementIds && this.selectedElementIds.size > 1) {
        const selEls = this.elements.filter(d => this.selectedElementIds.has(d.id));
        if (selEls.length > 1) {
          targetType = 'MULTI';
          targetData = selEls;
        }
      } else if (this.selectedElementIds && this.selectedElementIds.size === 1) {
        const elId = Array.from(this.selectedElementIds)[0];
        const elem = this.elements.find(d => d.id === elId);
        if (elem) {
          targetType = 'ELEMENT';
          targetData = elem;
        }
      }

      if (this.options.onShowContextMenu) {
        this.options.onShowContextMenu(targetType, targetData, e.clientX, e.clientY, worldPos);
      }
    });

    // Shift Key tracking for box selection & cursor feedback
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        this.isShiftPressed = true;
        this.svg.classList.add('shift-selecting');
      }
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') {
        this.rotateSelected();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        this.deleteSelected();
      } else if (e.key === 'Escape') {
        if (this.options.onDismissContextMenu) {
          this.options.onDismissContextMenu();
        }
        if (this.isDrawingWire) {
          this.cancelWireDrawing();
        } else if (this.isBoxSelecting) {
          this.isBoxSelecting = false;
          this.removeMarquee();
        } else {
          this.selectedElementIds.clear();
          this.selectedConnectorId = null;
          this.render();
          if (this.options.onSelect) this.options.onSelect(null);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        this.isShiftPressed = false;
        this.svg.classList.remove('shift-selecting');
      }
    });

    window.addEventListener('blur', () => {
      this.isShiftPressed = false;
      this.svg.classList.remove('shift-selecting');
    });

    // Touch events for Android & Mobile
    this.svg.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    window.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
  }

  // Touch Handlers with Robust Element & Pin Hit-Testing (Non-blocking for Native UI Scroll)
  onTouchStart(e) {
    const rawTarget = e.target;
    // Do not capture touch if touch began on UI overlays, sidebar, drawer, modals, or floating controls
    if (rawTarget && rawTarget.closest && rawTarget.closest('.modal-overlay, .sidebar, .inspector, .floating-pill, .nav-drawer, .app-header, .header')) {
      this.touchActiveOnCanvas = false;
      return;
    }

    this.touchActiveOnCanvas = true;
    if (e.cancelable) e.preventDefault();

    if (e.touches.length === 2) {
      // 2-finger pinch zoom
      this.isPinching = true;
      this.isPanning = false;
      this.isDraggingElement = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      this.pinchStartZoom = this.zoom;
      this.pinchMidpoint = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      const target = document.elementFromPoint(t.clientX, t.clientY);
      if (!target) return;

      // 1. Check if clicked terminal pin
      const pinEl = target.closest('.terminal-pin');
      if (pinEl && !this.isSimulating && !this.isReviewMode) {
        const elemId = parseInt(pinEl.getAttribute('data-elem-id'));
        const nodeId = parseInt(pinEl.getAttribute('data-node-id'));
        this.onPinClicked(elemId, nodeId);
        return;
      }

      // 2. Check if clicked component
      const elemGroup = target.closest('.circuit-element');
      if (elemGroup) {
        const elemId = parseInt(elemGroup.getAttribute('data-id'));
        const elem = this.circuit.data.find(d => d.id === elemId);
        if (!elem) return;

        if (this.isReviewMode) {
          if (this.isSimulating) {
            this.selectedElementId = elemId;
            this.selectedConnectorId = null;
            if (isPushButton(elem.svgData)) {
              this.activePressedButtonId = elem.id;
              this.engine.setButtonPressed(elem.id, true);
              this.simResult = this.engine.step({ elements: this.elements, connectors: this.connectors }, 0);
              this.updateSimulationVisuals();
              if (this.options.onButtonStateChange) {
                this.options.onButtonStateChange(elem.id, true);
              }
            } else {
              this.handleSimulationClick(elem);
            }
            this.render();
            if (this.options.onSelect) this.options.onSelect(elem);
          } else {
            if (!isPushButton(elem.svgData)) {
              this.handleSimulationClick(elem);
            }
            this.render();
            if (this.options.onSelect) this.options.onSelect(elem);
          }
          return;
        }

        if (this.isSimulating) {
          this.selectedElementId = elemId;
          this.selectedConnectorId = null;
          if (isPushButton(elem.svgData)) {
            this.activePressedButtonId = elem.id;
            this.engine.setButtonPressed(elem.id, true);
            this.simResult = this.engine.step({ elements: this.elements, connectors: this.connectors }, 0);
            this.updateSimulationVisuals();
            if (this.options.onButtonStateChange) {
              this.options.onButtonStateChange(elem.id, true);
            }
          } else {
            this.handleSimulationClick(elem);
          }
          this.render();
          if (this.options.onSelect) this.options.onSelect(elem);
          return;
        }

        // Edit Mode: Select and prepare drag
        if (!this.selectedElementIds.has(elemId)) {
          this.selectedElementIds.clear();
          this.addElementWithGroupToSelection(elem);
          this.selectedConnectorId = null;
        }
        this.isDraggingElement = true;
        this.draggedElement = elem;
        this.hasMovedDuringDrag = false;
        this.preDragSnapshot = JSON.stringify(this.circuit.data);
        const worldPos = this.screenToWorld(t.clientX, t.clientY);
        this.dragStartWorld = { x: worldPos.x, y: worldPos.y };
        this.dragInitialPositions = new Map();
        for (const id of this.selectedElementIds) {
          const el = this.elements.find(d => d.id === id);
          if (el) this.dragInitialPositions.set(id, { x: el.position.x, y: el.position.y });
        }
        this.render();
        if (this.options.onSelect) {
          const selEls = this.elements.filter(d => this.selectedElementIds.has(d.id));
          this.options.onSelect(selEls.length === 1 ? selEls[0] : (selEls.length > 1 ? { type: 'MultiSelection', elements: selEls } : null));
        }
        return;
      }

      // 3. Check if clicked wire
      const wireEl = target.closest('.circuit-wire');
      if (wireEl) {
        const wireId = parseInt(wireEl.getAttribute('data-id'));
        this.selectedConnectorId = wireId;
        this.selectedElementIds.clear();
        this.render();
        const wire = this.circuit.data.find(d => d.id === wireId);
        if (this.options.onSelect) this.options.onSelect(wire);
        return;
      }

      if (this.isDrawingWire) {
        this.cancelWireDrawing();
        return;
      }

      // Background pan
      this.isPanning = true;
      this.panStart = { x: t.clientX, y: t.clientY };
    }
  }

  onTouchMove(e) {
    if (!this.touchActiveOnCanvas) {
      return; // Never block native touch scrolling outside of active canvas gesture!
    }

    if (this.isPinching || this.isPanning || this.isDraggingElement || this.isDrawingWire) {
      if (e.cancelable) e.preventDefault();
    } else {
      return;
    }

    if (this.isPinching && e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const factor = dist / (this.pinchStartDist || 1);
      const targetZoom = Math.min(Math.max(this.pinchStartZoom * factor, 0.2), 3.0);

      const rect = this.svg.getBoundingClientRect();
      const cx = this.pinchMidpoint.x - rect.left;
      const cy = this.pinchMidpoint.y - rect.top;

      this.panX = cx - (cx - this.panX) * (targetZoom / this.zoom);
      this.panY = cy - (cy - this.panY) * (targetZoom / this.zoom);
      this.zoom = targetZoom;
      this.updateTransform();
      return;
    }

    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (this.isPanning) {
        const dx = t.clientX - this.panStart.x;
        const dy = t.clientY - this.panStart.y;
        this.panX += dx;
        this.panY += dy;
        this.panStart = { x: t.clientX, y: t.clientY };
        this.updateTransform();
        return;
      }

      if (this.isDraggingElement && this.draggedElement) {
        const worldPos = this.screenToWorld(t.clientX, t.clientY);
        const rawDx = worldPos.x - this.dragStartWorld.x;
        const rawDy = worldPos.y - this.dragStartWorld.y;
        const dx = snapToGrid(rawDx);
        const dy = snapToGrid(rawDy);
        let changed = false;
        let hasLockedAttempt = false;
        let hasTeacherLockedAttempt = false;
        for (const [id, initPos] of this.dragInitialPositions.entries()) {
          const el = this.elements.find(d => d.id === id);
          if (el) {
            if (el.teacherLocked) {
              hasTeacherLockedAttempt = true;
              hasLockedAttempt = true;
              continue;
            } else if (el.locked) {
              hasLockedAttempt = true;
              continue;
            }
            const newX = initPos.x + dx;
            const newY = initPos.y + dy;
            if (el.position.x !== newX || el.position.y !== newY) {
              el.position.x = newX;
              el.position.y = newY;
              changed = true;
            }
          }
        }
        if (changed) {
          this.render();
        } else if (hasLockedAttempt && Math.hypot(rawDx, rawDy) > 5 && !this._lockedToastShown) {
          this._lockedToastShown = true;
          if (hasTeacherLockedAttempt && this.options.onTeacherLockedMoveAttempt) {
            this.options.onTeacherLockedMoveAttempt();
          } else if (this.options.onLockedMoveAttempt) {
            this.options.onLockedMoveAttempt();
          }
        }
        return;
      }

      if (this.isDrawingWire && this.wireStart) {
        const worldPos = this.screenToWorld(t.clientX, t.clientY);
        const targetPos = { x: snapToGrid(worldPos.x), y: snapToGrid(worldPos.y) };
        const points = routeWirePoints(
          this.wireStart.pos,
          this.wireStart.dir,
          targetPos,
          { x: 0, y: -1 },
          { start: 0, center: 0, end: 0 }
        );
        if (this.rubberbandWire) {
          this.rubberbandWire.setAttribute('d', pointsToSvgPath(points));
        }
      }
    }
  }

  onTouchEnd(e) {
    this.touchActiveOnCanvas = false;
    if (this.activePressedButtonId !== null) {
      const releasedId = this.activePressedButtonId;
      this.engine.setButtonPressed(releasedId, false);
      this.activePressedButtonId = null;
      if (this.isSimulating) {
        this.simResult = this.engine.step({ elements: this.elements, connectors: this.connectors }, 0);
        this.updateSimulationVisuals();
      }
      if (this.options.onButtonStateChange) {
        this.options.onButtonStateChange(releasedId, false);
      }
    }
    if (this.isPinching) {
      this.isPinching = false;
    }
    this.isPanning = false;
    if (this.isDraggingElement) {
      if (this.preDragSnapshot && this.preDragSnapshot !== JSON.stringify(this.circuit.data)) {
        if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== this.preDragSnapshot) {
          this.undoStack.push(this.preDragSnapshot);
          if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
          this.redoStack = [];
          this.notifyHistoryChange();
          if (this.options.onCircuitChanged) this.options.onCircuitChanged();
        }
      }
      this.preDragSnapshot = null;
    }
    this.isDraggingElement = false;
    this.draggedElement = null;
    this.dragInitialPositions.clear();
    this._lockedToastShown = false;
  }

  // Mouse Handlers
  onMouseDown(e) {
    if (e.button === 2) {
      e.preventDefault();
      if (this.options.onDismissContextMenu) {
        this.options.onDismissContextMenu();
      }

      const isFs = !!(document.fullscreenElement || document.body.classList.contains('is-fullscreen') || document.body.classList.contains('fullscreen'));
      const isSim = this.isSimulating;

      if (!isSim && !isFs) {
        const target = e.target;
        // 1. Check if right-clicked on an electrical element
        const elemGroup = target.closest('.circuit-element');
        if (elemGroup) {
          e.stopPropagation();
          const elemId = parseInt(elemGroup.getAttribute('data-id'));
          const elem = this.circuit.data.find(d => d.id === elemId);
          if (elem) {
            // CAD selection rule: If not already selected, select it exclusively
            if (!this.selectedElementIds.has(elemId)) {
              this.selectedElementIds.clear();
              this.addElementWithGroupToSelection(elem);
              this.selectedConnectorId = null;
              this.render();
              if (this.options.onSelect) {
                const selEls = this.elements.filter(d => this.selectedElementIds.has(d.id));
                this.options.onSelect(selEls.length === 1 ? selEls[0] : (selEls.length > 1 ? { type: 'MultiSelection', elements: selEls } : null));
              }
            }
            this.isPanning = false;
            this.hasMovedDuringPan = false;
            return;
          }
        }

        // 2. Check if right-clicked on wire
        const wireEl = target.closest('.circuit-wire');
        if (wireEl) {
          e.stopPropagation();
          const wireId = parseInt(wireEl.getAttribute('data-id'));
          this.selectedConnectorId = wireId;
          this.selectedElementIds.clear();
          this.render();
          const wire = this.circuit.data.find(d => d.id === wireId);
          if (this.options.onSelect) this.options.onSelect(wire);
          this.isPanning = false;
          this.hasMovedDuringPan = false;
          return;
        }

        // 3. Right-clicked on empty canvas background
        if (this.selectedElementIds.size > 0 || this.selectedConnectorId !== null) {
          this.selectedElementIds.clear();
          this.selectedConnectorId = null;
          this.render();
          if (this.options.onSelect) this.options.onSelect(null);
        }
        this.isPanning = true;
        this.hasMovedDuringPan = false;
        this.panStart = { x: e.clientX, y: e.clientY };
        return;
      }

      // If running (isSim) or Fullscreen (isFs), right click pans but never shows context menu
      this.isPanning = true;
      this.hasMovedDuringPan = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      return;
    }

    if (!e.shiftKey && (e.button === 1 || (e.button === 0 && e.spaceKey))) {
      e.preventDefault();
      this.isPanning = true;
      this.hasMovedDuringPan = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button !== 0) return;

    // Disallow canvas panning whenever Shift is pressed
    if (e.shiftKey) {
      this.isPanning = false;
    }

    const target = e.target;

    // 1. Check if clicked terminal pin
    const pinEl = target.closest('.terminal-pin');
    if (pinEl && !this.isSimulating && !this.isReviewMode) {
      e.stopPropagation();
      const elemId = parseInt(pinEl.getAttribute('data-elem-id'));
      const nodeId = parseInt(pinEl.getAttribute('data-node-id'));
      this.onPinClicked(elemId, nodeId);
      return;
    }

    // 2. Check if clicked component
    const elemGroup = target.closest('.circuit-element');
    if (elemGroup) {
      e.stopPropagation();
      const elemId = parseInt(elemGroup.getAttribute('data-id'));
      const elem = this.circuit.data.find(d => d.id === elemId);
      if (!elem) return;

      if (this.isReviewMode) {
        if (this.isSimulating) {
          this.selectedElementIds.clear();
          this.selectedElementIds.add(elemId);
          this.selectedConnectorId = null;
          if (isPushButton(elem.svgData)) {
            this.activePressedButtonId = elem.id;
            this.engine.setButtonPressed(elem.id, true);
            this.simResult = this.engine.step({ elements: this.elements, connectors: this.connectors }, 0);
            this.updateSimulationVisuals();
            if (this.options.onButtonStateChange) {
              this.options.onButtonStateChange(elem.id, true);
            }
          } else {
            this.handleSimulationClick(elem);
          }
          this.render();
          if (this.options.onSelect) this.options.onSelect(elem);
        } else {
          if (!isPushButton(elem.svgData)) {
            this.handleSimulationClick(elem);
          }
          this.render();
          if (this.options.onSelect) this.options.onSelect(elem);
        }
        return;
      }

      if (this.isSimulating) {
        this.selectedElementIds.clear();
        this.selectedElementIds.add(elemId);
        this.selectedConnectorId = null;
        if (isPushButton(elem.svgData)) {
          this.activePressedButtonId = elem.id;
          this.engine.setButtonPressed(elem.id, true);
          this.simResult = this.engine.step({ elements: this.elements, connectors: this.connectors }, 0);
          this.updateSimulationVisuals();
          if (this.options.onButtonStateChange) {
            this.options.onButtonStateChange(elem.id, true);
          }
        } else {
          this.handleSimulationClick(elem);
        }
        this.render();
        if (this.options.onSelect) this.options.onSelect(elem);
        return;
      }

      // Edit Mode: Multi-Select via Shift + Click
      const isShift = e.shiftKey;
      const isAlreadySelected = this.selectedElementIds.has(elemId);

      if (isShift) {
        if (isAlreadySelected) {
          this.removeElementWithGroupFromSelection(elem);
        } else {
          this.addElementWithGroupToSelection(elem);
        }
        this.selectedConnectorId = null;
        this.pendingSingleSelectId = null;
      } else {
        if (!isAlreadySelected) {
          this.selectedElementIds.clear();
          this.addElementWithGroupToSelection(elem);
          this.selectedConnectorId = null;
          this.pendingSingleSelectId = null;
        } else {
          // Komponen sudah terpilih di dalam kumpulan seleksi, tandai jika user hanya klik tanpa drag
          this.pendingSingleSelectId = elemId;
        }
      }

      this.isDraggingElement = true;
      this.draggedElement = elem;
      this.hasMovedDuringDrag = false;
      this.preDragSnapshot = JSON.stringify(this.circuit.data);
      const worldPos = this.screenToWorld(e.clientX, e.clientY);
      this.dragStartWorld = { x: worldPos.x, y: worldPos.y };
      this.dragInitialPositions = new Map();
      for (const id of this.selectedElementIds) {
        const el = this.elements.find(d => d.id === id);
        if (el) {
          this.dragInitialPositions.set(id, { x: el.position.x, y: el.position.y });
        }
      }

      this.render();
      if (this.options.onSelect) {
        const selEls = this.elements.filter(d => this.selectedElementIds.has(d.id));
        this.options.onSelect(selEls.length === 1 ? selEls[0] : (selEls.length > 1 ? { type: 'MultiSelection', elements: selEls } : null));
      }
      return;
    }

    // 3. Check if clicked wire
    const wireEl = target.closest('.circuit-wire');
    if (wireEl && !this.isReviewMode) {
      e.stopPropagation();
      const wireId = parseInt(wireEl.getAttribute('data-id'));
      this.selectedConnectorId = wireId;
      this.selectedElementIds.clear();
      this.render();
      const wire = this.circuit.data.find(d => d.id === wireId);
      if (this.options.onSelect) this.options.onSelect(wire);
      return;
    }

    // 4. Background click
    if (this.isDrawingWire) {
      this.cancelWireDrawing();
      return;
    }

    // Shift + Click-Drag on canvas initiates box selection (Marquee), completely disabling canvas panning
    if (e.shiftKey && !this.isSimulating && !this.isReviewMode) {
      this.isBoxSelecting = true;
      this.isPanning = false;
      const worldPos = this.screenToWorld(e.clientX, e.clientY);
      this.boxSelectStart = { x: worldPos.x, y: worldPos.y };
      this.boxSelectEnd = { x: worldPos.x, y: worldPos.y };
      this.boxSelectInitialSelection = new Set(this.selectedElementIds);
      this.showMarquee(worldPos.x, worldPos.y, 0, 0);
      return;
    }

    if (!this.isSimulating && (this.selectedElementIds.size > 0 || this.selectedConnectorId !== null)) {
      this.selectedElementIds.clear();
      this.selectedConnectorId = null;
      this.render();
      if (this.options.onSelect) this.options.onSelect(null);
    }

    this.isPanning = true;
    this.panStart = { x: e.clientX, y: e.clientY };
  }

  onMouseMove(e) {
    if (e.shiftKey && this.isPanning) {
      this.isPanning = false;
    }

    if (this.isBoxSelecting) {
      const worldPos = this.screenToWorld(e.clientX, e.clientY);
      this.boxSelectEnd = { x: worldPos.x, y: worldPos.y };

      const minX = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
      const maxX = Math.max(this.boxSelectStart.x, this.boxSelectEnd.x);
      const minY = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
      const maxY = Math.max(this.boxSelectStart.y, this.boxSelectEnd.y);
      const width = maxX - minX;
      const height = maxY - minY;

      this.updateMarquee(minX, minY, width, height);

      if (Math.hypot(this.boxSelectEnd.x - this.boxSelectStart.x, this.boxSelectEnd.y - this.boxSelectStart.y) > 3) {
        const newSelected = new Set(this.boxSelectInitialSelection || []);
        for (const el of this.elements) {
          const compDef = COMPONENTS_DATA[el.svgData];
          const boxSize = this.getComponentBoxSize(compDef, el);
          let bw = boxSize.width;
          let bh = boxSize.height;
          const normRot = typeof normalizeRotation === 'function' ? normalizeRotation(el.rotation) : ((parseInt(el.rotation || 0) % 4 + 4) % 4);
          if (normRot % 2 !== 0) {
            const tmp = bw; bw = bh; bh = tmp;
          }
          const elMinX = el.position.x - bw / 2;
          const elMaxX = el.position.x + bw / 2;
          const elMinY = el.position.y - bh / 2;
          const elMaxY = el.position.y + bh / 2;

          const intersects = !(elMaxX < minX || elMinX > maxX || elMaxY < minY || elMinY > maxY);
          if (intersects) {
            if (el.groupId) {
              const members = this.elements.filter(m => m.groupId === el.groupId);
              members.forEach(m => newSelected.add(m.id));
            } else {
              newSelected.add(el.id);
            }
          }
        }

        let changed = newSelected.size !== this.selectedElementIds.size;
        if (!changed) {
          for (const id of newSelected) {
            if (!this.selectedElementIds.has(id)) {
              changed = true;
              break;
            }
          }
        }
        if (changed) {
          this.selectedElementIds = newSelected;
          this.render();
          this.updateMarquee(minX, minY, width, height);
        }
      }
      return;
    }

    if (this.isPanning) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      if (Math.hypot(dx, dy) > 2) {
        this.hasMovedDuringPan = true;
        if (this.options.onDismissContextMenu) {
          this.options.onDismissContextMenu();
        }
      }
      this.panX += dx;
      this.panY += dy;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.updateTransform();
      return;
    }

    if (this.isDraggingElement && this.draggedElement) {
      const worldPos = this.screenToWorld(e.clientX, e.clientY);
      const rawDx = worldPos.x - this.dragStartWorld.x;
      const rawDy = worldPos.y - this.dragStartWorld.y;

      if (!this.hasMovedDuringDrag && Math.hypot(rawDx, rawDy) > 3) {
        this.hasMovedDuringDrag = true;
        this.pendingSingleSelectId = null;
        if (this.options.onDismissContextMenu) {
          this.options.onDismissContextMenu();
        }
      }

      const dx = snapToGrid(rawDx);
      const dy = snapToGrid(rawDy);

      let changed = false;
      let hasLockedAttempt = false;
      let hasTeacherLockedAttempt = false;
      for (const [id, initPos] of this.dragInitialPositions.entries()) {
        const el = this.elements.find(d => d.id === id);
        if (el) {
          if (el.teacherLocked) {
            hasTeacherLockedAttempt = true;
            hasLockedAttempt = true;
            continue;
          } else if (el.locked) {
            hasLockedAttempt = true;
            continue;
          }
          const newX = initPos.x + dx;
          const newY = initPos.y + dy;
          if (el.position.x !== newX || el.position.y !== newY) {
            el.position.x = newX;
            el.position.y = newY;
            changed = true;
          }
        }
      }
      if (changed) {
        this.render();
      } else if (hasLockedAttempt && Math.hypot(rawDx, rawDy) > 5 && !this._lockedToastShown) {
        this._lockedToastShown = true;
        if (hasTeacherLockedAttempt && this.options.onTeacherLockedMoveAttempt) {
          this.options.onTeacherLockedMoveAttempt();
        } else if (this.options.onLockedMoveAttempt) {
          this.options.onLockedMoveAttempt();
        }
      }
      return;
    }

    if (this.isDrawingWire && this.wireStart) {
      const worldPos = this.screenToWorld(e.clientX, e.clientY);
      const targetPos = { x: snapToGrid(worldPos.x), y: snapToGrid(worldPos.y) };
      const points = routeWirePoints(
        this.wireStart.pos,
        this.wireStart.dir,
        targetPos,
        { x: 0, y: -1 },
        { start: 0, center: 0, end: 0 }
      );
      if (this.rubberbandWire) {
        this.rubberbandWire.setAttribute('d', pointsToSvgPath(points));
      }
    }
  }

  onMouseUp(e) {
    if (this.isBoxSelecting) {
      this.isBoxSelecting = false;
      this.removeMarquee();
      this.render();
      if (this.options.onSelect) {
        const selEls = this.elements.filter(d => this.selectedElementIds.has(d.id));
        this.options.onSelect(selEls.length === 1 ? selEls[0] : (selEls.length > 1 ? { type: 'MultiSelection', elements: selEls } : null));
      }
      return;
    }

    if (this.activePressedButtonId !== null) {
      const releasedId = this.activePressedButtonId;
      this.engine.setButtonPressed(releasedId, false);
      this.activePressedButtonId = null;
      if (this.isSimulating) {
        this.simResult = this.engine.step({ elements: this.elements, connectors: this.connectors }, 0);
        this.updateSimulationVisuals();
      }
      if (this.options.onButtonStateChange) {
        this.options.onButtonStateChange(releasedId, false);
      }
    }

    if (this.pendingSingleSelectId !== null && !this.hasMovedDuringDrag && !e.shiftKey) {
      const target = this.elements.find(d => d.id === this.pendingSingleSelectId);
      this.selectedElementIds.clear();
      if (target) {
        this.addElementWithGroupToSelection(target);
      }
      this.render();
      if (this.options.onSelect) {
        const selEls = this.elements.filter(d => this.selectedElementIds.has(d.id));
        this.options.onSelect(selEls.length === 1 ? selEls[0] : (selEls.length > 1 ? { type: 'MultiSelection', elements: selEls } : null));
      }
    }

    this.isPanning = false;
    if (this.isDraggingElement) {
      if (this.preDragSnapshot && this.preDragSnapshot !== JSON.stringify(this.circuit.data)) {
        if (this.undoStack.length === 0 || this.undoStack[this.undoStack.length - 1] !== this.preDragSnapshot) {
          this.undoStack.push(this.preDragSnapshot);
          if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
          this.redoStack = [];
          this.notifyHistoryChange();
          if (this.options.onCircuitChanged) this.options.onCircuitChanged();
        }
      }
      this.preDragSnapshot = null;
    }
    this.isDraggingElement = false;
    this.draggedElement = null;
    this.hasMovedDuringDrag = false;
    this.pendingSingleSelectId = null;
    this.dragInitialPositions.clear();
    this._lockedToastShown = false;
  }

  onWheel(e) {
    if (this.options.onDismissContextMenu) {
      this.options.onDismissContextMenu();
    }
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    this.zoomAt(factor, e.clientX, e.clientY);
  }

  // Pin & Wire drawing
  onPinClicked(elemId, nodeId) {
    if (this.isSimulating) return;

    const elem = this.circuit.data.find(d => d.id === elemId);
    if (!elem) return;

    const term = getTerminalWorldPos(elem, nodeId);

    if (!this.isDrawingWire) {
      this.isDrawingWire = true;
      this.wireStart = {
        elementId: elemId,
        nodeId: nodeId,
        pos: { x: term.x, y: term.y },
        dir: term.dir
      };

      if (!this.rubberbandWire) {
        this.rubberbandWire = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.rubberbandWire.setAttribute('class', 'rubberband-wire');
        this.overlayGroup.appendChild(this.rubberbandWire);
      }
      this.rubberbandWire.style.display = 'block';
    } else {
      // 1. Prevent connecting wire to the same element (self-connection)
      if (this.wireStart.elementId === elemId) {
        this.cancelWireDrawing();
        if (this.options.onSelfWireAttempt) {
          this.options.onSelfWireAttempt();
        }
        return;
      }

      // 2. Check if connection already exists
      const exists = this.connectors.some(c =>
        (c.idElementNode1 === this.wireStart.elementId && c.idNode1 === this.wireStart.nodeId &&
         c.idElementNode2 === elemId && c.idNode2 === nodeId) ||
        (c.idElementNode2 === this.wireStart.elementId && c.idNode2 === this.wireStart.nodeId &&
         c.idElementNode1 === elemId && c.idNode1 === nodeId)
      );

      if (!exists) {
        this.pushHistoryState();
        const newConnector = {
          svgData: 'text',
          type: 'Connector',
          id: this.nextId++,
          position: null,
          rotation: null,
          text: null,
          tag: null,
          comment: null,
          value: null,
          tagVisibility: true,
          margins: { start: 0.0, center: 0.0, end: 0.0 },
          idNode1: this.wireStart.nodeId,
          idNode2: nodeId,
          idElementNode1: this.wireStart.elementId,
          idElementNode2: elemId,
          valueTimeOn: 0.0,
          valueTimeOff: 0.0,
          colorType: 0,
          indexFontSize: 5,
          terminalTags: [],
          frameIndex: 0
        };
        this.circuit.data.push(newConnector);
        if (this.options.onCircuitChanged) {
          this.options.onCircuitChanged();
        }
      }

      this.cancelWireDrawing();
      this.render();
    }
  }

  cancelWireDrawing() {
    this.isDrawingWire = false;
    this.wireStart = null;
    if (this.rubberbandWire) {
      this.rubberbandWire.style.display = 'none';
    }
  }

  // Simulation handling
  startSimulation() {
    if (this.options.onDismissContextMenu) {
      this.options.onDismissContextMenu();
    }
    this.isSimulating = true;
    document.body.classList.add('mode-run');
    this.engine.reset(true);
    // Do not discard selection so properties inspector remains populated in read-only mode
    if (!this.selectedElementId) {
      const firstElem = this.circuit.data.find(d => d.type === 'ElectricalElement');
      if (firstElem) {
        this.selectedElementId = firstElem.id;
      }
    }
    this.selectedConnectorId = null;
    this.cancelWireDrawing();
    this.render();
    if (this.options.onSelect) {
      const activeElem = this.circuit.data.find(d => d.id === this.selectedElementId);
      this.options.onSelect(activeElem || null);
    }

    let lastTime = performance.now();
    const tick = (now) => {
      if (!this.isSimulating) return;
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;

      this.simResult = this.engine.step({
        elements: this.elements,
        connectors: this.connectors
      }, dt);

      this.updateSimulationVisuals();
      this.simAnimFrame = requestAnimationFrame(tick);
    };

    this.simAnimFrame = requestAnimationFrame(tick);
    this.render();
    if (this.options.onSimulationStateChange) {
      this.options.onSimulationStateChange('RUNNING');
    }
  }

  stopSimulation() {
    this.isSimulating = false;
    document.body.classList.remove('mode-run');
    if (this.simAnimFrame) {
      cancelAnimationFrame(this.simAnimFrame);
      this.simAnimFrame = null;
    }
    if (window.soundManager) {
      window.soundManager.stopAll();
    }
    if (this.activePressedButtonId !== null) {
      const releasedId = this.activePressedButtonId;
      this.activePressedButtonId = null;
      if (this.options.onButtonStateChange) {
        this.options.onButtonStateChange(releasedId, false);
      }
    }
    this.engine.reset(true);
    this.simResult = null;
    if (this.options.onShortCircuit) {
      this.options.onShortCircuit(false, null);
    }
    if (this.options.onFuseBlown) {
      this.options.onFuseBlown(false, []);
    }
    this.render();
    if (this.options.onSimulationStateChange) {
      this.options.onSimulationStateChange('STOPPED');
    }
  }

  handleSimulationClick(elem) {
    const compDef = COMPONENTS_DATA[elem.svgData];
    if (!compDef) return;

    if (isPushButton(elem.svgData)) {
      if (!this.isSimulating) return;
      this.engine.setButtonPressed(elem.id, true);
      this.simResult = this.engine.step({ elements: this.elements, connectors: this.connectors }, 0);
      this.updateSimulationVisuals();
      if (this.options.onButtonStateChange) this.options.onButtonStateChange(elem.id, true);
      setTimeout(() => {
        this.engine.setButtonPressed(elem.id, false);
        if (this.isSimulating) {
          this.simResult = this.engine.step({ elements: this.elements, connectors: this.connectors }, 0);
          this.updateSimulationVisuals();
        }
        if (this.options.onButtonStateChange) this.options.onButtonStateChange(elem.id, false);
      }, 350);
      return;
    } else if (compDef.type === 'emergency' || elem.svgData.includes('emergency')) {
      this.engine.toggleEmergency(elem.id);
      if (this.options.onSwitchClicked) {
        const elemGroup = this.elementsGroup.querySelector(`[data-id="${elem.id}"]`);
        this.options.onSwitchClicked(elem, elemGroup);
      }
    } else if (compDef.category === 'protections' || compDef.category === 'switches') {
      if (isPlainFuse(elem.svgData)) {
        const currentStored = this.engine.manualStates.get(elem.id);
        const isOff = currentStored === false;
        const newBool = isOff ? true : false;
        this.engine.manualStates.set(elem.id, newBool);
        if (newBool) {
          this.engine.fuseBlownElements.delete(elem.id);
        }
        if (this.isSimulating) {
          this.simResult = this.engine.step({ elements: this.elements, connectors: this.connectors }, 0);
          this.updateSimulationVisuals();
        } else {
          const elemGroup = this.elementsGroup.querySelector(`[data-id="${elem.id}"]`);
          if (elemGroup && this.applyFrameToElementGroup) {
            this.applyFrameToElementGroup(elemGroup, elem.id, newBool ? 0 : 1);
          }
        }
        if (this.options.onSwitchClicked) {
          const elemGroup = this.elementsGroup.querySelector(`[data-id="${elem.id}"]`);
          this.options.onSwitchClicked(elem, elemGroup);
        }
        return;
      }
      const isMultiPos = (elem.svgData === 'switch3p0' || elem.svgData === 'switch3p');
      if (!isMultiPos) {
        this.engine.toggleSwitch(elem.id, elem.svgData);
      }
      if (this.options.onSwitchClicked) {
        const elemGroup = this.elementsGroup.querySelector(`[data-id="${elem.id}"]`);
        this.options.onSwitchClicked(elem, elemGroup);
      } else if (isMultiPos) {
        this.engine.toggleSwitch(elem.id, elem.svgData);
      }
    }
  }

  isLightTheme() {
    return typeof document !== 'undefined' &&
      document.documentElement &&
      document.documentElement.getAttribute('data-theme') === 'light';
  }

  getIdleWireColor() {
    return this.isLightTheme() ? '#475569' : '#6b7280';
  }

  getBaseStrokeColor() {
    return this.isLightTheme() ? '#0f172a' : '#ffffff';
  }

  getTerminalRingColor() {
    return this.isLightTheme() ? '#f8fafc' : '#121216';
  }

  adaptCustomTextColor(rawHex) {
    if (!this.isLightTheme()) return rawHex;
    const hex = (rawHex || '').trim().toLowerCase();
    const lightMap = {
      '#ffffff': '#0f172a',
      '#f8fafc': '#0f172a',
      '#f3f4f6': '#0f172a',
      '#e2e8f0': '#1e293b',
      '#cbd5e1': '#334155',
      '#93c5fd': '#1d4ed8',
      '#60a5fa': '#1d4ed8',
      '#38bdf8': '#0369a1',
      '#facc15': '#b45309',
      '#fde047': '#b45309',
      '#fbbf24': '#b45309',
      '#34d399': '#047857',
      '#4ade80': '#15803d',
      '#a78bfa': '#6d28d9',
      '#f87171': '#b91c1c'
    };
    return lightMap[hex] || rawHex;
  }

  updateSimulationVisuals() {
    if (!this.simResult || !this.isSimulating) return;

    // Acoustic / Audio Engine Feedback
    if (window.soundManager) {
      window.soundManager.update(this.simResult, this.elements);
    }

    // Check Short Circuit & Earth Leakage
    if (this.simResult.shortCircuit || this.simResult.isEarthLeakage) {
      const isDcOverheat = !!this.simResult.isDcOverheat;
      const isEarthLeakage = !!this.simResult.isEarthLeakage;
      if (this.options.onShortCircuit) {
        this.options.onShortCircuit(true, {
          isDcOverheat,
          isEarthLeakage,
          isShortCircuit: !!this.simResult.shortCircuit
        });
      }
    } else {
      if (this.options.onShortCircuit) this.options.onShortCircuit(false, null);
    }

    // Check Fuse Blown
    if (this.simResult.newlyBlownFuses && this.simResult.newlyBlownFuses.length > 0) {
      if (typeof window.playFuseBlownSound === 'function') {
        window.playFuseBlownSound();
      }
    }
    if (this.options.onFuseBlown) {
      this.options.onFuseBlown(!!this.simResult.isFuseBlown, this.simResult.newlyBlownFuses);
    }

    // Check Auto-Tripped Breakers (MCB/MPCB/TM/RCBO short circuit & RCCB/RCBO earth leakage)
    if (this.simResult.newlyTrippedBreakers && this.simResult.newlyTrippedBreakers.length > 0) {
      if (window.soundManager && typeof window.soundManager.playOneShot === 'function') {
        window.soundManager.playOneShot('switch', 0.95);
      } else if (typeof window.playFuseBlownSound === 'function') {
        window.playFuseBlownSound();
      }
    }
    if (this.options.onBreakerTripped) {
      this.options.onBreakerTripped(
        this.simResult.trippedBreakerTags || [],
        this.simResult.trippedEarthLeakageTags || [],
        this.simResult.newlyTrippedBreakers || []
      );
    }

    // Set of pins belonging to DC Overheat shorted nets
    const dcOverheatPins = new Set();
    if (this.simResult.isDcOverheat && this.simResult.shortedNets) {
      for (const sn of this.simResult.shortedNets) {
        if (sn.isDcOverheat && sn.pins) {
          sn.pins.forEach(p => dcOverheatPins.add(p));
        }
      }
    }

    // Update wire colors and glow (Per-Net fault coloring: only faulted net glows orange/red)
    const wirePaths = this.wiresGroup.querySelectorAll('.circuit-wire path');
    wirePaths.forEach(path => {
      const connId = parseInt(path.getAttribute('data-id'));
      const pot = this.simResult.wirePotentials.get(connId) || Potential.NONE;
      const color = getPotentialColor(pot);
      path.setAttribute('stroke', color);

      // Check if wire is part of DC Overheat or AC Short / Earth Fault net
      const wireElem = this.circuit.data.find(d => d.id === connId && d.type === 'Connector');
      const isOverheatedWire = (pot === Potential.DC_OVERHEAT) || (wireElem && dcOverheatPins.size > 0 &&
        (dcOverheatPins.has(`${wireElem.idElementNode1}:${wireElem.idNode1}`) ||
         dcOverheatPins.has(`${wireElem.idElementNode2}:${wireElem.idNode2}`)));
      const isAcShortWire = !isOverheatedWire && (pot === Potential.AC_SHORT);

      if (isOverheatedWire) {
        path.classList.add('wire-dc-overheat');
        path.classList.remove('wire-ac-short');
      } else if (isAcShortWire) {
        path.classList.add('wire-ac-short');
        path.classList.remove('wire-dc-overheat');
      } else {
        path.classList.remove('wire-dc-overheat');
        path.classList.remove('wire-ac-short');
      }

      const isLight = this.isLightTheme();
      if (pot !== Potential.NONE && this.enableWireGlow) {
        path.classList.add('wire-energized');
        if (!isOverheatedWire && !isAcShortWire) {
          path.style.filter = isLight ? 'none' : `drop-shadow(0 0 6px ${color})`;
        }
      } else {
        path.classList.remove('wire-energized');
        if (!isOverheatedWire && !isAcShortWire) {
          path.style.filter = 'none';
        }
      }
    });

    // Update terminal pins and junction dots in pinsGroup
    if (this.pinsGroup) {
      const isLight = this.isLightTheme();
      const ringColor = this.getTerminalRingColor();
      const idleDotColor = isLight ? '#64748b' : '#94a3b8';
      const pinDots = this.pinsGroup.querySelectorAll('.terminal-dot');
      pinDots.forEach(dot => {
        const connIdsAttr = dot.getAttribute('data-conn-ids');
        if (!connIdsAttr) return;
        const connIds = connIdsAttr.split(',').filter(Boolean).map(id => parseInt(id));
        if (connIds.length === 0) return;

        // Determine active potential on this pin
        let activePot = Potential.NONE;
        for (const cid of connIds) {
          const pot = this.simResult.wirePotentials.get(cid) || Potential.NONE;
          if (pot !== Potential.NONE) {
            activePot = pot;
            break;
          }
        }

        const color = getPotentialColor(activePot);
        if (activePot !== Potential.NONE) {
          dot.setAttribute('fill', color);
          dot.setAttribute('stroke', ringColor);
        } else {
          dot.setAttribute('fill', idleDotColor);
          dot.setAttribute('stroke', ringColor);
        }
      });
    }

    // Update element frame visuals
    const elemGroups = this.elementsGroup.querySelectorAll('.circuit-element');
    elemGroups.forEach(group => {
      const elemId = parseInt(group.getAttribute('data-id'));
      const frameIdx = this.simResult.elementFrames.get(elemId) || 0;
      this.applyFrameToElementGroup(group, elemId, frameIdx);

      // Update live timer countdown badge if present
      const timerBadge = group.querySelector('.element-timer-badge');
      if (timerBadge && this.simResult.timerStates) {
        const tState = this.simResult.timerStates.get(elemId);
        const elem = this.circuit.data.find(d => d.id === elemId);
        if (tState) {
          const isFlasher = (elem && (elem.svgData === 'coilFlasher' || elem.svgData === 'flasher'));
          if (isFlasher && tState.isTiming) {
            const tOn = tState.presetMs || 1000;
            const tOff = tState.presetOffMs || tOn;
            if (tState.elapsedMs < tOn) {
              const remain = Math.max(0, (tOn - tState.elapsedMs) / 1000);
              timerBadge.textContent = `⚡ ON ${remain.toFixed(1)}s`;
              timerBadge.setAttribute('fill', '#ef4444');
            } else {
              const remain = Math.max(0, (tOn + tOff - tState.elapsedMs) / 1000);
              timerBadge.textContent = `⏱ OFF ${remain.toFixed(1)}s`;
              timerBadge.setAttribute('fill', '#f59e0b');
            }
          } else if (tState.isTiming) {
            const remain = Math.max(0, (tState.presetMs - tState.elapsedMs) / 1000);
            timerBadge.textContent = `⏱ ${remain.toFixed(1)}s`;
            timerBadge.setAttribute('fill', '#f59e0b');
          } else if (tState.outputState) {
            timerBadge.textContent = `⏱ ON`;
            timerBadge.setAttribute('fill', '#ef4444');
          } else {
            const presetSec = (tState.presetMs / 1000).toFixed(1);
            timerBadge.textContent = `⏱ ${presetSec}s`;
            timerBadge.setAttribute('fill', '#94a3b8');
          }
        }
      }
    });
  }

  applyFrameToElementGroup(group, elemId, frameIdx) {
    const elem = this.circuit.data.find(d => d.id === elemId);
    if (!elem) return;
    const compDef = COMPONENTS_DATA[elem.svgData];
    if (!compDef || !compDef.frames) return;

    // Special handling for Motors: Keep rotor fill centered and spin arrow indicator
    if (compDef.category === 'motors') {
      const fillPath1 = group.querySelector('#fillPath1, [id="fillPath1"]');
      const strokePath1 = group.querySelector('#strokePath1, [id="strokePath1"]');
      const pathFill3 = group.querySelector('#pathFill3, [id="pathFill3"]');
      const pathFill4 = group.querySelector('#pathFill4, [id="pathFill4"]');
      const strokePath2 = group.querySelector('#strokePath2, [id="strokePath2"]');
      const strokePath3 = group.querySelector('#strokePath3, [id="strokePath3"]');
      const indicatorGroup = group.querySelector('.motor-indicator-group');

      const isLight = this.isLightTheme();
      const baseInk = this.getBaseStrokeColor();
      const motorMain = group.querySelector('#mainPath1, [id="mainPath1"], #mainPath');
      const motorText = group.querySelector('#textPath1, [id="textPath1"]');
      if (motorMain) motorMain.style.stroke = baseInk;

      // Determine arrowhead paths (motorDC has swapped IDs compared to other motor SVGs)
      const isMotorDC = (elem.svgData === 'motorDC');
      const isTwoSpeedMotor = (elem.svgData === 'motorDhalander' || elem.svgData === 'motorTwoSpeeds');
      const isModeMotor = (elem.svgData === 'motorStarDelta' || isTwoSpeedMotor);
      const cwArrow = isMotorDC ? pathFill4 : pathFill3;
      const ccwArrow = isMotorDC ? pathFill3 : pathFill4;

      if (frameIdx === 0) {
        if (fillPath1) fillPath1.style.display = 'none';
        if (strokePath1) strokePath1.style.display = 'none';
        if (pathFill3) pathFill3.style.display = 'none';
        if (pathFill4) pathFill4.style.display = 'none';
        if (strokePath2) strokePath2.style.display = 'none';
        if (strokePath3) strokePath3.style.display = 'none';
        if (indicatorGroup) indicatorGroup.style.display = 'none';
        if (motorText) motorText.style.fill = baseInk;
        group.classList.remove('motor-spin-cw', 'motor-spin-ccw', 'motor-spin-fast');
      } else if (frameIdx === 5) {
        // Dual-winding conflict / stall (red warning rotor body, stopped)
        if (fillPath1) {
          fillPath1.style.display = 'inline';
          fillPath1.style.fill = '#ef4444';
          fillPath1.style.opacity = '0.92';
        }
        if (strokePath1) strokePath1.style.display = 'none';
        if (pathFill3) pathFill3.style.display = 'none';
        if (pathFill4) pathFill4.style.display = 'none';
        if (strokePath2) strokePath2.style.display = 'none';
        if (strokePath3) strokePath3.style.display = 'none';
        if (indicatorGroup) indicatorGroup.style.display = 'none';
        if (motorText) motorText.style.fill = '#ffffff';
        group.classList.remove('motor-spin-cw', 'motor-spin-ccw', 'motor-spin-fast');
      } else if (frameIdx >= 1 && frameIdx <= 4) {
        const isCW = (frameIdx === 1 || frameIdx === 3);
        const isMode2 = (frameIdx === 3 || frameIdx === 4); // Delta (Δ) or Speed 2 (2)
        if (fillPath1) {
          fillPath1.style.display = 'inline';
          fillPath1.style.fill = '#facc15';
          fillPath1.style.opacity = isLight ? '0.95' : '0.92';
        }
        if (motorText) motorText.style.fill = isLight ? '#0f172a' : '#ffffff';
        if (strokePath1) strokePath1.style.display = 'inline';
        if (cwArrow) cwArrow.style.display = isCW ? 'inline' : 'none';
        if (ccwArrow) ccwArrow.style.display = isCW ? 'none' : 'inline';
        if (isModeMotor) {
          // strokePath2 = 'Y' / '1' (frames 1-2), strokePath3 = 'Δ' / '2' (frames 3-4)
          if (strokePath2) strokePath2.style.display = isMode2 ? 'none' : 'inline';
          if (strokePath3) {
            strokePath3.style.display = isMode2 ? 'inline' : 'none';
            if (elem.svgData === 'motorStarDelta') {
              strokePath3.style.fill = isLight ? '#b91c1c' : '#ffffff';
            }
          }
        } else {
          if (strokePath2) strokePath2.style.display = 'inline';
          if (strokePath3) strokePath3.style.display = 'inline';
        }
        if (indicatorGroup) indicatorGroup.style.display = 'inline';
        group.classList.toggle('motor-spin-cw', isCW);
        group.classList.toggle('motor-spin-ccw', !isCW);
        group.classList.toggle('motor-spin-fast', isTwoSpeedMotor && isMode2);
      }
      return;
    }

    const baseStroke = this.getBaseStrokeColor();
    const p1 = group.querySelector('#mainPath1, [id="mainPath1"], #mainPath');
    const p2 = group.querySelector('#mainPath2, [id="mainPath2"]');
    const p3 = group.querySelector('#mainPath3, [id="mainPath3"]');
    const fill1 = group.querySelector('#mainFill1');
    const hasPath3 = !!p3;
    const hasPath2 = !!p2;

    // Helper to find live wire color connected to this element
    const getLiveColor = () => {
      if (this.isSimulating && this.simResult && this.simResult.wirePotentials) {
        for (const c of this.circuit.data) {
          if ((c.type === 'Connector' || c.type === 'wire') && (c.idElementNode1 == elemId || c.idElementNode2 == elemId)) {
            const pot = this.simResult.wirePotentials.get(c.id) || this.simResult.wirePotentials.get(parseInt(c.id)) || Potential.NONE;
            if (pot !== Potential.NONE) {
              let col = getPotentialColor(pot);
              if (col !== '#6b7280' && col !== '#475569' && col !== '#94b8de') {
                if (col === '#1e293b') col = '#38bdf8';
                return col;
              }
            }
          }
        }
      }
      return baseStroke;
    };

    // Check if this component has multiple contact variant paths (e.g. contactNO, contactNC, contactCON)
    const hasVariantPaths = !!group.querySelector('#mainPath1_2, [id="mainPath1_2"]');
    if (hasVariantPaths) {
      let variantIdx = 0;
      if (elem.tag) {
        const normTag = elem.tag.trim();
        const master = this.circuit.data.find(d => d.id !== elem.id && d.tag && d.tag.trim() === normTag && d.type === 'ElectricalElement');
        if (master) {
          if (master.svgData === 'coilDelayOn') {
            variantIdx = 1;
          } else if (master.svgData === 'coilDelayOff') {
            variantIdx = 2;
          } else if (master.svgData === 'coilDelayOnOff' || master.svgData === 'coilFlasher' || master.svgData === 'flasher') {
            variantIdx = 3;
          } else if (master.svgData.startsWith('overload') || master.svgData.includes('thermal') || normTag.startsWith('-F')) {
            variantIdx = 4;
          }
        } else if (normTag.startsWith('-KT')) {
          variantIdx = (elem.terminalTags && (elem.terminalTags.includes('17') || elem.terminalTags.includes('18'))) ? 1 : 1;
        } else if (normTag.startsWith('-F')) {
          variantIdx = 4;
        }
      }

      const variantPairs = [
        { normal: 'mainPath1',   active: 'mainPath2'   }, // 0: Standard Contactor
        { normal: 'mainPath1_2', active: 'mainPath2_2' }, // 1: Delay ON
        { normal: 'mainPath1_3', active: 'mainPath2_3' }, // 2: Delay OFF
        { normal: 'mainPath1_4', active: 'mainPath2_4' }, // 3: Delay ON-OFF / Flasher
        { normal: 'mainPath1_5', active: 'mainPath2_5' }  // 4: Thermal Overload (97-98 / 95-96)
      ];

      const allPathIds = [
        'mainPath1',   'mainPath2',
        'mainPath1_2', 'mainPath2_2',
        'mainPath1_3', 'mainPath2_3',
        'mainPath1_4', 'mainPath2_4',
        'mainPath1_5', 'mainPath2_5'
      ];

      const isCON = (elem.svgData && (elem.svgData.includes('CON') || elem.svgData.includes('Crossover'))) ||
                   (compDef && compDef.contacts && compDef.contacts.length >= 2 && compDef.contacts.some(c => c.type === 'nc') && compDef.contacts.some(c => c.type === 'no'));
      const isNC = (elem.svgData && elem.svgData.includes('NC') && !elem.svgData.includes('NONC')) ||
                   (compDef && compDef.contacts && compDef.contacts.length > 0 && compDef.contacts.every(c => c.type === 'nc'));
      const isContactClosed = isCON ? true : (isNC ? (frameIdx === 0) : (frameIdx === 1));
      const chosenPair = variantPairs[variantIdx] || variantPairs[0];
      const targetId = (frameIdx === 1) ? chosenPair.active : chosenPair.normal;
      const liveCol = getLiveColor();
      const shouldColorLive = this.isSimulating && isContactClosed && (liveCol !== baseStroke);

      allPathIds.forEach(pid => {
        const p = group.querySelector(`#${pid}, [id="${pid}"]`);
        if (p) {
          if (pid === targetId) {
            p.style.display = 'inline';
            p.style.stroke = shouldColorLive ? liveCol : baseStroke;
            p.style.strokeWidth = shouldColorLive ? '2.8px' : '2px';
            p.removeAttribute('hidden');
          } else {
            p.style.display = 'none';
          }
        }
      });
      return;
    }

    if (hasPath3) {
      // Multi-position 3P switch (switch3p0 or switch3p)
      const liveCol = getLiveColor();
      const isSwitch3p0 = (elem.svgData === 'switch3p0');
      const p1Closed = (frameIdx === 0);
      const p2Closed = isSwitch3p0 ? false : (frameIdx === 1);
      const p3Closed = isSwitch3p0 ? (frameIdx === 2) : (frameIdx === 2);

      if (p1) {
        p1.style.display = frameIdx === 0 ? 'inline' : 'none';
        p1.style.stroke = (this.isSimulating && frameIdx === 0 && p1Closed && liveCol !== baseStroke) ? liveCol : baseStroke;
        p1.style.strokeWidth = (this.isSimulating && frameIdx === 0 && p1Closed && liveCol !== baseStroke) ? '2.8px' : '2px';
      }
      if (p2) {
        p2.style.display = frameIdx === 1 ? 'inline' : 'none';
        p2.style.stroke = (this.isSimulating && frameIdx === 1 && p2Closed && liveCol !== baseStroke) ? liveCol : baseStroke;
        p2.style.strokeWidth = (this.isSimulating && frameIdx === 1 && p2Closed && liveCol !== baseStroke) ? '2.8px' : '2px';
      }
      if (p3) {
        p3.style.display = frameIdx === 2 ? 'inline' : 'none';
        p3.style.stroke = (this.isSimulating && frameIdx === 2 && p3Closed && liveCol !== baseStroke) ? liveCol : baseStroke;
        p3.style.strokeWidth = (this.isSimulating && frameIdx === 2 && p3Closed && liveCol !== baseStroke) ? '2.8px' : '2px';
      }
      return;
    }

    const isCON = (elem.svgData && (elem.svgData.includes('CON') || elem.svgData.includes('Crossover'))) ||
                 (compDef && compDef.contacts && compDef.contacts.length >= 2 && compDef.contacts.some(c => c.type === 'nc') && compDef.contacts.some(c => c.type === 'no'));
    const isNC = (elem.svgData && elem.svgData.includes('NC') && !elem.svgData.includes('NONC')) ||
                 (compDef && compDef.contacts && compDef.contacts.length > 0 && compDef.contacts.every(c => c.type === 'nc'));
    const isPlainF = isPlainFuse(elem.svgData);
    const isArrow = (elem.svgData === 'arrowSource' || elem.svgData === 'arrowDestination');
    const isOverload = isOverloadRelay(elem.svgData);
    const isContactClosed = (isPlainF || isOverload) ? (frameIdx === 0) : (isArrow ? true : (isCON ? true : (isNC ? (frameIdx === 0) : (frameIdx === 1))));
    const liveCol = getLiveColor();
    const shouldColorLive = this.isSimulating && isContactClosed && (liveCol !== baseStroke);

    if (frameIdx === 0) {
      // Normal state (Frame 0: Closed for NC, Open for NO)
      if (p1) {
        p1.style.display = 'inline';
        p1.style.stroke = shouldColorLive ? liveCol : baseStroke;
        p1.style.strokeWidth = shouldColorLive ? '2.8px' : '2px';
      }
      if (p2) {
        p2.style.display = 'none';
        p2.style.stroke = baseStroke;
        p2.style.strokeWidth = '2px';
      }
      if (fill1) {
        fill1.style.display = 'none';
      }
      group.classList.remove('motor-spin-cw', 'motor-spin-ccw', 'lamp-lit', 'coil-energized', 'coil-timing');

    } else if (frameIdx === 1) {
      // Actuated state (Frame 1: Open for NC, Closed for NO)
      if (hasPath2) {
        // Switches, contactors, breakers: toggle open path (p1) off, show closed path (p2) on
        if (p1) p1.style.display = 'none';
        if (p2) {
          p2.style.display = 'inline';
          p2.style.stroke = shouldColorLive ? liveCol : baseStroke;
          p2.style.strokeWidth = shouldColorLive ? '2.8px' : '2px';
          p2.style.strokeLinecap = 'round';
        }
      } else {
        // Coils, lamps, buzzers, loads: DO NOT HIDE mainPath1!
        // mainPath1 contains the physical terminal leads and housing outline!
        if (p1) {
          p1.style.display = 'inline';
          p1.style.stroke = baseStroke;
          p1.style.strokeWidth = '2px';
        }
      }

      const tState = (this.isSimulating && this.simResult && this.simResult.timerStates)
        ? this.simResult.timerStates.get(elemId)
        : null;

      if (fill1) {
        fill1.style.display = 'inline';
        if (compDef.category === 'loads') {
          const elemItem = this.elements.find(e => e.id === elemId) || this.circuit.data.find(d => d.id === elemId);
          const colorKey = (elemItem && elemItem.lampColor) ? elemItem.lampColor : 'yellow';
          const lampColorCfg = (window.LAMP_COLORS && window.LAMP_COLORS[colorKey]) ? window.LAMP_COLORS[colorKey] : { hex: '#fbbf24', filter: 'drop-shadow(0 0 14px rgba(251, 191, 36, 0.95))' };
          fill1.style.setProperty('fill', lampColorCfg.hex, 'important');
          fill1.style.setProperty('opacity', '0.94', 'important');
          fill1.style.setProperty('filter', lampColorCfg.filter, 'important');
        } else if (compDef.category === 'coils') {
          if (elem.svgData === 'coilFlasher' || elem.svgData === 'flasher') {
            fill1.style.fill = '#ef4444';
            fill1.style.opacity = '0.9';
            fill1.style.filter = 'drop-shadow(0 0 10px #ef4444)';
          } else if (tState && tState.isTiming) {
            fill1.style.fill = '#f59e0b';
            fill1.style.opacity = '0.85';
            fill1.style.filter = 'drop-shadow(0 0 10px #f59e0b)';
          } else {
            fill1.style.fill = '#ef4444';
            fill1.style.opacity = '0.85';
            fill1.style.filter = 'drop-shadow(0 0 8px #ef4444)';
          }
        } else {
          fill1.style.fill = '#22c55e';
          fill1.style.opacity = '0.85';
        }
      }

      if (compDef.category === 'coils') {
        if (elem.svgData === 'coilFlasher' || elem.svgData === 'flasher') {
          group.classList.add('coil-energized');
          group.classList.remove('coil-timing');
        } else if (tState && tState.isTiming) {
          group.classList.add('coil-timing');
          group.classList.remove('coil-energized');
        } else {
          group.classList.remove('coil-timing');
          group.classList.add('coil-energized');
        }
      }
      if (compDef.category === 'loads') group.classList.add('lamp-lit');
      if (compDef.category === 'motors') group.classList.add('motor-spin-cw');

    } else if (frameIdx === 2) {
      if (compDef.category === 'motors') {
        group.classList.remove('motor-spin-cw');
        group.classList.add('motor-spin-ccw');
      }
    }

    // Update unlit indicator dot for lamps
    const unlitDot = group.querySelector('.lamp-unlit-indicator');
    if (unlitDot) {
      const elemItem = this.elements.find(e => e.id === elemId) || this.circuit.data.find(d => d.id === elemId);
      const colorKey = (elemItem && elemItem.lampColor) ? elemItem.lampColor : 'yellow';
      const lampColorCfg = (window.LAMP_COLORS && window.LAMP_COLORS[colorKey]) ? window.LAMP_COLORS[colorKey] : { hex: '#fbbf24' };
      unlitDot.setAttribute('fill', lampColorCfg.hex);
      unlitDot.style.display = (frameIdx === 1) ? 'none' : 'inline';
    }
  }

  // Main rendering method
  render() {
    this.wiresGroup.innerHTML = '';
    this.elementsGroup.innerHTML = '';
    if (this.pinsGroup) this.pinsGroup.innerHTML = '';
    if (this.overlayGroup) this.overlayGroup.innerHTML = '';

    const elements = this.elements;
    const connectors = this.connectors;

    // Build terminal connection map: key = `${elemId}:${nodeId}` -> array of connector IDs
    const termConnectionMap = new Map();
    for (const c of connectors) {
      const k1 = `${c.idElementNode1}:${c.idNode1}`;
      const k2 = `${c.idElementNode2}:${c.idNode2}`;
      if (!termConnectionMap.has(k1)) termConnectionMap.set(k1, []);
      if (!termConnectionMap.has(k2)) termConnectionMap.set(k2, []);
      termConnectionMap.get(k1).push(c.id);
      termConnectionMap.get(k2).push(c.id);
    }

    // 1. Render Wires (Underneath components and pins)
    for (const c of connectors) {
      const el1 = elements.find(e => e.id === c.idElementNode1);
      const el2 = elements.find(e => e.id === c.idElementNode2);
      if (!el1 || !el2) continue;

      const pA = getTerminalWorldPos(el1, c.idNode1);
      const pB = getTerminalWorldPos(el2, c.idNode2);
      const points = routeWirePoints(pA, pA.dir, pB, pB.dir, c.margins);

      const isSelected = this.selectedConnectorId === c.id;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `circuit-wire ${isSelected ? 'wire-selected' : ''}`);
      g.setAttribute('data-id', c.id);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pointsToSvgPath(points));
      path.setAttribute('data-id', c.id);
      path.setAttribute('stroke', this.getIdleWireColor());
      path.setAttribute('stroke-width', isSelected ? '4' : '2.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');

      g.appendChild(path);
      this.wiresGroup.appendChild(g);
    }

    // 2. Render Elements
    for (const el of elements) {
      const compDef = COMPONENTS_DATA[el.svgData];
      if (!compDef) continue;

      const isSelected = (this.selectedElementIds && this.selectedElementIds.size > 0)
        ? this.selectedElementIds.has(el.id)
        : (this.selectedElementId === el.id);
      const isInteractive = (
        compDef.type === 'button' ||
        compDef.type === 'emergency' ||
        compDef.category === 'switches' ||
        compDef.category === 'protections'
      );

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `circuit-element ${isSelected ? 'element-selected' : ''} ${el.locked ? 'element-locked' : ''}`);
      g.setAttribute('data-id', el.id);
      g.setAttribute('data-interactive', isInteractive ? 'true' : 'false');
      if (el.groupId) {
        g.setAttribute('data-group-id', el.groupId);
      }

      const normRot = typeof normalizeRotation === 'function' ? normalizeRotation(el.rotation) : ((parseInt(el.rotation || 0) % 4 + 4) % 4);
      const angle = normRot * 90;
      g.setAttribute('transform', `translate(${el.position.x}, ${el.position.y}) rotate(${angle})`);

      // Component dimensions (dynamically scaled for text elements & tight bounds for single-column components)
      const boxSize = this.getComponentBoxSize(compDef, el);
      let boxWidth = boxSize.width;
      let boxHeight = boxSize.height;

      // Component Hitbox (Generous touch target covering entire component box)
      const pad = 12;
      const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hitbox.setAttribute('class', 'component-hitbox');
      hitbox.setAttribute('x', -boxWidth / 2 - pad);
      hitbox.setAttribute('y', -boxHeight / 2 - pad);
      hitbox.setAttribute('width', boxWidth + pad * 2);
      hitbox.setAttribute('height', boxHeight + pad * 2);
      hitbox.setAttribute('rx', '8');
      hitbox.setAttribute('fill', 'rgba(0, 0, 0, 0.001)');
      hitbox.setAttribute('pointer-events', 'all');
      g.appendChild(hitbox);

      // Selection bounding box in Edit Mode
      if (isSelected && !this.isSimulating) {
        const selBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        selBox.setAttribute('x', -boxWidth / 2 - 8);
        selBox.setAttribute('y', -boxHeight / 2 - 8);
        selBox.setAttribute('width', boxWidth + 16);
        selBox.setAttribute('height', boxHeight + 16);
        selBox.setAttribute('class', `selection-box ${el.groupId ? 'selection-box-grouped' : ''} ${el.locked ? 'selection-box-locked' : ''}`);
        g.appendChild(selBox);
      }

      // Render Lock Indicator Badge in Edit Mode when element position is locked
      if ((el.teacherLocked || el.locked) && !this.isSimulating) {
        const lockBadge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        lockBadge.setAttribute('class', `element-lock-badge ${el.teacherLocked ? 'element-teacher-lock-badge' : ''}`);
        lockBadge.setAttribute('pointer-events', 'none');
        const bx = boxWidth / 2 + 4;
        const by = -boxHeight / 2 - 4;
        lockBadge.setAttribute('transform', `translate(${bx}, ${by}) rotate(${-angle})`);
        if (el.teacherLocked) {
          lockBadge.innerHTML = `
            <circle cx="0" cy="0" r="10" fill="#064e3b" stroke="#10b981" stroke-width="2" />
            <path d="M-3.5 -0.5 h7 v4.5 h-7 z M-2.5 -0.5 v-2 a2.5 2.5 0 0 1 5 0 v2" fill="none" stroke="#34d399" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          `;
        } else {
          lockBadge.innerHTML = `
            <circle cx="0" cy="0" r="9" fill="#1e293b" stroke="#f59e0b" stroke-width="1.8" />
            <path d="M-3.5 -0.5 h7 v4 h-7 z M-2.5 -0.5 v-2 a2.5 2.5 0 0 1 5 0 v2" fill="none" stroke="#f59e0b" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          `;
        }
        g.appendChild(lockBadge);
      }

      // Graphic wrapper or Text Display centered around (0, 0)
      if (el.svgData === 'text') {
        const textG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        textG.setAttribute('pointer-events', 'none');
        textG.setAttribute('transform', `rotate(${-angle})`);

        const fontSize = el.fontSize || el.indexFontSize || 24;
        const displayText = el.comment || el.tag || 'Teks';
        const colorVal = this.adaptCustomTextColor(el.textColor || el.color || '#93c5fd');

        const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        titleText.setAttribute('class', 'element-custom-text');
        titleText.setAttribute('x', '0');
        titleText.setAttribute('y', '0');
        titleText.setAttribute('text-anchor', 'middle');
        titleText.setAttribute('dominant-baseline', 'central');
        titleText.setAttribute('fill', colorVal);
        titleText.setAttribute('font-size', `${fontSize}px`);
        titleText.setAttribute('font-weight', '700');
        titleText.setAttribute('letter-spacing', '0.5px');
        titleText.textContent = displayText;
        textG.appendChild(titleText);
        g.appendChild(textG);
      } else {
        const svgWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        svgWrapper.setAttribute('transform', `translate(${-compDef.width / 2}, ${-compDef.height / 2})`);
        svgWrapper.setAttribute('pointer-events', 'none');
        let gfxHtml = compDef.graphics;
        if (this.isLightTheme()) {
          gfxHtml = gfxHtml
            .replace(/stroke:\s*(?:#ffffff|#f9f9f9|#fff\b|white)/gi, 'stroke:#0f172a')
            .replace(/fill:\s*(?:#ffffff|#f9f9f9|#fff\b|white)/gi, 'fill:#0f172a')
            .replace(/stroke:\s*#00ffff/gi, 'stroke:#0284c7');
        }
        svgWrapper.innerHTML = gfxHtml;

        // Group motor rotation arrows ONLY into a dedicated indicator group with origin at motor center
        // Keep strokePath2 (Y/1) and strokePath3 (Delta/2) stationary inside svgWrapper
        if (compDef.category === 'motors') {
          const cx = (compDef.width || 180) / 2;
          const cy = 90;
          const rotatableIds = ['strokePath1', 'pathFill3', 'pathFill4'];
          const elementsToGroup = [];
          rotatableIds.forEach(id => {
            const pathEl = svgWrapper.querySelector(`#${id}, [id="${id}"]`);
            if (pathEl) elementsToGroup.push(pathEl);
          });
          if (elementsToGroup.length > 0) {
            const indG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            indG.setAttribute('class', 'motor-indicator-group');
            indG.style.transformOrigin = `${cx}px ${cy}px`;
            elementsToGroup[0].parentNode.insertBefore(indG, elementsToGroup[0]);
            elementsToGroup.forEach(el => indG.appendChild(el));
          }
        }
        g.appendChild(svgWrapper);

        // Tag Label (e.g. -KM1)
        if (el.tag && el.tagVisibility !== false) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('class', 'element-tag');
          text.setAttribute('x', 0);
          text.setAttribute('y', -compDef.height / 2 - 12);
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('transform', `rotate(${-angle}, 0, ${-compDef.height / 2 - 12})`);
          text.textContent = el.tag;
          g.appendChild(text);
        }

        // Timer Badge for Timers / Flasher (e.g. ⏱ 2.0s)
        if (compDef.category === 'coils' && (compDef.timerType || el.svgData.includes('Delay') || el.svgData === 'coilFlasher')) {
          const tText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          tText.setAttribute('class', 'element-timer-badge');
          tText.setAttribute('x', '0');
          tText.setAttribute('y', -compDef.height / 2 - 25);
          tText.setAttribute('text-anchor', 'middle');
          tText.setAttribute('transform', `rotate(${-angle}, 0, ${-compDef.height / 2 - 25})`);
          tText.setAttribute('fill', '#94a3b8');
          tText.setAttribute('font-size', '10px');
          tText.setAttribute('font-weight', '700');
          tText.setAttribute('font-family', 'monospace');
          tText.setAttribute('letter-spacing', '0.5px');
          const presetSec = (el.valueTimeOn !== undefined && el.valueTimeOn !== null) ? Number(el.valueTimeOn).toFixed(1) : '2.0';
          tText.textContent = `⏱ ${presetSec}s`;
          g.appendChild(tText);
        }

        // Comment Label (e.g. "Main Motor Contactor")
        if (el.comment) {
          const cText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          cText.setAttribute('class', 'element-comment');
          cText.setAttribute('x', 0);
          cText.setAttribute('y', compDef.height / 2 + 18);
          cText.setAttribute('text-anchor', 'middle');
          cText.setAttribute('transform', `rotate(${-angle}, 0, ${compDef.height / 2 + 18})`);
          cText.textContent = el.comment;
          g.appendChild(cText);
        }

        // Pilot Lamp Unlit Color Indicator Dot (centered in X)
        if (el.svgData === 'lamp' || el.svgData === 'lampBlink') {
          const colorKey = el.lampColor || 'yellow';
          const lampColorCfg = (window.LAMP_COLORS && window.LAMP_COLORS[colorKey]) ? window.LAMP_COLORS[colorKey] : { hex: '#fbbf24' };
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('class', 'lamp-unlit-indicator');
          dot.setAttribute('cx', '0');
          dot.setAttribute('cy', '0');
          dot.setAttribute('r', '5');
          dot.setAttribute('fill', lampColorCfg.hex);
          dot.setAttribute('stroke', '#1e293b');
          dot.setAttribute('stroke-width', '1.5');
          g.appendChild(dot);
        }
      }

      this.elementsGroup.appendChild(g);

      // Apply initial frame to guarantee clean single-frame display (never show multiple/inkscape frames)
      let initialFrame = 0;
      if (el.svgData === 'switch3p0') {
        const stored = (this.engine && this.engine.manualStates) ? this.engine.manualStates.get(el.id) : undefined;
        initialFrame = (stored !== undefined) ? stored : 1; // 1 = Posisi 0 (Netral / OFF)
      } else if (el.svgData === 'switch3p') {
        const stored = (this.engine && this.engine.manualStates) ? this.engine.manualStates.get(el.id) : undefined;
        initialFrame = (stored !== undefined) ? stored : 0;
      } else if (isPlainFuse(el.svgData)) {
        const stored = (this.engine && this.engine.manualStates) ? this.engine.manualStates.get(el.id) : undefined;
        // Plain Fuse: stored === false -> OFF (blown, frame 1). Otherwise ON (intact, frame 0).
        initialFrame = (stored === false) ? 1 : 0;
      } else if (this.engine && this.engine.manualStates && this.engine.manualStates.has(el.id)) {
        initialFrame = this.engine.manualStates.get(el.id) ? 1 : 0;
      }
      this.applyFrameToElementGroup(g, el.id, initialFrame);
    }

    // 3. Render Terminal Pins & Junction Nodes (Top-Most Layer)
    const pinsTargetGroup = this.pinsGroup || this.elementsGroup;
    for (const el of elements) {
      const compDef = COMPONENTS_DATA[el.svgData];
      if (!compDef || !compDef.nodes) continue;

      compDef.nodes.forEach((node, nodeIdx) => {
        const termWorld = getTerminalWorldPos(el, nodeIdx);
        const k = `${el.id}:${nodeIdx}`;
        const connIds = termConnectionMap.get(k) || [];
        const wireCount = connIds.length;

        const pinG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        pinG.setAttribute('class', 'terminal-pin');
        pinG.setAttribute('data-elem-id', el.id);
        pinG.setAttribute('data-node-id', nodeIdx);
        pinG.setAttribute('transform', `translate(${termWorld.x}, ${termWorld.y})`);

        // Generous Hit Target (Radius 18 = 36px diameter touch target)
        const hitCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hitCircle.setAttribute('r', '18');
        hitCircle.setAttribute('class', 'terminal-hit-target');
        hitCircle.setAttribute('fill', 'transparent');
        hitCircle.setAttribute('pointer-events', 'all');
        pinG.appendChild(hitCircle);

        // Visual Terminal Dot
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('data-conn-ids', connIds.join(','));

        const isLight = this.isLightTheme();
        const ringColor = this.getTerminalRingColor();
        const baseInk = this.getBaseStrokeColor();
        if (wireCount === 0) {
          // Unconnected pin: hollow snap ring
          dot.setAttribute('r', '4');
          dot.setAttribute('class', 'terminal-dot terminal-unconnected');
          dot.setAttribute('fill', isLight ? '#f8fafc' : '#141820');
          dot.setAttribute('stroke', isLight ? '#0284c7' : '#00e5ff');
          dot.setAttribute('stroke-width', '1.8');
        } else if (wireCount === 1) {
          // Connected pin (1 wire): solid crisp terminal connection
          dot.setAttribute('r', '4');
          dot.setAttribute('class', 'terminal-dot terminal-connected');
          dot.setAttribute('fill', baseInk);
          dot.setAttribute('stroke', ringColor);
          dot.setAttribute('stroke-width', '2');
        } else {
          // Multi-wire junction (>= 2 wires): IEC standard junction node
          dot.setAttribute('r', '5.5');
          dot.setAttribute('class', 'terminal-dot terminal-junction');
          dot.setAttribute('fill', baseInk);
          dot.setAttribute('stroke', ringColor);
          dot.setAttribute('stroke-width', '2.5');
        }
        pinG.appendChild(dot);

        // Terminal Label (e.g. A1, A2, 13, 14, L1, N)
        const pinTag = (el.terminalTags && el.terminalTags[nodeIdx]) ? el.terminalTags[nodeIdx] : node.tag;
        if (pinTag) {
          const rot = normalizeRotation(el.rotation);
          
          let lx = 0;
          let ly = 0;
          let textAnchor = 'start';
          
          const charW = 7.5;
          const textW = Math.max(10, pinTag.length * charW);
          const padX = 4.5;
          const badgeW = textW + (padX * 2);
          const badgeH = 16;
          let rx = 0;
          let ry = 0;

          if (rot === 0 || rot === 2) {
            // Kondisi 0° dan 180°: Ditaruh di kanan kawat pin
            lx = 12;
            ly = 0;
            textAnchor = 'start';
            rx = lx - padX;
            ry = -8;
          } else {
            // Kondisi 90° dan 270°: Ditaruh di atas kawat pin
            lx = 0;
            ly = -15;
            textAnchor = 'middle';
            rx = -badgeW / 2;
            ry = ly - 8;
          }

          // Latar belakang badge pill lembut (pill background)
          const pBadge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          pBadge.setAttribute('class', 'terminal-label-badge');
          pBadge.setAttribute('x', rx.toFixed(1));
          pBadge.setAttribute('y', ry.toFixed(1));
          pBadge.setAttribute('width', badgeW.toFixed(1));
          pBadge.setAttribute('height', badgeH.toString());
          pBadge.setAttribute('rx', '3.5');
          pBadge.setAttribute('ry', '3.5');
          pBadge.setAttribute('fill', '#0b0f19');
          pBadge.setAttribute('fill-opacity', '0.88');
          pBadge.setAttribute('stroke', 'rgba(56, 189, 248, 0.25)');
          pBadge.setAttribute('stroke-width', '0.8');
          pBadge.setAttribute('pointer-events', 'none');
          pinG.appendChild(pBadge);

          const pLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          pLabel.setAttribute('class', 'terminal-label');
          pLabel.setAttribute('x', lx.toFixed(1));
          pLabel.setAttribute('y', ly.toFixed(1));
          pLabel.setAttribute('dominant-baseline', 'central');
          pLabel.setAttribute('text-anchor', textAnchor);
          pLabel.textContent = pinTag;
          pinG.appendChild(pLabel);
        }

        pinsTargetGroup.appendChild(pinG);
      });
    }

    // 4. Render Group Bounding Boxes in Overlay Group
    if (this.overlayGroup && !this.isSimulating) {
      const selectedGroupIds = new Set();
      if (this.selectedElementIds) {
        for (const id of this.selectedElementIds) {
          const el = elements.find(e => e.id === id);
          if (el && el.groupId) selectedGroupIds.add(el.groupId);
        }
      }
      for (const grpId of selectedGroupIds) {
        const members = elements.filter(e => e.groupId === grpId);
        if (members.length === 0) continue;
        let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
        for (const m of members) {
          const compDef = COMPONENTS_DATA[m.svgData];
          const boxSize = this.getComponentBoxSize(compDef, m);
          let bw = boxSize.width;
          let bh = boxSize.height;
          const normRot = typeof normalizeRotation === 'function' ? normalizeRotation(m.rotation) : ((parseInt(m.rotation || 0) % 4 + 4) % 4);
          if (normRot % 2 !== 0) {
            const tmp = bw; bw = bh; bh = tmp;
          }
          gMinX = Math.min(gMinX, m.position.x - bw / 2);
          gMaxX = Math.max(gMaxX, m.position.x + bw / 2);
          gMinY = Math.min(gMinY, m.position.y - bh / 2);
          gMaxY = Math.max(gMaxY, m.position.y + bh / 2);
        }
        const pad = 14;
        const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        box.setAttribute('class', 'group-bounding-box');
        box.setAttribute('x', gMinX - pad);
        box.setAttribute('y', gMinY - pad);
        box.setAttribute('width', (gMaxX - gMinX) + pad * 2);
        box.setAttribute('height', (gMaxY - gMinY) + pad * 2);
        box.setAttribute('rx', '8');
        this.overlayGroup.appendChild(box);

        const badge = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        badge.setAttribute('class', 'group-badge-label');
        badge.setAttribute('x', gMinX - pad + 8);
        badge.setAttribute('y', gMinY - pad - 6);
        badge.textContent = `GROUP (${members.length})`;
        this.overlayGroup.appendChild(badge);
      }
    }
  }
}

/**
 * Mashimurelay Text Circuit Parser (.txt Base64 or plain @-delimited format)
 */
const LEGACY_COMPONENT_MAP = {
  'Lamp': 'lamp',
  'LampBlink': 'lampBlink',
  'SwitchC_3P_O': 'switch3p0',
  'Switch3p': 'switch3p',
  'Switch3P': 'switch3p',
  'ContactNO': 'contactNO',
  'ContactNC': 'contactNC',
  'ContactCON': 'contactCON',
  'ContactNONC': 'contactNONC',
  'ContactNODelayOn': 'contactNODelayOn',
  'ContactNCDelayOn': 'contactNCDelayOn',
  'ContactNODelayOff': 'contactNODelayOff',
  'ContactNCDelayOff': 'contactNCDelayOff',
  'CoilFlasher': 'coilFlasher',
  'Flasher': 'flasher',
  'CoilKM': 'coil',
  'Coil': 'coil',
  'CoilDelayOn': 'coilDelayOn',
  'CoilDelayOff': 'coilDelayOff',
  'CoilDelayOnOff': 'coilDelayOnOff',
  'CoilLatch': 'coilLatch',
  'CoilSolenoid': 'coilSolenoid',
  'Contactor1P': 'contactor1p',
  'Contactor2P': 'contactor2p',
  'Contactor3P': 'contactor3p',
  'Contactor4P': 'contactor4p',
  'OverloadRelay1': 'overload1p',
  'OverloadRelay2': 'overload2p',
  'OverloadRelay3': 'overload3p',
  'Isolator1': 'isolator1p',
  'Isolator2': 'isolator2p',
  'Isolator3': 'isolator3p',
  'Isolator4': 'isolator4p',
  'Fuse1': 'fuse1p',
  'Fuse2': 'fuse2p',
  'Fuse3': 'fuse3p',
  'Fuse4': 'fuse4p',
  'ButtonNO': 'buttonNO',
  'ButtonNC': 'buttonNC',
  'ButtonNONC': 'buttonNONC',
  'EmergencyNO': 'emergencyNO',
  'EmergencyNC': 'emergencyNC',
  'EmergencyCON': 'emergencyCON',
  'Motor3Ph': 'motor3ph',
  'Motor1Ph': 'motor1ph',
  'MotorDC': 'motorDC',
  'MotorStarDelta': 'motorStarDelta',
  'MotorDahlander': 'motorDhalander',
  'MotorTwoSpeeds': 'motorTwoSpeeds',
  'Ring': 'ring',
  'Buzzer': 'buzzer',
  'Siren': 'siren',
  'SourceN': 'sourceN',
  'SourceL1': 'sourceL1',
  'SourceL2': 'sourceL2',
  'SourceL3': 'sourceL3',
  'SourcePE': 'sourcePE',
  'SourceGnd': 'sourceGnd',
  'SourcePlus': 'sourcePlus',
  'SourceNegative': 'sourceNegative',
  'SourceL1L2L3': 'sourceL1L2L3',
  'SourceL1L2L3N': 'sourceL1L2L3N',
  'Junction90': 'junction2p90',
  'Junction2P': 'junction2p',
  'Junction3P': 'junction3p',
  'Junction4P': 'junction4p',
  'JunctionPE': 'junctionPE',
  'BaseText': 'text',
  'Text': 'text'
};

function resolveComponentSvg(rawType) {
  if (LEGACY_COMPONENT_MAP[rawType]) return LEGACY_COMPONENT_MAP[rawType];
  const lowerFirst = rawType.charAt(0).toLowerCase() + rawType.slice(1);
  if (typeof COMPONENTS_DATA !== 'undefined' && COMPONENTS_DATA[lowerFirst]) return lowerFirst;
  if (typeof COMPONENTS_DATA !== 'undefined') {
    const lowerAll = rawType.toLowerCase();
    for (const k in COMPONENTS_DATA) {
      if (k.toLowerCase() === lowerAll) return k;
    }
  }
  return lowerFirst;
}

function parseLegacyCircuitTxt(rawInput) {
  if (!rawInput) return null;
  let text = String(rawInput).trim();

  // Handle Base64 decode
  if (!text.startsWith('-1@') && !text.includes('@')) {
    try {
      const cleanB64 = text.replace(/\s+/g, '');
      let decoded = '';
      if (typeof atob === 'function') {
        const binStr = atob(cleanB64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        decoded = new TextDecoder('utf-8').decode(bytes);
      } else if (typeof Buffer !== 'undefined') {
        decoded = Buffer.from(cleanB64, 'base64').toString('utf8');
      }
      if (decoded && (decoded.startsWith('-1@') || decoded.includes('@'))) {
        text = decoded;
      }
    } catch (e) {
      console.warn('Base64 decode note:', e);
    }
  }

  if (!text.includes('@')) {
    throw new Error('Format file legacy tidak valid: tidak ditemukan delimiter @');
  }

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const circuit = {
    header: { generator: 'Mashimurelay', '3.0.0.30': '1.0', format: 'legacy_txt', created_at: new Date().toISOString() },
    data: []
  };

  let maxId = 0;
  for (const line of lines) {
    const parts = line.split('@');
    const type = parts[0];
    if (type === '-1') continue;

    if (type === 'Connector') {
      const id = ++maxId;
      circuit.data.push({
        id: id,
        type: 'Connector',
        idElementNode1: parseInt(parts[3]),
        idNode1: Math.max(0, parseInt(parts[1]) - 1),
        idElementNode2: parseInt(parts[4]),
        idNode2: Math.max(0, parseInt(parts[2]) - 1),
        margins: {
          start: parseFloat(parts[5]) || 0,
          center: parseFloat(parts[6]) || 0,
          end: parseFloat(parts[7]) || 0
        }
      });
    } else {
      const id = parseInt(parts[1]);
      if (id > maxId) maxId = id;
      const tagPrefix = parts[2] || '';
      const tagNum = parts[3] || '';
      const tag = (tagPrefix && tagNum) ? (tagPrefix + tagNum) : (tagPrefix || tagNum || null);
      const x = parseFloat(parts[4]) || 0;
      const y = parseFloat(parts[5]) || 0;
      const comment = parts[6] ? parts[6].trim() : null;
      const rawRot = parseInt(parts[11]) || 0;
      const rotation = typeof normalizeRotation === 'function' ? normalizeRotation(rawRot) : ((rawRot % 4 + 4) % 4);
      const svgData = resolveComponentSvg(type);

      const compDef = (typeof COMPONENTS_DATA !== 'undefined') ? COMPONENTS_DATA[svgData] : null;
      const terminalTags = (compDef && compDef.nodes) ? compDef.nodes.map(n => n.tag || '') : [];

      let vTimeOn = 2.0;
      let vTimeOff = 0.0;
      if (parts.length > 9 && parts[9] !== '' && !isNaN(parseFloat(parts[9]))) {
        vTimeOn = parseFloat(parts[9]);
      }
      if (parts.length > 10 && parts[10] !== '' && !isNaN(parseFloat(parts[10]))) {
        vTimeOff = parseFloat(parts[10]);
      }

      let finalTag = tag;
      let fontSize = 24;
      if (svgData === 'text') {
        finalTag = null;
        const p3 = parseInt(parts[3]);
        if (!isNaN(p3) && p3 > 0) {
          fontSize = p3;
        } else {
          const p12 = parseInt(parts[12]);
          if (!isNaN(p12) && p12 > 0) fontSize = p12;
        }
      }

      circuit.data.push({
        id: id,
        type: 'ElectricalElement',
        svgData: svgData,
        position: { x, y },
        rotation: rotation,
        tag: finalTag,
        comment: comment,
        fontSize: (svgData === 'text') ? fontSize : undefined,
        indexFontSize: (svgData === 'text') ? fontSize : 5,
        terminalTags: terminalTags,
        state: 0,
        valueTimeOn: vTimeOn,
        valueTimeOff: vTimeOff,
        tagVisibility: true
      });
    }
  }

  return circuit;
}

/**
 * Mashimurelay Text Circuit Exporter (.txt Base64 or plain @-delimited format)
 */
const REVERSE_LEGACY_MAP = {
  'lamp': 'Lamp',
  'lampBlink': 'LampBlink',
  'switch3p0': 'SwitchC_3P_O',
  'switch3p': 'Switch3p',
  'contactNO': 'ContactNO',
  'contactNC': 'ContactNC',
  'contactCON': 'ContactCON',
  'contactNONC': 'ContactNONC',
  'contactNODelayOn': 'ContactNODelayOn',
  'contactNCDelayOn': 'ContactNCDelayOn',
  'contactNODelayOff': 'ContactNODelayOff',
  'contactNCDelayOff': 'ContactNCDelayOff',
  'coilFlasher': 'CoilFlasher',
  'flasher': 'Flasher',
  'coil': 'CoilKM',
  'coilDelayOn': 'CoilDelayOn',
  'coilDelayOff': 'CoilDelayOff',
  'coilDelayOnOff': 'CoilDelayOnOff',
  'coilLatch': 'CoilLatch',
  'coilSolenoid': 'CoilSolenoid',
  'contactor1p': 'Contactor1P',
  'contactor2p': 'Contactor2P',
  'contactor3p': 'Contactor3P',
  'contactor4p': 'Contactor4P',
  'overload1p': 'OverloadRelay1',
  'overload2p': 'OverloadRelay2',
  'overload3p': 'OverloadRelay3',
  'isolator1p': 'Isolator1',
  'isolator2p': 'Isolator2',
  'isolator3p': 'Isolator3',
  'isolator4p': 'Isolator4',
  'fuse1p': 'Fuse1',
  'fuse2p': 'Fuse2',
  'fuse3p': 'Fuse3',
  'fuse4p': 'Fuse4',
  'buttonNO': 'ButtonNO',
  'buttonNC': 'ButtonNC',
  'buttonNONC': 'ButtonNONC',
  'emergencyNO': 'EmergencyNO',
  'emergencyNC': 'EmergencyNC',
  'emergencyCON': 'EmergencyCON',
  'motor3ph': 'Motor3Ph',
  'motor1ph': 'Motor1Ph',
  'motorDC': 'MotorDC',
  'motorStarDelta': 'MotorStarDelta',
  'motorDhalander': 'MotorDahlander',
  'motorTwoSpeeds': 'MotorTwoSpeeds',
  'ring': 'Ring',
  'buzzer': 'Buzzer',
  'siren': 'Siren',
  'sourceN': 'SourceN',
  'sourceL1': 'SourceL1',
  'sourceL2': 'SourceL2',
  'sourceL3': 'SourceL3',
  'sourcePE': 'SourcePE',
  'sourceGnd': 'SourceGnd',
  'sourcePlus': 'SourcePlus',
  'sourceNegative': 'SourceNegative',
  'sourceL1L2L3': 'SourceL1L2L3',
  'sourceL1L2L3N': 'SourceL1L2L3N',
  'junction2p90': 'Junction90',
  'junction2p': 'Junction2P',
  'junction3p': 'Junction3P',
  'junction4p': 'Junction4P',
  'junctionPE': 'JunctionPE',
  'text': 'BaseText'
};

function exportCircuitToLegacyTxt(circuit, asBase64 = true) {
  if (!circuit || !circuit.data) return '';
  const elements = circuit.data.filter(d => d.type === 'ElectricalElement');
  const connectors = circuit.data.filter(d => d.type === 'Connector');
  const totalItems = elements.length + connectors.length;
  let maxId = 0;
  circuit.data.forEach(d => { if (d.id > maxId) maxId = d.id; });

  const lines = [];
  lines.push(`-1@${totalItems}@${maxId + 1}@0.5@0.0@200.0@0.0@0.5@200.0@0.0@0.0@1.0`);

  elements.forEach(el => {
    let legacyType = REVERSE_LEGACY_MAP[el.svgData];
    if (!legacyType) {
      legacyType = el.svgData.charAt(0).toUpperCase() + el.svgData.slice(1);
    }
    let tagPrefix = '';
    let tagNum = '';
    if (el.tag) {
      const match = el.tag.match(/^([A-Za-z_\-]+)(\d*)$/);
      if (match) {
        tagPrefix = match[1];
        tagNum = match[2];
      } else {
        tagPrefix = el.tag;
      }
    }

    // BaseText in Mashimurelay mobile text format stores font size in field 3 (tagNum) and field 12 (indexFontSize)
    if (el.svgData === 'text') {
      tagPrefix = '';
      tagNum = String(el.fontSize || el.indexFontSize || 24);
    }

    const x = Math.round(el.position.x);
    const y = Math.round(el.position.y);
    const comment = el.comment || '';
    const rot = el.rotation || 0;
    const vTimeOn = (el.valueTimeOn !== undefined && el.valueTimeOn !== null && !isNaN(el.valueTimeOn))
      ? el.valueTimeOn
      : 2.0;
    const vTimeOff = (el.valueTimeOff !== undefined && el.valueTimeOff !== null && !isNaN(el.valueTimeOff))
      ? el.valueTimeOff
      : 0.0;
    const fontIdx = (el.svgData === 'text') ? (el.fontSize || el.indexFontSize || 24) : 0;

    lines.push(`${legacyType}@${el.id}@${tagPrefix}@${tagNum}@${x}@${y}@${comment}@0@2@${vTimeOn}@${vTimeOff}@${rot}@${fontIdx}@1@0`);
  });

  connectors.forEach(c => {
    const n1 = (c.idNode1 !== undefined ? c.idNode1 : 0) + 1;
    const n2 = (c.idNode2 !== undefined ? c.idNode2 : 0) + 1;
    const mStart = (c.margins && c.margins.start) || 0;
    const mCenter = (c.margins && c.margins.center) || 0;
    const mEnd = (c.margins && c.margins.end) || 0;
    lines.push(`Connector@${n1}@${n2}@${c.idElementNode1}@${c.idElementNode2}@${mStart}@${mCenter}@${mEnd}@${mCenter}@0@0@0@0@0@0@0`);
  });

  const plainText = lines.join('\n');
  if (asBase64) {
    if (typeof btoa === 'function') {
      const bytes = new TextEncoder().encode(plainText);
      let binStr = '';
      for (let i = 0; i < bytes.length; i++) {
        binStr += String.fromCharCode(bytes[i]);
      }
      return btoa(binStr);
    } else if (typeof Buffer !== 'undefined') {
      return Buffer.from(plainText, 'utf8').toString('base64');
    }
  }
  return plainText;
}

if (typeof globalThis !== 'undefined') {
  globalThis.MashimurelayCanvas = MashimurelayCanvas;
  globalThis.parseLegacyCircuitTxt = parseLegacyCircuitTxt;
  globalThis.exportCircuitToLegacyTxt = exportCircuitToLegacyTxt;
}
