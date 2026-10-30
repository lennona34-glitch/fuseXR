/**
 * Built-in ZX Spectrum Software Library & File Uploader
 * With direct streaming and search access to the 29,000+ TOSEC games collection over WiFi
 */
import { SnapshotLoader } from '../emulator/snapshot.js';
import { SpectrumModel } from '../emulator/spectrum.js';

export class GamesLibrary {
  constructor(spectrum, relay = null) {
    this.spectrum = spectrum;
    this.relay = relay;
    this._bootToken = 0;
    this.randomHistory = new Set();
    this.initFilePicker();

    // Full local bundled games pool (38+ classic games across Z80, TAP, TZX, +3 DSK, and TR-DOS TRD)
    this.featuredGames = [
      { name: 'Saboteur! (48K Z80)', file: '/games/Saboteur.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'RoboCop (Z80)', file: '/games/Robocop.z80', type: 'z80', model: SpectrumModel.Spectrum128K },
      { name: 'R-Type (Z80)', file: '/games/R-Type.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Out Run (Z80)', file: '/games/OutRun.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Renegade (Z80)', file: '/games/Renegade.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Bomb Jack (Z80)', file: '/games/BombJack.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Head Over Heels (Z80)', file: '/games/HeadOverHeels.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Jetpac (Z80)', file: '/games/JetPac.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Knight Lore (Z80)', file: '/games/KnightLore.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Manic Miner (Z80)', file: '/games/ManicMiner.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Skool Daze (Z80)', file: '/games/SkoolDaze.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Rainbow Islands (Z80)', file: '/games/RainbowIslands.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Green Beret (Z80)', file: '/games/GreenBeret.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Ghosts \'n Goblins (Z80)', file: '/games/GhostsNGoblins.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Fantasy World Dizzy (Z80)', file: '/games/FantasyWorldDizzy.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Treasure Island Dizzy (Z80)', file: '/games/TreasureIslandDizzy.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Bubble Bobble (Z80)', file: '/games/BubbleBobble.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Cybernoid (Z80)', file: '/games/Cybernoid.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Exolon (Z80)', file: '/games/Exolon.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Cobra (Z80)', file: '/games/Cobra.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Chuckie Egg (Z80)', file: '/games/ChuckieEgg.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Daley Thompson\'s Decathlon (Z80)', file: '/games/DaleyThompson.z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Turrican (Z80 Instant)', file: '/games/TURRIC_1.Z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Emlyn Hughes Soccer (Z80)', file: '/games/Emlyn Hughes International Soccer (1989)(Audiogenic Software).z80', type: 'z80', model: SpectrumModel.Spectrum48K },
      { name: 'Target Renegade (+3 Disk)', file: '/games/Renegade 2 - Target Renegade.dsk', type: 'dsk', model: SpectrumModel.SpectrumPlus3 },
      { name: 'RoboCop 2 (+3 Disk)', file: '/games/Robocop 2.dsk', type: 'dsk', model: SpectrumModel.SpectrumPlus3 },
      { name: 'Turrican 2 (+3 Disk)', file: '/games/Turrican 2 - Side A.dsk', type: 'dsk', model: SpectrumModel.SpectrumPlus3 },
      { name: 'Emlyn Hughes Soccer (+3 Disk)', file: '/games/Emlyn Hughes International Soccer (1990)(Audiogenic Software).dsk', type: 'dsk', model: SpectrumModel.SpectrumPlus3 },
      { name: 'Thunder Blade & Cybernoid 2 (+3 Disk)', file: '/games/2 Por 1 - Thunder Blade + Cybernoid 2 - Side 1.dsk', type: 'dsk', model: SpectrumModel.SpectrumPlus3 },
      { name: 'Chase H.Q. (Tape)', file: '/games/ChaseHQ.tap', type: 'tap', model: SpectrumModel.Spectrum128K },
      { name: 'Wonderful Dizzy (Tape)', file: '/games/Dizzy VIII - Wonderful Dizzy (2020) v1.5.tap', type: 'tap', model: SpectrumModel.Spectrum128K },
      { name: 'Target Renegade (Tape)', file: '/games/Renegade2.tap', type: 'tap', model: SpectrumModel.Spectrum128K },
      { name: 'Jack The Nipper (Tape)', file: '/games/JACKNIP1.TAP', type: 'tap', model: SpectrumModel.Spectrum48K },
      { name: 'Mythos (Tape)', file: '/games/MYTHOS.TAP', type: 'tap', model: SpectrumModel.Spectrum48K },
      { name: 'Elite (TZX Tape)', file: '/games/Elite.tzx', type: 'tzx', model: SpectrumModel.Spectrum48K },
      { name: 'Dune II Demo (TR-DOS)', file: '/games/DUNE2_D.TRD', type: 'trd', model: SpectrumModel.Pentagon128 },
      { name: 'Fire & Ice (TR-DOS)', file: '/games/Fire&Ice.trd', type: 'trd', model: SpectrumModel.Pentagon128 },
      { name: 'Mythland (TR-DOS)', file: '/games/MYTHLAND.TRD', type: 'trd', model: SpectrumModel.Pentagon128 },
      { name: 'Star Bridge (TR-DOS)', file: '/games/sbridge.trd', type: 'trd', model: SpectrumModel.Pentagon128 }
    ];

    if (this.relay) {
      this.relay.on('load-game', (data) => {
        console.log('[RemoteRelay] Mirroring remote game load:', data);
        this.loadGameByPath(data.gamePath, data.type, data.model, true);
      });

      this.relay.on('load-tosec', (data) => {
        console.log('[RemoteRelay] Mirroring remote TOSEC game load:', data);
        this.loadTosecGame(data.relPath, data.format, data.name, data.is128K, true);
      });
    }
  }

  updateProgramTitle(title, status = 'PLAYING') {
    const el = document.getElementById('program_name');
    if (el) {
      el.textContent = title;
      el.title = `${status}: ${title}`;
    }
    const cleanTitle = (title || '').split('(')[0].trim() || title;
    if (cleanTitle) {
      document.title = `${cleanTitle} — Sinclair ZX Spectrum XR`;
    }
  }

  initFilePicker() {
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.sna,.z80,.tap,.tzx,.dsk,.trd,.scl,.rom';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);

    this.fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      await this.loadFile(file);
    });

    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        await this.loadFile(e.dataTransfer.files[0]);
      }
    });
  }

  openFileDialog() {
    this.fileInput.click();
  }

  async searchTosec(query, cat = 'all', limit = 40) {
    try {
      const res = await fetch(`/api/tosec/search?q=${encodeURIComponent(query)}&cat=${cat}&limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('[TOSEC] Search error:', err);
      return { totalMatches: 0, results: [] };
    }
  }

  async loadTosecGame(relPath, format, name, is128K = null, isRemote = false) {
    console.log(`[TOSEC] Loading: ${name} (${format}) from ${relPath} (isRemote: ${isRemote})`);
    if (!isRemote) {
      if (this.relay) this.relay.send('load-tosec', { relPath, format, name, is128K });
    }
    this.updateProgramTitle(name, 'STREAMING');

    try {
      const res = await fetch(`/api/tosec/get?file=${encodeURIComponent(relPath)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} streaming file`);

      const extractedFormat = (res.headers.get('x-extracted-format') || format || relPath.split('.').pop() || 'z80').toLowerCase();
      const extractedName = res.headers.get('x-extracted-name') || name || relPath.split('/').pop();
      const buf = await res.arrayBuffer();

      console.log(`[TOSEC] Received ${buf.byteLength} bytes for ${extractedName} (${extractedFormat})`);
      await this.loadBinaryBuffer(buf, extractedName, extractedFormat, is128K);
    } catch (err) {
      console.error('[TOSEC] Failed to load:', err);
      alert(`Error loading ${name}: ${err.message}`);
    }
  }

  async loadRandomGame(cat = '') {
    try {
      const res = await fetch(`/api/tosec/random?cat=${encodeURIComponent(cat)}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const g = (data && data.game) ? data.game : (data && data.relPath ? data : null);
        if (g && g.relPath && !this.randomHistory.has(g.relPath)) {
          this.randomHistory.add(g.relPath);
          if (this.randomHistory.size > 100) {
            const first = this.randomHistory.values().next().value;
            this.randomHistory.delete(first);
          }
          const ext = (g.format || g.ext || g.relPath.split('.').pop() || 'z80').toLowerCase();
          // Check if this is a local /games/ file or a TOSEC archive path
          if (!g.relPath.includes('/') && !g.relPath.includes('\\')) {
            await this.loadGameByPath(`/games/${g.relPath}`, ext, null);
          } else {
            await this.loadTosecGame(g.relPath, ext, g.title || g.name, g.is128K ?? null);
          }
          return g;
        }
      }
    } catch (_) {}

    // Fallback to full 39-game Bundled Pool with non-repeating shuffle deck
    if (this.featuredGames && this.featuredGames.length > 0) {
      let candidates = this.featuredGames.filter(item => !this.randomHistory.has(item.file));
      if (candidates.length === 0) {
        this.randomHistory.clear();
        candidates = this.featuredGames;
      }
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.randomHistory.add(pick.file);
      await this.loadGameByPath(pick.file, pick.type, pick.model);
      return pick;
    }
    return null;
  }

  async loadBinaryBuffer(buffer, fileName, ext, is128K = null) {
    this._bootToken++;
    const cleanExt = (ext || fileName.split('.').pop() || '').toLowerCase();
    this.updateProgramTitle(fileName, 'PLAYING');

    if (window.__FUSE_NATIVE_BACKEND__) {
      const uploadName = (cleanExt && !fileName.toLowerCase().endsWith('.' + cleanExt))
        ? `${fileName}.${cleanExt}`
        : fileName;
      fetch(`/api/upload?name=${encodeURIComponent(uploadName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: buffer
      }).catch(() => {});
    }

    if (cleanExt === 'z80') {
      const detectedModel = SnapshotLoader.detectModel(new Uint8Array(buffer), 'z80');
      const targetModel = detectedModel || ((is128K === true) ? SpectrumModel.Spectrum128K : SpectrumModel.Spectrum48K);
      if (this.spectrum.model !== targetModel) {
        await this.spectrum.loadRomForModel(targetModel);
      }
      if (window.__speccyApp && typeof window.__speccyApp.updateModelBadge === 'function') {
        window.__speccyApp.updateModelBadge(targetModel);
      }
      SnapshotLoader.loadZ80(this.spectrum, buffer);
    } else if (cleanExt === 'sna') {
      const detectedModel = SnapshotLoader.detectModel(new Uint8Array(buffer), 'sna');
      if (this.spectrum.model !== detectedModel) {
        await this.spectrum.loadRomForModel(detectedModel);
      }
      if (window.__speccyApp && typeof window.__speccyApp.updateModelBadge === 'function') {
        window.__speccyApp.updateModelBadge(detectedModel);
      }
      SnapshotLoader.loadSNA(this.spectrum, buffer);
    } else if (cleanExt === 'dsk') {
      if (this.spectrum.model !== SpectrumModel.SpectrumPlus3) {
        await this.spectrum.loadRomForModel(SpectrumModel.SpectrumPlus3);
      }
      if (window.__speccyApp && typeof window.__speccyApp.updateModelBadge === 'function') {
        window.__speccyApp.updateModelBadge(SpectrumModel.SpectrumPlus3);
      }
      await this.spectrum.insertDisk(buffer, fileName);
      this.spectrum.reset(true);
      this.autoBootPlus3Disk();
    } else if (cleanExt === 'trd' || cleanExt === 'scl') {
      if (this.spectrum.model !== SpectrumModel.Pentagon128) {
        await this.spectrum.loadRomForModel(SpectrumModel.Pentagon128);
      }
      if (window.__speccyApp && typeof window.__speccyApp.updateModelBadge === 'function') {
        window.__speccyApp.updateModelBadge(SpectrumModel.Pentagon128);
      }
      await this.spectrum.insertTrDosDisk(buffer, fileName);
      this.autoBootTrDosDisk();
    } else if (cleanExt === 'tap' || cleanExt === 'tzx') {
      const targetModel = (is128K === true) ? SpectrumModel.Spectrum128K : SpectrumModel.Spectrum48K;
      if (this.spectrum.model !== targetModel) {
        await this.spectrum.loadRomForModel(targetModel);
      }
      if (window.__speccyApp && typeof window.__speccyApp.updateModelBadge === 'function') {
        window.__speccyApp.updateModelBadge(targetModel);
      }
      SnapshotLoader.loadTAP(this.spectrum, buffer, fileName);
      this.spectrum.reset(true);
      this.autoLoadTape();
    }
    this.spectrum.audio.unlock();
  }

  async loadGameByPath(gamePath, type, model, isRemote = false) {
    this._bootToken++;
    console.log(`Loading game: ${gamePath} (Model: ${model}, isRemote: ${isRemote})`);
    if (!isRemote) {
      if (this.relay) this.relay.send('load-game', { gamePath, type, model });
      if (window.__FUSE_NATIVE_BACKEND__ && gamePath.startsWith('/games/')) {
        fetch(`/api/control?action=load_local&file=${encodeURIComponent(gamePath.slice(7))}`).catch(() => {});
      }
    }

    try {
      const res = await fetch(gamePath);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${gamePath}`);
      const buf = await res.arrayBuffer();
      const filename = gamePath.split('/').pop();
      const cleanType = (type || filename.split('.').pop() || '').toLowerCase();
      this.updateProgramTitle(filename, 'PLAYING');

      if (cleanType === 'dsk') {
        await this.spectrum.insertDisk(buf, filename);
        if (window.__speccyApp && typeof window.__speccyApp.updateModelBadge === 'function') {
          window.__speccyApp.updateModelBadge(SpectrumModel.SpectrumPlus3);
        }
        this.spectrum.reset(true);
        this.autoBootPlus3Disk();
      } else if (cleanType === 'trd' || cleanType === 'scl') {
        await this.spectrum.insertTrDosDisk(buf, filename);
        if (window.__speccyApp && typeof window.__speccyApp.updateModelBadge === 'function') {
          window.__speccyApp.updateModelBadge(SpectrumModel.Pentagon128);
        }
        this.autoBootTrDosDisk();
      } else if (cleanType === 'tap' || cleanType === 'tzx') {
        const targetModel = model || SpectrumModel.Spectrum48K;
        if (this.spectrum.model !== targetModel) {
          await this.spectrum.loadRomForModel(targetModel);
        }
        if (window.__speccyApp && typeof window.__speccyApp.updateModelBadge === 'function') {
          window.__speccyApp.updateModelBadge(targetModel);
        }
        SnapshotLoader.loadTAP(this.spectrum, buf, filename);
        this.spectrum.reset(true);
        this.autoLoadTape();
      } else if (cleanType === 'sna') {
        const targetModel = SnapshotLoader.detectModel(new Uint8Array(buf), 'sna') || model;
        if (this.spectrum.model !== targetModel) {
          await this.spectrum.loadRomForModel(targetModel);
        }
        if (window.__speccyApp && typeof window.__speccyApp.updateModelBadge === 'function') {
          window.__speccyApp.updateModelBadge(targetModel);
        }
        SnapshotLoader.loadSNA(this.spectrum, buf);
      } else if (cleanType === 'z80') {
        const detectedModel = SnapshotLoader.detectModel(new Uint8Array(buf), 'z80');
        const targetModel = detectedModel || model;
        if (this.spectrum.model !== targetModel) {
          await this.spectrum.loadRomForModel(targetModel);
        }
        if (window.__speccyApp && typeof window.__speccyApp.updateModelBadge === 'function') {
          window.__speccyApp.updateModelBadge(targetModel);
        }
        SnapshotLoader.loadZ80(this.spectrum, buf);
      }
      this.spectrum.audio.unlock();
    } catch (err) {
      console.error('Error loading game:', err);
      alert('Error loading game: ' + err.message);
    }
  }

  async autoBootTrDosDisk() {
    // Use Fuse's beta.c ui_drive_autoload() cold-boot mechanism:
    // Reset at PC = 0x0000 with 48K ROM (0x10) and trDosActive = true.
    // TR-DOS 5.03 initializes 48K system RAM cleanly and automatically runs "boot.B"
    // with zero synthetic keystrokes!
    this.spectrum.enterTrDos(true);
  }

  async autoBootPlus3Disk() {
    const token = ++this._bootToken;
    this.spectrum._suppressFuseInput = true;
    try {
      // Synchronously step 105 frames so +3 ROM finishes RAM check and displays the Loader menu
      for (let i = 0; i < 105; i++) this.spectrum.stepFrame();
      this.spectrum.handleKeyEvent('enter', true);
      for (let i = 0; i < 6; i++) this.spectrum.stepFrame();
      this.spectrum.handleKeyEvent('enter', false);
      this.spectrum.clearAllKeys();
      for (let i = 0; i < 20; i++) this.spectrum.stepFrame();
    } finally {
      this.spectrum._suppressFuseInput = false;
    }

    if (this.spectrum.disk && (this.spectrum.disk.motorOn || this.spectrum.disk.sectorsRead > 0)) {
      console.log('[AutoBoot] +3 Disk Loader launched synchronously!');
      return;
    }

    for (let retry = 0; retry < 4; retry++) {
      if (this._bootToken !== token) return;
      if (this.spectrum.disk && (this.spectrum.disk.motorOn || this.spectrum.disk.sectorsRead > 0)) {
        console.log('[AutoBoot] +3 Disk Loader is active!');
        break;
      }
      console.log(`[AutoBoot] Tapping Enter to launch +3 Disk Loader (attempt ${retry + 1}/4)...`);
      this.spectrum.handleKeyEvent('enter', true);
      await new Promise((r) => setTimeout(r, 140));
      this.spectrum.handleKeyEvent('enter', false);

      const start = Date.now();
      while (Date.now() - start < 1400) {
        if (this._bootToken !== token) return;
        if (this.spectrum.disk && (this.spectrum.disk.motorOn || this.spectrum.disk.sectorsRead > 0)) break;
        await new Promise((r) => setTimeout(r, 80));
      }
    }
  }

  async autoLoadTape() {
    this._bootToken++;
    this.spectrum._suppressFuseInput = true;
    try {
      const tapStepKey = (k) => {
        this.spectrum.handleKeyEvent(k, true);
        for (let i = 0; i < 4; i++) this.spectrum.stepFrame();
        this.spectrum.handleKeyEvent(k, false);
        this.spectrum.clearAllKeys();
        for (let i = 0; i < 4; i++) this.spectrum.stepFrame();
      };

      if (this.spectrum.model === SpectrumModel.Spectrum128K || this.spectrum.model === SpectrumModel.SpectrumPlus2) {
        // Step 85 frames so 128K/+2 ROM reaches the top-level menu with "Tape Loader" highlighted
        for (let i = 0; i < 85; i++) this.spectrum.stepFrame();
        tapStepKey('enter');
        for (let i = 0; i < 40; i++) this.spectrum.stepFrame();
        console.log('[AutoLoadTape] 128K Tape Loader started!');
      } else {
        // 48K ROM runs its hardware RAM test (0x11DC..0x11E6) with IFF1=0 for 86 frames.
        // Step 95 frames synchronously so BASIC is at the "K" cursor prompt with IFF1=1.
        for (let i = 0; i < 95; i++) this.spectrum.stepFrame();
        tapStepKey('j'); // LOAD
        tapStepKey('"'); // "
        tapStepKey('"'); // "

        // Check if block 0 is a headerless / CODE block (flag=0x00, type=0x03 CODE) requiring LOAD ""CODE
        const b0 = this.spectrum.tape && this.spectrum.tape.blocks && this.spectrum.tape.blocks[0];
        if (b0 && b0.length >= 2 && b0[0] === 0x00 && b0[1] === 0x03) {
          tapStepKey('tab'); // Extended mode (CapsShift + SymbolShift)
          tapStepKey('i');   // CODE
        }

        tapStepKey('enter');
        for (let i = 0; i < 40; i++) this.spectrum.stepFrame();
        console.log('[AutoLoadTape] 48K LOAD "" executed synchronously! LD-BYTES trap active.');
      }
    } finally {
      this.spectrum._suppressFuseInput = false;
    }
  }

  async loadFile(file) {
    const buffer = await file.arrayBuffer();
    const ext = file.name.split('.').pop().toLowerCase();
    console.log(`Loading file: ${file.name} (${buffer.byteLength} bytes)`);
    if (ext === 'rom') {
      const data = new Uint8Array(buffer);
      if (data.length >= 65536) {
        await this.spectrum.loadRomForModel(SpectrumModel.SpectrumPlus3);
      } else {
        await this.spectrum.loadRomForModel(SpectrumModel.Spectrum48K);
      }
      return;
    }
    await this.loadBinaryBuffer(buffer, file.name, ext, null);
  }
}
