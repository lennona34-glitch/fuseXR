/**
 * Interactive 1980s Retro Desk Props:
 * - 3-Inch Compact Floppy Disks (CF2 format with authentic Amsoft labels)
 * - Smoky Acrylic Floppy Disk Caddy Box
 * - Audio Cassette Tapes with dual spools & tape window
 * - Classic Retro Competition Pro Joystick (animated handle)
 * - Articulated Anglepoise Desk Lamp with warm tungsten spotlight
 * - Ceramic Coffee/Tea Mug with Sinclair logo
 * - Stack of Crash & Sinclair User Magazines
 */
import * as THREE from 'three';
import { RetroTextureUtils } from './texture-utils.js';

export class RetroPropsManager {
  constructor(gamesLibrary, options = {}) {
    this.gamesLibrary = gamesLibrary;
    this.group = new THREE.Group();
    this.group.name = 'RetroDeskProps';

    this.interactiveObjects = [];
    this.disks = [];
    this.tapes = [];

    this.initProps();
  }

  initProps() {
    // 1. 3-Inch Compact Floppy Disks (CF2) on the desk
    this.createFloppyDisks();

    // 2. Audio Cassette Tapes on the desk
    this.createCassetteTapes();

    // 2b. Iconic Music Cassette Tapes (The Beatles & Public Enemy)
    this.createMusicCassettes();

    // 3. Classic 80s Competition Pro Joystick & Crumpled Receipt
    this.createRetroJoystick();

    // 3b. Iconic Konix Speedking Handheld Joystick!
    this.createKonixSpeedking();

    // 4. Anglepoise Articulated Desk Lamp
    this.createDeskLamp();

    // 5. Stack of 80s Computer Magazines (Crash, Sinclair User)
    this.createMagazineStack();

    // 6. Ceramic Sinclair Coffee Mug
    this.createMug();

    // 7. Nintendo Game Boy (DMG-01) with green Tetris screen on the desk
    this.createGameBoy();

    // 8. Stack of Early 90s Blockbuster VHS Cassettes (Jurassic Park, T2, Pulp Fiction)
    this.createVhsStack();

    // 9. 1990s Spiral CD Jewel Case Tower (Oasis, Nirvana, Stone Roses, Prodigy)
    this.createCdTower();

    // 10. Glowing Bubbling 1990s Lava Lamp
    this.createLavaLamp();

    // 11. Dual UV Rave Glowsticks on the desk
    this.createGlowsticks();

    // 12. Wooden Floor Crate of 12" Vinyl Records
    this.createVinylCrate();
  }

  /**
   * 3-Inch CF2 Floppy Disks & Storage Caddy
   */
  createFloppyDisks() {
    const diskGroup = new THREE.Group();
    diskGroup.name = 'FloppyDiskCollection';

    // 3-inch CF2 disk dimensions (scaled to ~7.6cm x 8.0cm x 0.5cm)
    const diskW = 0.076;
    const diskD = 0.080;
    const diskH = 0.005;

    // Smoky acrylic disk caddy box
    const boxGeo = new THREE.BoxGeometry(0.092, 0.065, 0.125);
    const boxMat = new THREE.MeshPhysicalMaterial({
      color: 0x222630,
      transmission: 0.65,
      opacity: 0.85,
      transparent: true,
      roughness: 0.2,
      ior: 1.45
    });
    const caddy = new THREE.Mesh(boxGeo, boxMat);
    caddy.position.set(0.32, 0.032, -0.78);
    diskGroup.add(caddy);

    // List of authentic games available for 3" disks
    const diskGames = [
      {
        title: 'Emlyn Hughes Soccer',
        sub: '+3 DISK COMPACT',
        file: '/games/Emlyn Hughes International Soccer (1990)(Audiogenic Software).dsk',
        type: 'dsk',
        model: 'SpectrumPlus3',
        color: '#059669' // Authentic Pitch Green & Gold
      },
      {
        title: 'RoboCop 2',
        sub: '+3 DISK COMPACT',
        file: '/games/Robocop 2.dsk',
        type: 'dsk',
        model: 'SpectrumPlus3',
        color: '#1e40af' // Blue
      },
      {
        title: 'Target Renegade',
        sub: '+3 DISK COMPACT',
        file: '/games/Renegade 2 - Target Renegade.dsk',
        type: 'dsk',
        model: 'SpectrumPlus3',
        color: '#b91c1c' // Red
      },
      {
        title: 'Turrican 2',
        sub: '+3 DISK COMPACT',
        file: '/games/Turrican 2 - Side A.dsk',
        type: 'dsk',
        model: 'SpectrumPlus3',
        color: '#047857' // Green
      },
      {
        title: 'Dune II Demo',
        sub: 'TR-DOS DISK',
        file: '/games/DUNE2_D.TRD',
        type: 'trd',
        model: 'Pentagon128',
        color: '#d97706' // Amber
      },
      {
        title: 'Fire & Ice',
        sub: 'TR-DOS DISK',
        file: '/games/Fire&Ice.trd',
        type: 'trd',
        model: 'Pentagon128',
        color: '#4338ca' // Indigo
      }
    ];

    const plasticMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.2
    });

    const shutterMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25
    });

    // Create 3 disks standing in caddy box, and 2 disks lying flat ready to insert!
    diskGames.forEach((game, idx) => {
      const dGroup = new THREE.Group();
      dGroup.name = `Floppy_${game.title}`;

      // Disk casing
      const dGeo = new THREE.BoxGeometry(diskW, diskH, diskD);
      const dMesh = new THREE.Mesh(dGeo, plasticMat);
      dGroup.add(dMesh);

      // Metal sliding shutter on top edge
      const sGeo = new THREE.BoxGeometry(diskW * 0.45, diskH + 0.001, diskD * 0.35);
      const sMesh = new THREE.Mesh(sGeo, shutterMat);
      sMesh.position.set(0, 0, diskD * 0.32);
      dGroup.add(sMesh);

      // Label sticker
      const labelTex = RetroTextureUtils.createFloppyDiskLabel(game.title, game.sub, game.color);
      const labelGeo = new THREE.PlaneGeometry(diskW * 0.88, diskD * 0.58);
      labelGeo.rotateX(-Math.PI / 2);
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTex });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.set(0, diskH / 2 + 0.0006, -diskD * 0.14);
      dGroup.add(labelMesh);

      // Interactive hit mesh
      dMesh.userData = {
        isInteractiveProp: true,
        propType: 'floppy',
        gameData: game,
        parentGroup: dGroup,
        tooltip: `Load ${game.title} (${game.type.toUpperCase()})`
      };
      this.interactiveObjects.push(dMesh);

      // Placement firmly on the desktop table
      if (idx === 0) {
        // Disk 1 lying flat right next to the +3 disk drive slot!
        dGroup.position.set(0.25, 0.003, -0.65);
        dGroup.rotation.y = 0.15;
      } else if (idx === 1) {
        // Disk 2 lying flat slightly angled
        dGroup.position.set(0.23, 0.003, -0.56);
        dGroup.rotation.y = -0.22;
      } else {
        // Disks 3, 4, 5 standing upright inside the caddy box
        const slotOffset = (idx - 3) * 0.024;
        dGroup.position.set(0.32, 0.038, -0.78 + slotOffset);
        dGroup.rotation.x = Math.PI / 2.2;
      }

      dGroup.userData = {
        isGrabbableGroup: true,
        hitMesh: dMesh,
        gameData: game,
        propType: 'floppy',
        initialPos: dGroup.position.clone(),
        initialRot: dGroup.rotation.clone()
      };

      diskGroup.add(dGroup);
      this.disks.push(dGroup);
    });

    this.group.add(diskGroup);
  }

  /**
   * Audio Cassette Tapes (C60 / C90 with spools and jewel cases)
   */
  createCassetteTapes() {
    const tapeGroup = new THREE.Group();
    tapeGroup.name = 'CassetteTapeCollection';

    const tapeW = 0.100;
    const tapeD = 0.064;
    const tapeH = 0.010;

    const tapeGames = [
      {
        title: 'Emlyn Hughes Soccer',
        pub: 'AUDIOGENIC / 1989',
        file: '/games/Emlyn Hughes International Soccer (1989)(Audiogenic Software).tap',
        type: 'tap',
        model: 'Spectrum128K'
      },
      {
        title: 'Wonderful Dizzy',
        pub: 'OLIVER TWINS / 2020',
        file: '/games/Dizzy VIII - Wonderful Dizzy (2020) v1.5.tap',
        type: 'tap',
        model: 'Spectrum128K'
      },
      {
        title: 'Jack The Nipper',
        pub: 'GREMLIN GRAPHICS',
        file: '/games/Jack The Nipper (Kixx).tzx',
        type: 'tzx',
        model: 'Spectrum48K'
      },
      {
        title: 'Cybernoid',
        pub: 'HEWSON CONSULTANTS',
        file: '/games/Cybernoid (Kixx).tzx',
        type: 'tzx',
        model: 'Spectrum128K'
      },
      {
        title: 'Auf Monty',
        pub: 'GREMLIN GRAPHICS',
        file: '/games/Auf Wiedersehen Monty (Kixx).tzx',
        type: 'tzx',
        model: 'Spectrum48K'
      }
    ];

    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x111216,
      roughness: 0.4,
      metalness: 0.1
    });

    const spoolMat = new THREE.MeshStandardMaterial({
      color: 0xededed,
      roughness: 0.5
    });

    const tapeRibbonMat = new THREE.MeshStandardMaterial({
      color: 0x3d2012, // Dark oxide brown magnetic tape
      roughness: 0.3
    });

    tapeGames.forEach((game, idx) => {
      const tGroup = new THREE.Group();
      tGroup.name = `Cassette_${game.title}`;

      // Cassette shell
      const shellGeo = new THREE.BoxGeometry(tapeW, tapeH, tapeD);
      const shellMesh = new THREE.Mesh(shellGeo, shellMat);
      tGroup.add(shellMesh);

      // Label sticker
      const labelTex = RetroTextureUtils.createCassetteLabel(game.title, game.pub);
      const labelGeo = new THREE.PlaneGeometry(tapeW * 0.90, tapeD * 0.85);
      labelGeo.rotateX(-Math.PI / 2);
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTex });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.set(0, tapeH / 2 + 0.0006, 0);
      tGroup.add(labelMesh);

      // Two white toothed spools
      const spoolGeo = new THREE.CylinderGeometry(0.008, 0.008, tapeH + 0.002, 12);
      const spoolL = new THREE.Mesh(spoolGeo, spoolMat);
      spoolL.position.set(-0.022, 0, 0.005);
      tGroup.add(spoolL);

      const spoolR = new THREE.Mesh(spoolGeo, spoolMat);
      spoolR.position.set(0.022, 0, 0.005);
      tGroup.add(spoolR);

      // Interactive hit mesh
      shellMesh.userData = {
        isInteractiveProp: true,
        propType: 'cassette',
        gameData: game,
        parentGroup: tGroup,
        tooltip: `Load ${game.title} (Tape)`
      };
      this.interactiveObjects.push(shellMesh);

      // Placement on the left side of the desk
      if (idx === 0) {
        // Tape 1 lying flat in front
        tGroup.position.set(-0.25, 0.006, -0.65);
        tGroup.rotation.y = -0.18;
      } else if (idx === 1) {
        // Tape 2 lying flat slightly overlapping
        tGroup.position.set(-0.23, 0.006, -0.56);
        tGroup.rotation.y = 0.25;
      } else {
        // Tapes stacked on top of each other
        tGroup.position.set(-0.35, 0.006 + (idx - 2) * 0.012, -0.72);
        tGroup.rotation.y = -0.05;
      }

      tGroup.userData = {
        isGrabbableGroup: true,
        hitMesh: shellMesh,
        gameData: game,
        propType: 'cassette',
        initialPos: tGroup.position.clone(),
        initialRot: tGroup.rotation.clone()
      };

      tapeGroup.add(tGroup);
      this.tapes.push(tGroup);
    });

    this.group.add(tapeGroup);
  }

  /**
   * Iconic Music Cassette Tapes (The Beatles & Public Enemy)
   * Placed neatly on the desk / audio shelf beside the CD tower
   */
  createMusicCassettes() {
    const musicGroup = new THREE.Group();
    musicGroup.name = 'MusicCassetteTapes';

    const tapeW = 0.100;
    const tapeD = 0.064;
    const tapeH = 0.010;

    const albums = [
      {
        artist: 'The Beatles',
        album: "Sgt. Pepper's Lonely Hearts Club Band",
        shellColor: 0xf1f5f9, // Vintage off-white cassette shell
        pos: new THREE.Vector3(-0.35, 0.006, -0.60),
        rotY: -0.15,
        tooltip: "The Beatles — Sgt. Pepper's (Tape)"
      },
      {
        artist: 'Public Enemy',
        album: 'It Takes a Nation of Millions to Hold Us Back',
        shellColor: 0x111215, // Matte charcoal / black Def Jam shell
        pos: new THREE.Vector3(-0.35, 0.018, -0.60), // Stacked slightly askew on top
        rotY: 0.10,
        tooltip: 'Public Enemy — Nation of Millions (Tape)'
      }
    ];

    const spoolMat = new THREE.MeshStandardMaterial({
      color: 0xededed,
      roughness: 0.5
    });

    albums.forEach((item) => {
      const tGroup = new THREE.Group();
      tGroup.name = `MusicTape_${item.artist}`;

      const shellMat = new THREE.MeshStandardMaterial({
        color: item.shellColor,
        roughness: 0.4,
        metalness: 0.1
      });

      // Cassette shell
      const shellGeo = new THREE.BoxGeometry(tapeW, tapeH, tapeD);
      const shellMesh = new THREE.Mesh(shellGeo, shellMat);
      tGroup.add(shellMesh);

      // Music Album Label sticker
      const labelTex = RetroTextureUtils.createMusicCassetteLabel(item.album, item.artist);
      const labelGeo = new THREE.PlaneGeometry(tapeW * 0.90, tapeD * 0.85);
      labelGeo.rotateX(-Math.PI / 2);
      const labelMat = new THREE.MeshBasicMaterial({ map: labelTex });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.set(0, tapeH / 2 + 0.0006, 0);
      tGroup.add(labelMesh);

      // Two toothed spools
      const spoolGeo = new THREE.CylinderGeometry(0.008, 0.008, tapeH + 0.002, 12);
      const spoolL = new THREE.Mesh(spoolGeo, spoolMat);
      spoolL.position.set(-0.022, 0, 0.005);
      tGroup.add(spoolL);

      const spoolR = new THREE.Mesh(spoolGeo, spoolMat);
      spoolR.position.set(0.022, 0, 0.005);
      tGroup.add(spoolR);

      // Interactive hit mesh & tooltip
      shellMesh.userData = {
        isInteractiveProp: true,
        propType: 'music_tape',
        albumData: item,
        parentGroup: tGroup,
        tooltip: item.tooltip
      };
      this.interactiveObjects.push(shellMesh);

      tGroup.position.copy(item.pos);
      tGroup.rotation.y = item.rotY;

      tGroup.userData = {
        isGrabbableGroup: true,
        hitMesh: shellMesh,
        albumData: item,
        propType: 'music_tape',
        initialPos: tGroup.position.clone(),
        initialRot: tGroup.rotation.clone()
      };

      musicGroup.add(tGroup);
      this.tapes.push(tGroup);
    });

    this.group.add(musicGroup);
  }

  /**
   * Classic Retro Joystick (Competition Pro / Kempston Pro) with Crumpled 1986 Shop Receipt
   */
  createRetroJoystick() {
    this.joystickGroup = new THREE.Group();
    this.joystickGroup.name = 'RetroJoystick';

    // Positioned beside the Speccy +3
    this.joystickGroup.position.set(0.44, 0, -0.74);

    // 1. Heavy Black Base with beveled edges
    const baseGeo = new THREE.BoxGeometry(0.10, 0.042, 0.10);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x14151a,
      roughness: 0.6,
      metalness: 0.2
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.021;
    this.joystickGroup.add(baseMesh);

    // Rubber suction feet
    const footGeo = new THREE.CylinderGeometry(0.011, 0.014, 0.006, 12);
    const footMat = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.9 });
    const footCorners = [
      [-0.040, -0.040], [0.040, -0.040],
      [-0.040, 0.040], [0.040, 0.040]
    ];
    footCorners.forEach(([fx, fz]) => {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(fx, 0.003, fz);
      this.joystickGroup.add(foot);
    });

    // 2. Pivot Shaft and Bright Red Ball-Top Handle
    this.stickPivot = new THREE.Group();
    this.stickPivot.position.set(0, 0.042, 0);

    // Chrome shaft
    const shaftGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.075, 12);
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd0d5dd, metalness: 0.9, roughness: 0.1 });
    const shaftMesh = new THREE.Mesh(shaftGeo, chromeMat);
    shaftMesh.position.y = 0.038;
    this.stickPivot.add(shaftMesh);

    // Iconic Red Ball-Top Handle
    const ballGeo = new THREE.SphereGeometry(0.018, 20, 20);
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.1 });
    const ballMesh = new THREE.Mesh(ballGeo, redMat);
    ballMesh.position.y = 0.075;
    this.stickPivot.add(ballMesh);

    this.joystickGroup.add(this.stickPivot);

    // 3. Two Large Red Arcade Fire Buttons on base
    const btnGeo = new THREE.CylinderGeometry(0.011, 0.012, 0.008, 16);
    const btnL = new THREE.Mesh(btnGeo, redMat);
    btnL.position.set(-0.028, 0.044, 0.025);
    this.joystickGroup.add(btnL);

    const btnR = new THREE.Mesh(btnGeo, redMat);
    btnR.position.set(0.028, 0.044, 0.025);
    this.joystickGroup.add(btnR);

    baseMesh.userData = {
      isInteractiveProp: true,
      propType: 'joystick',
      tooltip: 'Competition Pro Joystick'
    };
    this.interactiveObjects.push(baseMesh);

    // Crumpled 1986 Shop Receipt lying on the desk right under the Competition Pro!
    const recCanvas = document.createElement('canvas');
    recCanvas.width = 256;
    recCanvas.height = 320;
    const rCtx = recCanvas.getContext('2d');
    rCtx.fillStyle = '#fef9c3'; // Vintage faded yellow thermal paper
    rCtx.fillRect(0, 0, 256, 320);

    rCtx.fillStyle = '#1e293b';
    rCtx.font = 'bold 20px monospace';
    rCtx.textAlign = 'center';
    rCtx.fillText('DIXONS / BOOTS', 128, 38);
    rCtx.font = '12px monospace';
    rCtx.fillText('HIGH STREET BRANCH - 1986', 128, 58);
    rCtx.fillText('----------------------------', 128, 76);

    rCtx.textAlign = 'left';
    rCtx.font = '13px monospace';
    rCtx.fillText('1x COMPETITION PRO 5000', 18, 110);
    rCtx.fillText('   EXTRA MICROSWITCHES', 18, 130);
    rCtx.fillText('   £14.95 PAID CASH', 18, 150);
    rCtx.fillText('----------------------------', 18, 180);

    rCtx.fillStyle = '#dc2626';
    rCtx.font = 'bold 11px monospace';
    rCtx.fillText('* KEEP RECEIPT FOR RETURNS *', 20, 218);
    rCtx.fillText('* NO REFUNDS IF SNAPPED IN  *', 20, 238);
    rCtx.fillText('* DALEY THOMPSON DECATHLON! *', 20, 258);

    rCtx.fillStyle = '#64748b';
    rCtx.font = '10px monospace';
    rCtx.fillText('THANK YOU FOR SHOPPING!', 45, 295);

    const recTex = new THREE.CanvasTexture(recCanvas);
    const recGeo = new THREE.PlaneGeometry(0.080, 0.100);
    recGeo.rotateX(-Math.PI / 2);
    const recMat = new THREE.MeshBasicMaterial({ map: recTex });
    const receiptMesh = new THREE.Mesh(recGeo, recMat);
    receiptMesh.position.set(0.44, 0.001, -0.63);
    receiptMesh.rotation.y = 0.32;
    this.group.add(receiptMesh);

    this.group.add(this.joystickGroup);
  }

  /**
   * Iconic Konix Speedking Ergonomic Handheld Joystick!
   * Built to survive the most furious Decathlon waggle!
   */
  createKonixSpeedking() {
    this.speedkingGroup = new THREE.Group();
    this.speedkingGroup.name = 'KonixSpeedking';
    // Front and center on the right side of the Speccy +3
    this.speedkingGroup.position.set(0.33, 0, -0.68);
    this.speedkingGroup.rotation.y = -0.15; // Angled slightly towards the player

    const blackPlasticMat = new THREE.MeshStandardMaterial({
      color: 0x18191e,
      roughness: 0.65,
      metalness: 0.15
    });

    const redBtnMat = new THREE.MeshStandardMaterial({
      color: 0xcc1111,
      roughness: 0.35,
      metalness: 0.1
    });

    // 1. Ergonomic Handheld Grip Body (Tapered base with palm swell)
    const gripGeo = new THREE.CylinderGeometry(0.024, 0.032, 0.082, 16);
    const gripMesh = new THREE.Mesh(gripGeo, blackPlasticMat);
    gripMesh.position.y = 0.041;
    gripMesh.rotation.x = -0.10; // Angled forward ergonomically
    this.speedkingGroup.add(gripMesh);

    // Flat Top Deck Housing
    const deckGeo = new THREE.BoxGeometry(0.052, 0.018, 0.065);
    const deckMesh = new THREE.Mesh(deckGeo, blackPlasticMat);
    deckMesh.position.set(0, 0.080, -0.005);
    this.speedkingGroup.add(deckMesh);

    // Front Index Trigger Fire Button (under the front deck where your index finger naturally curls!)
    const triggerGeo = new THREE.BoxGeometry(0.016, 0.022, 0.012);
    const triggerMesh = new THREE.Mesh(triggerGeo, redBtnMat);
    triggerMesh.position.set(0, 0.065, 0.026);
    triggerMesh.rotation.x = 0.25;
    this.speedkingGroup.add(triggerMesh);

    // 2. Short Stubby Stick & Red Thumb Fire Button
    this.speedkingPivot = new THREE.Group();
    this.speedkingPivot.position.set(0, 0.088, -0.005);

    // Short black joystick stalk
    const stalkGeo = new THREE.CylinderGeometry(0.008, 0.009, 0.028, 12);
    const stalkMesh = new THREE.Mesh(stalkGeo, blackPlasticMat);
    stalkMesh.position.y = 0.014;
    this.speedkingPivot.add(stalkMesh);

    // Domed head
    const domeGeo = new THREE.SphereGeometry(0.014, 16, 12);
    const domeMesh = new THREE.Mesh(domeGeo, blackPlasticMat);
    domeMesh.position.y = 0.028;
    this.speedkingPivot.add(domeMesh);

    // Red Thumb Button right on top crown of the dome!
    const thumbBtnGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.004, 16);
    const thumbBtn = new THREE.Mesh(thumbBtnGeo, redBtnMat);
    thumbBtn.position.y = 0.040;
    this.speedkingPivot.add(thumbBtn);

    this.speedkingGroup.add(this.speedkingPivot);

    // 3. Konix Speedking Logo Badge
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111216';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#eab308'; // Iconic Speedking Yellow
    ctx.font = '900 28px -apple-system, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPEEDKING', 128, 38);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('KONIX MICROSWITCH', 128, 54);

    const badgeTex = new THREE.CanvasTexture(canvas);
    const badgeGeo = new THREE.PlaneGeometry(0.038, 0.010);
    const badgeMat = new THREE.MeshBasicMaterial({ map: badgeTex });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.position.set(0, 0.080, -0.038);
    badgeMesh.rotation.y = Math.PI;
    this.speedkingGroup.add(badgeMesh);

    // 4. Black Kempston Controller Cable trailing to the back of the desk
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.015, -0.035),
      new THREE.Vector3(0.03, 0.005, -0.08),
      new THREE.Vector3(0.02, 0.003, -0.22)
    ]);
    const cordGeo = new THREE.TubeGeometry(curve, 12, 0.003, 8, false);
    const cordMat = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.8 });
    const cordMesh = new THREE.Mesh(cordGeo, cordMat);
    this.speedkingGroup.add(cordMesh);

    // Interactive hit handling
    deckMesh.userData = {
      isInteractiveProp: true,
      propType: 'speedking',
      tooltip: 'Konix Speedking Joystick (Click Fire)'
    };
    this.interactiveObjects.push(deckMesh);

    this.group.add(this.speedkingGroup);
  }

  /**
   * Anglepoise Articulated Desk Lamp with warm tungsten spotlight
   */
  createDeskLamp() {
    this.lampGroup = new THREE.Group();
    this.lampGroup.name = 'AnglepoiseDeskLamp';
    this.lampGroup.position.set(-0.48, 0, -1.02);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Antique vintage brass / gold
      metalness: 0.85,
      roughness: 0.25
    });

    const darkEnamelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4
    });

    // 1. Heavy stepped circular base
    const baseGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.022, 24);
    const baseMesh = new THREE.Mesh(baseGeo, brassMat);
    baseMesh.position.y = 0.011;
    this.lampGroup.add(baseMesh);

    // 2. Articulated Twin-Strut Arm
    const strutGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.28, 8);
    const arm1 = new THREE.Mesh(strutGeo, brassMat);
    arm1.position.set(0.02, 0.14, 0.04);
    arm1.rotation.z = -0.35;
    arm1.rotation.x = 0.2;
    this.lampGroup.add(arm1);

    const arm2 = new THREE.Mesh(strutGeo, brassMat);
    arm2.position.set(0.08, 0.32, 0.10);
    arm2.rotation.z = 0.45;
    arm2.rotation.x = 0.2;
    this.lampGroup.add(arm2);

    // 3. Bell Lampshade angled down onto the keyboard
    const shadeGeo = new THREE.ConeGeometry(0.075, 0.10, 20, 1, true);
    shadeGeo.rotateX(Math.PI);
    const shadeMesh = new THREE.Mesh(shadeGeo, darkEnamelMat);
    shadeMesh.position.set(0.15, 0.42, 0.16);
    shadeMesh.rotation.x = Math.PI / 4;
    shadeMesh.rotation.y = -Math.PI / 5;
    this.lampGroup.add(shadeMesh);

    // Interactive switch on base
    baseMesh.userData = {
      isInteractiveProp: true,
      propType: 'lamp',
      tooltip: 'Toggle Desk Lamp'
    };
    this.interactiveObjects.push(baseMesh);

    // 4. Warm Tungsten Spotlight (2700K pool of light over desk and keyboard)
    this.lampLight = new THREE.SpotLight(0xffdf99, 3.2, 2.2, Math.PI / 3.5, 0.6, 1.2);
    this.lampLight.position.set(0.15, 0.41, 0.16);
    this.lampLight.target.position.set(0.48, 0, 0.34); // Centers right on the Spectrum keyboard!
    this.lampLight.castShadow = true;
    this.lampGroup.add(this.lampLight);
    this.lampGroup.add(this.lampLight.target);

    this.group.add(this.lampGroup);
  }

  /**
   * Stack of 80s Computer Magazines (Crash, Sinclair User)
   */
  createMagazineStack() {
    const magGroup = new THREE.Group();
    magGroup.name = 'MagazineStack';
    magGroup.position.set(-0.44, 0, -0.68);

    const magW = 0.18;
    const magD = 0.24;
    const magH = 0.008;

    const covers = [
      RetroTextureUtils.createPosterTexture('CRASH', '100% SPECCY ACTION', '#e11d48'),
      RetroTextureUtils.createPosterTexture('SINCLAIR USER', 'THE POWER INSIDE', '#2563eb'),
      RetroTextureUtils.createPosterTexture('MICRO ADVENTURER', 'EXPLORE THE 8-BIT REALMS', '#16a34a')
    ];

    covers.forEach((tex, i) => {
      const mGeo = new THREE.BoxGeometry(magW, magH, magD);
      const paperMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.8 });
      const coverMat = new THREE.MeshBasicMaterial({ map: tex });
      const mats = [paperMat, paperMat, coverMat, paperMat, paperMat, paperMat];

      const mMesh = new THREE.Mesh(mGeo, mats);
      mMesh.position.set(0, magH / 2 + (i * magH), 0);
      mMesh.rotation.y = (i * 0.12) - 0.08;
      magGroup.add(mMesh);
    });

    this.group.add(magGroup);
  }

  /**
   * Ceramic Sinclair Coffee / Tea Mug
   */
  createMug() {
    const mugGroup = new THREE.Group();
    mugGroup.name = 'SinclairCoffeeMug';
    mugGroup.position.set(-0.38, 0, -0.85);

    const ceramicMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
      metalness: 0.1
    });

    // Cup cylinder
    const cupGeo = new THREE.CylinderGeometry(0.038, 0.034, 0.085, 20);
    const cupMesh = new THREE.Mesh(cupGeo, ceramicMat);
    cupMesh.position.y = 0.0425;
    mugGroup.add(cupMesh);

    // Coffee liquid inside
    const liquidGeo = new THREE.CircleGeometry(0.034, 16);
    liquidGeo.rotateX(-Math.PI / 2);
    const liquidMat = new THREE.MeshStandardMaterial({ color: 0x3d2012, roughness: 0.1 });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.position.y = 0.078;
    mugGroup.add(liquid);

    // Handle
    const handleGeo = new THREE.TorusGeometry(0.024, 0.005, 8, 16, Math.PI);
    const handleMesh = new THREE.Mesh(handleGeo, ceramicMat);
    handleMesh.position.set(0.038, 0.042, 0);
    handleMesh.rotation.y = Math.PI / 2;
    mugGroup.add(handleMesh);

    this.group.add(mugGroup);
  }

  /**
   * Handle prop interaction (e.g. clicking a floppy disk, cassette, or lamp)
   */
  handlePropClick(propMesh) {
    const data = propMesh.userData;
    if (!data) return;

    if (data.propType === 'floppy' || data.propType === 'cassette') {
      const g = data.gameData;
      console.log(`[RetroProps] User clicked ${data.propType}: ${g.title} (${g.file})`);
      if (this.gamesLibrary) {
        this.gamesLibrary.loadGameByPath(g.file, g.type, g.model);
      }
    } else if (data.propType === 'lamp') {
      this.lampLight.visible = !this.lampLight.visible;
      console.log(`[RetroProps] Desk lamp: ${this.lampLight.visible ? 'ON' : 'OFF'}`);
    } else if (data.propType === 'joystick' || data.propType === 'speedking') {
      // Tilt joystick handle and trigger fire
      if (this.stickPivot) {
        this.stickPivot.rotation.x = 0.25;
        setTimeout(() => { this.stickPivot.rotation.x = 0; }, 150);
      }
      if (this.speedkingPivot) {
        this.speedkingPivot.rotation.x = 0.20;
        setTimeout(() => { this.speedkingPivot.rotation.x = 0; }, 150);
      }
    }
  }

  /**
   * Updates joystick visual tilt based on PC gamepad/arrow key inputs
   */
  setJoystickTilt(dx, dy) {
    if (this.stickPivot) {
      this.stickPivot.rotation.z = -dx * 0.35;
      this.stickPivot.rotation.x = -dy * 0.35;
    }
    if (this.speedkingPivot) {
      this.speedkingPivot.rotation.z = -dx * 0.30;
      this.speedkingPivot.rotation.x = -dy * 0.30;
    }
  }

  /**
   * Nintendo Game Boy (1989-1992 DMG-01) with green Tetris screen on the desk
   */
  createGameBoy() {
    const gbGroup = new THREE.Group();
    gbGroup.name = 'NintendoGameBoy';
    // Positioned left of the Spectrum within easy seated view
    gbGroup.position.set(-0.14, 0.014, -0.54);
    gbGroup.rotation.y = 0.12;

    const gbMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1, // Classic Game Boy off-white / light grey plastic
      roughness: 0.65,
      metalness: 0.1
    });

    // 1. Handheld Body
    const bodyGeo = new THREE.BoxGeometry(0.090, 0.026, 0.148);
    const bodyMesh = new THREE.Mesh(bodyGeo, gbMat);
    gbGroup.add(bodyMesh);

    // 2. Beveled Screen Frame / Bezel
    const bezelGeo = new THREE.PlaneGeometry(0.076, 0.065);
    bezelGeo.rotateX(-Math.PI / 2);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Dark slate bezel
      roughness: 0.5
    });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.set(0, 0.0135, -0.028);
    gbGroup.add(bezel);

    // 3. Pea-Soup Dot-Matrix Green LCD Screen (Tetris)
    const screenGeo = new THREE.PlaneGeometry(0.048, 0.044);
    screenGeo.rotateX(-Math.PI / 2);
    const screenTex = RetroTextureUtils.createGameBoyScreenTexture();
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.0138, -0.028);
    gbGroup.add(screenMesh);

    // Red Power Battery LED
    const ledGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.002, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(-0.028, 0.014, -0.028);
    gbGroup.add(led);

    // 4. Black D-Pad Cross
    const dpadMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const dpadHGeo = new THREE.BoxGeometry(0.022, 0.004, 0.007);
    const dpadVGeo = new THREE.BoxGeometry(0.007, 0.004, 0.022);
    const dpadH = new THREE.Mesh(dpadHGeo, dpadMat);
    const dpadV = new THREE.Mesh(dpadVGeo, dpadMat);
    dpadH.position.set(-0.024, 0.014, 0.028);
    dpadV.position.set(-0.024, 0.014, 0.028);
    gbGroup.add(dpadH);
    gbGroup.add(dpadV);

    // 5. Magenta A & B Action Buttons (Angled)
    const btnMat = new THREE.MeshStandardMaterial({ color: 0x9d174d, roughness: 0.4 });
    const btnGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 0.004, 12);
    const btnB = new THREE.Mesh(btnGeo, btnMat);
    btnB.position.set(0.018, 0.014, 0.034);
    gbGroup.add(btnB);

    const btnA = new THREE.Mesh(btnGeo, btnMat);
    btnA.position.set(0.030, 0.014, 0.024);
    gbGroup.add(btnA);

    // 6. Angled SELECT & START rubber pills
    const pillMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
    const pillGeo = new THREE.BoxGeometry(0.012, 0.002, 0.004);
    const pillSel = new THREE.Mesh(pillGeo, pillMat);
    pillSel.position.set(-0.010, 0.014, 0.056);
    pillSel.rotation.y = -0.45;
    gbGroup.add(pillSel);

    const pillStart = new THREE.Mesh(pillGeo, pillMat);
    pillStart.position.set(0.008, 0.014, 0.056);
    pillStart.rotation.y = -0.45;
    gbGroup.add(pillStart);

    // Interactive clicking
    bodyMesh.userData = {
      isInteractiveProp: true,
      propType: 'gameboy',
      tooltip: 'Nintendo Game Boy (1989)'
    };
    this.interactiveObjects.push(bodyMesh);

    this.group.add(gbGroup);
  }

  /**
   * Stack of 3 Early 90s Blockbuster VHS Cassettes (Jurassic Park, T2, Pulp Fiction)
   */
  createVhsStack() {
    const vhsGroup = new THREE.Group();
    vhsGroup.name = 'VhsTapeStack';
    vhsGroup.position.set(-0.46, 0, -0.92);

    const tapeW = 0.125;
    const tapeH = 0.028;
    const tapeD = 0.200;

    const movies = [
      { title: 'JURASSIC PARK', year: '1993', studio: 'UNIVERSAL', color: '#b91c1c' },
      { title: 'TERMINATOR 2', year: '1991', studio: 'CAROLCO', color: '#1d4ed8' },
      { title: 'PULP FICTION', year: '1994', studio: 'MIRAMAX', color: '#ca8a04' }
    ];

    movies.forEach((m, idx) => {
      const boxGeo = new THREE.BoxGeometry(tapeW, tapeH, tapeD);
      const plasticMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
      const spineTex = RetroTextureUtils.createVhsCoverTexture(m.title, m.year, m.studio, m.color);
      const spineMat = new THREE.MeshBasicMaterial({ map: spineTex });

      // Apply spine texture to front/spine side
      const mats = [plasticMat, plasticMat, plasticMat, plasticMat, spineMat, plasticMat];
      const tape = new THREE.Mesh(boxGeo, mats);

      tape.position.set(0, (tapeH / 2) + (idx * tapeH), 0);
      tape.rotation.y = (idx * 0.06) - 0.04;
      vhsGroup.add(tape);
    });

    this.group.add(vhsGroup);
  }

  /**
   * 1990s Spiral CD Jewel Case Tower (8 classic early 90s albums)
   */
  createCdTower() {
    const towerGroup = new THREE.Group();
    towerGroup.name = 'CdJewelCaseTower';
    towerGroup.position.set(-0.54, 0, -1.12);

    // Black wire rack frame
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8, roughness: 0.3 });
    const rodGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.32, 8);
    for (let r = 0; r < 4; r++) {
      const rod = new THREE.Mesh(rodGeo, wireMat);
      const angle = (r / 4) * Math.PI * 2;
      rod.position.set(Math.cos(angle) * 0.065, 0.16, Math.sin(angle) * 0.065);
      towerGroup.add(rod);
    }

    // Heavy round base
    const baseGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.012, 20);
    const base = new THREE.Mesh(baseGeo, wireMat);
    base.position.y = 0.006;
    towerGroup.add(base);

    // 8 CD Jewel Cases loaded horizontally
    const cdSpineColors = [
      '#000000', // Oasis Definitely Maybe
      '#0284c7', // Nirvana Nevermind
      '#f5f5f4', // Stone Roses
      '#f59e0b', // Blur Parklife
      '#15803d', // The Prodigy Jilted
      '#1e1b4b', // Massive Attack Blue Lines
      '#701a75', // Pulp His 'n' Hers
      '#b91c1c'  // Radiohead Pablo Honey
    ];

    const caseGeo = new THREE.BoxGeometry(0.142, 0.010, 0.125);
    const clearCaseMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.7,
      transparent: true,
      roughness: 0.2
    });

    cdSpineColors.forEach((col, idx) => {
      const cdCase = new THREE.Mesh(caseGeo, clearCaseMat);
      cdCase.position.set(0, 0.024 + (idx * 0.034), 0);
      cdCase.rotation.y = (idx % 2 === 0 ? 0.05 : -0.05);

      // Colored spine insert
      const spineGeo = new THREE.BoxGeometry(0.002, 0.009, 0.124);
      const spineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(col) });
      const spine = new THREE.Mesh(spineGeo, spineMat);
      spine.position.set(-0.070, 0, 0);
      cdCase.add(spine);

      towerGroup.add(cdCase);
    });

    this.group.add(towerGroup);
  }

  /**
   * Glowing Bubbling 1990s Lava Lamp
   */
  createLavaLamp() {
    this.lavaLampGroup = new THREE.Group();
    this.lavaLampGroup.name = 'LavaLamp';
    this.lavaLampGroup.position.set(0.42, 0, -1.05);

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.95,
      roughness: 0.15
    });

    // 1. Flared Base
    const baseGeo = new THREE.CylinderGeometry(0.038, 0.054, 0.055, 20);
    const base = new THREE.Mesh(baseGeo, chromeMat);
    base.position.y = 0.0275;
    this.lavaLampGroup.add(base);

    // 2. Glass Cone Bottle
    const bottleGeo = new THREE.CylinderGeometry(0.022, 0.038, 0.18, 20);
    const bottleMat = new THREE.MeshPhysicalMaterial({
      color: 0xf43f5e, // Hot magenta/orange fluid
      transmission: 0.65,
      transparent: true,
      roughness: 0.15,
      ior: 1.45
    });
    const bottle = new THREE.Mesh(bottleGeo, bottleMat);
    bottle.position.y = 0.145;
    this.lavaLampGroup.add(bottle);

    // 3. Floating Organic Wax Blobs (animated in update())
    this.lavaBlobs = [];
    const waxMat = new THREE.MeshStandardMaterial({
      color: 0xff0066,
      emissive: 0xff0055,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });

    const blobConfigs = [
      { r: 0.016, baseY: 0.09, speed: 0.0012, amp: 0.045 },
      { r: 0.012, baseY: 0.14, speed: 0.0016, amp: 0.035 },
      { r: 0.018, baseY: 0.18, speed: 0.0009, amp: 0.040 }
    ];

    blobConfigs.forEach((cfg, i) => {
      const bGeo = new THREE.SphereGeometry(cfg.r, 16, 16);
      bGeo.scale(1.0, 1.35, 1.0); // Classic elongated teardrop wax shape
      const blob = new THREE.Mesh(bGeo, waxMat);
      blob.position.set((i % 2 === 0 ? 0.005 : -0.005), cfg.baseY, 0);
      blob.userData = cfg;
      this.lavaLampGroup.add(blob);
      this.lavaBlobs.push(blob);
    });

    // 4. Chrome Top Cap
    const capGeo = new THREE.CylinderGeometry(0.014, 0.024, 0.045, 20);
    const cap = new THREE.Mesh(capGeo, chromeMat);
    cap.position.y = 0.255;
    this.lavaLampGroup.add(cap);

    // 5. Internal Ambient Point Light
    this.lavaLight = new THREE.PointLight(0xff0066, 1.2, 1.6);
    this.lavaLight.position.set(0, 0.15, 0);
    this.lavaLampGroup.add(this.lavaLight);

    this.group.add(this.lavaLampGroup);
  }

  /**
   * Dual UV Rave Glowsticks on the desk (Neon Lime Green & Hot Pink)
   */
  createGlowsticks() {
    const glowGroup = new THREE.Group();
    glowGroup.name = 'RaveGlowsticks';
    glowGroup.position.set(0.12, 0.006, -0.54);

    const stickGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.14, 12);
    stickGeo.rotateZ(Math.PI / 2);

    // Neon Green Stick
    const greenMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.8,
      roughness: 0.3
    });
    const greenStick = new THREE.Mesh(stickGeo, greenMat);
    greenStick.rotation.y = 0.35;
    glowGroup.add(greenStick);

    // Neon Pink Stick (Crossed over)
    const pinkMat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      emissive: 0xec4899,
      emissiveIntensity: 0.8,
      roughness: 0.3
    });
    const pinkStick = new THREE.Mesh(stickGeo, pinkMat);
    pinkStick.position.y = 0.007;
    pinkStick.rotation.y = -0.45;
    glowGroup.add(pinkStick);

    this.group.add(glowGroup);
  }

  /**
   * Wooden Floor Crate of 12" Vinyl Records next to the desk
   */
  createVinylCrate() {
    const crateGroup = new THREE.Group();
    crateGroup.name = 'VinylRecordCrate';
    // Sits firmly on the carpet beside desk leg
    crateGroup.position.set(0.74, 0.12, -0.85);

    const woodMat = RetroTextureUtils.createWoodgrainTexture('#5c3a21', '#3d2412', '#784d2d');
    const crateMat = new THREE.MeshStandardMaterial({ map: woodMat, roughness: 0.8 });

    // Wooden slat box (0.35m x 0.24m x 0.35m)
    const baseGeo = new THREE.BoxGeometry(0.35, 0.015, 0.35);
    const base = new THREE.Mesh(baseGeo, crateMat);
    base.position.y = -0.11;
    crateGroup.add(base);

    // Side slats
    const slatSideGeo = new THREE.BoxGeometry(0.015, 0.22, 0.35);
    const leftSlat = new THREE.Mesh(slatSideGeo, crateMat);
    leftSlat.position.x = -0.17;
    crateGroup.add(leftSlat);

    const rightSlat = new THREE.Mesh(slatSideGeo, crateMat);
    rightSlat.position.x = 0.17;
    crateGroup.add(rightSlat);

    const frontSlatGeo = new THREE.BoxGeometry(0.35, 0.22, 0.015);
    const frontSlat = new THREE.Mesh(frontSlatGeo, crateMat);
    frontSlat.position.z = 0.17;
    crateGroup.add(frontSlat);

    const backSlat = new THREE.Mesh(frontSlatGeo, crateMat);
    backSlat.position.z = -0.17;
    crateGroup.add(backSlat);

    // 10 Vinyl Sleeves sticking out with classic early 90s colors
    const vinylColors = [
      '#facc15', // Stone Roses Lemon
      '#15803d', // The Prodigy Charly
      '#0284c7', // Nirvana Teen Spirit
      '#1e1b4b', // Massive Attack Unfinished Sympathy
      '#b91c1c', // Primal Scream Loaded
      '#0f172a', // Oasis Supersonic
      '#ea580c', // Happy Mondays Step On
      '#9333ea', // 808 State Pacific
      '#ec4899', // KLF What Time Is Love
      '#2563eb'  // New Order World In Motion
    ];

    const sleeveGeo = new THREE.BoxGeometry(0.31, 0.31, 0.004);
    vinylColors.forEach((col, idx) => {
      const sleeveMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(col), roughness: 0.5 });
      const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
      sleeve.position.set(0, 0.04, -0.13 + (idx * 0.026));
      sleeve.rotation.x = -0.12 + (idx * 0.015);
      crateGroup.add(sleeve);
    });

    this.group.add(crateGroup);
  }

  /**
   * Retrieves all grabbable floppy disks and cassette tapes for VR hand interaction
   */
  getGrabbables() {
    const list = [];
    for (const d of this.disks) {
      if (d && d.userData && d.userData.isGrabbableGroup) {
        list.push(d);
      }
    }
    for (const t of this.tapes) {
      if (t && t.userData && t.userData.isGrabbableGroup) {
        list.push(t);
      }
    }
    return list;
  }

  /**
   * Animation update for animated props (e.g. morphing lava lamp wax)
   */
  update(time = 0) {
    if (this.lavaBlobs && this.lavaBlobs.length > 0) {
      this.lavaBlobs.forEach((blob, idx) => {
        const cfg = blob.userData;
        if (cfg) {
          const t = time || Date.now();
          blob.position.y = cfg.baseY + Math.sin(t * cfg.speed + idx) * cfg.amp;
        }
      });
    }
  }
}
