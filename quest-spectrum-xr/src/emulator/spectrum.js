/**
 * Sinclair ZX Spectrum Universal Coordinator
 * Supports 48K, 128K, +2, +3 (with Floppy Drive), and Pentagon/TR-DOS
 * Based on the user's verified C# SpectrumEmulator architecture
 */
import { Z80 } from './z80.js';
import { ULA } from './ula.js';
import { SpectrumAudio } from './audio.js';
import { Spectrum128MemoryMap } from './memory-128.js';
import { Plus3DiskController } from './plus3-fdc.js';
import { Beta128DiskController } from './trdos-fdc.js';
import { TapDeck } from './tape.js';

export const SpectrumModel = {
  Spectrum48K: 'Spectrum48K',
  Spectrum128K: 'Spectrum128K',
  SpectrumPlus2: 'SpectrumPlus2',
  SpectrumPlus3: 'SpectrumPlus3',
  Pentagon128: 'Pentagon128'
};

export class ZXSpectrum {
  constructor() {
    this.model = SpectrumModel.SpectrumPlus3; // Default to the top-tier +3 model!

    // Subsystems
    this.cpu = new Z80(this);
    this.ula = new ULA();
    this.audio = new SpectrumAudio();
    this.disk = new Plus3DiskController();
    this.trDosDisk = new Beta128DiskController();
    this.tape = new TapDeck();
    this.instantTape = true;

    // Memory (either flat 64KB for 48K or banked Spectrum128MemoryMap)
    this.memory48 = new Uint8Array(65536);
    this.pagedMemory = null;

    // 8 Half-rows for keyboard: bits 0-4 active-low (0 = pressed)
    this.keyboardMatrix = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
    this.activeKeys = new Set();
    this.codeToKeyMap = new Map();
    this.frameCounter = 0;
    this.keyDownFrame = new Map();
    this.pendingReleaseKeys = new Set();

    // Kempston Joystick state (bit 0=R, 1=L, 2=D, 3=U, 4=Fire)
    this.kempstonState = 0;
    this.kempstonSources = {
      keyboard: 0,
      gamepad: 0,
      xr: 0,
      remote: 0,
      default: 0
    };

    // Kempston Mouse state
    // Ports: 0xFADF (buttons: bit 0=R, 1=L, 2=M, active-low), 0xFBDF (X), 0xFFDF (Y)
    this.kempstonMouseX = 128;
    this.kempstonMouseY = 96;
    this.kempstonMouseButtons = 0xff; // Active low (0 = pressed, 1 = released)

    // T-States per frame: 69888 (48K) or 70908 (128K/+3)
    this.tStatesPerFrame = 70908;

    // Minimum key hold duration tracking (guarantees Z80 50Hz interrupt scanner catches taps)
    this.keyPressTimers = new Map();
    this.keyPressTime = new Map();

    this.romCache = {};
    this.romLoaded = false;

    // Pre-allocated static 64K view for video memory access (eliminates 3.3MB/sec GC pauses)
    this.videoMemoryView = new Uint8Array(65536);
    this.isLoadingRom = false;
  }

  async preloadAllRoms() {
    const romFiles = [
      '/roms/48.rom',
      '/roms/spec128uk.rom',
      '/roms/plus2uk.rom',
      '/roms/plus3.rom',
      '/roms/trdos.rom'
    ];
    await Promise.all(romFiles.map(async (file) => {
      try {
        if (!this.romCache[file]) {
          const res = await fetch(file);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            this.romCache[file] = new Uint8Array(buf);
          }
        }
      } catch (e) {
        console.warn(`[Spectrum] Preload warning for ${file}:`, e);
      }
    }));
    console.log('[Spectrum] All Sinclair ROMs preloaded into cache for instant model switching.');
  }

  async loadRomForModel(model) {
    this.isLoadingRom = true;
    try {
      this.model = model;
      let romFile = '/roms/plus3.rom';
      let isPlus3 = (model === SpectrumModel.SpectrumPlus3);
      let isPentagon = (model === SpectrumModel.Pentagon128);

      if (model === SpectrumModel.Spectrum48K) romFile = '/roms/48.rom';
      else if (model === SpectrumModel.Spectrum128K) romFile = '/roms/spec128uk.rom';
      else if (model === SpectrumModel.SpectrumPlus2) romFile = '/roms/plus2uk.rom';
      else if (model === SpectrumModel.SpectrumPlus3) romFile = '/roms/plus3.rom';
      else if (model === SpectrumModel.Pentagon128) romFile = '/roms/spec128uk.rom';

      console.log(`Loading ROM for ${model}: ${romFile}`);
      this.currentRomFile = romFile;

      if (!this.romCache[romFile]) {
        const res = await fetch(romFile);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const buf = await res.arrayBuffer();
        this.romCache[romFile] = new Uint8Array(buf);
      }

      const romBytes = this.romCache[romFile];
      let trDosBytes = null;

      if (isPentagon) {
        const trDosFile = '/roms/trdos.rom';
        if (!this.romCache[trDosFile]) {
          const res = await fetch(trDosFile);
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          const buf = await res.arrayBuffer();
          this.romCache[trDosFile] = new Uint8Array(buf);
        }
        trDosBytes = this.romCache[trDosFile];
      }

      if (model === SpectrumModel.Spectrum48K) {
        this.pagedMemory = null;
        this.memory48.fill(0);
        this.memory48.set(romBytes.subarray(0, 16384), 0);
        this.tStatesPerFrame = 69888;
      } else {
        this.pagedMemory = new Spectrum128MemoryMap(romBytes, isPlus3, trDosBytes, isPentagon);
        this.tStatesPerFrame = 70908;
      }

      this.romLoaded = true;
      this.reset(true);
      console.log(`Successfully booted ${model}!`);
    } catch (err) {
      console.error(`Failed to load ROM for ${model}:`, err);
    } finally {
      this.isLoadingRom = false;
    }
  }

  reset(force = false) {
    this.lastResetTime = Date.now();

    if (typeof fetch !== 'undefined') {
      const caller = (new Error().stack || '').split('\n').slice(2, 4).map(s => s.trim()).join(' -> ');
      fetch('/api/diag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'spectrum-reset', caller })
      }).catch(() => {});
    }
    this.cpu.reset();
    this.ula.setBorderColor(7);
    this.kempstonState = 0;
    this.kempstonMouseX = 128;
    this.kempstonMouseY = 96;
    this.kempstonMouseButtons = 0xff;
    this.clearAllKeys();

    if (this.trDosDisk) {
      this.trDosDisk.reset();
    }

    if (this.pagedMemory) {
      this.pagedMemory.clear();
      // Restore appropriate ROM into paged banks
      const currentRom = (this.currentRomFile && this.romCache[this.currentRomFile])
        || (this.model === SpectrumModel.SpectrumPlus3 ? this.romCache['/roms/plus3.rom'] : this.romCache['/roms/spec128uk.rom']);
      if (currentRom) this.pagedMemory.initRoms(currentRom);
      // Set RAM 5 attribute defaults
      this.pagedMemory.ram[5].fill(0x38, 0x1800, 0x1b00); // 0x5800-0x5AFF

      if (this.model === SpectrumModel.Pentagon128) {
        this.pagedMemory.pageMemory(0x10); // Start in 48K BASIC where 0x3D00 TR-DOS calls operate
        if (this.trDosDisk && this.trDosDisk.inserted) {
          this.pagedMemory.trDosActive = true; // Fuse beta.c cold-boot into TR-DOS ROM at 0x0000
        }
      }
    } else {
      this.memory48.fill(0, 0x4000, 0x10000);
      this.memory48.fill(0x38, 0x5800, 0x5b00);
    }
  }

  // Active video memory array for ULA rendering
  get memory() {
    if (this.pagedMemory) {
      // In 128K, screen is in RAM 5 (or shadow screen in RAM 7)
      const screenRam = this.pagedMemory.getScreenBytes();
      this.videoMemoryView.set(screenRam, 0x4000);
      return this.videoMemoryView;
    }
    return this.memory48;
  }

  // Memory Bus interface
  readByte(addr) {
    addr &= 0xffff;
    if (this.pagedMemory) {
      return this.pagedMemory.readByte(addr);
    }
    return this.memory48[addr];
  }

  writeByte(addr, val) {
    addr &= 0xffff;
    val &= 0xff;
    if (this.pagedMemory) {
      this.pagedMemory.writeByte(addr, val);
      return;
    }
    if (addr >= 0x4000) {
      this.memory48[addr] = val;
    }
  }

  writeBlock(startAddr, bytes) {
    for (let i = 0; i < bytes.length; i++) {
      this.writeByte(startAddr + i, bytes[i]);
    }
  }

  handleTapeTrap() {
    if (!this.tape || !this.instantTape) return false;
    if (!this.tape.hasBlocks) return false;

    // Ensure 48K BASIC ROM is active if in 128K mode
    if (this.model !== SpectrumModel.Spectrum48K && this.pagedMemory && !this.pagedMemory.is48KRomActive) {
      return false;
    }

    // At 0x056B (Fuse 1.10.0 trap point), EX AF,AF' at 0x0557 has already placed
    // the expected flag byte in A' (a_) and Carry (1=LOAD, 0=VERIFY) in F' (f_).
    const expectedFlag = this.cpu.a_;
    const block = this.tape.getNextBlock(expectedFlag);
    if (!block) return false;

    const de = this.cpu.de;
    const ix = this.cpu.ix;
    const isVerify = (this.cpu.f_ & 0x01) === 0;

    // Exact Fuse 1.10.0 tape_traps.c (line 384) byte count:
    // If DE <= block.length - 2, DE bytes are read and block[1 + DE] is parity.
    // If DE > block.length - 2 (short/headerless block), all block.length - 1 bytes after flag are read!
    const maxRead = Math.max(0, block.length - 1);
    const copyLen = Math.min(de, maxRead);

    if (!isVerify) {
      for (let i = 0; i < copyLen; i++) {
        this.writeByte((ix + i) & 0xffff, block[1 + i]);
      }
    } else {
      for (let i = 0; i < copyLen; i++) {
        if (this.readByte((ix + i) & 0xffff) !== block[1 + i]) {
          this.cpu.f &= ~0x01; // Carry reset
          this.cpu.pc = 0x05e2;
          return true;
        }
      }
    }

    this.cpu.ix = (ix + copyLen) & 0xffff;
    this.cpu.de = (de - copyLen) & 0xffff;
    this.cpu.a_ = 0x01;
    this.cpu.f_ = 0x45;
    this.cpu.b = 0xb0;
    this.cpu.c = 0x01;
    this.cpu.h = 0x00;
    this.cpu.l = copyLen > 0 ? block[copyLen] : block[0];
    this.cpu.a = 0x00;
    this.cpu.f = 0x05; // Parity + Carry set = success
    this.cpu.pc = 0x05e2; // Return via RET at 0x05E2 (pops 0x053F or custom 0x0562 caller!)
    return true;
  }

  // I/O Port Bus interface (Exact match for user's Spectrum48K.cs)
  readPort(port) {
    const lowByte = port & 0xff;

    // 0. Beta 128 / TR-DOS Floppy Controller (when TR-DOS is paged in)
    if (this.model === SpectrumModel.Pentagon128 && this.pagedMemory?.trDosActive) {
      if (lowByte === 0x1f) return this.trDosDisk.readStatus();
      if (lowByte === 0x3f) return this.trDosDisk.readTrack();
      if (lowByte === 0x5f) return this.trDosDisk.readSector();
      if (lowByte === 0x7f) return this.trDosDisk.readData();
      if (lowByte === 0xff) return this.trDosDisk.readSystem();
    }

    // 1. Kempston Joystick (Port 0x1F)
    if (lowByte === 0x1f) {
      return this.kempstonState;
    }

    // 1b. Kempston Mouse (Port 0xDF)
    // Decoded using A8 and A10 lines:
    // Port 0xFADF (64223): Buttons (D0=R, D1=L, D2=M; Active 0)
    // Port 0xFBDF (64479): X-axis coordinate (0-255)
    // Port 0xFFDF (65503): Y-axis coordinate (0-255)
    if (lowByte === 0xdf) {
      const highByte = (port >> 8) & 0xff;
      // Buttons port: 0xFADF (A8=0, A10=0)
      if (highByte === 0xfa || (highByte & 0x05) === 0x00) {
        return this.kempstonMouseButtons;
      }
      // X-axis port: 0xFBDF (A8=1, A10=0)
      if (highByte === 0xfb || (highByte & 0x05) === 0x01) {
        return this.kempstonMouseX;
      }
      // Y-axis port: 0xFFDF (A8=1, A10=1)
      if (highByte === 0xff || (highByte & 0x05) === 0x05) {
        return this.kempstonMouseY;
      }
    }

    // 2. Devices on Port 0xFD (+3 Floppy Controller, AY-3-8912 PSG)
    if (lowByte === 0xfd) {
      // Spectrum +3 Floppy Controller (Ports 0x2FFD / 0x3FFD)
      if (this.model === SpectrumModel.SpectrumPlus3) {
        if ((port & 0xf000) === 0x2000) {
          return this.disk.readStatus();
        }
        if ((port & 0xf000) === 0x3000) {
          return this.disk.readData();
        }
      }

      // AY-3-8912 PSG Data Read (Port 0xFFFD)
      if (this.model !== SpectrumModel.Spectrum48K && (port & 0xc000) === 0xc000) {
        return this.audio.readAyData();
      }
    }

    // 3. ULA Port 0xFE (Keyboard & Beeper)
    if ((port & 0x0001) === 0) {
      const highByte = (port >> 8) & 0xff;
      let result = 0xff;

      if (!(highByte & 0x01)) result &= this.keyboardMatrix[0];
      if (!(highByte & 0x02)) result &= this.keyboardMatrix[1];
      if (!(highByte & 0x04)) result &= this.keyboardMatrix[2];
      if (!(highByte & 0x08)) result &= this.keyboardMatrix[3];
      if (!(highByte & 0x10)) result &= this.keyboardMatrix[4];
      if (!(highByte & 0x20)) result &= this.keyboardMatrix[5];
      if (!(highByte & 0x40)) result &= this.keyboardMatrix[6];
      if (!(highByte & 0x80)) result &= this.keyboardMatrix[7];

      // Bits 5, 6, 7 are high; Bit 6 is the EAR line pulled high (+5V) when idle
      return (result & 0x1f) | 0xe0;
    }

    return 0xff; // Floating bus
  }

  writePort(port, val) {
    const lowByte = port & 0xff;

    // 0. Beta 128 / TR-DOS Floppy Controller (when TR-DOS is paged in)
    if (this.model === SpectrumModel.Pentagon128 && this.pagedMemory?.trDosActive) {
      if (lowByte === 0x1f) { this.trDosDisk.writeCommand(val); return; }
      if (lowByte === 0x3f) { this.trDosDisk.writeTrack(val); return; }
      if (lowByte === 0x5f) { this.trDosDisk.writeSector(val); return; }
      if (lowByte === 0x7f) { this.trDosDisk.writeData(val); return; }
      if (lowByte === 0xff) { this.trDosDisk.writeSystem(val); return; }
    }

    // 1. Port 0xFD Devices (Paging, +3 FDC, AY-3-8912)
    if (lowByte === 0xfd) {
      // Spectrum +3 Special Paging & Floppy Motor (Port 0x1FFD)
      if (this.model === SpectrumModel.SpectrumPlus3) {
        if ((port & 0xf000) === 0x1000) {
          if (this.pagedMemory) this.pagedMemory.pageSpecial(val);
          this.disk.setMotor((val & 0x08) !== 0);
          return;
        } else if ((port & 0xf000) === 0x3000) {
          // +3 FDC Data Write (Port 0x3FFD)
          this.disk.writeData(val);
          return;
        }
      }

      // 128K Standard Paging (Port 0x7FFD)
      if (this.pagedMemory && (port & 0xc000) === 0x4000) {
        this.pagedMemory.pageMemory(val);
        return;
      }

      // AY-3-8912 Register Select (Port 0xFFFD)
      if (this.model !== SpectrumModel.Spectrum48K) {
        if ((port & 0xc000) === 0xc000) {
          this.audio.selectAyRegister(val);
          return;
        } else if ((port & 0xc000) === 0x8000) {
          this.audio.writeAyData(val);
          return;
        }
      }
    }

    // 2. ULA Port 0xFE (Even ports)
    if ((port & 0x0001) === 0) {
      this.ula.setBorderColor(val & 0x07);
      this.audio.setBeeper((val >> 4) & 1);
    }
  }

  // Insert .DSK floppy disk image
  async insertDisk(buffer, filename = 'game.dsk') {
    if (this.model !== SpectrumModel.SpectrumPlus3) {
      console.log('Switching to Spectrum +3 to run floppy disk...');
      await this.loadRomForModel(SpectrumModel.SpectrumPlus3);
    }
    this.disk.insert(buffer, filename);
  }

  // Insert .TRD / .SCL floppy disk image for Pentagon 128 TR-DOS
  async insertTrDosDisk(buffer, filename = 'game.trd') {
    if (this.model !== SpectrumModel.Pentagon128) {
      console.log('Switching to Pentagon 128 for TR-DOS / TRD disk...');
      await this.loadRomForModel(SpectrumModel.Pentagon128);
    }
    this.trDosDisk.insert(buffer, filename);
  }

  // Eject currently loaded floppy disk image
  ejectDisk() {
    if (this.disk) this.disk.eject();
    if (this.trDosDisk) this.trDosDisk.eject();
  }

  // Eject currently loaded cassette tape
  ejectTape() {
    if (this.tape) this.tape.eject();
  }

  // Enter TR-DOS system ROM using Fuse's cold-boot mechanism (PC = 0x0000 with trDosActive = true)
  enterTrDos(coldBoot = true) {
    if (this.pagedMemory) {
      if (coldBoot) {
        this.reset(true);
        this.pagedMemory.pageMemory(0x10);
        this.pagedMemory.trDosActive = true;
        this.cpu.pc = 0x0000;
        console.log('[TR-DOS] Cold-booting TR-DOS ROM at 0x0000 (Fuse beta.c style)');
      } else {
        this.pagedMemory.pageMemory(0x10);
        this.pagedMemory.trDosActive = true;
        this.cpu.pc = 0x3d00;
        this.cpu.iff1 = 1;
        this.cpu.iff2 = 1;
        console.log('[TR-DOS] Entered TR-DOS ROM at 0x3D00');
      }
    }
  }

  // Keyboard matrix
  setKey(row, bit, pressed) {
    if (pressed) {
      this.keyboardMatrix[row] &= ~(1 << bit);
    } else {
      this.keyboardMatrix[row] |= (1 << bit);
    }
  }

  clearAllKeys() {
    if (this.activeKeys) this.activeKeys.clear();
    if (this.codeToKeyMap) this.codeToKeyMap.clear();
    if (this.keyDownFrame) this.keyDownFrame.clear();
    if (this.pendingReleaseKeys) this.pendingReleaseKeys.clear();
    this.keyboardMatrix.fill(0xff);
    if (this.kempstonSources) {
      this.kempstonSources = { keyboard: 0, gamepad: 0, xr: 0, remote: 0, default: 0 };
    }
    this.kempstonState = 0;
    if (this.keyPressTimers) {
      for (const t of this.keyPressTimers.values()) clearTimeout(t);
      this.keyPressTimers.clear();
      this.keyPressTime.clear();
    }
  }

  rebuildKeyboardMatrix() {
    this.keyboardMatrix.fill(0xff);
    if (!this.activeKeys || this.activeKeys.size === 0) return;

    // Detect if a PC shifted punctuation character (requiring Symbol Shift on Spectrum) is active
    const symbolShiftChars = new Set([
      '!', '@', '#', '£', '$', '%', '^', '&', '*', '(', ')',
      '_', '-', '+', '=', ';', ':', "'", '"', ',', '<', '.', '>', '/', '?'
    ]);
    let hasSymbolPunctuation = false;
    for (const k of this.activeKeys) {
      if (symbolShiftChars.has(k)) {
        hasSymbolPunctuation = true;
        break;
      }
    }

    // Only assert CapsShift on Arrow keys when a single arrow key is pressed alone (e.g. 128K/+3 ROM menu or BASIC cursor).
    // When combined with Space/0/other keys in games, omit CapsShift so Arrow+Space NEVER triggers BREAK (CapsShift+Space)!
    const allowArrowCapsShift = (this.activeKeys.size === 1);

    for (const k of this.activeKeys) {
      if (hasSymbolPunctuation && (k === 'shift' || k === 'shiftleft' || k === 'shiftright')) {
        continue;
      }
      this.applyKeyToMatrix(k, allowArrowCapsShift);
    }
  }

  applyKeyToMatrix(k, allowArrowCapsShift = true) {
    const press = (row, bit) => { this.keyboardMatrix[row] &= ~(1 << bit); };
    switch (k) {
      case 'shift': case 'shiftleft': case 'shiftright': press(0, 0); break;
      case 'capslock': press(0, 0); press(3, 1); break; // CapsShift + 2 (Caps Lock)
      case 'z': press(0, 1); break;
      case 'x': press(0, 2); break;
      case 'c': press(0, 3); break;
      case 'v': press(0, 4); break;

      case 'a': press(1, 0); break;
      case 's': press(1, 1); break;
      case 'd': press(1, 2); break;
      case 'f': press(1, 3); break;
      case 'g': press(1, 4); break;

      case 'q': press(2, 0); break;
      case 'w': press(2, 1); break;
      case 'e': press(2, 2); break;
      case 'r': press(2, 3); break;
      case 't': press(2, 4); break;

      case '1': case 'numpad1': press(3, 0); break;
      case '2': case 'numpad2': press(3, 1); break;
      case '3': case 'numpad3': press(3, 2); break;
      case '4': case 'numpad4': press(3, 3); break;
      case '5': case 'numpad5': press(3, 4); break;

      case '0': case 'numpad0': press(4, 0); break;
      case '9': case 'numpad9': press(4, 1); break;
      case '8': case 'numpad8': press(4, 2); break;
      case '7': case 'numpad7': press(4, 3); break;
      case '6': case 'numpad6': press(4, 4); break;

      case 'p': press(5, 0); break;
      case 'o': press(5, 1); break;
      case 'i': press(5, 2); break;
      case 'u': press(5, 3); break;
      case 'y': press(5, 4); break;

      case 'enter': case 'numpadenter': press(6, 0); break;
      case 'l': press(6, 1); break;
      case 'k': press(6, 2); break;
      case 'j': press(6, 3); break;
      case 'h': press(6, 4); break;

      case ' ': case 'space': press(7, 0); break;
      case 'control': case 'controlleft': case 'controlright': case 'alt': case 'altleft': case 'altright': case 'sym': press(7, 1); break;
      case 'm': press(7, 2); break;
      case 'n': press(7, 3); break;
      case 'b': press(7, 4); break;

      // Authentic ZX Spectrum Symbol Shift Punctuation Mappings
      case '!': press(7, 1); press(3, 0); break; // SymbolShift + 1 = !
      case '@': press(7, 1); press(3, 1); break; // SymbolShift + 2 = @
      case '#': case '£': press(7, 1); press(3, 2); break; // SymbolShift + 3 = #
      case '$': press(7, 1); press(3, 3); break; // SymbolShift + 4 = $
      case '%': press(7, 1); press(3, 4); break; // SymbolShift + 5 = %
      case '&': press(7, 1); press(4, 4); break; // SymbolShift + 6 = &
      case "'": press(7, 1); press(4, 3); break; // SymbolShift + 7 = '
      case '(': press(7, 1); press(4, 2); break; // SymbolShift + 8 = (
      case ')': press(7, 1); press(4, 1); break; // SymbolShift + 9 = )
      case '_': press(7, 1); press(4, 0); break; // SymbolShift + 0 = _
      case '"': press(7, 1); press(5, 0); break; // SymbolShift + P = "
      case ';': press(7, 1); press(5, 1); break; // SymbolShift + O = ;
      case ':': press(7, 1); press(0, 1); break; // SymbolShift + Z = :
      case '=': press(7, 1); press(6, 1); break; // SymbolShift + L = =
      case '+': press(7, 1); press(6, 2); break; // SymbolShift + K = +
      case '-': press(7, 1); press(6, 3); break; // SymbolShift + J = -
      case '^': press(7, 1); press(6, 4); break; // SymbolShift + H = ^
      case '.': press(7, 1); press(7, 2); break; // SymbolShift + M = .
      case ',': press(7, 1); press(7, 3); break; // SymbolShift + N = ,
      case '*': press(7, 1); press(7, 4); break; // SymbolShift + B = *
      case '?': press(7, 1); press(0, 3); break; // SymbolShift + C = ?
      case '/': press(7, 1); press(0, 4); break; // SymbolShift + V = /
      case '<': press(7, 1); press(2, 3); break; // SymbolShift + R = <
      case '>': press(7, 1); press(2, 4); break; // SymbolShift + T = >

      case 'backspace': case 'delete': press(0, 0); press(4, 0); break; // CapsShift + 0
      case 'escape': case 'break': press(0, 0); press(7, 0); break; // CapsShift + Space (BREAK)
      case 'tab': press(0, 0); press(7, 1); break; // CapsShift + SymbolShift (Extended Mode)
      case 'arrowleft':  if (allowArrowCapsShift) press(0, 0); press(3, 4); break; // Cursor Left (5)
      case 'arrowdown':  if (allowArrowCapsShift) press(0, 0); press(4, 4); break; // Cursor Down (6)
      case 'arrowup':    if (allowArrowCapsShift) press(0, 0); press(4, 3); break; // Cursor Up (7)
      case 'arrowright': if (allowArrowCapsShift) press(0, 0); press(4, 2); break; // Cursor Right (8)
    }
  }

  handleKeyEvent(key, pressed, code = null) {
    if (!key) return;
    const k = key.toLowerCase();
    const normCode = code ? code.toLowerCase() : null;

    // Companion lookup so releasing a key after Shift state changes never leaves an orphaned key
    const shiftCompanions = {
      '!': ['1'], '1': ['!'],
      '@': ['2', "'", '"'], '"': ["'", '2', '@'], "'": ['"', '2', '@'], '2': ['@', '"'],
      '#': ['3', '£'], '£': ['3', '#'], '3': ['#', '£'],
      '$': ['4'], '4': ['$'],
      '%': ['5'], '5': ['%'],
      '^': ['6'], '6': ['^'],
      '&': ['7', "'"], '7': ['&', "'"],
      '*': ['8'], '8': ['*'],
      '(': ['9'], '9': ['('],
      ')': ['0'], '0': [')'],
      '_': ['-'], '-': ['_'],
      '+': ['='], '=': ['+'],
      ':': [';'], ';': [':'],
      '<': [','], ',': ['<'],
      '>': ['.'], '.': ['>'],
      '?': ['/'], '/': ['?']
    };

    if (pressed) {
      // If this physical key code already had a different character active (e.g. Shift state changed), replace it cleanly
      if (normCode && this.codeToKeyMap.has(normCode)) {
        const prevK = this.codeToKeyMap.get(normCode);
        if (prevK !== k) {
          this.activeKeys.delete(prevK);
          this.pendingReleaseKeys.delete(prevK);
        }
      }
      if (normCode) {
        this.codeToKeyMap.set(normCode, k);
      }
      this.activeKeys.add(k);
      this.pendingReleaseKeys.delete(k);
      this.keyDownFrame.set(k, this.frameCounter);
    } else {
      const keysToRelease = new Set([k]);
      if (shiftCompanions[k]) {
        for (const comp of shiftCompanions[k]) keysToRelease.add(comp);
      }
      if (normCode && this.codeToKeyMap.has(normCode)) {
        keysToRelease.add(this.codeToKeyMap.get(normCode));
        this.codeToKeyMap.delete(normCode);
      }

      for (const rk of keysToRelease) {
        if (!this.activeKeys.has(rk)) continue;
        const downFrame = this.keyDownFrame.get(rk) ?? -10;
        // Because cpu.interrupt() sets PC=0x0038 at the end of frame N and executes KEY-SCAN at the start of frame N+1,
        // holding for at least 2 frame ticks guarantees the Z80 interrupt handler always sees fast taps (<30ms),
        // while any key held >=2 frames releases with 0ms latency!
        if (this.frameCounter - downFrame >= 2) {
          this.activeKeys.delete(rk);
          this.pendingReleaseKeys.delete(rk);
          this.keyDownFrame.delete(rk);
        } else {
          this.pendingReleaseKeys.add(rk);
        }
      }
    }
    this.rebuildKeyboardMatrix();

    if (typeof window !== 'undefined' && window.__FUSE_NATIVE_STREAM_ACTIVE__ && !this._suppressFuseInput) {
      fetch(`/input?key=${encodeURIComponent(k)}&action=${pressed ? 'press' : 'release'}`).catch(() => {});
    }
  }

  setKempston(right, left, down, up, fire, source = 'default') {
    let state = 0;
    if (right) state |= 0x01;
    if (left)  state |= 0x02;
    if (down)  state |= 0x04;
    if (up)    state |= 0x08;
    if (fire)  state |= 0x10;
    if (!this.kempstonSources) {
      this.kempstonSources = { keyboard: 0, gamepad: 0, xr: 0, remote: 0, default: 0 };
    }
    const prevState = this.kempstonState || 0;
    this.kempstonSources[source] = state;
    this.kempstonState =
      (this.kempstonSources.keyboard || 0) |
      (this.kempstonSources.gamepad || 0) |
      (this.kempstonSources.xr || 0) |
      (this.kempstonSources.remote || 0) |
      (this.kempstonSources.default || 0);

    if (typeof window !== 'undefined' && window.__FUSE_NATIVE_STREAM_ACTIVE__ && this.kempstonState !== prevState) {
      const diff = this.kempstonState ^ prevState;
      const sendJoy = (bit, name) => {
        if (diff & bit) {
          const isDown = (this.kempstonState & bit) !== 0;
          fetch(`/input?key=${name}&action=${isDown ? 'press' : 'release'}`).catch(() => {});
        }
      };
      sendJoy(0x01, 'joy_right');
      sendJoy(0x02, 'joy_left');
      sendJoy(0x04, 'joy_down');
      sendJoy(0x08, 'joy_up');
      sendJoy(0x10, 'joy_fire');
    }
  }

  setKempstonMouse(x, y, left, right, middle = false) {
    if (x !== undefined && x !== null) this.kempstonMouseX = Math.round(x) & 0xff;
    if (y !== undefined && y !== null) this.kempstonMouseY = Math.round(y) & 0xff;
    let btns = 0xff;
    if (right)  btns &= ~0x01; // Bit 0: Right (active 0)
    if (left)   btns &= ~0x02; // Bit 1: Left (active 0)
    if (middle) btns &= ~0x04; // Bit 2: Middle (active 0)
    this.kempstonMouseButtons = btns;
  }

  updateKempstonMouseDelta(dx, dy, left, right, middle = false) {
    if (dx) this.kempstonMouseX = (this.kempstonMouseX + Math.round(dx)) & 0xff;
    // Note: in Kempston mouse hardware counters, moving mouse forward/upwards increments Y counter
    if (dy) this.kempstonMouseY = (this.kempstonMouseY - Math.round(dy)) & 0xff;
    let btns = 0xff;
    if (right)  btns &= ~0x01;
    if (left)   btns &= ~0x02;
    if (middle) btns &= ~0x04;
    this.kempstonMouseButtons = btns;
  }

  stepFrame() {
    if (!this.romLoaded || this.isLoadingRom) return;
    this.cpu.tStates = 0;
    const target = this.tStatesPerFrame;
    const samplesPerFrame = this.audio.samplesPerFrame || 960;
    const audioSampleInterval = Math.floor(target / samplesPerFrame);

    let nextAudioSample = audioSampleInterval;

    while (this.cpu.tStates < target) {
      this.cpu.step();

      // Pentagon 128 / Beta 128 hardware M1 opcode trap
      if (this.model === SpectrumModel.Pentagon128 && this.pagedMemory) {
        const pc = this.cpu.pc;
        if (!this.pagedMemory.trDosActive) {
          // Entry point for TR-DOS: M1 opcode fetch in 0x3D00..0x3DFF while 48K ROM is active
          if (pc >= 0x3d00 && pc <= 0x3dff && this.pagedMemory.is48KRomActive) {
            this.pagedMemory.trDosActive = true;
          }
        } else {
          // Exit point for TR-DOS: M1 opcode fetch in RAM (>= 0x4000)
          if (pc >= 0x4000) {
            this.pagedMemory.trDosActive = false;
          }
        }
      }

      if (this.cpu.tStates >= nextAudioSample) {
        this.audio.pushBeeperSample();
        nextAudioSample += audioSampleInterval;
      }
    }

    this.cpu.interrupt();
    this.frameCounter++;

    // Release any ultra-short key taps now that the Z80 interrupt & frame step have sampled them
    if (this.pendingReleaseKeys && this.pendingReleaseKeys.size > 0) {
      let changed = false;
      for (const rk of Array.from(this.pendingReleaseKeys)) {
        const downFrame = this.keyDownFrame.get(rk) ?? -10;
        if (this.frameCounter - downFrame >= 2) {
          this.activeKeys.delete(rk);
          this.pendingReleaseKeys.delete(rk);
          this.keyDownFrame.delete(rk);
          changed = true;
        }
      }
      if (changed) {
        this.rebuildKeyboardMatrix();
      }
    }

    // Render ULA directly from active video RAM bank (zero-copy, zero-allocation)
    if (this.pagedMemory) {
      this.ula.renderFrame(this.pagedMemory.getScreenBytes(), 0);
    } else {
      this.ula.renderFrame(this.memory48, 0x4000);
    }

    // Synthesize and schedule audio for this frame
    this.audio.endFrame();
  }
}
