# FuseXR — Sinclair ZX Spectrum Emulator (Fuse 1.10.0 + Meta Quest 3 WebXR Edition)

**FuseXR** is an enhanced fork of **Fuse 1.10.0** (the Free Unix Spectrum Emulator) featuring a built-in **Meta Quest 3 WebXR Broadcast & Spatial Studio**, a **1-Click Easy Cheat & Live Pokefinder Engine**, **Legitimate Online & TOSEC Game Archives**, and dual-core execution (**Fuse 1.10.0 Native C Core** + **Fuse 1.10.0 System ROM WebXR Core**).

---

## ✨ Key Features in FuseXR

### 1. 🥽 Meta Quest 3 WebXR Broadcast & Spatial Retro Room (`ui/quest_vr.c`)
- **Zero-Dependency C HTTP / MJPEG / Raw Palette Server**: Built directly into `fuse.exe` (`--quest-vr`, `--quest-vr-port=8765`, `--quest-vr-fps=50`, `--quest-vr-stereo=sbs`).
- **3D 1980s Retro Room & Passthrough MR**: Full Three.js WebXR workstation with a vintage 1084S CRT monitor, Sinclair ZX Spectrum +3 deck, 3D rubber keyboard, spatial floating menu, and SBS/OU stereoscopic 3D pop-out shader modes.
- **Dual-Core Live Toggle (`🟢 Fuse 1.10.0 C Core` / `⚡ Fuse 1.10.0 ROMs`)**:
  - **Fuse 1.10.0 Native C Core**: Streams exact 38,400-byte 4-bit ULA palette frames (`/api/frame.pal`) and bidirectional keyboard/Kempston input (`/input`) directly from `fuse.exe`.
  - **Built-in WebXR Core with Authentic Fuse 1.10.0 System ROMs**: Runs Fuse 1.10.0's exact `48.rom`, `128-0.rom`/`128-1.rom`, `plus2-0.rom`/`plus2-1.rom`, `plus3-0.rom`..`plus3-3.rom`, and Pentagon `128p-0.rom`/`128p-1.rom`/`trdos.rom` directly in the browser with cycle-accurate Z80, AY-3-8912, µPD765A +3 FDC, and Beta 128 TR-DOS hardware emulation.

### 2. 🧬 Easy Cheat & Live Pokefinder Studio
- **Curated 1-Click Infinite Lives / Ammo / Time Cheats** for classic ZX Spectrum games (Manic Miner, Jet Set Willy, Knight Lore, Sabre Wulf, Atic Atac, Chuckie Egg, Head Over Heels, Target Renegade, Chase H.Q., R-Type, Dizzy, Starquake, Rainbow Islands, Monty on the Run, Robocop, Batman, Exolon, Green Beret, Cobra, Bomb Jack, etc.).
- **Native `.POK` Trainer Parser & Toggler**: Upload or load `.POK` files directly into Fuse's `pokemem` trainer list (`pokefinder/pokemem.c`) and toggle multi-poke trainers with 1-click memory restore.
- **Custom Direct Memory POKE & PEEK Inspector**: Read/write any `Bank (0-7 or 8=Active 64K) : Address : Value` with automatic original-byte backup and restore.
- **Interactive Live Pokefinder**: Wraps Fuse's `pokefinder/pokefinder.c` (`Search Exact Value`, `Increased`, `Decreased`, `Reset`) to isolate lives/ammo counters in real time and POKE them with one click.

### 3. 📚 Legitimate Online Archives & 29,000+ Game Streamer
- **Legitimate Download Archives (`📚 Archives (29k)`)**:
  - **Internet Archive** (ZX Spectrum Library, World of Spectrum Showcase, Spectrum `.Z80` Snapshot Collection)
  - **Spectrum Computing** (Official ZXDB Database)
  - **World of Spectrum** (Classic Archive)
  - **The Tipshop** (`.POK` Poke & Trainer Database)
  - **Virtual TR-DOS** (Pentagon 128 `.TRD` / `.SCL` Archive)
- **Bundled Classic Games (`games/`)**: Includes 39 ready-to-play `.Z80`, `.TAP`, `.TZX`, `.DSK`, and `.TRD` classics.

### 4. 🛠️ Upstream Fuse 1.10.0 Fixes Included
- **`machine.c`**: Fixed heap memory leak (`free(id)`) in `machine_select_id()`.
- **`peripherals/disk/disk.c`**: Fixed double `fclose()` UB on error paths in `disk_open2()` and `disk_write()`.
- **`peripherals/if1.c`**: Fixed buffer underflow when `l <= 1` in `val_str()`.
- **`fuse.c` & `z80/coretest.c`**: Fixed MinGW-w64 / GCC 14+ `LPSOCKADDR` pointer-sign warnings and `readbyte_internal` linkage in `coretest`.
- **`ui/win32/win32ui.c` & `ui/win32/confirm.c`**: Prevented background pause when minimized or when non-interactive dialogs fire during active Quest VR broadcasts.

---

## 🚀 Quick Start

### Option A: Native Windows + Quest VR Broadcast (`fuse.exe`)
```powershell
.\fuse.exe --quest-vr
```
Then open **`http://localhost:8765/`** on your PC or **`http://<YOUR-PC-LAN-IP>:8765/`** in the Meta Quest 3 browser (or select **Media -> Quest VR Broadcast -> Start / Open Studio...** from the Fuse menu bar).

### Option B: Full WebXR HTTPS Dev Server (`quest-spectrum-xr`)
```powershell
cd quest-spectrum-xr
npm install
npm run dev
```
Then open **`https://localhost:5173/`** (auto-starts and bridges with `fuse.exe --quest-vr` on port `8765`).

### Rebuilding `fuse.exe` on Windows (MSYS2 / MinGW64)
```bash
./build_win32.sh
```
