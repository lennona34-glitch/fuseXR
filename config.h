/* config.h for Fuse 1.10.0 (Win32 / MinGW-w64) */
#ifndef FUSE_CONFIG_H
#define FUSE_CONFIG_H

#define PACKAGE "fuse"
#define PACKAGE_NAME "fuse"
#define PACKAGE_VERSION "1.10.0"
#define PACKAGE_STRING "fuse 1.10.0"
#define PACKAGE_BUGREPORT "https://sourceforge.net/p/fuse-emulator/bugs/"
#define PACKAGE_URL "https://fuse-emulator.sourceforge.net/"
#define VERSION "1.10.0"
#define FUSE_RC_VERSION 1,10,0,0
#define FUSE_COPYRIGHT "(c) 1999-2026 Philip Kendall and others"

#ifndef UI_SDL2
#define UI_WIN32 1
#endif

/* #undef SOUND_FIFO */
#define DIRECTSOUND_VERSION 0x0700
#define USE_JOYSTICK 1
#define HAVE_ENOUGH_MEMORY 1
#define BUILD_TTX2000S 1
#define BUILD_SPECTRANET 1

#define HAVE_STDINT_H 1
#define HAVE_STRINGS_H 1
#define HAVE_UNISTD_H 1
#define HAVE_INTTYPES_H 1
#define HAVE_LIBGEN_H 1
#define HAVE_DIRNAME 1
#define HAVE_GETOPT_LONG 1
#define HAVE_MKSTEMP 1
/* #undef HAVE_FSYNC */
#define HAVE_ZLIB_H 1

#ifndef WINVER
#define WINVER 0x0501
#endif
#ifndef _WIN32_IE
#define _WIN32_IE 0x0501
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN 1
#endif

#define FUSEDATADIR "roms"

#endif
