/**
 * ZX Spectrum 128K, +2, +3 & Pentagon Memory Map
 * Ported 1:1 from the user's verified C# Spectrum128MemoryMap implementation
 * Supports standard 0x7FFD paging, +3 0x1FFD special 4-RAM-bank modes, and TR-DOS ROM switching
 */

export class Spectrum128MemoryMap {
  constructor(romImage, plus3Mode = false, trDosRomImage = null, isPentagon = false) {
    this.plus3Mode = plus3Mode;
    this.isPentagon = isPentagon;

    // 4 ROM Banks of 16KB
    this.rom = [
      new Uint8Array(16384),
      new Uint8Array(16384),
      new Uint8Array(16384),
      new Uint8Array(16384)
    ];

    // 8 RAM Banks of 16KB
    this.ram = [
      new Uint8Array(16384), // Bank 0
      new Uint8Array(16384), // Bank 1
      new Uint8Array(16384), // Bank 2 (normal 0x8000)
      new Uint8Array(16384), // Bank 3
      new Uint8Array(16384), // Bank 4
      new Uint8Array(16384), // Bank 5 (normal 0x4000 screen)
      new Uint8Array(16384), // Bank 6
      new Uint8Array(16384)  // Bank 7 (shadow screen)
    ];

    this.paging = 0;
    this.specialPaging = 0;
    this.pagingLocked = false;

    this.trDosActive = false;
    this.trDosRom = trDosRomImage ? new Uint8Array(trDosRomImage) : null;

    if (romImage) {
      this.initRoms(romImage);
    }
  }

  initRoms(romImage) {
    for (let i = 0; i < 4; i++) {
      let srcOffset = this.plus3Mode ? i * 16384 : Math.min(i, 1) * 16384;
      if (srcOffset + 16384 <= romImage.length) {
        this.rom[i].set(romImage.subarray(srcOffset, srcOffset + 16384));
      } else {
        this.rom[i].set(romImage.subarray(0, Math.min(16384, romImage.length)));
      }
    }
  }

  clear() {
    for (const bank of this.ram) bank.fill(0);
    this.paging = 0;
    this.specialPaging = 0;
    this.pagingLocked = false;
    this.trDosActive = false;
  }

  setRamBank(bank, data) {
    if (bank >= 0 && bank < 8) {
      this.ram[bank].set(data.subarray(0, Math.min(16384, data.length)));
    }
  }

  setPagingState(paging, specialPaging = 0, locked = false) {
    this.paging = paging & 0xff;
    this.specialPaging = specialPaging & 0xff;
    this.pagingLocked = !!locked;
  }

  pageMemory(val) {
    if (this.pagingLocked) return;
    this.paging = val & 0xff;
    if (!this.isPentagon && (val & 0x20) !== 0) {
      this.pagingLocked = true;
    }
  }

  pageSpecial(val) {
    if (this.pagingLocked) return;
    this.specialPaging = val & 0xff;
  }

  get is48KRomActive() {
    if ((this.specialPaging & 1) !== 0) return false;
    const romNum = this.plus3Mode
      ? ((((this.specialPaging >> 2) & 1) << 1) | ((this.paging >> 4) & 1))
      : ((this.paging >> 4) & 1);
    return this.plus3Mode ? (romNum === 3) : (romNum === 1);
  }

  get screenBank() {
    return (this.paging & 0x08) === 0 ? 5 : 7;
  }

  getScreenBytes() {
    return this.ram[this.screenBank];
  }

  bankFor(address) {
    if ((this.specialPaging & 1) === 0) {
      if (address < 0x8000) return 5;
      if (address < 0xc000) return 2;
      return this.paging & 0x07;
    }

    // Special All-RAM Paging Mode for +3
    const mode = (this.specialPaging >> 1) & 0x03;
    const slot = address >> 14;

    switch (mode) {
      case 0: return slot;
      case 1: return slot + 4;
      case 2: return [4, 5, 6, 3][slot];
      default: return [4, 7, 6, 3][slot];
    }
  }

  readByte(address) {
    address &= 0xffff;
    // Lower 16KB (0x0000 - 0x3FFF)
    if ((this.specialPaging & 1) === 0 && address < 0x4000) {
      if (this.trDosActive && this.trDosRom) {
        return this.trDosRom[address];
      }
      const romNumber = this.plus3Mode
        ? ((((this.specialPaging >> 2) & 1) << 1) | ((this.paging >> 4) & 1))
        : ((this.paging >> 4) & 1);
      return this.rom[romNumber][address];
    }

    return this.ram[this.bankFor(address)][address & 0x3fff];
  }

  writeByte(address, value) {
    address &= 0xffff;
    // Lower 16KB is ROM when special paging is inactive
    if ((this.specialPaging & 1) === 0 && address < 0x4000) {
      return;
    }

    this.ram[this.bankFor(address)][address & 0x3fff] = value & 0xff;
  }
}
