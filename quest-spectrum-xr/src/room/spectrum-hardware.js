/**
 * Authentic 3D Hardware Models for Sinclair ZX Spectrum XR
 * Houses realistic 3D representations of:
 * 1. ZX Spectrum 48K "Rubber Key" (1982 Iconic compact matte-black wedge with grey rubber keys & rainbow flash)
 * 2. ZX Spectrum +2 (1986 Amstrad Grey chassis with built-in Datacorder cassette deck & mechanical piano keys)
 * 3. ZX Spectrum +3 (1987 Black chassis with built-in 3-inch CF2 compact floppy drive & emerald activity LED)
 * 4. ZX Spectrum 128K "Toastrack" (1985 Black chassis with iconic massive silver cast-metal heatsink)
 */
import * as THREE from 'three';
import { SpectrumPlus3Model } from './spectrum-plus3.js';

export class SpectrumHardwareManager {
  constructor(spectrum, options = {}) {
    this.spectrum = spectrum;
    this.group = new THREE.Group();
    this.group.name = 'SpectrumHardwareCollection';

    this.currentModelKey = 'SpectrumPlus3';
    this.interactiveObjects = [];

    // Create the models
    this.initModels();
  }

  initModels() {
    // 1. ZX Spectrum +3 (Black with Floppy Drive)
    this.plus3 = new SpectrumPlus3Model(this.spectrum);
    this.group.add(this.plus3.group);

    // 2. ZX Spectrum 48K "Rubber Key"
    this.rubber48 = this.create48KModel();
    this.rubber48.visible = false;
    this.group.add(this.rubber48);

    // 3. ZX Spectrum +2 (Grey with Datacorder)
    this.plus2 = this.createPlus2Model();
    this.plus2.visible = false;
    this.group.add(this.plus2);

    // 4. ZX Spectrum 128K "Toastrack" (Black with Heatsink)
    this.toastrack128 = this.createToastrackModel();
    this.toastrack128.visible = false;
    this.group.add(this.toastrack128);

    // Default to +3 initially
    this.activeModel = this.plus3;
    this.rebuildInteractiveObjects();
  }

  /**
   * 1. Authentic Sinclair ZX Spectrum 48K "Rubber Key" (1982)
   */
  create48KModel() {
    const group = new THREE.Group();
    group.name = 'Spectrum48K_RubberKey';

    const w = 0.235; // 23.5 cm
    const d = 0.145; // 14.5 cm
    const hBack = 0.032; // 3.2 cm
    const hFront = 0.016; // 1.6 cm

    // Matte black plastic chassis
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x111215,
      roughness: 0.85,
      metalness: 0.10
    });

    const chassisGeo = this.createWedgeGeometry(w, d, hBack, hFront);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // Brushed metal keyboard faceplate
    const plateGeo = new THREE.PlaneGeometry(w * 0.92, d * 0.72);
    plateGeo.rotateX(-Math.PI / 2 + 0.11);
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 512;
    plateCanvas.height = 340;
    const pctx = plateCanvas.getContext('2d');

    // Dark charcoal brushed aluminum texture
    pctx.fillStyle = '#1c1e24';
    pctx.fillRect(0, 0, 512, 340);
    pctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 60; i++) {
      pctx.fillRect(0, Math.random() * 340, 512, 2);
    }

    // Top Header: "sinclair" (red lowercase script) & "ZX Spectrum" (white sans-serif)
    pctx.fillStyle = '#e11d48';
    pctx.font = 'bold italic 22px Arial, sans-serif';
    pctx.fillText('sinclair', 28, 34);

    pctx.fillStyle = '#f8fafc';
    pctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
    pctx.fillText('ZX Spectrum', 105, 34);

    // Iconic 4-Color Rainbow Flash on bottom right of faceplate
    const stripeW = 10;
    const stripeColors = ['#cd0000', '#cdcd00', '#00cd00', '#00cdcd'];
    stripeColors.forEach((col, idx) => {
      pctx.fillStyle = col;
      pctx.beginPath();
      pctx.moveTo(430 + (idx * stripeW), 270);
      pctx.lineTo(460 + (idx * stripeW), 340);
      pctx.lineTo(450 + (idx * stripeW), 340);
      pctx.lineTo(420 + (idx * stripeW), 270);
      pctx.fill();
    });

    const plateTex = new THREE.CanvasTexture(plateCanvas);
    const plateMat = new THREE.MeshStandardMaterial({
      map: plateTex,
      roughness: 0.65,
      metalness: 0.35
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0.021, 0.005);
    group.add(plate);

    // 40 Characteristic Rounded Grey Rubber Keycaps ("Dead Flesh" keys)
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Soft slate grey rubber
      roughness: 0.95,
      metalness: 0.02
    });

    const keyRows = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'ENTER'],
      ['CAPS', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'SYM', 'SPACE']
    ];

    const keyW = 0.015;
    const keyD = 0.011;
    const keyH = 0.007;
    const spacingX = 0.019;
    const spacingZ = 0.019;

    keyRows.forEach((row, rIdx) => {
      const zPos = -0.025 + (rIdx * spacingZ);
      const rowY = 0.025 - (rIdx * 0.0022);

      row.forEach((key, cIdx) => {
        const xPos = -0.086 + (cIdx * spacingX);
        const kGeo = new THREE.BoxGeometry(keyW, keyH, keyD);
        const kMesh = new THREE.Mesh(kGeo, rubberMat);
        kMesh.position.set(xPos, rowY, zPos);
        kMesh.rotation.x = 0.11; // Matches sloped faceplate

        kMesh.userData = {
          isSpeccyKey: true,
          keyId: key.toLowerCase(),
          tooltip: `48K Key: ${key}`
        };

        group.add(kMesh);
        if (!group.userData.interactiveKeys) group.userData.interactiveKeys = [];
        group.userData.interactiveKeys.push(kMesh);
      });
    });

    // Rear 9-Pin and 3.5mm Ear/Mic Sockets
    const rearSocketMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.8 });
    const earGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.003, 12);
    earGeo.rotateX(Math.PI / 2);
    const earSocket = new THREE.Mesh(earGeo, rearSocketMat);
    earSocket.position.set(-0.06, 0.016, -d / 2);
    group.add(earSocket);

    const micSocket = new THREE.Mesh(earGeo, rearSocketMat);
    micSocket.position.set(-0.04, 0.016, -d / 2);
    group.add(micSocket);

    group.position.set(-0.04, 0, -0.72);
    group.userData.type = 'Spectrum48K';
    return group;
  }

  /**
   * 2. Authentic Sinclair ZX Spectrum +2 (1986 Grey with Datacorder Cassette Deck)
   */
  createPlus2Model() {
    const group = new THREE.Group();
    group.name = 'SpectrumPlus2_Datacorder';

    const w = 0.44;
    const d = 0.19;
    const hBack = 0.045;
    const hFront = 0.022;

    // Classic 1986 Amstrad Mid-Grey Plastic Body
    const greyMat = new THREE.MeshStandardMaterial({
      color: 0x4b505a, // Vintage Amstrad Grey
      roughness: 0.72,
      metalness: 0.15
    });

    const chassisGeo = this.createWedgeGeometry(w, d, hBack, hFront);
    const chassis = new THREE.Mesh(chassisGeo, greyMat);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // Right-Hand Built-in Datacorder Cassette Deck
    const deckW = 0.115;
    const deckD = 0.165;
    const deckX = (w / 2) - (deckW / 2) - 0.012;

    // Recessed Cassette Deck Bay
    const bayGeo = new THREE.BoxGeometry(deckW, 0.034, deckD);
    const bayMat = new THREE.MeshStandardMaterial({ color: 0x22252c, roughness: 0.65 });
    const bay = new THREE.Mesh(bayGeo, bayMat);
    bay.position.set(deckX, 0.020, 0.005);
    group.add(bay);

    // Transparent Smoked Acrylic Cassette Door Lid
    const lidGeo = new THREE.BoxGeometry(deckW * 0.88, 0.004, deckD * 0.58);
    const lidMat = new THREE.MeshPhysicalMaterial({
      color: 0x181a20,
      transmission: 0.70,
      opacity: 0.85,
      transparent: true,
      roughness: 0.25,
      ior: 1.48
    });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.set(deckX, 0.036, -0.012);
    group.add(lid);

    // Two toothed tape drive spools visible beneath the smoked lid
    const spoolGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.008, 12);
    const spoolMat = new THREE.MeshStandardMaterial({ color: 0xededed, roughness: 0.4 });
    const spool1 = new THREE.Mesh(spoolGeo, spoolMat);
    spool1.position.set(deckX - 0.020, 0.028, -0.012);
    group.add(spool1);

    const spool2 = new THREE.Mesh(spoolGeo, spoolMat);
    spool2.position.set(deckX + 0.020, 0.028, -0.012);
    group.add(spool2);

    // Mechanical Piano Control Keys: REC, PLAY, REW, FF, STOP/EJECT, PAUSE
    const btnLabels = [
      { name: 'REC', col: 0xef4444 }, // Red Record button!
      { name: 'PLAY', col: 0x334155 },
      { name: 'REW', col: 0x334155 },
      { name: 'F.FWD', col: 0x334155 },
      { name: 'STOP', col: 0x334155 },
      { name: 'PAUSE', col: 0x334155 }
    ];

    const keyW = 0.013;
    const keyD = 0.024;
    const keyH = 0.010;

    btnLabels.forEach((btn, idx) => {
      const bGeo = new THREE.BoxGeometry(keyW, keyH, keyD);
      const bMat = new THREE.MeshStandardMaterial({ color: btn.col, roughness: 0.5 });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(deckX - 0.038 + (idx * 0.015), 0.018, 0.062);

      bMesh.userData = {
        isInteractive: true,
        action: btn.name === 'PLAY' ? 'loadTape' : 'clickTapeBtn',
        tooltip: `Datacorder: ${btn.name}`
      };

      group.add(bMesh);
      if (!group.userData.interactiveKeys) group.userData.interactiveKeys = [];
      group.userData.interactiveKeys.push(bMesh);
    });

    // Red "+2" Script Logo Badge
    const badgeGeo = new THREE.PlaneGeometry(0.040, 0.018);
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 128;
    bCanvas.height = 64;
    const bctx = bCanvas.getContext('2d');
    bctx.fillStyle = '#dc2626';
    bctx.font = '900 38px Arial, sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText('+2', 64, 48);
    const bTex = new THREE.CanvasTexture(bCanvas);
    const bMat = new THREE.MeshBasicMaterial({ map: bTex, transparent: true });
    const bMesh = new THREE.Mesh(badgeGeo, bMat);
    bMesh.position.set(deckX, 0.037, -0.068);
    bMesh.rotation.x = -Math.PI / 2 + 0.12;
    group.add(bMesh);

    // Keyboard section: Dark typewriter keys
    this.addTypewriterKeyboard(group, -0.075);

    group.position.set(-0.04, 0, -0.72);
    group.userData.type = 'SpectrumPlus2';
    return group;
  }

  /**
   * 3. Authentic Sinclair ZX Spectrum 128K "Toastrack" (1985)
   */
  createToastrackModel() {
    const group = new THREE.Group();
    group.name = 'Spectrum128K_Toastrack';

    const w = 0.38;
    const d = 0.18;
    const hBack = 0.042;
    const hFront = 0.020;

    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x141518,
      roughness: 0.8,
      metalness: 0.12
    });

    const chassisGeo = this.createWedgeGeometry(w, d, hBack, hFront);
    const chassis = new THREE.Mesh(chassisGeo, blackMat);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // The Famous Cast-Metal Silver Cooling Heatsink ("Toastrack") on the right flank!
    const finGroup = new THREE.Group();
    finGroup.name = 'ToastrackHeatsink';
    const finMat = new THREE.MeshStandardMaterial({
      color: 0xc4cbd4, // Cast aluminum silver
      metalness: 0.90,
      roughness: 0.30
    });

    // 12 vertical heatsink fins
    const finCount = 12;
    const finDepth = 0.15;
    const finThickness = 0.0025;
    const finH = 0.035;

    for (let f = 0; f < finCount; f++) {
      const finGeo = new THREE.BoxGeometry(finThickness, finH, finDepth);
      const finMesh = new THREE.Mesh(finGeo, finMat);
      finMesh.position.set((w / 2) + 0.003 + (f * 0.004), 0.022, 0);
      finGroup.add(finMesh);
    }
    group.add(finGroup);

    // Bold Red "128K" Badge
    const badgeGeo = new THREE.PlaneGeometry(0.042, 0.018);
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 128;
    bCanvas.height = 64;
    const bctx = bCanvas.getContext('2d');
    bctx.fillStyle = '#dc2626';
    bctx.font = '900 34px Arial, sans-serif';
    bctx.textAlign = 'center';
    bctx.fillText('128K', 64, 46);
    const bTex = new THREE.CanvasTexture(bCanvas);
    const bMat = new THREE.MeshBasicMaterial({ map: bTex, transparent: true });
    const bMesh = new THREE.Mesh(badgeGeo, bMat);
    bMesh.position.set(0.12, 0.036, -0.062);
    bMesh.rotation.x = -Math.PI / 2 + 0.12;
    group.add(bMesh);

    // Typewriter Keyboard
    this.addTypewriterKeyboard(group, -0.03);

    group.position.set(-0.04, 0, -0.72);
    group.userData.type = 'Spectrum128K';
    return group;
  }

  addTypewriterKeyboard(parentGroup, xCenter = 0) {
    const keyMat = new THREE.MeshStandardMaterial({
      color: 0x1f232b,
      roughness: 0.65,
      metalness: 0.2
    });

    const keyRows = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'ENTER'],
      ['CAPS', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'SYM', 'SPACE']
    ];

    const keyW = 0.016;
    const keyD = 0.014;
    const keyH = 0.008;
    const spacingX = 0.021;
    const spacingZ = 0.021;

    keyRows.forEach((row, rIdx) => {
      const zPos = -0.032 + (rIdx * spacingZ);
      const rowY = 0.030 - (rIdx * 0.0025);

      row.forEach((key, cIdx) => {
        const xPos = xCenter - 0.095 + (cIdx * spacingX);
        const kGeo = new THREE.BoxGeometry(keyW, keyH, keyD);
        const kMesh = new THREE.Mesh(kGeo, keyMat);
        kMesh.position.set(xPos, rowY, zPos);
        kMesh.rotation.x = 0.12;

        kMesh.userData = {
          isSpeccyKey: true,
          keyId: key.toLowerCase(),
          tooltip: `Key: ${key}`
        };

        parentGroup.add(kMesh);
        if (!parentGroup.userData.interactiveKeys) parentGroup.userData.interactiveKeys = [];
        parentGroup.userData.interactiveKeys.push(kMesh);
      });
    });
  }

  createWedgeGeometry(w, d, hBack, hFront) {
    const shape = new THREE.Shape();
    shape.moveTo(-d / 2, 0);
    shape.lineTo(d / 2, 0);
    shape.lineTo(d / 2, hFront);
    shape.lineTo(-d / 2, hBack);
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: w,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 3
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geo.rotateY(Math.PI / 2);
    return geo;
  }

  /**
   * Switches the active 3D Spectrum on the desk to match the loaded model
   */
  setModel(model) {
    this.currentModelKey = model;

    // Hide all
    this.plus3.group.visible = false;
    this.rubber48.visible = false;
    this.plus2.visible = false;
    this.toastrack128.visible = false;

    if (model === 'Spectrum48K') {
      this.rubber48.visible = true;
      this.activeModel = this.rubber48;
      console.log('[SpectrumHardware] Desk computer switched to: ZX Spectrum 48K (Rubber Key)');
    } else if (model === 'SpectrumPlus2') {
      this.plus2.visible = true;
      this.activeModel = this.plus2;
      console.log('[SpectrumHardware] Desk computer switched to: ZX Spectrum +2 (Grey Datacorder)');
    } else if (model === 'Spectrum128K' || model === 'Pentagon128') {
      this.toastrack128.visible = true;
      this.activeModel = this.toastrack128;
      console.log('[SpectrumHardware] Desk computer switched to: ZX Spectrum 128K (Toastrack Heatsink)');
    } else {
      // Default to +3 Floppy Model
      this.plus3.group.visible = true;
      this.activeModel = this.plus3;
      console.log('[SpectrumHardware] Desk computer switched to: ZX Spectrum +3 (Floppy Drive)');
    }

    this.rebuildInteractiveObjects();
  }

  rebuildInteractiveObjects() {
    this.interactiveObjects = [];

    if (this.plus3.group.visible) {
      this.interactiveObjects.push(...this.plus3.interactiveObjects);
    }
    if (this.rubber48.visible && this.rubber48.userData.interactiveKeys) {
      this.interactiveObjects.push(...this.rubber48.userData.interactiveKeys);
    }
    if (this.plus2.visible && this.plus2.userData.interactiveKeys) {
      this.interactiveObjects.push(...this.plus2.userData.interactiveKeys);
    }
    if (this.toastrack128.visible && this.toastrack128.userData.interactiveKeys) {
      this.interactiveObjects.push(...this.toastrack128.userData.interactiveKeys);
    }
  }

  pressKey(keyId, forwardToEmulator = true) {
    if (this.plus3.group.visible) {
      this.plus3.pressKey(keyId, forwardToEmulator);
    } else if (forwardToEmulator) {
      this.spectrum.handleKeyEvent(keyId, true);
      setTimeout(() => this.spectrum.handleKeyEvent(keyId, false), 120);
    }
  }

  update(isMotorActive, isDiskLoaded) {
    if (this.plus3.group.visible) {
      this.plus3.update(isMotorActive, isDiskLoaded);
    }
  }

  // Drive slot reference for disk insertion
  get driveSlot() {
    return this.plus3.driveSlot;
  }
}
