/**
 * Mashimurelay Embedded Audio & Sound Engine
 * Uses Web Audio API with embedded Base64 buffers (Zero HTTP requests, immune to IDM / download interceptors).
 * Provides sustained siren looping with fade-out and rhythmic buzzer pacing.
 */

class MashimurelaySoundManager {
  constructor() {
    this.audioCtx = null;
    this.isMuted = localStorage.getItem('mashimurelay_sound_muted') === 'true';
    this.masterGain = null;
    this.buffers = {};
    this.channels = {
      motor: { source: null, gain: null, isRunning: false, stopTimeout: null },
      buzzer: { source: null, gain: null, isRunning: false, stopTimeout: null },
      siren: { source: null, gain: null, isRunning: false, stopTimeout: null },
      bell: { source: null, gain: null, isRunning: false, stopTimeout: null },
      lampBlink: { source: null, gain: null, isRunning: false, stopTimeout: null },
    };
    this.prevLampStates = new Map();
    this.isInitialized = false;

    // Auto unlock on first user gesture
    const unlockAudio = () => {
      this.ensureContext();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
  }

  ensureContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
        this.loadEmbeddedSounds();
      }
    }
  }

  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  createBuzzerBuffer(rawBuffer, soundDuration = 1.0, silenceDuration = 0.8) {
    if (!this.audioCtx || !rawBuffer) return rawBuffer;
    const sampleRate = rawBuffer.sampleRate;
    const numChannels = rawBuffer.numberOfChannels;

    const activeFrames = Math.floor(soundDuration * sampleRate);
    const silenceFrames = Math.floor(silenceDuration * sampleRate);
    const totalFrames = activeFrames + silenceFrames;

    const outputBuffer = this.audioCtx.createBuffer(numChannels, totalFrames, sampleRate);

    // Auto-detect first active sample to remove encoder delay
    const ch0 = rawBuffer.getChannelData(0);
    let startOffset = 0;
    for (let i = 0; i < Math.min(ch0.length, sampleRate * 0.25); i++) {
      if (Math.abs(ch0[i]) > 0.008) {
        startOffset = Math.max(0, i - 32);
        break;
      }
    }

    const fadeInSamples = Math.floor(0.005 * sampleRate);  // 5ms micro fade-in
    const fadeOutSamples = Math.floor(0.020 * sampleRate); // 20ms micro fade-out to zero

    for (let ch = 0; ch < numChannels; ch++) {
      const src = rawBuffer.getChannelData(ch);
      const dst = outputBuffer.getChannelData(ch);
      const availableFrames = Math.min(activeFrames, src.length - startOffset);

      for (let i = 0; i < availableFrames; i++) {
        let sample = src[startOffset + i];
        if (i < fadeInSamples) {
          const phase = i / fadeInSamples;
          sample *= 0.5 * (1 - Math.cos(Math.PI * phase));
        } else if (i >= availableFrames - fadeOutSamples) {
          const remaining = availableFrames - 1 - i;
          const phase = remaining / fadeOutSamples;
          sample *= 0.5 * (1 - Math.cos(Math.PI * phase));
        }
        dst[i] = sample;
      }
      // Remaining frames from availableFrames to totalFrames are 0.0 (exact 0.8s silence buffer)
    }

    return outputBuffer;
  }

  createSeamlessSirenBuffer(rawBuffer) {
    if (!this.audioCtx || !rawBuffer) return rawBuffer;
    const sampleRate = rawBuffer.sampleRate;
    const numChannels = rawBuffer.numberOfChannels;
    const totalRawFrames = rawBuffer.length;
    const totalDurationSec = totalRawFrames / sampleRate;

    // For car-horn.mp3 (~10.24s):
    // Trim initial silence/attack (~0.15s)
    // Cut before the end decay: cut off ~1.25s before the end where horn drops
    const trimStartSec = Math.min(0.15, totalDurationSec * 0.05);
    const trimEndSec = totalDurationSec > 5.0 ? 1.25 : Math.min(0.20, totalDurationSec * 0.16);
    const crossfadeSec = 0.20; // 200ms smooth crossfade window

    const startFrame = Math.floor(trimStartSec * sampleRate);
    const endFrame = Math.max(startFrame + Math.floor(1.0 * sampleRate), totalRawFrames - Math.floor(trimEndSec * sampleRate));
    const steadyLength = endFrame - startFrame;

    const xfadeFrames = Math.min(
      Math.floor(crossfadeSec * sampleRate),
      Math.floor(steadyLength * 0.25)
    );

    // Cross-correlation phase alignment on channel 0
    const ch0 = rawBuffer.getChannelData(0);
    const searchWindow = Math.min(Math.floor(0.020 * sampleRate), Math.floor(xfadeFrames * 0.4));
    const matchWindow = Math.min(Math.floor(0.015 * sampleRate), xfadeFrames);

    let bestOffset = 0;
    let maxCorrelation = -Infinity;
    const nominalTailStart = endFrame - xfadeFrames;

    for (let offset = -searchWindow; offset <= searchWindow; offset++) {
      const candidateTailStart = nominalTailStart + offset;
      if (candidateTailStart <= startFrame + xfadeFrames || candidateTailStart + matchWindow >= totalRawFrames) {
        continue;
      }
      let corr = 0;
      for (let i = 0; i < matchWindow; i++) {
        corr += ch0[startFrame + i] * ch0[candidateTailStart + i];
      }
      if (corr > maxCorrelation) {
        maxCorrelation = corr;
        bestOffset = offset;
      }
    }

    const alignedEndFrame = nominalTailStart + bestOffset + xfadeFrames;
    const alignedSteadyLength = alignedEndFrame - startFrame;
    const loopLength = alignedSteadyLength - xfadeFrames;

    const outputBuffer = this.audioCtx.createBuffer(numChannels, loopLength, sampleRate);

    for (let ch = 0; ch < numChannels; ch++) {
      const src = rawBuffer.getChannelData(ch);
      const dst = outputBuffer.getChannelData(ch);

      // Copy main body
      for (let i = 0; i < loopLength; i++) {
        dst[i] = src[startFrame + xfadeFrames + i];
      }

      // Fold head into tail using equal-power Hann curve
      const tailStartInDst = loopLength - xfadeFrames;
      for (let i = 0; i < xfadeFrames; i++) {
        const phase = i / xfadeFrames;
        const weightIn = 0.5 * (1 - Math.cos(Math.PI * phase));
        const weightOut = 1.0 - weightIn;

        const tailSample = dst[tailStartInDst + i];
        const headSample = src[startFrame + i];
        dst[tailStartInDst + i] = (tailSample * weightOut) + (headSample * weightIn);
      }
    }

    return outputBuffer;
  }

  normalizeAudioBuffer(rawBuffer, targetPeak = 0.98) {
    if (!rawBuffer) return rawBuffer;
    let maxAmp = 0;
    const numChannels = rawBuffer.numberOfChannels;
    for (let ch = 0; ch < numChannels; ch++) {
      const data = rawBuffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > maxAmp) maxAmp = abs;
      }
    }
    if (maxAmp > 0.001) {
      const gain = targetPeak / maxAmp;
      for (let ch = 0; ch < numChannels; ch++) {
        const data = rawBuffer.getChannelData(ch);
        for (let i = 0; i < data.length; i++) {
          data[i] *= gain;
        }
      }
    }
    return rawBuffer;
  }

  async loadEmbeddedSounds() {
    if (this.isInitialized || !this.audioCtx) return;
    this.isInitialized = true;

    if (!window.SOUNDS_DATA) {
      console.warn('[Mashimurelay Audio] SOUNDS_DATA not loaded yet.');
      return;
    }

    for (const [key, b64] of Object.entries(window.SOUNDS_DATA)) {
      try {
        const arrayBuf = this.base64ToArrayBuffer(b64);
        const decoded = await this.audioCtx.decodeAudioData(arrayBuf);
        
        if (key === 'buzzer') {
          // Exactly 1.0 second buzz sound + 0.8 second silence buffer, normalized for maximum punch
          const buzzBuf = this.createBuzzerBuffer(decoded, 1.0, 0.8);
          this.buffers[key] = this.normalizeAudioBuffer(buzzBuf, 0.98);
        } else if (key === 'siren') {
          // Closed-loop seamless steady-state car-horn buffer, normalized for high clarity
          const sirenBuf = this.createSeamlessSirenBuffer(decoded);
          this.buffers[key] = this.normalizeAudioBuffer(sirenBuf, 0.98);
        } else if (key === 'motor') {
          // Motor idle rumbling normalized for crisp presence
          this.buffers[key] = this.normalizeAudioBuffer(decoded, 0.98);
        } else if (key === 'bell') {
          // Authentic mechanical electric bell ring normalized for crisp original presence
          this.buffers[key] = this.normalizeAudioBuffer(decoded, 0.98);
        } else {
          this.buffers[key] = decoded;
        }
      } catch (err) {
        console.warn(`[Mashimurelay Audio] Failed to decode embedded sound '${key}':`, err.message);
      }
    }
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  setMuted(muted) {
    this.isMuted = muted;
    localStorage.setItem('mashimurelay_sound_muted', muted ? 'true' : 'false');
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 1.0, now + 0.05);
    }
    window.dispatchEvent(new CustomEvent('sound-mute-changed', { detail: { isMuted: this.isMuted } }));
  }

  /**
   * Periodic evaluation called from simulation render loop
   */
  update(simResult, elements) {
    if (!simResult || !elements || !Array.isArray(elements)) return;
    this.ensureContext();
    if (!this.audioCtx || this.audioCtx.state === 'suspended') return;

    let anyMotorSpinning = false;
    let anyBuzzerActive = false;
    let anySirenActive = false;
    let anyBellActive = false;

    elements.forEach(el => {
      const frame = simResult.elementFrames ? (simResult.elementFrames.get(el.id) || 0) : 0;
      const compDef = window.COMPONENTS_DATA ? window.COMPONENTS_DATA[el.svgData] : null;
      const cat = compDef ? compDef.category : '';

      if (cat === 'motors') {
        if (frame >= 1 && frame <= 4) anyMotorSpinning = true;
      } else if (el.svgData === 'buzzer') {
        if (frame === 1) anyBuzzerActive = true;
      } else if (el.svgData === 'siren') {
        if (frame === 1) anySirenActive = true;
      } else if (el.svgData === 'ring') {
        if (frame === 1) anyBellActive = true;
      } else if (el.svgData === 'lampBlink') {
        // Synchronized sound: triggers click/chime precisely when lamp flashes ON (frame transitions 0 -> 1)
        const prev = this.prevLampStates.get(el.id) || 0;
        if (frame === 1 && prev === 0) {
          this.playOneShot('lamp', 0.85);
        }
        this.prevLampStates.set(el.id, frame);
      } else if (el.svgData === 'lamp' || cat === 'loads') {
        const prev = this.prevLampStates.get(el.id) || 0;
        if (frame === 1 && prev === 0) {
          this.playOneShot('lamp', 0.85);
        }
        this.prevLampStates.set(el.id, frame);
      }
    });

    // 1. Motor: Idle rumbling with smooth fade-in/out and normalized volume
    this.setLoopChannel('motor', anyMotorSpinning, {
      fadeInSec: 0.35,
      fadeOutSec: 0.50,
      targetVolume: 0.90
    });

    // 2. Buzzer: 1.0s buzz sound + 0.8s silence cadence normalized for clear presence
    this.setLoopChannel('buzzer', anyBuzzerActive, {
      fadeInSec: 0.02,
      fadeOutSec: 0.08,
      targetVolume: 0.95
    });

    // 3. Siren / Car Horn: Instant attack and instant stop without fade (authentic organic car horn)
    this.setLoopChannel('siren', anySirenActive, {
      fadeInSec: 0.002, // Instant attack
      fadeOutSec: 0.008, // Instant stop
      targetVolume: 1.00 // Full normalized punch
    });

    // 4. Bell Ring: Instant attack and instant stop without fade (authentic original electric bell)
    this.setLoopChannel('bell', anyBellActive, {
      fadeInSec: 0.002, // Instant attack (no fade-in)
      fadeOutSec: 0.008, // Instant cutoff (no fade-out)
      targetVolume: 0.95 // Authentic full volume tuned for Mashimurelay audio engine
    });
  }

  setLoopChannel(chName, shouldPlay, opts = {}) {
    const ch = this.channels[chName];
    if (!ch) return;

    const bufferKey = opts.bufferKey || chName;
    const buf = this.buffers[bufferKey];
    if (!buf || !this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const fadeInSec = opts.fadeInSec !== undefined ? opts.fadeInSec : 0.2;
    const fadeOutSec = opts.fadeOutSec !== undefined ? opts.fadeOutSec : 0.25;
    const targetVolume = opts.targetVolume !== undefined ? opts.targetVolume : 0.8;

    if (shouldPlay) {
      if (ch.stopTimeout) {
        clearTimeout(ch.stopTimeout);
        ch.stopTimeout = null;
        if (ch.source) {
          try {
            ch.source.stop();
            ch.source.disconnect();
            if (ch.gain) ch.gain.disconnect();
          } catch (e) {}
          ch.source = null;
          ch.gain = null;
        }
      }

      if (!ch.isRunning) {
        ch.isRunning = true;
        const source = this.audioCtx.createBufferSource();
        source.buffer = buf;
        source.loop = true;

        if (opts.loopStart !== undefined && opts.loopEnd !== undefined && buf.duration > opts.loopEnd) {
          source.loopStart = opts.loopStart;
          source.loopEnd = opts.loopEnd;
        }

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(targetVolume, now + fadeInSec);

        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        source.start(0);

        ch.source = source;
        ch.gain = gainNode;
      } else if (ch.gain) {
        if (Math.abs(ch.gain.gain.value - targetVolume) > 0.02) {
          ch.gain.gain.cancelScheduledValues(now);
          ch.gain.gain.setValueAtTime(ch.gain.gain.value, now);
          ch.gain.gain.linearRampToValueAtTime(targetVolume, now + (fadeInSec || 0.02));
        }
      }
    } else {
      if (ch.isRunning) {
        ch.isRunning = false;
        if (ch.gain && ch.source) {
          const oldSource = ch.source;
          const oldGain = ch.gain;
          oldGain.gain.cancelScheduledValues(now);
          oldGain.gain.setValueAtTime(oldGain.gain.value, now);
          oldGain.gain.linearRampToValueAtTime(0.0001, now + fadeOutSec);

          ch.stopTimeout = setTimeout(() => {
            try {
              oldSource.stop();
              oldSource.disconnect();
              oldGain.disconnect();
            } catch (e) {}
            if (ch.source === oldSource) {
              ch.source = null;
              ch.gain = null;
            }
          }, (fadeOutSec + 0.05) * 1000);
        }
      }
    }
  }

  playOneShot(key, volume = 0.8) {
    this.ensureContext();
    if (!this.audioCtx || this.audioCtx.state === 'suspended') return;
    const buf = this.buffers[key];
    if (!buf) return;

    try {
      const source = this.audioCtx.createBufferSource();
      source.buffer = buf;

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);

      source.connect(gain);
      gain.connect(this.masterGain);
      source.start(0);
    } catch (e) {
      console.warn(`[Mashimurelay Audio] Failed to play one-shot '${key}':`, e);
    }
  }

  stopAll() {
    this.prevLampStates.clear();
    for (const [chName, ch] of Object.entries(this.channels)) {
      if (ch.stopTimeout) {
        clearTimeout(ch.stopTimeout);
        ch.stopTimeout = null;
      }
      if (ch.gain && this.audioCtx) {
        try {
          const now = this.audioCtx.currentTime;
          ch.gain.gain.cancelScheduledValues(now);
          ch.gain.gain.linearRampToValueAtTime(0.0001, now + 0.15);
        } catch (e) {}
      }
      if (ch.source) {
        const s = ch.source;
        setTimeout(() => {
          try {
            s.stop();
            s.disconnect();
          } catch (e) {}
        }, 160);
        ch.source = null;
        ch.gain = null;
      }
      ch.isRunning = false;
    }
  }
}

// Global Sound Manager Instance
window.soundManager = new MashimurelaySoundManager();
