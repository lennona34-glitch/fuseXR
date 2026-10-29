/**
 * Western Digital WD1793 / Soviet KR1818VG93 Floppy Disk Controller emulation
 * for the Beta 128 Disc Interface and Pentagon 128.
 * Supports standard .TRD (640KB raw TR-DOS disk dumps) and .SCL (Sinclair CopyLock archives).
 * Ported 1:1 from the verified C# Beta128DiskController implementation.
 */

const STANDARD_TRD_SIZE = 655360; // 80 tracks * 2 sides * 16 sectors * 256 bytes = 640 KB
const BYTES_PER_SECTOR = 256;
const SECTORS_PER_TRACK = 16;
const TRACKS_PER_SIDE = 80;
const TOTAL_LOGICAL_TRACKS = 160;

// WD1793 Status Register bit definitions
const StatusBusy = 0x01;
const StatusIndex = 0x02;
const StatusTrack0 = 0x04;
const StatusCrcError = 0x08;
const StatusSeekErrorOrRecordNotFound = 0x10;
const StatusHeadLoaded = 0x20;
const StatusWriteProtect = 0x40;
const StatusNotReady = 0x80;
const StatusDrq = 0x02; // in Type II/III status

export class Beta128DiskController {
  constructor() {
    this.diskImage = new Uint8Array(0);
    this.currentDiskPath = null;

    this.commandRegister = 0;
    this.statusRegister = StatusNotReady;
    this.trackRegister = 0;
    this.sectorRegister = 1;
    this.dataRegister = 0;
    this.systemRegister = 0x3c; // Port 0xFF: default Drive 0 (A), Side 0, Not Reset

    this.cylinder = 0; // Physical head track (0..79)
    this.stepDirection = 1;

    this.drq = false;
    this.intrq = false;
    this.busy = false;
    this.motorOn = false;

    this.transferBuffer = new Uint8Array(BYTES_PER_SECTOR);
    this.bufferIndex = 0;
    this.bufferLength = 0;
    this.isReading = false;
    this.isWriting = false;
    this.multiSector = false;

    this.indexPulse = false;
    this.sectorsReadCount = 0;
  }

  get inserted() {
    return this.diskImage.length > 0;
  }

  get currentSide() {
    // Port 0xFF bit 4: 0 = side 1, 1 = side 0
    return (this.systemRegister & 0x10) !== 0 ? 0 : 1;
  }

  eject() {
    this.diskImage = new Uint8Array(0);
    this.currentDiskPath = null;
    this.cylinder = 0;
    this.motorOn = false;
    this.reset();
    console.log('[Beta128] Disk ejected');
  }

  insert(buffer, filename = 'game.trd') {
    this.currentDiskPath = filename;
    const rawBytes = new Uint8Array(buffer);
    const ext = filename.split('.').pop().toLowerCase();

    if (ext === 'scl') {
      this.diskImage = Beta128DiskController.convertSclToTrd(rawBytes);
    } else {
      if (rawBytes.length < STANDARD_TRD_SIZE) {
        this.diskImage = new Uint8Array(STANDARD_TRD_SIZE);
        this.diskImage.set(rawBytes);
      } else {
        this.diskImage = new Uint8Array(rawBytes);
      }
    }

    Beta128DiskController.ensureBootFile(this.diskImage);
    this.reset();
    console.log(`[TR-DOS FDC] Disk inserted: ${filename} (${this.diskImage.length} bytes)`);
  }

  reset() {
    this.cylinder = 0;
    this.trackRegister = 0;
    this.sectorRegister = 1;
    this.dataRegister = 0;
    this.systemRegister = 0x3c;
    this.commandRegister = 0;
    this.statusRegister = this.inserted ? (StatusTrack0 | StatusHeadLoaded) : StatusNotReady;
    this.busy = false;
    this.drq = false;
    this.intrq = false;
    this.isReading = false;
    this.isWriting = false;
    this.motorOn = false;
  }

  // --- Port I/O Operations ---

  readStatus() {
    this.intrq = false; // Reading status clears INTRQ
    if (!this.inserted) return StatusNotReady;

    let status = this.statusRegister;
    // Bit 1 is Index Pulse for Type I commands (opcode bit 7 == 0)
    if ((this.commandRegister & 0x80) === 0) {
      this.indexPulse = !this.indexPulse;
      if (this.indexPulse && this.motorOn) status |= StatusIndex;
      else status &= ~StatusIndex;
    }
    return status;
  }

  writeCommand(val) {
    this.commandRegister = val & 0xff;
    this.intrq = false;
    this.motorOn = true;

    if (!this.inserted) {
      this.statusRegister = StatusNotReady;
      this.intrq = true;
      return;
    }

    // Decode command type
    if ((val & 0x80) === 0) {
      // Type I: Restore, Seek, Step, Step In, Step Out
      this.executeType1Command(val);
    } else if ((val & 0xc0) === 0x80) {
      // Type II: Read Sector (0x80..0x9F), Write Sector (0xA0..0xBF)
      this.executeType2Command(val);
    } else if ((val & 0xf0) === 0xd0) {
      // Type IV: Force Interrupt
      this.executeType4Command(val);
    } else {
      // Type III: Read Address (0xC0), Read Track (0xE0), Write Track (0xF0)
      this.executeType3Command(val);
    }
  }

  readTrack() {
    return this.trackRegister;
  }

  writeTrack(val) {
    this.trackRegister = val & 0xff;
  }

  readSector() {
    return this.sectorRegister;
  }

  writeSector(val) {
    this.sectorRegister = val & 0xff;
  }

  readData() {
    this.drq = false;
    const value = this.dataRegister;

    if (this.isReading && this.busy) {
      this.bufferIndex++;
      if (this.bufferIndex < this.bufferLength) {
        this.dataRegister = this.transferBuffer[this.bufferIndex];
        this.drq = true;
        this.statusRegister = StatusBusy | StatusDrq;
      } else {
        // Sector transfer complete
        if (this.multiSector && this.sectorRegister < SECTORS_PER_TRACK) {
          this.sectorRegister++;
          this.startReadingSector();
        } else {
          this.busy = false;
          this.isReading = false;
          this.drq = false;
          this.intrq = true;
          this.statusRegister = 0x00; // Success, ready
        }
      }
    }

    return value;
  }

  writeData(val) {
    this.dataRegister = val & 0xff;
    this.drq = false;

    if (this.isWriting && this.busy) {
      if (this.bufferIndex < BYTES_PER_SECTOR) {
        this.transferBuffer[this.bufferIndex] = val & 0xff;
      }

      this.bufferIndex++;
      if (this.bufferIndex < BYTES_PER_SECTOR) {
        this.drq = true;
        this.statusRegister = StatusBusy | StatusDrq;
      } else {
        // Commit sector to disk image
        this.commitWrittenSector();

        if (this.multiSector && this.sectorRegister < SECTORS_PER_TRACK) {
          this.sectorRegister++;
          this.startWritingSector();
        } else {
          this.busy = false;
          this.isWriting = false;
          this.drq = false;
          this.intrq = true;
          this.statusRegister = 0x00;
        }
      }
    }
  }

  readSystem() {
    // Port 0xFF System Status
    // Bit 7: INTRQ (1 = active)
    // Bit 6: DRQ (1 = active)
    let res = 0x00;
    if (this.intrq) res |= 0x80;
    if (this.drq) res |= 0x40;
    return res;
  }

  writeSystem(val) {
    this.systemRegister = val & 0xff;
    this.motorOn = (val & 0x40) !== 0;

    if ((val & 0x04) === 0) {
      // Reset active
      this.cylinder = 0;
      this.trackRegister = 0;
      this.busy = false;
      this.drq = false;
      this.intrq = false;
      this.statusRegister = this.inserted ? (StatusTrack0 | StatusHeadLoaded) : StatusNotReady;
    }
  }

  // --- Command Implementations ---

  executeType1Command(cmd) {
    const opcode = cmd & 0xf0;
    const updateTrackReg = (cmd & 0x10) !== 0;

    switch (opcode) {
      case 0x00: // Restore (Seek Track 0)
        this.cylinder = 0;
        this.trackRegister = 0;
        break;

      case 0x10: // Seek
        this.cylinder = Math.max(0, Math.min(this.dataRegister, TRACKS_PER_SIDE - 1));
        this.trackRegister = this.cylinder;
        break;

      case 0x20: // Step (no update)
      case 0x30: // Step (with update)
        this.cylinder = Math.max(0, Math.min(this.cylinder + this.stepDirection, TRACKS_PER_SIDE - 1));
        if (updateTrackReg) this.trackRegister = this.cylinder;
        break;

      case 0x40: // Step In (no update)
      case 0x50: // Step In (with update)
        this.stepDirection = 1;
        this.cylinder = Math.max(0, Math.min(this.cylinder + 1, TRACKS_PER_SIDE - 1));
        if (updateTrackReg) this.trackRegister = this.cylinder;
        break;

      case 0x60: // Step Out (no update)
      case 0x70: // Step Out (with update)
        this.stepDirection = -1;
        this.cylinder = Math.max(0, Math.min(this.cylinder - 1, TRACKS_PER_SIDE - 1));
        if (updateTrackReg) this.trackRegister = this.cylinder;
        break;
    }

    let status = StatusHeadLoaded;
    if (this.cylinder === 0) status |= StatusTrack0;
    this.statusRegister = status;
    this.busy = false;
    this.drq = false;
    this.intrq = true;
  }

  executeType2Command(cmd) {
    this.multiSector = (cmd & 0x10) !== 0;
    if ((cmd & 0x20) === 0) {
      // Read Sector (0x80..0x9F)
      this.startReadingSector();
    } else {
      // Write Sector (0xA0..0xBF)
      this.startWritingSector();
    }
  }

  startReadingSector() {
    const side = this.currentSide;
    const logicalTrack = (this.cylinder * 2) + side;
    const sector = this.sectorRegister;

    if (!this.inserted || sector < 1 || sector > SECTORS_PER_TRACK || logicalTrack >= TOTAL_LOGICAL_TRACKS) {
      this.statusRegister = StatusSeekErrorOrRecordNotFound;
      this.busy = false;
      this.drq = false;
      this.intrq = true;
      this.isReading = false;
      return;
    }

    const offset = (logicalTrack * SECTORS_PER_TRACK + (sector - 1)) * BYTES_PER_SECTOR;
    if (offset + BYTES_PER_SECTOR <= this.diskImage.length) {
      this.transferBuffer.set(this.diskImage.subarray(offset, offset + BYTES_PER_SECTOR));
    } else {
      this.transferBuffer.fill(0);
    }

    this.bufferIndex = 0;
    this.bufferLength = BYTES_PER_SECTOR;
    this.dataRegister = this.transferBuffer[0];
    this.isReading = true;
    this.isWriting = false;
    this.busy = true;
    this.drq = true;
    this.intrq = false;
    this.statusRegister = StatusBusy | StatusDrq;
    this.sectorsReadCount++;
  }

  startWritingSector() {
    const side = this.currentSide;
    const logicalTrack = (this.cylinder * 2) + side;
    const sector = this.sectorRegister;

    if (!this.inserted || sector < 1 || sector > SECTORS_PER_TRACK || logicalTrack >= TOTAL_LOGICAL_TRACKS) {
      this.statusRegister = StatusSeekErrorOrRecordNotFound;
      this.busy = false;
      this.drq = false;
      this.intrq = true;
      this.isWriting = false;
      return;
    }

    this.bufferIndex = 0;
    this.bufferLength = BYTES_PER_SECTOR;
    this.isWriting = true;
    this.isReading = false;
    this.busy = true;
    this.drq = true;
    this.intrq = false;
    this.statusRegister = StatusBusy | StatusDrq;
  }

  commitWrittenSector() {
    const side = this.currentSide;
    const logicalTrack = (this.cylinder * 2) + side;
    const sector = this.sectorRegister;
    const offset = (logicalTrack * SECTORS_PER_TRACK + (sector - 1)) * BYTES_PER_SECTOR;

    if (offset + BYTES_PER_SECTOR <= this.diskImage.length) {
      this.diskImage.set(this.transferBuffer, offset);
    }
  }

  executeType3Command(cmd) {
    if ((cmd & 0xf0) === 0xc0) {
      // Read Address
      this.transferBuffer[0] = this.trackRegister;
      this.transferBuffer[1] = 0x00;
      this.transferBuffer[2] = this.sectorRegister;
      this.transferBuffer[3] = 0x01; // 256 bytes code
      this.transferBuffer[4] = 0x00; // CRC 1
      this.transferBuffer[5] = 0x00; // CRC 2

      this.bufferIndex = 0;
      this.bufferLength = 6;
      this.dataRegister = this.transferBuffer[0];
      this.isReading = true;
      this.isWriting = false;
      this.busy = true;
      this.drq = true;
      this.intrq = false;
      this.statusRegister = StatusBusy | StatusDrq;
    } else {
      // Format / Read Track: complete immediately
      this.busy = false;
      this.drq = false;
      this.intrq = true;
      this.statusRegister = 0x00;
    }
  }

  executeType4Command(cmd) {
    this.busy = false;
    this.drq = false;
    this.isReading = false;
    this.isWriting = false;
    this.statusRegister = (this.cylinder === 0 ? StatusTrack0 : 0);

    if ((cmd & 0x08) !== 0) {
      this.intrq = true;
    }
  }

  // --- SCL to TRD In-Memory Converter ---
  static convertSclToTrd(scl) {
    if (scl.length < 9) throw new Error('Invalid SCL file: header too short.');
    const headerStr = String.fromCharCode(...scl.subarray(0, 8));
    if (headerStr !== 'SINCLAIR') throw new Error("Invalid SCL file: missing 'SINCLAIR' header.");

    const fileCount = scl[8];
    const trd = new Uint8Array(STANDARD_TRD_SIZE);

    const catalogSize = fileCount * 14;
    if (9 + catalogSize > scl.length) throw new Error('Invalid SCL file: truncated catalog.');

    let sclDataOffset = 9 + catalogSize;
    let currentTrack = 1;
    let currentSector = 0;

    for (let i = 0; i < fileCount; i++) {
      const entryOffset = 9 + (i * 14);
      const sectorCount = scl[entryOffset + 13];

      // Build 16-byte TR-DOS directory entry at Track 0, Sectors 0..7 (offset 0..2047)
      const trdDirOffset = i * 16;
      trd.set(scl.subarray(entryOffset, entryOffset + 14), trdDirOffset);
      trd[trdDirOffset + 14] = currentSector;
      trd[trdDirOffset + 15] = currentTrack;

      // Copy file data into disk sectors
      const bytesToCopy = sectorCount * BYTES_PER_SECTOR;
      if (sclDataOffset + bytesToCopy <= scl.length - 4) { // exclude 4-byte checksum
        const diskOffset = (currentTrack * SECTORS_PER_TRACK + currentSector) * BYTES_PER_SECTOR;
        if (diskOffset + bytesToCopy <= trd.length) {
          trd.set(scl.subarray(sclDataOffset, sclDataOffset + bytesToCopy), diskOffset);
        }
      }
      sclDataOffset += bytesToCopy;

      const totalSectors = (currentTrack * SECTORS_PER_TRACK) + currentSector + sectorCount;
      currentTrack = Math.floor(totalSectors / SECTORS_PER_TRACK);
      currentSector = totalSectors % SECTORS_PER_TRACK;
    }

    // TR-DOS Volume Information at Track 0, Sector 8 (Offset 0x800)
    const volOffset = 8 * BYTES_PER_SECTOR; // 0x800
    trd[volOffset + 0xe1] = currentSector; // First free sector
    trd[volOffset + 0xe2] = currentTrack;  // First free track
    trd[volOffset + 0xe3] = 0x16;          // Disk type: 80 tracks, double-sided
    trd[volOffset + 0xe4] = fileCount;     // Number of files

    const freeSectors = Math.max(0, (TOTAL_LOGICAL_TRACKS * SECTORS_PER_TRACK) - (currentTrack * SECTORS_PER_TRACK + currentSector));
    trd[volOffset + 0xe5] = freeSectors & 0xff;
    trd[volOffset + 0xe6] = (freeSectors >> 8) & 0xff;
    trd[volOffset + 0xe7] = 0x10;          // TR-DOS signature byte

    // Default disk label: "TR-DOS  "
    const label = [0x54, 0x52, 0x2d, 0x44, 0x4f, 0x53, 0x20, 0x20];
    trd.set(label, volOffset + 0xf5);

    Beta128DiskController.ensureBootFile(trd);
    return trd;
  }

  // --- Auto-boot "boot.B" synthesis & repair if missing or corrupted ---
  static ensureBootFile(trd) {
    if (trd.length < (10 * BYTES_PER_SECTOR)) return;
    const volOffset = 8 * BYTES_PER_SECTOR;
    const fileCount = trd[volOffset + 0xe4];
    if (fileCount === 0 || fileCount >= 128) return;

    // Check if boot.B already exists, and also find first .B or .C executable
    let firstBasic = null;
    let firstCode = null;
    let firstCodeStart = 0;

    for (let i = 0; i < fileCount; i++) {
      let name = '';
      for (let c = 0; c < 8; c++) name += String.fromCharCode(trd[i * 16 + c]);
      name = name.trim();
      const type = String.fromCharCode(trd[i * 16 + 8]);

      if (name.toLowerCase() === 'boot' && (type === 'B' || type === 'b')) {
        // Repair any previously synthesized boot.B that used 0xD9 (INK) instead of 0xF9 (RANDOMIZE)
        const bSec = trd[i * 16 + 14];
        const bTrk = trd[i * 16 + 15];
        const bOff = (bTrk * SECTORS_PER_TRACK + bSec) * BYTES_PER_SECTOR;
        if (bOff + 16 < trd.length && trd[bOff + 4] === 0xd9 && trd[bOff + 5] === 0xc0) {
          trd[bOff + 4] = 0xf9; // Fix 0xD9 (INK) -> 0xF9 (RANDOMIZE)
        }
        return; // boot.B already exists!
      }
      if (!firstBasic && (type === 'B' || type === 'b')) {
        firstBasic = name;
      }
      if (!firstCode && (type === 'C' || type === 'c')) {
        firstCode = name;
        firstCodeStart = trd[i * 16 + 9] | (trd[i * 16 + 10] << 8);
      }
    }

    const firstExecutable = firstBasic || firstCode;
    if (!firstExecutable) return;

    let freeSector = trd[volOffset + 0xe1];
    let freeTrack = trd[volOffset + 0xe2];
    if (freeTrack < 1) freeTrack = 1; // File data MUST start on Track >= 1

    let basicBytes;
    if (firstBasic) {
      // Build 1-line BASIC program:
      // 10 RANDOMIZE USR VAL "15619": REM : RUN "firstBasic"
      const body = [
        0xf9, // RANDOMIZE (0xF9)
        0xc0, // USR (0xC0)
        0xb0, // VAL (0xB0)
        0x22, 0x31, 0x35, 0x36, 0x31, 0x39, 0x22, // "15619"
        0x3a, // :
        0xea, // REM (0xEA)
        0x3a, // :
        0xf7, // RUN token (0xF7)
        0x22  // "
      ];
      for (let c = 0; c < firstBasic.length; c++) body.push(firstBasic.charCodeAt(c));
      body.push(0x22, 0x0d); // " + Enter

      const lineLen = body.length;
      basicBytes = [
        0x00, 0x0a, // Line 10 (big endian)
        lineLen & 0xff, (lineLen >> 8) & 0xff, // Length (little endian)
        ...body,
        0x80, 0xaa, 0x0a, 0x00 // Autostart variables block: line 10
      ];
    } else {
      // Build 2-line BASIC loader for .C (CODE) file:
      // 10 RANDOMIZE USR VAL "15619": REM : LOAD "firstCode" CODE
      // 20 RANDOMIZE USR VAL "startAddr"
      const body10 = [
        0xf9, 0xc0, 0xb0,
        0x22, 0x31, 0x35, 0x36, 0x31, 0x39, 0x22,
        0x3a, 0xea, 0x3a,
        0xef, // LOAD token (0xEF)
        0x22
      ];
      for (let c = 0; c < firstCode.length; c++) body10.push(firstCode.charCodeAt(c));
      body10.push(0x22, 0xaf, 0x0d); // " + CODE token (0xAF) + Enter

      const startStr = String(firstCodeStart || 32768);
      const body20 = [0xf9, 0xc0, 0xb0, 0x22];
      for (let c = 0; c < startStr.length; c++) body20.push(startStr.charCodeAt(c));
      body20.push(0x22, 0x0d);

      const len10 = body10.length;
      const len20 = body20.length;
      const progLen = 4 + len10 + 4 + len20;
      basicBytes = [
        0x00, 0x0a, len10 & 0xff, (len10 >> 8) & 0xff, ...body10,
        0x00, 0x14, len20 & 0xff, (len20 >> 8) & 0xff, ...body20,
        0x80, 0xaa, 0x0a, 0x00
      ];
      // Note: basicLength below includes the 4-byte autostart tail; progLen is vars offset
      basicBytes._progLen = progLen;
    }

    const basicLength = basicBytes.length;
    const basicProgLen = basicBytes._progLen || (basicLength - 4);

    // Place boot file data at free track and sector (Track >= 1)
    const bootDataOffset = (freeTrack * SECTORS_PER_TRACK + freeSector) * BYTES_PER_SECTOR;
    if (bootDataOffset + BYTES_PER_SECTOR <= trd.length) {
      trd.fill(0, bootDataOffset, bootDataOffset + BYTES_PER_SECTOR);
      trd.set(basicBytes, bootDataOffset);
    }

    // Add 16-byte directory entry for boot.B at index fileCount
    const dirOffset = fileCount * 16;
    const bootName = [0x62, 0x6f, 0x6f, 0x74, 0x20, 0x20, 0x20, 0x20]; // "boot    "
    trd.set(bootName, dirOffset);
    trd[dirOffset + 8] = 0x42; // 'B' (BASIC)
    trd[dirOffset + 9] = basicLength & 0xff;
    trd[dirOffset + 10] = (basicLength >> 8) & 0xff;
    trd[dirOffset + 11] = basicProgLen & 0xff;
    trd[dirOffset + 12] = (basicProgLen >> 8) & 0xff;
    trd[dirOffset + 13] = 0x01; // 1 sector
    trd[dirOffset + 14] = freeSector;
    trd[dirOffset + 15] = freeTrack;

    // Advance free sector/track
    const nextTotalSectors = (freeTrack * SECTORS_PER_TRACK) + freeSector + 1;
    const nextTrack = Math.floor(nextTotalSectors / SECTORS_PER_TRACK);
    const nextSector = nextTotalSectors % SECTORS_PER_TRACK;

    trd[volOffset + 0xe1] = nextSector;
    trd[volOffset + 0xe2] = nextTrack;
    trd[volOffset + 0xe4] = fileCount + 1; // Increment file count

    const freeSectorsRemaining = Math.max(0, (TOTAL_LOGICAL_TRACKS * SECTORS_PER_TRACK) - (nextTrack * SECTORS_PER_TRACK + nextSector));
    trd[volOffset + 0xe5] = freeSectorsRemaining & 0xff;
    trd[volOffset + 0xe6] = (freeSectorsRemaining >> 8) & 0xff;

    console.log(`[TR-DOS FDC] Synthesized boot.B autoloader targeting '${firstExecutable}' at Track ${freeTrack}, Sector ${freeSector}`);
  }
}
