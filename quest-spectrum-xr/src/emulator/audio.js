/**
 * ZX Spectrum Audio Engine (Beeper + AY-3-8912 3-Channel Chiptune Synth)
 * High-performance continuous AudioBufferSource scheduling (WebXR & Quest 3 optimized)
 * Based directly on verified C# SpectrumEmulator Ay38912Device and Beeper implementation
 */

export class SpectrumAudio {
  constructor() {
    this.audioCtx = null;
    this.sampleRate = 48000; // Adapts to hardware (48kHz on Quest 3, 44.1kHz on desktop)
    this.samplesPerFrame = 960;
    this.isEnabled = true;
    this.volume = 0.65;
    this.isMuted = false;

    // Buffer scheduling state
    this.nextStartTime = 0;
    this.activeSources = new Set();

    // Beeper state per frame
    this.beeperState = 0.0;
    this.beeperFrameSamples = new Float32Array(1920);
    this.beeperSampleIdx = 0;

    // Frame output buffer
    this.frameBuffer = new Float32Array(1920);

    // AY-3-8912 registers (16 registers)
    this.ayRegs = new Uint8Array(16);
    this.ayRegs[7] = 0x3f; // Mixer: all tone/noise channels disabled on power-up
    this.aySelectedReg = 0;

    // AY tone channels phase accumulators (A, B, C)
    this.phase = [0.0, 0.0, 0.0];

    // AY Noise Generator (17-bit LFSR)
    this.noisePhase = 0.0;
    this.noiseLfsr = 1;

    // AY Envelope Generator
    this.envelopePhase = 0.0;
    this.envelopeLevel = 0;
    this.envelopeHolding = false;

    // DC-blocking filter state (1-pole high-pass ~30Hz cutoff)
    this.dcFilterState = 0.0;
    this.prevRawSample = 0.0;

    this.hasUserInteracted = false;
  }

  init() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
      if (!AudioContextClass) {
        return;
      }

      // Do NOT force sampleRate - let native hardware pick 48000 on Quest 3
      this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
      this.sampleRate = this.audioCtx.sampleRate || 48000;
      this.samplesPerFrame = Math.round(this.sampleRate / 50); // 960 at 48kHz, 882 at 44.1kHz

      this.beeperFrameSamples = new Float32Array(this.samplesPerFrame * 2);
      this.frameBuffer = new Float32Array(this.samplesPerFrame);

      // Master Gain
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);

      console.log(`[AudioEngine] Native Web Audio initialized: ${this.sampleRate}Hz, ${this.samplesPerFrame} samples/frame`);
    } catch (err) {
      console.warn('[AudioEngine] Initialization error:', err);
    }
  }

  unlock() {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended' || this.audioCtx.state === 'interrupted') {
      this.audioCtx.resume().then(() => {
        console.log('[AudioEngine] Audio resumed! State:', this.audioCtx.state);
        this.updateAudioButtonState(true);
      }).catch((e) => console.warn('[AudioEngine] Audio resume failed:', e));
    } else if (this.audioCtx.state === 'running') {
      this.updateAudioButtonState(true);
    }

    // Forceful hardware audio pipe wake-up for Quest 3 / Android OpenSL
    try {
      const ping = this.audioCtx.createBuffer(1, 64, this.sampleRate);
      const data = ping.getChannelData(0);
      for (let i = 0; i < 64; i++) data[i] = Math.sin(i * 0.2) * 0.005;
      const pingSrc = this.audioCtx.createBufferSource();
      pingSrc.buffer = ping;
      pingSrc.connect(this.gainNode || this.audioCtx.destination);
      pingSrc.start();
    } catch (err) {}

    this.hasUserInteracted = true;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
    this.updateAudioButtonState(!this.isMuted);
    return this.isMuted;
  }

  updateAudioButtonState(active) {
    const btn = document.getElementById('btn-toggle-sound');
    if (btn) {
      btn.textContent = active ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      btn.style.color = active ? '#00ff88' : '#888fa4';
    }
  }

  // Set Beeper bit from Port 0xFE (bit 4)
  setBeeper(val) {
    this.beeperState = val ? 0.65 : -0.65;
  }

  // Push sample from emulator frame loop
  pushBeeperSample() {
    if (this.beeperSampleIdx < this.beeperFrameSamples.length) {
      this.beeperFrameSamples[this.beeperSampleIdx++] = this.beeperState;
    }
  }

  // AY-3-8912 Port handling (matched to C# Ay38912Device.cs)
  selectAyRegister(reg) {
    this.aySelectedReg = reg & 0x0f;
  }

  writeAyData(val) {
    const sel = this.aySelectedReg;
    if (sel === 13) {
      this.ayRegs[sel] = val & 0x0f;
      this.envelopeLevel = (val & 0x04) !== 0 ? 0 : 15;
      this.envelopeHolding = false;
      this.envelopePhase = 0.0;
      return;
    }

    switch (sel) {
      case 1:
      case 3:
      case 5:
        this.ayRegs[sel] = val & 0x0f;
        break;
      case 6:
        this.ayRegs[sel] = val & 0x1f;
        break;
      case 7:
        this.ayRegs[sel] = val & 0x3f;
        break;
      case 8:
      case 9:
      case 10:
        this.ayRegs[sel] = val & 0x1f;
        break;
      default:
        this.ayRegs[sel] = val & 0xff;
        break;
    }
  }

  readAyData() {
    return this.ayRegs[this.aySelectedReg];
  }

  /**
   * Reset all AY-3-8912 registers, Beeper state, and stop any queued WebAudio buffers
   * Prevents stuck static notes or overlapping buffers when skipping through games
   */
  reset() {
    if (this.activeSources && this.activeSources.size > 0) {
      for (const src of this.activeSources) {
        try {
          src.onended = null;
          src.stop();
          src.disconnect();
        } catch (_) {}
      }
      this.activeSources.clear();
    }
    this.nextStartTime = 0;
    this.beeperState = 0.0;
    this.beeperSampleIdx = 0;
    if (this.beeperFrameSamples) this.beeperFrameSamples.fill(0);
    if (this.frameBuffer) this.frameBuffer.fill(0);
    if (this.ayRegs) {
      this.ayRegs.fill(0);
      this.ayRegs[7] = 0x3f;
    }
    this.aySelectedReg = 0;
    this.phase = [0.0, 0.0, 0.0];
    this.noisePhase = 0.0;
    this.noiseLfsr = 1;
    this.envelopePhase = 0.0;
    this.envelopeLevel = 0;
    this.envelopeHolding = false;
    this.dcFilterState = 0.0;
    this.prevRawSample = 0.0;
  }

  /**
   * Called once per PAL frame (50Hz) from spectrum.stepFrame()
   * Synthesizes exactly 1 frame of audio and schedules it to the audio hardware
   */
  endFrame(muteOutput = false) {
    if (muteOutput) {
      this.beeperSampleIdx = 0;
      return;
    }
    const len = this.samplesPerFrame;
    const sampleRate = this.sampleRate;
    const clockHz = 1773400.0; // AY Clock Hz (3.5469MHz / 2)
    const r = this.ayRegs;

    const beeperCount = this.beeperSampleIdx;

    for (let i = 0; i < len; i++) {
      // 1. Noise Generator (17-bit LFSR)
      const noisePeriod = (r[6] & 31) === 0 ? 1 : (r[6] & 31);
      this.noisePhase += clockHz / (16.0 * noisePeriod * sampleRate);
      while (this.noisePhase >= 1) {
        this.noisePhase -= 1;
        const feedback = ((this.noiseLfsr) ^ (this.noiseLfsr >> 3)) & 1;
        this.noiseLfsr = (this.noiseLfsr >> 1) | (feedback << 16);
      }

      // 2. Envelope Generator
      let envelopePeriod = r[11] | (r[12] << 8);
      if (envelopePeriod === 0) envelopePeriod = 1;
      this.envelopePhase += clockHz / (256.0 * envelopePeriod * sampleRate);
      if (this.envelopePhase >= 1 && !this.envelopeHolding) {
        this.envelopePhase -= Math.floor(this.envelopePhase);
        const down = (r[13] & 4) === 0;
        this.envelopeLevel += down ? -1 : 1;
        if (this.envelopeLevel < 0 || this.envelopeLevel > 15) {
          const hold = (r[13] & 1) !== 0;
          this.envelopeHolding = hold;
          this.envelopeLevel = this.envelopeLevel < 0 ? 0 : 15;
          if ((r[13] & 2) !== 0 && !hold) {
            this.envelopeLevel = 15 - this.envelopeLevel;
          }
        }
      }

      // 3. 3 Tone Channels + Mixer
      let ayMixed = 0;
      for (let ch = 0; ch < 3; ch++) {
        let period = r[ch * 2] | ((r[ch * 2 + 1] & 15) << 8);
        if (period === 0) period = 1;
        this.phase[ch] += clockHz / (16.0 * period * sampleRate);
        this.phase[ch] -= Math.floor(this.phase[ch]);

        const volReg = r[8 + ch];
        const vol = (volReg & 16) !== 0 ? this.envelopeLevel : (volReg & 15);
        const tone = (r[7] & (1 << ch)) !== 0 || this.phase[ch] < 0.5;
        const noise = (r[7] & (8 << ch)) !== 0 || (this.noiseLfsr & 1) !== 0;

        if (tone && noise) {
          ayMixed += vol;
        }
      }

      // 4. Beeper
      let beeper = 0;
      if (beeperCount > 0) {
        const bIdx = Math.floor((i / len) * beeperCount);
        beeper = this.beeperFrameSamples[bIdx];
      }

      // Combine AY (normalized from 0..45 to 0..1) + beeper
      const rawSample = (ayMixed / 45.0) + (beeper * 0.35);

      // 5. 1-pole High-Pass DC-blocking Filter (~30Hz cutoff)
      // Removes DC offset to prevent Android/Quest 3 DSP speaker clamping
      const filtered = rawSample - this.prevRawSample + 0.995 * this.dcFilterState;
      this.prevRawSample = rawSample;
      this.dcFilterState = filtered;

      this.frameBuffer[i] = Math.max(-1.0, Math.min(1.0, filtered));
    }

    // Reset beeper index for next frame
    this.beeperSampleIdx = 0;

    // Schedule frame audio to Web Audio if audio context is active
    if (!this.audioCtx) this.init();
    if (!this.audioCtx || this.isMuted) return;

    if (this.audioCtx.state === 'suspended' || this.audioCtx.state === 'interrupted') {
      this.audioCtx.resume().catch(() => {});
      return;
    }

    try {
      const audioBuf = this.audioCtx.createBuffer(1, len, this.sampleRate);
      audioBuf.getChannelData(0).set(this.frameBuffer);

      const src = this.audioCtx.createBufferSource();
      src.buffer = audioBuf;
      src.connect(this.gainNode);

      const curTime = this.audioCtx.currentTime;
      // Maintain a 40ms to 140ms cushion ahead of DAC
      if (this.nextStartTime < curTime || this.nextStartTime > curTime + 0.14) {
        this.nextStartTime = curTime + 0.040;
      }

      src.start(this.nextStartTime);
      this.activeSources.add(src);
      src.onended = () => {
        this.activeSources.delete(src);
      };
      this.nextStartTime += audioBuf.duration;
    } catch (err) {
      console.warn('[AudioEngine] Buffer schedule error:', err);
    }
  }
}
