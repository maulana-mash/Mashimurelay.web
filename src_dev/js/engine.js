/**
 * Mashimurelay Simulation Engine
 * Discrete-Event Equipotential Graph Solver with Fixed-Point Iteration
 * Formulated by Gemini 4 Argon Deep Thinking Architecture
 */

const Potential = {
  NONE:        0,
  L1:          1 << 0, // 1
  L2:          1 << 1, // 2
  L3:          1 << 2, // 4
  N:           1 << 3, // 8
  PE:          1 << 4, // 16
  DC_P:        1 << 5, // 32
  DC_N:        1 << 6, // 64
  GND:         1 << 7, // 128
  AC_SHORT:    1 << 8, // 256
  DC_OVERHEAT: 1 << 9, // 512
};

const VALID_AC_230 = new Set([
  Potential.L1 | Potential.N,
  Potential.L2 | Potential.N,
  Potential.L3 | Potential.N,
]);

const VALID_AC_400 = new Set([
  Potential.L1 | Potential.L2,
  Potential.L2 | Potential.L3,
  Potential.L1 | Potential.L3,
]);

const VALID_3PH = Potential.L1 | Potential.L2 | Potential.L3;

class MashimurelayEngine {
  constructor() {
    this.timerStates = new Map(); // coilId -> { elapsedMs, presetMs, prevEnergized, outputState }
    this.contactDelayTimers = new Map(); // auxContactId -> { elapsedMs, outputState }
    this.manualStates = new Map(); // elemId -> boolean (toggled switch / pressed button / breaker ON)
    this.emergencyLatched = new Map(); // elemId -> boolean
    this.overloadTripped = new Map(); // elemId -> boolean
    this.tagStateMap = new Map(); // tag -> boolean (persistent across simulation frames)
    this.fuseHeatTimers = new Map(); // elemId -> accumulated short circuit heat ms
    this.fuseBlownElements = new Set(); // elemId of fuses blown by short circuit
    this.breakerFaultTimers = new Map(); // elemId -> accumulated short-circuit trip timer ms
    this.rccbFaultTimers = new Map(); // elemId -> accumulated earth-leakage trip timer ms
    this.trippedBreakers = new Set(); // elemId of MCB/MPCB/TM/RCBO tripped by short circuit
    this.trippedEarthLeakage = new Set(); // elemId of RCCB/RCBO tripped by earth leakage
  }

  reset(preserveFuses = true) {
    this.timerStates.clear();
    this.contactDelayTimers.clear();
    if (preserveFuses) {
      const preservedFuseStates = new Map();
      for (const [id, val] of this.manualStates) {
        if (val === false && this.fuseBlownElements.has(id)) {
          preservedFuseStates.set(id, false);
        }
      }
      this.manualStates.clear();
      for (const [id, val] of preservedFuseStates) {
        this.manualStates.set(id, false);
      }
      for (const id of Array.from(this.fuseBlownElements)) {
        if (!preservedFuseStates.has(id)) {
          this.fuseBlownElements.delete(id);
        }
      }
    } else {
      this.manualStates.clear();
      this.fuseBlownElements.clear();
    }
    this.fuseHeatTimers.clear();
    this.breakerFaultTimers.clear();
    this.rccbFaultTimers.clear();
    this.trippedBreakers.clear();
    this.trippedEarthLeakage.clear();
    this.emergencyLatched.clear();
    this.overloadTripped.clear();
    this.tagStateMap.clear();
  }

  isSinglePotential(mask) {
    return mask !== 0 && (mask & (mask - 1)) === 0;
  }

  isDcOverheatMask(mask) {
    return ((mask & Potential.DC_P) !== 0) && ((mask & Potential.DC_N) !== 0);
  }

  isAcShortMask(mask) {
    const hasL1 = (mask & Potential.L1) !== 0;
    const hasL2 = (mask & Potential.L2) !== 0;
    const hasL3 = (mask & Potential.L3) !== 0;
    const hasN  = (mask & Potential.N) !== 0;
    const phaseCount = (hasL1 ? 1 : 0) + (hasL2 ? 1 : 0) + (hasL3 ? 1 : 0);
    return phaseCount >= 2 || (phaseCount >= 1 && hasN);
  }

  isEarthLeakageMask(mask) {
    const hasPhase = (mask & (Potential.L1 | Potential.L2 | Potential.L3)) !== 0;
    const hasEarth = (mask & (Potential.PE | Potential.GND)) !== 0;
    return hasPhase && hasEarth;
  }

  isShortCircuit(mask) {
    return this.isAcShortMask(mask) || this.isDcOverheatMask(mask);
  }

  normalizeNetPotentialForDisplay(mask) {
    if (this.isDcOverheatMask(mask)) return Potential.DC_OVERHEAT;
    if (this.isAcShortMask(mask) || this.isEarthLeakageMask(mask)) return Potential.AC_SHORT;
    return mask;
  }

  isValidPair(potA, potB) {
    if (!potA || !potB) return false;
    const hasL1_A = (potA & Potential.L1) !== 0;
    const hasL2_A = (potA & Potential.L2) !== 0;
    const hasL3_A = (potA & Potential.L3) !== 0;
    const hasN_A  = (potA & Potential.N) !== 0;
    const hasDCP_A = (potA & Potential.DC_P) !== 0;
    const hasDCN_A = (potA & Potential.DC_N) !== 0;

    const hasL1_B = (potB & Potential.L1) !== 0;
    const hasL2_B = (potB & Potential.L2) !== 0;
    const hasL3_B = (potB & Potential.L3) !== 0;
    const hasN_B  = (potB & Potential.N) !== 0;
    const hasDCP_B = (potB & Potential.DC_P) !== 0;
    const hasDCN_B = (potB & Potential.DC_N) !== 0;

    const isAcSourceA = hasL1_A || hasL2_A || hasL3_A;
    const isAcSourceB = hasL1_B || hasL2_B || hasL3_B;

    // AC Phase to Neutral
    if ((isAcSourceA && hasN_B) || (isAcSourceB && hasN_A)) return true;

    // AC Phase to different AC Phase
    if ((hasL1_A && (hasL2_B || hasL3_B)) || (hasL2_A && (hasL1_B || hasL3_B)) || (hasL3_A && (hasL1_B || hasL2_B))) return true;

    // DC Positive to DC Negative
    if ((hasDCP_A && hasDCN_B) || (hasDCP_B && hasDCN_A)) return true;

    return false;
  }

  step(circuitData, dtMs = 50) {
    const elements = circuitData.elements || [];
    const connectors = circuitData.connectors || [];

    const elemMap = new Map();
    for (const el of elements) {
      elemMap.set(el.id, el);
    }

    // Prune fuseBlownElements to only include cartridge fuses that actually exist in the current circuit and are OFF
    const validBlownFuses = new Set();
    for (const el of elements) {
      if (el.svgData && el.svgData.startsWith('fuse') && !el.svgData.startsWith('fuseSwitch')) {
        if (this.fuseBlownElements.has(el.id) && this.manualStates.get(el.id) === false) {
          validBlownFuses.add(el.id);
        }
      }
    }
    this.fuseBlownElements = validBlownFuses;

    // 1. Base Source Potentials
    const pinPotentials = new Map(); // "elemId:nodeId" -> Potential bitmask

    const setPinPot = (elemId, nodeId, pot) => {
      const key = `${elemId}:${nodeId}`;
      pinPotentials.set(key, (pinPotentials.get(key) || 0) | pot);
    };

    for (const el of elements) {
      const svg = el.svgData || '';
      if (svg === 'sourceL1') setPinPot(el.id, 0, Potential.L1);
      else if (svg === 'sourceL2') setPinPot(el.id, 0, Potential.L2);
      else if (svg === 'sourceL3') setPinPot(el.id, 0, Potential.L3);
      else if (svg === 'sourceL1L2L3') {
        setPinPot(el.id, 0, Potential.L1);
        setPinPot(el.id, 1, Potential.L2);
        setPinPot(el.id, 2, Potential.L3);
      } else if (svg === 'sourceL1L2L3N') {
        // Standar IEC kiri-ke-kanan: 0=L1, 1=L2, 2=L3, 3=N
        setPinPot(el.id, 0, Potential.L1);
        setPinPot(el.id, 1, Potential.L2);
        setPinPot(el.id, 2, Potential.L3);
        setPinPot(el.id, 3, Potential.N);
      } else if (svg === 'sourceN') setPinPot(el.id, 0, Potential.N);
      else if (svg === 'sourcePE') {
        setPinPot(el.id, 0, Potential.PE);
      } else if (svg === 'sourceGnd') {
        setPinPot(el.id, 0, Potential.GND);
      } else if (svg === 'sourcePlus') setPinPot(el.id, 0, Potential.DC_P);
      else if (svg === 'sourceNegative') setPinPot(el.id, 0, Potential.DC_N);
      else if (svg === 'battery') {
        setPinPot(el.id, 0, Potential.DC_P);
        setPinPot(el.id, 1, Potential.DC_N);
      } else if (svg === 'powerSupply2') {
        const hasInWire = connectors.some(c =>
          (c.idElementNode1 === el.id && (c.idNode1 === 0 || c.idNode1 === 2)) ||
          (c.idElementNode2 === el.id && (c.idNode2 === 0 || c.idNode2 === 2))
        );
        if (!hasInWire) {
          setPinPot(el.id, 1, Potential.DC_P);
          setPinPot(el.id, 3, Potential.DC_N);
        }
      } else if (svg === 'powerSupply') {
        const hasInWire = connectors.some(c =>
          (c.idElementNode1 === el.id && (c.idNode1 === 0 || c.idNode1 === 2 || c.idNode1 === 4)) ||
          (c.idElementNode2 === el.id && (c.idNode2 === 0 || c.idNode2 === 2 || c.idNode2 === 4))
        );
        if (!hasInWire) {
          setPinPot(el.id, 1, Potential.DC_P);
          setPinPot(el.id, 3, Potential.DC_P);
          setPinPot(el.id, 5, Potential.DC_N);
          setPinPot(el.id, 7, Potential.DC_N);
        }
        setPinPot(el.id, 6, Potential.PE);
      } else if (svg === 'generator3ph') {
        setPinPot(el.id, 4, Potential.L1);
        const hasCtrlWire = connectors.some(c =>
          (c.idElementNode1 === el.id && (c.idNode1 === 4 || c.idNode1 === 5)) ||
          (c.idElementNode2 === el.id && (c.idNode2 === 4 || c.idNode2 === 5))
        );
        if (!hasCtrlWire) {
          setPinPot(el.id, 0, Potential.L1);
          setPinPot(el.id, 1, Potential.L2);
          setPinPot(el.id, 2, Potential.L3);
          setPinPot(el.id, 3, Potential.N);
        }
      }
    }

    // Fixed-Point Iteration Loop
    const MAX_SUB_ITER = 12;
    let converged = false;
    let iter = 0;
    let shortCircuitDetected = false;
    let earthLeakageDetected = false;
    let shortedNets = [];
    let earthFaultNets = [];
    const newlyBlownFuses = [];
    const newlyTrippedBreakers = [];
    const conductingDiodes = new Set();
    const activePowerSupplies = new Set();

    const tagStateMap = this.tagStateMap;
    for (const el of elements) {
      const compDef = COMPONENTS_DATA[el.svgData];
      if (compDef && compDef.category === 'coils') {
        if (!this.timerStates.has(el.id)) {
          const preset = (el.valueTimeOn !== undefined && el.valueTimeOn !== null) ? Number(el.valueTimeOn) * 1000 : 2000;
          const presetOff = (el.valueTimeOff !== undefined && el.valueTimeOff !== null) ? Number(el.valueTimeOff) * 1000 : preset;
          this.timerStates.set(el.id, {
            elapsedMs: 0,
            elapsedOffMs: 0,
            presetMs: preset,
            presetOffMs: presetOff,
            prevEnergized: false,
            outputState: false,
            isTiming: false,
            energized: false
          });
        } else {
          const tState = this.timerStates.get(el.id);
          if (el.valueTimeOn !== undefined && el.valueTimeOn !== null) {
            tState.presetMs = Number(el.valueTimeOn) * 1000;
          }
          if (el.valueTimeOff !== undefined && el.valueTimeOff !== null) {
            tState.presetOffMs = Number(el.valueTimeOff) * 1000;
          }
        }
        if (el.tag) {
          tagStateMap.set(el.tag.trim(), this.timerStates.get(el.id).outputState);
        }
      }
    }

    const netResultMap = new Map();
    const elementFrames = new Map();
    const wirePotentials = new Map();

    while (!converged && iter < MAX_SUB_ITER) {
      iter++;
      converged = true;
      // Reset fault state on every iteration so blown fuse / tripped breaker clears faults immediately
      shortCircuitDetected = false;
      earthLeakageDetected = false;
      shortedNets = [];
      earthFaultNets = [];
      const stepDt = iter === 1 ? dtMs : 0;

      // Adjacency Graph of Conductive Edges
      const adj = new Map();
      const addEdge = (p1, p2) => {
        if (!adj.has(p1)) adj.set(p1, new Set());
        if (!adj.has(p2)) adj.set(p2, new Set());
        adj.get(p1).add(p2);
        adj.get(p2).add(p1);
      };

      // Connectors (wires)
      for (const c of connectors) {
        const p1 = `${c.idElementNode1}:${c.idNode1}`;
        const p2 = `${c.idElementNode2}:${c.idNode2}`;
        addEdge(p1, p2);
      }

      // Cross-reference Arrow connections (e.g. -REF1, case-insensitive & trimmed)
      const arrowElems = elements.filter(e => (e.svgData === 'arrowSource' || e.svgData === 'arrowDestination') && e.tag && e.tag.trim());
      for (let i = 0; i < arrowElems.length; i++) {
        const a1 = arrowElems[i];
        const tag1 = a1.tag.trim().toUpperCase();
        for (let j = i + 1; j < arrowElems.length; j++) {
          const a2 = arrowElems[j];
          if (a2.tag.trim().toUpperCase() === tag1) {
            addEdge(`${a1.id}:0`, `${a2.id}:0`);
          }
        }
      }

      // Internal conductive paths of elements
      for (const el of elements) {
        const compDef = COMPONENTS_DATA[el.svgData];
        if (!compDef) continue;
        const cat = compDef.category || '';
        const contacts = compDef.contacts || [];

        // Diodes (Conduct from Anode:0 to Cathode:1 when forward biased)
        if (el.svgData === 'diode') {
          if (conductingDiodes.has(el.id)) {
            addEdge(`${el.id}:0`, `${el.id}:1`);
          }
          elementFrames.set(el.id, 0);
          continue;
        }

        // Junctions connect all their terminal pins together
        if (compDef.type === 'junction' || el.svgData.startsWith('junction')) {
          if (compDef.nodes && compDef.nodes.length > 1) {
            for (let i = 1; i < compDef.nodes.length; i++) {
              addEdge(`${el.id}:0`, `${el.id}:${i}`);
            }
          }
          elementFrames.set(el.id, 0);
          continue;
        }

        // Fuses (fuse1p, fuse2p, etc.): ON (default/intact = Frame 0, conducts) vs OFF (blown/terputus = Frame 1, blocks)
        if (el.svgData.startsWith('fuse') && !el.svgData.startsWith('fuseSwitch')) {
          const isOff = this.manualStates.get(el.id) === false;
          if (isOff) {
            elementFrames.set(el.id, 1); // Frame 1: broken line (terputus)
          } else {
            elementFrames.set(el.id, 0); // Frame 0: continuous line (utuh/terhubung)
            if (contacts.length > 0) {
              for (const c of contacts) {
                addEdge(`${el.id}:${c.nodeId1}`, `${el.id}:${c.nodeId2}`);
              }
            } else if (compDef.nodes && compDef.nodes.length >= 2) {
              for (let i = 0; i < compDef.nodes.length; i += 2) {
                if (i + 1 < compDef.nodes.length) {
                  addEdge(`${el.id}:${i}`, `${el.id}:${i + 1}`);
                }
              }
            }
          }
          continue;
        }

        // Thermal Overload Relays (overload1p, overload2p, overload3p): power contacts 1-2, 3-4, 5-6 are closed unless tripped
        if (el.svgData.startsWith('overload')) {
          const isTripped = !!this.overloadTripped.get(el.id) || !!this.manualStates.get(el.id);
          elementFrames.set(el.id, isTripped ? 1 : 0);
          if (!isTripped && contacts.length > 0) {
            for (const c of contacts) {
              addEdge(`${el.id}:${c.nodeId1}`, `${el.id}:${c.nodeId2}`);
            }
          }
          continue;
        }

        // Switches, Buttons, Protections, Contactors, Aux Contacts
        let isClosed = false;
        let frameIdx = 0;

        if (cat === 'protections' || cat === 'switches') {
          const manualVal = this.manualStates.get(el.id);
          const isEmergencyLatched = !!this.emergencyLatched.get(el.id) || !!manualVal;
          const isNC = el.svgData.includes('NC');

          if (el.svgData === 'switch3p0') {
            // Switch 3 Positions I-0-II: 0=Posisi I, 1=Posisi 0 (Netral), 2=Posisi II. Default: 1 (Netral)
            frameIdx = (manualVal !== undefined) ? manualVal : 1;
            isClosed = frameIdx !== 1;
          } else if (el.svgData === 'switch3p') {
            // Switch 3 Positions I-II-III: 0=Posisi I, 1=Posisi II, 2=Posisi III. Default: 0
            frameIdx = (manualVal !== undefined) ? manualVal : 0;
            isClosed = true;
          } else if (compDef.type === 'button') {
            const manualOn = !!manualVal;
            isClosed = isNC ? !manualOn : manualOn;
            frameIdx = manualOn ? 1 : 0;
          } else if (compDef.type === 'emergency' || el.svgData.includes('emergency')) {
            isClosed = isNC ? !isEmergencyLatched : isEmergencyLatched;
            frameIdx = isEmergencyLatched ? 1 : 0;
          } else if (isNC) {
            const manualOn = !!manualVal;
            isClosed = !manualOn;
            frameIdx = manualOn ? 1 : 0;
          } else {
            // Normally Open Isolator, Breaker, Switch
            const manualOn = !!manualVal;
            isClosed = manualOn;
            frameIdx = isClosed ? 1 : 0;
          }
        } else if (cat === 'auxiliaries') {
          // Check master tag: can be coil (-KM1), overload (-F1), breaker (-Q1/tmBreaker/motorBreaker/rccb/rcbo), or phaseFailure
          let masterActive = false;
          let masterIsTimerCoil = false;
          if (el.tag) {
            const tag = el.tag.trim();
            masterActive = tagStateMap.get(tag) || false;
            const masterTimer = elements.find(e => e.id !== el.id && e.tag && e.tag.trim() === tag &&
              (e.svgData === 'coilDelayOn' || e.svgData === 'coilDelayOff' || e.svgData === 'coilDelayOnOff'));
            if (masterTimer) {
              masterIsTimerCoil = true;
            }
            // Check specifically for protection master (overload or any breaker case-insensitive)
            const masterProt = elements.find(e => e.id !== el.id && e.tag && e.tag.trim() === tag &&
              e.svgData && (e.svgData.startsWith('overload') || e.svgData.toLowerCase().includes('breaker')));
            if (masterProt) {
              if (masterProt.svgData.startsWith('overload')) {
                masterActive = !!this.overloadTripped.get(masterProt.id) || !!this.manualStates.get(masterProt.id);
              } else {
                masterActive = !!this.manualStates.get(masterProt.id);
              }
            }
          }

          // Independent pneumatic timer on contact*DelayOn / contact*DelayOff when driven by non-timer master
          const isDelayOnContact = el.svgData.endsWith('DelayOn');
          const isDelayOffContact = el.svgData.endsWith('DelayOff');
          let effectiveActive = masterActive;
          if (!masterIsTimerCoil && (isDelayOnContact || isDelayOffContact)) {
            const presetMs = (el.valueTimeOn !== undefined && el.valueTimeOn !== null && Number(el.valueTimeOn) > 0)
              ? Number(el.valueTimeOn) * 1000
              : 2000;
            let cTimer = this.contactDelayTimers.get(el.id);
            if (!cTimer) {
              cTimer = { elapsedMs: 0, outputState: false };
              this.contactDelayTimers.set(el.id, cTimer);
            }
            if (isDelayOnContact) {
              if (masterActive) {
                if (cTimer.elapsedMs < presetMs) {
                  cTimer.elapsedMs += stepDt;
                  if (cTimer.elapsedMs >= presetMs) {
                    cTimer.elapsedMs = presetMs;
                    cTimer.outputState = true;
                  } else {
                    cTimer.outputState = false;
                  }
                } else {
                  cTimer.outputState = true;
                }
              } else {
                cTimer.elapsedMs = 0;
                cTimer.outputState = false;
              }
            } else if (isDelayOffContact) {
              if (masterActive) {
                cTimer.elapsedMs = 0;
                cTimer.outputState = true;
              } else if (cTimer.outputState) {
                cTimer.elapsedMs += stepDt;
                if (cTimer.elapsedMs >= presetMs) {
                  cTimer.elapsedMs = presetMs;
                  cTimer.outputState = false;
                }
              } else {
                cTimer.elapsedMs = 0;
                cTimer.outputState = false;
              }
            }
            effectiveActive = cTimer.outputState;
          }

          if (el.svgData.includes('NC') && !el.svgData.includes('NONC')) {
            isClosed = !effectiveActive;
            frameIdx = effectiveActive ? 1 : 0;
          } else {
            isClosed = effectiveActive;
            frameIdx = effectiveActive ? 1 : 0;
          }
        } else if (cat === 'contactors') {
          const tag = el.tag ? el.tag.trim() : '';
          const coilActive = tag ? (tagStateMap.get(tag) || false) : false;
          if (el.svgData.includes('NC')) {
            isClosed = !coilActive;
            frameIdx = coilActive ? 1 : 0;
          } else {
            isClosed = coilActive;
            frameIdx = coilActive ? 1 : 0;
          }
        }

        elementFrames.set(el.id, frameIdx);

        if (contacts && contacts.length > 0) {
          for (const c of contacts) {
            let enabled = false;
            if (c.enableFrames) {
              const flags = c.enableFrames.split(',').map(s => s.trim());
              enabled = flags[frameIdx] === '1';
            } else {
              enabled = isClosed;
            }

            if (enabled) {
              addEdge(`${el.id}:${c.nodeId1}`, `${el.id}:${c.nodeId2}`);
            }
          }
        }
      }

      // BFS Equipotential Partition
      const visited = new Set();
      netResultMap.clear();
      const nets = [];
      const pinToNetId = new Map();
      let netCounter = 0;

      for (const [startPin] of adj) {
        if (visited.has(startPin)) continue;

        const currentNetId = netCounter++;
        const queue = [startPin];
        visited.add(startPin);
        const netPins = [];
        let netPot = Potential.NONE;

        while (queue.length > 0) {
          const curr = queue.shift();
          netPins.push(curr);
          pinToNetId.set(curr, currentNetId);
          if (pinPotentials.has(curr)) {
            netPot |= pinPotentials.get(curr);
          }

          const neighbors = adj.get(curr);
          if (neighbors) {
            for (const nxt of neighbors) {
              if (!visited.has(nxt)) {
                visited.add(nxt);
                queue.push(nxt);
              }
            }
          }
        }

        if (this.isShortCircuit(netPot)) {
          shortCircuitDetected = true;
          const isDcOverheat = this.isDcOverheatMask(netPot);
          shortedNets.push({ netPot, pins: netPins, isDcOverheat });
        }
        if (this.isEarthLeakageMask(netPot)) {
          earthLeakageDetected = true;
          earthFaultNets.push({ netPot, pins: netPins });
        }

        for (const pin of netPins) {
          netResultMap.set(pin, netPot);
        }

        nets.push({
          id: currentNetId,
          pot: netPot,
          pins: netPins,
        });
      }

      // Ensure any source pins not in adj (unconnected) are registered with net IDs
      for (const [pin, pot] of pinPotentials) {
        if (!pinToNetId.has(pin)) {
          const netId = netCounter++;
          pinToNetId.set(pin, netId);
          netResultMap.set(pin, pot);
          nets.push({
            id: netId,
            pot: pot,
            pins: [pin],
          });
        }
      }

      // Series Circuit Resolution Pass (Passive 2-Terminal Loads Traversal)
      // Always runs on healthy single-potential nets so independent healthy branches keep working during a fault on another branch
      const seriesEnergizedLoads = new Set();
      const seriesActiveNets = new Map();

      {
        const netAdj = new Map();
        const addNetEdge = (n1, n2, elemId, flags = null) => {
          if (!netAdj.has(n1)) netAdj.set(n1, []);
          if (!netAdj.has(n2)) netAdj.set(n2, []);
          netAdj.get(n1).push({ toNet: n2, elemId, ...(flags || {}) });
          netAdj.get(n2).push({ toNet: n1, elemId, ...(flags || {}) });
        };

        for (const el of elements) {
          const compDef = COMPONENTS_DATA[el.svgData];
          if (!compDef) continue;
          const cat = compDef.category || '';
          if (el.svgData === 'diode') {
            const n0 = pinToNetId.get(`${el.id}:0`);
            const n1 = pinToNetId.get(`${el.id}:1`);
            if (n0 !== undefined && n1 !== undefined && n0 !== n1) {
              if (!netAdj.has(n0)) netAdj.set(n0, []);
              if (!netAdj.has(n1)) netAdj.set(n1, []);
              // Forward (Anode 0 -> Cathode 1): valid for both DC and AC
              netAdj.get(n0).push({ toNet: n1, elemId: el.id, isDiode: true, reverseDir: false });
              // Reverse (Cathode 1 -> Anode 0): valid ONLY for AC half-wave rectification (blocked on DC)
              netAdj.get(n1).push({ toNet: n0, elemId: el.id, isDiode: true, reverseDir: true });
            }
            continue;
          }
          let isPassiveLoad = (cat === 'loads' || cat === 'coils' || el.svgData === 'motorDC' || el.svgData === 'motor1ph');
          if (!isPassiveLoad) continue;

          const n0 = pinToNetId.get(`${el.id}:0`);
          const n1 = pinToNetId.get(`${el.id}:1`);
          if (n0 !== undefined && n1 !== undefined && n0 !== n1) {
            addNetEdge(n0, n1, el.id, { dcOnly: el.svgData === 'motorDC' });
          }
        }

        // Search paths from High Rails (L1, L2, L3, DC_P) to Return Rails (N, DC_N, or phase pairs)
        const sourceRailNets = nets.filter(n => {
          if (!this.isSinglePotential(n.pot) || n.pot === Potential.PE || n.pot === Potential.GND) return false;
          return (n.pot & (Potential.L1 | Potential.L2 | Potential.L3 | Potential.DC_P)) !== 0;
        });

        for (const startNet of sourceRailNets) {
          const startPot = startNet.pot;
          const isDcRail = (startPot === Potential.DC_P);
          const visitedNetsOnPath = new Set([startNet.id]);
          const currentPathLoads = [];
          const currentPathNets = [];

          const dfs = (currNetId, depth) => {
            if (depth > 20) return;
            const edges = netAdj.get(currNetId) || [];
            for (const edge of edges) {
              if (edge.isDiode && edge.reverseDir && isDcRail) continue;
              if (edge.dcOnly && !isDcRail) continue;
              const nextNetId = edge.toNet;
              if (visitedNetsOnPath.has(nextNetId)) continue;

              const nextNet = nets[nextNetId];
              if (!nextNet) continue;

              currentPathLoads.push(edge.elemId);

              if (nextNet.pot !== Potential.NONE) {
                if (this.isValidPair(startPot, nextNet.pot)) {
                  const hasOffFlasher = currentPathLoads.some(id => {
                    const el = elemMap.get(id);
                    if (el && el.svgData === 'flasher') {
                      const st = this.timerStates.get(id);
                      return st && !st.outputState;
                    }
                    return false;
                  });

                  for (const loadId of currentPathLoads) {
                    const el = elemMap.get(loadId);
                    if (el && el.svgData === 'flasher') {
                      seriesEnergizedLoads.add(loadId);
                    } else if (!hasOffFlasher) {
                      seriesEnergizedLoads.add(loadId);
                    }
                  }

                  if (!hasOffFlasher) {
                    for (const midNetId of currentPathNets) {
                      if (!seriesActiveNets.has(midNetId)) {
                        seriesActiveNets.set(midNetId, startPot);
                      }
                    }
                  }
                }
              } else {
                visitedNetsOnPath.add(nextNetId);
                currentPathNets.push(nextNetId);

                dfs(nextNetId, depth + 1);

                currentPathNets.pop();
                visitedNetsOnPath.delete(nextNetId);
              }

              currentPathLoads.pop();
            }
          };

          dfs(startNet.id, 0);
        }
      }

      // Evaluate Diodes (DC 1-way forward bias; AC half-wave rectification on both orientations)
      // and Conditional Power Supplies / 3-Phase Generators
      const AC_PHASE_MASK = Potential.L1 | Potential.L2 | Potential.L3;
      const POS_MASK = AC_PHASE_MASK | Potential.DC_P;
      for (const el of elements) {
        if (el.svgData === 'diode') {
          const p0 = netResultMap.get(`${el.id}:0`) || Potential.NONE;
          const p1 = netResultMap.get(`${el.id}:1`) || Potential.NONE;
          // DC: strictly Anode(0) = DC+ and Cathode(1) != DC+, OR Cathode(1) = DC- and Anode(0) != DC-
          const dcForward =
            ((p0 & Potential.DC_P) !== 0 && (p0 & Potential.DC_N) === 0 && (p1 & Potential.DC_P) === 0) ||
            ((p1 & Potential.DC_N) !== 0 && (p1 & Potential.DC_P) === 0 && (p0 & Potential.DC_N) === 0);
          // AC: alternating waveform conducts on half-cycle in either diode orientation
          const p0HasAc = (p0 & (AC_PHASE_MASK | Potential.N)) !== 0;
          const p1HasAc = (p1 & (AC_PHASE_MASK | Potential.N)) !== 0;
          const acHalfWave = (p0HasAc && !p1HasAc && (p1 & (Potential.DC_P | Potential.DC_N)) === 0) ||
                             (p1HasAc && !p0HasAc && (p0 & (Potential.DC_P | Potential.DC_N)) === 0);
          if ((dcForward || acHalfWave) && !conductingDiodes.has(el.id)) {
            conductingDiodes.add(el.id);
            converged = false;
          }
        } else if (el.svgData === 'powerSupply2') {
          const p0 = netResultMap.get(`${el.id}:0`) || Potential.NONE;
          const p2 = netResultMap.get(`${el.id}:2`) || Potential.NONE;
          if (this.isValidPair(p0, p2) && !activePowerSupplies.has(el.id)) {
            activePowerSupplies.add(el.id);
            setPinPot(el.id, 1, Potential.DC_P);
            setPinPot(el.id, 3, Potential.DC_N);
            converged = false;
          }
        } else if (el.svgData === 'powerSupply') {
          const p0 = netResultMap.get(`${el.id}:0`) || Potential.NONE;
          const p2 = netResultMap.get(`${el.id}:2`) || Potential.NONE;
          const p4 = netResultMap.get(`${el.id}:4`) || Potential.NONE;
          if ((this.isValidPair(p0, p2) || this.isValidPair(p4, p2) || this.isValidPair(p0, p4)) && !activePowerSupplies.has(el.id)) {
            activePowerSupplies.add(el.id);
            setPinPot(el.id, 1, Potential.DC_P);
            setPinPot(el.id, 3, Potential.DC_P);
            setPinPot(el.id, 5, Potential.DC_N);
            setPinPot(el.id, 7, Potential.DC_N);
            converged = false;
          }
        } else if (el.svgData === 'generator3ph') {
          const hasCtrlWire = connectors.some(c =>
            (c.idElementNode1 === el.id && (c.idNode1 === 4 || c.idNode1 === 5)) ||
            (c.idElementNode2 === el.id && (c.idNode2 === 4 || c.idNode2 === 5))
          );
          if (!hasCtrlWire) {
            elementFrames.set(el.id, 1);
          } else {
            const p4 = netResultMap.get(`${el.id}:4`) || Potential.NONE;
            const p5 = netResultMap.get(`${el.id}:5`) || Potential.NONE;
            const isActivated = (p5 & POS_MASK) !== 0 || this.isValidPair(p4, p5);
            elementFrames.set(el.id, isActivated ? 1 : 0);
            if (isActivated && !activePowerSupplies.has(el.id)) {
              activePowerSupplies.add(el.id);
              setPinPot(el.id, 0, Potential.L1);
              setPinPot(el.id, 1, Potential.L2);
              setPinPot(el.id, 2, Potential.L3);
              setPinPot(el.id, 3, Potential.N);
              converged = false;
            }
          }
        }
      }

      // Wire Potentials (Per-Net fault coloring: ONLY shorted/earth-fault nets glow AC_SHORT / DC_OVERHEAT)
      for (const c of connectors) {
        const p1 = `${c.idElementNode1}:${c.idNode1}`;
        const p2 = `${c.idElementNode2}:${c.idNode2}`;
        let rawPot = netResultMap.get(p1) || netResultMap.get(p2) || Potential.NONE;
        if (rawPot === Potential.NONE) {
          const netId = pinToNetId.get(p1) !== undefined ? pinToNetId.get(p1) : pinToNetId.get(p2);
          if (netId !== undefined && seriesActiveNets.has(netId)) {
            rawPot = seriesActiveNets.get(netId);
          }
        }
        wirePotentials.set(c.id, this.normalizeNetPotentialForDisplay(rawPot));
      }

      // Helper to trace fault pins between conflicting raw source pins inside faulted nets
      const collectFaultPins = (targetNets, isEarthMode) => {
        const resultPins = new Set();
        for (const sn of targetNets) {
          const posSources = [];
          const negSources = new Set();
          for (const p of sn.pins) {
            const pot = pinPotentials.get(p) || 0;
            if (isEarthMode) {
              if ((pot & (Potential.L1 | Potential.L2 | Potential.L3)) !== 0) posSources.push(p);
              if ((pot & (Potential.PE | Potential.GND)) !== 0) negSources.add(p);
            } else {
              if ((pot & (Potential.L1 | Potential.L2 | Potential.L3 | Potential.DC_P)) !== 0) posSources.push(p);
              if ((pot & (Potential.N | Potential.DC_N)) !== 0) negSources.add(p);
            }
          }
          // Handle AC Phase-to-Phase short (e.g. L1 <-> L2)
          if (!isEarthMode && negSources.size === 0 && posSources.length >= 2) {
            const firstPot = pinPotentials.get(posSources[0]);
            for (let i = 1; i < posSources.length; i++) {
              if (pinPotentials.get(posSources[i]) !== firstPot) {
                negSources.add(posSources[i]);
              }
            }
          }

          for (const startPin of posSources) {
            if (negSources.has(startPin)) {
              resultPins.add(startPin);
              continue;
            }
            const q = [[startPin, [startPin]]];
            const visitedPins = new Set([startPin]);
            while (q.length > 0) {
              const [currPin, path] = q.shift();
              if (negSources.has(currPin)) {
                for (const pt of path) resultPins.add(pt);
                continue;
              }
              const nbrs = adj.get(currPin);
              if (nbrs) {
                for (const nxt of nbrs) {
                  if (!visitedPins.has(nxt)) {
                    visitedPins.add(nxt);
                    q.push([nxt, [...path, nxt]]);
                  }
                }
              }
            }
          }
        }
        return resultPins;
      };

      // Helper to check if any pole of a multi-pole device carries fault current
      const isDeviceInFault = (el, faultPinSet) => {
        if (faultPinSet.size === 0) return false;
        const compDef = COMPONENTS_DATA[el.svgData];
        const contacts = (compDef && compDef.contacts) ? compDef.contacts : [];
        if (contacts.length > 0) {
          for (const c of contacts) {
            if (faultPinSet.has(`${el.id}:${c.nodeId1}`) && faultPinSet.has(`${el.id}:${c.nodeId2}`)) {
              return true;
            }
          }
          return false;
        }
        if (el.svgData === 'breaker') {
          const pairs = [[0, 3], [1, 4], [2, 5]];
          return pairs.some(([a, b]) => faultPinSet.has(`${el.id}:${a}`) && faultPinSet.has(`${el.id}:${b}`));
        }
        const numNodes = (compDef && compDef.nodes) ? compDef.nodes.length : 2;
        for (let i = 0; i < numNodes; i += 2) {
          if (faultPinSet.has(`${el.id}:${i}`) && faultPinSet.has(`${el.id}:${i + 1}`)) {
            return true;
          }
        }
        return false;
      };

      // Evaluate Protection Auto-Trip & Fuse Melting with educational visible delay
      if (stepDt > 0) {
        const shortFaultPins = (shortCircuitDetected && shortedNets.length > 0)
          ? collectFaultPins(shortedNets, false)
          : new Set();
        const earthFaultPins = (earthLeakageDetected && earthFaultNets.length > 0)
          ? collectFaultPins(earthFaultNets, true)
          : new Set();

        for (const el of elements) {
          const svg = el.svgData || '';

          // A. Cartridge Fuses (fuse1p..4p, NOT fuseSwitch*): ~1.3s thermal melt
          if (svg.startsWith('fuse') && !svg.startsWith('fuseSwitch')) {
            const isOff = this.manualStates.get(el.id) === false;
            if (isOff) continue;
            if (isDeviceInFault(el, shortFaultPins)) {
              const currentHeat = (this.fuseHeatTimers.get(el.id) || 0) + stepDt;
              this.fuseHeatTimers.set(el.id, currentHeat);
              if (currentHeat >= 1300) {
                this.manualStates.set(el.id, false);
                this.fuseBlownElements.add(el.id);
                newlyBlownFuses.push(el.id);
                elementFrames.set(el.id, 1);
                converged = false;
              }
            } else if (this.fuseHeatTimers.has(el.id)) {
              this.fuseHeatTimers.set(el.id, Math.max(0, this.fuseHeatTimers.get(el.id) - stepDt * 0.5));
            }
            continue;
          }

          // B. Magnetic/Short-Circuit Breakers (MCB, MPCB, TM-Breaker, RCBO): ~0.9s auto-trip on short circuit
          // Pure RCCB/ELCB (rccbBreaker*) does NOT trip on standard L-N short circuit (only earth leakage)
          const isShortCircuitBreaker =
            svg === 'breaker' ||
            svg.startsWith('breaker') ||
            svg.startsWith('tmBreaker') ||
            svg.startsWith('motorBreaker') ||
            svg.startsWith('rcboBreaker');

          if (isShortCircuitBreaker && !!this.manualStates.get(el.id)) {
            if (isDeviceInFault(el, shortFaultPins)) {
              const t = (this.breakerFaultTimers.get(el.id) || 0) + stepDt;
              this.breakerFaultTimers.set(el.id, t);
              if (t >= 900) {
                this.manualStates.set(el.id, false);
                this.breakerFaultTimers.delete(el.id);
                this.trippedBreakers.add(el.id);
                newlyTrippedBreakers.push({ id: el.id, tag: el.tag || svg, reason: 'short' });
                elementFrames.set(el.id, 0);
                converged = false;
                continue;
              }
            } else if (this.breakerFaultTimers.has(el.id)) {
              this.breakerFaultTimers.set(el.id, Math.max(0, this.breakerFaultTimers.get(el.id) - stepDt));
            }
          }

          // C. Earth-Leakage Breakers (RCCB/ELCB & RCBO): ~0.8s auto-trip on Phase-to-PE/GND leakage
          const isEarthLeakageBreaker = svg.startsWith('rccbBreaker') || svg.startsWith('rcboBreaker');
          if (isEarthLeakageBreaker && !!this.manualStates.get(el.id)) {
            if (isDeviceInFault(el, earthFaultPins)) {
              const t = (this.rccbFaultTimers.get(el.id) || 0) + stepDt;
              this.rccbFaultTimers.set(el.id, t);
              if (t >= 800) {
                this.manualStates.set(el.id, false);
                this.rccbFaultTimers.delete(el.id);
                this.trippedEarthLeakage.add(el.id);
                newlyTrippedBreakers.push({ id: el.id, tag: el.tag || svg, reason: 'earth' });
                elementFrames.set(el.id, 0);
                converged = false;
              }
            } else if (this.rccbFaultTimers.has(el.id)) {
              this.rccbFaultTimers.set(el.id, Math.max(0, this.rccbFaultTimers.get(el.id) - stepDt));
            }
          }
        }
      }

      for (const el of elements) {
        const compDef = COMPONENTS_DATA[el.svgData];
        if (!compDef) continue;
        const cat = compDef.category || '';

        if (cat === 'coils') {
          const pA = `${el.id}:0`;
          const pB = `${el.id}:1`;
          const potA = netResultMap.get(pA) || Potential.NONE;
          const potB = netResultMap.get(pB) || Potential.NONE;

          let energized = this.isValidPair(potA, potB) || seriesEnergizedLoads.has(el.id);

          if (!this.timerStates.has(el.id)) {
            const preset = (el.valueTimeOn !== undefined && el.valueTimeOn !== null) ? Number(el.valueTimeOn) * 1000 : 2000;
            const presetOff = (el.valueTimeOff !== undefined && el.valueTimeOff !== null) ? Number(el.valueTimeOff) * 1000 : preset;
            this.timerStates.set(el.id, {
              elapsedMs: 0,
              elapsedOffMs: 0,
              presetMs: preset,
              presetOffMs: presetOff,
              prevEnergized: false,
              outputState: false,
              isTiming: false,
              energized: false
            });
          }

          const state = this.timerStates.get(el.id);
          state.energized = energized;
          if (el.valueTimeOn !== undefined && el.valueTimeOn !== null) {
            state.presetMs = Number(el.valueTimeOn) * 1000;
          }
          if (el.valueTimeOff !== undefined && el.valueTimeOff !== null) {
            state.presetOffMs = Number(el.valueTimeOff) * 1000;
          }

          const timerType = compDef.timerType || (compDef.info ? compDef.info.timerType : '') || '';
          let nextOutput = state.outputState;

          if (timerType === 'delayOn' || el.svgData === 'coilDelayOn') {
            if (energized) {
              if (state.elapsedMs < state.presetMs) {
                state.elapsedMs += stepDt;
                if (state.elapsedMs >= state.presetMs) {
                  state.elapsedMs = state.presetMs;
                  nextOutput = true;
                  state.isTiming = false;
                } else {
                  nextOutput = false;
                  state.isTiming = true;
                }
              } else {
                nextOutput = true;
                state.isTiming = false;
              }
            } else {
              state.elapsedMs = 0;
              state.isTiming = false;
              nextOutput = false;
            }
          } else if (timerType === 'delayOff' || el.svgData === 'coilDelayOff') {
            if (energized) {
              state.elapsedMs = 0;
              state.isTiming = false;
              nextOutput = true;
            } else if (state.outputState) {
              state.elapsedMs += stepDt;
              if (state.elapsedMs < state.presetMs) {
                state.isTiming = true;
                nextOutput = true;
              } else {
                state.elapsedMs = state.presetMs;
                state.isTiming = false;
                nextOutput = false;
              }
            } else {
              state.elapsedMs = 0;
              state.isTiming = false;
              nextOutput = false;
            }
          } else if (timerType === 'delayOnOff' || el.svgData === 'coilDelayOnOff') {
            const pOff = state.presetOffMs || state.presetMs;
            if (energized) {
              state.elapsedOffMs = 0;
              if (state.elapsedMs < state.presetMs) {
                state.elapsedMs += stepDt;
                if (state.elapsedMs >= state.presetMs) {
                  state.elapsedMs = state.presetMs;
                  nextOutput = true;
                  state.isTiming = false;
                } else {
                  nextOutput = false;
                  state.isTiming = true;
                }
              } else {
                nextOutput = true;
                state.isTiming = false;
              }
            } else {
              state.elapsedMs = 0;
              if (state.outputState) {
                state.elapsedOffMs = (state.elapsedOffMs || 0) + stepDt;
                if (state.elapsedOffMs < pOff) {
                  state.isTiming = true;
                  nextOutput = true;
                } else {
                  state.elapsedOffMs = pOff;
                  state.isTiming = false;
                  nextOutput = false;
                }
              } else {
                state.isTiming = false;
                nextOutput = false;
              }
            }
          } else if (timerType === 'flash' || el.svgData === 'coilFlasher') {
            if (energized) {
              const tOn = Math.max(100, (state.presetMs && state.presetMs > 0) ? state.presetMs : 1000);
              const tOff = Math.max(100, (state.presetOffMs && state.presetOffMs > 0) ? state.presetOffMs : tOn);
              const tTotal = tOn + tOff;
              state.presetMs = tOn;
              state.presetOffMs = tOff;

              state.elapsedMs = (state.elapsedMs + stepDt) % tTotal;
              state.isTiming = true;
              nextOutput = state.elapsedMs < tOn;
            } else {
              state.elapsedMs = 0;
              state.isTiming = false;
              nextOutput = false;
            }
          } else if (timerType === 'latch' || el.svgData === 'coilLatch') {
            state.isTiming = false;
            if (stepDt > 0 && energized && !state.prevEnergized) {
              nextOutput = !state.outputState;
            }
          } else {
            // Standard instant coil and solenoid
            state.isTiming = false;
            nextOutput = energized;
          }

          if (stepDt > 0) {
            state.prevEnergized = energized;
          }

          // Frame status:
          // For Flasher coil: frame toggles between 1 (ON / Pulse) and 0 (OFF / Pause) so it visibly blinks
          // For other coils: 1 = Energized, 0 = Idle
          if (el.svgData === 'coilFlasher' || timerType === 'flash') {
            elementFrames.set(el.id, nextOutput ? 1 : 0);
          } else {
            elementFrames.set(el.id, (energized || nextOutput) ? 1 : 0);
          }

          if (state.outputState !== nextOutput) {
            state.outputState = nextOutput;
            if (el.tag) {
              tagStateMap.set(el.tag.trim(), nextOutput);
            }
            converged = false;
          } else if (el.tag) {
            if (nextOutput) {
              tagStateMap.set(el.tag.trim(), true);
            }
          }
        } else if (el.svgData === 'phaseFailure') {
          const p0 = netResultMap.get(`${el.id}:0`) || Potential.NONE;
          const p1 = netResultMap.get(`${el.id}:1`) || Potential.NONE;
          const p2 = netResultMap.get(`${el.id}:2`) || Potential.NONE;
          const active = (p0 !== 0 && p1 !== 0 && p2 !== 0 && ((p0 | p1 | p2) & VALID_3PH) === VALID_3PH);
          elementFrames.set(el.id, active ? 1 : 0);
          if (el.tag) {
            const tag = el.tag.trim();
            if (tagStateMap.get(tag) !== active) {
              tagStateMap.set(tag, active);
              converged = false;
            }
          }
        } else if (cat === 'loads') {
          const pA = `${el.id}:0`;
          const pB = `${el.id}:1`;
          const potA = netResultMap.get(pA) || Potential.NONE;
          const potB = netResultMap.get(pB) || Potential.NONE;

          let energized = this.isValidPair(potA, potB) || seriesEnergizedLoads.has(el.id);

          if (el.svgData === 'lampBlink') {
            if (energized) {
              let state = this.timerStates.get(el.id);
              if (!state) {
                state = { elapsedMs: 0, presetMs: 500 };
                this.timerStates.set(el.id, state);
              }
              if (stepDt > 0) {
                state.elapsedMs = (state.elapsedMs + stepDt) % (2 * state.presetMs);
              }
              const isBlinkOn = state.elapsedMs < state.presetMs;
              elementFrames.set(el.id, isBlinkOn ? 1 : 0);
            } else {
              this.timerStates.delete(el.id);
              elementFrames.set(el.id, 0);
            }
          } else {
            elementFrames.set(el.id, energized ? 1 : 0);
          }
        } else if (cat === 'motors') {
          if (el.svgData === 'motor3ph') {
            const u = netResultMap.get(`${el.id}:0`) || Potential.NONE;
            const v = netResultMap.get(`${el.id}:1`) || Potential.NONE;
            const w = netResultMap.get(`${el.id}:2`) || Potential.NONE;

            const hasL1_u = (u & Potential.L1) !== 0;
            const hasL2_u = (u & Potential.L2) !== 0;
            const hasL3_u = (u & Potential.L3) !== 0;

            const hasL1_v = (v & Potential.L1) !== 0;
            const hasL2_v = (v & Potential.L2) !== 0;
            const hasL3_v = (v & Potential.L3) !== 0;

            const hasL1_w = (w & Potential.L1) !== 0;
            const hasL2_w = (w & Potential.L2) !== 0;
            const hasL3_w = (w & Potential.L3) !== 0;

            const is3Ph = (u !== 0 && v !== 0 && w !== 0 && ((u | v | w) & VALID_3PH) === VALID_3PH);
            const isReverse = (hasL3_u && hasL2_v && hasL1_w) || (hasL1_u && hasL3_v && hasL2_w) || (hasL2_u && hasL1_v && hasL3_w);

            let frame = 0;
            if (is3Ph) {
              frame = isReverse ? 2 : 1;
            }
            elementFrames.set(el.id, frame);
          } else if (el.svgData === 'motorDC') {
            // Motor DC strictly requires DC supply (DC_P & DC_N); rejects AC (stays frame 0)
            const p1 = netResultMap.get(`${el.id}:0`) || Potential.NONE;
            const p2 = netResultMap.get(`${el.id}:1`) || Potential.NONE;
            const hasP1Pos = (p1 & Potential.DC_P) !== 0 && (p1 & Potential.DC_N) === 0;
            const hasP1Neg = (p1 & Potential.DC_N) !== 0 && (p1 & Potential.DC_P) === 0;
            const hasP2Pos = (p2 & Potential.DC_P) !== 0 && (p2 & Potential.DC_N) === 0;
            const hasP2Neg = (p2 & Potential.DC_N) !== 0 && (p2 & Potential.DC_P) === 0;

            let frame = 0;
            if (hasP1Pos && hasP2Neg) {
              frame = 1; // Forward rotation (CW)
            } else if (hasP1Neg && hasP2Pos) {
              frame = 2; // Reverse rotation (CCW)
            } else if (seriesEnergizedLoads.has(el.id)) {
              // Series DC circuit (already filtered dcOnly in series DFS)
              frame = hasP1Neg || hasP2Pos ? 2 : 1;
            }
            elementFrames.set(el.id, frame);
          } else if (el.svgData === 'motor1ph') {
            const p1 = netResultMap.get(`${el.id}:0`) || Potential.NONE;
            const p2 = netResultMap.get(`${el.id}:1`) || Potential.NONE;
            const isRunning = this.isValidPair(p1, p2) || seriesEnergizedLoads.has(el.id);
            elementFrames.set(el.id, isRunning ? 1 : 0);
          } else if (el.svgData === 'motorStarDelta' || el.svgData === 'motorDhalander' || el.svgData === 'motorTwoSpeeds') {
            const u1 = netResultMap.get(`${el.id}:0`) || Potential.NONE;
            const v1 = netResultMap.get(`${el.id}:1`) || Potential.NONE;
            const w1 = netResultMap.get(`${el.id}:2`) || Potential.NONE;

            const n3 = netResultMap.get(`${el.id}:3`) || Potential.NONE;
            const n4 = netResultMap.get(`${el.id}:4`) || Potential.NONE;
            const n5 = netResultMap.get(`${el.id}:5`) || Potential.NONE;

            const is3Ph_set1 = (u1 !== 0 && v1 !== 0 && w1 !== 0 && ((u1 | v1 | w1) & VALID_3PH) === VALID_3PH);
            const is3Ph_set2 = (n3 !== 0 && n4 !== 0 && n5 !== 0 && ((n3 | n4 | n5) & VALID_3PH) === VALID_3PH);

            const calcReverse = (aU, aV, aW) => {
              const hasL1_u = (aU & Potential.L1) !== 0;
              const hasL2_u = (aU & Potential.L2) !== 0;
              const hasL3_u = (aU & Potential.L3) !== 0;
              const hasL1_v = (aV & Potential.L1) !== 0;
              const hasL2_v = (aV & Potential.L2) !== 0;
              const hasL3_v = (aV & Potential.L3) !== 0;
              const hasL1_w = (aW & Potential.L1) !== 0;
              const hasL2_w = (aW & Potential.L2) !== 0;
              const hasL3_w = (aW & Potential.L3) !== 0;
              return (hasL3_u && hasL2_v && hasL1_w) || (hasL1_u && hasL3_v && hasL2_w) || (hasL2_u && hasL1_v && hasL3_w);
            };

            let frame = 0;
            if (el.svgData === 'motorStarDelta') {
              // Pins: 0=U1, 1=V1, 2=W1, 3=W2, 4=U2, 5=V2
              const net3 = pinToNetId.get(`${el.id}:3`);
              const net4 = pinToNetId.get(`${el.id}:4`);
              const net5 = pinToNetId.get(`${el.id}:5`);
              const isStarPoint = (net3 !== undefined && net3 === net4 && net4 === net5);
              // Delta requires valid 3-phase on both sides AND phase difference across each physical winding (U1!=U2, V1!=V2, W1!=W2)
              const w2 = n3, u2 = n4, v2 = n5;
              const isDeltaValid = is3Ph_set1 && is3Ph_set2 &&
                ((u1 & u2) === 0) && ((v1 & v2) === 0) && ((w1 & w2) === 0);

              if (is3Ph_set1 && isStarPoint) {
                frame = calcReverse(u1, v1, w1) ? 2 : 1; // Star (Y)
              } else if (isDeltaValid) {
                frame = calcReverse(u1, v1, w1) ? 4 : 3; // Delta (Δ)
              }
            } else {
              // motorDhalander & motorTwoSpeeds:
              // Set 1 (U1-V1-W1) -> Speed 1 (frame 1/2), Set 2 (U2-V2-W2) -> Speed 2 (frame 3/4), Both -> Conflict (frame 5)
              if (is3Ph_set1 && is3Ph_set2) {
                frame = 5; // Dual-winding conflict / stall
              } else if (is3Ph_set1) {
                frame = calcReverse(u1, v1, w1) ? 2 : 1; // Speed 1
              } else if (is3Ph_set2) {
                frame = calcReverse(n3, n4, n5) ? 4 : 3; // Speed 2
              }
            }
            elementFrames.set(el.id, frame);
          } else {
            const potA = netResultMap.get(`${el.id}:0`) || Potential.NONE;
            const potB = netResultMap.get(`${el.id}:1`) || Potential.NONE;
            const active = this.isValidPair(potA, potB) || seriesEnergizedLoads.has(el.id);
            elementFrames.set(el.id, active ? 1 : 0);
          }
        }
      }
    }

    const isDcOverheat = shortedNets.some(n => n.isDcOverheat);
    const isFuseBlown = this.fuseBlownElements.size > 0 && !shortCircuitDetected;
    const trippedBreakerTags = [];
    for (const id of this.trippedBreakers) {
      const e = elemMap.get(id);
      if (e) trippedBreakerTags.push(e.tag || e.svgData);
    }
    const trippedEarthLeakageTags = [];
    for (const id of this.trippedEarthLeakage) {
      const e = elemMap.get(id);
      if (e) trippedEarthLeakageTags.push(e.tag || e.svgData);
    }

    return {
      elementFrames,
      wirePotentials,
      shortCircuit: shortCircuitDetected,
      isDcOverheat,
      isEarthLeakage: earthLeakageDetected,
      isFuseBlown,
      newlyBlownFuses,
      trippedBreakerTags,
      trippedEarthLeakageTags,
      newlyTrippedBreakers,
      shortedNets,
      earthFaultNets,
      tagStateMap,
      timerStates: this.timerStates,
    };
  }

  toggleSwitch(elemId, svgData = null) {
    if (svgData === 'switch3p0') {
      // Switch 3 Positions I-0-II
      // Siklus klik: 1 (Posisi 0/Netral) -> 0 (Posisi I) -> 2 (Posisi II) -> 1 (Netral)
      const current = this.manualStates.get(elemId);
      const currVal = (current !== undefined) ? current : 1;
      let nextVal = 1;
      if (currVal === 1) nextVal = 0;
      else if (currVal === 0) nextVal = 2;
      else nextVal = 1;
      this.manualStates.set(elemId, nextVal);
      return nextVal;
    } else if (svgData === 'switch3p') {
      // Switch 3 Positions I-II-III
      // Siklus klik: 0 (Posisi I) -> 1 (Posisi II) -> 2 (Posisi III) -> 0 (Posisi I)
      const current = this.manualStates.get(elemId);
      const currVal = (current !== undefined) ? current : 0;
      const nextVal = (currVal + 1) % 3;
      this.manualStates.set(elemId, nextVal);
      return nextVal;
    } else {
      const current = !!this.manualStates.get(elemId);
      const next = !current;
      this.manualStates.set(elemId, next);
      if (next) {
        this.trippedBreakers.delete(elemId);
        this.trippedEarthLeakage.delete(elemId);
      }
      if (this.emergencyLatched.has(elemId)) {
        this.emergencyLatched.set(elemId, next);
      }
      if (this.overloadTripped.has(elemId) || (svgData && svgData.startsWith('overload'))) {
        this.overloadTripped.set(elemId, next);
      }
      return next;
    }
  }

  setSwitchPosition(elemId, pos) {
    this.manualStates.set(elemId, pos);
    if (pos) {
      this.trippedBreakers.delete(elemId);
      this.trippedEarthLeakage.delete(elemId);
    }
    return pos;
  }

  setButtonPressed(elemId, pressed) {
    this.manualStates.set(elemId, pressed);
  }

  toggleEmergency(elemId) {
    const latched = !!(this.emergencyLatched.get(elemId) || this.manualStates.get(elemId));
    this.emergencyLatched.set(elemId, !latched);
    this.manualStates.set(elemId, !latched);
    return !latched;
  }

  tripOverload(elemId) {
    this.overloadTripped.set(elemId, true);
    this.manualStates.set(elemId, true);
  }

  resetOverload(elemId) {
    this.overloadTripped.set(elemId, false);
    this.manualStates.set(elemId, false);
  }
}

function getPotentialColor(pot) {
  const isLight = (typeof document !== 'undefined' && document.documentElement &&
    document.documentElement.getAttribute('data-theme') === 'light');
  if (isLight) {
    if (pot === Potential.NONE) return '#475569';
    if (pot === Potential.AC_SHORT) return '#ea580c';
    if (pot === Potential.DC_OVERHEAT) return '#dc2626';
    if (pot === Potential.L1) return '#dc2626';
    if (pot === Potential.L2) return '#d97706';
    if (pot === Potential.L3) return '#059669';
    if (pot === Potential.N) return '#2563eb';
    if (pot === Potential.PE) return '#15803d';
    if (pot === Potential.GND) return '#047857';
    if (pot === Potential.DC_P) return '#b91c1c';
    if (pot === Potential.DC_N) return '#0284c7';
    if (((pot & Potential.DC_P) !== 0) && ((pot & Potential.DC_N) !== 0)) return '#dc2626';
    if ((pot & (Potential.L1 | Potential.L2 | Potential.L3)) !== 0 &&
        (pot & (Potential.N | Potential.PE | Potential.GND)) !== 0) return '#ea580c';
    return '#ea580c';
  }
  if (pot === Potential.NONE) return '#6b7280';
  if (pot === Potential.AC_SHORT) return '#f97316';
  if (pot === Potential.DC_OVERHEAT) return '#dc2626';
  if (pot === Potential.L1) return '#ef4444';
  if (pot === Potential.L2) return '#f59e0b';
  if (pot === Potential.L3) return '#10b981';
  if (pot === Potential.N) return '#3b82f6';
  if (pot === Potential.PE) return '#84cc16';
  if (pot === Potential.GND) return '#059669';
  if (pot === Potential.DC_P) return '#dc2626';
  if (pot === Potential.DC_N) return '#38bdf8';
  // Fallback if multi-bit fault mask arrives directly
  if (((pot & Potential.DC_P) !== 0) && ((pot & Potential.DC_N) !== 0)) return '#dc2626';
  if ((pot & (Potential.L1 | Potential.L2 | Potential.L3)) !== 0 &&
      (pot & (Potential.N | Potential.PE | Potential.GND)) !== 0) return '#f97316';
  return '#f97316';
}

if (typeof globalThis !== 'undefined') {
  globalThis.MashimurelayEngine = MashimurelayEngine;
  globalThis.Potential = Potential;
}
