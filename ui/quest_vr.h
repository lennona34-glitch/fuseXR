/* quest_vr.h: Meta Quest VR & Mixed Reality WebXR Broadcast Studio for Fuse
   Copyright (c) 2026 Fuse Emulator Project

   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License along
   with this program; if not, write to the Free Software Foundation, Inc.,
   51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

#ifndef FUSE_QUEST_VR_H
#define FUSE_QUEST_VR_H

#include <stddef.h>
#include "libspectrum.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum quest_vr_stereo_mode {
  QUEST_VR_MODE_2D = 0,
  QUEST_VR_MODE_SBS_3D = 1,
  QUEST_VR_MODE_TB_3D = 2,
  QUEST_VR_MODE_ANAGLYPH_3D = 3,
} quest_vr_stereo_mode;

/* Lifecycle */
int quest_vr_init( void );
void quest_vr_end( void );

/* Start / Stop / Toggle broadcast server */
int quest_vr_start( int port );
void quest_vr_stop( void );
int quest_vr_toggle( void );
int quest_vr_is_running( void );

/* Configuration & Telemetry */
int quest_vr_get_port( void );
void quest_vr_set_target_fps( int fps );
int quest_vr_get_target_fps( void );
void quest_vr_set_jpeg_quality( int quality );
int quest_vr_get_jpeg_quality( void );
void quest_vr_set_stereo_mode( quest_vr_stereo_mode mode );
quest_vr_stereo_mode quest_vr_get_stereo_mode( void );

const char *quest_vr_get_url( void );
const char *quest_vr_get_status_detail( void );
unsigned long quest_vr_get_frame_count( void );
int quest_vr_get_client_count( void );
float quest_vr_get_stream_fps( void );

/* Actions */
int quest_vr_open_browser( void );
int quest_vr_copy_url_to_clipboard( void );
void quest_vr_apply_settings( void );

/* Frame submission hooks for Fuse display backends */
void quest_vr_submit_bgra32( const void *pixels, int width, int height,
                             int pitch );
void quest_vr_submit_rgb565( const void *pixels, int width, int height,
                             int pitch );

/* Main-thread event polling for remote WebXR / Easy Cheat / Archive commands */
void quest_vr_poll_events( void );

/* Native Win32 FuseXR Dropdown Menus & Studio Dialogs */
void quest_vr_populate_win32_menus( void *hWnd );
int quest_vr_handle_win32_menu( unsigned int cmd_id, void *hWnd );
int quest_vr_should_suppress_error( void );
void quest_vr_toggle_fullscreen( void *hWnd );

#ifdef __cplusplus
}
#endif

#endif /* FUSE_QUEST_VR_H */
