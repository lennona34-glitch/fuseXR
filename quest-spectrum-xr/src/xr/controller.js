/**
 * Quest 3 Controller & Bluetooth Gamepad Input Manager
 * - Continuous, elegant thin neon blue lasers with dynamic surface collision & glowing reticles
 * - Full button click reliability with instant visual & haptic feedback
 * - Bluetooth Gamepad API integration (Xbox, 8BitDo, PlayStation, generic Bluetooth controllers)
 * - Quest Touch Controllers Kempston Joystick & Screen Manipulator
 */
import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

export class ControllerManager {
  constructor(renderer, scene, screenRig, spatialMenu, virtualKeyboard, spectrum, retroRoom = null) {
    this.renderer = renderer;
    this.scene = scene;
    this.screenRig = screenRig;
    this.spatialMenu = spatialMenu;
    this.virtualKeyboard = virtualKeyboard;
    this.spectrum = spectrum;
    this.retroRoom = retroRoom;

    this.raycaster = new THREE.Raycaster();
    this.tempMatrix = new THREE.Matrix4();

    // Interaction state
    this.activeGrab = null; // { controller, type: 'move'|'scaleHandle', ... }
    this.leftGripController = null;
    this.rightGripController = null;
    this.twoHandInitialDist = null;
    this.twoHandInitialScale = null;

    // Laser rays are ALWAYS visible and active per user preference
    this.lasersEnabled = true;

    // Bluetooth controller key cooldown flags
    this.btKeyCooldownX = false;
    this.btKeyCooldownY = false;
    this.btKeyCooldownStart = false;
    this.btKeyCooldownSelect = false;

    this.initControllers();
  }

  initControllers() {
    this.controllerModelFactory = new XRControllerModelFactory();
    this.controllers = [];
    this.grips = [];
    this.showControllerOverlays = false; // Hidden by default for clean immersion

    const laserLength = 3.0; // 3 meters ensures reaching across any room

    for (let i = 0; i < 2; i++) {
      const controller = this.renderer.xr.getController(i);
      controller.name = `Controller_${i}`;

      // Thin, vibrant neon blue laser pointer ray
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -laserLength)
      ]);
      const rayMat = new THREE.LineBasicMaterial({
        color: 0x00d2ff,
        linewidth: 2,
        transparent: true,
        opacity: 0.85
      });
      const rayLine = new THREE.Line(rayGeo, rayMat);
      rayLine.name = 'RayLine';
      controller.add(rayLine);

      // Glowing reticle ring that snaps to surfaces
      const reticleGeo = new THREE.RingGeometry(0.007, 0.013, 24);
      const reticleMat = new THREE.MeshBasicMaterial({
        color: 0x00d2ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      });
      const reticle = new THREE.Mesh(reticleGeo, reticleMat);
      reticle.position.z = -laserLength;
      controller.add(reticle);

      controller.userData = {
        index: i,
        rayLine: rayLine,
        reticle: reticle,
        hoveredObject: null,
        justClickedUI: false
      };

      // Event listeners for select (Trigger press)
      controller.addEventListener('selectstart', (e) => this.onSelectStart(e.target));
      controller.addEventListener('selectend', (e) => this.onSelectEnd(e.target));

      // Grip listeners
      controller.addEventListener('squeezestart', (e) => this.onSqueezeStart(e.target));
      controller.addEventListener('squeezeend', (e) => this.onSqueezeEnd(e.target));

      this.scene.add(controller);
      this.controllers.push(controller);

      // 3D plastic controller model grip (hidden by default)
      const grip = this.renderer.xr.getControllerGrip(i);
      grip.add(this.controllerModelFactory.createControllerModel(grip));
      grip.visible = this.showControllerOverlays;
      this.scene.add(grip);
      this.grips.push(grip);
    }
  }

  toggleControllerOverlays() {
    this.showControllerOverlays = !this.showControllerOverlays;
    for (const grip of this.grips) {
      grip.visible = this.showControllerOverlays;
    }
    return this.showControllerOverlays;
  }

  toggleLasers() {
    this.lasersEnabled = !this.lasersEnabled;
    this.setLaserVisibility(this.lasersEnabled);
    return this.lasersEnabled;
  }

  setLaserVisibility(visible) {
    for (const c of this.controllers) {
      if (c.userData.rayLine) c.userData.rayLine.visible = visible;
      if (c.userData.reticle) c.userData.reticle.visible = visible;
    }
  }

  triggerHaptic(controller, intensity = 0.6, durationMs = 35) {
    const session = this.renderer.xr.getSession();
    if (!session || !session.inputSources) return;

    for (const source of session.inputSources) {
      if (source.targetRaySpace === controller && source.gamepad && source.gamepad.hapticActuators) {
        const actuator = source.gamepad.hapticActuators[0];
        if (actuator && actuator.pulse) {
          actuator.pulse(intensity, durationMs).catch(() => {});
        }
      }
    }
  }

  raycastAll(controller) {
    controller.updateMatrixWorld(true);
    this.screenRig.group.updateMatrixWorld(true);

    this.tempMatrix.identity().extractRotation(controller.matrixWorld);
    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

    const targets = [
      ...this.spatialMenu.interactiveButtons,
      ...this.virtualKeyboard.interactiveKeys,
      ...this.screenRig.interactiveObjects,
      ...(this.retroRoom ? this.retroRoom.interactiveObjects : [])
    ];

    return this.raycaster.intersectObjects(targets, false);
  }

  onSelectStart(controller) {
    this.spectrum.audio.unlock();

    controller.updateMatrixWorld(true);
    this.screenRig.group.updateMatrixWorld(true);
    if (this.retroRoom) this.retroRoom.group.updateMatrixWorld(true);

    // Raycast against all interactive targets
    const hits = this.raycastAll(controller);
    if (hits.length === 0) return;

    const hit = hits[0].object;
    controller.userData.justClickedUI = true;
    setTimeout(() => { controller.userData.justClickedUI = false; }, 200);

    // If controller is already holding a prop, clicking Trigger releases / inserts it!
    if (controller.userData && controller.userData.heldProp) {
      this.releaseProp(controller);
      return;
    }

    // 0. Retro Room Props (Floppy Disks, Cassettes, Lamp, Joystick)
    if (hit.userData.isInteractiveProp && this.retroRoom) {
      const pType = hit.userData.propType;
      // Allow grabbing Floppy Disks and Cassette Tapes directly via Trigger!
      if (pType === 'floppy' || pType === 'cassette' || pType === 'music_tape') {
        const targetProp = hit.userData.parentGroup || hit;
        this.grabProp(controller, targetProp);
        return;
      }
      this.retroRoom.props.handlePropClick(hit);
      return;
    }

    // 0b. 3D Spectrum Keyboard Keys
    if (hit.userData.isSpeccyKey && this.retroRoom) {
      if (this.retroRoom.spectrumHardware) {
        this.retroRoom.spectrumHardware.pressKey(hit.userData.keyId);
      } else if (this.retroRoom.spectrumPlus3) {
        this.retroRoom.spectrumPlus3.pressKey(hit.userData.keyId);
      }
      return;
    }

    // 0c. Vintage CRT TV actions
    if (hit.userData.action === 'togglePower' && this.retroRoom) {
      this.retroRoom.crtTv.togglePower();
      return;
    }
    if (hit.userData.action === 'clickDial' && this.retroRoom) {
      this.retroRoom.crtTv.rotateChannelDial();
      return;
    }
    if (hit.userData.action === 'ejectDisk') {
      if (this.spectrum.ejectDisk) this.spectrum.ejectDisk();
      return;
    }

    // 0d. Bezel quick action buttons on screen frame
    if (hit.userData.isBezelButton) {
      const action = hit.userData.action;
      if (action === 'pressEnter') {
        this.spectrum.handleKeyEvent('enter', true);
        setTimeout(() => this.spectrum.handleKeyEvent('enter', false), 150);
      } else if (action === 'press1') {
        this.spectrum.handleKeyEvent('1', true);
        setTimeout(() => this.spectrum.handleKeyEvent('1', false), 150);
      } else if (action === 'pressSpace') {
        this.spectrum.handleKeyEvent(' ', true);
        setTimeout(() => this.spectrum.handleKeyEvent(' ', false), 150);
      } else if (action === 'recenter') {
        this.recenterScreen();
      }
      return;
    }

    // 1. Spatial Menu buttons
    if (hit.userData.isButton) {
      this.spatialMenu.handleButtonPress(hit);
      return;
    }

    // 2. Rubber Keyboard keys
    if (hit.userData.isKey) {
      this.virtualKeyboard.pressKey(hit);
      return;
    }

    // 3. Screen corner scale handles (Outward / Inward drag projection)
    if (hit.userData.isScaleHandle) {
      const controllerWorldPos = new THREE.Vector3();
      controller.getWorldPosition(controllerWorldPos);
      const screenWorldPos = this.screenRig.group.position;

      this.activeGrab = {
        controller: controller,
        type: 'scaleHandle',
        handle: hit,
        initialControllerPos: controllerWorldPos.clone(),
        initialScreenDist: controllerWorldPos.distanceTo(screenWorldPos),
        initialScale: this.screenRig.scaleFactor
      };
      return;
    }

    // 4. Bottom Grab Bar
    if (hit.userData.isGrabBar) {
      const controllerWorldPos = new THREE.Vector3();
      controller.getWorldPosition(controllerWorldPos);

      this.activeGrab = {
        controller: controller,
        type: 'move',
        offset: new THREE.Vector3().subVectors(this.screenRig.group.position, controllerWorldPos)
      };
      return;
    }
  }

  onSelectEnd(controller) {
    if (this.activeGrab && this.activeGrab.controller === controller) {
      this.activeGrab = null;
    }
    this.virtualKeyboard.releaseKey();
  }

  grabProp(controller, targetProp) {
    if (!targetProp || !targetProp.userData) return;
    const u = targetProp.userData;

    // Release any already held prop in this controller
    if (controller.userData && controller.userData.heldProp) {
      this.releaseProp(controller);
    }

    controller.userData.heldProp = {
      group: targetProp,
      parent: targetProp.parent,
      hitMesh: u.hitMesh,
      gameData: u.gameData || u.albumData,
      propType: u.propType,
      originalPos: targetProp.position.clone(),
      originalRot: targetProp.rotation.clone()
    };

    // Attach to controller hand with comfortable reading tilt
    controller.attach(targetProp);
    targetProp.position.set(0, -0.015, -0.09);
    targetProp.rotation.set(-Math.PI / 4, 0, 0);

    this.triggerHaptic(controller, 0.8, 50);
    const title = u.gameData?.title || u.albumData?.album || 'Prop';
    console.log(`[VR Grab] Picked up ${u.propType}: ${title}`);
  }

  releaseProp(controller) {
    if (!controller.userData || !controller.userData.heldProp) return;
    const held = controller.userData.heldProp;
    const controllerWorldPos = new THREE.Vector3();
    controller.getWorldPosition(controllerWorldPos);

    let wasInserted = false;

    // Check if inserted near the +3 disk drive or the computer
    const hardware = this.retroRoom?.spectrumHardware || this.retroRoom?.spectrumPlus3;
    if (hardware) {
      const driveSlot = hardware.driveSlot;
      const slotWorldPos = new THREE.Vector3();
      if (driveSlot) driveSlot.getWorldPosition(slotWorldPos);

      const speccyWorldPos = new THREE.Vector3();
      if (hardware.group) hardware.group.getWorldPosition(speccyWorldPos);

      const distToDrive = driveSlot ? controllerWorldPos.distanceTo(slotWorldPos) : 999;
      const distToSpeccy = controllerWorldPos.distanceTo(speccyWorldPos);

      if (held.propType === 'floppy' && distToDrive < 0.28) {
        // Insert disk into +3 drive
        console.log(`[VR Drive] Inserted floppy disk: ${held.gameData?.title} into +3 drive slot!`);
        this.triggerHaptic(controller, 1.0, 95);
        if (held.hitMesh && this.retroRoom?.props) {
          this.retroRoom.props.handlePropClick(held.hitMesh);
        }
        wasInserted = true;
      } else if ((held.propType === 'cassette' || held.propType === 'music_tape') && distToSpeccy < 0.38) {
        // Load cassette tape
        console.log(`[VR Tape] Loaded cassette tape: ${held.gameData?.title || held.gameData?.album}`);
        this.triggerHaptic(controller, 1.0, 95);
        if (held.hitMesh && this.retroRoom?.props) {
          this.retroRoom.props.handlePropClick(held.hitMesh);
        }
        wasInserted = true;
      }
    }

    // Return prop cleanly to its original parent
    if (held.parent) {
      held.parent.attach(held.group);
      held.group.position.copy(held.originalPos);
      held.group.rotation.copy(held.originalRot);
    }

    if (!wasInserted) {
      this.triggerHaptic(controller, 0.4, 25);
    }

    controller.userData.heldProp = null;
  }

  onSqueezeStart(controller) {
    this.spectrum.audio.unlock();
    const controllerWorldPos = new THREE.Vector3();
    controller.getWorldPosition(controllerWorldPos);

    // 1. VR Physical Prop Grab (Floppy Disks, Cassette Tapes & Music Tapes)
    if (this.retroRoom && this.retroRoom.props) {
      const grabbables = this.retroRoom.props.getGrabbables();
      let targetProp = null;
      let minDist = 0.38; // Extended reach grab radius (38cm)

      // Direct hand proximity check
      for (const g of grabbables) {
        const propWorldPos = new THREE.Vector3();
        g.getWorldPosition(propWorldPos);
        const dist = controllerWorldPos.distanceTo(propWorldPos);
        if (dist < minDist) {
          minDist = dist;
          targetProp = g;
        }
      }

      // If not within hand reach, check raycast laser target
      if (!targetProp) {
        const hits = this.raycastAll(controller);
        if (hits.length > 0) {
          const hitObj = hits[0].object;
          if (hitObj.userData && hitObj.userData.parentGroup && hitObj.userData.parentGroup.userData?.isGrabbableGroup) {
            targetProp = hitObj.userData.parentGroup;
          } else if (hitObj.userData && hitObj.userData.isInteractiveProp) {
            targetProp = hitObj.userData.parentGroup || hitObj;
          }
        }
      }

      // If a disk or tape was grabbed:
      if (targetProp) {
        this.grabProp(controller, targetProp);
        return;
      }
    }

    // 2. Only allow screen manipulation when in floating screen modes (NOT in Retro Room)
    if (this.retroRoom && this.retroRoom.wallsGroup.visible) {
      // In 1990s Retro Room mode: No open-air screen dragging! Room stays rock-solid!
      return;
    }

    if (!this.leftGripController) {
      this.leftGripController = controller;
    } else if (!this.rightGripController && this.leftGripController !== controller) {
      this.rightGripController = controller;
    }

    // If both grips squeezed in floating MR -> Two-handed pinch-to-scale mode
    if (this.leftGripController && this.rightGripController) {
      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      this.leftGripController.getWorldPosition(p1);
      this.rightGripController.getWorldPosition(p2);
      this.twoHandInitialDist = p1.distanceTo(p2);
      this.twoHandInitialScale = this.screenRig.scaleFactor;
      this.activeGrab = null;
      return;
    }
  }

  onSqueezeEnd(controller) {
    if (this.leftGripController === controller) this.leftGripController = null;
    if (this.rightGripController === controller) this.rightGripController = null;
    this.twoHandInitialDist = null;

    if (this.activeGrab && this.activeGrab.controller === controller) {
      this.activeGrab = null;
    }

    // Release held prop (Floppy Disk or Cassette Tape)
    if (controller.userData && controller.userData.heldProp) {
      this.releaseProp(controller);
    }
  }

  // Bluetooth Gamepad API polling (Xbox, 8BitDo, PlayStation, generic Bluetooth controllers)
  pollBluetoothGamepad() {
    // Only poll directly here during active WebXR sessions; on PC desktop, App.pollPCGamepad() polls at 60Hz
    if (!this.renderer.xr.isPresenting) return;
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (!gp || !gp.connected) continue;

      const id = (gp.id || '').toLowerCase();
      if (id.includes('oculus') || id.includes('meta quest') || id.includes('spatial') || gp.hand) {
        continue;
      }

      this.applyRemoteGamepad({
        axes: [gp.axes[0] || 0, gp.axes[1] || 0],
        buttons: gp.buttons.map(b => (typeof b === 'object' ? (b.pressed || b.value > 0.35) : !!b))
      }, 'gamepad');
      break;
    }
  }

  applyRemoteGamepad(gp, source = 'gamepad') {
    if (!gp) return;

    const stickX = (gp.axes && gp.axes.length > 0) ? gp.axes[0] : 0;
    const stickY = (gp.axes && gp.axes.length > 1) ? gp.axes[1] : 0;
    const btns = gp.buttons || [];

    const dpadUp    = !!btns[12] || !!(gp.directional && gp.directional.up);
    const dpadDown  = !!btns[13] || !!(gp.directional && gp.directional.down);
    const dpadLeft  = !!btns[14] || !!(gp.directional && gp.directional.left);
    const dpadRight = !!btns[15] || !!(gp.directional && gp.directional.right);

    const up    = dpadUp    || stickY < -0.35;
    const down  = dpadDown  || stickY > 0.35;
    const left  = dpadLeft  || stickX < -0.35;
    const right = dpadRight || stickX > 0.35;

    // Primary Fire triggers: A/Cross (0), B/Circle (1), X/Square (2), RB (5), RT (7) or explicit gp.fire
    const fire = !!(gp.fire || btns[0] || btns[1] || btns[2] || btns[5] || btns[7]);

    if ((up || down || left || right || fire || btns.some(Boolean)) && !this.spectrum.audio.hasUserInteracted) {
      this.spectrum.audio.unlock();
    }

    // 1. Always update Kempston hardware port (0x1F) using dedicated source slot so it never overwrites keyboard
    this.spectrum.setKempston(right, left, down, up, fire, source);

    // 2. Map directional & fire inputs to keyboard layouts based on active controlMode
    const mode = this.controlMode || 'kempston';
    if (this.lastMappedMode && this.lastMappedMode !== mode) {
      // Cleanly release any directional keys held under previous mode
      const prevKeys = ['5', '6', '7', '8', '9', '0', '1', '2', '3', '4', 'q', 'a', 'o', 'p', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
      for (const pk of prevKeys) this.spectrum.handleKeyEvent(pk, false);
      this.prevLeft = false;
      this.prevRight = false;
      this.prevDown = false;
      this.prevUp = false;
      this.prevFire = false;
    }
    this.lastMappedMode = mode;

    const syncDirectionalMap = (map) => {
      if (left !== !!this.prevLeft)   { this.spectrum.handleKeyEvent(map.left, left);   this.prevLeft = left; }
      if (right !== !!this.prevRight) { this.spectrum.handleKeyEvent(map.right, right); this.prevRight = right; }
      if (down !== !!this.prevDown)   { this.spectrum.handleKeyEvent(map.down, down);   this.prevDown = down; }
      if (up !== !!this.prevUp)       { this.spectrum.handleKeyEvent(map.up, up);       this.prevUp = up; }
      if (map.fire && fire !== !!this.prevFire) {
        this.spectrum.handleKeyEvent(map.fire, fire);
        this.prevFire = fire;
      }
    };

    if (mode === 'sinclair1') {
      syncDirectionalMap({ left: '6', right: '7', down: '8', up: '9', fire: '0' });
    } else if (mode === 'sinclair2') {
      syncDirectionalMap({ left: '1', right: '2', down: '3', up: '4', fire: '5' });
    } else if (mode === 'cursor') {
      syncDirectionalMap({ left: '5', down: '6', up: '7', right: '8', fire: '0' });
    } else if (mode === 'qaop') {
      syncDirectionalMap({ up: 'q', down: 'a', left: 'o', right: 'p', fire: ' ' });
    } else if (mode === 'universal') {
      // Universal mode: simultaneously drives Kempston (0x1F) + QAOP + Cursor (5/6/7/8/0)
      if (left !== !!this.prevLeft)   { this.spectrum.handleKeyEvent('o', left);  this.spectrum.handleKeyEvent('5', left);  this.prevLeft = left; }
      if (right !== !!this.prevRight) { this.spectrum.handleKeyEvent('p', right); this.spectrum.handleKeyEvent('8', right); this.prevRight = right; }
      if (down !== !!this.prevDown)   { this.spectrum.handleKeyEvent('a', down);  this.spectrum.handleKeyEvent('6', down);  this.prevDown = down; }
      if (up !== !!this.prevUp)       { this.spectrum.handleKeyEvent('q', up);    this.spectrum.handleKeyEvent('7', up);    this.prevUp = up; }
      if (fire !== !!this.prevFire)   { this.spectrum.handleKeyEvent(' ', fire);  this.spectrum.handleKeyEvent('0', fire);  this.prevFire = fire; }
    } else {
      // In Kempston mode: when in the 128K/+3 ROM boot menu (PC < 0x4000), let Up/Down navigate the ROM menu!
      const inRomMenu = this.spectrum.cpu && this.spectrum.cpu.pc < 0x4000;
      const menuUp = inRomMenu && up;
      const menuDown = inRomMenu && down;
      if (menuUp !== !!this.prevMenuUp) {
        this.spectrum.handleKeyEvent('arrowup', menuUp);
        this.prevMenuUp = menuUp;
      }
      if (menuDown !== !!this.prevMenuDown) {
        this.spectrum.handleKeyEvent('arrowdown', menuDown);
        this.prevMenuDown = menuDown;
      }
    }

    // Button 1 (B / Circle): Spectrum '0' key (Start game / Fire in Cursor & Sinclair)
    if (btns[1] !== undefined && !!btns[1] !== !!this.prevBtn1) {
      this.spectrum.handleKeyEvent('0', !!btns[1]);
      this.prevBtn1 = !!btns[1];
    }

    // Button 2 (X / Square): Spectrum Space key
    if (btns[2] !== undefined && !!btns[2] !== !!this.prevBtn2) {
      this.spectrum.handleKeyEvent(' ', !!btns[2]);
      this.prevBtn2 = !!btns[2];
    }

    // Button 3 (Y / Triangle): Spectrum '1' key (Option 1 / 1-Player Start)
    if (btns[3] !== undefined && !!btns[3] !== !!this.prevBtn3) {
      this.spectrum.handleKeyEvent('1', !!btns[3]);
      this.prevBtn3 = !!btns[3];
    }

    // Button 4 (LB / L1): Spectrum '2' key (Option 2 / Select Kempston Joystick in game menus!)
    if (btns[4] !== undefined && !!btns[4] !== !!this.prevBtn4) {
      this.spectrum.handleKeyEvent('2', !!btns[4]);
      this.prevBtn4 = !!btns[4];
    }

    // Button 6 (LT / L2): Spectrum '3' key (Option 3 / Select Sinclair/Cursor in game menus!)
    if (btns[6] !== undefined && !!btns[6] !== !!this.prevBtn6) {
      this.spectrum.handleKeyEvent('3', !!btns[6]);
      this.prevBtn6 = !!btns[6];
    }

    // Button 9 (Start / Options): Spectrum Enter key (Launches +3/128K Loader & starts games)
    if (btns[9] !== undefined && !!btns[9] !== !!this.prevBtn9) {
      this.spectrum.handleKeyEvent('enter', !!btns[9]);
      this.prevBtn9 = !!btns[9];
    }

    // Button 8 (Select / Share / Back): Spectrum '1' key on PC, or Recenter Screen in VR
    if (this.renderer.xr.isPresenting) {
      if (btns[8] && !this.btKeyCooldownSelect) {
        this.recenterScreen();
        this.btKeyCooldownSelect = true;
        setTimeout(() => { this.btKeyCooldownSelect = false; }, 450);
      }
    } else if (btns[8] !== undefined && !!btns[8] !== !!this.prevBtn8) {
      this.spectrum.handleKeyEvent('1', !!btns[8]);
      this.prevBtn8 = !!btns[8];
    }
  }

  // Main loop called every frame
  update() {
    const session = this.renderer.xr.getSession();

    // 1. Two-Handed Grip Pinch-to-Scale
    if (this.leftGripController && this.rightGripController && this.twoHandInitialDist) {
      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      this.leftGripController.getWorldPosition(p1);
      this.rightGripController.getWorldPosition(p2);
      const curDist = p1.distanceTo(p2);
      const ratio = curDist / Math.max(0.05, this.twoHandInitialDist);
      this.screenRig.setScale(this.twoHandInitialScale * ratio);
    }
    // 2. Single Grab Move or Handle Scale
    else if (this.activeGrab) {
      const c = this.activeGrab.controller;
      const cPos = new THREE.Vector3();
      c.getWorldPosition(cPos);

      if (this.activeGrab.type === 'move') {
        this.screenRig.group.position.copy(cPos).add(this.activeGrab.offset);
      } else if (this.activeGrab.type === 'scaleHandle') {
        const screenPos = this.screenRig.group.position;
        const curDist = cPos.distanceTo(screenPos);
        const ratio = curDist / Math.max(0.1, this.activeGrab.initialScreenDist);
        this.screenRig.setScale(this.activeGrab.initialScale * ratio);
      }
    }

    // 3. Dynamic Laser Ray Collision & Hover Highlighting
    if (this.lasersEnabled) {
      for (const controller of this.controllers) {
        const rayLine = controller.userData.rayLine;
        const reticle = controller.userData.reticle;
        if (!rayLine || !reticle) continue;

        const hits = this.raycastAll(controller);
        let hitDist = 3.0;
        let newHovered = null;

        if (hits.length > 0) {
          hitDist = hits[0].distance;
          newHovered = hits[0].object;
        }

        // Adjust laser ray length dynamically to end right on the surface!
        rayLine.scale.z = hitDist / 3.0;
        reticle.position.z = -hitDist + 0.002;

        const prevHovered = controller.userData.hoveredObject;

        // Hover state change
        if (newHovered !== prevHovered) {
          if (prevHovered && prevHovered.userData && prevHovered.userData.setHovered) {
            prevHovered.userData.setHovered(false);
          }
          if (newHovered && newHovered.userData && newHovered.userData.setHovered) {
            newHovered.userData.setHovered(true);
            this.triggerHaptic(controller, 0.25, 15); // subtle hover tick
          }
          controller.userData.hoveredObject = newHovered;
        }

        // Reticle color feedback
        if (newHovered) {
          reticle.material.color.setHex(0x00ff88); // bright neon green when targeting button
          reticle.material.opacity = 1.0;
        } else {
          reticle.material.color.setHex(0x00d2ff); // bright cyan in open space
          reticle.material.opacity = 0.75;
        }
      }
    }

    // 4. Quest Touch Controller Gamepad Polling
    if (session && session.inputSources) {
      for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        const gp = source.gamepad;
        const hand = source.handedness || 'right';

        const stickX = gp.axes.length >= 2 ? (gp.axes[2] !== undefined ? gp.axes[2] : gp.axes[0]) : 0;
        const stickY = gp.axes.length >= 2 ? (gp.axes[3] !== undefined ? gp.axes[3] : gp.axes[1]) : 0;

        // A. Left Controller: Seated Desk Height (in Retro Room) OR Screen Zoom (in Floating MR)
        if (hand === 'left') {
          const isRoomMode = this.retroRoom && this.retroRoom.wallsGroup && this.retroRoom.wallsGroup.visible;
          if (isRoomMode) {
            // Smooth ergonomic desk height adjustment for seated Quest users!
            if (Math.abs(stickY) > 0.22) {
              const delta = -stickY * 0.005;
              this.retroRoom.adjustDeskHeight(delta);
            }
          } else if (Math.abs(stickY) > 0.18) {
            this.screenRig.adjustScaleDelta(-stickY * 0.015);
          }
        }

        // B. Right Controller: Kempston Joystick & Spectrum Buttons
        if (hand === 'right') {
          const right = stickX > 0.45;
          const left  = stickX < -0.45;
          const down  = stickY > 0.45;
          const up    = stickY < -0.45;

          // Only fire Kempston from trigger if NOT clicking a UI button!
          const controllerObj = this.controllers[1];
          const isTargetingUI = controllerObj && controllerObj.userData && (controllerObj.userData.hoveredObject || controllerObj.userData.justClickedUI);

          const fireBtn = (gp.buttons[4] && gp.buttons[4].pressed); // A button = Fire
          const triggerFire = !isTargetingUI && (gp.buttons[0] && gp.buttons[0].pressed); // Trigger when not on UI
          const fire = fireBtn || triggerFire;

          if ((right || left || down || up || fire) && !this.spectrum.audio.hasUserInteracted) {
            this.spectrum.audio.unlock();
          }
          this.spectrum.setKempston(right, left, down, up, fire, 'xr');

          // B Button (button 5) = Spectrum Space / Jump Key (Cleanly mapped, never triggers screen recenter!)
          const btnB = (gp.buttons[5] && gp.buttons[5].pressed);
          if (btnB !== this.prevQuestBtnB) {
            this.spectrum.handleKeyEvent(' ', btnB);
            this.prevQuestBtnB = btnB;
          }
        }
      }
    }

    // 4b. Proximity Haptic Tick when holding floppy disk near the +3 drive slot
    for (const controller of this.controllers) {
      if (controller.userData && controller.userData.heldProp) {
        const held = controller.userData.heldProp;
        if (held.propType === 'floppy' && this.retroRoom && this.retroRoom.spectrumPlus3) {
          const driveSlot = this.retroRoom.spectrumPlus3.driveSlot;
          const slotPos = new THREE.Vector3();
          driveSlot.getWorldPosition(slotPos);
          const cPos = new THREE.Vector3();
          controller.getWorldPosition(cPos);
          const dist = cPos.distanceTo(slotPos);
          if (dist < 0.16 && !controller.userData.slotHapticTickSent) {
            this.triggerHaptic(controller, 0.45, 20); // Magnetic snap haptic tick!
            controller.userData.slotHapticTickSent = true;
          } else if (dist >= 0.18) {
            controller.userData.slotHapticTickSent = false;
          }
        }
      }
    }

    // 5. Bluetooth Gamepad Polling (Xbox, 8BitDo, PS4/PS5, generic gamepad)
    this.pollBluetoothGamepad();
  }

  recenterScreen() {
    if (!this.renderer.xr.isPresenting) return;
    // In room mode, the vintage CRT TV sits firmly on the desk - never shift screen rig
    if (this.retroRoom && this.retroRoom.wallsGroup && this.retroRoom.wallsGroup.visible) {
      return;
    }

    const xrCam = this.renderer.xr.getCamera();
    xrCam.updateMatrixWorld(true);
    const headPos = new THREE.Vector3();
    const headDir = new THREE.Vector3();

    xrCam.getWorldPosition(headPos);
    xrCam.getWorldDirection(headDir);

    headDir.y = 0;
    if (headDir.lengthSq() < 0.001) headDir.set(0, 0, -1);
    headDir.normalize();

    // Place screen at comfortable 1.35m distance in front of view
    const targetPos = headPos.clone().addScaledVector(headDir, 1.35);
    targetPos.y = Math.max(1.1, headPos.y);

    this.screenRig.group.position.copy(targetPos);
    this.screenRig.group.lookAt(headPos.x, targetPos.y, headPos.z);
    console.log('[ControllerManager] Screen station recentered in front of headset at', targetPos);
  }
}
