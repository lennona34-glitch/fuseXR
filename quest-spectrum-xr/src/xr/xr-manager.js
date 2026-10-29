/**
 * WebXR Manager for Meta Quest 3
 * - Supports seamless switching between Mixed Reality (Passthrough) & Immersive VR
 * - Automatically configures Quest 3 color passthrough and local-floor tracking
 */
import * as THREE from 'three';

export class XRManager {
  constructor(renderer, scene, camera, screenRig, retroRoom = null, onSessionStart = null) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.screenRig = screenRig;
    this.retroRoom = retroRoom;
    this.onSessionStart = onSessionStart;

    this.currentMode = 'room'; // 'room' (80s Retro Room), 'ar' (Passthrough MR), 'desk_mr', 'void'
    this.currentSession = null;

    // Void environment mesh for Immersive VR mode
    this.initVoidEnvironment();
  }

  initVoidEnvironment() {
    this.voidGroup = new THREE.Group();
    this.voidGroup.name = 'VoidEnvironment';

    // 1. Dark solid floor
    const solidFloorGeo = new THREE.PlaneGeometry(40, 40);
    solidFloorGeo.rotateX(-Math.PI / 2);
    const solidFloorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b12,
      roughness: 0.8,
      metalness: 0.2
    });
    const solidFloor = new THREE.Mesh(solidFloorGeo, solidFloorMat);
    solidFloor.position.y = -0.01;
    this.voidGroup.add(solidFloor);

    // 2. Glowing retro grid floor (visible cyan grid)
    const gridHelper = new THREE.GridHelper(40, 40, 0x00d2ff, 0x1f2838);
    gridHelper.position.y = 0.001;
    this.voidGroup.add(gridHelper);

    // 3. Ambient & Directional Lights for entire scene (visible in both MR & VR)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(2, 5, 3);
    this.scene.add(dirLight);

    // Subtle blue spotlight illuminating the VR floor in VR mode
    const spotLight = new THREE.SpotLight(0x00d2ff, 1.5, 10, Math.PI / 3, 0.5);
    spotLight.position.set(0, 4, 0);
    spotLight.target.position.set(0, 0, -1.4);
    this.voidGroup.add(spotLight);
    this.voidGroup.add(spotLight.target);

    this.scene.add(this.voidGroup);
    this.voidGroup.visible = false;
  }

  setMode(mode) {
    if (mode === 'vr') mode = 'room'; // Map 'vr' to 'room' environment
    this.currentMode = mode;

    if (mode === 'room') {
      // Full 1990s Retro Room with TV, Speccy microcomputer, desk, wallpaper, posters, Sgt Pepper & carpet
      this.renderer.setClearColor(0x0a0b12, 1.0);
      this.scene.background = new THREE.Color(0x0a0b12);
      if (this.retroRoom) this.retroRoom.setMode('room');
      this.voidGroup.visible = false;
      if (this.screenRig) this.screenRig.group.visible = false;
      console.log('[XRManager] Switched to 1990s Retro Room Environment');
    } else if (mode === 'desk_mr') {
      // Passthrough MR: Real room with Virtual Desk, CRT TV & Speccy +3
      this.renderer.setClearColor(0x000000, 0.0);
      this.scene.background = null;
      if (this.retroRoom) this.retroRoom.setMode('desk_mr');
      this.voidGroup.visible = false;
      if (this.screenRig) this.screenRig.group.visible = false;
      console.log('[XRManager] Switched to Desk Mixed Reality Mode');
    } else if (mode === 'ar') {
      // Passthrough MR: Floating clean screen rig
      this.renderer.setClearColor(0x000000, 0.0);
      this.scene.background = null;
      if (this.retroRoom) this.retroRoom.setMode('floating_mr');
      this.voidGroup.visible = false;
      if (this.screenRig) this.screenRig.group.visible = true;
      console.log('[XRManager] Switched to Floating Mixed Reality (Passthrough) Mode');
    } else if (mode === 'void') {
      // Minimalist Cyan Grid Void
      this.renderer.setClearColor(0x08090f, 1.0);
      this.scene.background = new THREE.Color(0x08090f);
      if (this.retroRoom) this.retroRoom.setMode('floating_mr');
      this.voidGroup.visible = true;
      if (this.screenRig) this.screenRig.group.visible = true;
      console.log('[XRManager] Switched to Cyber Grid Void Mode');
    }
  }

  toggleMode() {
    const modes = ['room', 'desk_mr', 'ar', 'void'];
    const idx = modes.indexOf(this.currentMode);
    const nextMode = modes[(idx + 1) % modes.length];
    this.setMode(nextMode);
    return nextMode;
  }

  async startSession(mode = 'ar') {
    if (!navigator.xr) {
      alert('WebXR is not supported on this browser. Open this page in Meta Quest Browser on your Quest 3!');
      return;
    }

    const sessionType = (mode === 'ar') ? 'immersive-ar' : 'immersive-vr';

    try {
      const supported = await navigator.xr.isSessionSupported(sessionType);
      if (!supported) {
        console.warn(`${sessionType} not supported, falling back to other mode`);
        return this.startSession(mode === 'ar' ? 'vr' : 'ar');
      }

      const sessionInit = {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers']
      };

      const session = await navigator.xr.requestSession(sessionType, sessionInit);
      this.currentSession = session;

      // Request 90Hz or 120Hz display refresh on Quest 3 Snapdragon XR2 Gen 2
      if (session.supportedFrameRates) {
        try {
          const rates = Array.from(session.supportedFrameRates);
          if (rates.includes(90)) {
            await session.updateTargetFrameRate(90);
            console.log('[XRManager] Target frame rate set to 90Hz');
          } else if (rates.includes(72)) {
            await session.updateTargetFrameRate(72);
          }
        } catch (e) {
          console.warn('[XRManager] Could not update target frame rate:', e);
        }
      }

      // CRITICAL: Set WebXR Reference Space to 'local-floor' so physical floor is y=0
      // Without this, Three.js defaults to 'local' (y=0 at eye level), placing user under desk!
      try {
        await this.renderer.xr.setReferenceSpaceType('local-floor');
        console.log('[XRManager] Configured WebXR reference space: local-floor');
      } catch (refErr) {
        console.warn('[XRManager] local-floor reference space request error, falling back:', refErr);
      }

      this.setMode(mode);

      await this.renderer.xr.setSession(session);

      if (this.onSessionStart) {
        this.onSessionStart(mode);
      }

      session.addEventListener('end', () => {
        this.currentSession = null;
        console.log('WebXR session ended');
      });

      console.log(`Started ${sessionType} session on Meta Quest 3`);
    } catch (err) {
      console.error('Error starting WebXR session:', err);
      // Fallback attempt to the other mode if one failed
      if (mode === 'ar') {
        console.log('Attempting fallback to immersive-vr...');
        this.startSession('vr');
      }
    }
  }

  endSession() {
    if (this.currentSession) {
      this.currentSession.end();
    }
  }
}
