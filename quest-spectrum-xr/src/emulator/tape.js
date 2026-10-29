/**
 * ZX Spectrum Tape Deck (.TAP and .TZX standard format)
 * Ported 1:1 from the user's verified C# TapDeck.cs implementation
 */
export class TapDeck {
  constructor() {
    this.blocks = [];
    this.blockIndex = 0;
    this.playing = false;
    this.currentTapeName = null;
  }

  get isLoaded() {
    return this.blocks.length > 0;
  }

  get hasBlocks() {
    return this.blocks.length > 0 && this.blockIndex < this.blocks.length;
  }

  get blockCount() {
    return this.blocks.length;
  }

  get currentBlockIndex() {
    return this.blockIndex;
  }

  play() {
    this.playing = true;
    return this.playing;
  }

  stop() {
    this.playing = false;
    return this.playing;
  }

  togglePlay() {
    this.playing = !this.playing;
    return this.playing;
  }

  eject() {
    this.blocks = [];
    this.blockIndex = 0;
    this.playing = false;
    this.currentTapeName = null;
    console.log('[TapDeck] Tape ejected');
  }

  load(rawData, tapeName = 'tape.tzx') {
    const data = new Uint8Array(rawData);
    this.blocks = [];
    this.blockIndex = 0;
    this.playing = true;
    this.currentTapeName = tapeName;

    // Check for TZX signature: "ZXTape!\x1A"
    if (data.length >= 10 &&
        data[0] === 0x5a && data[1] === 0x58 && data[2] === 0x54 && data[3] === 0x61 &&
        data[4] === 0x70 && data[5] === 0x65 && data[6] === 0x21 && data[7] === 0x1a) {
      this.loadTzx(data);
    } else {
      this.loadTap(data);
    }

    console.log(`[TapDeck] Loaded tape "${tapeName}" with ${this.blocks.length} blocks`);
  }

  loadTap(tap) {
    let p = 0;
    while (p + 2 <= tap.length) {
      const length = tap[p] | (tap[p + 1] << 8);
      p += 2;
      if (length === 0) continue;
      if (length > tap.length - p) {
        if (this.blocks.length > 0) break;
        throw new Error('TAP block exceeds the file length.');
      }
      const block = tap.subarray(p, p + length);
      this.blocks.push(block);
      p += length;
    }
  }

  loadTzx(tzx) {
    let p = 10; // Skip 10-byte header: "ZXTape!\x1A" + Major + Minor
    while (p < tzx.length) {
      const blockId = tzx[p++];
      switch (blockId) {
        case 0x10: { // Standard speed data block
          if (p + 4 > tzx.length) return;
          const pause = tzx[p] | (tzx[p + 1] << 8); p += 2;
          const len = tzx[p] | (tzx[p + 1] << 8); p += 2;
          if (len > tzx.length - p) return;
          this.blocks.push(tzx.subarray(p, p + len));
          p += len;
          break;
        }
        case 0x11: { // Turbo speed data block
          if (p + 18 > tzx.length) return;
          p += 15; // Skip pilot, sync, bit timings
          const len = tzx[p] | (tzx[p + 1] << 8) | (tzx[p + 2] << 16); p += 3;
          if (len > tzx.length - p) return;
          this.blocks.push(tzx.subarray(p, p + len));
          p += len;
          break;
        }
        case 0x14: { // Pure data block
          if (p + 10 > tzx.length) return;
          p += 7; // Skip bit timings and pause
          const len = tzx[p] | (tzx[p + 1] << 8) | (tzx[p + 2] << 16); p += 3;
          if (len > tzx.length - p) return;
          this.blocks.push(tzx.subarray(p, p + len));
          p += len;
          break;
        }
        case 0x12: { // Pure tone
          p += 4;
          break;
        }
        case 0x13: { // Pulse sequence
          if (p >= tzx.length) return;
          const nPulses = tzx[p++];
          p += nPulses * 2;
          break;
        }
        case 0x15: { // Direct recording
          if (p + 8 > tzx.length) return;
          p += 5;
          const len = tzx[p] | (tzx[p + 1] << 8) | (tzx[p + 2] << 16); p += 3;
          p += len;
          break;
        }
        case 0x18:
        case 0x19: { // CSW / Generalized data block
          if (p + 4 > tzx.length) return;
          const len = (tzx[p] | (tzx[p + 1] << 8) | (tzx[p + 2] << 16) | (tzx[p + 3] << 24)) >>> 0;
          p += 4 + len;
          break;
        }
        case 0x20: // Pause / stop tape
        case 0x23: // Jump to block
        case 0x24: { // Loop start
          p += 2;
          break;
        }
        case 0x21: { // Group start
          if (p >= tzx.length) return;
          const gLen = tzx[p++];
          p += gLen;
          break;
        }
        case 0x22: // Group end
        case 0x25: // Loop end
        case 0x27: { // Return from sequence
          break;
        }
        case 0x26: { // Call sequence
          if (p + 2 > tzx.length) return;
          const nCalls = tzx[p] | (tzx[p + 1] << 8); p += 2;
          p += nCalls * 2;
          break;
        }
        case 0x28: { // Select block
          if (p + 2 > tzx.length) return;
          const sLen = tzx[p] | (tzx[p + 1] << 8); p += 2;
          p += sLen;
          break;
        }
        case 0x2a: { // Stop the tape if in 48K mode
          p += 4;
          break;
        }
        case 0x2b: { // Set signal level
          p += 5;
          break;
        }
        case 0x30: { // Text description
          if (p >= tzx.length) return;
          const textLen = tzx[p++];
          p += textLen;
          break;
        }
        case 0x31: { // Message block
          if (p + 2 > tzx.length) return;
          p++; // time
          const msgLen = tzx[p++];
          p += msgLen;
          break;
        }
        case 0x32: { // Archive info
          if (p + 2 > tzx.length) return;
          const infoLen = tzx[p] | (tzx[p + 1] << 8); p += 2;
          p += infoLen;
          break;
        }
        case 0x33: { // Hardware type
          if (p >= tzx.length) return;
          const nMach = tzx[p++];
          p += nMach * 3;
          break;
        }
        case 0x34: { // Emulation info
          p += 8;
          break;
        }
        case 0x35: { // Custom info block
          if (p + 20 > tzx.length) return;
          p += 16;
          const cLen = (tzx[p] | (tzx[p + 1] << 8) | (tzx[p + 2] << 16) | (tzx[p + 3] << 24)) >>> 0;
          p += 4 + cLen;
          break;
        }
        case 0x5a: { // Glue block
          p += 9;
          break;
        }
        default:
          return; // Stop on unknown block
      }
    }
  }

  getNextBlock(expectedFlag) {
    for (let i = this.blockIndex; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      if (b.length > 0 && b[0] === expectedFlag) {
        this.blockIndex = i + 1;
        return b;
      }
    }
    return null;
  }

  rewind() {
    this.blockIndex = 0;
    this.playing = false;
  }
}
