/**
 * RetroRoom Environment Manager for Sinclair ZX Spectrum XR
 * Creates an authentic, immersive 1980s computer room:
 * - Vintage Teak Wood Desk with drawers and brass handles
 * - Authentic 14" Colour CRT Television housing the Sinclair display
 * - Sinclair ZX Spectrum +3 console with working 3D keyboard & floppy slot
 * - Interactive 3-inch CF2 floppy disks & cassette tapes on the desk
 * - Anglepoise desk lamp casting warm 2700K tungsten spotlight
 * - 1980s Wallpaper, Wall trim, Retro Carpet & Ceiling
 * - Window looking out into a starry night sky with blinds
 * - Iconic 80s Wall Posters (Crash Magazine, Sinclair ZX Spectrum, Synthwave Arcade)
 */
import * as THREE from 'three';
import { RetroTextureUtils } from './texture-utils.js';
import { VintageCrtTv } from './crt-tv.js';
import { SpectrumHardwareManager } from './spectrum-hardware.js';
import { RetroPropsManager } from './retro-props.js';

export class RetroRoom {
  constructor(scene, spectrum, screenTexture, gamesLibrary, options = {}) {
    this.scene = scene;
    this.spectrum = spectrum;
    this.screenTexture = screenTexture;
    this.gamesLibrary = gamesLibrary;

    this.group = new THREE.Group();
    this.group.name = 'RetroRoomEnvironment';

    // Seated desk ergonomics (meters)
    this.deskHeight = 0.62;
    this.deskWidth = 1.35;
    this.deskDepth = 0.85;

    // Room boundaries (4.2m x 4.2m x 2.8m high)
    this.roomW = 4.2;
    this.roomD = 4.2;
    this.roomH = 2.8;

    this.interactiveObjects = [];

    this.initRoom();
    this.initDesk();
    this.initComponents();
    this.initLighting();

    this.scene.add(this.group);
  }

  initRoom() {
    this.wallsGroup = new THREE.Group();
    this.wallsGroup.name = 'RoomShell';

    // 1. Carpeted Floor
    const floorGeo = new THREE.PlaneGeometry(this.roomW, this.roomD);
    floorGeo.rotateX(-Math.PI / 2);
    const carpetTex = RetroTextureUtils.createCarpetTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      map: carpetTex,
      roughness: 0.85,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, 0, -1.2);
    floor.receiveShadow = true;
    this.wallsGroup.add(floor);

    // 2. Ceiling
    const ceilGeo = new THREE.PlaneGeometry(this.roomW, this.roomD);
    ceilGeo.rotateX(Math.PI / 2);
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0x242220,
      roughness: 0.95
    });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.position.set(0, this.roomH, -1.2);
    this.wallsGroup.add(ceiling);

    // 3. Back Wall (behind desk, Z = -2.6m)
    const backWallGeo = new THREE.PlaneGeometry(this.roomW, this.roomH);
    const wallpaperTex = RetroTextureUtils.createWallpaperTexture();
    const backWallMat = new THREE.MeshStandardMaterial({
      map: wallpaperTex,
      roughness: 0.8
    });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(0, this.roomH / 2, -2.6);
    backWall.receiveShadow = true;
    this.wallsGroup.add(backWall);

    // Wooden skirting board along bottom of back wall
    const skirtGeo = new THREE.BoxGeometry(this.roomW, 0.12, 0.02);
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.6 });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.set(0, 0.06, -2.59);
    this.wallsGroup.add(skirt);

    // 4. Side Walls
    const sideWallGeo = new THREE.PlaneGeometry(this.roomD, this.roomH);
    // Left wall
    const leftWall = new THREE.Mesh(sideWallGeo, backWallMat);
    leftWall.position.set(-this.roomW / 2, this.roomH / 2, -1.2);
    leftWall.rotation.y = Math.PI / 2;
    this.wallsGroup.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(sideWallGeo, backWallMat);
    rightWall.position.set(this.roomW / 2, this.roomH / 2, -1.2);
    rightWall.rotation.y = -Math.PI / 2;
    this.wallsGroup.add(rightWall);

    // 5. Retro Wall Posters
    this.createPosters();

    // 6. Window with Night Sky on Left Wall
    this.createWindow();

    this.group.add(this.wallsGroup);
  }

  createPosters() {
    const posterGroup = new THREE.Group();
    posterGroup.name = 'SgtPeppers90sCollage';

    // 1. Centerpiece: Giant Radiant Acid House Neon Smiley Face Sign (1988-1992 Rave culture)
    const smileyTex = RetroTextureUtils.createAcidSmileyTexture();
    const smileyGeo = new THREE.PlaneGeometry(0.72, 0.72);
    const smileyMat = new THREE.MeshStandardMaterial({
      map: smileyTex,
      emissive: 0xffd000,
      emissiveMap: smileyTex,
      emissiveIntensity: 0.85,
      roughness: 0.2
    });
    const smileyMesh = new THREE.Mesh(smileyGeo, smileyMat);
    smileyMesh.position.set(0, 2.05, -2.57);
    posterGroup.add(smileyMesh);

    // Warm ambient point light emanating from the Acid Smiley sign!
    const smileyLight = new THREE.PointLight(0xffe600, 1.2, 3.5);
    smileyLight.position.set(0, 2.05, -2.50);
    posterGroup.add(smileyLight);

    // 2. Upper Tier - The Cultural Giants:
    // A. Nirvana - Nevermind (1991)
    const nirvanaTex = RetroTextureUtils.createNirvanaTexture();
    const nirvanaGeo = new THREE.PlaneGeometry(0.56, 0.80);
    const nirvanaMesh = new THREE.Mesh(nirvanaGeo, new THREE.MeshBasicMaterial({ map: nirvanaTex }));
    nirvanaMesh.position.set(-1.38, 1.95, -2.58);
    posterGroup.add(nirvanaMesh);

    // B. The Stone Roses - Lemon & Paint Splatters (1989/1990)
    const rosesTex = RetroTextureUtils.createStoneRosesTexture();
    const rosesGeo = new THREE.PlaneGeometry(0.56, 0.80);
    const rosesMesh = new THREE.Mesh(rosesGeo, new THREE.MeshBasicMaterial({ map: rosesTex }));
    rosesMesh.position.set(-0.70, 1.95, -2.58);
    posterGroup.add(rosesMesh);

    // C. Oasis - Definitely Maybe (1994)
    const oasisTex = RetroTextureUtils.createOasisTexture();
    const oasisGeo = new THREE.PlaneGeometry(0.56, 0.80);
    const oasisMesh = new THREE.Mesh(oasisGeo, new THREE.MeshBasicMaterial({ map: oasisTex }));
    oasisMesh.position.set(0.70, 1.95, -2.58);
    posterGroup.add(oasisMesh);

    // D. Blur - Parklife (1994)
    const blurTex = RetroTextureUtils.createBlurTexture();
    const blurGeo = new THREE.PlaneGeometry(0.56, 0.80);
    const blurMesh = new THREE.Mesh(blurGeo, new THREE.MeshBasicMaterial({ map: blurTex }));
    blurMesh.position.set(1.38, 1.95, -2.58);
    posterGroup.add(blurMesh);

    // 3. Middle Tier:
    // A. The Prodigy - Music For The Jilted Generation (1994)
    const prodigyTex = RetroTextureUtils.createProdigyTexture();
    const prodigyGeo = new THREE.PlaneGeometry(0.52, 0.72);
    const prodigyMesh = new THREE.Mesh(prodigyGeo, new THREE.MeshBasicMaterial({ map: prodigyTex }));
    prodigyMesh.position.set(-1.38, 1.05, -2.58);
    posterGroup.add(prodigyMesh);

    // B. Street Fighter II - Championship Edition (1992 Arcade Poster)
    const sf2Tex = RetroTextureUtils.createStreetFighter2Texture();
    const sf2Geo = new THREE.PlaneGeometry(0.52, 0.72);
    const sf2Mesh = new THREE.Mesh(sf2Geo, new THREE.MeshBasicMaterial({ map: sf2Tex }));
    sf2Mesh.position.set(1.38, 1.05, -2.58);
    posterGroup.add(sf2Mesh);

    // C. 1992 UK Rave Flyers:
    // Fantazia 'Summertime '92' Flyer
    const fantaziaTex = RetroTextureUtils.createRaveFlyerTexture('FANTAZIA', 'SUMMERTIME \'92', '#ec4899');
    const fantGeo = new THREE.PlaneGeometry(0.32, 0.44);
    const fantMesh = new THREE.Mesh(fantGeo, new THREE.MeshBasicMaterial({ map: fantaziaTex }));
    fantMesh.position.set(-0.72, 1.05, -2.58);
    fantMesh.rotation.z = 0.05;
    posterGroup.add(fantMesh);

    // Dreamscape IV Flyer (1992)
    const dreamTex = RetroTextureUtils.createRaveFlyerTexture('DREAMSCAPE', 'SANCTUARY \'92', '#22c55e');
    const dreamGeo = new THREE.PlaneGeometry(0.32, 0.44);
    const dreamMesh = new THREE.Mesh(dreamGeo, new THREE.MeshBasicMaterial({ map: dreamTex }));
    dreamMesh.position.set(0.72, 1.05, -2.58);
    dreamMesh.rotation.z = -0.05;
    posterGroup.add(dreamMesh);

    // 4. Right Wall (Sonic the Hedgehog Standee + Crash Magazine)
    const rightWallX = this.roomW / 2 - 0.01;
    // Sonic the Hedgehog 16-Bit Mega Drive Standee
    const sonicTex = RetroTextureUtils.createSonicCutoutTexture();
    const sonicGeo = new THREE.PlaneGeometry(0.76, 1.10);
    const sonicMesh = new THREE.Mesh(sonicGeo, new THREE.MeshBasicMaterial({ map: sonicTex }));
    sonicMesh.position.set(rightWallX, 1.55, -0.65);
    sonicMesh.rotation.y = -Math.PI / 2;
    posterGroup.add(sonicMesh);

    // CRASH Magazine Definitive Speccy Guide Poster
    const crashTex = RetroTextureUtils.createPosterTexture('CRASH', '100% SPECCY GUIDE', '#e11d48');
    const crashGeo = new THREE.PlaneGeometry(0.60, 0.85);
    const crashMesh = new THREE.Mesh(crashGeo, new THREE.MeshBasicMaterial({ map: crashTex }));
    crashMesh.position.set(rightWallX, 1.65, -1.65);
    crashMesh.rotation.y = -Math.PI / 2;
    posterGroup.add(crashMesh);

    // 5. THE BEATLES in Full Sgt. Pepper Day-Glo Satin Uniforms Standee
    const beatlesTex = RetroTextureUtils.createBeatlesSgtPepperCutoutTexture();
    const beatlesGeo = new THREE.PlaneGeometry(0.85, 1.25);
    const beatlesMesh = new THREE.Mesh(beatlesGeo, new THREE.MeshBasicMaterial({ map: beatlesTex, transparent: true }));
    beatlesMesh.position.set(-1.45, 1.25, -2.57);
    posterGroup.add(beatlesMesh);

    // 6. PUBLIC ENEMY 90s Def Jam Standee (Chuck D + Flavor Flav with Giant Clock!)
    const peTex = RetroTextureUtils.createPublicEnemyCutoutTexture();
    const peGeo = new THREE.PlaneGeometry(0.82, 1.22);
    const peMesh = new THREE.Mesh(peGeo, new THREE.MeshBasicMaterial({ map: peTex, transparent: true }));
    const leftWallX = -this.roomW / 2 + 0.02;
    peMesh.position.set(leftWallX, 1.45, -2.0);
    peMesh.rotation.y = Math.PI / 2;
    posterGroup.add(peMesh);

    // 7. Wooden Wall Shelf with Marching Lemmings!
    this.createLemmingsShelf(posterGroup);

    // 8. THE ICONIC SGT. PEPPER BASS DRUM & VIBRANT FLOWER BED IN ROOM CORNER!
    this.createSgtPeppersDrumAndFlowers(posterGroup);

    this.wallsGroup.add(posterGroup);
  }

  /**
   * The Legendary 3D Sgt. Pepper's Bass Drum and Floral Garden Bed
   * (Sits on the carpet in the room, angled towards the user)
   */
  createSgtPeppersDrumAndFlowers(parentGroup) {
    const drumGroup = new THREE.Group();
    drumGroup.name = 'SgtPeppersBassDrumStation';
    // Placed in comfortable viewing angle in room corner
    drumGroup.position.set(-1.42, 0.0, -1.55);
    drumGroup.rotation.y = Math.PI / 3.8;

    // 1. Raised Wooden Flowerbed Box (0.95m wide x 0.14m high x 0.70m deep)
    const boxGeo = new THREE.BoxGeometry(0.95, 0.12, 0.70);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.8 });
    const flowerBox = new THREE.Mesh(boxGeo, boxMat);
    flowerBox.position.y = 0.06;
    drumGroup.add(flowerBox);

    // Rich dark garden soil
    const soilGeo = new THREE.PlaneGeometry(0.92, 0.66);
    soilGeo.rotateX(-Math.PI / 2);
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.95 });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.121;
    drumGroup.add(soil);

    // Bed of colorful red, yellow, and blue blooms around the base of the drum
    const flowerCols = [0xef4444, 0xfacc15, 0x3b82f6, 0xec4899, 0xa855f7];
    for (let f = 0; f < 38; f++) {
      const flGeo = new THREE.SphereGeometry(0.024, 8, 8);
      const flMat = new THREE.MeshStandardMaterial({
        color: flowerCols[f % flowerCols.length],
        roughness: 0.6
      });
      const flMesh = new THREE.Mesh(flGeo, flMat);
      const fx = -0.40 + (Math.random() * 0.80);
      const fz = -0.28 + (Math.random() * 0.56);
      flMesh.position.set(fx, 0.135 + (Math.random() * 0.02), fz);
      drumGroup.add(flMesh);
    }

    // 2. The 3D Bass Drum (0.68m diameter x 0.28m deep)
    const drumRadius = 0.34;
    const drumDepth = 0.28;
    const drumGeo = new THREE.CylinderGeometry(drumRadius, drumRadius, drumDepth, 32);
    drumGeo.rotateZ(Math.PI / 2); // Lay cylinder on side so circular faces point along X

    // Metallic Brass Shell
    const drumShellMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Polished brass
      metalness: 0.85,
      roughness: 0.25
    });

    const drumMesh = new THREE.Mesh(drumGeo, drumShellMat);
    drumMesh.position.set(0, 0.40, 0);
    drumMesh.rotation.y = -Math.PI / 2; // Face front circular head towards room
    drumGroup.add(drumMesh);

    // 3. Ornate Painted Front Drum Face
    const faceGeo = new THREE.CircleGeometry(drumRadius * 0.98, 32);
    const faceTex = RetroTextureUtils.createSgtPeppersDrumTexture();
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.4,
      metalness: 0.1
    });
    const frontFace = new THREE.Mesh(faceGeo, faceMat);
    frontFace.position.set(0, 0.40, drumDepth / 2 + 0.002);
    drumGroup.add(frontFace);

    // 4. Brass Tension Rims & 12 Chrome Tuning Clamps around circumference
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, metalness: 0.9, roughness: 0.2 });
    for (let c = 0; c < 12; c++) {
      const ang = (c / 12) * Math.PI * 2;
      const clampGeo = new THREE.BoxGeometry(0.015, 0.02, drumDepth + 0.02);
      const clamp = new THREE.Mesh(clampGeo, rimMat);
      clamp.position.set(Math.cos(ang) * (drumRadius + 0.008), 0.40 + Math.sin(ang) * (drumRadius + 0.008), 0);
      clamp.rotation.z = ang;
      drumGroup.add(clamp);
    }

    // 5. Warm spotlight illuminating the Sgt. Pepper drum
    const drumSpot = new THREE.SpotLight(0xfff1c2, 1.8, 4.0, Math.PI / 4, 0.4);
    drumSpot.position.set(-1.0, 1.8, -1.0);
    drumSpot.target = drumMesh;
    drumGroup.add(drumSpot);
    drumGroup.add(drumSpot.target);

    parentGroup.add(drumGroup);
  }

  /**
   * Wooden Wall Shelf with 3D Marching Lemmings (DMA Design 1991) and Big Box Games
   */
  createLemmingsShelf(parentGroup) {
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(0, 1.48, -2.50);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x452312, roughness: 0.6 });

    // 1. Long Wooden Plank
    const plankGeo = new THREE.BoxGeometry(1.55, 0.024, 0.18);
    const plank = new THREE.Mesh(plankGeo, woodMat);
    shelfGroup.add(plank);

    // 2. Brass Support Brackets
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
    [-0.60, 0.60].forEach(bx => {
      const bGeo = new THREE.BoxGeometry(0.02, 0.14, 0.16);
      const bMesh = new THREE.Mesh(bGeo, brassMat);
      bMesh.position.set(bx, -0.07, -0.01);
      shelfGroup.add(bMesh);
    });

    // 3. Cute 3D Marching Lemmings (Blue robe, green hair, peach face)
    const lemmingMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.5 }); // Blue robe
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 }); // Neon green hair
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.4 }); // Peach face

    for (let l = 0; l < 4; l++) {
      const lemGroup = new THREE.Group();
      lemGroup.position.set(-0.45 + (l * 0.18), 0.038, 0.02);

      // Body (Robe)
      const bodyGeo = new THREE.CylinderGeometry(0.012, 0.018, 0.038, 12);
      const body = new THREE.Mesh(bodyGeo, lemmingMat);
      lemGroup.add(body);

      // Head
      const headGeo = new THREE.SphereGeometry(0.013, 12, 12);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 0.024;
      lemGroup.add(head);

      // Green Tuft of Hair
      const hairGeo = new THREE.SphereGeometry(0.012, 8, 8);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, 0.032, -0.003);
      hair.scale.set(1.0, 1.4, 0.9);
      lemGroup.add(hair);

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.002, 6, 6);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.004, 0.025, 0.012);
      lemGroup.add(eyeL);
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(0.004, 0.025, 0.012);
      lemGroup.add(eyeR);

      // Cute accessory: Lemming 0 has tiny umbrella, Lemming 2 has pickaxe
      if (l === 0) {
        const umbGeo = new THREE.ConeGeometry(0.022, 0.015, 12);
        const umbMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
        const umb = new THREE.Mesh(umbGeo, umbMat);
        umb.position.set(0.014, 0.048, 0);
        lemGroup.add(umb);
        const handleGeo = new THREE.CylinderGeometry(0.0015, 0.0015, 0.04, 6);
        const handle = new THREE.Mesh(handleGeo, brassMat);
        handle.position.set(0.014, 0.030, 0);
        lemGroup.add(handle);
      }

      shelfGroup.add(lemGroup);
    }

    // 4. Big Box PC / Amiga Games standing on shelf
    const boxColors = [
      { col: '#1e3a8a', title: 'MONKEY ISLAND 2' },
      { col: '#15803d', title: 'SENSIBLE SOCCER' },
      { col: '#7f1d1d', title: 'DOOM' }
    ];

    boxColors.forEach((b, idx) => {
      const boxGeo = new THREE.BoxGeometry(0.045, 0.12, 0.09);
      const boxMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(b.col), roughness: 0.5 });
      const bMesh = new THREE.Mesh(boxGeo, boxMat);
      bMesh.position.set(0.40 + (idx * 0.06), 0.072, 0);
      bMesh.rotation.y = -0.15;
      shelfGroup.add(bMesh);
    });

    parentGroup.add(shelfGroup);
  }

  createWindow() {
    const winGroup = new THREE.Group();
    winGroup.position.set(-this.roomW / 2 + 0.01, 1.75, -1.2);
    winGroup.rotation.y = Math.PI / 2;

    // Window frame
    const frameGeo = new THREE.BoxGeometry(1.2, 1.1, 0.04);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.6 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    winGroup.add(frame);

    // Night Sky pane (dark indigo with stars)
    const glassGeo = new THREE.PlaneGeometry(1.1, 1.0);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#02040c');
    grad.addColorStop(0.7, '#070b18');
    grad.addColorStop(1, '#131b2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Twinkling stars
    ctx.fillStyle = '#ffffff';
    for (let s = 0; s < 70; s++) {
      const sx = Math.random() * 512;
      const sy = Math.random() * 380;
      const sr = Math.random() * 1.5 + 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Streetlamp warm glow at bottom corner
    const lampGlow = ctx.createRadialGradient(420, 500, 2, 420, 500, 100);
    lampGlow.addColorStop(0, 'rgba(255, 200, 120, 0.6)');
    lampGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = lampGlow;
    ctx.fillRect(320, 400, 200, 112);

    const winTex = new THREE.CanvasTexture(canvas);
    const glassMat = new THREE.MeshBasicMaterial({ map: winTex });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.z = 0.005;
    winGroup.add(glass);

    // Venetian blinds
    for (let b = -0.44; b <= 0.44; b += 0.04) {
      const blindGeo = new THREE.BoxGeometry(1.08, 0.025, 0.005);
      const blindMat = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.3 });
      const blind = new THREE.Mesh(blindGeo, blindMat);
      blind.position.set(0, b, 0.015);
      blind.rotation.x = 0.35;
      winGroup.add(blind);
    }

    this.wallsGroup.add(winGroup);
  }

  initDesk() {
    this.deskStation = new THREE.Group();
    this.deskStation.name = 'DeskStationRig';
    this.deskStation.position.set(0, this.deskHeight, 0);

    this.deskGroup = new THREE.Group();
    this.deskGroup.name = 'RetroDesk';
    this.deskGroup.position.set(0, 0, -0.85);

    const woodTex = RetroTextureUtils.createWoodgrainTexture('#54331a', '#331e0f', '#6e4424');
    const deskMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.55,
      metalness: 0.12
    });

    // 1. Desk Tabletop (1.35m wide x 0.80m deep x 0.04m thick)
    // Tabletop surface sits at local Y = 0
    const topGeo = new THREE.BoxGeometry(this.deskWidth, 0.04, this.deskDepth);
    const topMesh = new THREE.Mesh(topGeo, deskMat);
    topMesh.position.set(0, -0.02, 0);
    topMesh.receiveShadow = true;
    topMesh.castShadow = true;
    this.deskGroup.add(topMesh);

    // 2. Desk Legs / Side Panels
    const sideW = 0.04;
    const sideH = this.deskHeight - 0.04;
    const sideD = this.deskDepth - 0.06;
    const sideGeo = new THREE.BoxGeometry(sideW, sideH, sideD);

    const leftLeg = new THREE.Mesh(sideGeo, deskMat);
    leftLeg.position.set(-this.deskWidth / 2 + sideW / 2 + 0.02, -sideH / 2 - 0.04, 0);
    this.deskGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(sideGeo, deskMat);
    rightLeg.position.set(this.deskWidth / 2 - sideW / 2 - 0.02, -sideH / 2 - 0.04, 0);
    this.deskGroup.add(rightLeg);

    // 3. Modesty Back Panel
    const backGeo = new THREE.BoxGeometry(this.deskWidth - 0.12, sideH * 0.7, 0.02);
    const backPanel = new THREE.Mesh(backGeo, deskMat);
    backPanel.position.set(0, -sideH * 0.35 - 0.04, -this.deskDepth / 2 + 0.04);
    this.deskGroup.add(backPanel);

    // 4. Left-Hand Drawer Pedestal with brass handles
    const drawerGeo = new THREE.BoxGeometry(0.32, sideH * 0.95, sideD);
    const drawerBlock = new THREE.Mesh(drawerGeo, deskMat);
    drawerBlock.position.set(-this.deskWidth / 2 + 0.19, -sideH / 2 - 0.04, 0);
    this.deskGroup.add(drawerBlock);

    // Brass handles
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
    for (let d = 0; d < 3; d++) {
      const handleGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.10, 12);
      handleGeo.rotateZ(Math.PI / 2);
      const handle = new THREE.Mesh(handleGeo, brassMat);
      handle.position.set(-this.deskWidth / 2 + 0.19, -0.15 - (d * 0.15), sideD / 2 + 0.012);
      this.deskGroup.add(handle);
    }

    this.deskStation.add(this.deskGroup);
    this.group.add(this.deskStation);
  }

  initComponents() {
    // 1. Vintage CRT Television (Sitting firmly on the desk)
    this.crtTv = new VintageCrtTv(this.screenTexture);
    // TV base sits on desk top (local Y = 0), placed towards rear of desk (Z = -1.05m)
    this.crtTv.group.position.set(0, 0, -1.05);
    this.deskStation.add(this.crtTv.group);

    // 2. Realistic Sinclair ZX Spectrum Hardware (Supports 48K Rubber Key, +2 Grey Datacorder, +3 Floppy & 128K Toastrack!)
    this.spectrumHardware = new SpectrumHardwareManager(this.spectrum);
    this.spectrumPlus3 = this.spectrumHardware; // Backward compatibility alias
    // Computer sits firmly in front of the TV at comfortable typing reach (Z = -0.68m)
    this.spectrumHardware.group.position.set(0, 0, -0.68);
    this.deskStation.add(this.spectrumHardware.group);

    // 3. Retro Props (Floppy Disks, Cassettes, Joysticks, Game Boy, VHS, CDs, Lava Lamp, Glowsticks)
    this.props = new RetroPropsManager(this.gamesLibrary);
    // Base of props placed on desk surface (local Y = 0)
    this.props.group.position.set(0, 0, 0);
    this.deskStation.add(this.props.group);

    // Gather all interactive objects
    this.rebuildInteractiveObjects();
  }

  setSpectrumModel(model) {
    if (this.spectrumHardware) {
      this.spectrumHardware.setModel(model);
      this.rebuildInteractiveObjects();
    }
  }

  setDeskHeight(h) {
    this.deskHeight = Math.max(0.35, Math.min(1.10, h));
    if (this.deskStation) {
      this.deskStation.position.y = this.deskHeight;
    }
    console.log(`[RetroRoom] Desk height set to ${this.deskHeight.toFixed(2)}m`);
  }

  adjustDeskHeight(delta) {
    this.setDeskHeight(this.deskHeight + delta);
  }

  /**
   * Automatically calibrate desk height relative to headset eye height in VR
   * Places desk surface ~0.42m below headset eye level for optimal seated ergonomics
   */
  autoCalibrateSeatedHeight(headsetY) {
    if (headsetY && headsetY > 0.40 && headsetY < 2.20) {
      const idealDesk = headsetY - 0.42;
      this.setDeskHeight(idealDesk);
      console.log(`[RetroRoom] Auto-calibrated seated desk height to ${this.deskHeight.toFixed(2)}m for eye height ${headsetY.toFixed(2)}m`);
    }
  }

  initLighting() {
    // 1. Warm Cozy Ambient Light for room atmosphere
    this.roomAmbient = new THREE.AmbientLight(0xffecd6, 0.9);
    this.group.add(this.roomAmbient);

    // 2. Gentle Overhead Ceiling Chandelier Fill Light
    this.overheadLight = new THREE.PointLight(0xfff3e0, 1.2, 6.0);
    this.overheadLight.position.set(0, this.roomH - 0.2, -1.0);
    this.group.add(this.overheadLight);
  }

  rebuildInteractiveObjects() {
    this.interactiveObjects = [
      ...this.crtTv.interactiveObjects,
      ...this.spectrumPlus3.interactiveObjects,
      ...this.props.interactiveObjects
    ];
  }

  /**
   * Sets room visibility (can hide walls in Passthrough MR mode while keeping desk & TV)
   */
  setMode(mode) {
    if (mode === 'room') {
      // Full 1990s Retro Room (Walls, Posters, Carpet, Ceiling, Desk, TV, +3)
      this.wallsGroup.visible = true;
      this.deskStation.visible = true;
    } else if (mode === 'desk_mr') {
      // Passthrough MR with Virtual Desk, TV and Speccy in your real room!
      this.wallsGroup.visible = false;
      this.deskStation.visible = true;
    } else if (mode === 'floating_mr') {
      // Passthrough MR floating screen rig only
      this.wallsGroup.visible = false;
      this.deskStation.visible = false;
    }
  }

  /**
   * Frame animation update
   */
  update(isMotorActive, isDiskLoaded) {
    // 1. Update TV dynamic room phosphor glow
    if (this.crtTv && this.spectrum) {
      this.crtTv.updateDynamicGlow(this.spectrum.ula);
    }

    // 2. Update +3 Drive Activity LED & inserted disk
    if (this.spectrumPlus3) {
      this.spectrumPlus3.update(isMotorActive, isDiskLoaded);
    }

    // 3. Update animated props (lava lamp wax blobs)
    if (this.props && this.props.update) {
      this.props.update();
    }
  }
}
