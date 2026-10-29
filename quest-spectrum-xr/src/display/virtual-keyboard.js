/**
 * Interactive 3D Sinclair ZX Spectrum 48K Rubber Keyboard
 * - Modeled with authentic key legends, dimensions, and rubber keycaps
 * - Interactive: Keys can be pressed with Quest 3 controller rays or direct touch
 */
import * as THREE from 'three';

export class VirtualKeyboard {
  constructor(spectrum) {
    this.spectrum = spectrum;
    this.group = new THREE.Group();
    this.group.name = 'VirtualKeyboard';

    this.interactiveKeys = [];
    this.activePressedKey = null;

    // Dimensions
    this.width = 0.55;
    this.height = 0.22;
    this.depth = 0.03;

    // Keyboard layout definition (8 rows in hardware matrix)
    this.keyLayout = [
      // Row 1: Numbers
      [
        { key: '1', label: '1\nEDIT', color: 'blue' },
        { key: '2', label: '2\nCAPS', color: 'red' },
        { key: '3', label: '3\nTRUE', color: 'magenta' },
        { key: '4', label: '4\nINV', color: 'green' },
        { key: '5', label: '5\n◀', color: 'cyan' },
        { key: '6', label: '6\n▼', color: 'yellow' },
        { key: '7', label: '7\n▲', color: 'white' },
        { key: '8', label: '8\n▶', color: 'blue' },
        { key: '9', label: '9\nGRAPH', color: 'red' },
        { key: '0', label: '0\nDELETE', color: 'black' }
      ],
      // Row 2: QWERTY
      [
        { key: 'q', label: 'Q\nPLOT', color: 'white' },
        { key: 'w', label: 'W\nDRAW', color: 'white' },
        { key: 'e', label: 'E\nREM', color: 'white' },
        { key: 'r', label: 'R\nRUN', color: 'white' },
        { key: 't', label: 'T\nRAND', color: 'white' },
        { key: 'y', label: 'Y\nRETURN', color: 'white' },
        { key: 'u', label: 'U\nIF', color: 'white' },
        { key: 'i', label: 'I\nINPUT', color: 'white' },
        { key: 'o', label: 'O\nPOKE', color: 'white' },
        { key: 'p', label: 'P\nPRINT', color: 'white' }
      ],
      // Row 3: ASDF
      [
        { key: 'a', label: 'A\nNEW', color: 'white' },
        { key: 's', label: 'S\nSAVE', color: 'white' },
        { key: 'd', label: 'D\nDIM', color: 'white' },
        { key: 'f', label: 'F\nFOR', color: 'white' },
        { key: 'g', label: 'G\nGOTO', color: 'white' },
        { key: 'h', label: 'H\nGOSUB', color: 'white' },
        { key: 'j', label: 'J\nLOAD', color: 'white' },
        { key: 'k', label: 'K\nLIST', color: 'white' },
        { key: 'l', label: 'L\nLET', color: 'white' },
        { key: 'enter', label: 'ENTER', color: 'white', isWide: true }
      ],
      // Row 4: ZXCV
      [
        { key: 'shift', label: 'CAPS\nSHIFT', color: 'white' },
        { key: 'z', label: 'Z\nCOPY', color: 'white' },
        { key: 'x', label: 'X\nCLEAR', color: 'white' },
        { key: 'c', label: 'C\nCONT', color: 'white' },
        { key: 'v', label: 'V\nCLS', color: 'white' },
        { key: 'b', label: 'B\nBORDER', color: 'white' },
        { key: 'n', label: 'N\nNEXT', color: 'white' },
        { key: 'm', label: 'M\nPAUSE', color: 'white' },
        { key: 'control', label: 'SYM\nSHIFT', color: 'white' },
        { key: ' ', label: 'SPACE\nBREAK', color: 'white', isWide: true }
      ]
    ];

    this.initKeyboard();
  }

  initKeyboard() {
    // 1. Sleek Sinclair matte black chassis
    const bodyGeo = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.9,
      metalness: 0.1
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.group.add(this.bodyMesh);

    // Sinclair logo plate
    const logoPlateGeo = new THREE.PlaneGeometry(0.18, 0.025);
    const logoPlateMat = new THREE.MeshBasicMaterial({ color: 0x242428 });
    const logoPlate = new THREE.Mesh(logoPlateGeo, logoPlateMat);
    logoPlate.position.set(-this.width * 0.5 + 0.11, this.height * 0.5 - 0.02, this.depth * 0.5 + 0.001);
    this.bodyMesh.add(logoPlate);

    // Iconic Sinclair 4-color rainbow stripe
    const stripeColors = [0xcd0000, 0xcdcd00, 0x00cd00, 0x00cdcd];
    stripeColors.forEach((col, idx) => {
      const sGeo = new THREE.PlaneGeometry(0.015, 0.025);
      const sMat = new THREE.MeshBasicMaterial({ color: col });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.set(
        this.width * 0.5 - 0.08 + (idx * 0.015),
        this.height * 0.5 - 0.02,
        this.depth * 0.5 + 0.001
      );
      this.bodyMesh.add(sMesh);
    });

    // 2. Generate Keycaps (uniform grid spacing to prevent any overlapping)
    const keyRows = this.keyLayout.length;
    const startY = 0.04;
    const rowSpacing = 0.038;
    const keyWidth = (this.width - 0.06) / 10;

    this.keyLayout.forEach((row, rIdx) => {
      const y = startY - (rIdx * rowSpacing);
      const startX = -((10 * keyWidth) * 0.5) + (keyWidth * 0.5);

      row.forEach((kDef, cIdx) => {
        const x = startX + (cIdx * keyWidth);
        const w = keyWidth * 0.88;
        const h = 0.028;
        const d = 0.012;

        // Rubber key mesh (dark grey rounded block)
        const keyGeo = new THREE.BoxGeometry(w, h, d);
        const keyMat = new THREE.MeshStandardMaterial({
          color: 0x2a2a2e,
          roughness: 0.95,
          metalness: 0.05
        });

        const keyMesh = new THREE.Mesh(keyGeo, keyMat);
        keyMesh.position.set(x, y, this.depth * 0.5 + d * 0.5);
        keyMesh.userData = {
          isKey: true,
          keyDef: kDef,
          initialZ: keyMesh.position.z
        };

        // Key label texture
        const labelTexture = this.createKeyLabelTexture(kDef.label);
        const labelMat = new THREE.MeshBasicMaterial({
          map: labelTexture,
          transparent: true
        });
        const labelGeo = new THREE.PlaneGeometry(w * 0.95, h * 0.95);
        const labelMesh = new THREE.Mesh(labelGeo, labelMat);
        labelMesh.position.set(0, 0, d * 0.5 + 0.001);
        keyMesh.add(labelMesh);

        this.bodyMesh.add(keyMesh);
        this.interactiveKeys.push(keyMesh);
      });
    });

    // Position keyboard tilted comfortably in front of screen
    this.group.position.set(0, 0.9, -1.2);
    this.group.rotation.x = -Math.PI / 6; // 30-degree tilt
  }

  createKeyLabelTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    // Keycap face background
    ctx.fillStyle = '#222226';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle keycap bevel border
    ctx.strokeStyle = '#32323a';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    const lines = text.split('\n');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const maxW = canvas.width * 0.82;

    if (lines.length === 1) {
      // Single line text (e.g. ENTER)
      let fontSize = 48;
      ctx.font = `bold ${fontSize}px sans-serif`;
      while (ctx.measureText(lines[0]).width > maxW && fontSize > 20) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px sans-serif`;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lines[0], canvas.width * 0.5, canvas.height * 0.5);
    } else {
      // Two-line keycap (Primary letter / symbol on top, keyword below)
      const topText = lines[0];
      const bottomText = lines[1];

      // Top text sizing
      let topFontSize = 54;
      ctx.font = `bold ${topFontSize}px sans-serif`;
      while (ctx.measureText(topText).width > maxW && topFontSize > 22) {
        topFontSize -= 2;
        ctx.font = `bold ${topFontSize}px sans-serif`;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(topText, canvas.width * 0.5, 52);

      // Bottom keyword sizing
      let bottomFontSize = 32;
      ctx.font = `bold ${bottomFontSize}px sans-serif`;
      while (ctx.measureText(bottomText).width > maxW && bottomFontSize > 16) {
        bottomFontSize -= 2;
        ctx.font = `bold ${bottomFontSize}px sans-serif`;
      }
      ctx.fillStyle = '#ff4444';
      ctx.fillText(bottomText, canvas.width * 0.5, 112);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  pressKey(keyMesh) {
    if (this.activePressedKey === keyMesh) return;
    this.releaseKey();

    this.activePressedKey = keyMesh;
    keyMesh.position.z = keyMesh.userData.initialZ - 0.006; // Depress key
    const k = keyMesh.userData.keyDef.key;
    this.spectrum.handleKeyEvent(k, true);
  }

  releaseKey() {
    if (!this.activePressedKey) return;
    this.activePressedKey.position.z = this.activePressedKey.userData.initialZ;
    const k = this.activePressedKey.userData.keyDef.key;
    this.spectrum.handleKeyEvent(k, false);
    this.activePressedKey = null;
  }

  toggleVisible() {
    this.group.visible = !this.group.visible;
    return this.group.visible;
  }
}
