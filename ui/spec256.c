/* spec256.c - Spectrum 256 (Spec256) Engine & 256-Colour Remaster for FuseXR
   Copyright (c) 2026 FuseXR Team
*/

#include "config.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <windows.h>
#include <wininet.h>

#include "spec256.h"
#include "spec256_pal.h"
#include "spec256_classics.h"
#include "display.h"
#include "machine.h"
#include "memory_pages.h"
#include "settings.h"
#include "ui/ui.h"
#include "utils.h"
#include "fuse.h"

/* Dimensions */
#define SPEC256_BG_W 320
#define SPEC256_BG_H 200
#define SPEC256_BG_X0 32
#define SPEC256_BG_Y0 4

#define SPEC_PAPER_X0 32
#define SPEC_PAPER_Y0 24
#define SPEC_PAPER_W 256
#define SPEC_PAPER_H 192

/* Active mode */
static spec256_mode_t g_spec256_mode = SPEC256_MODE_OFF;
static char g_spec256_current_title[128] = "Spectrum 256";

/* 8 bitplanes (64KB each) */
static uint8_t g_spec256_gfxram[8][65536];
static int g_spec256_gfx_loaded = 0;

/* Up to 8 backgrounds (320x200 bytes each) */
static uint8_t g_spec256_bgs[8][64000];
static uint8_t g_spec256_bg_loaded[8];
static int g_spec256_bg_count = 0;
static int g_spec256_current_bg = -1;

/* Current active palette (256 entries in 0x00RRGGBB) */
static libspectrum_dword g_spec256_pal[256];

/* Helper: Flip video address bits as ULA does */
static inline uint16_t vxswapb( uint16_t ofs )
{
  return ( ofs & 0xf81f ) | ( ( ofs & 0x00e0 ) << 3 ) | ( ( ofs & 0x0700 ) >> 3 );
}

void spec256_init( void )
{
  int i;
  memcpy( g_spec256_pal, spec256_default_palette, sizeof( g_spec256_pal ) );
  memset( g_spec256_gfxram, 0, sizeof( g_spec256_gfxram ) );
  memset( g_spec256_bgs, 0, sizeof( g_spec256_bgs ) );
  memset( g_spec256_bg_loaded, 0, sizeof( g_spec256_bg_loaded ) );
  g_spec256_bg_count = 0;
  g_spec256_current_bg = -1;
  g_spec256_gfx_loaded = 0;
  g_spec256_mode = SPEC256_MODE_OFF;
}

int spec256_is_active( void )
{
  return g_spec256_mode != SPEC256_MODE_OFF;
}

spec256_mode_t spec256_get_mode( void )
{
  return g_spec256_mode;
}

void spec256_set_mode( spec256_mode_t mode )
{
  g_spec256_mode = mode;
  display_refresh_all();
}

const char *spec256_get_mode_name( void )
{
  switch( g_spec256_mode ) {
    case SPEC256_MODE_HANDCRAFTED:
      return "Spec256 Remaster Pack";
    case SPEC256_MODE_AUTO_ARCADE:
      return "Live 256-Colour (Arcade)";
    case SPEC256_MODE_AUTO_SMOOTH:
      return "Live 256-Colour (Smooth & Bevel)";
    case SPEC256_MODE_AUTO_VGA:
      return "Live 256-Colour (Retro VGA)";
    default:
      return "Standard 16-Colour ULA";
  }
}

int spec256_load_gfx_file( const char *path )
{
  FILE *f = fopen( path, "rb" );
  if( !f ) return 0;

  unsigned int u, v, w;
  uint8_t buf[8];

  /* 49152 addresses x 8 planes = 393,216 bytes */
  for( u = 0; u < 49152; u++ ) {
    if( fread( buf, 1, 8, f ) != 8 ) break;
    for( v = 0; v < 8; v++ ) {
      uint8_t b = 0;
      for( w = 0; w < 8; w++ ) {
        if( buf[w] & ( 1 << v ) ) b |= ( 1 << w );
      }
      g_spec256_gfxram[v][0x4000 + u] = b;
    }
  }

  fclose( f );
  g_spec256_gfx_loaded = 1;
  return 1;
}

int spec256_load_bg_file( const char *path, int slot )
{
  if( slot < 0 || slot >= 8 ) return 0;
  FILE *f = fopen( path, "rb" );
  if( !f ) return 0;

  size_t bytes = fread( g_spec256_bgs[slot], 1, 64000, f );
  fclose( f );

  if( bytes >= 64000 ) {
    g_spec256_bg_loaded[slot] = 1;
    if( slot >= g_spec256_bg_count ) g_spec256_bg_count = slot + 1;
    if( g_spec256_current_bg == -1 ) g_spec256_current_bg = slot;
    return 1;
  }
  return 0;
}

void spec256_next_bg( void )
{
  if( g_spec256_bg_count <= 0 ) return;
  int start = g_spec256_current_bg;
  int next = ( start + 1 ) % g_spec256_bg_count;
  while( next != start ) {
    if( g_spec256_bg_loaded[next] ) {
      g_spec256_current_bg = next;
      display_refresh_all();
      return;
    }
    next = ( next + 1 ) % g_spec256_bg_count;
  }
}

void spec256_prev_bg( void )
{
  if( g_spec256_bg_count <= 0 ) return;
  int start = g_spec256_current_bg;
  int prev = ( start - 1 + g_spec256_bg_count ) % g_spec256_bg_count;
  while( prev != start ) {
    if( g_spec256_bg_loaded[prev] ) {
      g_spec256_current_bg = prev;
      display_refresh_all();
      return;
    }
    prev = ( prev - 1 + g_spec256_bg_count ) % g_spec256_bg_count;
  }
}

int spec256_get_bg_count( void )
{
  return g_spec256_bg_count;
}

int spec256_get_current_bg( void )
{
  return g_spec256_current_bg;
}

void spec256_on_writebyte( libspectrum_word address, libspectrum_byte b )
{
  if( g_spec256_mode != SPEC256_MODE_HANDCRAFTED ) return;
  
  /* Plane 0 mirrors standard Spectrum RAM */
  g_spec256_gfxram[0][address] = b;
}

/* Classic games list */
int spec256_get_classic_count( void )
{
  return SPEC256_CLASSIC_COUNT;
}

const char *spec256_get_classic_title( int idx )
{
  if( idx < 0 || idx >= SPEC256_CLASSIC_COUNT ) return "";
  return spec256_classics[idx].title;
}

const char *spec256_get_classic_folder( int idx )
{
  if( idx < 0 || idx >= SPEC256_CLASSIC_COUNT ) return "";
  return spec256_classics[idx].folder;
}

int spec256_is_classic_available( int idx )
{
  if( idx < 0 || idx >= SPEC256_CLASSIC_COUNT ) return 0;
  return ( spec256_classics[idx].sna_file[0] != '\0' &&
           spec256_classics[idx].gfx_file[0] != '\0' );
}

/* Helper to find application executable directory */
static void get_app_dir( char *out, size_t cap )
{
  char exe_path[512];
  if( GetModuleFileNameA( NULL, exe_path, sizeof( exe_path ) ) ) {
    char *slash = strrchr( exe_path, '\\' );
    if( !slash ) slash = strrchr( exe_path, '/' );
    if( slash ) {
      *slash = '\0';
      snprintf( out, cap, "%s", exe_path );
      return;
    }
  }
  snprintf( out, cap, "." );
}

/* Helper to download a single file with WinINet */
static int download_file_wininet( const char *url, const char *dest_path )
{
  HINTERNET hNet = InternetOpenA( "FuseXR-Spec256/1.0", INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0 );
  if( !hNet ) return 0;

  HINTERNET hUrl = InternetOpenUrlA( hNet, url, NULL, 0, INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE, 0 );
  if( !hUrl ) {
    InternetCloseHandle( hNet );
    return 0;
  }

  DWORD status = 0, status_len = sizeof( status );
  if( HttpQueryInfoA( hUrl, HTTP_QUERY_STATUS_CODE | HTTP_QUERY_FLAG_NUMBER, &status, &status_len, NULL ) ) {
    if( status != 200 ) {
      InternetCloseHandle( hUrl );
      InternetCloseHandle( hNet );
      return 0;
    }
  }

  FILE *f = fopen( dest_path, "wb" );
  if( !f ) {
    InternetCloseHandle( hUrl );
    InternetCloseHandle( hNet );
    return 0;
  }

  char buf[8192];
  DWORD read_bytes = 0;
  int ok = 1;
  size_t total_written = 0;
  while( InternetReadFile( hUrl, buf, sizeof( buf ), &read_bytes ) && read_bytes > 0 ) {
    if( fwrite( buf, 1, read_bytes, f ) != read_bytes ) {
      ok = 0;
      break;
    }
    total_written += read_bytes;
  }

  fclose( f );
  InternetCloseHandle( hUrl );
  InternetCloseHandle( hNet );
  if( !ok || total_written == 0 ) {
    DeleteFileA( dest_path );
    return 0;
  }
  return 1;
}

/* URL encoder for folder names with spaces */
static void url_encode_str( const char *src, char *dst, size_t dst_len )
{
  size_t d = 0;
  while( *src && d + 4 < dst_len ) {
    if( *src == ' ' ) {
      dst[d++] = '%'; dst[d++] = '2'; dst[d++] = '0';
      src++;
    } else {
      dst[d++] = *src++;
    }
  }
  dst[d] = '\0';
}

int spec256_load_classic( int idx )
{
  if( idx < 0 || idx >= SPEC256_CLASSIC_COUNT ) return 0;
  if( !spec256_is_classic_available( idx ) ) return 0;

  const spec256_classic_entry_t *entry = &spec256_classics[idx];

  char app_dir[512];
  get_app_dir( app_dir, sizeof( app_dir ) );

  char games_dir[512], spec256_dir[512], local_dir[512];
  snprintf( games_dir, sizeof( games_dir ), "%s/games", app_dir );
  snprintf( spec256_dir, sizeof( spec256_dir ), "%s/games/spec256", app_dir );
  snprintf( local_dir, sizeof( local_dir ), "%s/games/spec256/%s", app_dir, entry->folder );
  CreateDirectoryA( games_dir, NULL );
  CreateDirectoryA( spec256_dir, NULL );
  CreateDirectoryA( local_dir, NULL );

  char sna_path[512], gfx_path[512], bg_path[512];
  snprintf( sna_path, sizeof( sna_path ), "%s/%s", local_dir, entry->sna_file );
  snprintf( gfx_path, sizeof( gfx_path ), "%s/%s", local_dir, entry->gfx_file );
  if( entry->bg_file[0] ) {
    snprintf( bg_path, sizeof( bg_path ), "%s/%s", local_dir, entry->bg_file );
  } else {
    bg_path[0] = '\0';
  }

  char folder_encoded[256];
  url_encode_str( entry->folder, folder_encoded, sizeof( folder_encoded ) );

  /* Check and download SNA */
  if( GetFileAttributesA( sna_path ) == INVALID_FILE_ATTRIBUTES ) {
    char url[512];
    snprintf( url, sizeof( url ),
              "https://raw.githubusercontent.com/mvvproject/Spec256-Games/master/%s/%s",
              folder_encoded, entry->sna_file );
    download_file_wininet( url, sna_path );
  }

  /* Check and download GFX */
  if( GetFileAttributesA( gfx_path ) == INVALID_FILE_ATTRIBUTES ) {
    char url[512];
    snprintf( url, sizeof( url ),
              "https://raw.githubusercontent.com/mvvproject/Spec256-Games/master/%s/%s",
              folder_encoded, entry->gfx_file );
    download_file_wininet( url, gfx_path );
  }

  /* Check and download BG */
  if( entry->bg_file[0] && GetFileAttributesA( bg_path ) == INVALID_FILE_ATTRIBUTES ) {
    char url[512];
    snprintf( url, sizeof( url ),
              "https://raw.githubusercontent.com/mvvproject/Spec256-Games/master/%s/%s",
              folder_encoded, entry->bg_file );
    download_file_wininet( url, bg_path );
  }

  /* Pause emulation cleanly during machine change & snapshot injection */
  fuse_emulation_pause();

  /* Select 128K for larger snapshots, 48K for standard */
  HANDLE hSna = CreateFileA( sna_path, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, 0, NULL );
  DWORD sna_size = 0;
  if( hSna != INVALID_HANDLE_VALUE ) {
    sna_size = GetFileSize( hSna, NULL );
    CloseHandle( hSna );
  }

  if( sna_size > 50000 ) {
    machine_select_id( "128" );
  } else {
    machine_select_id( "48" );
  }

  /* Load snapshot */
  int err = utils_open_file( sna_path, 1, NULL );
  if( err != 0 ) {
    fuse_emulation_unpause();
    return 0;
  }

  /* Load GFX bitplanes */
  spec256_load_gfx_file( gfx_path );

  /* Load Background */
  if( bg_path[0] ) {
    spec256_load_bg_file( bg_path, 0 );
  } else {
    g_spec256_current_bg = -1;
  }

  g_spec256_mode = SPEC256_MODE_HANDCRAFTED;
  snprintf( g_spec256_current_title, sizeof( g_spec256_current_title ), "%s", entry->title );

  display_refresh_all();
  fuse_emulation_unpause();
  return 1;
}

/* High-speed Frame Renderer */
void spec256_render_frame_to_rgb( libspectrum_dword *dest_rgb, int dest_pitch, int width, int height )
{
  if( g_spec256_mode == SPEC256_MODE_OFF ) return;

  int border_color = display_lores_border & 0x07;
  libspectrum_dword border_rgb = g_spec256_pal[ 192 + border_color * 8 + 3 ];

  int x, y;

  /* Helper macro to get screen scanline pointer aligned with Fuse scalers (+2 scanlines, +1 column) */
  #define SCANLINE_PTR(ly) ( (libspectrum_dword*)( (unsigned char*)dest_rgb + ( (ly) + 2 ) * dest_pitch ) )

  /* Fill top/bottom padding lines (-2, -1, height, height+1) with border */
  for( y = -2; y < 0; y++ ) {
    libspectrum_dword *row = SCANLINE_PTR( y );
    for( x = 0; x < width + 3; x++ ) row[x] = border_rgb;
  }
  for( y = height; y < height + 2; y++ ) {
    libspectrum_dword *row = SCANLINE_PTR( y );
    for( x = 0; x < width + 3; x++ ) row[x] = border_rgb;
  }

  /* MODE 1: Official Spec256 Handcrafted Bitplane Mode */
  if( g_spec256_mode == SPEC256_MODE_HANDCRAFTED ) {
    /* 1. Fill borders for screen scanlines 0..height-1 */
    for( y = 0; y < height; y++ ) {
      libspectrum_dword *row = SCANLINE_PTR( y );
      row[0] = border_rgb; /* left margin column -1 */
      if( y < SPEC_PAPER_Y0 || y >= SPEC_PAPER_Y0 + SPEC_PAPER_H ) {
        for( x = 1; x <= width + 1; x++ ) row[x] = border_rgb;
      } else {
        for( x = 1; x <= SPEC_PAPER_X0; x++ ) row[x] = border_rgb;
        for( x = SPEC_PAPER_X0 + SPEC_PAPER_W + 1; x <= width + 1; x++ ) row[x] = border_rgb;
      }
    }

    /* 2. Render 256x192 Paper Pixels */
    for( y = 0; y < 192; y++ ) {
      libspectrum_dword *out_row = SCANLINE_PTR( SPEC_PAPER_Y0 + y ) + 1 + SPEC_PAPER_X0;
      int x_char;
      for( x_char = 0; x_char < 32; x_char++ ) {
        uint16_t offs = vxswapb( (uint16_t)( y * 32 + x_char ) );
        int i, j;
        for( i = 0; i < 8; i++ ) {
          uint8_t b = 0;
          for( j = 0; j < 8; j++ ) {
            if( g_spec256_gfxram[j][0x4000 + offs] & ( 1 << ( 7 - i ) ) )
              b |= ( 1 << j );
          }
          uint8_t color_idx;
          if( b != 0 ) {
            color_idx = b;
          } else if( g_spec256_current_bg >= 0 && g_spec256_bg_loaded[g_spec256_current_bg] ) {
            int bg_off = ( SPEC256_BG_Y0 + y ) * SPEC256_BG_W + ( SPEC256_BG_X0 + x_char * 8 + i );
            color_idx = g_spec256_bgs[g_spec256_current_bg][bg_off];
          } else {
            color_idx = 0;
          }
          out_row[x_char * 8 + i] = g_spec256_pal[color_idx];
        }
      }
    }
    return;
  }

  /* MODE 2, 3, 4: Live 256-Colour Auto-Remaster (Any Spectrum Game) */
  {
    /* Render borders */
    for( y = 0; y < height; y++ ) {
      libspectrum_dword *row = SCANLINE_PTR( y );
      row[0] = border_rgb; /* left margin column -1 */
      if( y < SPEC_PAPER_Y0 || y >= SPEC_PAPER_Y0 + SPEC_PAPER_H ) {
        for( x = 1; x <= width + 1; x++ ) row[x] = border_rgb;
      } else {
        for( x = 1; x <= SPEC_PAPER_X0; x++ ) row[x] = border_rgb;
        for( x = SPEC_PAPER_X0 + SPEC_PAPER_W + 1; x <= width + 1; x++ ) row[x] = border_rgb;
      }
    }

    /* Extract 1-bit pixel grid + attribute grid from current Spectrum VRAM */
    static uint8_t grid[192][256];
    static uint8_t attr_grid[24][32];

    for( y = 0; y < 192; y++ ) {
      int cx;
      for( cx = 0; cx < 32; cx++ ) {
        uint16_t offs = vxswapb( (uint16_t)( y * 32 + cx ) );
        uint8_t byte_val = readbyte_internal( 0x4000 + offs );
        int b;
        for( b = 0; b < 8; b++ ) {
          grid[y][cx * 8 + b] = ( byte_val & ( 1 << ( 7 - b ) ) ) ? 1 : 0;
        }
      }
    }

    int cy, cx;
    for( cy = 0; cy < 24; cy++ ) {
      for( cx = 0; cx < 32; cx++ ) {
        attr_grid[cy][cx] = readbyte_internal( 0x5800 + cy * 32 + cx );
      }
    }

    /* Render with 8-shade ramps, edge anti-aliasing & beveling */
    for( y = 0; y < 192; y++ ) {
      cy = y >> 3;
      libspectrum_dword *out_row = SCANLINE_PTR( SPEC_PAPER_Y0 + y ) + 1 + SPEC_PAPER_X0;

      for( x = 0; x < 256; x++ ) {
        cx = x >> 3;
        uint8_t attr = attr_grid[cy][cx];
        int ink = attr & 0x07;
        int paper = ( attr >> 3 ) & 0x07;
        int bright = ( attr & 0x40 ) ? 1 : 0;
        int is_ink = grid[y][x];

        /* Count neighboring ink pixels in 3x3 kernel */
        int neighbor_count = 0;
        int dy, dx;
        for( dy = -1; dy <= 1; dy++ ) {
          int ny = y + dy;
          if( ny >= 0 && ny < 192 ) {
            for( dx = -1; dx <= 1; dx++ ) {
              int nx = x + dx;
              if( nx >= 0 && nx < 256 ) {
                if( grid[ny][nx] ) neighbor_count++;
              }
            }
          }
        }

        uint8_t color_idx;
        if( is_ink ) {
          int shade;
          if( g_spec256_mode == SPEC256_MODE_AUTO_ARCADE ) {
            /* High contrast arcade shading */
            shade = ( neighbor_count >= 6 ) ? 6 : ( ( neighbor_count >= 3 ) ? 4 : 2 );
            if( bright ) shade = min( 7, shade + 1 );
          } else if( g_spec256_mode == SPEC256_MODE_AUTO_SMOOTH ) {
            /* Smooth gradient with edge beveling */
            shade = ( neighbor_count * 7 ) / 9;
            if( shade < 1 ) shade = 1;
            if( bright && shade < 7 ) shade++;
          } else {
            /* Retro VGA 256 */
            shade = bright ? 5 : 3;
          }
          color_idx = 192 + ink * 8 + shade;
        } else {
          /* Paper pixel */
          if( paper == 0 && g_spec256_current_bg >= 0 && g_spec256_bg_loaded[g_spec256_current_bg] ) {
            /* Black paper shows the custom Spec256 background */
            int bg_off = ( SPEC256_BG_Y0 + y ) * SPEC256_BG_W + ( SPEC256_BG_X0 + x );
            color_idx = g_spec256_bgs[g_spec256_current_bg][bg_off];
          } else {
            int shade = 0;
            if( g_spec256_mode == SPEC256_MODE_AUTO_SMOOTH && neighbor_count > 0 && paper == 0 ) {
              /* Soft subtle glow near ink */
              shade = 1;
            } else if( bright ) {
              shade = 2;
            }
            color_idx = 192 + paper * 8 + shade;
          }
        }

        out_row[x] = g_spec256_pal[color_idx];
      }
    }
  }
  #undef SCANLINE_PTR
}
