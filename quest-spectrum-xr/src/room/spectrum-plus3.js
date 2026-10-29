/**
 * Sinclair ZX Spectrum +3 3D Computer Model
 * Authentic recreation of the iconic British 8-bit microcomputer
 * Features:
 * - Sleek black wedge case with ventilation ribs
 * - Built-in 3-inch Compact Floppy Disk drive on the right side with eject button
 * - Green disk activity LED synchronized with floppy motor
 * - Interactive typewriter keyboard with physical 3D key depression
 * - Visible inserted 3" disk when a game is loaded
 * - Authentic Sinclair rainbow flash badge
 */
import * as THREE from 'three';

export class SpectrumPlus3Model {
  constructor(spectrum, options = {}) {
    this.spectrum = spectrum;
    this.group = new THREE.Group();
    this.group.name = 'SpectrumPlus3';

    this.interactiveObjects = [];
    this.keyMeshes = new Map(); // keyId -> mesh
    this.activeDiskMesh = null;

    // +3 Physical Dimensions (approx 44cm wide x 18cm deep x 4.5cm high)
    this.width = 0.44;
    this.depth = 0.19;
    this.height = 0.045;

    this.initModel();
  }

  initModel() {
    // 1. Materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x141518,
      roughness: 0.75,
      metalness: 0.15
    });

    const ventMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b0d,
      roughness: 0.9
    });

    const driveFasciaMat = new THREE.MeshStandardMaterial({
      color: 0x1a1c22,
      roughness: 0.65,
      metalness: 0.25
    });

    // 2. Main Wedge Chassis (sloped from 4.5cm at rear to 2.2cm at front)
    // Custom wedge geometry
    const chassisGeo = this.createWedgeGeometry(this.width, this.depth, this.height, 0.022);
    this.chassisMesh = new THREE.Mesh(chassisGeo, bodyMat);
    this.chassisMesh.castShadow = true;
    this.chassisMesh.receiveShadow = true;
    this.group.add(this.chassisMesh);

    // 3. Left-Side Cooling Ribs / Louvers
    const ventGroup = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const ribGeo = new THREE.BoxGeometry(0.003, 0.024, 0.12);
      const rib = new THREE.Mesh(ribGeo, ventMat);
      rib.position.set(-this.width / 2 + 0.005 + (i * 0.006), 0.022, 0);
      ventGroup.add(rib);
    }
    this.group.add(ventGroup);

    // 4. Built-in 3-Inch Compact Floppy Disk Drive (Right side of case)
    const driveWidth = 0.095;
    const driveDepth = 0.165;
    const driveX = (this.width / 2) - (driveWidth / 2) - 0.012;

    // Recessed drive fascia plate
    const driveFasciaGeo = new THREE.BoxGeometry(driveWidth, 0.032, driveDepth);
    const driveFascia = new THREE.Mesh(driveFasciaGeo, driveFasciaMat);
    driveFascia.position.set(driveX, 0.020, 0.005);
    this.group.add(driveFascia);

    // Drive Slot (the horizontal aperture where 3-inch CF2 disks enter)
    const slotGeo = new THREE.BoxGeometry(0.078, 0.007, 0.015);
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x020202 });
    this.driveSlot = new THREE.Mesh(slotGeo, slotMat);
    this.driveSlot.position.set(driveX, 0.022, 0.078);
    this.driveSlot.userData = {
      isDriveSlot: true,
      action: 'insertDisk',
      tooltip: '3-Inch Compact Floppy Drive Slot'
    };
    this.group.add(this.driveSlot);
    this.interactiveObjects.push(this.driveSlot);

    // Metal Drive Dust Flap with engraved lettering
    const flapGeo = new THREE.BoxGeometry(0.076, 0.005, 0.003);
    const flapCanvas = document.createElement('canvas');
    flapCanvas.width = 256;
    flapCanvas.height = 32;
    const flapCtx = flapCanvas.getContext('2d');
    flapCtx.fillStyle = '#8a909d';
    flapCtx.fillRect(0, 0, 256, 32);
    flapCtx.fillStyle = '#222630';
    flapCtx.font = 'bold 11px monospace';
    flapCtx.textAlign = 'center';
    flapCtx.fillText('3-INCH COMPACT FLOPPY DISK', 128, 20);
    const flapTex = new THREE.CanvasTexture(flapCanvas);
    const flapMat = new THREE.MeshStandardMaterial({
      map: flapTex,
      metalness: 0.85,
      roughness: 0.25
    });
    const flap = new THREE.Mesh(flapGeo, flapMat);
    flap.position.set(driveX, 0.022, 0.084);
    this.group.add(flap);

    // Drive Eject Push Button with red marker
    const ejectGeo = new THREE.BoxGeometry(0.016, 0.012, 0.008);
    const ejectMat = new THREE.MeshStandardMaterial({ color: 0x2b2e38, roughness: 0.45 });
    this.ejectBtn = new THREE.Mesh(ejectGeo, ejectMat);
    this.ejectBtn.position.set(driveX + 0.032, 0.009, 0.084);
    // Red indicator strip on eject button
    const ejectIndGeo = new THREE.BoxGeometry(0.004, 0.008, 0.001);
    const ejectIndMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const ejectInd = new THREE.Mesh(ejectIndGeo, ejectIndMat);
    ejectInd.position.set(0, 0, 0.0045);
    this.ejectBtn.add(ejectInd);

    this.ejectBtn.userData = {
      isInteractive: true,
      action: 'ejectDisk',
      tooltip: 'Eject 3" Disk'
    };
    this.group.add(this.ejectBtn);
    this.interactiveObjects.push(this.ejectBtn);

    // Floppy Drive Activity LED (Translucent emerald lens + synchronized point light)
    const ledGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.004, 12);
    ledGeo.rotateX(Math.PI / 2);
    this.diskLedMat = new THREE.MeshBasicMaterial({ color: 0x004411 }); // Off by default (dark green)
    this.diskLed = new THREE.Mesh(ledGeo, this.diskLedMat);
    this.diskLed.position.set(driveX - 0.028, 0.031, 0.084);
    this.group.add(this.diskLed);

    // Real dynamic point light casting emerald green glow onto the desk during disk read!
    this.driveLedLight = new THREE.PointLight(0x00ff44, 0, 0.35);
    this.driveLedLight.position.set(driveX - 0.028, 0.035, 0.090);
    this.group.add(this.driveLedLight);

    // Left-Side Recessed Reset Push-Button (Clickable!)
    const resetHoleGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.008, 16);
    resetHoleGeo.rotateZ(Math.PI / 2);
    const resetHoleMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const resetHole = new THREE.Mesh(resetHoleGeo, resetHoleMat);
    resetHole.position.set(-this.width / 2 + 0.002, 0.020, -0.02);
    this.group.add(resetHole);

    const resetBtnGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.006, 16);
    resetBtnGeo.rotateZ(Math.PI / 2);
    const resetBtnMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const resetBtn = new THREE.Mesh(resetBtnGeo, resetBtnMat);
    resetBtn.position.set(-this.width / 2 + 0.001, 0.020, -0.02);
    resetBtn.userData = {
      isInteractive: true,
      action: 'resetEmu',
      tooltip: 'Hardware Reset (+3)'
    };
    this.group.add(resetBtn);
    this.interactiveObjects.push(resetBtn);

    // Rear I/O Ports Panel (Power, RGB Peripherals, Serial RS232, Aux, Expansion Bus)
    this.createRearPorts();

    // 5. Sinclair Branding & Rainbow Flash Badge
    this.createBrandingBadge(driveX);

    // 6. 3D Depressible Keyboard Layout (Main QWERTY + Numeric Keypad)
    this.createKeyboardLayout();

    // 7. Inserted 3" Floppy Disk (Initially hidden until a game is loaded)
    this.createInsertedDiskMesh(driveX);
  }

  createRearPorts() {
    const rearGroup = new THREE.Group();
    rearGroup.position.set(0, 0.024, -this.depth / 2 - 0.002);

    // Port sockets
    const socketMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.8 });
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2 });

    // Edge connector slot (Expansion Bus)
    const edgeGeo = new THREE.BoxGeometry(0.12, 0.008, 0.005);
    const edge = new THREE.Mesh(edgeGeo, socketMat);
    edge.position.set(-0.10, 0, 0);
    rearGroup.add(edge);

    // 3 round DIN connectors (RGB, Power, RS232)
    for (let p = 0; p < 3; p++) {
      const dinGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.004, 16);
      dinGeo.rotateX(Math.PI / 2);
      const din = new THREE.Mesh(dinGeo, socketMat);
      din.position.set(0.04 + (p * 0.035), 0, 0);
      rearGroup.add(din);

      // Gold pins inside DIN
      const pinGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.005, 8);
      pinGeo.rotateX(Math.PI / 2);
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(0.04 + (p * 0.035), 0, 0.001);
      rearGroup.add(pin);
    }

    this.group.add(rearGroup);
  }

  createWedgeGeometry(w, d, hBack, hFront) {
    // Custom wedge shape for retro microcomputer
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
    geo.translate(0, 0, 0);
    return geo;
  }

  createBrandingBadge(driveX) {
    const badgeGroup = new THREE.Group();

    // 4-Color Sinclair Rainbow Flash
    const stripeColors = [0xcd0000, 0xcdcd00, 0x00cd00, 0x00cdcd];
    stripeColors.forEach((col, idx) => {
      const sGeo = new THREE.PlaneGeometry(0.005, 0.016);
      const sMat = new THREE.MeshBasicMaterial({ color: col });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.set(driveX - 0.015 + (idx * 0.005), 0.032, 0.084);
      badgeGroup.add(sMesh);
    });

    // "ZX Spectrum +3" Text plate
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#141518';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('Sinclair', 10, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px -apple-system, sans-serif';
    ctx.fillText('ZX SPECTRUM +3', 105, 42);

    const tex = new THREE.CanvasTexture(canvas);
    const badgeGeo = new THREE.PlaneGeometry(0.080, 0.020);
    const badgeMat = new THREE.MeshBasicMaterial({ map: tex });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.position.set(-0.06, 0.038, -0.065);
    badgeMesh.rotation.x = -Math.PI / 18;
    badgeGroup.add(badgeMesh);

    this.group.add(badgeGroup);
  }

  createKeyboardLayout() {
    const keyGroup = new THREE.Group();
    keyGroup.position.set(-0.07, 0.024, 0.015);
    keyGroup.rotation.x = -Math.PI / 24; // Align with top slope

    const keyRows = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'enter'],
      ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'sym', 'break'],
      ['space']
    ];

    const keyCapMat = new THREE.MeshStandardMaterial({
      color: 0x22242a,
      roughness: 0.6,
      metalness: 0.1
    });

    const keyW = 0.018;
    const keyH = 0.016;
    const keyD = 0.008;
    const spacing = 0.020;

    keyRows.forEach((row, rIdx) => {
      const zPos = (rIdx - 2) * spacing;
      row.forEach((k, cIdx) => {
        let actualW = keyW;
        let xPos = (cIdx - 4.5) * spacing;

        if (k === 'enter' || k === 'shift' || k === 'break') {
          actualW = keyW * 1.5;
        } else if (k === 'space') {
          actualW = keyW * 6.5;
          xPos = 0;
        }

        const kGeo = new THREE.BoxGeometry(actualW, keyD, keyH);
        const kMesh = new THREE.Mesh(kGeo, keyCapMat.clone());
        kMesh.position.set(xPos, 0, zPos);
        kMesh.name = `Key_${k}`;
        kMesh.userData = {
          isSpeccyKey: true,
          keyId: k,
          baseY: 0
        };

        // Key label texture
        const labelTex = this.createKeyLabelTexture(k, actualW);
        const topMat = new THREE.MeshBasicMaterial({ map: labelTex });
        const topGeo = new THREE.PlaneGeometry(actualW * 0.9, keyH * 0.9);
        topGeo.rotateX(-Math.PI / 2);
        const topMesh = new THREE.Mesh(topGeo, topMat);
        topMesh.position.y = keyD / 2 + 0.0005;
        kMesh.add(topMesh);

        keyGroup.add(kMesh);
        this.keyMeshes.set(k, kMesh);
        this.interactiveObjects.push(kMesh);
      });
    });

    this.group.add(keyGroup);
  }

  createKeyLabelTexture(keyText, w) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * 3200);
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Beveled keycap top
    ctx.fillStyle = '#1c1e24';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#32353e';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    // Keyword lookup map for authentic Sinclair +3 keys
    const keywords = {
      '1': 'EDIT', '2': 'CAPS', '3': 'TRUE', '4': 'INV',
      'q': 'SIN', 'w': 'COS', 'e': 'TAN', 'r': 'INT', 't': 'RND',
      'y': 'STR$', 'u': 'CHR$', 'i': 'CODE', 'o': 'PEEK', 'p': 'TAB',
      'a': 'READ', 's': 'RESTORE', 'd': 'DATA', 'f': 'SGN', 'g': 'ABS',
      'h': 'SQR', 'j': 'VAL', 'k': 'LEN', 'l': 'USR',
      'z': 'LN', 'x': 'EXP', 'c': 'LPRINT', 'v': 'LLIST', 'b': 'BIN',
      'n': 'INKEY$', 'm': 'PI'
    };

    const sub = keywords[keyText.toLowerCase()];

    // Main Key Text (crisp white)
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(keyText.toUpperCase(), canvas.width / 2, sub ? 24 : canvas.height / 2);

    // Sinclair keyword sub-legend (authentic cyan)
    if (sub && canvas.width > 50) {
      ctx.fillStyle = '#00d2ff';
      ctx.font = 'bold 13px -apple-system, sans-serif';
      ctx.fillText(sub, canvas.width / 2, 48);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  createInsertedDiskMesh(driveX) {
    // 3-inch Compact Floppy visible inserted halfway into the drive slot
    const diskGeo = new THREE.BoxGeometry(0.075, 0.005, 0.040);
    const diskMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Classic Amsoft dark blue cartridge plastic
      roughness: 0.5,
      metalness: 0.2
    });
    this.insertedDisk = new THREE.Mesh(diskGeo, diskMat);
    this.insertedDisk.position.set(driveX, 0.022, 0.092);
    this.insertedDisk.visible = false; // Hidden until game loaded
    this.group.add(this.insertedDisk);
  }

  /**
   * Visually depresses a 3D key when pressed (via VR touch OR PC physical keyboard!)
   */
  pressKey(keyId, forwardToEmulator = true) {
    const k = (keyId || '').toLowerCase();
    const mesh = this.keyMeshes.get(k);
    if (mesh) {
      // Depress key down
      mesh.position.y = -0.004;
      setTimeout(() => {
        mesh.position.y = mesh.userData.baseY || 0;
      }, 120);
    }

    // Forward to emulator only when called via 3D raycast / VR touch
    if (forwardToEmulator && this.spectrum) {
      this.spectrum.audio.unlock();
      this.spectrum.handleKeyEvent(k, true);
      setTimeout(() => this.spectrum.handleKeyEvent(k, false), 120);
    }
  }

  /**
   * Updates drive activity LED and inserted disk state
   */
  update(isMotorActive, isDiskLoaded) {
    // Sync Green Drive LED with motor state
    if (this.diskLedMat) {
      this.diskLedMat.color.setHex(isMotorActive ? 0x00ff44 : 0x004411);
    }
    // Dynamic real light cast onto desk
    if (this.driveLedLight) {
      this.driveLedLight.intensity = isMotorActive ? 1.4 : 0;
    }
    // Show disk inserted in drive
    if (this.insertedDisk) {
      this.insertedDisk.visible = !!isDiskLoaded;
    }
  }
}
