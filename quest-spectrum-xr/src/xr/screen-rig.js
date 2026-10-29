/**
 * 3D Spatial Screen Rig for Meta Quest 3 Mixed Reality & Immersive VR
 * - Strictly enforces 4:3 aspect ratio during all stretch/shrink transformations
 * - Includes authentic vintage Sinclair styling with rainbow stripes and bezel
 * - 4 interactive corner scale handles + bottom reposition grab bar
 */
import * as THREE from 'three';
import { createCRTMaterial } from '../display/crt-material.js';

export class ScreenRig {
  constructor(screenTexture) {
    this.aspectRatio = 4.0 / 3.0; // Sinclair 320x240 native aspect ratio

    // Base geometry sizes (in meters)
    this.baseHeight = 0.9;
    this.baseWidth = this.baseHeight * this.aspectRatio; // 1.2m

    this.scaleFactor = 1.0;
    this.minScale = 0.35; // 0.31m height (mini desk monitor)
    this.maxScale = 3.5;  // 3.15m height (massive IMAX cinema)

    this.group = new THREE.Group();
    this.group.name = 'ScreenRig';

    // Position in front of user
    this.group.position.set(0, 1.35, -1.5);

    // Interactive grab handles array for raycasting
    this.interactiveObjects = [];

    // Drag / Scale state
    this.isDragging = false;
    this.isScaling = false;
    this.activeHandle = null;
    this.dragStartPos = new THREE.Vector3();
    this.initialScale = 1.0;
    this.initialControllerDist = 1.0;

    // Unpack texture references for multi-layer 3D stereoscopic diorama
    if (screenTexture && screenTexture.frameTexture) {
      this.frameTexture = screenTexture.frameTexture;
      this.bgTexture = screenTexture.bgTexture || this.frameTexture;
      this.fgTexture = screenTexture.fgTexture || this.frameTexture;
      this.brightTexture = screenTexture.brightTexture || this.frameTexture;
    } else {
      this.frameTexture = screenTexture;
      this.bgTexture = screenTexture;
      this.fgTexture = screenTexture;
      this.brightTexture = screenTexture;
    }

    // Materials
    this.crtMaterial = createCRTMaterial(this.frameTexture);
    this.flatMaterial = new THREE.MeshBasicMaterial({ map: this.frameTexture, side: THREE.DoubleSide });
    this.isCRTActive = false; // Sharp, clean pixels by default!
    this.handlesVisible = true;
    this.pop3DLevel = 0; // 0 = 2D, 1 = Subtle, 2 = Pop-Out, 3 = Hologram

    this.initRig();
  }

  initRig() {
    // 1. Display Screen Plane (4:3) - Flat, pristine quad with zero vertex distortion
    this.screenGeo = new THREE.PlaneGeometry(this.baseWidth, this.baseHeight, 1, 1);

    // Invert UV Y-coordinates so WebGL DataTexture (scanline 0 at top) maps top-to-bottom right-side up
    const uvAttr = this.screenGeo.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setY(i, 1.0 - uvAttr.getY(i));
    }
    uvAttr.needsUpdate = true;

    this.screenMesh = new THREE.Mesh(this.screenGeo, this.flatMaterial);
    this.screenMesh.position.set(0, 0, 0.005);
    this.screenMesh.name = 'DisplayScreen';
    this.group.add(this.screenMesh);

    // 1b. Floating Stereoscopic Pop-Out Layer (Unified In-Game Graphics: Platforms, Characters, Lasers, HUD)
    // All in-game elements stay together on one cohesive plane so characters never separate from platforms!
    const popMat = new THREE.MeshBasicMaterial({
      map: this.fgTexture,
      transparent: true,
      alphaTest: 0.02,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.popOutMesh = new THREE.Mesh(this.screenGeo, popMat);
    this.popOutMesh.name = 'PopOutLayer';
    this.popOutMesh.position.set(0, 0, 0.005);
    this.popOutMesh.visible = false;
    this.group.add(this.popOutMesh);

    // 2. Bezel & Case Frame
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x18181a,
      roughness: 0.85,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x2c2d30,
      roughness: 0.6,
      metalness: 0.4
    });

    // Outer frame box
    const frameDepth = 0.05;
    const borderThick = 0.05;
    const frameGeo = new THREE.BoxGeometry(
      this.baseWidth + borderThick * 2,
      this.baseHeight + borderThick * 2,
      frameDepth
    );
    this.frameMesh = new THREE.Mesh(frameGeo, bezelMat);
    this.frameMesh.position.set(0, 0, -frameDepth * 0.5 - 0.001);
    this.group.add(this.frameMesh);

    // 3. Sinclair Iconic Rainbow Stripes on bottom bezel
    const stripeColors = [0xcd0000, 0xcdcd00, 0x00cd00, 0x00cdcd]; // Red, Yellow, Green, Cyan
    const stripeGroup = new THREE.Group();
    const stripeW = 0.015;
    const stripeH = 0.012;

    stripeColors.forEach((col, idx) => {
      const sGeo = new THREE.PlaneGeometry(stripeW, stripeH);
      const sMat = new THREE.MeshBasicMaterial({ color: col });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.position.set(
        (this.baseWidth * 0.5) - 0.08 + (idx * stripeW),
        -(this.baseHeight * 0.5) - (borderThick * 0.5),
        0.005
      );
      stripeGroup.add(sMesh);
    });
    this.frameMesh.add(stripeGroup);

    // 4. Power & Drive Motor LEDs
    const ledGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.006, 12);
    ledGeo.rotateX(Math.PI / 2);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    this.ledMesh = new THREE.Mesh(ledGeo, ledMat);
    this.ledMesh.position.set(
      -(this.baseWidth * 0.5) + 0.04,
      -(this.baseHeight * 0.5) - (borderThick * 0.5),
      0.006
    );
    this.frameMesh.add(this.ledMesh);

    // Floppy Drive Activity LED (Green)
    const diskLedMat = new THREE.MeshBasicMaterial({ color: 0x00ff44 });
    this.diskLed = new THREE.Mesh(ledGeo, diskLedMat);
    this.diskLed.position.set(
      -(this.baseWidth * 0.5) + 0.065,
      -(this.baseHeight * 0.5) - (borderThick * 0.5),
      0.006
    );
    this.frameMesh.add(this.diskLed);

    // Controller / Joypad Connection LED (Cyan / Neon Green)
    const joyLedMat = new THREE.MeshBasicMaterial({ color: 0x223344 });
    this.joypadLed = new THREE.Mesh(ledGeo, joyLedMat);
    this.joypadLed.position.set(
      -(this.baseWidth * 0.5) + 0.090,
      -(this.baseHeight * 0.5) - (borderThick * 0.5),
      0.006
    );
    this.frameMesh.add(this.joypadLed);

    // 5. Bezel Quick Action Buttons (One-click game run & loader triggers)
    this.createBezelButtons(borderThick);
    const barGeo = new THREE.CylinderGeometry(0.012, 0.012, this.baseWidth * 0.5, 16);
    barGeo.rotateZ(Math.PI / 2);
    const barMat = new THREE.MeshStandardMaterial({
      color: 0x4a4d52,
      metalness: 0.7,
      roughness: 0.3
    });
    this.grabBar = new THREE.Mesh(barGeo, barMat);
    this.grabBar.name = 'GrabBar';
    this.grabBar.position.set(0, -(this.baseHeight * 0.5) - borderThick - 0.03, 0);
    this.grabBar.userData = { isGrabBar: true };
    this.group.add(this.grabBar);
    this.interactiveObjects.push(this.grabBar);

    // 6. Corner Scale Handles (Enforces 4:3 Aspect Ratio)
    this.cornerHandles = [];
    const handleGeo = new THREE.SphereGeometry(0.035, 16, 16);
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      emissive: 0x006699,
      roughness: 0.3,
      metalness: 0.8
    });

    const corners = [
      { id: 'top-left',     x: -1, y:  1 },
      { id: 'top-right',    x:  1, y:  1 },
      { id: 'bottom-left',  x: -1, y: -1 },
      { id: 'bottom-right', x:  1, y: -1 }
    ];

    corners.forEach(c => {
      const handle = new THREE.Mesh(handleGeo, handleMat.clone());
      handle.name = `CornerHandle_${c.id}`;
      handle.position.set(
        c.x * (this.baseWidth * 0.5 + borderThick),
        c.y * (this.baseHeight * 0.5 + borderThick),
        0.01
      );
      handle.userData = { isScaleHandle: true, corner: c };
      this.group.add(handle);
      this.cornerHandles.push(handle);
      this.interactiveObjects.push(handle);
    });

    this.updateTransform();
  }

  createBezelButtons(borderThick) {
    const btnHeight = 0.032;
    const bezelBtns = [
      { text: '▶ RUN / ENTER', color: '#00ff88', action: 'pressEnter', width: 0.16 },
      { text: '1. LOADER', color: '#00d2ff', action: 'press1', width: 0.12 },
      { text: 'SPACE', color: '#ffffff', action: 'pressSpace', width: 0.09 },
      { text: '🎯 RECENTER', color: '#ffaa00', action: 'recenter', width: 0.13 }
    ];

    let currentX = -0.26;
    bezelBtns.forEach(bDef => {
      const btnGeo = new THREE.PlaneGeometry(bDef.width, btnHeight);
      
      // Calculate exact canvas aspect ratio to prevent ANY texture distortion
      const cHeight = 256;
      const cWidth = Math.round(cHeight * (bDef.width / btnHeight));
      // Normal and Hover textures
      const makeTex = (isHovered) => {
        const canvas = document.createElement('canvas');
        canvas.width = cWidth;
        canvas.height = cHeight;
        const ctx = canvas.getContext('2d');

        // Bezel button tactile dark background
        ctx.fillStyle = isHovered ? '#26293a' : '#141620';
        ctx.beginPath();
        ctx.roundRect(8, 8, cWidth - 16, cHeight - 16, 32);
        ctx.fill();

        // Neon accent border
        ctx.strokeStyle = isHovered ? '#ffffff' : bDef.color;
        ctx.lineWidth = isHovered ? 18 : 12;
        ctx.stroke();

        // Measure and fit text dynamically
        let fontSize = 88;
        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        while (ctx.measureText(bDef.text).width > cWidth - 40 && fontSize > 36) {
          fontSize -= 4;
          ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        }

        // Crisp text with subtle shadow
        ctx.fillStyle = isHovered ? '#ffffff' : bDef.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = isHovered ? 16 : 8;
        ctx.fillText(bDef.text, cWidth * 0.5, cHeight * 0.5);

        const tex = new THREE.CanvasTexture(canvas);
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.anisotropy = 16;
        return tex;
      };

      const normalTex = makeTex(false);
      const hoverTex = makeTex(true);

      const btnMat = new THREE.MeshBasicMaterial({
        map: normalTex,
        side: THREE.DoubleSide,
        depthWrite: true
      });
      const btnMesh = new THREE.Mesh(btnGeo, btnMat);
      // Position directly in front of the screen and frame bezel (Z = +0.003 in group space)
      btnMesh.position.set(
        currentX + (bDef.width * 0.5),
        -(this.baseHeight * 0.5) - (borderThick * 0.5),
        0.003
      );
      btnMesh.userData = {
        isBezelButton: true,
        action: bDef.action,
        setHovered: (hovered) => {
          btnMat.map = hovered ? hoverTex : normalTex;
          btnMesh.position.z = hovered ? 0.007 : 0.003;
        }
      };
      this.group.add(btnMesh);
      this.interactiveObjects.push(btnMesh);

      currentX += bDef.width + 0.012;
    });
  }

  // Set uniform scale while strictly locking 4:3
  setScale(scale) {
    this.scaleFactor = THREE.MathUtils.clamp(scale, this.minScale, this.maxScale);
    this.updateTransform();
  }

  adjustScaleDelta(delta) {
    this.setScale(this.scaleFactor + delta);
  }

  updateTransform() {
    this.group.scale.set(this.scaleFactor, this.scaleFactor, this.scaleFactor);
  }

  // Toggle between authentic CRT phosphor scanlines and sharp pixels
  toggleCRT() {
    this.isCRTActive = !this.isCRTActive;
    if (this.crtMaterial && this.crtMaterial.uniforms.uScanlineIntensity) {
      this.crtMaterial.uniforms.uScanlineIntensity.value = this.isCRTActive ? 0.35 : 0.0;
      this.crtMaterial.uniforms.uMaskIntensity.value = this.isCRTActive ? 0.20 : 0.0;
    }
    // Swap material so CRT is 100% off when inactive
    this.screenMesh.material = this.isCRTActive ? this.crtMaterial : this.flatMaterial;
    return this.isCRTActive;
  }

  // Set stereoscopic 3D pop-out in VR
  set3DMode(level) {
    this.pop3DLevel = level % 4;

    // Subtle, comfortable pop-out depths in meters (relative to base TV tube at Z = 0.005)
    // Characters and platforms stay unified on one cohesive layer so they never separate!
    // Level 0: 2D Flat (Off)
    // Level 1: Subtle 3D (6mm pop-out)
    // Level 2: Pop-Out 3D (12mm pop-out)
    // Level 3: Hologram 3D (18mm pop-out)
    const popDepths = [0.0, 0.006, 0.012, 0.018];

    // Base TV screen ALWAYS remains the solid complete 2D frame (Border + Paper + Ink)
    // This guarantees ZERO cracks, ZERO black voids, and ZERO missing pixels!
    const is3D = this.pop3DLevel > 0;

    if (!is3D) {
      this.popOutMesh.visible = false;
    } else {
      this.popOutMesh.visible = true;
      this.popOutMesh.position.z = 0.005 + popDepths[this.pop3DLevel];
    }

    const names = ['2D (OFF)', '3D (SUBTLE 6mm)', '3D (POP-OUT 12mm)', '3D (HOLOGRAM 18mm)'];
    console.log(`[ScreenRig] 3D Mode: ${names[this.pop3DLevel]}`);
    return this.pop3DLevel;
  }

  toggle3D() {
    return this.set3DMode(this.pop3DLevel + 1);
  }

  toggleHandles() {
    this.handlesVisible = !this.handlesVisible;
    for (const h of this.cornerHandles) h.visible = this.handlesVisible;
    if (this.grabBar) this.grabBar.visible = this.handlesVisible;
    return this.handlesVisible;
  }

  setScanlines(val) {
    if (this.crtMaterial && this.crtMaterial.uniforms.uScanlineIntensity) {
      this.crtMaterial.uniforms.uScanlineIntensity.value = val;
    }
  }

  // Recenter screen directly in front of camera
  recenter(camera, distance = 1.5) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0; // Keep level with horizon
    dir.normalize();

    this.group.position.copy(camera.position).addScaledVector(dir, distance);
    this.group.position.y = camera.position.y; // Eye level
    this.group.lookAt(camera.position.x, this.group.position.y, camera.position.z);
  }

  // "Full Screen" Immersive Theater Zoom Preset
  setImmersiveCinema(camera) {
    this.recenter(camera, 2.2);
    this.setScale(2.4); // Large cinema field of view preserving 4:3
  }

  // Desktop Compact Preset
  setDeskMode(camera) {
    this.recenter(camera, 1.1);
    this.setScale(0.75); // Compact desk monitor size
  }

  // Visual LED feedback for Joypad connection state in VR
  setJoypadActive(connected) {
    if (this.joypadLed) {
      this.joypadLed.material.color.setHex(connected ? 0x00ff88 : 0x223344);
    }
  }
}
