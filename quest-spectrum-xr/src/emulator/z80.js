/**
 * Comprehensive Z80 CPU Emulator
 * Designed for Sinclair ZX Spectrum 48K/128K emulation in WebXR
 */

export class Z80 {
  constructor(bus) {
    this.bus = bus; // Must implement readByte(addr), writeByte(addr, val), readPort(port), writePort(port, val)
    this.env = bus;

    // Primary registers (8-bit)
    this.a = 0;
    this.f = 0; // Flags: S, Z, 5, H, 3, P/V, N, C
    this.b = 0;
    this.c = 0;
    this.d = 0;
    this.e = 0;
    this.h = 0;
    this.l = 0;

    // Alternate registers (8-bit)
    this.a_ = 0;
    this.f_ = 0;
    this.b_ = 0;
    this.c_ = 0;
    this.d_ = 0;
    this.e_ = 0;
    this.h_ = 0;
    this.l_ = 0;

    // Index & special registers (16-bit & 8-bit)
    this.ix = 0;
    this.iy = 0;
    this.sp = 0xffff;
    this.pc = 0x0000;
    this.i = 0;
    this.r = 0;
    this.r7 = 0; // High bit of R register preserved

    // Interrupt state
    this.iff1 = 0;
    this.iff2 = 0;
    this.im = 1; // Default Spectrum mode is IM 1
    this.halted = false;

    // Cycle tracking
    this.tStates = 0;

    // Lookup tables for flags
    this.initFlagTables();
  }

  // Flag masks
  static FLAG_C = 0x01;  // Carry
  static FLAG_N = 0x02;  // Add/Subtract
  static FLAG_P = 0x04;  // Parity / Overflow
  static FLAG_3 = 0x08;  // Undocumented bit 3
  static FLAG_H = 0x10;  // Half-carry
  static FLAG_5 = 0x20;  // Undocumented bit 5
  static FLAG_Z = 0x40;  // Zero
  static FLAG_S = 0x80;  // Sign

  initFlagTables() {
    this.sz53Table = new Uint8Array(256);
    this.sz53pTable = new Uint8Array(256);
    this.parityTable = new Uint8Array(256);

    for (let i = 0; i < 256; i++) {
      let f = i & (Z80.FLAG_S | Z80.FLAG_5 | Z80.FLAG_3);
      if (i === 0) f |= Z80.FLAG_Z;

      // Parity
      let p = 0;
      let temp = i;
      for (let b = 0; b < 8; b++) {
        p ^= (temp & 1);
        temp >>= 1;
      }
      let parity = (p === 0) ? Z80.FLAG_P : 0;

      this.sz53Table[i] = f;
      this.parityTable[i] = parity;
      this.sz53pTable[i] = f | parity;
    }
  }

  reset() {
    this.a = 0xff;
    this.f = 0xff;
    this.b = 0;
    this.c = 0;
    this.d = 0;
    this.e = 0;
    this.h = 0;
    this.l = 0;
    this.a_ = 0;
    this.f_ = 0;
    this.b_ = 0;
    this.c_ = 0;
    this.d_ = 0;
    this.e_ = 0;
    this.h_ = 0;
    this.l_ = 0;
    this.ix = 0xffff;
    this.iy = 0xffff;
    this.sp = 0xffff;
    this.pc = 0x0000;
    this.i = 0;
    this.r = 0;
    this.r7 = 0;
    this.iff1 = 0;
    this.iff2 = 0;
    this.im = 1;
    this.halted = false;
    this.tStates = 0;
  }

  // 16-bit register getters/setters
  get bc() { return (this.b << 8) | this.c; }
  set bc(val) { this.b = (val >> 8) & 0xff; this.c = val & 0xff; }

  get de() { return (this.d << 8) | this.e; }
  set de(val) { this.d = (val >> 8) & 0xff; this.e = val & 0xff; }

  get hl() { return (this.h << 8) | this.l; }
  set hl(val) { this.h = (val >> 8) & 0xff; this.l = val & 0xff; }

  get af() { return (this.a << 8) | this.f; }
  set af(val) { this.a = (val >> 8) & 0xff; this.f = val & 0xff; }

  // Memory fetch helpers
  fetchByte() {
    const val = this.bus.readByte(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    return val;
  }

  fetchWord() {
    const low = this.fetchByte();
    const high = this.fetchByte();
    return (high << 8) | low;
  }

  pushWord(val) {
    this.sp = (this.sp - 1) & 0xffff;
    this.bus.writeByte(this.sp, (val >> 8) & 0xff);
    this.sp = (this.sp - 1) & 0xffff;
    this.bus.writeByte(this.sp, val & 0xff);
  }

  popWord() {
    const low = this.bus.readByte(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    const high = this.bus.readByte(this.sp);
    this.sp = (this.sp + 1) & 0xffff;
    return (high << 8) | low;
  }

  // Interrupt request (50Hz VBLANK from ULA)
  interrupt() {
    if (this.iff1 === 0) return 0;
    this.iff1 = 0;
    this.iff2 = 0;
    if (this.halted) {
      this.halted = false;
      this.pc = (this.pc + 1) & 0xffff;
    }

    this.r = (this.r + 1) & 0x7f;
    this.pushWord(this.pc);

    if (this.im === 1) {
      this.pc = 0x0038;
      this.tStates += 13;
      return 13;
    } else if (this.im === 2) {
      // Spectrum standard: floating bus returns 0xFF
      const vector = (this.i << 8) | 0xff;
      const low = this.bus.readByte(vector);
      const high = this.bus.readByte((vector + 1) & 0xffff);
      this.pc = (high << 8) | low;
      this.tStates += 19;
      return 19;
    } else {
      // IM 0: RST 38h
      this.pc = 0x0038;
      this.tStates += 13;
      return 13;
    }
  }

  // Step one instruction
  step() {
    if (this.halted) {
      this.tStates += 4;
      return 4;
    }

    // Instant Tape Loader Trap (Fuse 1.10.0 LD-BYTES trap at 0x056B, covering 0x0556, 0x0559 & 0x0562 entry points)
    if (this.pc === 0x056b && this.bus && this.bus.handleTapeTrap && this.bus.handleTapeTrap()) {
      return 16;
    }

    const startCycles = this.tStates;
    this.r = (this.r + 1) & 0x7f;
    const op = this.fetchByte();
    this.execBase(op);
    return this.tStates - startCycles;
  }

  // Arithmetic / Logic helper methods
  addA(val, carry = 0) {
    const ans = this.a + val + carry;
    const lookup = ((this.a & 0x88) >> 3) | ((val & 0x88) >> 2) | ((ans & 0x88) >> 1);
    this.a = ans & 0xff;
    this.f = (ans > 255 ? Z80.FLAG_C : 0) |
             ((lookup === 1 || lookup === 2 || lookup === 4 || lookup === 7) ? Z80.FLAG_P : 0) |
             ((this.a ^ val ^ (ans - carry)) & 0x10 ? Z80.FLAG_H : 0) |
             this.sz53Table[this.a];
  }

  subA(val, carry = 0) {
    const ans = this.a - val - carry;
    const lookup = ((this.a & 0x88) >> 3) | ((val & 0x88) >> 2) | ((ans & 0x88) >> 1);
    this.a = ans & 0xff;
    this.f = (ans < 0 ? Z80.FLAG_C : 0) |
             Z80.FLAG_N |
             ((lookup === 1 || lookup === 2 || lookup === 4 || lookup === 7) ? Z80.FLAG_P : 0) |
             ((this.a ^ val ^ (ans + carry)) & 0x10 ? Z80.FLAG_H : 0) |
             this.sz53Table[this.a];
  }

  andA(val) {
    this.a &= val;
    this.f = Z80.FLAG_H | this.sz53pTable[this.a];
  }

  xorA(val) {
    this.a ^= val;
    this.f = this.sz53pTable[this.a];
  }

  orA(val) {
    this.a |= val;
    this.f = this.sz53pTable[this.a];
  }

  cpA(val) {
    const ans = this.a - val;
    const lookup = ((this.a & 0x88) >> 3) | ((val & 0x88) >> 2) | ((ans & 0x88) >> 1);
    this.f = (ans < 0 ? Z80.FLAG_C : 0) |
             Z80.FLAG_N |
             ((lookup === 1 || lookup === 2 || lookup === 4 || lookup === 7) ? Z80.FLAG_P : 0) |
             ((this.a ^ val ^ ans) & 0x10 ? Z80.FLAG_H : 0) |
             (this.sz53Table[ans & 0xff] & ~ (Z80.FLAG_3 | Z80.FLAG_5)) |
             (val & (Z80.FLAG_3 | Z80.FLAG_5));
  }

  inc8(val) {
    const res = (val + 1) & 0xff;
    this.f = (this.f & Z80.FLAG_C) |
             (res === 0x80 ? Z80.FLAG_P : 0) |
             ((val & 0x0f) === 0x0f ? Z80.FLAG_H : 0) |
             this.sz53Table[res];
    return res;
  }

  dec8(val) {
    const res = (val - 1) & 0xff;
    this.f = (this.f & Z80.FLAG_C) |
             Z80.FLAG_N |
             (val === 0x80 ? Z80.FLAG_P : 0) |
             ((val & 0x0f) === 0 ? Z80.FLAG_H : 0) |
             this.sz53Table[res];
    return res;
  }

  add16(dest, src) {
    const res = dest + src;
    this.f = (this.f & (Z80.FLAG_S | Z80.FLAG_Z | Z80.FLAG_P)) |
             (res > 0xffff ? Z80.FLAG_C : 0) |
             (((dest & 0x0fff) + (src & 0x0fff) > 0x0fff) ? Z80.FLAG_H : 0) |
             ((res >> 8) & (Z80.FLAG_3 | Z80.FLAG_5));
    return res & 0xffff;
  }

  // Base Opcodes
  execBase(op) {
    switch (op) {
      case 0x00: this.tStates += 4; break; // NOP
      case 0x01: this.bc = this.fetchWord(); this.tStates += 10; break; // LD BC,nn
      case 0x02: this.bus.writeByte(this.bc, this.a); this.tStates += 7; break; // LD (BC),A
      case 0x03: this.bc = (this.bc + 1) & 0xffff; this.tStates += 6; break; // INC BC
      case 0x04: this.b = this.inc8(this.b); this.tStates += 4; break; // INC B
      case 0x05: this.b = this.dec8(this.b); this.tStates += 4; break; // DEC B
      case 0x06: this.b = this.fetchByte(); this.tStates += 7; break; // LD B,n
      case 0x07: { // RLCA
        const c = (this.a & 0x80) >> 7;
        this.a = ((this.a << 1) | c) & 0xff;
        this.f = (this.f & (Z80.FLAG_S | Z80.FLAG_Z | Z80.FLAG_P)) | c | (this.a & (Z80.FLAG_3 | Z80.FLAG_5));
        this.tStates += 4;
        break;
      }
      case 0x08: { // EX AF,AF'
        const ta = this.a, tf = this.f;
        this.a = this.a_; this.f = this.f_;
        this.a_ = ta; this.f_ = tf;
        this.tStates += 4;
        break;
      }
      case 0x09: this.hl = this.add16(this.hl, this.bc); this.tStates += 11; break; // ADD HL,BC
      case 0x0a: this.a = this.bus.readByte(this.bc); this.tStates += 7; break; // LD A,(BC)
      case 0x0b: this.bc = (this.bc - 1) & 0xffff; this.tStates += 6; break; // DEC BC
      case 0x0c: this.c = this.inc8(this.c); this.tStates += 4; break; // INC C
      case 0x0d: this.c = this.dec8(this.c); this.tStates += 4; break; // DEC C
      case 0x0e: this.c = this.fetchByte(); this.tStates += 7; break; // LD C,n
      case 0x0f: { // RRCA
        const c = this.a & 1;
        this.a = ((this.a >> 1) | (c << 7)) & 0xff;
        this.f = (this.f & (Z80.FLAG_S | Z80.FLAG_Z | Z80.FLAG_P)) | c | (this.a & (Z80.FLAG_3 | Z80.FLAG_5));
        this.tStates += 4;
        break;
      }
      case 0x10: { // DJNZ e
        const offset = (this.fetchByte() << 24) >> 24;
        this.b = (this.b - 1) & 0xff;
        if (this.b !== 0) {
          this.pc = (this.pc + offset) & 0xffff;
          this.tStates += 13;
        } else {
          this.tStates += 8;
        }
        break;
      }
      case 0x11: this.de = this.fetchWord(); this.tStates += 10; break; // LD DE,nn
      case 0x12: this.bus.writeByte(this.de, this.a); this.tStates += 7; break; // LD (DE),A
      case 0x13: this.de = (this.de + 1) & 0xffff; this.tStates += 6; break; // INC DE
      case 0x14: this.d = this.inc8(this.d); this.tStates += 4; break; // INC D
      case 0x15: this.d = this.dec8(this.d); this.tStates += 4; break; // DEC D
      case 0x16: this.d = this.fetchByte(); this.tStates += 7; break; // LD D,n
      case 0x17: { // RLA
        const c = (this.a & 0x80) >> 7;
        this.a = ((this.a << 1) | (this.f & Z80.FLAG_C)) & 0xff;
        this.f = (this.f & (Z80.FLAG_S | Z80.FLAG_Z | Z80.FLAG_P)) | c | (this.a & (Z80.FLAG_3 | Z80.FLAG_5));
        this.tStates += 4;
        break;
      }
      case 0x18: { // JR e
        const offset = (this.fetchByte() << 24) >> 24;
        this.pc = (this.pc + offset) & 0xffff;
        this.tStates += 12;
        break;
      }
      case 0x19: this.hl = this.add16(this.hl, this.de); this.tStates += 11; break; // ADD HL,DE
      case 0x1a: this.a = this.bus.readByte(this.de); this.tStates += 7; break; // LD A,(DE)
      case 0x1b: this.de = (this.de - 1) & 0xffff; this.tStates += 6; break; // DEC DE
      case 0x1c: this.e = this.inc8(this.e); this.tStates += 4; break; // INC E
      case 0x1d: this.e = this.dec8(this.e); this.tStates += 4; break; // DEC E
      case 0x1e: this.e = this.fetchByte(); this.tStates += 7; break; // LD E,n
      case 0x1f: { // RRA
        const c = this.a & 1;
        this.a = ((this.a >> 1) | ((this.f & Z80.FLAG_C) << 7)) & 0xff;
        this.f = (this.f & (Z80.FLAG_S | Z80.FLAG_Z | Z80.FLAG_P)) | c | (this.a & (Z80.FLAG_3 | Z80.FLAG_5));
        this.tStates += 4;
        break;
      }
      case 0x20: { // JR NZ,e
        const offset = (this.fetchByte() << 24) >> 24;
        if (!(this.f & Z80.FLAG_Z)) { this.pc = (this.pc + offset) & 0xffff; this.tStates += 12; }
        else { this.tStates += 7; }
        break;
      }
      case 0x21: this.hl = this.fetchWord(); this.tStates += 10; break; // LD HL,nn
      case 0x22: { // LD (nn),HL
        const addr = this.fetchWord();
        this.bus.writeByte(addr, this.l);
        this.bus.writeByte((addr + 1) & 0xffff, this.h);
        this.tStates += 16;
        break;
      }
      case 0x23: this.hl = (this.hl + 1) & 0xffff; this.tStates += 6; break; // INC HL
      case 0x24: this.h = this.inc8(this.h); this.tStates += 4; break; // INC H
      case 0x25: this.h = this.dec8(this.h); this.tStates += 4; break; // DEC H
      case 0x26: this.h = this.fetchByte(); this.tStates += 7; break; // LD H,n
      case 0x27: { // DAA
        let a = this.a;
        let c = this.f & Z80.FLAG_C;
        let h = this.f & Z80.FLAG_H;
        let diff = 0;
        if (h || (a & 0x0f) > 9) diff |= 0x06;
        if (c || a > 0x99) { diff |= 0x60; c = Z80.FLAG_C; }
        if (this.f & Z80.FLAG_N) a = (a - diff) & 0xff;
        else a = (a + diff) & 0xff;
        h = ((this.a ^ a) & 0x10) ? Z80.FLAG_H : 0;
        this.a = a;
        this.f = (this.f & Z80.FLAG_N) | c | h | this.sz53pTable[this.a];
        this.tStates += 4;
        break;
      }
      case 0x28: { // JR Z,e
        const offset = (this.fetchByte() << 24) >> 24;
        if (this.f & Z80.FLAG_Z) { this.pc = (this.pc + offset) & 0xffff; this.tStates += 12; }
        else { this.tStates += 7; }
        break;
      }
      case 0x29: this.hl = this.add16(this.hl, this.hl); this.tStates += 11; break; // ADD HL,HL
      case 0x2a: { // LD HL,(nn)
        const addr = this.fetchWord();
        this.l = this.bus.readByte(addr);
        this.h = this.bus.readByte((addr + 1) & 0xffff);
        this.tStates += 16;
        break;
      }
      case 0x2b: this.hl = (this.hl - 1) & 0xffff; this.tStates += 6; break; // DEC HL
      case 0x2c: this.l = this.inc8(this.l); this.tStates += 4; break; // INC L
      case 0x2d: this.l = this.dec8(this.l); this.tStates += 4; break; // DEC L
      case 0x2e: this.l = this.fetchByte(); this.tStates += 7; break; // LD L,n
      case 0x2f: { // CPL
        this.a ^= 0xff;
        this.f |= Z80.FLAG_H | Z80.FLAG_N | (this.a & (Z80.FLAG_3 | Z80.FLAG_5));
        this.tStates += 4;
        break;
      }
      case 0x30: { // JR NC,e
        const offset = (this.fetchByte() << 24) >> 24;
        if (!(this.f & Z80.FLAG_C)) { this.pc = (this.pc + offset) & 0xffff; this.tStates += 12; }
        else { this.tStates += 7; }
        break;
      }
      case 0x31: this.sp = this.fetchWord(); this.tStates += 10; break; // LD SP,nn
      case 0x32: { // LD (nn),A
        const addr = this.fetchWord();
        this.bus.writeByte(addr, this.a);
        this.tStates += 13;
        break;
      }
      case 0x33: this.sp = (this.sp + 1) & 0xffff; this.tStates += 6; break; // INC SP
      case 0x34: { // INC (HL)
        const val = this.inc8(this.bus.readByte(this.hl));
        this.bus.writeByte(this.hl, val);
        this.tStates += 11;
        break;
      }
      case 0x35: { // DEC (HL)
        const val = this.dec8(this.bus.readByte(this.hl));
        this.bus.writeByte(this.hl, val);
        this.tStates += 11;
        break;
      }
      case 0x36: this.bus.writeByte(this.hl, this.fetchByte()); this.tStates += 10; break; // LD (HL),n
      case 0x37: this.f = (this.f & (Z80.FLAG_S | Z80.FLAG_Z | Z80.FLAG_P)) | Z80.FLAG_C | (this.a & (Z80.FLAG_3 | Z80.FLAG_5)); this.tStates += 4; break; // SCF
      case 0x38: { // JR C,e
        const offset = (this.fetchByte() << 24) >> 24;
        if (this.f & Z80.FLAG_C) { this.pc = (this.pc + offset) & 0xffff; this.tStates += 12; }
        else { this.tStates += 7; }
        break;
      }
      case 0x39: this.hl = this.add16(this.hl, this.sp); this.tStates += 11; break; // ADD HL,SP
      case 0x3a: { // LD A,(nn)
        const addr = this.fetchWord();
        this.a = this.bus.readByte(addr);
        this.tStates += 13;
        break;
      }
      case 0x3b: this.sp = (this.sp - 1) & 0xffff; this.tStates += 6; break; // DEC SP
      case 0x3c: this.a = this.inc8(this.a); this.tStates += 4; break; // INC A
      case 0x3d: this.a = this.dec8(this.a); this.tStates += 4; break; // DEC A
      case 0x3e: this.a = this.fetchByte(); this.tStates += 7; break; // LD A,n
      case 0x3f: { // CCF
        const c = this.f & Z80.FLAG_C;
        this.f = (this.f & (Z80.FLAG_S | Z80.FLAG_Z | Z80.FLAG_P)) | (c ? Z80.FLAG_H : Z80.FLAG_C) | (this.a & (Z80.FLAG_3 | Z80.FLAG_5));
        this.tStates += 4;
        break;
      }

      // LD r, r' (0x40 - 0x7F)
      case 0x40: this.tStates += 4; break; // LD B,B
      case 0x41: this.b = this.c; this.tStates += 4; break; // LD B,C
      case 0x42: this.b = this.d; this.tStates += 4; break; // LD B,D
      case 0x43: this.b = this.e; this.tStates += 4; break; // LD B,E
      case 0x44: this.b = this.h; this.tStates += 4; break; // LD B,H
      case 0x45: this.b = this.l; this.tStates += 4; break; // LD B,L
      case 0x46: this.b = this.bus.readByte(this.hl); this.tStates += 7; break; // LD B,(HL)
      case 0x47: this.b = this.a; this.tStates += 4; break; // LD B,A

      case 0x48: this.c = this.b; this.tStates += 4; break; // LD C,B
      case 0x49: this.tStates += 4; break; // LD C,C
      case 0x4a: this.c = this.d; this.tStates += 4; break; // LD C,D
      case 0x4b: this.c = this.e; this.tStates += 4; break; // LD C,E
      case 0x4c: this.c = this.h; this.tStates += 4; break; // LD C,H
      case 0x4d: this.c = this.l; this.tStates += 4; break; // LD C,L
      case 0x4e: this.c = this.bus.readByte(this.hl); this.tStates += 7; break; // LD C,(HL)
      case 0x4f: this.c = this.a; this.tStates += 4; break; // LD C,A

      case 0x50: this.d = this.b; this.tStates += 4; break; // LD D,B
      case 0x51: this.d = this.c; this.tStates += 4; break; // LD D,C
      case 0x52: this.tStates += 4; break; // LD D,D
      case 0x53: this.d = this.e; this.tStates += 4; break; // LD D,E
      case 0x54: this.d = this.h; this.tStates += 4; break; // LD D,H
      case 0x55: this.d = this.l; this.tStates += 4; break; // LD D,L
      case 0x56: this.d = this.bus.readByte(this.hl); this.tStates += 7; break; // LD D,(HL)
      case 0x57: this.d = this.a; this.tStates += 4; break; // LD D,A

      case 0x58: this.e = this.b; this.tStates += 4; break; // LD E,B
      case 0x59: this.e = this.c; this.tStates += 4; break; // LD E,C
      case 0x5a: this.e = this.d; this.tStates += 4; break; // LD E,D
      case 0x5b: this.tStates += 4; break; // LD E,E
      case 0x5c: this.e = this.h; this.tStates += 4; break; // LD E,H
      case 0x5d: this.e = this.l; this.tStates += 4; break; // LD E,L
      case 0x5e: this.e = this.bus.readByte(this.hl); this.tStates += 7; break; // LD E,(HL)
      case 0x5f: this.e = this.a; this.tStates += 4; break; // LD E,A

      case 0x60: this.h = this.b; this.tStates += 4; break; // LD H,B
      case 0x61: this.h = this.c; this.tStates += 4; break; // LD H,C
      case 0x62: this.h = this.d; this.tStates += 4; break; // LD H,D
      case 0x63: this.h = this.e; this.tStates += 4; break; // LD H,E
      case 0x64: this.tStates += 4; break; // LD H,H
      case 0x65: this.h = this.l; this.tStates += 4; break; // LD H,L
      case 0x66: this.h = this.bus.readByte(this.hl); this.tStates += 7; break; // LD H,(HL)
      case 0x67: this.h = this.a; this.tStates += 4; break; // LD H,A

      case 0x68: this.l = this.b; this.tStates += 4; break; // LD L,B
      case 0x69: this.l = this.c; this.tStates += 4; break; // LD L,C
      case 0x6a: this.l = this.d; this.tStates += 4; break; // LD L,D
      case 0x6b: this.l = this.e; this.tStates += 4; break; // LD L,E
      case 0x6c: this.l = this.h; this.tStates += 4; break; // LD L,H
      case 0x6d: this.tStates += 4; break; // LD L,L
      case 0x6e: this.l = this.bus.readByte(this.hl); this.tStates += 7; break; // LD L,(HL)
      case 0x6f: this.l = this.a; this.tStates += 4; break; // LD L,A

      case 0x70: this.bus.writeByte(this.hl, this.b); this.tStates += 7; break; // LD (HL),B
      case 0x71: this.bus.writeByte(this.hl, this.c); this.tStates += 7; break; // LD (HL),C
      case 0x72: this.bus.writeByte(this.hl, this.d); this.tStates += 7; break; // LD (HL),D
      case 0x73: this.bus.writeByte(this.hl, this.e); this.tStates += 7; break; // LD (HL),E
      case 0x74: this.bus.writeByte(this.hl, this.h); this.tStates += 7; break; // LD (HL),H
      case 0x75: this.bus.writeByte(this.hl, this.l); this.tStates += 7; break; // LD (HL),L
      case 0x76: this.halted = true; this.tStates += 4; break; // HALT
      case 0x77: this.bus.writeByte(this.hl, this.a); this.tStates += 7; break; // LD (HL),A

      case 0x78: this.a = this.b; this.tStates += 4; break; // LD A,B
      case 0x79: this.a = this.c; this.tStates += 4; break; // LD A,C
      case 0x7a: this.a = this.d; this.tStates += 4; break; // LD A,D
      case 0x7b: this.a = this.e; this.tStates += 4; break; // LD A,E
      case 0x7c: this.a = this.h; this.tStates += 4; break; // LD A,H
      case 0x7d: this.a = this.l; this.tStates += 4; break; // LD A,L
      case 0x7e: this.a = this.bus.readByte(this.hl); this.tStates += 7; break; // LD A,(HL)
      case 0x7f: this.tStates += 4; break; // LD A,A

      // ALU operations (0x80 - 0xBF)
      case 0x80: this.addA(this.b); this.tStates += 4; break;
      case 0x81: this.addA(this.c); this.tStates += 4; break;
      case 0x82: this.addA(this.d); this.tStates += 4; break;
      case 0x83: this.addA(this.e); this.tStates += 4; break;
      case 0x84: this.addA(this.h); this.tStates += 4; break;
      case 0x85: this.addA(this.l); this.tStates += 4; break;
      case 0x86: this.addA(this.bus.readByte(this.hl)); this.tStates += 7; break;
      case 0x87: this.addA(this.a); this.tStates += 4; break;

      case 0x88: this.addA(this.b, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x89: this.addA(this.c, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x8a: this.addA(this.d, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x8b: this.addA(this.e, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x8c: this.addA(this.h, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x8d: this.addA(this.l, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x8e: this.addA(this.bus.readByte(this.hl), this.f & Z80.FLAG_C); this.tStates += 7; break;
      case 0x8f: this.addA(this.a, this.f & Z80.FLAG_C); this.tStates += 4; break;

      case 0x90: this.subA(this.b); this.tStates += 4; break;
      case 0x91: this.subA(this.c); this.tStates += 4; break;
      case 0x92: this.subA(this.d); this.tStates += 4; break;
      case 0x93: this.subA(this.e); this.tStates += 4; break;
      case 0x94: this.subA(this.h); this.tStates += 4; break;
      case 0x95: this.subA(this.l); this.tStates += 4; break;
      case 0x96: this.subA(this.bus.readByte(this.hl)); this.tStates += 7; break;
      case 0x97: this.subA(this.a); this.tStates += 4; break;

      case 0x98: this.subA(this.b, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x99: this.subA(this.c, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x9a: this.subA(this.d, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x9b: this.subA(this.e, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x9c: this.subA(this.h, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x9d: this.subA(this.l, this.f & Z80.FLAG_C); this.tStates += 4; break;
      case 0x9e: this.subA(this.bus.readByte(this.hl), this.f & Z80.FLAG_C); this.tStates += 7; break;
      case 0x9f: this.subA(this.a, this.f & Z80.FLAG_C); this.tStates += 4; break;

      case 0xa0: this.andA(this.b); this.tStates += 4; break;
      case 0xa1: this.andA(this.c); this.tStates += 4; break;
      case 0xa2: this.andA(this.d); this.tStates += 4; break;
      case 0xa3: this.andA(this.e); this.tStates += 4; break;
      case 0xa4: this.andA(this.h); this.tStates += 4; break;
      case 0xa5: this.andA(this.l); this.tStates += 4; break;
      case 0xa6: this.andA(this.bus.readByte(this.hl)); this.tStates += 7; break;
      case 0xa7: this.andA(this.a); this.tStates += 4; break;

      case 0xa8: this.xorA(this.b); this.tStates += 4; break;
      case 0xa9: this.xorA(this.c); this.tStates += 4; break;
      case 0xaa: this.xorA(this.d); this.tStates += 4; break;
      case 0xab: this.xorA(this.e); this.tStates += 4; break;
      case 0xac: this.xorA(this.h); this.tStates += 4; break;
      case 0xad: this.xorA(this.l); this.tStates += 4; break;
      case 0xae: this.xorA(this.bus.readByte(this.hl)); this.tStates += 7; break;
      case 0xaf: this.xorA(this.a); this.tStates += 4; break; // XOR A

      case 0xb0: this.orA(this.b); this.tStates += 4; break;
      case 0xb1: this.orA(this.c); this.tStates += 4; break;
      case 0xb2: this.orA(this.d); this.tStates += 4; break;
      case 0xb3: this.orA(this.e); this.tStates += 4; break;
      case 0xb4: this.orA(this.h); this.tStates += 4; break;
      case 0xb5: this.orA(this.l); this.tStates += 4; break;
      case 0xb6: this.orA(this.bus.readByte(this.hl)); this.tStates += 7; break;
      case 0xb7: this.orA(this.a); this.tStates += 4; break;

      case 0xb8: this.cpA(this.b); this.tStates += 4; break;
      case 0xb9: this.cpA(this.c); this.tStates += 4; break;
      case 0xba: this.cpA(this.d); this.tStates += 4; break;
      case 0xbb: this.cpA(this.e); this.tStates += 4; break;
      case 0xbc: this.cpA(this.h); this.tStates += 4; break;
      case 0xbd: this.cpA(this.l); this.tStates += 4; break;
      case 0xbe: this.cpA(this.bus.readByte(this.hl)); this.tStates += 7; break;
      case 0xbf: this.cpA(this.a); this.tStates += 4; break;

      // Jumps, Calls, Stack, I/O (0xC0 - 0xFF)
      case 0xc0: if (!(this.f & Z80.FLAG_Z)) { this.pc = this.popWord(); this.tStates += 11; } else { this.tStates += 5; } break; // RET NZ
      case 0xc1: this.bc = this.popWord(); this.tStates += 10; break; // POP BC
      case 0xc2: { const a = this.fetchWord(); if (!(this.f & Z80.FLAG_Z)) { this.pc = a; } this.tStates += 10; break; } // JP NZ,nn
      case 0xc3: this.pc = this.fetchWord(); this.tStates += 10; break; // JP nn
      case 0xc4: { const a = this.fetchWord(); if (!(this.f & Z80.FLAG_Z)) { this.pushWord(this.pc); this.pc = a; this.tStates += 17; } else { this.tStates += 10; } break; } // CALL NZ,nn
      case 0xc5: this.pushWord(this.bc); this.tStates += 11; break; // PUSH BC
      case 0xc6: this.addA(this.fetchByte()); this.tStates += 7; break; // ADD A,n
      case 0xc7: this.pushWord(this.pc); this.pc = 0x0000; this.tStates += 11; break; // RST 00h
      case 0xc8: if (this.f & Z80.FLAG_Z) { this.pc = this.popWord(); this.tStates += 11; } else { this.tStates += 5; } break; // RET Z
      case 0xc9: this.pc = this.popWord(); this.tStates += 10; break; // RET
      case 0xca: { const a = this.fetchWord(); if (this.f & Z80.FLAG_Z) { this.pc = a; } this.tStates += 10; break; } // JP Z,nn
      case 0xcb: this.execCB(); break; // CB Prefix
      case 0xcc: { const a = this.fetchWord(); if (this.f & Z80.FLAG_Z) { this.pushWord(this.pc); this.pc = a; this.tStates += 17; } else { this.tStates += 10; } break; } // CALL Z,nn
      case 0xcd: { const a = this.fetchWord(); this.pushWord(this.pc); this.pc = a; this.tStates += 17; break; } // CALL nn
      case 0xce: this.addA(this.fetchByte(), this.f & Z80.FLAG_C); this.tStates += 7; break; // ADC A,n
      case 0xcf: this.pushWord(this.pc); this.pc = 0x0008; this.tStates += 11; break; // RST 08h

      case 0xd0: if (!(this.f & Z80.FLAG_C)) { this.pc = this.popWord(); this.tStates += 11; } else { this.tStates += 5; } break; // RET NC
      case 0xd1: this.de = this.popWord(); this.tStates += 10; break; // POP DE
      case 0xd2: { const a = this.fetchWord(); if (!(this.f & Z80.FLAG_C)) { this.pc = a; } this.tStates += 10; break; } // JP NC,nn
      case 0xd3: { // OUT (n),A
        const port = this.fetchByte() | (this.a << 8);
        this.bus.writePort(port, this.a);
        this.tStates += 11;
        break;
      }
      case 0xd4: { const a = this.fetchWord(); if (!(this.f & Z80.FLAG_C)) { this.pushWord(this.pc); this.pc = a; this.tStates += 17; } else { this.tStates += 10; } break; } // CALL NC,nn
      case 0xd5: this.pushWord(this.de); this.tStates += 11; break; // PUSH DE
      case 0xd6: this.subA(this.fetchByte()); this.tStates += 7; break; // SUB n
      case 0xd7: this.pushWord(this.pc); this.pc = 0x0010; this.tStates += 11; break; // RST 10h
      case 0xd8: if (this.f & Z80.FLAG_C) { this.pc = this.popWord(); this.tStates += 11; } else { this.tStates += 5; } break; // RET C
      case 0xd9: { // EXX
        let t = this.bc; this.bc = this.b_ << 8 | this.c_; this.b_ = (t >> 8) & 0xff; this.c_ = t & 0xff;
        t = this.de; this.de = this.d_ << 8 | this.e_; this.d_ = (t >> 8) & 0xff; this.e_ = t & 0xff;
        t = this.hl; this.hl = this.h_ << 8 | this.l_; this.h_ = (t >> 8) & 0xff; this.l_ = t & 0xff;
        this.tStates += 4;
        break;
      }
      case 0xda: { const a = this.fetchWord(); if (this.f & Z80.FLAG_C) { this.pc = a; } this.tStates += 10; break; } // JP C,nn
      case 0xdb: { // IN A,(n)
        const port = this.fetchByte() | (this.a << 8);
        this.a = this.bus.readPort(port);
        this.tStates += 11;
        break;
      }
      case 0xdc: { const a = this.fetchWord(); if (this.f & Z80.FLAG_C) { this.pushWord(this.pc); this.pc = a; this.tStates += 17; } else { this.tStates += 10; } break; } // CALL C,nn
      case 0xdd: this.execIndex('ix'); break; // DD Prefix (IX)
      case 0xde: this.subA(this.fetchByte(), this.f & Z80.FLAG_C); this.tStates += 7; break; // SBC A,n
      case 0xdf: this.pushWord(this.pc); this.pc = 0x0018; this.tStates += 11; break; // RST 18h

      case 0xe0: if (!(this.f & Z80.FLAG_P)) { this.pc = this.popWord(); this.tStates += 11; } else { this.tStates += 5; } break; // RET PO
      case 0xe1: this.hl = this.popWord(); this.tStates += 10; break; // POP HL
      case 0xe2: { const a = this.fetchWord(); if (!(this.f & Z80.FLAG_P)) { this.pc = a; } this.tStates += 10; break; } // JP PO,nn
      case 0xe3: { // EX (SP),HL
        const low = this.bus.readByte(this.sp);
        const high = this.bus.readByte((this.sp + 1) & 0xffff);
        this.bus.writeByte(this.sp, this.l);
        this.bus.writeByte((this.sp + 1) & 0xffff, this.h);
        this.l = low; this.h = high;
        this.tStates += 19;
        break;
      }
      case 0xe4: { const a = this.fetchWord(); if (!(this.f & Z80.FLAG_P)) { this.pushWord(this.pc); this.pc = a; this.tStates += 17; } else { this.tStates += 10; } break; } // CALL PO,nn
      case 0xe5: this.pushWord(this.hl); this.tStates += 11; break; // PUSH HL
      case 0xe6: this.andA(this.fetchByte()); this.tStates += 7; break; // AND n
      case 0xe7: this.pushWord(this.pc); this.pc = 0x0020; this.tStates += 11; break; // RST 20h
      case 0xe8: if (this.f & Z80.FLAG_P) { this.pc = this.popWord(); this.tStates += 11; } else { this.tStates += 5; } break; // RET PE
      case 0xe9: this.pc = this.hl; this.tStates += 4; break; // JP (HL)
      case 0xea: { const a = this.fetchWord(); if (this.f & Z80.FLAG_P) { this.pc = a; } this.tStates += 10; break; } // JP PE,nn
      case 0xeb: { // EX DE,HL
        const t = this.de; this.de = this.hl; this.hl = t;
        this.tStates += 4;
        break;
      }
      case 0xec: { const a = this.fetchWord(); if (this.f & Z80.FLAG_P) { this.pushWord(this.pc); this.pc = a; this.tStates += 17; } else { this.tStates += 10; } break; } // CALL PE,nn
      case 0xed: this.execED(); break; // ED Prefix
      case 0xee: this.xorA(this.fetchByte()); this.tStates += 7; break; // XOR n
      case 0xef: this.pushWord(this.pc); this.pc = 0x0028; this.tStates += 11; break; // RST 28h

      case 0xf0: if (!(this.f & Z80.FLAG_S)) { this.pc = this.popWord(); this.tStates += 11; } else { this.tStates += 5; } break; // RET P
      case 0xf1: this.af = this.popWord(); this.tStates += 10; break; // POP AF
      case 0xf2: { const a = this.fetchWord(); if (!(this.f & Z80.FLAG_S)) { this.pc = a; } this.tStates += 10; break; } // JP P,nn
      case 0xf3: this.iff1 = 0; this.iff2 = 0; this.tStates += 4; break; // DI
      case 0xf4: { const a = this.fetchWord(); if (!(this.f & Z80.FLAG_S)) { this.pushWord(this.pc); this.pc = a; this.tStates += 17; } else { this.tStates += 10; } break; } // CALL P,nn
      case 0xf5: this.pushWord(this.af); this.tStates += 11; break; // PUSH AF
      case 0xf6: this.orA(this.fetchByte()); this.tStates += 7; break; // OR n
      case 0xf7: this.pushWord(this.pc); this.pc = 0x0030; this.tStates += 11; break; // RST 30h
      case 0xf8: if (this.f & Z80.FLAG_S) { this.pc = this.popWord(); this.tStates += 11; } else { this.tStates += 5; } break; // RET M
      case 0xf9: this.sp = this.hl; this.tStates += 6; break; // LD SP,HL
      case 0xfa: { const a = this.fetchWord(); if (this.f & Z80.FLAG_S) { this.pc = a; } this.tStates += 10; break; } // JP M,nn
      case 0xfb: this.iff1 = 1; this.iff2 = 1; this.tStates += 4; break; // EI
      case 0xfc: { const a = this.fetchWord(); if (this.f & Z80.FLAG_S) { this.pushWord(this.pc); this.pc = a; this.tStates += 17; } else { this.tStates += 10; } break; } // CALL M,nn
      case 0xfd: this.execIndex('iy'); break; // FD Prefix (IY)
      case 0xfe: this.cpA(this.fetchByte()); this.tStates += 7; break; // CP n
      case 0xff: this.pushWord(this.pc); this.pc = 0x0038; this.tStates += 11; break; // RST 38h
    }
  }

  // CB Prefix (Rotate / Shift / Bit)
  execCB() {
    this.r = (this.r + 1) & 0x7f;
    const op = this.fetchByte();
    const regCode = op & 0x07;
    let val;

    switch (regCode) {
      case 0: val = this.b; break;
      case 1: val = this.c; break;
      case 2: val = this.d; break;
      case 3: val = this.e; break;
      case 4: val = this.h; break;
      case 5: val = this.l; break;
      case 6: val = this.bus.readByte(this.hl); break;
      case 7: val = this.a; break;
    }

    const bit = (op >> 3) & 0x07;
    let res = val;

    if (op < 0x40) {
      // Rotates and Shifts
      switch (op >> 3) {
        case 0: { // RLC
          const c = (val >> 7) & 1;
          res = ((val << 1) | c) & 0xff;
          this.f = c | this.sz53pTable[res];
          break;
        }
        case 1: { // RRC
          const c = val & 1;
          res = ((val >> 1) | (c << 7)) & 0xff;
          this.f = c | this.sz53pTable[res];
          break;
        }
        case 2: { // RL
          const c = (val >> 7) & 1;
          res = ((val << 1) | (this.f & Z80.FLAG_C)) & 0xff;
          this.f = c | this.sz53pTable[res];
          break;
        }
        case 3: { // RR
          const c = val & 1;
          res = ((val >> 1) | ((this.f & Z80.FLAG_C) << 7)) & 0xff;
          this.f = c | this.sz53pTable[res];
          break;
        }
        case 4: { // SLA
          const c = (val >> 7) & 1;
          res = (val << 1) & 0xff;
          this.f = c | this.sz53pTable[res];
          break;
        }
        case 5: { // SRA
          const c = val & 1;
          res = (val >> 1) | (val & 0x80);
          this.f = c | this.sz53pTable[res];
          break;
        }
        case 6: { // SLL
          const c = (val >> 7) & 1;
          res = ((val << 1) | 1) & 0xff;
          this.f = c | this.sz53pTable[res];
          break;
        }
        case 7: { // SRL
          const c = val & 1;
          res = (val >> 1) & 0xff;
          this.f = c | this.sz53pTable[res];
          break;
        }
      }
    } else if (op < 0x80) {
      // BIT b, r
      const bitVal = val & (1 << bit);
      this.f = (this.f & Z80.FLAG_C) |
               Z80.FLAG_H |
               (bitVal === 0 ? (Z80.FLAG_Z | Z80.FLAG_P) : 0) |
               (bit === 7 && bitVal ? Z80.FLAG_S : 0) |
               (val & (Z80.FLAG_3 | Z80.FLAG_5));
      this.tStates += (regCode === 6) ? 12 : 8;
      return;
    } else if (op < 0xc0) {
      // RES b, r
      res = val & ~(1 << bit);
    } else {
      // SET b, r
      res = val | (1 << bit);
    }

    // Write back
    switch (regCode) {
      case 0: this.b = res; break;
      case 1: this.c = res; break;
      case 2: this.d = res; break;
      case 3: this.e = res; break;
      case 4: this.h = res; break;
      case 5: this.l = res; break;
      case 6: this.bus.writeByte(this.hl, res); break;
      case 7: this.a = res; break;
    }
    this.tStates += (regCode === 6) ? 15 : 8;
  }

  // ED Prefix (Extended instructions)
  execED() {
    this.r = (this.r + 1) & 0x7f;
    const op = this.fetchByte();

    switch (op) {
      // IN r,(C) & OUT (C),r
      case 0x40: this.b = this.inRegC(); break;
      case 0x41: this.bus.writePort(this.bc, this.b); this.tStates += 12; break;
      case 0x42: this.sbcHL(this.bc); break;
      case 0x43: { const a = this.fetchWord(); this.bus.writeByte(a, this.c); this.bus.writeByte((a + 1) & 0xffff, this.b); this.tStates += 20; break; }
      case 0x44: this.neg(); break;
      case 0x45: this.retn(); break;
      case 0x46: this.im = 0; this.tStates += 8; break;
      case 0x47: this.i = this.a; this.tStates += 9; break;

      case 0x48: this.c = this.inRegC(); break;
      case 0x49: this.bus.writePort(this.bc, this.c); this.tStates += 12; break;
      case 0x4a: this.adcHL(this.bc); break;
      case 0x4b: { const a = this.fetchWord(); this.c = this.bus.readByte(a); this.b = this.bus.readByte((a + 1) & 0xffff); this.tStates += 20; break; }
      case 0x4c: this.neg(); break;
      case 0x4d: this.reti(); break;
      case 0x4e: this.im = 0; this.tStates += 8; break;
      case 0x4f: this.r = this.a; this.r7 = this.a & 0x80; this.tStates += 9; break;

      case 0x50: this.d = this.inRegC(); break;
      case 0x51: this.bus.writePort(this.bc, this.d); this.tStates += 12; break;
      case 0x52: this.sbcHL(this.de); break;
      case 0x53: { const a = this.fetchWord(); this.bus.writeByte(a, this.e); this.bus.writeByte((a + 1) & 0xffff, this.d); this.tStates += 20; break; }
      case 0x54: this.neg(); break;
      case 0x55: this.retn(); break;
      case 0x56: this.im = 1; this.tStates += 8; break;
      case 0x57: { // LD A,I
        this.a = this.i;
        this.f = (this.f & Z80.FLAG_C) | (this.iff2 ? Z80.FLAG_P : 0) | this.sz53Table[this.a];
        this.tStates += 9;
        break;
      }

      case 0x58: this.e = this.inRegC(); break;
      case 0x59: this.bus.writePort(this.bc, this.e); this.tStates += 12; break;
      case 0x5a: this.adcHL(this.de); break;
      case 0x5b: { const a = this.fetchWord(); this.e = this.bus.readByte(a); this.d = this.bus.readByte((a + 1) & 0xffff); this.tStates += 20; break; }
      case 0x5c: this.neg(); break;
      case 0x5d: this.reti(); break;
      case 0x5e: this.im = 2; this.tStates += 8; break;
      case 0x5f: { // LD A,R
        this.a = (this.r & 0x7f) | this.r7;
        this.f = (this.f & Z80.FLAG_C) | (this.iff2 ? Z80.FLAG_P : 0) | this.sz53Table[this.a];
        this.tStates += 9;
        break;
      }

      case 0x60: this.h = this.inRegC(); break;
      case 0x61: this.bus.writePort(this.bc, this.h); this.tStates += 12; break;
      case 0x62: this.sbcHL(this.hl); break;
      case 0x63: { const a = this.fetchWord(); this.bus.writeByte(a, this.l); this.bus.writeByte((a + 1) & 0xffff, this.h); this.tStates += 20; break; }
      case 0x64: this.neg(); break;
      case 0x65: this.retn(); break;
      case 0x66: this.im = 0; this.tStates += 8; break;
      case 0x67: { // RRD
        const mem = this.bus.readByte(this.hl);
        const lowA = this.a & 0x0f;
        this.a = (this.a & 0xf0) | (mem & 0x0f);
        this.bus.writeByte(this.hl, (lowA << 4) | (mem >> 4));
        this.f = (this.f & Z80.FLAG_C) | this.sz53pTable[this.a];
        this.tStates += 18;
        break;
      }

      case 0x68: this.l = this.inRegC(); break;
      case 0x69: this.bus.writePort(this.bc, this.l); this.tStates += 12; break;
      case 0x6a: this.adcHL(this.hl); break;
      case 0x6b: { const a = this.fetchWord(); this.l = this.bus.readByte(a); this.h = this.bus.readByte((a + 1) & 0xffff); this.tStates += 20; break; }
      case 0x6c: this.neg(); break;
      case 0x6d: this.reti(); break;
      case 0x6e: this.im = 0; this.tStates += 8; break;
      case 0x6f: { // RLD
        const mem = this.bus.readByte(this.hl);
        const lowA = this.a & 0x0f;
        this.a = (this.a & 0xf0) | (mem >> 4);
        this.bus.writeByte(this.hl, ((mem & 0x0f) << 4) | lowA);
        this.f = (this.f & Z80.FLAG_C) | this.sz53pTable[this.a];
        this.tStates += 18;
        break;
      }

      case 0x70: this.inRegC(); break; // IN (C)
      case 0x71: this.bus.writePort(this.bc, 0); this.tStates += 12; break; // OUT (C),0
      case 0x72: this.sbcHL(this.sp); break;
      case 0x73: { const a = this.fetchWord(); this.bus.writeByte(a, this.sp & 0xff); this.bus.writeByte((a + 1) & 0xffff, (this.sp >> 8) & 0xff); this.tStates += 20; break; }
      case 0x74: this.neg(); break;
      case 0x75: this.retn(); break;
      case 0x76: this.im = 1; this.tStates += 8; break;

      case 0x78: this.a = this.inRegC(); break;
      case 0x79: this.bus.writePort(this.bc, this.a); this.tStates += 12; break;
      case 0x7a: this.adcHL(this.sp); break;
      case 0x7b: { const a = this.fetchWord(); this.sp = this.bus.readByte(a) | (this.bus.readByte((a + 1) & 0xffff) << 8); this.tStates += 20; break; }
      case 0x7c: this.neg(); break;
      case 0x7d: this.reti(); break;
      case 0x7e: this.im = 2; this.tStates += 8; break;

      // Block instructions (LDI, LDIR, CPI, CPIR, etc.)
      case 0xa0: this.ldi(); break;
      case 0xa1: this.cpi(); break;
      case 0xa2: this.ini(); break;
      case 0xa3: this.outi(); break;
      case 0xa8: this.ldd(); break;
      case 0xa9: this.cpd(); break;
      case 0xaa: this.ind(); break;
      case 0xab: this.outd(); break;

      case 0xb0: this.ldir(); break;
      case 0xb1: this.cpir(); break;
      case 0xb2: this.inir(); break;
      case 0xb3: this.otir(); break;
      case 0xb8: this.lddr(); break;
      case 0xb9: this.cpdr(); break;
      case 0xba: this.indr(); break;
      case 0xbb: this.otdr(); break;

      default:
        this.tStates += 8; // NOP for unused ED opcodes
        break;
    }
  }

  inRegC() {
    const val = this.bus.readPort(this.bc);
    this.f = (this.f & Z80.FLAG_C) | this.sz53pTable[val];
    this.tStates += 12;
    return val;
  }

  neg() {
    const val = this.a;
    this.a = 0;
    this.subA(val);
    this.tStates += 8;
  }

  retn() {
    this.iff1 = this.iff2;
    this.pc = this.popWord();
    this.tStates += 14;
  }

  reti() {
    this.iff1 = this.iff2;
    this.pc = this.popWord();
    this.tStates += 14;
  }

  adcHL(src) {
    const carry = (this.f & Z80.FLAG_C);
    const dest = this.hl;
    const res = dest + src + carry;
    const lookup = ((dest & 0x8800) >> 11) | ((src & 0x8800) >> 10) | ((res & 0x8800) >> 9);
    this.hl = res & 0xffff;
    this.f = (res > 0xffff ? Z80.FLAG_C : 0) |
             ((lookup === 1 || lookup === 2 || lookup === 4 || lookup === 7) ? Z80.FLAG_P : 0) |
             (((dest & 0x0fff) + (src & 0x0fff) + carry > 0x0fff) ? Z80.FLAG_H : 0) |
             ((this.h & 0x80) ? Z80.FLAG_S : 0) |
             (this.hl === 0 ? Z80.FLAG_Z : 0) |
             (this.h & (Z80.FLAG_3 | Z80.FLAG_5));
    this.tStates += 15;
  }

  sbcHL(src) {
    const carry = (this.f & Z80.FLAG_C);
    const dest = this.hl;
    const res = dest - src - carry;
    const lookup = ((dest & 0x8800) >> 11) | ((src & 0x8800) >> 10) | ((res & 0x8800) >> 9);
    this.hl = res & 0xffff;
    this.f = (res < 0 ? Z80.FLAG_C : 0) |
             Z80.FLAG_N |
             ((lookup === 1 || lookup === 2 || lookup === 4 || lookup === 7) ? Z80.FLAG_P : 0) |
             (((dest & 0x0fff) - (src & 0x0fff) - carry < 0) ? Z80.FLAG_H : 0) |
             ((this.h & 0x80) ? Z80.FLAG_S : 0) |
             (this.hl === 0 ? Z80.FLAG_Z : 0) |
             (this.h & (Z80.FLAG_3 | Z80.FLAG_5));
    this.tStates += 15;
  }

  ldi() {
    const val = this.bus.readByte(this.hl);
    this.bus.writeByte(this.de, val);
    this.hl = (this.hl + 1) & 0xffff;
    this.de = (this.de + 1) & 0xffff;
    this.bc = (this.bc - 1) & 0xffff;
    const n = (this.a + val) & 0xff;
    this.f = (this.f & (Z80.FLAG_C | Z80.FLAG_Z | Z80.FLAG_S)) |
             (this.bc !== 0 ? Z80.FLAG_P : 0) |
             (n & Z80.FLAG_3) | ((n << 4) & Z80.FLAG_5);
    this.tStates += 16;
  }

  ldir() {
    this.ldi();
    if (this.bc !== 0) {
      this.pc = (this.pc - 2) & 0xffff;
      this.tStates += 5; // 21 t-states total when repeating
    }
  }

  ldd() {
    const val = this.bus.readByte(this.hl);
    this.bus.writeByte(this.de, val);
    this.hl = (this.hl - 1) & 0xffff;
    this.de = (this.de - 1) & 0xffff;
    this.bc = (this.bc - 1) & 0xffff;
    const n = (this.a + val) & 0xff;
    this.f = (this.f & (Z80.FLAG_C | Z80.FLAG_Z | Z80.FLAG_S)) |
             (this.bc !== 0 ? Z80.FLAG_P : 0) |
             (n & Z80.FLAG_3) | ((n << 4) & Z80.FLAG_5);
    this.tStates += 16;
  }

  lddr() {
    this.ldd();
    if (this.bc !== 0) {
      this.pc = (this.pc - 2) & 0xffff;
      this.tStates += 5;
    }
  }

  cpi() {
    const val = this.bus.readByte(this.hl);
    const ans = (this.a - val) & 0xff;
    this.hl = (this.hl + 1) & 0xffff;
    this.bc = (this.bc - 1) & 0xffff;
    this.f = (this.f & Z80.FLAG_C) |
             Z80.FLAG_N |
             (this.bc !== 0 ? Z80.FLAG_P : 0) |
             ((this.a ^ val ^ ans) & 0x10 ? Z80.FLAG_H : 0) |
             (ans === 0 ? Z80.FLAG_Z : 0) |
             (ans & Z80.FLAG_S);
    this.tStates += 16;
  }

  cpir() {
    this.cpi();
    if (this.bc !== 0 && !(this.f & Z80.FLAG_Z)) {
      this.pc = (this.pc - 2) & 0xffff;
      this.tStates += 5;
    }
  }

  cpd() {
    const val = this.bus.readByte(this.hl);
    const ans = (this.a - val) & 0xff;
    this.hl = (this.hl - 1) & 0xffff;
    this.bc = (this.bc - 1) & 0xffff;
    this.f = (this.f & Z80.FLAG_C) |
             Z80.FLAG_N |
             (this.bc !== 0 ? Z80.FLAG_P : 0) |
             ((this.a ^ val ^ ans) & 0x10 ? Z80.FLAG_H : 0) |
             (ans === 0 ? Z80.FLAG_Z : 0) |
             (ans & Z80.FLAG_S);
    this.tStates += 16;
  }

  cpdr() {
    this.cpd();
    if (this.bc !== 0 && !(this.f & Z80.FLAG_Z)) {
      this.pc = (this.pc - 2) & 0xffff;
      this.tStates += 5;
    }
  }

  ini() {
    const val = this.bus.readPort(this.bc);
    this.bus.writeByte(this.hl, val);
    this.b = (this.b - 1) & 0xff;
    this.hl = (this.hl + 1) & 0xffff;
    this.f = (this.b === 0 ? Z80.FLAG_Z : 0) | Z80.FLAG_N;
    this.tStates += 16;
  }

  inir() {
    this.ini();
    if (this.b !== 0) {
      this.pc = (this.pc - 2) & 0xffff;
      this.tStates += 5;
    }
  }

  ind() {
    const val = this.bus.readPort(this.bc);
    this.bus.writeByte(this.hl, val);
    this.b = (this.b - 1) & 0xff;
    this.hl = (this.hl - 1) & 0xffff;
    this.f = (this.b === 0 ? Z80.FLAG_Z : 0) | Z80.FLAG_N;
    this.tStates += 16;
  }

  indr() {
    this.ind();
    if (this.b !== 0) {
      this.pc = (this.pc - 2) & 0xffff;
      this.tStates += 5;
    }
  }

  outi() {
    const val = this.bus.readByte(this.hl);
    this.b = (this.b - 1) & 0xff;
    this.bus.writePort(this.bc, val);
    this.hl = (this.hl + 1) & 0xffff;
    this.f = (this.b === 0 ? Z80.FLAG_Z : 0) | Z80.FLAG_N;
    this.tStates += 16;
  }

  otir() {
    this.outi();
    if (this.b !== 0) {
      this.pc = (this.pc - 2) & 0xffff;
      this.tStates += 5;
    }
  }

  outd() {
    const val = this.bus.readByte(this.hl);
    this.b = (this.b - 1) & 0xff;
    this.bus.writePort(this.bc, val);
    this.hl = (this.hl - 1) & 0xffff;
    this.f = (this.b === 0 ? Z80.FLAG_Z : 0) | Z80.FLAG_N;
    this.tStates += 16;
  }

  otdr() {
    this.outd();
    if (this.b !== 0) {
      this.pc = (this.pc - 2) & 0xffff;
      this.tStates += 5;
    }
  }

  // DD / FD Prefix (IX & IY Index registers)
  execIndex(regName) {
    this.r = (this.r + 1) & 0x7f;
    const op = this.fetchByte();

    // Helper for displacement
    const getAddr = () => {
      const d = (this.fetchByte() << 24) >> 24; // signed 8-bit offset
      return (this[regName] + d) & 0xffff;
    };

    // Helpers for undocumented 8-bit half-index registers (IXH/IXL or IYH/IYL)
    const getH = () => (this[regName] >> 8) & 0xff;
    const setH = (v) => { this[regName] = ((v & 0xff) << 8) | (this[regName] & 0xff); };
    const getL = () => this[regName] & 0xff;
    const setL = (v) => { this[regName] = (this[regName] & 0xff00) | (v & 0xff); };

    switch (op) {
      case 0x09: this[regName] = this.add16(this[regName], this.bc); this.tStates += 15; break;
      case 0x19: this[regName] = this.add16(this[regName], this.de); this.tStates += 15; break;
      case 0x21: this[regName] = this.fetchWord(); this.tStates += 14; break;
      case 0x22: {
        const a = this.fetchWord();
        this.bus.writeByte(a, this[regName] & 0xff);
        this.bus.writeByte((a + 1) & 0xffff, (this[regName] >> 8) & 0xff);
        this.tStates += 20;
        break;
      }
      case 0x23: this[regName] = (this[regName] + 1) & 0xffff; this.tStates += 10; break;
      case 0x24: setH(this.inc8(getH())); this.tStates += 8; break; // INC IXH/IYH
      case 0x25: setH(this.dec8(getH())); this.tStates += 8; break; // DEC IXH/IYH
      case 0x26: setH(this.fetchByte()); this.tStates += 11; break; // LD IXH/IYH, n
      case 0x29: this[regName] = this.add16(this[regName], this[regName]); this.tStates += 15; break;
      case 0x2a: {
        const a = this.fetchWord();
        this[regName] = this.bus.readByte(a) | (this.bus.readByte((a + 1) & 0xffff) << 8);
        this.tStates += 20;
        break;
      }
      case 0x2b: this[regName] = (this[regName] - 1) & 0xffff; this.tStates += 10; break;
      case 0x2c: setL(this.inc8(getL())); this.tStates += 8; break; // INC IXL/IYL
      case 0x2d: setL(this.dec8(getL())); this.tStates += 8; break; // DEC IXL/IYL
      case 0x2e: setL(this.fetchByte()); this.tStates += 11; break; // LD IXL/IYL, n

      case 0x34: { // INC (IX/IY+d)
        const addr = getAddr();
        const v = this.inc8(this.bus.readByte(addr));
        this.bus.writeByte(addr, v);
        this.tStates += 23;
        break;
      }
      case 0x35: { // DEC (IX/IY+d)
        const addr = getAddr();
        const v = this.dec8(this.bus.readByte(addr));
        this.bus.writeByte(addr, v);
        this.tStates += 23;
        break;
      }
      case 0x36: { // LD (IX/IY+d),n
        const addr = getAddr();
        const val = this.fetchByte();
        this.bus.writeByte(addr, val);
        this.tStates += 19;
        break;
      }
      case 0x39: this[regName] = this.add16(this[regName], this.sp); this.tStates += 15; break;

      // LD r, IXH/IXL (undocumented)
      case 0x44: this.b = getH(); this.tStates += 8; break;
      case 0x45: this.b = getL(); this.tStates += 8; break;
      case 0x4c: this.c = getH(); this.tStates += 8; break;
      case 0x4d: this.c = getL(); this.tStates += 8; break;
      case 0x54: this.d = getH(); this.tStates += 8; break;
      case 0x55: this.d = getL(); this.tStates += 8; break;
      case 0x5c: this.e = getH(); this.tStates += 8; break;
      case 0x5d: this.e = getL(); this.tStates += 8; break;
      case 0x7c: this.a = getH(); this.tStates += 8; break;
      case 0x7d: this.a = getL(); this.tStates += 8; break;

      // LD IXH/IXL, r (undocumented)
      case 0x60: setH(this.b); this.tStates += 8; break;
      case 0x61: setH(this.c); this.tStates += 8; break;
      case 0x62: setH(this.d); this.tStates += 8; break;
      case 0x63: setH(this.e); this.tStates += 8; break;
      case 0x64: setH(getH()); this.tStates += 8; break;
      case 0x65: setH(getL()); this.tStates += 8; break;
      case 0x67: setH(this.a); this.tStates += 8; break;

      case 0x68: setL(this.b); this.tStates += 8; break;
      case 0x69: setL(this.c); this.tStates += 8; break;
      case 0x6a: setL(this.d); this.tStates += 8; break;
      case 0x6b: setL(this.e); this.tStates += 8; break;
      case 0x6c: setL(getH()); this.tStates += 8; break;
      case 0x6d: setL(getL()); this.tStates += 8; break;
      case 0x6f: setL(this.a); this.tStates += 8; break;

      // LD r, (IX/IY+d)
      case 0x46: this.b = this.bus.readByte(getAddr()); this.tStates += 19; break;
      case 0x4e: this.c = this.bus.readByte(getAddr()); this.tStates += 19; break;
      case 0x56: this.d = this.bus.readByte(getAddr()); this.tStates += 19; break;
      case 0x5e: this.e = this.bus.readByte(getAddr()); this.tStates += 19; break;
      case 0x66: this.h = this.bus.readByte(getAddr()); this.tStates += 19; break;
      case 0x6e: this.l = this.bus.readByte(getAddr()); this.tStates += 19; break;
      case 0x7e: this.a = this.bus.readByte(getAddr()); this.tStates += 19; break;

      // LD (IX/IY+d), r
      case 0x70: this.bus.writeByte(getAddr(), this.b); this.tStates += 19; break;
      case 0x71: this.bus.writeByte(getAddr(), this.c); this.tStates += 19; break;
      case 0x72: this.bus.writeByte(getAddr(), this.d); this.tStates += 19; break;
      case 0x73: this.bus.writeByte(getAddr(), this.e); this.tStates += 19; break;
      case 0x74: this.bus.writeByte(getAddr(), this.h); this.tStates += 19; break;
      case 0x75: this.bus.writeByte(getAddr(), this.l); this.tStates += 19; break;
      case 0x77: this.bus.writeByte(getAddr(), this.a); this.tStates += 19; break;

      // ALU with IXH/IXL (undocumented)
      case 0x84: this.addA(getH()); this.tStates += 8; break;
      case 0x85: this.addA(getL()); this.tStates += 8; break;
      case 0x8c: this.addA(getH(), this.f & Z80.FLAG_C); this.tStates += 8; break;
      case 0x8d: this.addA(getL(), this.f & Z80.FLAG_C); this.tStates += 8; break;
      case 0x94: this.subA(getH()); this.tStates += 8; break;
      case 0x95: this.subA(getL()); this.tStates += 8; break;
      case 0x9c: this.subA(getH(), this.f & Z80.FLAG_C); this.tStates += 8; break;
      case 0x9d: this.subA(getL(), this.f & Z80.FLAG_C); this.tStates += 8; break;
      case 0xa4: this.andA(getH()); this.tStates += 8; break;
      case 0xa5: this.andA(getL()); this.tStates += 8; break;
      case 0xac: this.xorA(getH()); this.tStates += 8; break;
      case 0xad: this.xorA(getL()); this.tStates += 8; break;
      case 0xb4: this.orA(getH()); this.tStates += 8; break;
      case 0xb5: this.orA(getL()); this.tStates += 8; break;
      case 0xbc: this.cpA(getH()); this.tStates += 8; break;
      case 0xbd: this.cpA(getL()); this.tStates += 8; break;

      // ALU (IX/IY+d)
      case 0x86: this.addA(this.bus.readByte(getAddr())); this.tStates += 19; break;
      case 0x8e: this.addA(this.bus.readByte(getAddr()), this.f & Z80.FLAG_C); this.tStates += 19; break;
      case 0x96: this.subA(this.bus.readByte(getAddr())); this.tStates += 19; break;
      case 0x9e: this.subA(this.bus.readByte(getAddr()), this.f & Z80.FLAG_C); this.tStates += 19; break;
      case 0xa6: this.andA(this.bus.readByte(getAddr())); this.tStates += 19; break;
      case 0xae: this.xorA(this.bus.readByte(getAddr())); this.tStates += 19; break;
      case 0xb6: this.orA(this.bus.readByte(getAddr())); this.tStates += 19; break;
      case 0xbe: this.cpA(this.bus.readByte(getAddr())); this.tStates += 19; break;

      case 0xcb: { // DDCB / FDCB
        const d = (this.fetchByte() << 24) >> 24;
        const addr = (this[regName] + d) & 0xffff;
        const subOp = this.fetchByte();
        const bit = (subOp >> 3) & 0x07;
        const val = this.bus.readByte(addr);

        if (subOp >= 0x40 && subOp < 0x80) {
          // BIT b, (IX+d)
          const bitVal = val & (1 << bit);
          this.f = (this.f & Z80.FLAG_C) |
                   Z80.FLAG_H |
                   (bitVal === 0 ? (Z80.FLAG_Z | Z80.FLAG_P) : 0) |
                   (bit === 7 && bitVal ? Z80.FLAG_S : 0);
          this.tStates += 20;
        } else if (subOp >= 0x80 && subOp < 0xc0) {
          // RES b, (IX+d)
          this.bus.writeByte(addr, val & ~(1 << bit));
          this.tStates += 23;
        } else if (subOp >= 0xc0) {
          // SET b, (IX+d)
          this.bus.writeByte(addr, val | (1 << bit));
          this.tStates += 23;
        } else {
          // Shifts/rotates on (IX+d)
          let res = val;
          switch (subOp >> 3) {
            case 0: { const c = (val >> 7) & 1; res = ((val << 1) | c) & 0xff; this.f = c | this.sz53pTable[res]; break; }
            case 1: { const c = val & 1; res = ((val >> 1) | (c << 7)) & 0xff; this.f = c | this.sz53pTable[res]; break; }
            case 2: { const c = (val >> 7) & 1; res = ((val << 1) | (this.f & Z80.FLAG_C)) & 0xff; this.f = c | this.sz53pTable[res]; break; }
            case 3: { const c = val & 1; res = ((val >> 1) | ((this.f & Z80.FLAG_C) << 7)) & 0xff; this.f = c | this.sz53pTable[res]; break; }
            case 4: { const c = (val >> 7) & 1; res = (val << 1) & 0xff; this.f = c | this.sz53pTable[res]; break; }
            case 5: { const c = val & 1; res = (val >> 1) | (val & 0x80); this.f = c | this.sz53pTable[res]; break; }
            case 6: { const c = (val >> 7) & 1; res = ((val << 1) | 1) & 0xff; this.f = c | this.sz53pTable[res]; break; }
            case 7: { const c = val & 1; res = (val >> 1) & 0xff; this.f = c | this.sz53pTable[res]; break; }
          }
          this.bus.writeByte(addr, res);
          this.tStates += 23;
        }
        break;
      }

      case 0xe1: this[regName] = this.popWord(); this.tStates += 14; break; // POP IX/IY
      case 0xe3: { // EX (SP),IX/IY
        const low = this.bus.readByte(this.sp);
        const high = this.bus.readByte((this.sp + 1) & 0xffff);
        this.bus.writeByte(this.sp, this[regName] & 0xff);
        this.bus.writeByte((this.sp + 1) & 0xffff, (this[regName] >> 8) & 0xff);
        this[regName] = (high << 8) | low;
        this.tStates += 23;
        break;
      }
      case 0xe5: this.pushWord(this[regName]); this.tStates += 15; break; // PUSH IX/IY
      case 0xe9: this.pc = this[regName]; this.tStates += 8; break; // JP (IX/IY)
      case 0xf9: this.sp = this[regName]; this.tStates += 10; break; // LD SP,IX/IY

      default:
        // Unmodified opcode fallback
        this.execBase(op);
        break;
    }
  }
}
