/**
 * Floating 3D Spatial Control Menu for Meta Quest 3
 * Two-tier high-resolution button grid with instant hover highlights and tactile click feedback
 */
import * as THREE from 'three';

export class SpatialMenu {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.group = new THREE.Group();
    this.group.name = 'SpatialMenu';

    this.interactiveButtons = [];
    this.hoveredButton = null;

    this.width = 0.88;
    this.height = 0.13;

    this.initMenu();
  }

  initMenu() {
    // Menu background panel (opaque dark glass with depthWrite so WebXR compositor reprojects cleanly)
    const bgGeo = new THREE.PlaneGeometry(this.width, this.height);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x0f1118,
      side: THREE.DoubleSide,
      depthWrite: true
    });
    this.bgMesh = new THREE.Mesh(bgGeo, bgMat);
    this.bgMesh.position.z = 0;
    this.group.add(this.bgMesh);

    // Bezel border
    const borderGeo = new THREE.BoxGeometry(this.width + 0.012, this.height + 0.012, 0.006);
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x282b36,
      metalness: 0.8,
      roughness: 0.25
    });
    const borderMesh = new THREE.Mesh(borderGeo, borderMat);
    borderMesh.position.z = -0.004;
    this.group.add(borderMesh);

    // Two-Row Button Layout (Larger, comfortable touch & raycast hit targets)
    const row1Defs = [
      { id: 'toggleMR', text: '🥽 MR / VR', color: '#00d2ff', action: 'toggleMR' },
      { id: 'randomGame', text: '🎲 Random', color: '#c084fc', action: 'randomGame' },
      { id: 'raiseDesk', text: '⬆ Raise Desk', color: '#10b981', action: 'raiseDesk' },
      { id: 'lowerDesk', text: '⬇ Lower Desk', color: '#f59e0b', action: 'lowerDesk' },
      { id: 'toggleSound', text: '🔊 Sound', color: '#38bdf8', action: 'toggleSound' },
      { id: 'toggleControllers', text: '🎮 Controllers', color: '#a855f7', action: 'toggleControllers' }
    ];

    const row2Defs = [
      { id: 'toggleHandles', text: '🔵 Blue Dots', color: '#38bdf8', action: 'toggleHandles' },
      { id: 'toggleLasers', text: '⚡ Neon Lasers', color: '#f59e0b', action: 'toggleLasers' },
      { id: 'toggle3D', text: '🕶️ 3D: OFF', color: '#ec4899', action: 'toggle3D' },
      { id: 'toggleCRT', text: '📺 CRT: OFF', color: '#ff00aa', action: 'toggleCRT' },
      { id: 'toggleKbd', text: '⌨️ Keyboard', color: '#ffffff', action: 'toggleKbd' },
      { id: 'resetEmu', text: '🔄 Reset', color: '#ff4444', action: 'resetEmu' }
    ];

    const btnW = 0.130;
    const btnH = 0.046;
    const spacingX = 0.142;

    // Helper to generate a row of buttons
    const createRow = (defs, yPos) => {
      const startX = -((defs.length - 1) * spacingX) * 0.5;

      defs.forEach((def, idx) => {
        const x = startX + (idx * spacingX);
        const btnGeo = new THREE.PlaneGeometry(btnW, btnH);

        const normalTex = this.createButtonTexture(def.text, def.color, false, btnW, btnH);
        const hoverTex = this.createButtonTexture(def.text, def.color, true, btnW, btnH);

        const btnMat = new THREE.MeshBasicMaterial({
          map: normalTex,
          side: THREE.DoubleSide,
          depthWrite: true
        });

        const btnMesh = new THREE.Mesh(btnGeo, btnMat);
        btnMesh.position.set(x, yPos, 0.005);

        btnMesh.userData = {
          isButton: true,
          action: def.action,
          def: def,
          normalTex: normalTex,
          hoverTex: hoverTex,
          setHovered: (hovered) => {
            btnMat.map = hovered ? hoverTex : normalTex;
            btnMesh.position.z = hovered ? 0.010 : 0.005;
          }
        };

        this.group.add(btnMesh);
        this.interactiveButtons.push(btnMesh);
      });
    };

    createRow(row1Defs, 0.028);
    createRow(row2Defs, -0.028);

    // Default tilt towards viewer
    this.group.rotation.x = -Math.PI / 12;
  }

  createButtonTexture(text, accentColor, isHovered, btnW, btnH) {
    const canvas = document.createElement('canvas');
    // Match exact aspect ratio to eliminate any horizontal/vertical stretching
    const cHeight = 256;
    const cWidth = Math.round(cHeight * (btnW / btnH));
    canvas.width = cWidth;
    canvas.height = cHeight;
    const ctx = canvas.getContext('2d');

    // Tactile button background
    ctx.fillStyle = isHovered ? '#25293d' : '#141622';
    ctx.beginPath();
    ctx.roundRect(10, 10, cWidth - 20, cHeight - 20, 40);
    ctx.fill();

    // High-contrast neon border
    ctx.lineWidth = isHovered ? 20 : 12;
    ctx.strokeStyle = isHovered ? '#ffffff' : accentColor;
    ctx.stroke();

    // Ultra-crisp typography with auto-fit measurement
    let fontSize = 76;
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    while (ctx.measureText(text).width > cWidth - 50 && fontSize > 32) {
      fontSize -= 4;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    }

    ctx.fillStyle = isHovered ? '#ffffff' : (accentColor || '#ffffff');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = isHovered ? 18 : 8;
    ctx.fillText(text, cWidth * 0.5, cHeight * 0.5);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    return texture;
  }

  handleButtonPress(buttonMesh) {
    const action = buttonMesh.userData.action;
    // Brief press depression visual bounce
    buttonMesh.position.z = 0.002;
    setTimeout(() => {
      buttonMesh.position.z = 0.005;
    }, 120);

    if (this.callbacks[action]) {
      this.callbacks[action]();
    }
  }

  // Dynamically update button label and recreate its canvas textures in VR
  updateButtonText(action, newText) {
    const btnMesh = this.interactiveButtons.find(b => b.userData && b.userData.action === action);
    if (!btnMesh) return;
    const def = btnMesh.userData.def;
    def.text = newText;
    const btnW = btnMesh.geometry.parameters.width;
    const btnH = btnMesh.geometry.parameters.height;
    const normalTex = this.createButtonTexture(newText, def.color, false, btnW, btnH);
    const hoverTex = this.createButtonTexture(newText, def.color, true, btnW, btnH);
    btnMesh.material.map = normalTex;
    btnMesh.userData.normalTex = normalTex;
    btnMesh.userData.hoverTex = hoverTex;
  }
}

