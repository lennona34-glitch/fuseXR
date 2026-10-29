/**
 * Vintage CRT Television Model for Sinclair ZX Spectrum XR
 * Authentic 1980s 14-inch portable colour CRT monitor/TV
 * Features curved tube, faux-woodgrain cabinet, rotary VHF channel dial, volume/tuning knobs,
 * slotted speaker grille, power LED, dual telescopic antennae, and dynamic phosphor room glow!
 */
import * as THREE from 'three';
import { RetroTextureUtils } from './texture-utils.js';

export class VintageCrtTv {
  constructor(screenTexture, options = {}) {
    this.screenTexture = screenTexture;
    this.group = new THREE.Group();
    this.group.name = 'VintageCrtTv';

    this.isOn = true;
    this.currentChannel = 1;
    this.interactiveObjects = [];

    // Screen dimensions (4:3 aspect ratio)
    this.screenWidth = 0.52;
    this.screenHeight = 0.39;

    // Overall TV cabinet dimensions
    this.tvWidth = 0.72;
    this.tvHeight = 0.52;
    this.tvDepth = 0.42;

    this.initModel();
  }

  initModel() {
    // 1. Cabinet Materials
    const woodgrainTex = RetroTextureUtils.createWoodgrainTexture('#4a2e18', '#2e1c0d', '#613d20');
    const cabinetWoodMat = new THREE.MeshStandardMaterial({
      map: woodgrainTex,
      roughness: 0.6,
      metalness: 0.15
    });

    const darkPlasticMat = new THREE.MeshStandardMaterial({
      color: 0x18191f,
      roughness: 0.8,
      metalness: 0.2
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xd0d5dd,
      metalness: 0.95,
      roughness: 0.15
    });

    // 2. Main TV Cabinet Body (Curved back box)
    const bodyGeo = new THREE.BoxGeometry(this.tvWidth, this.tvHeight, this.tvDepth);
    // Use multi-materials: woodgrain on sides/top/bottom, dark plastic on front/back
    const bodyMats = [
      cabinetWoodMat, // right
      cabinetWoodMat, // left
      cabinetWoodMat, // top
      darkPlasticMat, // bottom
      darkPlasticMat, // front (bezel base)
      darkPlasticMat  // back (vent base)
    ];
    this.cabinetMesh = new THREE.Mesh(bodyGeo, bodyMats);
    this.cabinetMesh.position.set(0, this.tvHeight / 2, -this.tvDepth / 2);
    this.cabinetMesh.castShadow = true;
    this.cabinetMesh.receiveShadow = true;
    this.group.add(this.cabinetMesh);

    // 3. Tapered Rear CRT Bell / Housing (The classic deep 80s tube pyramid back)
    const rearGeo = new THREE.CylinderGeometry(0.24, 0.46, 0.22, 16);
    rearGeo.rotateX(Math.PI / 2);
    const rearMat = new THREE.MeshStandardMaterial({
      color: 0x121316,
      roughness: 0.85
    });
    const rearMesh = new THREE.Mesh(rearGeo, rearMat);
    rearMesh.position.set(0, this.tvHeight / 2, -this.tvDepth - 0.10);
    this.group.add(rearMesh);

    // 4. Front Bezel & CRT Screen Mount
    // The screen is positioned on the left side of the front fascia
    const screenCenterOffset = -0.07; // Slightly to the left to leave room for the control panel on right
    
    // Curved CRT Tube Screen Face (Subtle cylinder / sphere curve for authentic retro glass feel)
    const tubeGeo = new THREE.PlaneGeometry(this.screenWidth, this.screenHeight, 16, 12);
    // Invert UV Y coordinates so scanline 0 is at the top
    const uvs = tubeGeo.attributes.uv;
    for (let i = 0; i < uvs.count; i++) {
      uvs.setY(i, 1.0 - uvs.getY(i));
    }
    // Add subtle barrel curvature (convex bulge)
    const pos = tubeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / (this.screenWidth * 0.5);
      const y = pos.getY(i) / (this.screenHeight * 0.5);
      const zCurv = (1.0 - (x * x + y * y) * 0.18) * 0.012;
      pos.setZ(i, zCurv);
    }
    tubeGeo.computeVertexNormals();

    this.screenMaterial = new THREE.MeshBasicMaterial({
      map: this.screenTexture,
      side: THREE.FrontSide
    });
    this.screenMesh = new THREE.Mesh(tubeGeo, this.screenMaterial);
    this.screenMesh.name = 'CrtScreenMesh';
    this.screenMesh.position.set(screenCenterOffset, this.tvHeight / 2, 0.005);
    this.group.add(this.screenMesh);

    // Dark Rounded Bezel Frame around the glass tube
    const bezelBevelGeo = new THREE.BoxGeometry(this.screenWidth + 0.035, this.screenHeight + 0.035, 0.03);
    const bezelBevelMat = new THREE.MeshStandardMaterial({
      color: 0x111215,
      roughness: 0.9,
      metalness: 0.1
    });
    const bezelBevel = new THREE.Mesh(bezelBevelGeo, bezelBevelMat);
    bezelBevel.position.set(screenCenterOffset, this.tvHeight / 2, -0.005);
    this.group.add(bezelBevel);

    // 5. Right-Hand Control Panel & Speaker Fascia
    const ctrlPanelGeo = new THREE.PlaneGeometry(0.18, 0.44);
    const ctrlPanelTex = RetroTextureUtils.createTVControlPanelTexture();
    const ctrlPanelMat = new THREE.MeshStandardMaterial({
      map: ctrlPanelTex,
      roughness: 0.5,
      metalness: 0.3
    });
    const ctrlPanelMesh = new THREE.Mesh(ctrlPanelGeo, ctrlPanelMat);
    const ctrlX = (this.tvWidth / 2) - 0.105;
    ctrlPanelMesh.position.set(ctrlX, this.tvHeight / 2, 0.003);
    this.group.add(ctrlPanelMesh);

    // 6. Interactive 3D Dials & Buttons on the Control Panel
    // A. Rotary VHF Channel Selector Knob (3D raised cylinder)
    const dialGeo = new THREE.CylinderGeometry(0.032, 0.034, 0.022, 24);
    dialGeo.rotateX(Math.PI / 2);
    const dialMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e24,
      metalness: 0.4,
      roughness: 0.4
    });
    this.channelDial = new THREE.Mesh(dialGeo, dialMat);
    this.channelDial.name = 'TvChannelDial';
    this.channelDial.position.set(ctrlX, (this.tvHeight / 2) + 0.115, 0.015);
    this.channelDial.userData = {
      isInteractive: true,
      action: 'clickDial',
      tooltip: 'Rotate VHF Channel Dial'
    };
    this.group.add(this.channelDial);
    this.interactiveObjects.push(this.channelDial);

    // Chrome center cap on dial
    const dialCapGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.024, 16);
    dialCapGeo.rotateX(Math.PI / 2);
    const dialCap = new THREE.Mesh(dialCapGeo, chromeMat);
    dialCap.position.set(ctrlX, (this.tvHeight / 2) + 0.115, 0.016);
    this.group.add(dialCap);

    // B. Power Push Button / Rocker Switch
    const pwrGeo = new THREE.BoxGeometry(0.030, 0.024, 0.018);
    const pwrMat = new THREE.MeshStandardMaterial({
      color: 0xcc2222,
      roughness: 0.4
    });
    this.powerBtn = new THREE.Mesh(pwrGeo, pwrMat);
    this.powerBtn.name = 'TvPowerButton';
    this.powerBtn.position.set(ctrlX - 0.038, (this.tvHeight / 2) - 0.185, 0.012);
    this.powerBtn.userData = {
      isInteractive: true,
      action: 'togglePower',
      tooltip: 'Toggle CRT TV Power'
    };
    this.group.add(this.powerBtn);
    this.interactiveObjects.push(this.powerBtn);

    // C. Glowing Ruby Red Power LED
    const ledGeo = new THREE.SphereGeometry(0.007, 16, 16);
    this.pwrLedMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });
    this.pwrLed = new THREE.Mesh(ledGeo, this.pwrLedMat);
    this.pwrLed.position.set(ctrlX + 0.038, (this.tvHeight / 2) - 0.185, 0.010);
    this.group.add(this.pwrLed);

    // 7. Top Dual Telescopic Antennae (Iconic 80s V-shape rabbit ears!)
    const antennaGroup = new THREE.Group();
    const antennaBaseGeo = new THREE.SphereGeometry(0.018, 16, 16);
    const antBaseL = new THREE.Mesh(antennaBaseGeo, darkPlasticMat);
    antBaseL.position.set(-0.06, this.tvHeight + 0.005, -this.tvDepth * 0.4);
    antennaGroup.add(antBaseL);

    const antBaseR = antBaseL.clone();
    antBaseR.position.x = 0.06;
    antennaGroup.add(antBaseR);

    // Left chrome rod angled 30 deg left, 20 deg back
    const rodGeo = new THREE.CylinderGeometry(0.004, 0.006, 0.48, 12);
    const rodL = new THREE.Mesh(rodGeo, chromeMat);
    rodL.position.set(-0.16, this.tvHeight + 0.22, -this.tvDepth * 0.4 - 0.05);
    rodL.rotation.z = Math.PI / 6;
    rodL.rotation.x = -Math.PI / 12;
    antennaGroup.add(rodL);

    // Right chrome rod angled 30 deg right, 20 deg back
    const rodR = new THREE.Mesh(rodGeo, chromeMat);
    rodR.position.set(0.16, this.tvHeight + 0.22, -this.tvDepth * 0.4 - 0.05);
    rodR.rotation.z = -Math.PI / 6;
    rodR.rotation.x = -Math.PI / 12;
    antennaGroup.add(rodR);

    // Chrome tips on antenna ends
    const tipGeo = new THREE.SphereGeometry(0.009, 12, 12);
    const tipL = new THREE.Mesh(tipGeo, chromeMat);
    tipL.position.set(-0.28, this.tvHeight + 0.42, -this.tvDepth * 0.4 - 0.10);
    antennaGroup.add(tipL);

    const tipR = new THREE.Mesh(tipGeo, chromeMat);
    tipR.position.set(0.28, this.tvHeight + 0.42, -this.tvDepth * 0.4 - 0.10);
    antennaGroup.add(tipR);

    this.group.add(antennaGroup);

    // 8. Dynamic CRT Screen Glow Point Light (Casts realistic flickering tube reflections)
    this.screenLight = new THREE.PointLight(0xaad4ff, 1.8, 2.5);
    this.screenLight.position.set(screenCenterOffset, this.tvHeight / 2, 0.18);
    this.group.add(this.screenLight);

    // 9. Black Coaxial RF Cable looping down from back of TV towards desk
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.15, 0.10, -this.tvDepth - 0.05),
      new THREE.Vector3(0.20, 0.02, -this.tvDepth * 0.8),
      new THREE.Vector3(0.18, 0.01, -0.2),
      new THREE.Vector3(0.08, 0.01, 0.15)
    ]);
    const cableGeo = new THREE.TubeGeometry(curve, 20, 0.006, 8, false);
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0d,
      roughness: 0.7
    });
    this.cableMesh = new THREE.Mesh(cableGeo, cableMat);
    this.group.add(this.cableMesh);
  }

  /**
   * Toggles CRT TV Power state
   */
  togglePower() {
    this.isOn = !this.isOn;
    this.screenMesh.visible = this.isOn;
    this.screenLight.intensity = this.isOn ? 1.8 : 0.0;
    this.pwrLedMat.color.setHex(this.isOn ? 0xff1111 : 0x330000);
    this.powerBtn.position.z = this.isOn ? 0.012 : 0.008;
    console.log(`[CRT-TV] Power: ${this.isOn ? 'ON' : 'OFF'}`);
    return this.isOn;
  }

  /**
   * Rotates the VHF channel dial with click sound
   */
  rotateChannelDial() {
    this.currentChannel = (this.currentChannel % 12) + 1;
    this.channelDial.rotation.z += (Math.PI * 2) / 12;
    console.log(`[CRT-TV] VHF Channel: ${this.currentChannel}`);
    return this.currentChannel;
  }

  /**
   * Updates dynamic glow based on current frame activity
   */
  updateDynamicGlow(ula) {
    if (!this.isOn || !ula) return;
    // Sample border color or center pixels to tint room light realistically
    const borderCol = ula.borderColor || 7;
    // Spectrum palette colors (RGB)
    const pal = [
      0x000000, 0x0000d8, 0xd80000, 0xd800d8,
      0x00d800, 0x00d8d8, 0xd8d800, 0xffffff
    ];
    const hex = pal[borderCol % 8] || 0xffffff;
    this.screenLight.color.setHex(hex);
  }
}
