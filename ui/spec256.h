/* spec256.h - Spectrum 256 (Spec256) Engine & 256-Colour Remaster for FuseXR
   Copyright (c) 2026 FuseXR Team
*/

#ifndef FUSE_SPEC256_H
#define FUSE_SPEC256_H

#include "libspectrum.h"

typedef enum {
  SPEC256_MODE_OFF = 0,
  SPEC256_MODE_HANDCRAFTED = 1,     /* Official Spec256 8-bitplane packs (.GFX + .B00) */
  SPEC256_MODE_AUTO_ARCADE = 2,     /* Live 256-Colour Remaster: Vibrant Arcade (Any Game) */
  SPEC256_MODE_AUTO_SMOOTH = 3,     /* Live 256-Colour Remaster: Smooth Gradient & Antialiasing */
  SPEC256_MODE_AUTO_VGA = 4         /* Live 256-Colour Remaster: Retro VGA 256 */
} spec256_mode_t;

/* Initialize Spec256 palette and memory */
void spec256_init( void );

/* Is Spec256 active? */
int spec256_is_active( void );

/* Mode management */
spec256_mode_t spec256_get_mode( void );
void spec256_set_mode( spec256_mode_t mode );
const char *spec256_get_mode_name( void );

/* Classic Remaster library */
int spec256_get_classic_count( void );
const char *spec256_get_classic_title( int idx );
const char *spec256_get_classic_folder( int idx );
int spec256_is_classic_available( int idx );
int spec256_load_classic( int idx );

/* File loading */
int spec256_load_gfx_file( const char *path );
int spec256_load_bg_file( const char *path, int slot );
void spec256_next_bg( void );
void spec256_prev_bg( void );
int spec256_get_bg_count( void );
int spec256_get_current_bg( void );

/* Memory write hook */
void spec256_on_writebyte( libspectrum_word address, libspectrum_byte b );

/* Frame rendering directly into Fuse's 32-bit RGB framebuffer */
void spec256_render_frame_to_rgb( libspectrum_dword *dest_rgb, int dest_pitch, int width, int height );

#endif /* FUSE_SPEC256_H */
