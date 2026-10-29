/**
 * Sinclair ZX Spectrum ULA (Uncommitted Logic Array) Video & Border Renderer
 * Outputs a 320x240 RGBA framebuffer (exact 4:3 aspect ratio)
 */

export class ULA {
  constructor() {
    this.width = 320;
    this.height = 240;
    this.borderWidth = 32;
    this.borderHeight = 24;

    this.borderColor = 7; // Default white border
    this.flashPhase = false;
    this.flashCounter = 0;

    // RGBA 32-bit pixel buffer (320 * 240 * 4 bytes)
    // 1. Standard composite 2D framebuffer (Border + Paper + Ink) - 100% solid, zero cracks
    this.frameBuffer = new Uint8Array(this.width * this.height * 4);
    this.pixels32 = new Uint32Array(this.frameBuffer.buffer);
    // Clamped view over the exact same buffer for 2D Canvas ImageData
    this.clampedBuffer = new Uint8ClampedArray(this.frameBuffer.buffer);

    // 2. Stereoscopic 3D Unified Pop-Out Ink Layer (All in-game elements: platforms, characters, lasers, HUD)
    // Border and Paper are 100% transparent (alpha=0), all ink pixels are opaque (alpha=255).
    // Keeping all ink on a unified layer prevents characters from separating from platforms!
    this.inkBuffer = new Uint8Array(this.width * this.height * 4);
    this.inkPixels32 = new Uint32Array(this.inkBuffer.buffer);

    // Compatibility aliases for screen rig
    this.fgBuffer = this.inkBuffer;
    this.fgPixels32 = this.inkPixels32;
    this.brightBuffer = this.inkBuffer;
    this.brightPixels32 = this.inkPixels32;
    this.bgBuffer = this.frameBuffer;
    this.bgPixels32 = this.pixels32;

    // Standard 16 Spectrum Colors in 0xAABBGGRR (Little Endian for Uint32Array)
    this.palette32 = new Uint32Array([
      // Normal (0xCD = 205)
      0xff000000, // 0: Black
      0xffcd0000, // 1: Blue
      0xff0000cd, // 2: Red
      0xffcd00cd, // 3: Magenta
      0xff00cd00, // 4: Green
      0xffcdcd00, // 5: Cyan
      0xff00cdcd, // 6: Yellow
      0xffcdcdcd, // 7: White
      // Bright (0xFF = 255)
      0xff000000, // 8: Bright Black
      0xffff0000, // 9: Bright Blue
      0xff0000ff, // 10: Bright Red
      0xffff00ff, // 11: Bright Magenta
      0xff00ff00, // 12: Bright Green
      0xffffff00, // 13: Bright Cyan
      0xff00ffff, // 14: Bright Yellow
      0xffffffff  // 15: Bright White
    ]);
  }

  setBorderColor(color) {
    this.borderColor = color & 0x07;
  }

  // Render one complete video frame from Spectrum memory
  renderFrame(memory, baseOffset = 0x4000) {
    this.flashCounter++;
    if (this.flashCounter >= 16) {
      this.flashCounter = 0;
      this.flashPhase = !this.flashPhase;
    }

    const borderColor32 = this.palette32[this.borderColor];
    const pixels = this.pixels32;
    const inkPixels = this.inkPixels32;
    let ptr = 0;

    // 1. Top Border (24 scanlines)
    const topCount = this.width * this.borderHeight;
    pixels.fill(borderColor32, 0, topCount);
    inkPixels.fill(0, 0, topCount);
    ptr = topCount;

    // 2. Active Screen Area (192 scanlines)
    const attrBase = baseOffset + 0x1800;
    for (let y = 0; y < 192; y++) {
      // Left border (32 pixels)
      for (let bx = 0; bx < this.borderWidth; bx++) {
        pixels[ptr] = borderColor32;
        inkPixels[ptr] = 0;
        ptr++;
      }

      // 32 Character columns (256 pixels)
      // Spectrum memory interlace formula
      const lineOffset = baseOffset | ((y & 0xc0) << 5) | ((y & 0x07) << 8) | ((y & 0x38) << 2);
      const attrOffset = attrBase | ((y >> 3) << 5);

      for (let col = 0; col < 32; col++) {
        const pixelByte = memory[lineOffset | col];
        const attrByte = memory[attrOffset | col];

        const ink = attrByte & 0x07;
        const paper = (attrByte >> 3) & 0x07;
        const isBright = (attrByte & 0x40) !== 0;
        const bright = isBright ? 8 : 0;
        const flash = (attrByte & 0x80) && this.flashPhase;

        const fg = flash ? this.palette32[paper + bright] : this.palette32[ink + bright];
        const bg = flash ? this.palette32[ink + bright] : this.palette32[paper + bright];

        // 8 pixels unrolled: solid 2D composite + unified ink popout
        // Bit 7
        let isInk = (pixelByte & 0x80) !== 0;
        pixels[ptr] = isInk ? fg : bg;
        inkPixels[ptr] = isInk ? fg : 0;
        ptr++;

        // Bit 6
        isInk = (pixelByte & 0x40) !== 0;
        pixels[ptr] = isInk ? fg : bg;
        inkPixels[ptr] = isInk ? fg : 0;
        ptr++;

        // Bit 5
        isInk = (pixelByte & 0x20) !== 0;
        pixels[ptr] = isInk ? fg : bg;
        inkPixels[ptr] = isInk ? fg : 0;
        ptr++;

        // Bit 4
        isInk = (pixelByte & 0x10) !== 0;
        pixels[ptr] = isInk ? fg : bg;
        inkPixels[ptr] = isInk ? fg : 0;
        ptr++;

        // Bit 3
        isInk = (pixelByte & 0x08) !== 0;
        pixels[ptr] = isInk ? fg : bg;
        inkPixels[ptr] = isInk ? fg : 0;
        ptr++;

        // Bit 2
        isInk = (pixelByte & 0x04) !== 0;
        pixels[ptr] = isInk ? fg : bg;
        inkPixels[ptr] = isInk ? fg : 0;
        ptr++;

        // Bit 1
        isInk = (pixelByte & 0x02) !== 0;
        pixels[ptr] = isInk ? fg : bg;
        inkPixels[ptr] = isInk ? fg : 0;
        ptr++;

        // Bit 0
        isInk = (pixelByte & 0x01) !== 0;
        pixels[ptr] = isInk ? fg : bg;
        inkPixels[ptr] = isInk ? fg : 0;
        ptr++;
      }

      // Right border (32 pixels)
      for (let bx = 0; bx < this.borderWidth; bx++) {
        pixels[ptr] = borderColor32;
        inkPixels[ptr] = 0;
        ptr++;
      }
    }

    // 3. Bottom Border (24 scanlines)
    const bottomCount = this.width * this.borderHeight;
    pixels.fill(borderColor32, ptr, ptr + bottomCount);
    inkPixels.fill(0, ptr, ptr + bottomCount);
  }
}
