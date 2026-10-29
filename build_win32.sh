#!/usr/bin/env bash
set -e
export PATH=/ucrt64/bin:/mingw64/bin:/usr/bin:$PATH
cd "$(dirname "$0")"

echo "=== Compiling windres.o & scalers ==="
if [ ! -f windres.o ]; then
  windres -I. -Ilibspectrum windres.rc windres.o
fi
if [ ! -f ui/scaler/scalers16.o ]; then
  gcc -O2 -I. -Ilibspectrum -DSCALER_DATA_SIZE=2 -c ui/scaler/scalers.c -o ui/scaler/scalers16.o
fi
if [ ! -f ui/scaler/scalers32.o ]; then
  gcc -O2 -I. -Ilibspectrum -DSCALER_DATA_SIZE=4 -c ui/scaler/scalers.c -o ui/scaler/scalers32.o
fi

SRCS="
display.c display_border.c display_dirty.c display_render.c
event.c fuse.c input.c keyboard.c loader.c loader_detector.c unittests/loader.c
machine.c memory_pages.c mempool.c menu.c movie.c module.c periph.c
phantom_typist.c profile.c psg.c rectangle.c rzx.c rzx_recording.c
screenshot.c settings.c slt.c snapshot.c sound.c spectrum.c
svg.c tape.c tape_block.c tape_record.c tape_traps.c unittests/tape.c
unittests/helpers.c ui.c ui/quest_vr.c uidisplay.c uimedia.c utils.c
compat/unix/dir.c compat/unix/file.c compat/win32/osname.c compat/win32/paths.c
compat/win32/timer.c compat/win32/monotonic.c compat/win32/socket.c
debugger/breakpoint.c debugger/command.c debugger/commandl.c debugger/commandy.c
debugger/debugger.c debugger/disassemble.c debugger/event.c debugger/expression.c
debugger/system_variable.c debugger/variable.c
infrastructure/startup_manager.c
machines/machines_periph.c machines/pentagon.c machines/pentagon512.c
machines/pentagon1024.c machines/scorpion.c machines/spec128.c machines/spec16.c
machines/spec48.c machines/spec48_ntsc.c machines/specplus2.c machines/spec_se.c
machines/specplus2a.c machines/specplus3.c machines/specplus3e.c
machines/tc2048.c machines/tc2068.c machines/ts2068.c
peripherals/dck.c peripherals/if1.c peripherals/if2.c peripherals/joystick.c
peripherals/kempmouse.c peripherals/multiface.c peripherals/printer.c
peripherals/scld.c peripherals/speccyboot.c peripherals/spectranet.c
peripherals/ula.c peripherals/usource.c peripherals/ttx2000s.c
peripherals/sound/ay.c peripherals/sound/covox.c peripherals/sound/fuller.c
peripherals/sound/melodik.c peripherals/sound/sp0256.c peripherals/sound/specdrum.c
peripherals/sound/uspeech.c peripherals/disk/beta.c peripherals/disk/crc.c
peripherals/disk/didaktik.c peripherals/disk/disciple.c peripherals/disk/disk.c
peripherals/disk/fdd.c peripherals/disk/opus.c peripherals/disk/plusd.c
peripherals/disk/trdos.c peripherals/disk/upd_fdc.c peripherals/disk/wd_fdc.c
peripherals/ide/divide.c peripherals/ide/divmmc.c peripherals/ide/divxxx.c
peripherals/ide/ide.c peripherals/ide/simpleide.c peripherals/ide/zxatasp.c
peripherals/ide/zxcf.c peripherals/ide/zxmmc.c
peripherals/flash/am29f010.c peripherals/nic/w5100.c peripherals/nic/w5100_socket.c
pokefinder/pokefinder.c pokefinder/pokemem.c
sound/ay_engine.c sound/blipbuffer.c sound/dc_filter.c sound/output_mixer.c
sound/source_synths.c sound/speaker_filter.c sound/tv_filter.c sound/ula_filter.c
sound/win32sound.c sound/sfifo.c
timer/timer.c timer/native.c
ui/scaler/scaler.c ui/scaler/snes_ntsc.c
ui/display_timing.c
ui/win32/about.c ui/win32/binary.c ui/win32/browse.c ui/win32/confirm.c
ui/win32/debugger.c ui/win32/fileselector.c ui/win32/hyperlinks.c
ui/win32/keysyms.c ui/win32/memorybrowser.c ui/win32/menu_data.c
ui/win32/options.c ui/win32/picture.c ui/win32/pokefinder.c ui/win32/pokemem.c
ui/win32/rollback.c ui/win32/roms.c ui/win32/statusbar.c ui/win32/win32display.c
ui/win32/win32joystick.c ui/win32/win32keyboard.c ui/win32/win32mouse.c
ui/win32/win32ui.c
z80/z80.c z80/z80_debugger_variables.c z80/z80_ops.c
"

OBJS="windres.o ui/scaler/scalers16.o ui/scaler/scalers32.o"
for s in $SRCS; do
  o=${s%.c}.o
  if [ ! -f "$o" ] || [ "$s" -nt "$o" ]; then
    gcc -O2 -I. -Ilibspectrum -c $s -o $o
  fi
  OBJS="$OBJS $o"
done

echo "=== Building libspectrum-8.dll & import library ==="
rm -f libspectrum/make-perl.o
LIBSPEC_SRCS=$(ls libspectrum/*.c libspectrum/zip.c libspectrum/zlib.c libspectrum/myglib/*.c 2>/dev/null | grep -v make-perl.c || true)
for ls_src in libspectrum/*.c libspectrum/myglib/*.c; do
  case "$ls_src" in
    *make-perl.c|*wav_macos.c) continue ;;
  esac
  ls_obj="${ls_src%.c}.o"
  if [ ! -f "$ls_obj" ] || [ "$ls_src" -nt "$ls_obj" ]; then
    gcc -O2 -Ilibspectrum -DHAVE_CONFIG_H -c "$ls_src" -o "$ls_obj"
  fi
done
gcc -shared -O2 -o libspectrum-8.dll -Wl,--out-implib,libspectrum/libspectrum.dll.a libspectrum/*.o libspectrum/myglib/*.o -lz -lm
cp libspectrum/libspectrum.dll.a libspectrum/libspectrum.a

echo "=== Linking fuse.exe ==="
gcc -O2 -mwindows -o fuse.exe $OBJS libspectrum/libspectrum.a -lws2_32 -lgdi32 -lcomctl32 -lcomdlg32 -lshell32 -lwinmm -lpthread -lz -lm
ls -lh fuse.exe
echo "=== Built fuse.exe successfully! ==="
