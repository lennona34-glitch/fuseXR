/**
 * ZX Spectrum Snapshot & Tape Loader (.SNA, .Z80, .TAP, .TZX)
 * Ported 1:1 from the user's verified C# SnapshotLoader.cs implementation
 */

export class SnapshotLoader {
  /**
   * Detect required Spectrum model from snapshot header
   */
  static detectModel(data, ext) {
    if (ext === 'sna') {
      return data.length >= 131103 ? 'Spectrum128K' : 'Spectrum48K';
    }
    if (data.length >= 35 && (data[6] | (data[7] << 8)) === 0) {
      const extraHeaderLen = data[30] | (data[31] << 8);
      const mode = data[34];
      // First inspect actual RAM page IDs in v2/v3 blocks (pages 3, 6, 7, 9, 10 only exist in 128K)
      let offset = 32 + extraHeaderLen;
      let has128KPages = false;
      while (offset + 3 <= data.length) {
        const len = data[offset] | (data[offset + 1] << 8);
        const pageId = data[offset + 2];
        if (pageId === 3 || pageId === 6 || pageId === 7 || pageId === 9 || pageId === 10) {
          has128KPages = true;
          break;
        }
        offset += 3 + (len === 0xffff ? 16384 : len);
      }
      if (has128KPages) {
        if (mode === 7 || mode === 8) return 'SpectrumPlus3';
        if (mode === 9) return 'Pentagon128';
        return 'Spectrum128K';
      }
      if (extraHeaderLen === 23) {
        // Z80 v2: 0=48K, 1=48K+IF1, 2=SamRam, 3=128K, 4=128K+IF1
        if (mode === 3 || mode === 4) return 'Spectrum128K';
        if (mode === 7 || mode === 8) return 'SpectrumPlus3';
        if (mode === 9) return 'Pentagon128';
      } else {
        // Z80 v3: 0=48K, 1=48K+IF1, 2=SamRam, 3=48K+MGT, 4=128K, 5=128K+IF1, 6=128K+MGT
        // Note: some tools write v2 hardware numbers in v3 headers (mode 3=128K, mode 4=48K),
        // so only classify as 128K when has128KPages is true or mode >= 7!
        if (mode === 7 || mode === 8) return 'SpectrumPlus3';
        if (mode === 9) return 'Pentagon128';
      }
    }
    return 'Spectrum48K';
  }

  /**
   * Load .SNA format snapshot (48K and 128K standard)
   */
  static loadSNA(spectrum, buffer) {
    const data = new Uint8Array(buffer);
    if (data.length < 49179) {
      throw new Error(`Invalid SNA file size: ${data.length} bytes (expected >= 49179 bytes)`);
    }

    // Cleanly reset CPU, RAM banks, paging registers, and AY/Beeper audio before unpacking
    if (typeof spectrum.ejectDisk === 'function') spectrum.ejectDisk();
    if (typeof spectrum.ejectTape === 'function') spectrum.ejectTape();
    spectrum.reset(true);

    const cpu = spectrum.cpu;

    cpu.i = data[0];
    cpu.l_ = data[1]; cpu.h_ = data[2];
    cpu.e_ = data[3]; cpu.d_ = data[4];
    cpu.c_ = data[5]; cpu.b_ = data[6];
    cpu.f_ = data[7]; cpu.a_ = data[8];
    cpu.l = data[9];  cpu.h = data[10];
    cpu.e = data[11]; cpu.d = data[12];
    cpu.c = data[13]; cpu.b = data[14];
    cpu.iy = data[15] | (data[16] << 8);
    cpu.ix = data[17] | (data[18] << 8);
    cpu.iff1 = (data[19] & 0x04) ? 1 : 0;
    cpu.iff2 = cpu.iff1;
    cpu.r = data[20];
    cpu.f = data[21]; cpu.a = data[22];
    cpu.sp = data[23] | (data[24] << 8);
    cpu.im = data[25] & 0x03;
    if (cpu.im === 0) cpu.im = 1;
    spectrum.ula.setBorderColor(data[26] & 0x07);

    // First 48KB RAM payload
    const ram = data.subarray(27, 27 + 49152);

    if (data.length >= 131103 && spectrum.pagedMemory) {
      // 128K SNA format
      const pc128 = data[49179] | (data[49180] << 8);
      const port7FFD = data[49181];
      const trDosPaged = data[49182];
      const topBank = port7FFD & 0x07;

      spectrum.pagedMemory.setRamBank(5, ram.subarray(0, 16384));
      spectrum.pagedMemory.setRamBank(2, ram.subarray(16384, 32768));
      spectrum.pagedMemory.setRamBank(topBank, ram.subarray(32768, 49152));

      let offset = 49183;
      for (let bank = 0; bank < 8; bank++) {
        if (bank === 5 || bank === 2 || bank === topBank) continue;
        if (offset + 16384 <= data.length) {
          spectrum.pagedMemory.setRamBank(bank, data.subarray(offset, offset + 16384));
          offset += 16384;
        }
      }

      spectrum.pagedMemory.setPagingState(port7FFD, 0, (port7FFD & 0x20) !== 0);
      spectrum.pagedMemory.trDosActive = trDosPaged !== 0;
      cpu.pc = pc128;
      cpu.halted = false;
      console.log(`[SnapshotLoader] 128K SNA loaded! PC=0x${cpu.pc.toString(16).padStart(4, '0')}, 7FFD=0x${port7FFD.toString(16)}`);
      return;
    }

    if (spectrum.pagedMemory) {
      // 48K layout in 128K paged memory: Bank 5 (0x4000), Bank 2 (0x8000), Bank 0 (0xC000)
      // Must select ROM 1 (0x10 = 48K BASIC ROM) and lock paging (0x20) = 0x30
      spectrum.pagedMemory.setRamBank(5, ram.subarray(0, 16384));
      spectrum.pagedMemory.setRamBank(2, ram.subarray(16384, 32768));
      spectrum.pagedMemory.setRamBank(0, ram.subarray(32768, 49152));
      spectrum.pagedMemory.setPagingState(0x30, 0, true);
    } else {
      spectrum.memory48.set(ram, 0x4000);
    }

    // Retrieve PC from stack
    cpu.pc = spectrum.readByte(cpu.sp) | (spectrum.readByte((cpu.sp + 1) & 0xffff) << 8);
    cpu.sp = (cpu.sp + 2) & 0xffff;
    cpu.halted = false;

    console.log(`[SnapshotLoader] 48K SNA loaded! PC=0x${cpu.pc.toString(16).padStart(4, '0')}, SP=0x${cpu.sp.toString(16).padStart(4, '0')}`);
  }

  /**
   * Load .Z80 format snapshot (v1, v2, and v3)
   */
  static loadZ80(spectrum, buffer) {
    const data = new Uint8Array(buffer);
    if (data.length < 30) throw new Error('Truncated Z80 header');

    // Cleanly reset CPU, RAM banks, paging registers, and AY/Beeper audio before unpacking
    if (typeof spectrum.ejectDisk === 'function') spectrum.ejectDisk();
    if (typeof spectrum.ejectTape === 'function') spectrum.ejectTape();
    spectrum.reset(true);

    const cpu = spectrum.cpu;
    const isV2V3 = (data[6] | (data[7] << 8)) === 0;
    const pc = isV2V3 ? (data[32] | (data[33] << 8)) : (data[6] | (data[7] << 8));

    // Main registers
    cpu.a = data[0];
    cpu.f = data[1];
    cpu.c = data[2]; cpu.b = data[3];
    cpu.l = data[4]; cpu.h = data[5];
    cpu.pc = pc;
    cpu.sp = data[8] | (data[9] << 8);
    cpu.i = data[10];
    cpu.r = (data[11] & 0x7f) | (((data[12] === 255 ? 1 : data[12]) & 0x01) << 7);
    cpu.e = data[13]; cpu.d = data[14];

    // Shadow registers
    cpu.c_ = data[15]; cpu.b_ = data[16];
    cpu.e_ = data[17]; cpu.d_ = data[18];
    cpu.l_ = data[19]; cpu.h_ = data[20];
    cpu.a_ = data[21]; cpu.f_ = data[22];

    // Index registers
    cpu.iy = data[23] | (data[24] << 8);
    cpu.ix = data[25] | (data[26] << 8);

    // Interrupt flags
    cpu.iff1 = data[27] ? 1 : 0;
    cpu.iff2 = data[28] ? 1 : 0;
    let im = data[29] & 0x03;
    if (im === 0) im = 1; // IM0 not used on Spectrum
    cpu.im = im;

    // Border color
    const statusByte = data[12] === 255 ? 1 : data[12];
    const borderColor = (statusByte >> 1) & 0x07;
    spectrum.ula.setBorderColor(borderColor);

    if (isV2V3) {
      const extraHeaderLen = data[30] | (data[31] << 8);
      const mode = data[34];
      const port7FFD = data[35];

      // AY-3-8912 sound chip registers
      if (extraHeaderLen >= 23 && data.length >= 55) {
        const aySelected = data[38];
        for (let r = 0; r < 16; r++) {
          spectrum.audio.selectAyRegister(r);
          spectrum.audio.writeAyData(data[39 + r]);
        }
        spectrum.audio.selectAyRegister(aySelected);
      }

      const blocksOffset = 32 + extraHeaderLen;
      const blocks = SnapshotLoader.decodeV2V3Blocks(data, blocksOffset);

      const has128KPages = Boolean(blocks[3] || blocks[6] || blocks[7] || blocks[9] || blocks[10]);
      const is128K = has128KPages;
      if (!is128K) {
        // 48K mode:
        // Page 8 -> 0x4000 (RAM Bank 5)
        // Page 4 -> 0x8000 (RAM Bank 2)
        // Page 5 -> 0xC000 (RAM Bank 0)
        if (spectrum.pagedMemory) {
          if (blocks[8]) spectrum.pagedMemory.setRamBank(5, blocks[8]);
          if (blocks[4]) spectrum.pagedMemory.setRamBank(2, blocks[4]);
          if (blocks[5]) spectrum.pagedMemory.setRamBank(0, blocks[5]);
          spectrum.pagedMemory.setPagingState(0x30, 0, true);
        } else {
          if (blocks[8]) spectrum.memory48.set(blocks[8], 0x4000);
          if (blocks[4]) spectrum.memory48.set(blocks[4], 0x8000);
          if (blocks[5]) spectrum.memory48.set(blocks[5], 0xc000);
        }
      } else {
        // 128K mode:
        // Pages 3..10 correspond to RAM banks 0..7
        for (let pageId = 3; pageId <= 10; pageId++) {
          if (blocks[pageId]) {
            const bank = pageId - 3;
            if (spectrum.pagedMemory) {
              spectrum.pagedMemory.setRamBank(bank, blocks[pageId]);
            } else {
              if (bank === 5) spectrum.memory48.set(blocks[pageId], 0x4000);
              else if (bank === 2) spectrum.memory48.set(blocks[pageId], 0x8000);
              else if (bank === 0) spectrum.memory48.set(blocks[pageId], 0xc000);
            }
          }
        }

        if (spectrum.pagedMemory) {
          const special = (spectrum.pagedMemory.plus3Mode && (port7FFD & 0x10)) ? 0x04 : 0;
          spectrum.pagedMemory.setPagingState(port7FFD, special, (port7FFD & 0x20) !== 0);
        }
      }
    } else {
      // v1 unsegmented (48KB)
      const ram = SnapshotLoader.decodeRam(data);
      if (spectrum.pagedMemory) {
        spectrum.pagedMemory.setRamBank(5, ram.subarray(0, 16384));
        spectrum.pagedMemory.setRamBank(2, ram.subarray(16384, 32768));
        spectrum.pagedMemory.setRamBank(0, ram.subarray(32768, 49152));
        spectrum.pagedMemory.setPagingState(0x30, 0, true);
      } else {
        spectrum.memory48.set(ram, 0x4000);
      }
    }

    cpu.halted = false;
    console.log(`[SnapshotLoader] Z80 loaded! PC=0x${cpu.pc.toString(16).padStart(4, '0')}, SP=0x${cpu.sp.toString(16).padStart(4, '0')}`);
  }

  static decodeV2V3Blocks(snapshot, startOffset) {
    const blocks = {};
    let offset = startOffset;
    while (offset + 3 <= snapshot.length) {
      const length = snapshot[offset] | (snapshot[offset + 1] << 8);
      const pageId = snapshot[offset + 2];
      offset += 3;

      if (length === 0) break;

      const pageData = new Uint8Array(16384);
      if (length === 0xffff) {
        if (offset + 16384 > snapshot.length) break;
        pageData.set(snapshot.subarray(offset, offset + 16384));
        offset += 16384;
      } else {
        if (offset + length > snapshot.length) break;
        let outPos = 0;
        let inPos = 0;
        while (inPos < length && outPos < 16384) {
          if (inPos + 3 < length && snapshot[offset + inPos] === 0xed && snapshot[offset + inPos + 1] === 0xed) {
            const count = snapshot[offset + inPos + 2];
            const val = snapshot[offset + inPos + 3];
            inPos += 4;
            for (let c = 0; c < count && outPos < 16384; c++) {
              pageData[outPos++] = val;
            }
          } else {
            pageData[outPos++] = snapshot[offset + inPos++];
          }
        }
        offset += length;
      }
      blocks[pageId] = pageData;
    }
    return blocks;
  }

  static decodeRam(data) {
    const flags = data[12] === 255 ? 1 : data[12];
    if ((flags & 0x20) === 0) {
      // Uncompressed 48KB RAM
      return data.subarray(30, 30 + 49152);
    }
    const ram = new Uint8Array(49152);
    let input = 30;
    let output = 0;
    while (output < ram.length && input < data.length) {
      if (input + 1 < data.length && data[input] === 0xed && data[input + 1] === 0xed) {
        if (input + 3 >= data.length) break;
        const count = data[input + 2];
        const val = data[input + 3];
        input += 4;
        for (let c = 0; c < count && output < ram.length; c++) {
          ram[output++] = val;
        }
      } else {
        ram[output++] = data[input++];
      }
    }
    return ram;
  }

  /**
   * Load .TAP / .TZX tape into the emulator tape deck
   */
  static loadTAP(spectrum, buffer, filename = 'tape.tap') {
    spectrum.tape.load(buffer, filename);
  }
}
