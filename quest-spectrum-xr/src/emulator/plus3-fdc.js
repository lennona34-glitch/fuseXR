/**
 * NEC uPD765 Floppy Disk Controller for Sinclair ZX Spectrum +3
 * Ported 1:1 from the user's verified C# Plus3DiskController implementation
 * Supports standard and EXTENDED CPC/+3 DSK disk images with Sector ID Fix
 */

export class Plus3DiskController {
  constructor() {
    this.image = new Uint8Array(0);
    this.input = [];
    this.output = [];
    this.command = 0;
    this.track = 0;
    this.sector = 1;
    this.dataRegister = 0;
    this.pendingResult = [];
    this.expected = 0;
    this.interruptPending = false;
    this.motorOn = false;

    // FdcPhase: 0 = Command, 1 = Parameters, 2 = DataIn, 3 = Result
    this.phase = 0;
    this.statusPollsInPhase2 = 0;

    this.currentDiskPath = null;
    this.dataOffset = 0;
    this.dataLength = 0;
  }

  get isInserted() {
    return this.image.length > 0;
  }

  setMotor(on) {
    this.motorOn = !!on;
  }

  consumeInterrupt() {
    const res = this.interruptPending;
    this.interruptPending = false;
    return res;
  }

  eject() {
    this.image = new Uint8Array(0);
    this.currentDiskPath = null;
    this.track = 0;
    this.sector = 1;
    this.resetProtocol();
    this.motorOn = false;
    console.log('[Plus3FDC] Disk ejected');
  }

  insert(diskBytes, diskName = 'disk.dsk') {
    this.image = new Uint8Array(diskBytes);
    this.currentDiskPath = diskName;
    this.validate();
    this.track = 0;
    this.sector = 1;
    this.resetProtocol();
    console.log(`[Plus3FDC] Inserted disk: ${diskName} (${this.image.length} bytes)`);
  }

  validate() {
    if (this.image.length < 0x100) throw new Error('Not a valid DSK image: file too small');
    const sig = new TextDecoder('ascii').decode(this.image.subarray(0, 8));
    if (!sig.startsWith('MV - CPC') && !sig.startsWith('EXTENDED')) {
      throw new Error('Not a valid CPC/+3 DSK image signature: ' + sig);
    }
  }

  resetProtocol() {
    this.input = [];
    this.output = [];
    this.pendingResult = [];
    this.expected = 0;
    this.phase = 0; // Command
    this.statusPollsInPhase2 = 0;
    this.interruptPending = false;
  }

  readStatus() {
    if (this.phase === 2) { // DataIn
      this.statusPollsInPhase2++;
      // If the CPU polls status repeatedly without reading data from 0x3FFD,
      // it has finished reading what it needs (partial sector read) or overrun occurred.
      // Transition out of execution mode into Result Phase so fast loaders don't hang.
      if (this.statusPollsInPhase2 > 16) {
        this.output = [];
        if (this.pendingResult.length > 0) {
          for (const res of this.pendingResult) this.output.push(res);
          this.pendingResult = [];
        } else {
          this.output = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        }
        this.phase = 3; // Result
        this.statusPollsInPhase2 = 0;
        return 0xd0; // Result Phase (EXM bit 5 = 0)
      }
      return 0xf0; // DataIn (RQM=1, DIO=1, EXM=1, CB=1)
    }

    this.statusPollsInPhase2 = 0;
    switch (this.phase) {
      case 3: return 0xd0; // Result
      case 1: return 0x90; // Parameters
      default: return 0x80; // Command / Ready
    }
  }

  readData() {
    this.statusPollsInPhase2 = 0;
    if (this.output.length === 0) return 0xff;
    const b = this.output.shift();
    if (this.output.length === 0 && this.pendingResult.length > 0) {
      for (const res of this.pendingResult) this.output.push(res);
      this.pendingResult = [];
      this.phase = 3; // Result
    } else if (this.output.length === 0) {
      this.phase = 0; // Command
    }
    return b;
  }

  writeData(value) {
    this.statusPollsInPhase2 = 0;
    this.dataRegister = value & 0xff;
    if (this.phase === 0) {
      this.beginCommand(value);
    } else if (this.phase === 1) {
      this.input.push(value & 0xff);
      if (this.input.length >= this.expected) {
        this.completeCommand();
      }
    }
  }

  beginCommand(value) {
    this.command = value & 0xff;
    this.input = [];
    const opcode = value & 0x1f;

    switch (opcode) {
      case 0x02: this.expected = 8; break; // Read a Track
      case 0x03: this.expected = 2; break; // Specify
      case 0x04: this.expected = 1; break; // Sense Drive Status
      case 0x05: this.expected = 8; break; // Write Data
      case 0x06: this.expected = 8; break; // Read Data
      case 0x07: this.expected = 1; break; // Recalibrate
      case 0x08: this.expected = 0; break; // Sense Interrupt Status
      case 0x09: this.expected = 8; break; // Write Deleted Data
      case 0x0a: this.expected = 1; break; // Read ID
      case 0x0c: this.expected = 8; break; // Read Deleted Data
      case 0x0d: this.expected = 5; break; // Format a Track
      case 0x0f: this.expected = 2; break; // Seek
      default:   this.expected = 0; break;
    }

    if (this.expected === 0) {
      this.completeCommand();
    } else {
      this.phase = 1; // Parameters
    }
  }

  completeCommand() {
    const opcode = this.command & 0x1f;
    const drive = this.input.length > 0 ? (this.input[0] & 0x03) : 0;
    const head = this.input.length > 0 ? ((this.input[0] >> 2) & 0x01) : 0;

    if (opcode === 0x03) {
      this.phase = 0;
    } else if (opcode === 0x04) {
      let st3 = this.image.length !== 0 ? 0x20 : 0x00;
      if (this.track === 0) st3 |= 0x10;
      if (this.input.length > 0) st3 |= (this.input[0] & 0x07);
      this.setResult([st3]);
    } else if (opcode === 0x07) {
      this.track = 0;
      this.interruptPending = true;
      this.phase = 0;
    } else if (opcode === 0x0f) {
      this.track = this.input.length > 1 ? this.input[1] : this.dataRegister;
      this.interruptPending = true;
      this.phase = 0;
    } else if (opcode === 0x08) {
      if (this.interruptPending) {
        this.interruptPending = false;
        this.setResult([0x20 | drive, this.track]);
      } else {
        this.setResult([0x80]);
      }
    } else if (opcode === 0x0a) {
      this.readId(drive, head);
    } else if (opcode === 0x06 || opcode === 0x0c || opcode === 0x02) {
      const c = this.input.length > 1 ? this.input[1] : this.track;
      const r = this.input.length > 3 ? this.input[3] : this.sector;
      const eot = this.input.length > 5 ? this.input[5] : r;
      this.readSector(drive, head, c, r, eot);
    } else if (opcode === 0x05 || opcode === 0x09) {
      const c = this.input.length > 1 ? this.input[1] : this.track;
      const r = this.input.length > 3 ? this.input[3] : this.sector;
      this.setResult([drive | (head << 2), 0x00, 0x00, c, head, (r + 1) & 0xff, 0x02]);
    } else if (opcode === 0x0d) {
      this.setResult([drive | (head << 2), 0x00, 0x00, this.track, head, 1, 0x02]);
    } else {
      this.phase = 0;
    }

    this.expected = 0;
    this.input = [];
  }

  setResult(bytes) {
    this.output = [];
    for (const b of bytes) this.output.push(b & 0xff);
    this.phase = 3; // Result
  }

  readId(drive, head) {
    const pos = this.getTrackOffset(this.track);
    if (pos < 0 || this.image.length < 0x100 || (pos + 0x18 + 8) > this.image.length) {
      this.setResult([0x48 | drive | (head << 2), 0x01, 0x00, this.track, head, 0, 0]);
      return;
    }

    const count = this.image[pos + 0x15];
    if (count === 0) {
      this.setResult([0x48 | drive | (head << 2), 0x01, 0x00, this.track, head, 0, 0]);
      return;
    }

    const e = pos + 0x18;
    const c = this.image[e];
    const h = this.image[e + 1];
    const r = this.image[e + 2];
    const n = this.image[e + 3];

    const st0 = drive | (head << 2);
    this.setResult([st0, 0x00, 0x00, c, h, r, n]);
  }

  readSector(drive, head, wantedTrack, startSector, eot) {
    this.output = [];
    let currSector = startSector;
    let lastReadSector = startSector;
    let anyFound = false;

    while (true) {
      if (this.findSector(wantedTrack, currSector)) {
        anyFound = true;
        lastReadSector = currSector;
        for (let i = 0; i < this.dataLength; i++) {
          this.output.push(this.image[this.dataOffset + i]);
        }
      } else if (!anyFound) {
        this.setResult([0x40 | drive | (head << 2), 0x04, 0x00, wantedTrack, head, startSector, 0x02]);
        return;
      } else {
        break;
      }

      if (currSector === eot) break;
      currSector++;
      if (currSector > eot || this.output.length > 65536) break;
    }

    this.phase = 2; // DataIn
    this.sector = (lastReadSector + 1) & 0xff;
    this.pendingResult = [drive | (head << 2), 0x00, 0x00, wantedTrack, head, this.sector, 0x02];
  }

  getTrackOffset(wantedTrack) {
    if (this.image.length < 0x100) return -1;
    const sig = new TextDecoder('ascii').decode(this.image.subarray(0, 8));
    if (!sig.startsWith('MV - CPC') && !sig.startsWith('EXTENDED')) return -1;

    let pos = 0x100;
    if (sig.startsWith('EXTENDED')) {
      for (let t = 0; t < wantedTrack; t++) {
        const units = this.image.length > 0x34 + t ? this.image[0x34 + t] : 0;
        pos += units * 0x100;
      }
    } else {
      const trackSize = this.image[0x32] | (this.image[0x33] << 8);
      if (trackSize === 0) return -1;
      pos += wantedTrack * trackSize;
    }

    if (pos + 0x100 > this.image.length || this.image[pos] !== 0x54 /* 'T' */) return -1;
    return pos;
  }

  findSector(wantedTrack, wantedSector) {
    let pos = this.getTrackOffset(this.track);
    if (pos < 0) pos = this.getTrackOffset(wantedTrack);
    if (pos < 0) return false;

    const sig = new TextDecoder('ascii').decode(this.image.subarray(0, 8));
    const isExtended = sig.startsWith('EXTENDED');
    let data = pos + 0x100;
    const count = this.image[pos + 0x15];

    for (let i = 0; i < count; i++) {
      const e = pos + 0x18 + i * 8;
      if (e + 8 > this.image.length) return false;

      let sectorLen = isExtended
        ? (this.image[e + 6] | (this.image[e + 7] << 8))
        : (128 << Math.min(7, this.image[e + 3]));
      if (sectorLen === 0) sectorLen = 128 << Math.min(7, this.image[e + 3]);

      const secId = this.image[e + 2];

      // Exact Plus3SectorIdFix matching logic
      const sectorMatches = (secId === wantedSector)
        || (secId >= 0xc1 && secId <= 0xcf && (secId - 0xc0) === wantedSector)
        || (wantedSector >= 0xc1 && wantedSector <= 0xcf && (wantedSector - 0xc0) === secId)
        || (secId >= 0x41 && secId <= 0x4f && (secId - 0x40) === wantedSector)
        || (wantedSector >= 0x41 && wantedSector <= 0x4f && (wantedSector - 0x40) === secId)
        || ((secId & 0x1f) === (wantedSector & 0x1f) && (secId & 0x1f) !== 0);

      if (sectorMatches && (this.image[e] === wantedTrack || this.image[e] === this.track || wantedTrack === this.track)) {
        this.dataOffset = data;
        this.dataLength = Math.min(sectorLen, this.image.length - data);
        return this.dataLength > 0;
      }
      data += sectorLen;
    }

    return false;
  }
}
