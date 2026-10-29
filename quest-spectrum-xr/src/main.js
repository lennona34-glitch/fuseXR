/**
 * ZX Spectrum Quest XR - Main Application
 * Sinclair ZX Spectrum 48K/128K/+3 Emulator in Mixed Reality & Immersive VR for Meta Quest 3
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ZXSpectrum, SpectrumModel } from './emulator/spectrum.js';
import { ScreenRig } from './xr/screen-rig.js';
import { XRManager } from './xr/xr-manager.js';
import { ControllerManager } from './xr/controller.js';
import { VirtualKeyboard } from './display/virtual-keyboard.js';
import { SpatialMenu } from './ui/spatial-menu.js';
import { GamesLibrary } from './ui/games-library.js';
import { CheatAndArchiveManager } from './ui/cheat-archive-manager.js';
import { RemoteRelay } from './network/remote-relay.js';
import { RetroRoom } from './room/retro-room.js';

class App {
  constructor() {
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.fpsCounter = 0;
    this.initialRecenterDone = false;

    this.isVRHeadset = /OculusBrowser|Quest|Pico|Vive/i.test(navigator.userAgent);
    this.relay = new RemoteRelay({ isVR: this.isVRHeadset });

    if (typeof fetch !== 'undefined') {
      fetch('/api/diag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'app-init', isVR: this.isVRHeadset, href: window.location.href })
      }).catch(() => {});

      window.addEventListener('error', (e) => {
        fetch('/api/diag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'window-error', message: e.message, file: e.filename, line: e.lineno, isVR: this.isVRHeadset })
        }).catch(() => {});
      });
    }

    this.initThree();
    this.init2DPreview();
    this.initSpectrum();
    this.initXR();
    this.initDOMControls();
    this.initTosecModal();
    this.initEvents();
    this.initPCGamepadPolling();

    // Start WebGL / WebXR Animation Loop
    this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
    console.log('[ZXSpectrumXR] App initialized and animation loop running');
  }

  initThree() {
    this.container = document.getElementById('app');

    // 1. Scene & Camera (Positioned seated at the retro 90s desk facing CRT TV)
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50);
    this.camera.position.set(0, 0.96, -0.15);

    // 2. WebGL Renderer with WebXR enabled
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.xr.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 3. OrbitControls for Desktop / PC browser
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false; // Never pan away from the desk & CRT TV!
    this.controls.target.set(0, 0.78, -1.05); // Centers target on CRT TV & Speccy +3
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 3.5;

    // Lights for 3D meshes
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444455, 1.2);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1.5, 3.5, 2.5);
    this.scene.add(dirLight);
  }

  init2DPreview() {
    this.canvas2d = document.getElementById('speccy-canvas-2d');
    if (this.canvas2d) {
      this.ctx2d = this.canvas2d.getContext('2d', { alpha: false, desynchronized: true });
      if (this.ctx2d) {
        this.ctx2d.imageSmoothingEnabled = false;
        this.imageData2d = this.ctx2d.createImageData(320, 240);
      }
    }
    this.driveLedEl = document.getElementById('hud_led_drive');
    this.tapeLedEl = document.getElementById('hud_led_tape');
    this.driveTrackEl = document.getElementById('drive_track');
    this.tapeCounterEl = document.getElementById('tape_counter');
    this.driveDiskNameEl = document.getElementById('drive_disk_name');
    this.tapeDiskNameEl = document.getElementById('tape_disk_name');
    this.fpsEl = document.getElementById('badge-fps-display');
    this.modelNameEl = document.getElementById('hud-model-name');
    this.fsModelNameEl = document.getElementById('fs-model-name');
  }

  initSpectrum() {
    this.spectrum = new ZXSpectrum();

    const ula = this.spectrum.ula;
    const createTex = (buf) => {
      const tex = new THREE.DataTexture(buf, ula.width, ula.height, THREE.RGBAFormat, THREE.UnsignedByteType);
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    };

    // 1. Solid complete 2D frame texture (Border + Paper + Ink) - 100% solid, zero cracks
    this.frameTexture = createTex(ula.frameBuffer);
    // 2. Stereoscopic 3D Unified Pop-Out Ink Layer (Platforms, Characters, Lasers, HUD together)
    this.fgTexture = createTex(ula.inkBuffer);
    // Backward compatibility aliases
    this.bgTexture = this.frameTexture;
    this.brightTexture = this.fgTexture;
    this.screenTexture = this.frameTexture;

    // Preload all Sinclair ROMs in parallel for instantaneous model switching
    this.spectrum.preloadAllRoms().catch(() => {});

    // Load Sinclair ZX Spectrum 128K ROM by default for instant boot screen
    this.spectrum.loadRomForModel('Spectrum128K');
    this.updateModelBadge('Spectrum128K');
    this.initFuseCoreBridge();
  }

  initFuseCoreBridge() {
    this.useFuseNativeStream = (window.location.port === '8765');
    this.fuseFetchInFlight = false;
    this.fusePalColors = [
      [0, 0, 0],       [0, 0, 215],     [215, 0, 0],     [215, 0, 215],
      [0, 215, 0],     [0, 215, 215],   [215, 215, 0],   [215, 215, 215],
      [0, 0, 0],       [0, 0, 255],     [255, 0, 0],     [255, 0, 255],
      [0, 255, 0],     [0, 255, 255],   [255, 255, 0],   [255, 255, 255]
    ];

    const badge = document.getElementById('hud-core-badge');
    const updateCoreBadge = () => {
      window.__FUSE_NATIVE_STREAM_ACTIVE__ = !!(this.useFuseNativeStream && window.__FUSE_NATIVE_BACKEND__);
      if (!badge) return;
      if (this.useFuseNativeStream && window.__FUSE_NATIVE_BACKEND__) {
        badge.textContent = '🟢 Fuse 1.10.0 C Core';
        badge.style.background = 'rgba(16,185,129,0.25)';
        badge.style.borderColor = '#34d399';
        badge.style.color = '#6ee7b7';
      } else {
        badge.textContent = '⚡ Fuse 1.10.0 ROMs';
        badge.style.background = 'rgba(0,210,255,0.18)';
        badge.style.borderColor = '#38bdf8';
        badge.style.color = '#7dd3fc';
      }
    };

    if (badge) {
      badge.addEventListener('click', () => {
        if (!window.__FUSE_NATIVE_BACKEND__) {
          fetch('/status.json').then(r => r.json()).then(d => {
            if (d && d.running) {
              window.__FUSE_NATIVE_BACKEND__ = true;
              this.useFuseNativeStream = !this.useFuseNativeStream;
              updateCoreBadge();
            }
          }).catch(() => {});
          return;
        }
        this.useFuseNativeStream = !this.useFuseNativeStream;
        updateCoreBadge();
      });
    }

    fetch('/status.json').then(r => r.json()).then(d => {
      if (d && d.running) {
        window.__FUSE_NATIVE_BACKEND__ = true;
        updateCoreBadge();
      }
    }).catch(() => {});
  }

  pollFuseFramePal() {
    if (!this.useFuseNativeStream || !window.__FUSE_NATIVE_BACKEND__ || this.fuseFetchInFlight) return;
    this.fuseFetchInFlight = true;
    fetch('/api/frame.pal')
      .then(r => (r.ok ? r.arrayBuffer() : null))
      .then(buf => {
        if (buf && buf.byteLength === 38400) {
          const src = new Uint8Array(buf);
          const fb = this.spectrum.ula.frameBuffer;
          const ib = this.spectrum.ula.inkBuffer;
          const pal = this.fusePalColors;
          // Border index from top-left pixel
          const borderIdx = (src[0] >> 4) & 0x0f;
          let dstIdx = 0;
          for (let i = 0; i < 38400; i++) {
            const b = src[i];
            const c0 = pal[(b >> 4) & 0x0f];
            const c1 = pal[b & 0x0f];
            fb[dstIdx]     = c0[0]; fb[dstIdx + 1] = c0[1]; fb[dstIdx + 2] = c0[2]; fb[dstIdx + 3] = 255;
            const isInk0 = ((b >> 4) & 0x0f) !== borderIdx && ((b >> 4) & 0x07) !== 7;
            ib[dstIdx]     = c0[0]; ib[dstIdx + 1] = c0[1]; ib[dstIdx + 2] = c0[2]; ib[dstIdx + 3] = isInk0 ? 255 : 0;
            dstIdx += 4;

            fb[dstIdx]     = c1[0]; fb[dstIdx + 1] = c1[1]; fb[dstIdx + 2] = c1[2]; fb[dstIdx + 3] = 255;
            const isInk1 = (b & 0x0f) !== borderIdx && (b & 0x07) !== 7;
            ib[dstIdx]     = c1[0]; ib[dstIdx + 1] = c1[1]; ib[dstIdx + 2] = c1[2]; ib[dstIdx + 3] = isInk1 ? 255 : 0;
            dstIdx += 4;
          }
          if (this.ctx2d && this.imageData2d) {
            this.imageData2d.data.set(fb);
            this.ctx2d.putImageData(this.imageData2d, 0, 0);
          }
          this.frameTexture.needsUpdate = true;
          if (this.screenRig.pop3DLevel > 0) {
            this.fgTexture.needsUpdate = true;
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        this.fuseFetchInFlight = false;
      });
  }

  initXR() {
    // 1. Games Library & File loader
    this.gamesLibrary = new GamesLibrary(this.spectrum, this.relay);

    // 2. 1980s Retro Room Environment (Desk, Vintage CRT TV, Speccy +3, Disks, Tapes, Lamp, Posters)
    this.retroRoom = new RetroRoom(this.scene, this.spectrum, this.frameTexture, this.gamesLibrary);

    // 3. Floating Screen Rig (4:3 aspect locked) for floating MR / Cinema zoom modes
    this.screenRig = new ScreenRig({
      frameTexture: this.frameTexture,
      bgTexture: this.bgTexture,
      fgTexture: this.fgTexture,
      brightTexture: this.brightTexture
    });
    this.scene.add(this.screenRig.group);
    this.screenRig.group.visible = false; // Hidden in Room mode as CRT TV is the active display

    // 4. Virtual 3D Rubber Keyboard (attached to screen rig for floating MR mode)
    this.virtualKeyboard = new VirtualKeyboard(this.spectrum);
    this.virtualKeyboard.group.position.set(0, -0.68, 0.15);
    this.virtualKeyboard.group.rotation.x = -Math.PI / 8;
    this.screenRig.group.add(this.virtualKeyboard.group);

    // 5. Spatial Floating Menu
    this.spatialMenu = new SpatialMenu({
      toggleMR: () => {
        const mode = this.xrManager.toggleMode();
        const modeNames = {
          room: '🏠 Room Mode',
          desk_mr: '🖥️ Desk MR',
          ar: '🥽 Passthrough',
          void: '🌌 Cyber Void'
        };
        const text = modeNames[mode] || '🥽 Mode';
        this.spatialMenu.updateButtonText('toggleMR', text);
      },
      randomGame: () => this.gamesLibrary.loadRandomGame('z80'),
      raiseDesk: () => {
        if (this.retroRoom) this.retroRoom.adjustDeskHeight(0.05);
      },
      lowerDesk: () => {
        if (this.retroRoom) this.retroRoom.adjustDeskHeight(-0.05);
      },
      toggleSound: () => {
        this.spectrum.audio.unlock();
        this.spectrum.audio.toggleMute();
      },
      toggleControllers: () => this.controllerManager?.toggleControllerOverlays(),
      toggleHandles: () => this.screenRig.toggleHandles(),
      toggleLasers: () => this.controllerManager.toggleLasers(),
      toggle3D: () => {
        const lvl = this.screenRig.toggle3D();
        const names = ['🕶️ 3D: OFF', '🕶️ 3D: SUBTLE', '🕶️ 3D: POP-OUT', '🕶️ 3D: HOLOGRAM'];
        const btn3D = document.getElementById('btn-toggle-3d');
        if (btn3D) btn3D.textContent = names[lvl];
        this.spatialMenu.updateButtonText('toggle3D', names[lvl]);
      },
      toggleCRT: () => this.toggleCRT(),
      toggleKbd: () => this.virtualKeyboard.toggleVisible(),
      resetEmu: () => {
        this.spectrum.reset();
        if (this.relay) this.relay.send('reset');
      }
    });
    this.spatialMenu.group.position.set(0, 0.70, -0.92);
    this.spatialMenu.group.rotation.x = -Math.PI / 6;
    this.scene.add(this.spatialMenu.group);

    // 6. Quest Controller Manager
    this.controllerManager = new ControllerManager(
      this.renderer,
      this.scene,
      this.screenRig,
      this.spatialMenu,
      this.virtualKeyboard,
      this.spectrum,
      this.retroRoom
    );
    this.controllerManager.onCycleControlMode = () => this.cycleControlMode();

    // 7. WebXR Manager (Passthrough MR vs Immersive 1980s Retro Room)
    this.xrManager = new XRManager(
      this.renderer,
      this.scene,
      this.camera,
      this.screenRig,
      this.retroRoom,
      () => {
        this.initialRecenterDone = false;
        const hud = document.getElementById('hud-overlay');
        if (hud) hud.classList.add('in-xr');
      }
    );

    // Start in 1980s Retro Room Mode!
    this.xrManager.setMode('room');
  }

  toggleCRT(forcedState = null) {
    const container = document.getElementById('monitor-screen-container');
    const isCurrentlyActive = container ? container.classList.contains('crt-active') : false;
    const isCrt = (forcedState !== null) ? forcedState : !isCurrentlyActive;

    if (container) {
      container.classList.toggle('crt-active', isCrt);
    }

    if (this.screenRig) {
      this.screenRig.isCRTActive = isCrt;
      if (this.screenRig.crtMaterial && this.screenRig.crtMaterial.uniforms.uScanlineIntensity) {
        this.screenRig.crtMaterial.uniforms.uScanlineIntensity.value = isCrt ? 0.35 : 0.0;
        this.screenRig.crtMaterial.uniforms.uMaskIntensity.value = isCrt ? 0.20 : 0.0;
      }
      if (this.screenRig.screenMesh) {
        this.screenRig.screenMesh.material = isCrt ? this.screenRig.crtMaterial : this.screenRig.flatMaterial;
      }
    }

    const txt = isCrt ? 'CRT: ON' : 'CRT: OFF';
    const btnCrt2D = document.getElementById('btn-toggle-crt-2d');
    const btnFsCrt = document.getElementById('btn-fs-crt');
    const crtBtnText = document.getElementById('crt-btn-text');

    if (btnCrt2D) {
      btnCrt2D.classList.toggle('crt-active', isCrt);
      if (crtBtnText) crtBtnText.textContent = txt;
      else btnCrt2D.textContent = `📺 ${txt}`;
    }
    if (btnFsCrt) {
      btnFsCrt.classList.toggle('crt-active', isCrt);
      btnFsCrt.textContent = `📺 ${txt}`;
    }
    if (this.spatialMenu) {
      this.spatialMenu.updateButtonText('toggleCRT', `📺 ${txt}`);
    }
    return isCrt;
  }

  updateModelBadge(model) {
    const shortNames = {
      SpectrumPlus3: '+3 FLOPPY',
      Spectrum128K: '128K PAL',
      SpectrumPlus2: '+2 TAPE',
      Spectrum48K: '48K PAL',
      Pentagon128: 'PENTAGON'
    };
    const text = shortNames[model] || model;
    if (this.modelNameEl) {
      this.modelNameEl.textContent = text;
      this.modelNameEl.title = text;
    }
    if (this.fsModelNameEl) this.fsModelNameEl.textContent = text;
    const selectModel = document.getElementById('select-model');
    const selectFsModel = document.getElementById('select-fs-model');
    if (selectModel && selectModel.value !== model) selectModel.value = model;
    if (selectFsModel && selectFsModel.value !== model) selectFsModel.value = model;

    // Switch the 3D computer model on the retro desk!
    if (this.retroRoom && this.retroRoom.setSpectrumModel) {
      this.retroRoom.setSpectrumModel(model);
    }
  }

  async switchSpeccyModel(model) {
    if (!model) return;
    this.spectrum.audio.unlock();
    await this.spectrum.loadRomForModel(model);
    this.updateModelBadge(model);
    if (window.__FUSE_NATIVE_BACKEND__) {
      const fuseIdMap = {
        Spectrum128K: '128',
        SpectrumPlus3: 'plus3',
        SpectrumPlus2: 'plus2',
        Spectrum48K: '48',
        Pentagon128: 'pentagon'
      };
      const fid = fuseIdMap[model] || '128';
      fetch(`/api/control?action=machine&id=${fid}`).catch(() => {});
    }
    if (this.gamesLibrary) {
      const modelLabels = {
        SpectrumPlus3: 'Sinclair +3 DOS / BASIC',
        Spectrum128K: 'Sinclair 128K BASIC',
        SpectrumPlus2: 'Sinclair +2 BASIC',
        Spectrum48K: 'Sinclair 48K BASIC',
        Pentagon128: 'Pentagon 128 TR-DOS'
      };
      this.gamesLibrary.updateProgramTitle(modelLabels[model] || 'Sinclair BASIC', 'SYSTEM');
    }
  }

  initDOMControls() {
    const btnEnterMR = document.getElementById('btn-enter-mr');
    const btnEnterVR = document.getElementById('btn-enter-vr');
    const btnLoadFile = document.getElementById('btn-load-file');
    const btnReset = document.getElementById('btn-reset');
    const selectModel = document.getElementById('select-model');
    const selectFeaturedGame = document.getElementById('select-featured-game');
    const btnRandomGame = document.getElementById('btn-random-game');

    if (btnRandomGame) {
      btnRandomGame.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.gamesLibrary.loadRandomGame('');
      });
    }

    // 2D Workstation Monitor & 3D Room View Toggle Buttons
    const emuView = document.getElementById('hud-emu-view');
    const btnToggleCrt2D = document.getElementById('btn-toggle-crt-2d');
    const btnAutoboot = document.getElementById('btn-autoboot');
    const btnEjectDisk = document.getElementById('btn-eject-disk');
    const btnTapePlay = document.getElementById('btn-tape-play');
    const btnTapeRewind = document.getElementById('btn-tape-rewind');
    const btnEjectTape = document.getElementById('btn-eject-tape');
    const btnQuickReset = document.getElementById('btn-quick-reset');
    const btnMouseToggle = document.getElementById('btn-mouse-toggle');
    const btnToggleRoom = document.getElementById('btn-toggle-room-view');
    const roomBtnText = document.getElementById('room-btn-text');

    if (btnToggleRoom && emuView) {
      btnToggleRoom.addEventListener('click', () => {
        const isHidden = emuView.classList.toggle('hidden-for-3d');
        if (roomBtnText) roomBtnText.textContent = isHidden ? '2D Monitor' : '3D Room';
        btnToggleRoom.classList.toggle('btn-zen', isHidden);
        btnToggleRoom.classList.toggle('btn-room', !isHidden);
      });
    }

    if (selectModel) {
      selectModel.addEventListener('change', (e) => {
        e.target.blur();
        this.switchSpeccyModel(e.target.value);
      });
    }

    // Drive Bar: Autoboot Floppy Disk
    if (btnAutoboot) {
      btnAutoboot.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        if (this.spectrum.model === SpectrumModel.Pentagon128 || (this.spectrum.trDosDisk && this.spectrum.trDosDisk.inserted)) {
          this.gamesLibrary.autoBootTrDosDisk();
        } else {
          this.gamesLibrary.autoBootPlus3Disk();
        }
      });
    }

    // Drive Bar: Eject Floppy Disk
    if (btnEjectDisk) {
      btnEjectDisk.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.spectrum.ejectDisk();
      });
    }

    // Drive Bar: Tape Play / Stop
    if (btnTapePlay) {
      btnTapePlay.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        if (this.spectrum.tape) {
          const isPlaying = this.spectrum.tape.togglePlay();
          btnTapePlay.textContent = isPlaying ? 'Pause' : 'Play';
        }
      });
    }

    // Drive Bar: Tape Rewind
    if (btnTapeRewind) {
      btnTapeRewind.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        if (this.spectrum.tape) {
          this.spectrum.tape.rewind();
        }
      });
    }

    // Drive Bar: Eject Tape
    if (btnEjectTape) {
      btnEjectTape.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.spectrum.ejectTape();
        if (btnTapePlay) btnTapePlay.textContent = 'Play/Stop';
      });
    }

    // Drive Bar: Quick Hardware Reset
    if (btnQuickReset) {
      btnQuickReset.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.spectrum.reset();
        if (this.relay) this.relay.send('reset');
      });
    }

    // Mouse Lock Chip (Kempston Mouse)
    if (btnMouseToggle && this.canvas2d) {
      btnMouseToggle.addEventListener('click', () => {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        } else {
          this.canvas2d.requestPointerLock();
        }
      });
    }

    document.addEventListener('pointerlockchange', () => {
      const isLocked = !!document.pointerLockElement;
      if (btnMouseToggle) btnMouseToggle.classList.toggle('active', isLocked);
    });

    // Middle-click (button 1) traps or releases the mouse
    window.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        if (document.pointerLockElement) {
          document.exitPointerLock();
        } else if (this.canvas2d) {
          this.canvas2d.requestPointerLock();
        }
      }
    }, true);

    const onSelectFeatured = (val) => {
      if (!val) return;
      this.spectrum.audio.unlock();
      const [path, type, model] = val.split('|');
      if (model) this.updateModelBadge(model);
      const filename = path.split('/').pop();
      if (this.gamesLibrary) {
        this.gamesLibrary.updateProgramTitle(filename, 'LOADING');
      }
      this.gamesLibrary.loadGameByPath(path, type, model);
    };

    if (selectFeaturedGame) {
      selectFeaturedGame.addEventListener('change', (e) => {
        e.target.blur();
        onSelectFeatured(e.target.value);
      });
    }

    if (btnEnterMR) {
      btnEnterMR.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.xrManager.startSession('ar');
      });
    }

    if (btnEnterVR) {
      btnEnterVR.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.xrManager.startSession('vr');
      });
    }

    if (btnLoadFile) {
      btnLoadFile.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.gamesLibrary.openFileDialog();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.spectrum.reset();
        if (this.relay) this.relay.send('reset');
      });
    }

    if (btnToggleCrt2D) {
      btnToggleCrt2D.addEventListener('click', () => {
        this.toggleCRT();
      });
    }

    // Audio Mute/Unmute Toggle Button
    const btnToggleSound = document.getElementById('btn-toggle-sound');
    const soundBtnText = document.getElementById('sound-btn-text');
    if (btnToggleSound) {
      btnToggleSound.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        const isMuted = this.spectrum.audio.toggleMute();
        const txt = isMuted ? 'Sound: OFF' : 'Sound: ON';
        if (soundBtnText) soundBtnText.textContent = txt;
        else btnToggleSound.textContent = `🔊 ${txt}`;
        const btnFsSound = document.getElementById('btn-fs-sound');
        if (btnFsSound) btnFsSound.textContent = `🔊 ${txt}`;
      });
    }

    // Fullscreen Monitor Toggle & Sleek Fullscreen Controls
    const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
    const fsTopBar = document.getElementById('fullscreen-bottom-bar') || document.getElementById('fullscreen-top-bar');
    const btnFsExit = document.getElementById('btn-fs-exit');
    const btnFsRandomGame = document.getElementById('btn-fs-random-game');
    const selectFsFeaturedGame = document.getElementById('select-fs-featured-game');
    const selectFsModel = document.getElementById('select-fs-model');
    const btnFsReset = document.getElementById('btn-fs-reset');
    const btnFsCrt = document.getElementById('btn-fs-crt');
    const btnFsSound = document.getElementById('btn-fs-sound');
    const btnFsTosec = document.getElementById('btn-fs-tosec');

    let fsHideTimer = null;
    const showFsBar = () => {
      if (!fsTopBar || !document.fullscreenElement) return;
      fsTopBar.classList.remove('autohide');
      clearTimeout(fsHideTimer);
      fsHideTimer = setTimeout(() => {
        if (document.fullscreenElement && !fsTopBar.matches(':hover')) {
          fsTopBar.classList.add('autohide');
        }
      }, 2500);
    };

    if (emuView) {
      emuView.addEventListener('mousemove', () => {
        if (document.fullscreenElement) showFsBar();
      });
      emuView.addEventListener('mouseleave', () => {
        if (document.fullscreenElement && fsTopBar) fsTopBar.classList.add('autohide');
      });
    }

    if (btnToggleFullscreen && emuView) {
      btnToggleFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          emuView.requestFullscreen().catch(() => {});
        } else {
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
          document.exitFullscreen().catch(() => {});
        }
      });

      document.addEventListener('fullscreenchange', () => {
        const isFs = !!document.fullscreenElement;
        const zenText = btnToggleFullscreen.querySelector('.btn-text');
        if (zenText) zenText.textContent = isFs ? 'Exit Zen' : 'Zen';

        if (isFs) {
          showFsBar();
          if (navigator.keyboard && typeof navigator.keyboard.lock === 'function') {
            navigator.keyboard.lock(['Escape']).catch(() => {});
          }
        } else {
          clearTimeout(fsHideTimer);
          if (fsTopBar) fsTopBar.classList.remove('autohide');
          if (navigator.keyboard && typeof navigator.keyboard.unlock === 'function') {
            navigator.keyboard.unlock();
          }
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
        }
      });
    }

    if (btnFsExit) {
      btnFsExit.addEventListener('click', () => {
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    if (btnFsRandomGame) {
      btnFsRandomGame.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.gamesLibrary.loadRandomGame('z80');
      });
    }

    if (selectFsFeaturedGame) {
      selectFsFeaturedGame.addEventListener('change', (e) => {
        e.target.blur();
        onSelectFeatured(e.target.value);
      });
    }

    if (selectFsModel) {
      selectFsModel.addEventListener('change', (e) => {
        e.target.blur();
        this.switchSpeccyModel(e.target.value);
      });
    }

    if (btnFsReset) {
      btnFsReset.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.reset();
      });
    }

    if (btnFsCrt) {
      btnFsCrt.addEventListener('click', () => {
        this.toggleCRT();
      });
    }

    if (btnFsSound) {
      btnFsSound.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        this.spectrum.audio.toggleMute();
      });
    }

    if (btnFsTosec) {
      btnFsTosec.addEventListener('click', () => {
        const tosecModal = document.getElementById('tosec-modal');
        if (tosecModal) {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          tosecModal.classList.add('visible');
          document.getElementById('tosec-search-input')?.focus();
        }
      });
    }

    // Arcade Gamepad Control Mode Selector
    this.controlMode = 'kempston'; // 'kempston', 'universal', 'sinclair1', 'sinclair2', 'cursor', 'qaop'
    const selectControlMode = document.getElementById('select-control-mode');
    if (selectControlMode) {
      selectControlMode.addEventListener('change', (e) => {
        e.target.blur();
        this.setControlMode(e.target.value);
      });
    }

    // Focus state for monitor container
    const monitorContainer = document.getElementById('monitor-screen-container');
    if (monitorContainer) {
      monitorContainer.classList.add('focused');
      monitorContainer.addEventListener('click', () => {
        this.spectrum.audio.unlock();
        monitorContainer.classList.add('focused');
      });
    }

    // Wire up Arcade D-Pad and Fire Buttons (Touch & Mouse)
    this.kempstonPadState = { right: false, left: false, down: false, up: false, fire: false };
    this.initArcadeTouchControls();

    // Initialize with Amiga Easy CRT filter active
    this.toggleCRT(true);
  }

  setControlMode(mode) {
    if (!mode) return;
    this.controlMode = mode;
    if (this.controllerManager) {
      this.controllerManager.controlMode = mode;
    }
    const selectControlMode = document.getElementById('select-control-mode');
    if (selectControlMode && selectControlMode.value !== mode) {
      selectControlMode.value = mode;
    }
    if (this.relay) {
      this.relay.send('control-mode', { mode });
    }
    if (import.meta.hot) {
      import.meta.hot.send('remote-control-mode', { mode });
    }
    console.log('[Main] Control Mode changed to:', mode);
  }

  cycleControlMode() {
    const modes = ['kempston', 'universal', 'qaop', 'cursor', 'sinclair1', 'sinclair2'];
    const idx = modes.indexOf(this.controlMode || 'kempston');
    const nextMode = modes[(idx + 1) % modes.length];
    this.setControlMode(nextMode);
  }

  initArcadeTouchControls() {
    const bindBtn = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (e) => {
        e.preventDefault();
        this.spectrum.audio.unlock();
        el.classList.add('active');
        onDown();
      };
      const end = (e) => {
        e.preventDefault();
        el.classList.remove('active');
        onUp();
      };
      el.addEventListener('pointerdown', start);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('pointerleave', end);
    };

    const setDir = (dir, pressed) => {
      // Always update Kempston hardware port (0x1F)
      this.kempstonPadState[dir] = pressed;
      this.spectrum.setKempston(
        this.kempstonPadState.right,
        this.kempstonPadState.left,
        this.kempstonPadState.down,
        this.kempstonPadState.up,
        this.kempstonPadState.fire,
        'keyboard'
      );

      if (this.controlMode === 'sinclair1') {
        const keyMap = { left: '6', right: '7', down: '8', up: '9', fire: '0' };
        if (keyMap[dir]) this.spectrum.handleKeyEvent(keyMap[dir], pressed);
      } else if (this.controlMode === 'sinclair2') {
        const keyMap = { left: '1', right: '2', down: '3', up: '4', fire: '5' };
        if (keyMap[dir]) this.spectrum.handleKeyEvent(keyMap[dir], pressed);
      } else if (this.controlMode === 'cursor') {
        const keyMap = { left: '5', down: '6', up: '7', right: '8', fire: '0' };
        if (keyMap[dir]) this.spectrum.handleKeyEvent(keyMap[dir], pressed);
      } else if (this.controlMode === 'qaop') {
        const keyMap = { up: 'q', down: 'a', left: 'o', right: 'p', fire: ' ' };
        if (keyMap[dir]) this.spectrum.handleKeyEvent(keyMap[dir], pressed);
      } else if (this.controlMode === 'universal') {
        const mapQ = { up: 'q', down: 'a', left: 'o', right: 'p', fire: ' ' };
        const mapC = { left: '5', down: '6', up: '7', right: '8', fire: '0' };
        if (mapQ[dir]) this.spectrum.handleKeyEvent(mapQ[dir], pressed);
        if (mapC[dir]) this.spectrum.handleKeyEvent(mapC[dir], pressed);
      }
    };

    bindBtn('dpad-up',    () => setDir('up', true),    () => setDir('up', false));
    bindBtn('dpad-down',  () => setDir('down', true),  () => setDir('down', false));
    bindBtn('dpad-left',  () => setDir('left', true),  () => setDir('left', false));
    bindBtn('dpad-right', () => setDir('right', true), () => setDir('right', false));
    bindBtn('btn-arcade-fire', () => setDir('fire', true), () => setDir('fire', false));
  }

  initTosecModal() {
    this.cheatArchiveManager = new CheatAndArchiveManager(this);

    const modal = document.getElementById('tosec-modal');
    const btnClose = document.getElementById('btn-close-tosec');
    const searchInput = document.getElementById('tosec-search-input');

    const closeModal = () => {
      if (modal) modal.classList.remove('visible');
      if (searchInput) searchInput.blur();
    };

    if (btnClose) {
      btnClose.addEventListener('click', () => closeModal());
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }
  }

  initEvents() {
    // Resize handling
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Two-stage Escape handler in Fullscreen:
    // 1. If pointer locked, Escape releases pointer lock first (mouse cursor is freed, screen stays in fullscreen)
    // 2. If pointer is already free, Escape exits fullscreen back to windowed/maximised mode
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (document.pointerLockElement) {
          e.preventDefault();
          e.stopPropagation();
          document.exitPointerLock();
          console.log('[Escape] Released pointer lock, maintaining fullscreen');
          return;
        } else if (document.fullscreenElement) {
          e.preventDefault();
          e.stopPropagation();
          document.exitFullscreen().catch(() => {});
          console.log('[Escape] Exited fullscreen back to windowed mode');
          return;
        }
      }
    }, true);

    // Route physical keyboard keys to emulator & arcade gamepad
    const handleKey = (e, pressed) => {
      // Only skip when user is actively typing into a visible text input (e.g. TOSEC search box)
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.offsetParent !== null) {
        return;
      }

      // Immediately release focus from any <select> or <button> so keyboard keys NEVER change dropdowns or click UI buttons
      if (document.activeElement && (document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'BUTTON')) {
        document.activeElement.blur();
      }

      this.spectrum.audio.unlock();

      const k = e.key.toLowerCase();
      const code = (e.code || '').toLowerCase();

      // Prevent browser default actions (scrolling on arrows/space, activating buttons on space/enter, tab switching)
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter', 'tab', 'backspace'].includes(k)) {
        e.preventDefault();
      }

      // Check if directional or fire key (Arrow keys, Numpad directions, Space, Ctrl, Alt)
      let isDirectional = false;
      let dir = null;
      let dpadEl = null;

      if (k === 'arrowup'    || code === 'numpad8') { isDirectional = true; dir = 'up';    dpadEl = document.getElementById('dpad-up'); }
      if (k === 'arrowdown'  || code === 'numpad2') { isDirectional = true; dir = 'down';  dpadEl = document.getElementById('dpad-down'); }
      if (k === 'arrowleft'  || code === 'numpad4') { isDirectional = true; dir = 'left';  dpadEl = document.getElementById('dpad-left'); }
      if (k === 'arrowright' || code === 'numpad6') { isDirectional = true; dir = 'right'; dpadEl = document.getElementById('dpad-right'); }

      const isFire = (k === ' ' || k === 'control' || k === 'alt' || code === 'numpad0' || code === 'numpad5');
      const fireEl = document.getElementById('btn-arcade-fire');

      if (dpadEl) {
        if (pressed) dpadEl.classList.add('active');
        else dpadEl.classList.remove('active');
      }
      if (isFire && fireEl) {
        if (pressed) fireEl.classList.add('active');
        else fireEl.classList.remove('active');
      }

      if (isDirectional || isFire) {
        // 1. Always update Kempston hardware port (0x1F) via the 'keyboard' source slot
        if (dir) this.kempstonPadState[dir] = pressed;
        if (isFire) this.kempstonPadState.fire = pressed;
        this.spectrum.setKempston(
          this.kempstonPadState.right,
          this.kempstonPadState.left,
          this.kempstonPadState.down,
          this.kempstonPadState.up,
          this.kempstonPadState.fire,
          'keyboard'
        );
        const gpPayload = {
          axes: [
            (this.kempstonPadState.right ? 1 : 0) - (this.kempstonPadState.left ? 1 : 0),
            (this.kempstonPadState.down ? 1 : 0) - (this.kempstonPadState.up ? 1 : 0)
          ],
          buttons: [this.kempstonPadState.fire],
          directional: {
            up: this.kempstonPadState.up,
            down: this.kempstonPadState.down,
            left: this.kempstonPadState.left,
            right: this.kempstonPadState.right
          },
          fire: this.kempstonPadState.fire
        };
        if (this.relay) this.relay.send('gamepad', gpPayload);

        // 2. Also map Arrow / Fire keys to the selected keyboard control layout
        const action = isFire ? 'fire' : dir;
        if (this.controlMode === 'sinclair1') {
          const map = { left: '6', right: '7', down: '8', up: '9', fire: '0' };
          if (action && map[action]) {
            this.spectrum.handleKeyEvent(map[action], pressed);
            if (this.relay) this.relay.send('keyboard', { key: map[action], pressed });
          }
        } else if (this.controlMode === 'sinclair2') {
          const map = { left: '1', right: '2', down: '3', up: '4', fire: '5' };
          if (action && map[action]) {
            this.spectrum.handleKeyEvent(map[action], pressed);
            if (this.relay) this.relay.send('keyboard', { key: map[action], pressed });
          }
        } else if (this.controlMode === 'cursor') {
          const map = { left: '5', down: '6', up: '7', right: '8', fire: '0' };
          if (action && map[action]) {
            this.spectrum.handleKeyEvent(map[action], pressed);
            if (this.relay) this.relay.send('keyboard', { key: map[action], pressed });
          }
        } else if (this.controlMode === 'qaop') {
          const map = { up: 'q', down: 'a', left: 'o', right: 'p', fire: ' ' };
          if (action && map[action]) {
            this.spectrum.handleKeyEvent(map[action], pressed);
            if (this.relay) this.relay.send('keyboard', { key: map[action], pressed });
          }
        } else if (this.controlMode === 'universal') {
          const mapQ = { up: 'q', down: 'a', left: 'o', right: 'p', fire: ' ' };
          const mapC = { left: '5', down: '6', up: '7', right: '8', fire: '0' };
          if (action && mapQ[action]) this.spectrum.handleKeyEvent(mapQ[action], pressed);
          if (action && mapC[action]) this.spectrum.handleKeyEvent(mapC[action], pressed);
        }
      }

      // Always pass the physical key (including Space!) to the Spectrum keyboard matrix and stream to Quest 3!
      this.spectrum.handleKeyEvent(e.key, pressed, e.code);
      if (window.__FUSE_NATIVE_BACKEND__) {
        const fuseKey = e.key === ' ' ? 'space' : e.key.toLowerCase();
        fetch(`/input?key=${encodeURIComponent(fuseKey)}&action=${pressed ? 'press' : 'release'}`).catch(() => {});
      }
      if (pressed && this.retroRoom && this.retroRoom.spectrumPlus3) {
        this.retroRoom.spectrumPlus3.pressKey(e.key, false); // Visual 3D press only, emulator state already updated
      }

      // Live Keyboard HUD indicator
      const kbdStatusEl = document.getElementById('keyboard-status-text');
      if (kbdStatusEl) {
        this.lastLocalKeyboardTime = Date.now();
        if (pressed) {
          const label = e.key === ' ' ? 'SPACE' : e.key.toUpperCase();
          kbdStatusEl.innerHTML = `<span style="color:#00ff88; font-weight:700;">⌨️ KBD: [${label}]</span>`;
        } else {
          setTimeout(() => {
            if (Date.now() - (this.lastLocalKeyboardTime || 0) >= 250 && (!this.spectrum.activeKeys || this.spectrum.activeKeys.size === 0)) {
              kbdStatusEl.innerHTML = `<span style="color:#38bdf8; font-weight:600;">⌨️ KBD: Ready</span>`;
            }
          }, 260);
        }
      }

      if (this.relay) {
        this.relay.send('keyboard', {
          key: e.key,
          code: e.code,
          pressed: pressed
        });
      }
    };

    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));

    // Release all keys & joystick inputs on window blur or tab switch so keys NEVER get stuck
    const clearInputStates = () => {
      this.spectrum.clearAllKeys();
      this.kempstonPadState = { up: false, down: false, left: false, right: false, fire: false };
      this.spectrum.setKempston(0, 0, 0, 0, 0, 'keyboard');
      const dpadIds = ['dpad-up', 'dpad-down', 'dpad-left', 'dpad-right', 'btn-arcade-fire'];
      dpadIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
      });
      if (this.relay) {
        this.relay.send('keyboard-clear', {});
      }
    };

    window.addEventListener('blur', clearInputStates);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearInputStates();
    });

    // PC Direct 3D Retro Room Clicks (Floppy disks, Cassette tapes, Desk lamp, TV buttons, +3 keys)
    const mouseRaycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    this.renderer.domElement.addEventListener('click', (e) => {
      if (this.renderer.xr.isPresenting) return;
      if (document.pointerLockElement) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      mouseRaycaster.setFromCamera(mouseVec, this.camera);
      const targets = this.retroRoom ? this.retroRoom.interactiveObjects : [];
      const hits = mouseRaycaster.intersectObjects(targets, false);

      if (hits.length > 0) {
        const hit = hits[0].object;
        this.spectrum.audio.unlock();
        if (hit.userData.isInteractiveProp && this.retroRoom) {
          this.retroRoom.props.handlePropClick(hit);
        } else if (hit.userData.isSpeccyKey && this.retroRoom) {
          this.retroRoom.spectrumPlus3.pressKey(hit.userData.keyId);
        } else if (hit.userData.action === 'togglePower' && this.retroRoom) {
          this.retroRoom.crtTv.togglePower();
        } else if (hit.userData.action === 'clickDial' && this.retroRoom) {
          this.retroRoom.crtTv.rotateChannelDial();
        } else if (hit.userData.action === 'ejectDisk') {
          if (this.spectrum.ejectDisk) this.spectrum.ejectDisk();
        }
      }
    });

    // PC Kempston Mouse input capture (Delta movement, Left/Right clicks, Pointer Lock)
    const isVRHeadset = /OculusBrowser|Quest|Pico|Vive/i.test(navigator.userAgent);
    const speccyCanvas = document.getElementById('speccy-canvas-2d');
    const monitorContainer = document.getElementById('monitor-screen-container');

    if (speccyCanvas) {
      // Right-click is Kempston mouse right-button -> prevent browser context menu
      speccyCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      });

      // Pointer lock on canvas click (Escape exits)
      speccyCanvas.addEventListener('click', () => {
        if (!document.pointerLockElement && speccyCanvas.requestPointerLock) {
          speccyCanvas.requestPointerLock();
        }
      });
    }

    if (monitorContainer) {
      monitorContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      });
    }

    // Only desktop PC captures and streams physical mouse events (Quest receives and mirrors)
    if (!isVRHeadset) {
      let mouseAccumDx = 0;
      let mouseAccumDy = 0;
      let mouseSendTimer = null;
      let curLeft = false;
      let curRight = false;
      let curMiddle = false;

      const flushMouseDeltas = () => {
        mouseSendTimer = null;
        const dx = mouseAccumDx;
        const dy = mouseAccumDy;
        mouseAccumDx = 0;
        mouseAccumDy = 0;

        if (dx !== 0 || dy !== 0) {
          this.spectrum.updateKempstonMouseDelta(dx, dy, curLeft, curRight, curMiddle);

          const mousePayload = {
            dx,
            dy,
            left: curLeft,
            right: curRight,
            middle: curMiddle,
            x: this.spectrum.kempstonMouseX,
            y: this.spectrum.kempstonMouseY
          };
          if (this.relay) this.relay.send('mouse', mousePayload);
          if (import.meta.hot) import.meta.hot.send('remote-mouse', mousePayload);

          this.updateMouseHUD(this.spectrum.kempstonMouseX, this.spectrum.kempstonMouseY, curLeft, curRight, false);
        }
      };

      const handleMouseMovement = (e) => {
        const isLocked = document.pointerLockElement === speccyCanvas || document.pointerLockElement === monitorContainer;
        if (!isLocked) return;

        const dx = e.movementX || 0;
        const dy = e.movementY || 0;

        if (dx !== 0 || dy !== 0) {
          mouseAccumDx += dx;
          mouseAccumDy += dy;

          if (!mouseSendTimer) {
            mouseSendTimer = setTimeout(flushMouseDeltas, 25);
          }
        }
      };

      const handleMouseButton = (e, pressed) => {
        const isLocked = document.pointerLockElement === speccyCanvas || document.pointerLockElement === monitorContainer;
        if (!isLocked) return;

        this.spectrum.audio.unlock();
        curLeft = (e.buttons & 1) !== 0 || (pressed && e.button === 0);
        curRight = (e.buttons & 2) !== 0 || (pressed && e.button === 2);
        curMiddle = (e.buttons & 4) !== 0 || (pressed && e.button === 1);

        this.spectrum.updateKempstonMouseDelta(0, 0, curLeft, curRight, curMiddle);

        const mousePayload = {
          dx: 0,
          dy: 0,
          left: curLeft,
          right: curRight,
          middle: curMiddle,
          x: this.spectrum.kempstonMouseX,
          y: this.spectrum.kempstonMouseY
        };
        if (this.relay) this.relay.send('mouse', mousePayload);

        this.updateMouseHUD(this.spectrum.kempstonMouseX, this.spectrum.kempstonMouseY, curLeft, curRight, false);
      };

      window.addEventListener('mousemove', handleMouseMovement);
      window.addEventListener('mousedown', (e) => handleMouseButton(e, true));
      window.addEventListener('mouseup', (e) => handleMouseButton(e, false));
    }

    // Audio unlock and button/select un-focusing on click anywhere outside interactive inputs
    window.addEventListener('pointerdown', (e) => {
      this.spectrum.audio.unlock();
      if (e.target && !e.target.closest('select') && !e.target.closest('input') && !e.target.closest('textarea')) {
        setTimeout(() => {
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
          }
        }, 10);
      }
    });

    // Remote Peripheral Listeners (WebSocket relay between PC and Quest 3)
    const handleRemoteGamepad = (data) => {
      this.lastRemoteGamepadTime = Date.now();
      this.lastRemoteGamepadData = data;

      if (this.controllerManager) {
        this.controllerManager.applyRemoteGamepad(data, 'remote');
      }

      // Animate 3D Retro Joystick tilt on desk
      if (this.retroRoom && this.retroRoom.props && data.axes) {
        this.retroRoom.props.setJoystickTilt(data.axes[0] || 0, data.axes[1] || 0);
      }

      // Live HUD visual indicator on Quest 3 browser
      const gpStatusEl = document.getElementById('gamepad-status-text');
      if (gpStatusEl) {
        const name = data.name || 'PC Joypad';
        const inputs = [];
        if (data.directional?.left) inputs.push('◀');
        if (data.directional?.right) inputs.push('▶');
        if (data.directional?.up) inputs.push('▲');
        if (data.directional?.down) inputs.push('▼');
        if (data.fire) inputs.push('🔴FIRE');
        const inStr = inputs.length > 0 ? ` [${inputs.join(' ')}]` : '';
        gpStatusEl.innerHTML = `<span style="color:#00ff88; font-weight:700;">🎮 ${name}${inStr}</span>`;
      }

      // VR Bezel status LED and Spatial Menu updates
      if (this.screenRig && this.screenRig.setJoypadActive) {
        this.screenRig.setJoypadActive(true);
      }
      if (this.spatialMenu && !this.vrJoypadLabelUpdated) {
        this.spatialMenu.updateButtonText('toggleControllers', '🎮 Joypad: ON');
        this.vrJoypadLabelUpdated = true;
      }
    };

    const handleRemoteKeyboard = (data) => {
      this.lastRemoteKeyboardTime = Date.now();
      if (this.spectrum) {
        this.spectrum.audio.unlock();
        this.spectrum.handleKeyEvent(data.key, data.pressed, data.code);
        // Visually depress 3D Speccy +3 key on the desk
        if (data.pressed && this.retroRoom && this.retroRoom.spectrumPlus3) {
          this.retroRoom.spectrumPlus3.pressKey(data.key, false);
        }
      }
      const kbdStatusEl = document.getElementById('keyboard-status-text');
      if (kbdStatusEl) {
        if (data.pressed) {
          const label = data.key === ' ' ? 'SPACE' : (data.key || '').toUpperCase();
          kbdStatusEl.innerHTML = `<span style="color:#00ff88; font-weight:700;">⌨️ KBD: [${label}]</span>`;
        } else {
          setTimeout(() => {
            if (Date.now() - (this.lastRemoteKeyboardTime || 0) >= 300) {
              kbdStatusEl.innerHTML = `<span style="color:#38bdf8; font-weight:600;">⌨️ KBD: Ready</span>`;
            }
          }, 300);
        }
      }
    };

    const handleRemoteKeyboardClear = () => {
      if (this.spectrum) this.spectrum.clearAllKeys();
    };

    const handleRemoteMouse = (data) => {
      this.lastRemoteMouseTime = Date.now();
      if (this.spectrum) {
        this.spectrum.audio.unlock();
        this.spectrum.updateKempstonMouseDelta(data.dx, data.dy, data.left, data.right, data.middle);
      }
      this.updateMouseHUD(this.spectrum.kempstonMouseX, this.spectrum.kempstonMouseY, data.left, data.right, true);
    };

    const handleRemoteReset = () => {
      console.log('[RemoteRelay] Mirroring remote emulator reset');
      if (this.spectrum) this.spectrum.reset();
    };

    const handleRemoteControlMode = (data) => {
      console.log('[RemoteRelay] Mirroring control mode:', data.mode);
      this.controlMode = data.mode;
      if (this.controllerManager) this.controllerManager.controlMode = data.mode;
      const select = document.getElementById('select-control-mode');
      if (select) select.value = data.mode;
    };

    // Dedicated WebSocket Relay Handlers
    if (this.relay) {
      this.relay.on('gamepad', handleRemoteGamepad);
      this.relay.on('keyboard', handleRemoteKeyboard);
      this.relay.on('keyboard-clear', handleRemoteKeyboardClear);
      this.relay.on('mouse', handleRemoteMouse);
      this.relay.on('reset', handleRemoteReset);
      this.relay.on('control-mode', handleRemoteControlMode);

      const relayStatusEl = document.getElementById('relay-status-text');
      this.relay.onStatus(({ connected, peerCount, isVR }) => {
        if (relayStatusEl) {
          if (!connected) {
            relayStatusEl.innerHTML = `<strong style="color:#ff4444;">🔴 Reconnecting...</strong>`;
          } else if (peerCount > 0) {
            if (isVR) {
              relayStatusEl.innerHTML = `<strong style="color:#00ff88;">🟢 Linked to PC (Live Sync)</strong>`;
            } else {
              relayStatusEl.innerHTML = `<strong style="color:#00ff88;">🟢 Headset Linked (${peerCount} Peer)</strong>`;
            }
          } else {
            if (isVR) {
              relayStatusEl.innerHTML = `<strong style="color:#38bdf8;">🟢 Quest Ready (Waiting for PC)</strong>`;
            } else {
              relayStatusEl.innerHTML = `<strong style="color:#38bdf8;">🟢 PC Ready (Waiting for Quest 3)</strong>`;
            }
          }
        }
      });
    }
  }

  render(timestamp, frame) {
    this.frameCount++;

    // 0. Recenter / Auto-Calibrate Seated Desk Height once spatial tracking is established in XR
    if (frame && !this.initialRecenterDone && this.frameCount > 10) {
      const xrCam = this.renderer.xr.getCamera();
      const headPos = new THREE.Vector3();
      xrCam.getWorldPosition(headPos);
      if (headPos.y > 0.40) {
        if (this.xrManager && this.xrManager.currentMode !== 'room') {
          this.controllerManager.recenterScreen();
        } else if (this.retroRoom && this.retroRoom.autoCalibrateSeatedHeight) {
          this.retroRoom.autoCalibrateSeatedHeight(headPos.y);
        }
        this.initialRecenterDone = true;
      }
    }

    // 1. Emulate PAL frames at strict 50Hz decoupled from display refresh rate (72/90/120Hz)
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    let dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (dt > 0.08) dt = 0.08; // Cap dt to prevent spiral of death on background tabs
    this.accumulator = (this.accumulator || 0) + dt;

    const frameDuration = 0.020; // 50 Hz PAL frame
    let stepped = false;
    let steps = 0;
    // Cap accumulator backlog to 36ms (at most ~1.8 frames) to prevent batch-dropping alternate frames
    if (this.accumulator > 0.036) {
      this.accumulator = 0.036;
    }
    while (this.accumulator >= frameDuration && steps < 2) {
      if (this.useFuseNativeStream && window.__FUSE_NATIVE_BACKEND__) {
        this.pollFuseFramePal();
      } else {
        this.spectrum.stepFrame();
      }
      this.accumulator -= frameDuration;
      stepped = true;
      steps++;
    }

    if (stepped && !(this.useFuseNativeStream && window.__FUSE_NATIVE_BACKEND__)) {
      // 2. Update 2D canvas preview for webpage
      if (this.ctx2d && this.imageData2d) {
        this.imageData2d.data.set(this.spectrum.ula.frameBuffer);
        this.ctx2d.putImageData(this.imageData2d, 0, 0);
      }

      // 3. Update WebGL textures: base frame is always solid (zero cracks), pop-out is unified ink
      this.frameTexture.needsUpdate = true;
      if (this.screenRig.pop3DLevel > 0) {
        this.fgTexture.needsUpdate = true;
      }
    }

    // 4. Update floppy drive & tape activity indicators (3D LED + 2D Drive Bar + LEDs + Retro Room)
    const isPlus3Inserted = !!(this.spectrum.disk && this.spectrum.disk.isInserted);
    const isTrDosInserted = !!(this.spectrum.trDosDisk && this.spectrum.trDosDisk.inserted);
    const isDiskLoaded = isPlus3Inserted || isTrDosInserted;
    const isMotorOn = (isPlus3Inserted && this.spectrum.disk.motorOn) || (isTrDosInserted && this.spectrum.trDosDisk.motorOn);

    const isTapeLoaded = !!(this.spectrum.tape && this.spectrum.tape.isLoaded);
    const isTapePlaying = !!(this.spectrum.tape && this.spectrum.tape.playing);

    // Floppy LED & Track readout
    if (this.screenRig.diskLed) {
      this.screenRig.diskLed.material.color.setHex(isMotorOn ? 0x00ff44 : 0x004411);
    }
    if (this.driveLedEl) {
      this.driveLedEl.classList.toggle('active', isMotorOn);
    }
    if (this.driveTrackEl) {
      if (isPlus3Inserted) {
        this.driveTrackEl.textContent = (this.spectrum.disk.track || 0).toString().padStart(2, '0');
      } else if (isTrDosInserted) {
        this.driveTrackEl.textContent = (this.spectrum.trDosDisk.cylinder || 0).toString().padStart(2, '0');
      } else {
        this.driveTrackEl.textContent = '--';
      }
    }
    if (this.driveDiskNameEl) {
      if (isPlus3Inserted) {
        const dName = (this.spectrum.disk.currentDiskPath || '3" Floppy').split('/').pop();
        if (this.driveDiskNameEl.textContent !== dName) {
          this.driveDiskNameEl.textContent = dName;
          this.driveDiskNameEl.title = dName;
        }
      } else if (isTrDosInserted) {
        const dName = (this.spectrum.trDosDisk.currentDiskPath || 'TR-DOS Disk').split('/').pop();
        if (this.driveDiskNameEl.textContent !== dName) {
          this.driveDiskNameEl.textContent = dName;
          this.driveDiskNameEl.title = dName;
        }
      } else {
        if (this.driveDiskNameEl.textContent !== 'Empty / Insert Disk...') {
          this.driveDiskNameEl.textContent = 'Empty / Insert Disk...';
          this.driveDiskNameEl.title = 'Empty / Insert Disk...';
        }
      }
    }

    // Tape LED, Counter & Media Name
    if (this.tapeLedEl) {
      this.tapeLedEl.classList.toggle('active', isTapePlaying);
    }
    if (this.tapeCounterEl) {
      if (isTapeLoaded) {
        this.tapeCounterEl.textContent = (this.spectrum.tape.currentBlockIndex || 0).toString().padStart(3, '0');
      } else {
        this.tapeCounterEl.textContent = '000';
      }
    }
    if (this.tapeDiskNameEl) {
      if (isTapeLoaded) {
        const tName = (this.spectrum.tape.currentTapeName || 'Cassette Tape').split('/').pop();
        if (this.tapeDiskNameEl.textContent !== tName) {
          this.tapeDiskNameEl.textContent = tName;
          this.tapeDiskNameEl.title = tName;
        }
      } else {
        if (this.tapeDiskNameEl.textContent !== 'Empty / Ready') {
          this.tapeDiskNameEl.textContent = 'Empty / Ready';
          this.tapeDiskNameEl.title = 'Empty / Ready';
        }
      }
    }

    // Update 1980s Retro Room (+3 Drive LED, inserted 3" disk, dynamic CRT room glow)
    if (this.retroRoom) {
      this.retroRoom.update(isMotorOn, isDiskLoaded);
    }

    // 5. FPS update
    this.fpsCounter++;
    if (timestamp - this.lastFpsUpdate >= 1000) {
      if (this.fpsEl) this.fpsEl.textContent = `${this.fpsCounter} FPS`;
      this.fpsCounter = 0;
      this.lastFpsUpdate = timestamp;
    }

    // 6. Update controller interactions & Kempston thumbstick inputs
    this.controllerManager.update();

    // 6b. OrbitControls update for desktop / PC browser
    if (this.controls && !this.renderer.xr.isPresenting) {
      this.controls.update();
    }

    // 7. Render 3D scene (stereo in Quest 3, mono in browser)
    this.renderer.render(this.scene, this.camera);
  }

  // Robust 60Hz background gamepad polling - merges all connected wireless/USB controllers
  initPCGamepadPolling() {
    window.addEventListener('gamepadconnected', (e) => {
      console.log('[PC Gamepad] Connected:', e.gamepad.id);
      this.pollPCGamepad();
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('[PC Gamepad] Disconnected:', e.gamepad.id);
      this.pollPCGamepad();
    });

    this.gamepadPollTimer = setInterval(() => this.pollPCGamepad(), 16);
  }

  pollPCGamepad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const gps = navigator.getGamepads();
    if (!gps) return;

    const connectedPads = [];
    for (let i = 0; i < gps.length; i++) {
      const gp = gps[i];
      if (gp && gp.connected) {
        const id = (gp.id || '').toLowerCase();
        if (id.includes('oculus') || id.includes('meta quest') || id.includes('spatial') || gp.hand) {
          continue;
        }
        connectedPads.push(gp);
      }
    }

    const gpStatusEl = document.getElementById('gamepad-status-text');
    if (connectedPads.length > 0) {
      let mergedStickX = 0;
      let mergedStickY = 0;
      const mergedBtns = new Array(17).fill(false);
      let hatUp = false;
      let hatDown = false;
      let hatLeft = false;
      let hatRight = false;
      let activePadName = null;

      for (const gp of connectedPads) {
        const rawName = gp.id || 'Wireless Controller';
        const cleanName = rawName.split('(')[0].trim() || 'Wireless Controller';
        if (!activePadName) activePadName = cleanName;

        let padHasInput = false;

        // Check analog sticks & D-pad axes across indices 0..7 (Left stick, Right stick, DirectInput D-pad)
        const xCandidates = [gp.axes[0] || 0, gp.axes[2] || 0, gp.axes[4] || 0, gp.axes[6] || 0];
        const yCandidates = [gp.axes[1] || 0, gp.axes[3] || 0, gp.axes[5] || 0, gp.axes[7] || 0];

        for (const ax of xCandidates) {
          if (Math.abs(ax) > 0.25 && Math.abs(ax) > Math.abs(mergedStickX)) {
            mergedStickX = ax;
            padHasInput = true;
          }
        }
        for (const ay of yCandidates) {
          if (Math.abs(ay) > 0.25 && Math.abs(ay) > Math.abs(mergedStickY)) {
            mergedStickY = ay;
            padHasInput = true;
          }
        }

        // Check DirectInput POV Hat switch on axes[9] (used by many Bluetooth wireless controllers on Windows)
        if (gp.mapping !== 'standard' && gp.axes && gp.axes.length >= 10) {
          const hat = gp.axes[9];
          // Hat values in [-1.0, +1.0] encode 8 directions; neutral is > 1.05 (typically ~3.2857)
          if (typeof hat === 'number' && hat >= -1.05 && hat <= 1.05 && hat !== 0) {
            padHasInput = true;
            // Compass: -1.0=U, -0.714=UR, -0.428=R, -0.143=DR, +0.143=D, +0.428=DL, +0.714=L, +1.0=UL
            if (hat <= -0.60 || hat >= 0.90) hatUp = true;
            if (hat >= -0.80 && hat <= -0.05) hatRight = true;
            if (hat >= -0.25 && hat <= 0.55) hatDown = true;
            if (hat >= 0.35 && hat <= 1.05) hatLeft = true;
          }
        }

        // Merge buttons (supporting both digital .pressed and analog trigger .value > 0.35)
        if (gp.buttons) {
          for (let b = 0; b < Math.min(gp.buttons.length, 17); b++) {
            const btn = gp.buttons[b];
            const isPressed = typeof btn === 'object' ? (btn.pressed || btn.value > 0.35) : !!btn;
            if (isPressed) {
              mergedBtns[b] = true;
              padHasInput = true;
            }
          }
        }

        if (padHasInput) {
          activePadName = cleanName;
          this.lastActivePadName = cleanName;
        }
      }

      const name = this.lastActivePadName || activePadName || 'Wireless Controller';

      // Direction detection (D-pad buttons 12-15, POV Hat, or analog sticks)
      const dpadUp    = !!mergedBtns[12] || hatUp    || mergedStickY < -0.35;
      const dpadDown  = !!mergedBtns[13] || hatDown  || mergedStickY > 0.35;
      const dpadLeft  = !!mergedBtns[14] || hatLeft  || mergedStickX < -0.35;
      const dpadRight = !!mergedBtns[15] || hatRight || mergedStickX > 0.35;

      // Primary Fire buttons: A (0), B (1), X (2), RB (5), RT (7)
      const fire = !!(mergedBtns[0] || mergedBtns[1] || mergedBtns[2] || mergedBtns[5] || mergedBtns[7]);
      const anyActionBtn = !!(fire || mergedBtns[3] || mergedBtns[4] || mergedBtns[6] || mergedBtns[8] || mergedBtns[9]);

      const btnStart = !!mergedBtns[9];
      const btnSelect = !!mergedBtns[8];

      const state = {
        name: name,
        axes: [mergedStickX, mergedStickY],
        buttons: mergedBtns,
        directional: { up: dpadUp, down: dpadDown, left: dpadLeft, right: dpadRight },
        fire: fire
      };

      // Apply locally on PC via ControllerManager ('gamepad' source slot so it never overwrites keyboard)
      if (this.controllerManager) {
        this.controllerManager.applyRemoteGamepad(state, 'gamepad');
      }

      // Animate 3D Retro Joystick tilt on desk
      if (this.retroRoom && this.retroRoom.props) {
        const tiltX = dpadRight ? 1 : (dpadLeft ? -1 : mergedStickX);
        const tiltY = dpadDown ? 1 : (dpadUp ? -1 : mergedStickY);
        this.retroRoom.props.setJoystickTilt(tiltX, tiltY);
      }

      // Only stream across WebSocket when state changes or on heartbeat (every 500ms)
      const now = Date.now();
      const last = this.lastSentGamepadState;
      const hasChanged = !last ||
        fire !== last.fire ||
        dpadUp !== last.dpadUp ||
        dpadDown !== last.dpadDown ||
        dpadLeft !== last.dpadLeft ||
        dpadRight !== last.dpadRight ||
        btnStart !== last.btnStart ||
        btnSelect !== last.btnSelect ||
        Math.abs(mergedStickX - last.stickX) > 0.04 ||
        Math.abs(mergedStickY - last.stickY) > 0.04;

      const isHeartbeat = (now - (this.lastGamepadSentTime || 0)) > 500;

      if (hasChanged || isHeartbeat) {
        if (this.relay) this.relay.send('gamepad', state);
        this.lastGamepadSentTime = now;
        this.lastSentGamepadState = {
          fire,
          dpadUp,
          dpadDown,
          dpadLeft,
          dpadRight,
          btnStart,
          btnSelect,
          stickX: mergedStickX,
          stickY: mergedStickY
        };
      }

      // Live HUD indicator
      if (gpStatusEl && (this.frameCount % 15 === 0 || hasChanged || anyActionBtn || dpadUp || dpadDown || dpadLeft || dpadRight)) {
        const inputs = [];
        if (dpadLeft) inputs.push('◀');
        if (dpadRight) inputs.push('▶');
        if (dpadUp) inputs.push('▲');
        if (dpadDown) inputs.push('▼');
        if (fire) inputs.push('🔴FIRE');
        if (mergedBtns[3]) inputs.push('1');
        if (mergedBtns[4]) inputs.push('2');
        if (mergedBtns[6]) inputs.push('3');
        if (btnStart) inputs.push('ENTER');
        const inStr = inputs.length > 0 ? ` [${inputs.join(' ')}]` : '';
        const shortName = name.length > 18 ? name.slice(0, 18) + '…' : name;
        gpStatusEl.innerHTML = `<span style="color:#00ff88; font-weight:700;">🎮 ${shortName}${inStr}</span>`;
      }
    } else {
      // Clear local gamepad Kempston source if all controllers disconnected
      if (this.spectrum) {
        this.spectrum.setKempston(false, false, false, false, false, 'gamepad');
      }
      // Check if this device is receiving remote gamepad streaming from PC!
      const isRemoteActive = (Date.now() - (this.lastRemoteGamepadTime || 0)) < 2500;
      if (isRemoteActive) {
        if (gpStatusEl && (this.frameCount % 20 === 0)) {
          const rData = this.lastRemoteGamepadData;
          const rName = (rData && rData.name) || 'PC Joypad';
          const inputs = [];
          if (rData?.directional?.left) inputs.push('◀');
          if (rData?.directional?.right) inputs.push('▶');
          if (rData?.directional?.up) inputs.push('▲');
          if (rData?.directional?.down) inputs.push('▼');
          if (rData?.fire) inputs.push('🔴FIRE');
          const inStr = inputs.length > 0 ? ` [${inputs.join(' ')}]` : '';
          gpStatusEl.innerHTML = `<span style="color:#00ff88; font-weight:700;">🎮 ${rName}${inStr}</span>`;
        }
      } else {
        if (gpStatusEl && this.frameCount % 45 === 0) {
          gpStatusEl.innerHTML = `<span style="color:#94a3b8;" title="Press any button on your wireless controller to wake Gamepad API">🎮 Pad: Press Button</span>`;
        }
        if (this.screenRig && this.screenRig.setJoypadActive && this.frameCount % 60 === 0) {
          this.screenRig.setJoypadActive(false);
        }
      }
    }
  }

  updateMouseHUD(x, y, left, right, isRemote = false) {
    const mouseStatusEl = document.getElementById('mouse-status-text');
    if (!mouseStatusEl) return;
    const clicks = [];
    if (left) clicks.push('L-CLICK');
    if (right) clicks.push('R-CLICK');
    const cStr = clicks.length > 0 ? ` [${clicks.join('+')}]` : '';
    const srcStr = isRemote ? 'via PC' : 'Local';
    mouseStatusEl.innerHTML = `<span style="color:#00ff88; font-weight:700; font-variant-numeric:tabular-nums;">🟢 Active (${srcStr}): (${x}, ${y})${cStr}</span>`;
  }
  destroy() {
    console.log('[ZXSpectrumXR] Destroying existing app instance before reload...');
    if (this.gamepadPollTimer) {
      clearInterval(this.gamepadPollTimer);
      this.gamepadPollTimer = null;
    }
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }
    if (this.relay) {
      this.relay.close();
      this.relay = null;
    }
    if (this.spectrum && this.spectrum.audio && this.spectrum.audio.audioCtx) {
      this.spectrum.audio.audioCtx.close().catch(() => {});
    }
  }
}

// Cleanly tear down any existing App instance before creating a new one (prevents duplicate loops & resets)
if (window.__speccyApp && typeof window.__speccyApp.destroy === 'function') {
  window.__speccyApp.destroy();
}
window.__speccyApp = new App();

