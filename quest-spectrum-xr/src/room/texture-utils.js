/**
 * Procedural Retro Texture Utilities
 * Generates crisp, authentic 1980s textures for CRT TV, Sinclair +3, Floppy Disks, Tapes, Posters & Carpet
 * Uses HTML5 Canvas 2D API for zero external network overhead and instant loading.
 */
import * as THREE from 'three';

export class RetroTextureUtils {
  /**
   * Creates a rich woodgrain texture for the retro desk and walls
   */
  static createWoodgrainTexture(baseColor = '#5c381e', darkColor = '#3b2210', lightColor = '#7a4e2c') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base tone
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Wood rings and fibers
    for (let i = 0; i < 400; i++) {
      const y = Math.random() * 512;
      const h = Math.random() * 8 + 2;
      const alpha = Math.random() * 0.18 + 0.05;
      ctx.fillStyle = Math.random() > 0.5 ? darkColor : lightColor;
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, y, 512, h);
    }

    // Longitudinal wavy woodgrain streaks
    ctx.lineWidth = 2.5;
    for (let x = 0; x < 512; x += 18) {
      ctx.beginPath();
      ctx.strokeStyle = Math.random() > 0.4 ? darkColor : lightColor;
      ctx.globalAlpha = Math.random() * 0.22 + 0.08;
      let currX = x;
      ctx.moveTo(currX, 0);
      for (let y = 0; y < 512; y += 32) {
        currX += (Math.random() - 0.5) * 14;
        ctx.lineTo(currX, y);
      }
      ctx.stroke();
    }

    // Wood knots
    for (let k = 0; k < 4; k++) {
      const kx = Math.random() * 450 + 30;
      const ky = Math.random() * 450 + 30;
      const grad = ctx.createRadialGradient(kx, ky, 2, kx, ky, 28);
      grad.addColorStop(0, darkColor);
      grad.addColorStop(0.7, baseColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.ellipse(kx, ky, 24, 40, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * 1980s Retro Carpet Texture
   */
  static createCarpetTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep warm burgundy/amber base
    ctx.fillStyle = '#2d1419';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle 80s geometric diamond weave
    const size = 32;
    for (let x = 0; x < 512; x += size) {
      for (let y = 0; y < 512; y += size) {
        ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#381c22' : '#281216';
        ctx.fillRect(x, y, size, size);

        // Small central amber tuft
        ctx.fillStyle = '#4d2b24';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Wool fiber noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.7));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.5));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * 1980s Retro Wallpaper Texture (Warm vertical stripes with micro-pattern)
   */
  static createWallpaperTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Warm cream/beige base
    ctx.fillStyle = '#42372d';
    ctx.fillRect(0, 0, 512, 512);

    // Striped pattern
    const stripeW = 40;
    for (let x = 0; x < 512; x += stripeW * 2) {
      ctx.fillStyle = '#4d3f33';
      ctx.fillRect(x, 0, stripeW, 512);

      // Gold pin-stripes
      ctx.fillStyle = '#6e5a42';
      ctx.fillRect(x + stripeW - 3, 0, 3, 512);
      ctx.fillRect(x, 0, 3, 512);
    }

    // Subtle paper grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 16;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * CRT Television Control Panel & Speaker Grille Texture
   */
  static createTVControlPanelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark charcoal brushed fascia
    ctx.fillStyle = '#1c1d22';
    ctx.fillRect(0, 0, 256, 512);

    // Top: Badge "SINCLAIR VISION 14"
    ctx.fillStyle = '#101114';
    ctx.fillRect(20, 20, 216, 40);
    ctx.strokeStyle = '#383a45';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 216, 40);

    // Sinclair 4-color rainbow stripe
    const stripeColors = ['#cd0000', '#cdcd00', '#00cd00', '#00cdcd'];
    stripeColors.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(28 + idx * 8, 26, 8, 28);
    });

    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('VISION 14', 68, 45);

    // Upper Section: Rotary VHF Dial (1..12)
    ctx.fillStyle = '#111216';
    ctx.beginPath();
    ctx.arc(128, 115, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a4d5c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Dial tick marks & numbers
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let ch = 1; ch <= 12; ch++) {
      const angle = (ch / 12) * Math.PI * 2 - Math.PI / 2;
      const x = 128 + Math.cos(angle) * 36;
      const y = 115 + Math.sin(angle) * 36;
      ctx.fillText(ch.toString(), x, y);
    }
    // Knob pointer
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(128, 115);
    ctx.lineTo(128, 78);
    ctx.stroke();

    // Secondary Knobs: Tuning, Volume, Brightness
    const knobs = [
      { y: 195, label: 'VOLUME' },
      { y: 250, label: 'BRIGHT' },
      { y: 305, label: 'CONTRAST' }
    ];
    knobs.forEach(k => {
      // Knob body
      ctx.fillStyle = '#262830';
      ctx.beginPath();
      ctx.arc(128, k.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4a4d5c';
      ctx.lineWidth = 2;
      ctx.stroke();
      // White notch
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(128, k.y);
      ctx.lineTo(128, k.y - 18);
      ctx.stroke();
      // Text label
      ctx.fillStyle = '#6b7280';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText(k.label, 128, k.y + 28);
    });

    // Lower Section: Slotted Speaker Grille
    ctx.fillStyle = '#111216';
    ctx.fillRect(24, 355, 208, 135);
    ctx.strokeStyle = '#2d303a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(24, 355, 208, 135);

    // Horizontal acoustic slats
    for (let y = 365; y < 480; y += 8) {
      ctx.fillStyle = '#08080a';
      ctx.fillRect(32, y, 192, 4);
      ctx.fillStyle = '#383a45';
      ctx.fillRect(32, y + 4, 192, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * 3-Inch Compact Floppy Disk Label Texture (Amsoft / Maxell CF2 Style)
   */
  static createFloppyDiskLabel(title, subtitle = '+3 DISK SOFTWARE', color = '#1a56db') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');

    // Label sticker background (vintage matte paper)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 360);

    // Colored banner header
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 70);

    // Brand logo
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AMSOFT', 20, 44);

    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('CF-2 COMPACT FLOPPY', 492, 44);

    // Sinclair 4-color rainbow stripe under header
    const stripeColors = ['#cd0000', '#cdcd00', '#00cd00', '#00cdcd'];
    stripeColors.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(0, 70 + idx * 4, 512, 4);
    });

    // Main Game Title (bold, large, authentic retro typography)
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), 256, 170);

    // Subtitle / Publisher
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(subtitle, 256, 210);

    // Disk specs badge
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 250, 452, 75);

    ctx.fillStyle = '#334155';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('FORMAT: 180K / SIDE (DS/DD)', 45, 275);
    ctx.fillText('COMPATIBLE: ZX SPECTRUM +3 / PCW', 45, 302);

    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = color;
    ctx.fillText('SIDE A', 465, 290);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Audio Cassette Tape Label & Inlay Texture
   */
  static createCassetteLabel(title, publisher = 'SOFTWARE PROJECTS', type = 'C60') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Cassette sticker background
    ctx.fillStyle = '#fef08a'; // Vintage warm yellow cassette sticker
    ctx.fillRect(0, 0, 512, 256);

    // Top color strip
    ctx.fillStyle = '#dc2626'; // Vibrant red header
    ctx.fillRect(0, 0, 512, 45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SINCLAIR ZX SPECTRUM 48K/128K', 20, 31);

    ctx.textAlign = 'right';
    ctx.fillText(type, 492, 31);

    // Game Title
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 34px -apple-system, BlinkMacSystemFont, "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), 256, 105);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`© 1984 ${publisher}`, 256, 135);

    // Center cutout area for tape reels (marked with guides)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(110, 160, 292, 45);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(150, 182, 16, 0, Math.PI * 2);
    ctx.arc(362, 182, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LOAD "" [ENTER]', 256, 235);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Authentic Music Album Cassette Tape Labels (The Beatles, Public Enemy)
   */
  static createMusicCassetteLabel(album, artist) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const isBeatles = /beatles/i.test(artist);
    const isPublicEnemy = /public enemy/i.test(artist);

    if (isBeatles) {
      // Classic Parlophone / Apple Records Off-White Vintage J-Card / Tape Shell Sticker
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 512, 256);

      // Top Black Header Bar
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('PARLOPHONE • TC-PCS 7027', 16, 25);
      ctx.textAlign = 'right';
      ctx.fillText('STEREO • DOLBY B', 496, 25);

      // Iconic Beatles Drop-T Logo
      ctx.fillStyle = '#0f172a';
      ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE BEATLES', 256, 88);

      // Album Title
      ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
      ctx.fillStyle = '#1e3a8a';
      ctx.fillText(album.toUpperCase(), 256, 122);

      // Track highlight & copyright
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('A Day In The Life • Lucy In The Sky • With A Little Help', 256, 144);

      // Cassette Center Spool Cutouts
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(110, 160, 292, 45);
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(150, 182, 16, 0, Math.PI * 2);
      ctx.arc(362, 182, 16, 0, Math.PI * 2);
      ctx.fill();

      // Apple Records small insignia on bottom
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(256, 182, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText('An EMI / Apple Recording • Manufactured in the UK', 256, 235);

    } else if (isPublicEnemy) {
      // Def Jam 1988 Matte Charcoal / Crimson / High-Impact Rap Cassette
      ctx.fillStyle = '#111215';
      ctx.fillRect(0, 0, 512, 256);

      // Top Red Warning Header
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, 512, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DEF JAM RECORDINGS • C44303', 16, 25);
      ctx.textAlign = 'right';
      ctx.fillText('CHROME • CR-O2 • 120µs', 496, 25);

      // Public Enemy Stencil
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 38px "Impact", "Arial Black", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('PUBLIC ENEMY', 40, 88);

      // Album Title
      ctx.font = 'bold 15px "Arial", sans-serif';
      ctx.fillStyle = '#f87171';
      ctx.fillText(album.toUpperCase(), 40, 116);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('Fight The Power • Rebel Without A Pause • Bring The Noise', 40, 138);

      // Iconic Target Crosshair Graphic on Right
      const cx = 420;
      const cy = 100;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(cx - 36, cy); ctx.lineTo(cx + 36, cy);
      ctx.moveTo(cx, cy - 36); ctx.lineTo(cx, cy + 36);
      ctx.stroke();

      // Silhouette b-boy figure in crosshair center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 4, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.fillRect(cx - 3, cy, 6, 8); // Body

      // Cassette Center Spool Cutouts
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(110, 160, 292, 45);
      ctx.fillStyle = '#111215';
      ctx.beginPath();
      ctx.arc(150, 182, 16, 0, Math.PI * 2);
      ctx.arc(362, 182, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BASS OVERLOAD • PLAY AT MAXIMUM VOLUME', 256, 235);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Retro 1980s Magazine / Poster Texture (Crash, Sinclair User, etc.)
   */
  static createPosterTexture(title, sub, badgeColor = '#ff0055') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 724; // Standard A4 poster aspect ratio
    const ctx = canvas.getContext('2d');

    // Dramatic retro dark synth/cosmic background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 724);
    bgGrad.addColorStop(0, '#090a14');
    bgGrad.addColorStop(0.5, '#1e1035');
    bgGrad.addColorStop(1, '#3b0d2b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 724);

    // Retro sun / neon grid horizon
    const sunGrad = ctx.createLinearGradient(0, 250, 0, 480);
    sunGrad.addColorStop(0, '#ffe600');
    sunGrad.addColorStop(1, '#ff0066');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(256, 400, 140, Math.PI, 0);
    ctx.fill();

    // Perspective wireframe grid floor on lower half
    ctx.strokeStyle = '#00d2ff';
    ctx.lineWidth = 1.5;
    for (let x = -200; x <= 712; x += 40) {
      ctx.beginPath();
      ctx.moveTo(256, 400);
      ctx.lineTo(x, 724);
      ctx.stroke();
    }
    for (let y = 400; y <= 724; y += (y - 380) * 0.4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Top Header / Magazine Logo
    ctx.fillStyle = badgeColor;
    ctx.fillRect(30, 30, 452, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 62px -apple-system, BlinkMacSystemFont, "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), 256, 92);

    // Sinclair Rainbow Stripes
    const stripeColors = ['#cd0000', '#cdcd00', '#00cd00', '#00cdcd'];
    stripeColors.forEach((c, idx) => {
      ctx.fillStyle = c;
      ctx.fillRect(30, 114 + idx * 5, 452, 5);
    });

    // Subtitle / Slogan
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(sub.toUpperCase(), 256, 175);

    // Issue / Price badge
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('UK £1.20 | ISSUE #18 | 100% SPECCY', 256, 210);

    // White paper border with tape corners
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 492, 704);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Iconic Acid House Yellow Neon Smiley Face Texture (1988-1992 Rave culture)
   */
  static createAcidSmileyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Transparent / dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, 512, 512);

    // Radiant outer yellow glow
    const glow = ctx.createRadialGradient(256, 256, 180, 256, 256, 250);
    glow.addColorStop(0, 'rgba(255, 230, 0, 0.5)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();

    // Vibrant Electric Yellow Face
    const faceGrad = ctx.createRadialGradient(230, 230, 20, 256, 256, 200);
    faceGrad.addColorStop(0, '#fffb00');
    faceGrad.addColorStop(0.85, '#ffd000');
    faceGrad.addColorStop(1, '#e6a800');
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(256, 256, 200, 0, Math.PI * 2);
    ctx.fill();

    // Thick Black Outline
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Left Oval Eye
    ctx.fillStyle = '#050505';
    ctx.beginPath();
    ctx.ellipse(190, 200, 22, 44, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // Right Oval Eye
    ctx.beginPath();
    ctx.ellipse(322, 200, 22, 44, 0.05, 0, Math.PI * 2);
    ctx.fill();

    // Iconic Wide Curved Smile
    ctx.beginPath();
    ctx.arc(256, 250, 115, 0.22 * Math.PI, 0.78 * Math.PI, false);
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Little smile corner dimples
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(160, 325);
    ctx.lineTo(146, 310);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(352, 325);
    ctx.lineTo(366, 310);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Nirvana - Nevermind (1991) Iconic Aquatic Poster Texture
   */
  static createNirvanaTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 724;
    const ctx = canvas.getContext('2d');

    // Deep turquoise aquatic swimming pool gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 724);
    grad.addColorStop(0, '#023e8a');
    grad.addColorStop(0.35, '#0077b6');
    grad.addColorStop(0.7, '#0096c7');
    grad.addColorStop(1, '#03045e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 724);

    // Underwater sunlight caustics / ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 28; i++) {
      ctx.beginPath();
      let sx = Math.random() * 512;
      let sy = Math.random() * 600;
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx + 80, sy + 30, sx + 120, sy - 20, sx + 220, sy + 40);
      ctx.stroke();
    }

    // Floating one dollar bill on a fish hook
    ctx.save();
    ctx.translate(340, 240);
    ctx.rotate(0.25);
    // Green dollar note
    ctx.fillStyle = '#85bb65';
    ctx.fillRect(-45, -25, 90, 50);
    ctx.strokeStyle = '#274e13';
    ctx.lineWidth = 2;
    ctx.strokeRect(-45, -25, 90, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('$1', 0, 8);
    // Fishing line and metallic hook
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(10, -180);
    ctx.stroke();
    ctx.restore();

    // Big wavy "NIRVANA" logo (Onyx typeface recreation)
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '6px';
    ctx.fillText('NIRVANA', 256, 110);

    // Subtitle "nevermind" in signature wavy script
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'italic bold 36px "Brush Script MT", cursive, sans-serif';
    ctx.fillText('nevermind', 256, 640);

    // Track highlights badge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(50, 665, 412, 35);
    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('SMELLS LIKE TEEN SPIRIT • COME AS YOU ARE • 1991', 256, 688);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Oasis - Definitely Maybe (1994) Poster Texture
   */
  static createOasisTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 724;
    const ctx = canvas.getContext('2d');

    // Warm sepia indie living room tone
    const grad = ctx.createLinearGradient(0, 0, 0, 724);
    grad.addColorStop(0, '#1c1917');
    grad.addColorStop(0.5, '#292524');
    grad.addColorStop(1, '#0c0a09');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 724);

    // Inner photo frame with white border
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(35, 80, 442, 450);

    // Living room scene backdrop
    const roomGrad = ctx.createLinearGradient(35, 80, 477, 530);
    roomGrad.addColorStop(0, '#57534e');
    roomGrad.addColorStop(0.5, '#78716c');
    roomGrad.addColorStop(1, '#44403c');
    ctx.fillStyle = roomGrad;
    ctx.fillRect(40, 85, 432, 440);

    // Living room floor & window silhouette
    ctx.fillStyle = '#292524';
    ctx.fillRect(40, 360, 432, 165);

    // Window light beam
    ctx.fillStyle = 'rgba(255, 255, 230, 0.15)';
    ctx.beginPath();
    ctx.moveTo(340, 100);
    ctx.lineTo(440, 100);
    ctx.lineTo(470, 480);
    ctx.lineTo(240, 480);
    ctx.fill();

    // Iconic Oasis boxed logo: black rectangle with white text
    ctx.fillStyle = '#000000';
    ctx.fillRect(75, 40, 362, 70);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(75, 40, 362, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('oasis', 256, 92);

    // "Definitely Maybe" title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic bold 38px Georgia, serif';
    ctx.fillText('Definitely Maybe', 256, 580);

    // Singles listing
    ctx.fillStyle = '#d6d3d1';
    ctx.font = 'bold 15px -apple-system, sans-serif';
    ctx.fillText('LIVE FOREVER • SUPERSONIC • ROCK \'N\' ROLL STAR', 256, 620);
    ctx.fillText('CREATION RECORDS • AUGUST 1994', 256, 650);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * The Stone Roses - Lemon & Paint Splatter Poster Texture (1989/1990)
   */
  static createStoneRosesTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 724;
    const ctx = canvas.getContext('2d');

    // Off-white canvas surface
    ctx.fillStyle = '#f5f5f0';
    ctx.fillRect(0, 0, 512, 724);

    // John Squire style paint splatters (Jackson Pollock tribute)
    const splashColors = ['#15803d', '#b91c1c', '#1e3a8a', '#171717', '#eab308'];
    for (let s = 0; s < 120; s++) {
      ctx.fillStyle = splashColors[s % splashColors.length];
      const sx = Math.random() * 512;
      const sy = Math.random() * 540 + 100;
      const sr = Math.random() * 14 + 2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();

      // Splatter drip
      if (Math.random() > 0.6) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = Math.random() * 3 + 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (Math.random() - 0.5) * 40, sy + Math.random() * 60);
        ctx.stroke();
      }
    }

    // The iconic sliced lemon in the center!
    const lx = 256;
    const ly = 360;
    const lr = 90;

    // Lemon yellow peel
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 5;
    ctx.stroke();

    // White pith
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.arc(lx, ly, lr - 10, 0, Math.PI * 2);
    ctx.fill();

    // Lemon pulp segments
    for (let seg = 0; seg < 8; seg++) {
      const a1 = (seg * Math.PI) / 4 + 0.05;
      const a2 = ((seg + 1) * Math.PI) / 4 - 0.05;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.arc(lx, ly, lr - 16, a1, a2);
      ctx.closePath();
      ctx.fill();
    }

    // Top typography: "THE STONE ROSES"
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 46px -apple-system, BlinkMacSystemFont, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '4px';
    ctx.fillText('THE STONE ROSES', 256, 75);

    // Bottom tracks: "FOOLS GOLD • I WANNA BE ADORED"
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px -apple-system, sans-serif';
    ctx.fillText('FOOLS GOLD', 256, 610);
    ctx.font = 'bold 16px -apple-system, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('I WANNA BE ADORED • SHE BANGS THE DRUMS', 256, 645);
    ctx.fillText('SILVERTONE RECORDS', 256, 675);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Blur - Parklife (1994) Poster Texture
   */
  static createBlurTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 724;
    const ctx = canvas.getContext('2d');

    // Vibrant Yellow/Gold Background
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(0, 0, 512, 724);

    // Bold blue border
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 16;
    ctx.strokeRect(10, 10, 492, 704);

    // "blur" lower-case logo
    ctx.fillStyle = '#1e3a8a';
    ctx.font = '900 84px -apple-system, BlinkMacSystemFont, "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('blur', 256, 120);

    // "PARKLIFE" in bold condensed letters with white inline
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 68px "Arial Black", sans-serif';
    ctx.fillText('PARKLIFE', 256, 210);

    // Racing Greyhounds Silhouettes running
    ctx.fillStyle = '#1e3a8a';
    for (let g = 0; g < 2; g++) {
      const gx = 160 + g * 150;
      const gy = 360 + g * 40;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 70, 25, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.fillRect(gx - 40, gy + 15, 8, 50);
      ctx.fillRect(gx + 30, gy + 15, 8, 48);
      // Neck & head
      ctx.beginPath();
      ctx.ellipse(gx + 65, gy - 20, 20, 10, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Racing track lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(30, 490);
    ctx.lineTo(482, 490);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, 530, 452, 130);
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillText('GIRLS & BOYS • PARKLIFE', 256, 580);
    ctx.font = 'bold 18px -apple-system, sans-serif';
    ctx.fillText('END OF A CENTURY • TO THE END', 256, 615);
    ctx.font = 'bold 14px monospace';
    ctx.fillText('FOOD / PARLOPHONE • 1994', 256, 642);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * The Prodigy - Music For The Jilted Generation (1994) Poster Texture
   */
  static createProdigyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 724;
    const ctx = canvas.getContext('2d');

    // Dark gritty rave backdrop
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 512, 724);

    // Neon green radioactive pulse
    const grad = ctx.createRadialGradient(256, 320, 30, 256, 320, 220);
    grad.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(256, 320, 220, 0, Math.PI * 2);
    ctx.fill();

    // The Prodigy iconic ant logo
    ctx.fillStyle = '#22c55e';
    ctx.font = '900 58px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '5px';
    ctx.fillText('THE PRODIGY', 256, 120);

    // Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px -apple-system, sans-serif';
    ctx.fillText('MUSIC FOR THE JILTED GENERATION', 256, 170);

    // Stylized Scream face / Ant motif
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(256, 340, 90, 0, Math.PI * 2);
    ctx.stroke();

    // Piercing eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(220, 320, 16, 0, Math.PI * 2);
    ctx.arc(292, 320, 16, 0, Math.PI * 2);
    ctx.fill();

    // Track listing
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px -apple-system, sans-serif';
    ctx.fillText('VOODOO PEOPLE • NO GOOD (START THE DANCE)', 256, 560);
    ctx.fillStyle = '#86efac';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('POISON • BREAK & ENTER • SPEEDWAY', 256, 595);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px monospace';
    ctx.fillText('XL RECORDINGS • 1994', 256, 650);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Street Fighter II - Championship Edition (1992 Arcade Poster)
   */
  static createStreetFighter2Texture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 724;
    const ctx = canvas.getContext('2d');

    // Fiery red/orange arcade cabinet background
    const grad = ctx.createLinearGradient(0, 0, 0, 724);
    grad.addColorStop(0, '#1e0500');
    grad.addColorStop(0.5, '#7f1d1d');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 724);

    // Top: Capcom logo
    ctx.fillStyle = '#facc15';
    ctx.font = '900 36px "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CAPCOM', 256, 55);

    // STREET FIGHTER II Big Arcade Logo
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.font = '900 52px "Arial Black", "Impact", sans-serif';
    ctx.strokeText('STREET FIGHTER', 256, 130);
    ctx.fillText('STREET FIGHTER', 256, 130);

    // Roman numeral "II"
    ctx.fillStyle = '#f97316';
    ctx.font = '900 110px "Arial Black", sans-serif';
    ctx.strokeText('II', 256, 240);
    ctx.fillText('II', 256, 240);

    // "CHAMPION EDITION" Ribbon
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(50, 275, 412, 45);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 24px -apple-system, sans-serif';
    ctx.fillText('CHAMPION EDITION', 256, 306);

    // Hadouken Energy Ball in Center
    const fireGrad = ctx.createRadialGradient(256, 430, 10, 256, 430, 90);
    fireGrad.addColorStop(0, '#ffffff');
    fireGrad.addColorStop(0.4, '#38bdf8');
    fireGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = fireGrad;
    ctx.beginPath();
    ctx.arc(256, 430, 90, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 32px sans-serif';
    ctx.fillText('HADOUKEN!', 256, 440);

    // Characters list
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('RYU • KEN • CHUN-LI • GUILE • BLANKA', 256, 570);
    ctx.fillText('DHALSIM • ZANGIEF • E. HONDA', 256, 600);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('PLAY AS THE 4 GRAND MASTERS!', 256, 640);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.fillText('© 1991, 1992 CAPCOM CO., LTD.', 256, 680);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Sonic the Hedgehog 16-Bit Cardboard Cutout / Poster Texture (1991)
   */
  static createSonicCutoutTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 724;
    const ctx = canvas.getContext('2d');

    // Sega check-pattern / Green Hill Zone checkerboard
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 512, 724);

    // Checkered Green Hill floor
    const checkSize = 32;
    for (let x = 0; x < 512; x += checkSize) {
      for (let y = 460; y < 724; y += checkSize) {
        ctx.fillStyle = ((x / checkSize + y / checkSize) % 2 === 0) ? '#ca8a04' : '#854d0e';
        ctx.fillRect(x, y, checkSize, checkSize);
      }
    }

    // Top Sega Logo
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SEGA', 256, 60);

    // Sonic Blue Silhouette & Ring
    const ringGrad = ctx.createRadialGradient(256, 260, 80, 256, 260, 140);
    ringGrad.addColorStop(0, '#fef08a');
    ringGrad.addColorStop(0.7, '#eab308');
    ringGrad.addColorStop(1, '#ca8a04');
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(256, 260, 120, 0, Math.PI * 2);
    ctx.stroke();

    // Sonic Face & Spikes
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(256, 260, 75, 0, Math.PI * 2);
    ctx.fill();
    // Spikes behind
    ctx.beginPath();
    ctx.moveTo(200, 240);
    ctx.lineTo(130, 200);
    ctx.lineTo(190, 280);
    ctx.lineTo(110, 290);
    ctx.lineTo(195, 330);
    ctx.fill();

    // Peach Muzzle
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.ellipse(265, 285, 38, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Big White Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(245, 235, 18, 28, -0.1, 0, Math.PI * 2);
    ctx.ellipse(280, 235, 18, 28, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(250, 235, 8, 0, Math.PI * 2);
    ctx.arc(275, 235, 8, 0, Math.PI * 2);
    ctx.fill();

    // Banner "SONIC THE HEDGEHOG"
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(40, 390, 432, 60);
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 390, 432, 60);
    ctx.fillStyle = '#1d4ed8';
    ctx.font = '900 32px "Arial Black", sans-serif';
    ctx.fillText('SONIC THE HEDGEHOG', 256, 432);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('16-BIT MEGA DRIVE • 1991', 256, 540);
    ctx.font = 'bold 18px monospace';
    ctx.fillText('BLAST PROCESSING SPEED', 256, 580);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Authentic 1992 UK Rave Flyer (Fantazia / Dreamscape style)
   */
  static createRaveFlyerTexture(name = 'FANTAZIA', subtitle = 'SUMMERTIME \'92', themeColor = '#ec4899') {
    const canvas = document.createElement('canvas');
    canvas.width = 380;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');

    // Deep purple cosmic backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, 540);
    grad.addColorStop(0, '#18002e');
    grad.addColorStop(0.5, '#3b0764');
    grad.addColorStop(1, '#090014');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 380, 540);

    // Laser beams cutting through sky
    const beamColors = ['#00ffcc', '#ff00aa', '#ffff00', '#00d2ff'];
    for (let b = 0; b < 16; b++) {
      ctx.strokeStyle = beamColors[b % beamColors.length];
      ctx.lineWidth = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.moveTo(190, 240);
      ctx.lineTo(Math.random() * 380, Math.random() > 0.5 ? 0 : 540);
      ctx.stroke();
    }

    // Surreal crystal castle / pyramid
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath();
    ctx.moveTo(190, 160);
    ctx.lineTo(80, 340);
    ctx.lineTo(300, 340);
    ctx.closePath();
    ctx.fill();

    // Radiant event title
    ctx.fillStyle = themeColor;
    ctx.font = '900 44px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 190, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(subtitle, 190, 120);

    // Rave lineup
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('DJ SLIPMATT • CARL COX • GROOVERIDER', 190, 380);
    ctx.fillText('TOP BUZZ • RATPACK • EASYGROOVE', 190, 410);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '12px monospace';
    ctx.fillText('10,000 RAVERS • LASER SHOW • ESP SYSTEM', 190, 445);
    ctx.fillText('TICKETS £17.50 IN ADVANCE', 190, 475);
    ctx.fillStyle = '#a855f7';
    ctx.fillText('PEACE • LOVE • UNITY • RESPECT', 190, 510);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Nintendo Game Boy (1989-1992 DMG-01) Screen Texture showing Tetris
   */
  static createGameBoyScreenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 144;
    const ctx = canvas.getContext('2d');

    // Iconic 4-shade olive green / pea-soup dot-matrix LCD
    // Shades: #8bac0f (lightest), #9bbc0f, #306230, #0f380f (darkest)
    ctx.fillStyle = '#9bbc0f';
    ctx.fillRect(0, 0, 160, 144);

    // Tetris playing pit border
    ctx.strokeStyle = '#0f380f';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 10, 80, 124);

    // Falling Tetromino (L-shape in mid-air)
    ctx.fillStyle = '#0f380f';
    const bSize = 7;
    // Falling piece
    ctx.fillRect(46, 35, bSize, bSize);
    ctx.fillRect(46, 43, bSize, bSize);
    ctx.fillRect(46, 51, bSize, bSize);
    ctx.fillRect(54, 51, bSize, bSize);

    // Stack of landed blocks at the bottom
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 10; c++) {
        if ((r + c) % 3 !== 0) {
          ctx.fillRect(20 + c * 7.8, 132 - r * 8, 7, 7);
          ctx.strokeStyle = '#8bac0f';
          ctx.lineWidth = 1;
          ctx.strokeRect(20 + c * 7.8, 132 - r * 8, 7, 7);
        }
      }
    }

    // Right side: HUD (Score, Level, Next piece)
    ctx.fillStyle = '#0f380f';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('SCORE', 106, 25);
    ctx.fillText('024800', 106, 38);

    ctx.fillText('LEVEL', 106, 58);
    ctx.fillText('04', 106, 70);

    ctx.fillText('LINES', 106, 90);
    ctx.fillText('038', 106, 102);

    // Next piece box
    ctx.strokeRect(105, 110, 36, 22);
    // T-piece inside next box
    ctx.fillRect(116, 114, 5, 5);
    ctx.fillRect(122, 114, 5, 5);
    ctx.fillRect(128, 114, 5, 5);
    ctx.fillRect(122, 120, 5, 5);

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  }

  /**
   * Early 90s Blockbuster VHS Tape Cover / Spine Texture
   */
  static createVhsCoverTexture(title, year = '1993', studio = 'UNIVERSAL', color = '#dc2626') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Black plastic cassette case
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 128, 512);

    // Spine label sticker
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(10, 20, 108, 472);

    // Studio banner
    ctx.fillStyle = color;
    ctx.fillRect(10, 20, 108, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(studio, 64, 48);

    // Vertical Title
    ctx.save();
    ctx.translate(64, 280);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Impact", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), 0, 8);
    ctx.restore();

    // VHS Hi-Fi stereo badge & rating
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(18, 430, 92, 45);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`VHS • ${year}`, 64, 450);
    ctx.fillText('PAL / HI-FI', 64, 465);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Iconic Sgt. Pepper's Lonely Hearts Club Band Bass Drum Face Texture
   */
  static createSgtPeppersDrumTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Circular drum base (vintage parchment / drum skin)
    const bgGrad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
    bgGrad.addColorStop(0, '#fef08a');
    bgGrad.addColorStop(0.4, '#fde047');
    bgGrad.addColorStop(0.75, '#ca8a04');
    bgGrad.addColorStop(1, '#854d0e');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(256, 256, 256, 0, Math.PI * 2);
    ctx.fill();

    // Dark indigo blue inner ring
    const blueGrad = ctx.createRadialGradient(256, 256, 10, 256, 256, 220);
    blueGrad.addColorStop(0, '#1e3a8a');
    blueGrad.addColorStop(0.8, '#172554');
    blueGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = blueGrad;
    ctx.beginPath();
    ctx.arc(256, 256, 220, 0, Math.PI * 2);
    ctx.fill();

    // Ornate gold filigree concentric rings & brass rim studs
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(256, 256, 220, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(256, 256, 204, 0, Math.PI * 2);
    ctx.stroke();

    // 24 decorative brass rivets around the outer circumference
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const rx = 256 + Math.cos(angle) * 238;
      const ry = 256 + Math.sin(angle) * 238;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(rx, ry, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#713f12';
      ctx.beginPath();
      ctx.arc(rx, ry, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Swirling rays / sunburst in background
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.15)';
    ctx.lineWidth = 2;
    for (let r = 0; r < 36; r++) {
      const a = (r / 36) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(256, 256);
      ctx.lineTo(256 + Math.cos(a) * 200, 256 + Math.sin(a) * 200);
      ctx.stroke();
    }

    // Top Arched Scroll: "LONELY HEARTS"
    ctx.fillStyle = '#fef9c3';
    ctx.font = '900 24px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillText('★  LONELY HEARTS  ★', 256, 120);

    // Centerpiece: "SGT PEPPERS" in authentic Victorian circus carnival bold font
    ctx.fillStyle = '#facc15';
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Impact", "Arial Black", serif';
    ctx.fillText("SGT PEPPERS", 256, 185);

    // Gold decorative divider
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(110, 210);
    ctx.lineTo(402, 210);
    ctx.stroke();

    // Middle banner: "ONE & ONLY"
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold italic 22px "Georgia", serif';
    ctx.fillText('ONE & ONLY', 256, 245);

    // Bottom main curve: "CLUB BAND"
    ctx.fillStyle = '#facc15';
    ctx.font = '900 44px -apple-system, BlinkMacSystemFont, "Impact", "Arial Black", serif';
    ctx.fillText("CLUB BAND", 256, 310);

    // Center star medallion
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(256, 385, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 20px "Georgia", serif';
    ctx.fillText('1967', 256, 392);

    ctx.shadowBlur = 0;
    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Public Enemy 90s Standee Cutout Texture (Chuck D + Flavor Flav with his giant clock!)
   */
  static createPublicEnemyCutoutTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    // High impact black / crimson background
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, 512, 768);

    // Red spray stencil background glow
    const grad = ctx.createRadialGradient(256, 320, 20, 256, 320, 280);
    grad.addColorStop(0, 'rgba(220, 38, 38, 0.45)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 768);

    // Top Header: Public Enemy Crosshairs Target Logo
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(256, 110, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(256, 50); ctx.lineTo(256, 170);
    ctx.moveTo(196, 110); ctx.lineTo(316, 110);
    ctx.stroke();

    // Silhouette inside crosshairs (b-boy figure)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(256, 95, 12, 0, Math.PI * 2); // head
    ctx.fill();
    ctx.fillRect(248, 107, 16, 30); // body

    // Main Title: PUBLIC ENEMY
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 46px "Impact", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PUBLIC ENEMY', 256, 215);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 18px "Arial", sans-serif';
    ctx.fillText('IT TAKES A NATION OF MILLIONS TO HOLD US BACK', 256, 245);

    // Left Figure: Chuck D (Black athletic jacket, backwards cap, mic in hand)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(60, 340, 170, 340, 24);
    ctx.fill();

    // Chuck D Head & Raiders Cap
    ctx.fillStyle = '#a16207';
    ctx.beginPath();
    ctx.arc(145, 310, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(110, 285, 70, 24); // Cap
    ctx.fillRect(160, 295, 35, 10); // Visor

    // Right Figure: Flavor Flav with his GIANT WALL CLOCK NECKLACE!
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(280, 340, 170, 340, 24);
    ctx.fill();

    // Flavor Flav Head & Cap
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(365, 310, 28, 0, Math.PI * 2);
    ctx.fill();
    // White Viking Horn / Toque Cap
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(335, 275, 60, 28);

    // Dark Sunglasses
    ctx.fillStyle = '#020617';
    ctx.fillRect(342, 304, 46, 12);

    // Thick gold chain hanging around his neck
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(365, 380, 48, 65, 0, 0, Math.PI);
    ctx.stroke();

    // THE ICONIC GIANT FLAVOR FLAV WALL CLOCK!
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(365, 470, 68, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 10;
    ctx.stroke();

    // Clock Numbers & Hands pointing to 10 past 10
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('12', 365, 425);
    ctx.fillText('3', 415, 476);
    ctx.fillText('6', 365, 525);
    ctx.fillText('9', 315, 476);

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(365, 470);
    ctx.lineTo(395, 440); // Minute hand
    ctx.moveTo(365, 470);
    ctx.lineTo(340, 455); // Hour hand
    ctx.stroke();

    // Bottom slogans
    ctx.fillStyle = '#facc15';
    ctx.font = '900 24px "Impact", sans-serif';
    ctx.fillText('FIGHT THE POWER • DON\'T BELIEVE THE HYPE', 256, 730);

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * The Beatles in Sgt. Pepper Day-Glo Satin Military Regalia (1967/90s Tribute)
   */
  static createBeatlesSgtPepperCutoutTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    // Vibrant sky blue psychedelic backing
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 768);
    skyGrad.addColorStop(0, '#0284c7');
    skyGrad.addColorStop(0.5, '#38bdf8');
    skyGrad.addColorStop(1, '#7dd3fc');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 512, 768);

    // Ornate Victorian Day-Glo Banner at top
    ctx.fillStyle = '#facc15';
    ctx.font = '900 38px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;
    ctx.fillText('★ THE BEATLES ★', 256, 68);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Georgia", serif';
    ctx.fillText('SGT. PEPPER\'S LONELY HEARTS CLUB BAND', 256, 102);
    ctx.shadowBlur = 0;

    // The 4 Beatles in their famous vivid satin band uniforms standing side-by-side:
    // 1. John Lennon (Chartreuse / Yellow-Orange)
    // 2. Ringo Starr (Shocking Fuchsia Pink)
    // 3. Paul McCartney (Cobalt Royal Sky Blue)
    // 4. George Harrison (Crimson Magenta / Red)

    const band = [
      { name: 'JOHN', x: 74, color: '#f59e0b', frogColor: '#fef08a', hairSkin: '#a16207' },
      { name: 'RINGO', x: 196, color: '#ec4899', frogColor: '#fbcfe8', hairSkin: '#78350f' },
      { name: 'PAUL', x: 316, color: '#2563eb', frogColor: '#bfdbfe', hairSkin: '#451a03' },
      { name: 'GEORGE', x: 438, color: '#dc2626', frogColor: '#fecaca', hairSkin: '#3e2312' }
    ];

    band.forEach((b) => {
      // Body (Satin Military Tunic)
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x - 52, 280, 104, 380, 18);
      ctx.fill();

      // Gold Braided Frogging (Horizontal chest bars)
      ctx.fillStyle = b.frogColor;
      for (let bar = 0; bar < 6; bar++) {
        ctx.fillRect(b.x - 38, 310 + (bar * 24), 76, 8);
      }

      // Large Gold Epaulettes with Fringe on shoulders
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(b.x - 48, 285, 18, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(b.x + 48, 285, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(b.x, 220, 32, 0, Math.PI * 2);
      ctx.fill();

      // Mop-Top / Edwardian Moustache Hair
      ctx.fillStyle = b.hairSkin;
      ctx.beginPath();
      ctx.arc(b.x, 205, 34, Math.PI, Math.PI * 2);
      ctx.fill();

      // Famous 1967 Moustache!
      ctx.fillStyle = b.hairSkin;
      ctx.beginPath();
      ctx.ellipse(b.x, 236, 18, 8, 0, 0, Math.PI);
      ctx.fill();

      // John Lennon has iconic round wire-rimmed glasses
      if (b.name === 'JOHN') {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x - 12, 218, 10, 0, Math.PI * 2);
        ctx.arc(b.x + 12, 218, 10, 0, Math.PI * 2);
        ctx.moveTo(b.x - 2, 218); ctx.lineTo(b.x + 2, 218);
        ctx.stroke();
      }

      // Member Name label at bottom
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 16px sans-serif';
      ctx.fillText(b.name, b.x, 690);
    });

    // Vibrant Yellow, Red, Pink, Blue Bed of Flowers at bottom
    for (let f = 0; f < 35; f++) {
      const fx = Math.random() * 512;
      const fy = 705 + (Math.random() * 55);
      const fr = Math.random() * 12 + 6;
      const fcols = ['#ef4444', '#facc15', '#ec4899', '#3b82f6', '#8b5cf6'];
      ctx.fillStyle = fcols[f % fcols.length];
      ctx.beginPath();
      ctx.arc(fx, fy, fr, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }
}

