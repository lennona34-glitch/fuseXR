/* quest_vr.c: Meta Quest VR & Mixed Reality WebXR Broadcast Studio for Fuse
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

#include "config.h"

#include "ui/quest_vr.h"

#include <ctype.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#include <commdlg.h>
#include <shellapi.h>
#include <wininet.h>
#else
#include <arpa/inet.h>
#include <dirent.h>
#include <errno.h>
#include <netdb.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <pthread.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>
#endif

#include "display.h"
#include "fuse.h"
#include "keyboard.h"
#include "machine.h"
#include "memory_pages.h"
#include "menu.h"
#include "peripherals/joystick.h"
#include "pokefinder/pokefinder.h"
#include "pokefinder/pokemem.h"
#include "settings.h"
#include "spectrum.h"
#include "tape.h"
#include "ui/scaler/scaler.h"
#include "ui/ui.h"
#include "uimedia.h"
#include "utils.h"

#ifdef WIN32
extern libspectrum_word
  win32display_image[ 2 * DISPLAY_SCREEN_HEIGHT ][ DISPLAY_SCREEN_WIDTH ];
#endif

/* ============================================================================
 * Fast Self-Contained Baseline JPEG Encoder (ITU-T T.81 YCbCr 4:4:4)
 * ============================================================================ */

static const uint8_t jpeg_zigzag[64] = {
   0,  1,  5,  6, 14, 15, 27, 28,
   2,  4,  7, 13, 16, 26, 29, 42,
   3,  8, 12, 17, 25, 30, 41, 43,
   9, 11, 18, 24, 31, 40, 44, 53,
  10, 19, 23, 32, 39, 45, 52, 54,
  20, 22, 33, 38, 46, 51, 55, 60,
  21, 34, 37, 47, 50, 56, 59, 61,
  35, 36, 48, 49, 57, 58, 62, 63
};

static const uint8_t std_quant_y[64] = {
  16, 11, 10, 16,  24,  40,  51,  61,
  12, 12, 14, 19,  26,  58,  60,  55,
  14, 13, 16, 24,  40,  57,  69,  56,
  14, 17, 22, 29,  51,  87,  80,  62,
  18, 22, 37, 56,  68, 109, 103,  77,
  24, 35, 55, 64,  81, 104, 113,  92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103,  99
};

static const uint8_t std_quant_c[64] = {
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99
};

static const uint8_t std_dc_lum_nrcodes[17] = { 0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0,0 };
static const uint8_t std_dc_lum_values[12]  = { 0,1,2,3,4,5,6,7,8,9,10,11 };
static const uint8_t std_dc_chr_nrcodes[17] = { 0,0,3,1,1,1,1,1,1,1,1,1,0,0,0,0,0 };
static const uint8_t std_dc_chr_values[12]  = { 0,1,2,3,4,5,6,7,8,9,10,11 };

static const uint8_t std_ac_lum_nrcodes[17] = { 0,0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,0x7d };
static const uint8_t std_ac_lum_values[162] = {
  0x01,0x02,0x03,0x00,0x04,0x11,0x05,0x12,0x21,0x31,0x41,0x06,0x13,0x51,0x61,0x07,
  0x22,0x71,0x14,0x32,0x81,0x91,0xa1,0x08,0x23,0x42,0xb1,0xc1,0x15,0x52,0xd1,0xf0,
  0x24,0x33,0x62,0x72,0x82,0x09,0x0a,0x16,0x17,0x18,0x19,0x1a,0x25,0x26,0x27,0x28,
  0x29,0x2a,0x34,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,0x49,
  0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,0x69,
  0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7a,0x83,0x84,0x85,0x86,0x87,0x88,0x89,
  0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,0xa6,0xa7,
  0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,0xc4,0xc5,
  0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,0xe1,0xe2,
  0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,0xf1,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
  0xf9,0xfa
};

static const uint8_t std_ac_chr_nrcodes[17] = { 0,0,2,1,2,4,4,3,4,7,5,4,4,0,1,2,0x77 };
static const uint8_t std_ac_chr_values[162] = {
  0x00,0x01,0x02,0x03,0x11,0x04,0x05,0x21,0x31,0x06,0x12,0x41,0x51,0x07,0x61,0x71,
  0x13,0x22,0x32,0x81,0x08,0x14,0x42,0x91,0xa1,0xb1,0xc1,0x09,0x23,0x33,0x52,0xf0,
  0x15,0x62,0x72,0xd1,0x0a,0x16,0x24,0x34,0xe1,0x25,0xf1,0x17,0x18,0x19,0x1a,0x26,
  0x27,0x28,0x29,0x2a,0x35,0x36,0x37,0x38,0x39,0x3a,0x43,0x44,0x45,0x46,0x47,0x48,
  0x49,0x4a,0x53,0x54,0x55,0x56,0x57,0x58,0x59,0x5a,0x63,0x64,0x65,0x66,0x67,0x68,
  0x69,0x6a,0x73,0x74,0x75,0x76,0x77,0x78,0x79,0x7a,0x82,0x83,0x84,0x85,0x86,0x87,
  0x88,0x89,0x8a,0x92,0x93,0x94,0x95,0x96,0x97,0x98,0x99,0x9a,0xa2,0xa3,0xa4,0xa5,
  0xa6,0xa7,0xa8,0xa9,0xaa,0xb2,0xb3,0xb4,0xb5,0xb6,0xb7,0xb8,0xb9,0xba,0xc2,0xc3,
  0xc4,0xc5,0xc6,0xc7,0xc8,0xc9,0xca,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7,0xd8,0xd9,0xda,
  0xe2,0xe3,0xe4,0xe5,0xe6,0xe7,0xe8,0xe9,0xea,0xf2,0xf3,0xf4,0xf5,0xf6,0xf7,0xf8,
  0xf9,0xfa
};

typedef struct jpeg_huff_code {
  uint16_t code;
  uint8_t len;
} jpeg_huff_code;

typedef struct jpeg_encoder_tables {
  int initialized;
  int quality;
  uint8_t quant_y[64];
  uint8_t quant_c[64];
  float fdtbl_y[64];
  float fdtbl_c[64];
  jpeg_huff_code dc_lum[12];
  jpeg_huff_code dc_chr[12];
  jpeg_huff_code ac_lum[256];
  jpeg_huff_code ac_chr[256];
} jpeg_encoder_tables;

static void
jpeg_build_huff( jpeg_huff_code *out, const uint8_t *nrcodes,
                 const uint8_t *values )
{
  int k, j, pos = 0;
  uint16_t code = 0;
  for( k = 1; k <= 16; k++ ) {
    for( j = 1; j <= nrcodes[k]; j++ ) {
      out[values[pos]].code = code;
      out[values[pos]].len = (uint8_t)k;
      pos++;
      code++;
    }
    code <<= 1;
  }
}

static void
jpeg_init_tables( jpeg_encoder_tables *t, int quality )
{
  static const float aanscale[8] = {
    1.0f, 1.387039845f, 1.306562965f, 1.175875602f,
    1.0f, 0.785694958f, 0.541196100f, 0.275899379f
  };
  int i, row, col, scale;

  if( quality < 10 ) quality = 10;
  if( quality > 98 ) quality = 98;
  if( t->initialized && t->quality == quality ) return;

  if( !t->initialized ) {
    memset( t, 0, sizeof( *t ) );
    jpeg_build_huff( t->dc_lum, std_dc_lum_nrcodes, std_dc_lum_values );
    jpeg_build_huff( t->dc_chr, std_dc_chr_nrcodes, std_dc_chr_values );
    jpeg_build_huff( t->ac_lum, std_ac_lum_nrcodes, std_ac_lum_values );
    jpeg_build_huff( t->ac_chr, std_ac_chr_nrcodes, std_ac_chr_values );
    t->initialized = 1;
  }
  t->quality = quality;

  scale = ( quality < 50 ) ? ( 5000 / quality ) : ( 200 - quality * 2 );

  for( i = 0; i < 64; i++ ) {
    int yv = ( std_quant_y[i] * scale + 50 ) / 100;
    int cv = ( std_quant_c[i] * scale + 50 ) / 100;
    if( yv < 1 ) yv = 1;
    if( yv > 255 ) yv = 255;
    if( cv < 1 ) cv = 1;
    if( cv > 255 ) cv = 255;
    t->quant_y[jpeg_zigzag[i]] = (uint8_t)yv;
    t->quant_c[jpeg_zigzag[i]] = (uint8_t)cv;
  }

  i = 0;
  for( row = 0; row < 8; row++ ) {
    for( col = 0; col < 8; col++ ) {
      float factor = 1.0f / ( aanscale[row] * aanscale[col] * 8.0f );
      t->fdtbl_y[i] = factor / (float)t->quant_y[jpeg_zigzag[i]];
      t->fdtbl_c[i] = factor / (float)t->quant_c[jpeg_zigzag[i]];
      i++;
    }
  }
}

typedef struct jpeg_bitwriter {
  uint8_t *buf;
  size_t cap;
  size_t len;
  uint32_t bitbuf;
  int bitcount;
} jpeg_bitwriter;

static inline void
bw_put_byte( jpeg_bitwriter *bw, uint8_t b )
{
  if( bw->len < bw->cap ) bw->buf[bw->len++] = b;
}

static inline void
bw_put_word( jpeg_bitwriter *bw, uint16_t w )
{
  bw_put_byte( bw, (uint8_t)( w >> 8 ) );
  bw_put_byte( bw, (uint8_t)( w & 0xff ) );
}

static inline void
bw_put_bits( jpeg_bitwriter *bw, uint16_t bits, int nbits )
{
  bw->bitbuf = ( bw->bitbuf << nbits ) | ( bits & ( ( 1U << nbits ) - 1U ) );
  bw->bitcount += nbits;
  while( bw->bitcount >= 8 ) {
    uint8_t c = (uint8_t)( bw->bitbuf >> ( bw->bitcount - 8 ) );
    bw_put_byte( bw, c );
    if( c == 0xff ) bw_put_byte( bw, 0x00 );
    bw->bitcount -= 8;
  }
}

static void
jpeg_fdct_8x8( float *data )
{
  int i;
  for( i = 0; i < 8; i++ ) {
    float *d = data + i * 8;
    float tmp0 = d[0] + d[7], tmp7 = d[0] - d[7];
    float tmp1 = d[1] + d[6], tmp6 = d[1] - d[6];
    float tmp2 = d[2] + d[5], tmp5 = d[2] - d[5];
    float tmp3 = d[3] + d[4], tmp4 = d[3] - d[4];

    float tmp10 = tmp0 + tmp3, tmp13 = tmp0 - tmp3;
    float tmp11 = tmp1 + tmp2, tmp12 = tmp1 - tmp2;

    d[0] = tmp10 + tmp11;
    d[4] = tmp10 - tmp11;

    float z1 = ( tmp12 + tmp13 ) * 0.707106781f;
    d[2] = tmp13 + z1;
    d[6] = tmp13 - z1;

    tmp10 = tmp4 + tmp5;
    tmp11 = tmp5 + tmp6;
    tmp12 = tmp6 + tmp7;

    float z5 = ( tmp10 - tmp12 ) * 0.382683433f;
    float z2 = 0.541196100f * tmp10 + z5;
    float z4 = 1.306562965f * tmp12 + z5;
    float z3 = tmp11 * 0.707106781f;

    float z11 = tmp7 + z3, z13 = tmp7 - z3;
    d[5] = z13 + z2;
    d[3] = z13 - z2;
    d[1] = z11 + z4;
    d[7] = z11 - z4;
  }

  for( i = 0; i < 8; i++ ) {
    float *d = data + i;
    float tmp0 = d[0*8] + d[7*8], tmp7 = d[0*8] - d[7*8];
    float tmp1 = d[1*8] + d[6*8], tmp6 = d[1*8] - d[6*8];
    float tmp2 = d[2*8] + d[5*8], tmp5 = d[2*8] - d[5*8];
    float tmp3 = d[3*8] + d[4*8], tmp4 = d[3*8] - d[4*8];

    float tmp10 = tmp0 + tmp3, tmp13 = tmp0 - tmp3;
    float tmp11 = tmp1 + tmp2, tmp12 = tmp1 - tmp2;

    d[0*8] = tmp10 + tmp11;
    d[4*8] = tmp10 - tmp11;

    float z1 = ( tmp12 + tmp13 ) * 0.707106781f;
    d[2*8] = tmp13 + z1;
    d[6*8] = tmp13 - z1;

    tmp10 = tmp4 + tmp5;
    tmp11 = tmp5 + tmp6;
    tmp12 = tmp6 + tmp7;

    float z5 = ( tmp10 - tmp12 ) * 0.382683433f;
    float z2 = 0.541196100f * tmp10 + z5;
    float z4 = 1.306562965f * tmp12 + z5;
    float z3 = tmp11 * 0.707106781f;

    float z11 = tmp7 + z3, z13 = tmp7 - z3;
    d[5*8] = z13 + z2;
    d[3*8] = z13 - z2;
    d[1*8] = z11 + z4;
    d[7*8] = z11 - z4;
  }
}

static inline void
jpeg_calc_bits( int val, uint16_t *bits, int *nbits )
{
  int a = ( val < 0 ) ? -val : val;
  int n = 0;
  while( a ) {
    a >>= 1;
    n++;
  }
  *nbits = n;
  *bits = (uint16_t)( ( val < 0 ) ? ( val + ( ( 1 << n ) - 1 ) ) : val );
}

static int
jpeg_encode_du( jpeg_bitwriter *bw, float *block, const float *fdtbl,
                int prev_dc, const jpeg_huff_code *ht_dc,
                const jpeg_huff_code *ht_ac )
{
  int du[64];
  int i, end0pos, startpos, nrzeroes;
  int diff;
  uint16_t bits;
  int nbits;

  jpeg_fdct_8x8( block );

  for( i = 0; i < 64; i++ ) {
    float v = block[i] * fdtbl[i];
    du[jpeg_zigzag[i]] = (int)( ( v >= 0.0f ) ? ( v + 0.5f ) : ( v - 0.5f ) );
  }

  diff = du[0] - prev_dc;
  if( diff == 0 ) {
    bw_put_bits( bw, ht_dc[0].code, ht_dc[0].len );
  } else {
    jpeg_calc_bits( diff, &bits, &nbits );
    bw_put_bits( bw, ht_dc[nbits].code, ht_dc[nbits].len );
    bw_put_bits( bw, bits, nbits );
  }

  end0pos = 63;
  while( end0pos > 0 && du[end0pos] == 0 ) end0pos--;

  if( end0pos == 0 ) {
    bw_put_bits( bw, ht_ac[0x00].code, ht_ac[0x00].len );
    return du[0];
  }

  i = 1;
  while( i <= end0pos ) {
    startpos = i;
    while( i <= end0pos && du[i] == 0 ) i++;
    nrzeroes = i - startpos;
    if( nrzeroes >= 16 ) {
      int n16 = nrzeroes >> 4;
      int k;
      for( k = 0; k < n16; k++ )
        bw_put_bits( bw, ht_ac[0xf0].code, ht_ac[0xf0].len );
      nrzeroes &= 0x0f;
    }
    jpeg_calc_bits( du[i], &bits, &nbits );
    bw_put_bits( bw, ht_ac[( nrzeroes << 4 ) | nbits].code,
                 ht_ac[( nrzeroes << 4 ) | nbits].len );
    bw_put_bits( bw, bits, nbits );
    i++;
  }

  if( end0pos != 63 )
    bw_put_bits( bw, ht_ac[0x00].code, ht_ac[0x00].len );

  return du[0];
}

static size_t
quest_vr_encode_jpeg_rgb24( const uint8_t *rgb, int width, int height,
                            int quality, uint8_t *out_buf, size_t out_cap )
{
  static jpeg_encoder_tables tables;
  jpeg_bitwriter bw;
  int x, y, bx, by, i;
  int dc_y = 0, dc_cb = 0, dc_cr = 0;
  float y_du[64], cb_du[64], cr_du[64];

  if( !rgb || width <= 0 || height <= 0 || !out_buf || out_cap < 1024 )
    return 0;

  jpeg_init_tables( &tables, quality );

  bw.buf = out_buf;
  bw.cap = out_cap;
  bw.len = 0;
  bw.bitbuf = 0;
  bw.bitcount = 0;

  /* SOI */
  bw_put_word( &bw, 0xffd8 );

  /* APP0 JFIF */
  bw_put_word( &bw, 0xffe0 );
  bw_put_word( &bw, 16 );
  bw_put_byte( &bw, 'J' ); bw_put_byte( &bw, 'F' );
  bw_put_byte( &bw, 'I' ); bw_put_byte( &bw, 'F' ); bw_put_byte( &bw, 0 );
  bw_put_word( &bw, 0x0101 );
  bw_put_byte( &bw, 0 );
  bw_put_word( &bw, 1 );
  bw_put_word( &bw, 1 );
  bw_put_byte( &bw, 0 );
  bw_put_byte( &bw, 0 );

  /* DQT */
  bw_put_word( &bw, 0xffdb );
  bw_put_word( &bw, 132 );
  bw_put_byte( &bw, 0 );
  for( i = 0; i < 64; i++ ) bw_put_byte( &bw, tables.quant_y[i] );
  bw_put_byte( &bw, 1 );
  for( i = 0; i < 64; i++ ) bw_put_byte( &bw, tables.quant_c[i] );

  /* SOF0 (Baseline DCT, YCbCr 4:4:4 for crisp ZX Spectrum pixel edges) */
  bw_put_word( &bw, 0xffc0 );
  bw_put_word( &bw, 17 );
  bw_put_byte( &bw, 8 );
  bw_put_word( &bw, (uint16_t)height );
  bw_put_word( &bw, (uint16_t)width );
  bw_put_byte( &bw, 3 );
  bw_put_byte( &bw, 1 ); bw_put_byte( &bw, 0x11 ); bw_put_byte( &bw, 0 );
  bw_put_byte( &bw, 2 ); bw_put_byte( &bw, 0x11 ); bw_put_byte( &bw, 1 );
  bw_put_byte( &bw, 3 ); bw_put_byte( &bw, 0x11 ); bw_put_byte( &bw, 1 );

  /* DHT */
  bw_put_word( &bw, 0xffc4 );
  bw_put_word( &bw, 418 );
  bw_put_byte( &bw, 0x00 );
  for( i = 1; i <= 16; i++ ) bw_put_byte( &bw, std_dc_lum_nrcodes[i] );
  for( i = 0; i < 12; i++ )  bw_put_byte( &bw, std_dc_lum_values[i] );
  bw_put_byte( &bw, 0x10 );
  for( i = 1; i <= 16; i++ ) bw_put_byte( &bw, std_ac_lum_nrcodes[i] );
  for( i = 0; i < 162; i++ ) bw_put_byte( &bw, std_ac_lum_values[i] );
  bw_put_byte( &bw, 0x01 );
  for( i = 1; i <= 16; i++ ) bw_put_byte( &bw, std_dc_chr_nrcodes[i] );
  for( i = 0; i < 12; i++ )  bw_put_byte( &bw, std_dc_chr_values[i] );
  bw_put_byte( &bw, 0x11 );
  for( i = 1; i <= 16; i++ ) bw_put_byte( &bw, std_ac_chr_nrcodes[i] );
  for( i = 0; i < 162; i++ ) bw_put_byte( &bw, std_ac_chr_values[i] );

  /* SOS */
  bw_put_word( &bw, 0xffda );
  bw_put_word( &bw, 12 );
  bw_put_byte( &bw, 3 );
  bw_put_byte( &bw, 1 ); bw_put_byte( &bw, 0x00 );
  bw_put_byte( &bw, 2 ); bw_put_byte( &bw, 0x11 );
  bw_put_byte( &bw, 3 ); bw_put_byte( &bw, 0x11 );
  bw_put_byte( &bw, 0 );
  bw_put_byte( &bw, 63 );
  bw_put_byte( &bw, 0 );

  for( y = 0; y < height; y += 8 ) {
    for( x = 0; x < width; x += 8 ) {
      int pos = 0;
      for( by = 0; by < 8; by++ ) {
        int sy = ( y + by < height ) ? ( y + by ) : ( height - 1 );
        const uint8_t *row_ptr = rgb + (size_t)sy * (size_t)width * 3;
        for( bx = 0; bx < 8; bx++ ) {
          int sx = ( x + bx < width ) ? ( x + bx ) : ( width - 1 );
          const uint8_t *px = row_ptr + sx * 3;
          float r = (float)px[0];
          float g = (float)px[1];
          float b = (float)px[2];
          y_du[pos]  =  0.29900f * r + 0.58700f * g + 0.11400f * b - 128.0f;
          cb_du[pos] = -0.16874f * r - 0.33126f * g + 0.50000f * b;
          cr_du[pos] =  0.50000f * r - 0.41869f * g - 0.08131f * b;
          pos++;
        }
      }
      dc_y  = jpeg_encode_du( &bw, y_du,  tables.fdtbl_y, dc_y,
                              tables.dc_lum, tables.ac_lum );
      dc_cb = jpeg_encode_du( &bw, cb_du, tables.fdtbl_c, dc_cb,
                              tables.dc_chr, tables.ac_chr );
      dc_cr = jpeg_encode_du( &bw, cr_du, tables.fdtbl_c, dc_cr,
                              tables.dc_chr, tables.ac_chr );
    }
  }

  if( bw.bitcount > 0 ) {
    int pad = 8 - bw.bitcount;
    bw_put_bits( &bw, (uint16_t)( ( 1U << pad ) - 1U ), pad );
  }

  /* EOI */
  bw_put_word( &bw, 0xffd9 );

  return bw.len;
}

/* ============================================================================
 * Embedded Fallback HTML5 Studio (Matches quest-spectrum-xr UI + Easy Cheat + Archives)
 * ============================================================================ */

static const char quest_vr_studio_html[] =
"<!DOCTYPE html>\n"
"<html lang='en'>\n"
"<head>\n"
"<meta charset='utf-8'>\n"
"<meta name='viewport' content='width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no'>\n"
"<title>ZX Spectrum XR â€” Meta Quest 3 Mixed Reality &amp; Fuse Broadcast Studio</title>\n"
"<style>\n"
"*{box-sizing:border-box;margin:0;padding:0;user-select:none}\n"
"html,body{width:100%;height:100%;background:#0a0b10;color:#fff;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden}\n"
"#pc-studio{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:8px 14px;gap:8px;z-index:10}\n"
".bar{display:flex;align-items:center;justify-content:space-between;background:rgba(14,16,24,0.92);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:6px 14px;gap:8px;flex-wrap:wrap}\n"
".brand{display:flex;align-items:center;gap:8px;font-weight:900;font-size:14px;letter-spacing:0.6px}\n"
".rainbow{background:linear-gradient(90deg,#ff003c 0%,#ff003c 25%,#ffea00 25%,#ffea00 50%,#00ff66 50%,#00ff66 75%,#00d2ff 75%,#00d2ff 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900;font-size:18px}\n"
".badge-128{background:linear-gradient(135deg,#00d2ff,#0077ff);padding:3px 8px;border-radius:5px;font-size:11px;font-weight:800}\n"
"button,select,input{background:#191c28;color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:7px;padding:6px 11px;font-size:12.5px;font-weight:700;cursor:pointer}\n"
"button:hover{border-color:#00d2ff;background:#222638}\n"
".btn-random{background:rgba(16,185,129,0.22);border-color:#34d399;color:#a7f3d0}\n"
".btn-cheat{background:rgba(168,85,247,0.24);border-color:#c084fc;color:#e9d5ff}\n"
".btn-arch{background:rgba(0,210,255,0.2);border-color:#38bdf8;color:#7dd3fc}\n"
".btn-reset{background:rgba(255,59,48,0.18);border-color:rgba(255,59,48,0.45);color:#ff6b6b}\n"
"#stage{flex:1;display:flex;align-items:center;justify-content:center;min-height:0}\n"
"#bezel{height:100%;aspect-ratio:4/3;max-width:100%;background:#000;border-radius:16px;padding:6px;border:2px solid rgba(0,210,255,0.35);box-shadow:0 16px 48px rgba(0,0,0,0.85);position:relative;display:flex;align-items:center;justify-content:center}\n"
"#streamImg{width:100%;height:100%;object-fit:contain;image-rendering:pixelated;border-radius:10px}\n"
".modal{position:fixed;inset:0;background:rgba(5,7,12,0.86);backdrop-filter:blur(10px);z-index:100;display:none;align-items:center;justify-content:center;padding:20px}\n"
".modal.open{display:flex}\n"
".card{width:100%;max-width:860px;max-height:86vh;background:#11131c;border:1px solid rgba(0,210,255,0.35);border-radius:16px;display:flex;flex-direction:column;overflow:hidden}\n"
".card-hdr{display:flex;justify-content:space-between;align-items:center;padding:12px 18px;background:#161924;border-bottom:1px solid rgba(255,255,255,0.08);font-weight:800}\n"
".card-body{padding:14px 18px;overflow-y:auto;display:flex;flex-direction:column;gap:10px}\n"
".row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\n"
".item{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#181b28;border:1px solid rgba(255,255,255,0.07);border-radius:8px}\n"
"</style>\n"
"</head>\n"
"<body>\n"
"<div id='pc-studio'>\n"
"  <div class='bar'>\n"
"    <div class='brand'><span class='rainbow'>///</span> SINCLAIR <span style='color:#00d2ff'>ZX SPECTRUM XR</span></div>\n"
"    <div class='row'>\n"
"      <select id='selMachine'><option value='Spectrum128K'>ZX Spectrum 128K (Toastrack)</option><option value='Spectrum48K'>ZX Spectrum 48K</option><option value='SpectrumPlus2'>ZX Spectrum +2</option><option value='SpectrumPlus3'>ZX Spectrum +3</option><option value='Pentagon128'>Pentagon 128K</option></select>\n"
"      <span class='badge-128' id='machBadge'>128K PAL</span>\n"
"      <button class='btn-random' id='btnRandom'>ðŸŽ² Random</button>\n"
"      <button class='btn-cheat' id='btnCheats'>ðŸ§¬ Easy Cheat</button>\n"
"      <button class='btn-arch' id='btnArchives'>ðŸ“š Archives (29k)</button>\n"
"    </div>\n"
"  </div>\n"
"  <div id='stage'><div id='bezel'><img id='streamImg' src='/stream.mjpg' alt='ZX Spectrum Stream'></div></div>\n"
"  <div class='bar'>\n"
"    <div class='row'>\n"
"      <span>ðŸŽ® Game: <b id='lblGame' style='color:#38bdf8'>Fuse Live Core</b></span>\n"
"      <button onclick=\"fetch('/api/control?action=tape_play')\">Play/Stop Tape</button>\n"
"      <button onclick=\"fetch('/api/control?action=tape_rewind')\">Rewind</button>\n"
"      <button onclick=\"fetch('/input?key=load&action=tap')\">LOAD &quot;&quot;</button>\n"
"    </div>\n"
"    <div class='row'>\n"
"      <span id='lblFps' class='badge-128'>50 FPS</span>\n"
"      <button class='btn-reset' onclick=\"fetch('/api/control?action=reset')\">âš¡ Reset Speccy</button>\n"
"    </div>\n"
"  </div>\n"
"</div>\n"
"<div class='modal' id='cheatModal'>\n"
"  <div class='card'>\n"
"    <div class='card-hdr'><span>ðŸ§¬ Fuse Easy Cheat &amp; Pokefinder Studio</span><button onclick=\"document.getElementById('cheatModal').classList.remove('open')\">âœ•</button></div>\n"
"    <div class='card-body'>\n"
"      <div class='row'>\n"
"        <input id='pokeAddr' placeholder='Address (16384-65535)' style='width:180px'>\n"
"        <input id='pokeVal' placeholder='Value (0-255)' style='width:130px'>\n"
"        <button class='btn-random' onclick='applyPoke()'>âš¡ Apply POKE</button>\n"
"        <button onclick='clearCheats()'>â†©ï¸ Restore All RAM</button>\n"
"      </div>\n"
"      <div class='row'>\n"
"        <input id='pfVal' placeholder='Exact Lives / Value' style='width:160px'>\n"
"        <button onclick=\"pfAct('pf_search')\">ðŸ” Search Value</button>\n"
"        <button onclick=\"pfAct('pf_dec')\">ðŸ“‰ Decreased (-1)</button>\n"
"        <button onclick=\"pfAct('pf_inc')\">ðŸ“ˆ Increased (+1)</button>\n"
"        <button onclick=\"pfAct('pf_reset')\">ðŸ”„ Reset Finder</button>\n"
"      </div>\n"
"      <div id='cheatList'></div>\n"
"    </div>\n"
"  </div>\n"
"</div>\n"
"<div class='modal' id='archModal'>\n"
"  <div class='card'>\n"
"    <div class='card-hdr'><span>ðŸ“š Legitimate ZX Spectrum Archives (Internet Archive + ZXDB + Bundled)</span><button onclick=\"document.getElementById('archModal').classList.remove('open')\">âœ•</button></div>\n"
"    <div class='card-body'>\n"
"      <div class='row'>\n"
"        <input id='archQuery' placeholder='Search Internet Archive (12,300+) or ZXDB (29,000+)...' style='flex:1'>\n"
"        <button class='btn-arch' onclick='searchIA()'>ðŸŒ Internet Archive</button>\n"
"        <button class='btn-cheat' onclick='searchZXDB()'>ðŸ›ï¸ ZXDB</button>\n"
"        <button class='btn-random' onclick='searchLocal()'>âš¡ Local Games</button>\n"
"      </div>\n"
"      <div id='archList'></div>\n"
"    </div>\n"
"  </div>\n"
"</div>\n"
"<script>\n"
"const stereoModeInit = %d;\n"
"document.getElementById('selMachine').onchange = (e) => fetch('/api/control?action=machine&id=' + e.target.value);\n"
"document.getElementById('btnCheats').onclick = () => { document.getElementById('cheatModal').classList.add('open'); refreshCheats(); };\n"
"document.getElementById('btnArchives').onclick = () => { document.getElementById('archModal').classList.add('open'); searchLocal(); };\n"
"document.getElementById('btnRandom').onclick = async () => {\n"
"  const r = await fetch('/api/tosec/search?q=').then(x=>x.json());\n"
"  if (r.results && r.results.length) {\n"
"    const g = r.results[Math.floor(Math.random()*r.results.length)];\n"
"    fetch('/api/control?action=load_local&file=' + encodeURIComponent(g.name));\n"
"    document.getElementById('lblGame').textContent = g.title;\n"
"  }\n"
"};\n"
"async function refreshCheats() {\n"
"  const d = await fetch('/api/cheats').then(r=>r.json());\n"
"  const el = document.getElementById('cheatList');\n"
"  let h = '<div><b>Pokefinder Matches:</b> ' + d.pokefinder_count + '</div>';\n"
"  (d.trainers||[]).forEach((t,i) => {\n"
"    h += `<div class='item'><span>${t.name}</span><button onclick=\"fetch('/api/cheats/action?action=toggle_trainer&index=${i}&active=${t.active?0:1}').then(refreshCheats)\">${t.active?'ON':'OFF'}</button></div>`;\n"
"  });\n"
"  (d.custom_pokes||[]).forEach(p => {\n"
"    h += `<div class='item'><span>POKE ${p.address}, ${p.value} (orig ${p.orig})</span><button onclick=\"fetch('/api/cheats/action?action=restore_poke&bank=${p.bank}&addr=${p.address}').then(refreshCheats)\">Restore</button></div>`;\n"
"  });\n"
"  (d.pokefinder_candidates||[]).forEach(c => {\n"
"    h += `<div class='item'><span>Bank ${c.bank} Addr ${c.address} (Val: ${c.value})</span><button onclick=\"fetch('/api/cheats/action?action=poke&bank=${c.bank}&addr=${c.address}&val=99').then(refreshCheats)\">POKE 99</button></div>`;\n"
"  });\n"
"  el.innerHTML = h;\n"
"}\n"
"function applyPoke() {\n"
"  const a = document.getElementById('pokeAddr').value, v = document.getElementById('pokeVal').value;\n"
"  fetch(`/api/cheats/action?action=poke&bank=8&addr=${a}&val=${v}`).then(refreshCheats);\n"
"}\n"
"function clearCheats() { fetch('/api/cheats/action?action=clear_all').then(refreshCheats); }\n"
"function pfAct(act) {\n"
"  const v = document.getElementById('pfVal').value || 0;\n"
"  fetch(`/api/cheats/action?action=${act}&val=${v}`).then(() => setTimeout(refreshCheats, 60));\n"
"}\n"
"async function searchLocal() {\n"
"  const q = document.getElementById('archQuery').value;\n"
"  const d = await fetch('/api/tosec/search?q=' + encodeURIComponent(q)).then(r=>r.json());\n"
"  const el = document.getElementById('archList');\n"
"  el.innerHTML = (d.results||[]).map(g => `<div class='item'><span><b>${g.title}</b> (${g.ext})</span><button class='btn-random' onclick=\"fetch('/api/control?action=load_local&file=${encodeURIComponent(g.name)}')\">â–¶ Play Now</button></div>`).join('');\n"
"}\n"
"async function searchIA() {\n"
"  const q = document.getElementById('archQuery').value || 'Saboteur';\n"
"  const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent('collection:(softwarelibrary_zx_spectrum) AND title:('+q+')')}&fl[]=identifier,title,year&rows=20&output=json`;\n"
"  const d = await fetch(u).then(r=>r.json());\n"
"  const docs = (d.response && d.response.docs) || [];\n"
"  document.getElementById('archList').innerHTML = docs.map(x => `<div class='item'><span><b>${x.title}</b> (${x.year||'198x'})</span><a href='https://archive.org/details/${x.identifier}' target='_blank' style='color:#38bdf8'>Open Archive.org â†—</a></div>`).join('');\n"
"}\n"
"async function searchZXDB() {\n"
"  const q = document.getElementById('archQuery').value || 'Renegade';\n"
"  const d = await fetch(`https://api.zxinfo.dk/v3/search?query=${encodeURIComponent(q)}&mode=tiny&size=20&offset=0&sort=rel_desc`, {headers:{Accept:'application/json'}}).then(r=>r.json());\n"
"  const hits = (d.hits && d.hits.hits) || [];\n"
"  document.getElementById('archList').innerHTML = hits.map(h => `<div class='item'><span><b>${h._source.title}</b> (${h._source.originalYearOfRelease||'198x'})</span><a href='https://spectrumcomputing.co.uk/entry/${h._id}' target='_blank' style='color:#c084fc'>Open ZXDB â†—</a></div>`).join('');\n"
"}\n"
"</script>\n"
"</body>\n"
"</html>\n";

/* ============================================================================
 * Server State, Custom POKE Table & Main-Thread Command Queue
 * ============================================================================ */

#ifdef WIN32
typedef SOCKET qvr_socket_t;
#define QVR_INVALID_SOCKET INVALID_SOCKET
#define qvr_closesocket(s) closesocket(s)
#else
typedef int qvr_socket_t;
#define QVR_INVALID_SOCKET (-1)
#define qvr_closesocket(s) close(s)
#endif

typedef enum qvr_cmd_type {
  QVR_CMD_NONE = 0,
  QVR_CMD_OPEN_FILE,
  QVR_CMD_LOAD_POK,
  QVR_CMD_MACHINE,
  QVR_CMD_RESET,
  QVR_CMD_TAPE_PLAY,
  QVR_CMD_TAPE_REWIND,
  QVR_CMD_TAPE_EJECT,
  QVR_CMD_POKE,
  QVR_CMD_RESTORE_POKE,
  QVR_CMD_CLEAR_CHEATS,
  QVR_CMD_TOGGLE_TRAINER,
  QVR_CMD_PF_SEARCH,
  QVR_CMD_PF_INC,
  QVR_CMD_PF_DEC,
  QVR_CMD_PF_RESET
} qvr_cmd_type;

typedef struct qvr_cmd_t {
  qvr_cmd_type type;
  int arg1;
  int arg2;
  int arg3;
  char str_arg[512];
} qvr_cmd_t;

typedef struct qvr_custom_poke_t {
  int active;
  int bank;
  int address;
  int value;
  int orig;
} qvr_custom_poke_t;

#define QVR_MAX_CMDS 64
#define QVR_MAX_CUSTOM_POKES 128

static struct {
  int initialized;
  volatile int running;
  int port;
  int target_fps;
  int jpeg_quality;
  quest_vr_stereo_mode stereo_mode;

  qvr_socket_t listen_sock;
#ifdef WIN32
  HANDLE server_thread;
  HANDLE encoder_thread;
  CRITICAL_SECTION frame_lock;
  CRITICAL_SECTION raw_lock;
  CRITICAL_SECTION cmd_lock;
#else
  pthread_t server_thread;
  pthread_t encoder_thread;
  pthread_mutex_t frame_lock;
  pthread_mutex_t raw_lock;
  pthread_mutex_t cmd_lock;
#endif

  /* Raw RGB24 staging buffer populated by uidisplay submit hooks */
  uint8_t *raw_rgb;
  size_t raw_cap;
  int raw_width;
  int raw_height;
  volatile int raw_dirty;
  uint64_t last_submit_ms;

  /* Encoded JPEG buffer served to HTTP / WebXR clients */
  uint8_t *jpeg_buf;
  size_t jpeg_cap;
  size_t jpeg_len;
  int frame_width;
  int frame_height;
  volatile unsigned long frame_seq;
  volatile int active_clients;
  float measured_fps;

  /* Auto-release timers for remote key taps */
  int tap_key_active;
  keyboard_key_name tap_key;
  keyboard_key_name tap_key2;
  uint64_t tap_release_ms;
  int load_macro_step;
  uint64_t load_macro_next_ms;

  /* Queued commands for Fuse main thread */
  qvr_cmd_t cmd_queue[QVR_MAX_CMDS];
  int cmd_head;
  int cmd_tail;

  /* Active custom POKEs with original byte backup */
  qvr_custom_poke_t custom_pokes[QVR_MAX_CUSTOM_POKES];
  int custom_poke_count;

  /* Base directory of fuse.exe for resolving webxr/, games/, roms/ */
  char base_dir[512];

  char url_buf[128];
  char detail_buf[64];
} g_qvr = {
  0, 0, 8765, 50, 82, QUEST_VR_MODE_2D,
  QVR_INVALID_SOCKET
};

static uint64_t
qvr_now_ms( void )
{
#ifdef WIN32
  return (uint64_t)GetTickCount64();
#else
  struct timeval tv;
  gettimeofday( &tv, NULL );
  return (uint64_t)tv.tv_sec * 1000ULL + (uint64_t)( tv.tv_usec / 1000 );
#endif
}

static void
qvr_sleep_ms( int ms )
{
#ifdef WIN32
  Sleep( (DWORD)ms );
#else
  usleep( (useconds_t)( ms * 1000 ) );
#endif
}

static void
qvr_lock_frame( void )
{
#ifdef WIN32
  EnterCriticalSection( &g_qvr.frame_lock );
#else
  pthread_mutex_lock( &g_qvr.frame_lock );
#endif
}

static void
qvr_unlock_frame( void )
{
#ifdef WIN32
  LeaveCriticalSection( &g_qvr.frame_lock );
#else
  pthread_mutex_unlock( &g_qvr.frame_lock );
#endif
}

static void
qvr_lock_raw( void )
{
#ifdef WIN32
  EnterCriticalSection( &g_qvr.raw_lock );
#else
  pthread_mutex_lock( &g_qvr.raw_lock );
#endif
}

static void
qvr_unlock_raw( void )
{
#ifdef WIN32
  LeaveCriticalSection( &g_qvr.raw_lock );
#else
  pthread_mutex_unlock( &g_qvr.raw_lock );
#endif
}

static void
qvr_lock_cmd( void )
{
#ifdef WIN32
  EnterCriticalSection( &g_qvr.cmd_lock );
#else
  pthread_mutex_lock( &g_qvr.cmd_lock );
#endif
}

static void
qvr_unlock_cmd( void )
{
#ifdef WIN32
  LeaveCriticalSection( &g_qvr.cmd_lock );
#else
  pthread_mutex_unlock( &g_qvr.cmd_lock );
#endif
}

static void
qvr_enqueue_cmd( qvr_cmd_type type, int a1, int a2, int a3, const char *s )
{
  qvr_lock_cmd();
  int next = ( g_qvr.cmd_tail + 1 ) % QVR_MAX_CMDS;
  if( next != g_qvr.cmd_head ) {
    qvr_cmd_t *c = &g_qvr.cmd_queue[g_qvr.cmd_tail];
    c->type = type;
    c->arg1 = a1;
    c->arg2 = a2;
    c->arg3 = a3;
    if( s ) {
      snprintf( c->str_arg, sizeof( c->str_arg ), "%s", s );
    } else {
      c->str_arg[0] = '\0';
    }
    g_qvr.cmd_tail = next;
  }
  qvr_unlock_cmd();
}

static uint8_t
qvr_read_mem_byte( int bank, int address )
{
  if( bank >= 0 && bank <= 7 ) {
    return RAM[bank][address & 0x3fff];
  }
  return readbyte_internal( (libspectrum_word)( address & 0xffff ) );
}

static void
qvr_write_mem_byte( int bank, int address, uint8_t val )
{
  if( bank >= 0 && bank <= 7 ) {
    RAM[bank][address & 0x3fff] = val;
  } else {
    writebyte_internal( (libspectrum_word)( address & 0xffff ), val );
  }
}

/* Poll and execute queued WebXR / Easy Cheat / Archive commands on Fuse's main thread */
void
quest_vr_poll_events( void )
{
  if( !g_qvr.initialized || !g_qvr.running ) return;

  while( 1 ) {
    qvr_cmd_t cmd;
    int has_cmd = 0;

    qvr_lock_cmd();
    if( g_qvr.cmd_head != g_qvr.cmd_tail ) {
      cmd = g_qvr.cmd_queue[g_qvr.cmd_head];
      g_qvr.cmd_head = ( g_qvr.cmd_head + 1 ) % QVR_MAX_CMDS;
      has_cmd = 1;
    }
    qvr_unlock_cmd();

    if( !has_cmd ) break;

    switch( cmd.type ) {
    case QVR_CMD_OPEN_FILE:
      if( cmd.str_arg[0] ) {
        settings_current.joy_prompt = 0;
        settings_current.confirm_actions = 0;
        settings_current.auto_load = 1;
        settings_current.detect_loader = 1;
        settings_current.fastload = 1;
        settings_current.accelerate_loader = 1;
        utils_open_file( cmd.str_arg, 1, NULL );
        pokemem_autoload_pokfile();
        display_refresh_all();
      }
      break;

    case QVR_CMD_LOAD_POK:
      if( cmd.str_arg[0] ) {
        pokemem_read_from_file( cmd.str_arg );
      }
      break;

    case QVR_CMD_MACHINE:
      if( cmd.str_arg[0] ) {
        const char *id = cmd.str_arg;
        if( !strcmp( id, "Spectrum48K" ) )       id = "48";
        else if( !strcmp( id, "Spectrum128K" ) ) id = "128";
        else if( !strcmp( id, "SpectrumPlus2" ) ) id = "plus2";
        else if( !strcmp( id, "SpectrumPlus3" ) ) id = "plus3";
        else if( !strcmp( id, "Pentagon128" ) )  id = "pentagon";
        machine_select_id( id );
        display_refresh_all();
      }
      break;

    case QVR_CMD_RESET:
      machine_reset( 0 );
      display_refresh_all();
      break;

    case QVR_CMD_TAPE_PLAY:
      tape_toggle_play( 0 );
      break;

    case QVR_CMD_TAPE_REWIND:
      tape_rewind();
      break;

    case QVR_CMD_TAPE_EJECT:
      tape_close();
      break;

    case QVR_CMD_POKE: {
      int bank = cmd.arg1;
      int addr = cmd.arg2 & 0xffff;
      int val  = cmd.arg3 & 0xff;
      int i, found = -1;
      uint8_t orig = qvr_read_mem_byte( bank, addr );

      qvr_lock_cmd();
      for( i = 0; i < g_qvr.custom_poke_count; i++ ) {
        if( g_qvr.custom_pokes[i].active &&
            g_qvr.custom_pokes[i].bank == bank &&
            g_qvr.custom_pokes[i].address == addr ) {
          found = i;
          break;
        }
      }
      if( found >= 0 ) {
        g_qvr.custom_pokes[found].value = val;
      } else if( g_qvr.custom_poke_count < QVR_MAX_CUSTOM_POKES ) {
        qvr_custom_poke_t *p = &g_qvr.custom_pokes[g_qvr.custom_poke_count++];
        p->active = 1;
        p->bank = bank;
        p->address = addr;
        p->value = val;
        p->orig = orig;
      }
      qvr_unlock_cmd();

      qvr_write_mem_byte( bank, addr, (uint8_t)val );
      display_refresh_all();
      break;
    }

    case QVR_CMD_RESTORE_POKE: {
      int bank = cmd.arg1;
      int addr = cmd.arg2 & 0xffff;
      int i;
      qvr_lock_cmd();
      for( i = 0; i < g_qvr.custom_poke_count; i++ ) {
        if( g_qvr.custom_pokes[i].active &&
            g_qvr.custom_pokes[i].bank == bank &&
            g_qvr.custom_pokes[i].address == addr ) {
          qvr_write_mem_byte( bank, addr, (uint8_t)g_qvr.custom_pokes[i].orig );
          g_qvr.custom_pokes[i].active = 0;
        }
      }
      qvr_unlock_cmd();
      display_refresh_all();
      break;
    }

    case QVR_CMD_CLEAR_CHEATS: {
      int i;
      GSList *item;
      qvr_lock_cmd();
      for( i = 0; i < g_qvr.custom_poke_count; i++ ) {
        if( g_qvr.custom_pokes[i].active ) {
          qvr_write_mem_byte( g_qvr.custom_pokes[i].bank,
                              g_qvr.custom_pokes[i].address,
                              (uint8_t)g_qvr.custom_pokes[i].orig );
          g_qvr.custom_pokes[i].active = 0;
        }
      }
      g_qvr.custom_poke_count = 0;
      qvr_unlock_cmd();

      for( item = trainer_list; item; item = item->next ) {
        trainer_t *tr = (trainer_t *)item->data;
        if( tr && tr->active ) {
          pokemem_trainer_deactivate( tr );
        }
      }
      display_refresh_all();
      break;
    }

    case QVR_CMD_TOGGLE_TRAINER: {
      int idx = cmd.arg1;
      int want_active = cmd.arg2;
      if( trainer_list && idx >= 0 ) {
        GSList *node = g_slist_nth( trainer_list, (guint)idx );
        trainer_t *tr = node ? (trainer_t *)node->data : NULL;
        if( tr ) {
          if( want_active ) pokemem_trainer_activate( tr );
          else              pokemem_trainer_deactivate( tr );
          display_refresh_all();
        }
      }
      break;
    }

    case QVR_CMD_PF_SEARCH:
      if( !pokefinder_is_allocated() || pokefinder_count == 0 ) {
        pokefinder_clear();
      }
      pokefinder_search( (libspectrum_byte)( cmd.arg1 & 0xff ) );
      break;

    case QVR_CMD_PF_INC:
      if( !pokefinder_is_allocated() ) pokefinder_clear();
      pokefinder_incremented();
      break;

    case QVR_CMD_PF_DEC:
      if( !pokefinder_is_allocated() ) pokefinder_clear();
      pokefinder_decremented();
      break;

    case QVR_CMD_PF_RESET:
      pokefinder_clear();
      break;

    default:
      break;
    }
  }
}

static void
qvr_detect_lan_ip( char *out, size_t out_len )
{
  qvr_socket_t s;
  struct sockaddr_in remote_addr, local_addr;
#ifdef WIN32
  int addr_len = sizeof( local_addr );
#else
  socklen_t addr_len = sizeof( local_addr );
#endif

  snprintf( out, out_len, "127.0.0.1" );

  s = socket( AF_INET, SOCK_DGRAM, IPPROTO_UDP );
  if( s == QVR_INVALID_SOCKET ) return;

  memset( &remote_addr, 0, sizeof( remote_addr ) );
  remote_addr.sin_family = AF_INET;
  remote_addr.sin_port = htons( 53 );
  remote_addr.sin_addr.s_addr = inet_addr( "8.8.8.8" );

  if( connect( s, (struct sockaddr *)&remote_addr, sizeof( remote_addr ) ) == 0 &&
      getsockname( s, (struct sockaddr *)&local_addr, &addr_len ) == 0 ) {
    const char *ip = inet_ntoa( local_addr.sin_addr );
    if( ip && ip[0] && strcmp( ip, "0.0.0.0" ) != 0 ) {
      snprintf( out, out_len, "%s", ip );
    }
  }
  qvr_closesocket( s );
}

static void
qvr_generate_standby_frame( void )
{
  const int w = 320, h = 240;
  size_t need = (size_t)w * (size_t)h * 3;
  uint8_t *rgb = (uint8_t *)malloc( need );
  int x, y;
  if( !rgb ) return;

  for( y = 0; y < h; y++ ) {
    for( x = 0; x < w; x++ ) {
      uint8_t r = 216, g = 216, b = 216;
      int diag = ( x - 180 ) + ( y - 140 );
      if( y >= 200 ) {
        r = 16; g = 18; b = 24;
        if( diag >= 0 && diag < 16 )       { r = 216; g = 0;   b = 0;   }
        else if( diag >= 16 && diag < 32 ) { r = 216; g = 216; b = 0;   }
        else if( diag >= 32 && diag < 48 ) { r = 0;   g = 216; b = 0;   }
        else if( diag >= 48 && diag < 64 ) { r = 0;   g = 216; b = 216; }
      }
      rgb[( y * w + x ) * 3 + 0] = r;
      rgb[( y * w + x ) * 3 + 1] = g;
      rgb[( y * w + x ) * 3 + 2] = b;
    }
  }

  qvr_lock_frame();
  if( g_qvr.jpeg_cap < need ) {
    uint8_t *nb = (uint8_t *)realloc( g_qvr.jpeg_buf, need );
    if( nb ) { g_qvr.jpeg_buf = nb; g_qvr.jpeg_cap = need; }
  }
  if( g_qvr.jpeg_buf ) {
    g_qvr.jpeg_len = quest_vr_encode_jpeg_rgb24(
      rgb, w, h, g_qvr.jpeg_quality, g_qvr.jpeg_buf, g_qvr.jpeg_cap );
    g_qvr.frame_width = w;
    g_qvr.frame_height = h;
    g_qvr.frame_seq = 1;
  }
  qvr_unlock_frame();

  free( rgb );
}

/* ============================================================================
 * URL Parameter & Static File Helpers
 * ============================================================================ */

static int
qvr_hex_val( char c )
{
  if( c >= '0' && c <= '9' ) return c - '0';
  if( c >= 'a' && c <= 'f' ) return c - 'a' + 10;
  if( c >= 'A' && c <= 'F' ) return c - 'A' + 10;
  return -1;
}

static void
qvr_url_decode( const char *src, char *dst, size_t dst_cap )
{
  size_t i = 0;
  if( !src || !dst || dst_cap == 0 ) return;
  while( *src && i + 1 < dst_cap ) {
    if( src[0] == '%' && src[1] && src[2] ) {
      int hi = qvr_hex_val( src[1] );
      int lo = qvr_hex_val( src[2] );
      if( hi >= 0 && lo >= 0 ) {
        dst[i++] = (char)( ( hi << 4 ) | lo );
        src += 3;
        continue;
      }
    } else if( src[0] == '+' ) {
      dst[i++] = ' ';
      src++;
      continue;
    }
    dst[i++] = *src++;
  }
  dst[i] = '\0';
}

static void
qvr_get_query_param( const char *query, const char *key, char *out, size_t out_cap )
{
  size_t key_len;
  const char *p;

  if( !out || out_cap == 0 ) return;
  out[0] = '\0';
  if( !query || !key ) return;

  key_len = strlen( key );
  p = query;
  while( *p && *p != ' ' && *p != '\r' && *p != '\n' ) {
    if( strncmp( p, key, key_len ) == 0 && p[key_len] == '=' ) {
      char raw[512];
      size_t i = 0;
      p += key_len + 1;
      while( p[i] && p[i] != '&' && p[i] != ' ' && p[i] != '\r' && p[i] != '\n' && i + 1 < sizeof( raw ) ) {
        raw[i] = p[i];
        i++;
      }
      raw[i] = '\0';
      qvr_url_decode( raw, out, out_cap );
      return;
    }
    while( *p && *p != '&' && *p != ' ' ) p++;
    if( *p == '&' ) p++;
  }
}

static const char *
qvr_guess_mime_type( const char *path )
{
  const char *ext = strrchr( path, '.' );
  if( !ext ) return "application/octet-stream";
  if( !strcasecmp( ext, ".html" ) || !strcasecmp( ext, ".htm" ) )
    return "text/html; charset=utf-8";
  if( !strcasecmp( ext, ".js" ) || !strcasecmp( ext, ".mjs" ) )
    return "application/javascript; charset=utf-8";
  if( !strcasecmp( ext, ".css" ) )
    return "text/css; charset=utf-8";
  if( !strcasecmp( ext, ".json" ) )
    return "application/json; charset=utf-8";
  if( !strcasecmp( ext, ".svg" ) )
    return "image/svg+xml";
  if( !strcasecmp( ext, ".png" ) )
    return "image/png";
  if( !strcasecmp( ext, ".jpg" ) || !strcasecmp( ext, ".jpeg" ) )
    return "image/jpeg";
  if( !strcasecmp( ext, ".pok" ) || !strcasecmp( ext, ".txt" ) )
    return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

/* ============================================================================
 * Remote ZX Spectrum Input Mapping (`/input?key=...&action=press|release|tap`)
 * ============================================================================ */

static int
qvr_map_key_name( const char *name, keyboard_key_name *out_key,
                  keyboard_key_name *out_key2, joystick_button *out_joy )
{
  *out_key = KEYBOARD_NONE;
  *out_key2 = KEYBOARD_NONE;
  if( !name || !name[0] ) return 0;
  if( strncmp( name, "joy_", 4 ) == 0 ) {
    const char *jb = name + 4;
    if( !strcmp( jb, "up" ) )    { *out_joy = JOYSTICK_BUTTON_UP;    return 2; }
    if( !strcmp( jb, "down" ) )  { *out_joy = JOYSTICK_BUTTON_DOWN;  return 2; }
    if( !strcmp( jb, "left" ) )  { *out_joy = JOYSTICK_BUTTON_LEFT;  return 2; }
    if( !strcmp( jb, "right" ) ) { *out_joy = JOYSTICK_BUTTON_RIGHT; return 2; }
    if( !strcmp( jb, "fire" ) )  { *out_joy = JOYSTICK_BUTTON_FIRE;  return 2; }
    return 0;
  }
  if( !strcasecmp( name, "enter" ) )     { *out_key = KEYBOARD_Enter;  return 1; }
  if( !strcasecmp( name, "space" ) || !strcmp( name, " " ) ) { *out_key = KEYBOARD_space; return 1; }
  if( !strcasecmp( name, "caps" ) || !strcasecmp( name, "shift" ) ) { *out_key = KEYBOARD_Caps; return 1; }
  if( !strcasecmp( name, "symbol" ) || !strcasecmp( name, "control" ) || !strcasecmp( name, "alt" ) ) {
    *out_key = KEYBOARD_Symbol;
    return 1;
  }
  if( !strcasecmp( name, "backspace" ) )  { *out_key = KEYBOARD_Caps; *out_key2 = KEYBOARD_0; return 1; }
  if( !strcasecmp( name, "arrowleft" ) )  { *out_key = KEYBOARD_Caps; *out_key2 = KEYBOARD_5; return 1; }
  if( !strcasecmp( name, "arrowdown" ) )  { *out_key = KEYBOARD_Caps; *out_key2 = KEYBOARD_6; return 1; }
  if( !strcasecmp( name, "arrowup" ) )    { *out_key = KEYBOARD_Caps; *out_key2 = KEYBOARD_7; return 1; }
  if( !strcasecmp( name, "arrowright" ) ) { *out_key = KEYBOARD_Caps; *out_key2 = KEYBOARD_8; return 1; }
  if( name[1] == '\0' ) {
    char c = name[0];
    if( c >= '0' && c <= '9' ) { *out_key = (keyboard_key_name)c; return 1; }
    if( c >= 'a' && c <= 'z' ) { *out_key = (keyboard_key_name)c; return 1; }
    if( c >= 'A' && c <= 'Z' ) { *out_key = (keyboard_key_name)( c - 'A' + 'a' ); return 1; }
    if( c == '"' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_p; return 1; }
    if( c == ',' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_n; return 1; }
    if( c == '.' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_m; return 1; }
    if( c == ';' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_o; return 1; }
    if( c == ':' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_z; return 1; }
    if( c == '=' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_l; return 1; }
    if( c == '+' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_k; return 1; }
    if( c == '-' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_j; return 1; }
    if( c == '*' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_b; return 1; }
    if( c == '/' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_v; return 1; }
    if( c == '?' ) { *out_key = KEYBOARD_Symbol; *out_key2 = KEYBOARD_c; return 1; }
  }
  return 0;
}

static void
qvr_handle_remote_input( const char *query )
{
  char key_str[32] = { 0 };
  char act_str[32] = { 0 };
  keyboard_key_name zkey = KEYBOARD_NONE, zkey2 = KEYBOARD_NONE;
  joystick_button jbtn = JOYSTICK_BUTTON_UP;
  int kind, is_press;

  if( !query ) return;
  qvr_get_query_param( query, "key", key_str, sizeof( key_str ) );
  qvr_get_query_param( query, "action", act_str, sizeof( act_str ) );

  if( !strcmp( key_str, "load" ) ) {
    g_qvr.load_macro_step = 1;
    g_qvr.load_macro_next_ms = qvr_now_ms();
    return;
  }

  kind = qvr_map_key_name( key_str, &zkey, &zkey2, &jbtn );
  is_press = ( !strcmp( act_str, "press" ) || !strcmp( act_str, "tap" ) );

  if( kind == 1 ) {
    if( !strcmp( act_str, "tap" ) ) {
      if( g_qvr.tap_key_active ) {
        keyboard_release( g_qvr.tap_key );
        if( g_qvr.tap_key2 != KEYBOARD_NONE ) keyboard_release( g_qvr.tap_key2 );
      }
      keyboard_press( zkey );
      if( zkey2 != KEYBOARD_NONE ) keyboard_press( zkey2 );
      g_qvr.tap_key_active = 1;
      g_qvr.tap_key = zkey;
      g_qvr.tap_key2 = zkey2;
      g_qvr.tap_release_ms = qvr_now_ms() + 80;
    } else if( is_press ) {
      keyboard_press( zkey );
      if( zkey2 != KEYBOARD_NONE ) keyboard_press( zkey2 );
    } else {
      if( zkey2 != KEYBOARD_NONE ) keyboard_release( zkey2 );
      keyboard_release( zkey );
    }
  } else if( kind == 2 ) {
    settings_current.joy_kempston = 1;
    joystick_press( 0, jbtn, is_press ? 1 : 0 );
    joystick_press( JOYSTICK_KEYBOARD, jbtn, is_press ? 1 : 0 );
  }
}

static void
qvr_tick_macros( uint64_t now )
{
  if( g_qvr.tap_key_active && now >= g_qvr.tap_release_ms ) {
    if( g_qvr.tap_key2 != KEYBOARD_NONE ) keyboard_release( g_qvr.tap_key2 );
    keyboard_release( g_qvr.tap_key );
    g_qvr.tap_key2 = KEYBOARD_NONE;
    g_qvr.tap_key_active = 0;
  }

  if( g_qvr.load_macro_step > 0 && now >= g_qvr.load_macro_next_ms ) {
    switch( g_qvr.load_macro_step ) {
    case 1:
      keyboard_press( KEYBOARD_j );
      g_qvr.load_macro_step = 2;
      g_qvr.load_macro_next_ms = now + 80;
      break;
    case 2:
      keyboard_release( KEYBOARD_j );
      g_qvr.load_macro_step = 3;
      g_qvr.load_macro_next_ms = now + 60;
      break;
    case 3:
      keyboard_press( KEYBOARD_Symbol );
      keyboard_press( KEYBOARD_p );
      g_qvr.load_macro_step = 4;
      g_qvr.load_macro_next_ms = now + 80;
      break;
    case 4:
      keyboard_release( KEYBOARD_p );
      g_qvr.load_macro_step = 5;
      g_qvr.load_macro_next_ms = now + 60;
      break;
    case 5:
      keyboard_press( KEYBOARD_p );
      g_qvr.load_macro_step = 6;
      g_qvr.load_macro_next_ms = now + 80;
      break;
    case 6:
      keyboard_release( KEYBOARD_p );
      keyboard_release( KEYBOARD_Symbol );
      g_qvr.load_macro_step = 7;
      g_qvr.load_macro_next_ms = now + 60;
      break;
    case 7:
      keyboard_press( KEYBOARD_Enter );
      g_qvr.load_macro_step = 8;
      g_qvr.load_macro_next_ms = now + 80;
      break;
    default:
      keyboard_release( KEYBOARD_Enter );
      g_qvr.load_macro_step = 0;
      break;
    }
  }
}

/* ============================================================================
 * Background Encoder & HTTP Server Threads
 * ============================================================================ */

static int
qvr_send_all( qvr_socket_t s, const void *data, size_t len )
{
  const char *p = (const char *)data;
  while( len > 0 ) {
    int sent = send( s, p, (int)len, 0 );
    if( sent <= 0 ) return -1;
    p += sent;
    len -= (size_t)sent;
  }
  return 0;
}

static void
qvr_send_json_response( qvr_socket_t cs, const char *json_str )
{
  char hdr[256];
  size_t blen = strlen( json_str );
  int hlen = snprintf( hdr, sizeof( hdr ),
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: application/json; charset=utf-8\r\n"
    "Content-Length: %zu\r\n"
    "Cache-Control: no-store\r\n"
    "Access-Control-Allow-Origin: *\r\n"
    "Connection: close\r\n\r\n", blen );
  qvr_send_all( cs, hdr, (size_t)hlen );
  qvr_send_all( cs, json_str, blen );
}

static int
qvr_try_serve_static_file( qvr_socket_t cs, const char *url_path )
{
  char clean_path[512];
  char try_paths[4][1024];
  int i;
  FILE *fp = NULL;
  const char *chosen = NULL;

  qvr_url_decode( url_path, clean_path, sizeof( clean_path ) );
  if( strstr( clean_path, ".." ) != NULL ) return 0;

  if( strcmp( clean_path, "/" ) == 0 || strcmp( clean_path, "/index.html" ) == 0 ) {
    snprintf( clean_path, sizeof( clean_path ), "/index.html" );
  }

  /* Try:
   * 1) <base_dir>/webxr<clean_path>
   * 2) <base_dir><clean_path> (for /games/* and /roms/*)
   * 3) ./webxr<clean_path>
   * 4) .<clean_path>
   */
  snprintf( try_paths[0], sizeof( try_paths[0] ), "%s/webxr%s", g_qvr.base_dir, clean_path );
  snprintf( try_paths[1], sizeof( try_paths[1] ), "%s%s", g_qvr.base_dir, clean_path );
  snprintf( try_paths[2], sizeof( try_paths[2] ), "./webxr%s", clean_path );
  snprintf( try_paths[3], sizeof( try_paths[3] ), ".%s", clean_path );

  for( i = 0; i < 4; i++ ) {
    fp = fopen( try_paths[i], "rb" );
    if( fp ) {
      chosen = try_paths[i];
      break;
    }
  }

  if( !fp || !chosen ) return 0;

  if( fseek( fp, 0, SEEK_END ) != 0 ) {
    fclose( fp );
    return 0;
  }
  long fsize = ftell( fp );
  if( fsize < 0 || fsize > 32 * 1024 * 1024 ) {
    fclose( fp );
    return 0;
  }
  fseek( fp, 0, SEEK_SET );

  uint8_t *buf = (uint8_t *)malloc( (size_t)fsize + 1 );
  if( !buf ) {
    fclose( fp );
    return 0;
  }
  size_t nread = fread( buf, 1, (size_t)fsize, fp );
  fclose( fp );

  const char *mime = qvr_guess_mime_type( chosen );
  char hdr[320];
  int hlen = snprintf( hdr, sizeof( hdr ),
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: %s\r\n"
    "Content-Length: %zu\r\n"
    "Cache-Control: no-cache\r\n"
    "Access-Control-Allow-Origin: *\r\n"
    "Connection: close\r\n\r\n", mime, nread );
  qvr_send_all( cs, hdr, (size_t)hlen );
  qvr_send_all( cs, buf, nread );
  free( buf );
  return 1;
}

static void
qvr_handle_cheats_json( qvr_socket_t cs )
{
  size_t cap = 32768;
  char *buf = (char *)malloc( cap );
  size_t pos = 0;
  GSList *item;
  int idx = 0, i;

  if( !buf ) {
    qvr_send_json_response( cs, "{\"ok\":false}" );
    return;
  }

  pos += snprintf( buf + pos, cap - pos, "{\"ok\":true,\"trainers\":[" );
  for( item = trainer_list; item && pos + 256 < cap; item = item->next, idx++ ) {
    trainer_t *tr = (trainer_t *)item->data;
    if( !tr ) continue;
    char safe_name[128];
    size_t si = 0, sj = 0;
    const char *nm = tr->name ? tr->name : "Trainer";
    while( nm[si] && sj + 2 < sizeof( safe_name ) ) {
      if( nm[si] == '"' || nm[si] == '\\' ) safe_name[sj++] = ' ';
      else if( (unsigned char)nm[si] >= 32 ) safe_name[sj++] = nm[si];
      si++;
    }
    safe_name[sj] = '\0';
    pos += snprintf( buf + pos, cap - pos,
      "%s{\"index\":%d,\"name\":\"%s\",\"active\":%s,\"disabled\":%s}",
      ( idx > 0 ) ? "," : "", idx, safe_name,
      tr->active ? "true" : "false",
      tr->disabled ? "true" : "false" );
  }

  pos += snprintf( buf + pos, cap - pos, "],\"custom_pokes\":[" );
  qvr_lock_cmd();
  int first_poke = 1;
  for( i = 0; i < g_qvr.custom_poke_count && pos + 160 < cap; i++ ) {
    qvr_custom_poke_t *p = &g_qvr.custom_pokes[i];
    if( !p->active ) continue;
    pos += snprintf( buf + pos, cap - pos,
      "%s{\"bank\":%d,\"address\":%d,\"value\":%d,\"orig\":%d}",
      first_poke ? "" : ",", p->bank, p->address, p->value, p->orig );
    first_poke = 0;
  }
  qvr_unlock_cmd();

  size_t pf_cnt = pokefinder_is_allocated() ? pokefinder_count : 0;
  pos += snprintf( buf + pos, cap - pos,
    "],\"pokefinder_count\":%zu,\"pokefinder_candidates\":[", pf_cnt );

  if( pokefinder_is_allocated() && pf_cnt > 0 && pf_cnt <= 250 ) {
    size_t page, offset;
    int cand_added = 0;
    for( page = 0; page < MEMORY_PAGES_IN_16K * SPECTRUM_RAM_PAGES && cand_added < 40; page++ ) {
      memory_page *mapping = &memory_map_ram[page];
      int bank = mapping->page_num;
      for( offset = 0; offset < MEMORY_PAGE_SIZE && cand_added < 40; offset++ ) {
        if( !( pokefinder_impossible[page][offset / 8] & ( 1 << ( offset & 7 ) ) ) ) {
          int bank_offset = (int)( mapping->offset + offset );
          int cpu_addr = bank_offset;
          if( bank == 5 )      cpu_addr = 0x4000 + bank_offset;
          else if( bank == 2 ) cpu_addr = 0x8000 + bank_offset;
          else                 cpu_addr = 0xC000 + bank_offset;
          int cur_val = mapping->page[offset];
          pos += snprintf( buf + pos, cap - pos,
            "%s{\"bank\":%d,\"offset\":%d,\"address\":%d,\"value\":%d}",
            ( cand_added > 0 ) ? "," : "", bank, bank_offset, cpu_addr, cur_val );
          cand_added++;
        }
      }
    }
  }

  pos += snprintf( buf + pos, cap - pos, "]}" );
  qvr_send_json_response( cs, buf );
  free( buf );
}

static void
qvr_handle_cheats_action( qvr_socket_t cs, const char *query )
{
  char act[64] = { 0 };
  char bank_s[32] = { 0 };
  char addr_s[32] = { 0 };
  char val_s[32] = { 0 };
  char idx_s[32] = { 0 };
  char active_s[32] = { 0 };
  char file_s[256] = { 0 };

  qvr_get_query_param( query, "action", act, sizeof( act ) );
  qvr_get_query_param( query, "bank", bank_s, sizeof( bank_s ) );
  qvr_get_query_param( query, "addr", addr_s, sizeof( addr_s ) );
  qvr_get_query_param( query, "val", val_s, sizeof( val_s ) );
  qvr_get_query_param( query, "index", idx_s, sizeof( idx_s ) );
  qvr_get_query_param( query, "active", active_s, sizeof( active_s ) );
  qvr_get_query_param( query, "file", file_s, sizeof( file_s ) );

  int bank = bank_s[0] ? atoi( bank_s ) : 8;
  int addr = addr_s[0] ? (int)strtol( addr_s, NULL, 0 ) : 0;
  int val  = val_s[0]  ? (int)strtol( val_s, NULL, 0 ) : 0;

  if( !strcmp( act, "peek" ) ) {
    char resp[256];
    int b0 = qvr_read_mem_byte( 8, ( addr + 0 ) & 0xffff );
    int b1 = qvr_read_mem_byte( 8, ( addr + 1 ) & 0xffff );
    int b2 = qvr_read_mem_byte( 8, ( addr + 2 ) & 0xffff );
    int b3 = qvr_read_mem_byte( 8, ( addr + 3 ) & 0xffff );
    int b4 = qvr_read_mem_byte( 8, ( addr + 4 ) & 0xffff );
    int b5 = qvr_read_mem_byte( 8, ( addr + 5 ) & 0xffff );
    int b6 = qvr_read_mem_byte( 8, ( addr + 6 ) & 0xffff );
    int b7 = qvr_read_mem_byte( 8, ( addr + 7 ) & 0xffff );
    snprintf( resp, sizeof( resp ),
      "{\"ok\":true,\"address\":%d,\"bytes\":[%d,%d,%d,%d,%d,%d,%d,%d]}",
      addr & 0xffff, b0, b1, b2, b3, b4, b5, b6, b7 );
    qvr_send_json_response( cs, resp );
    return;
  }

  if( !strcmp( act, "poke" ) ) {
    qvr_enqueue_cmd( QVR_CMD_POKE, bank, addr, val, NULL );
  } else if( !strcmp( act, "restore_poke" ) ) {
    qvr_enqueue_cmd( QVR_CMD_RESTORE_POKE, bank, addr, 0, NULL );
  } else if( !strcmp( act, "clear_all" ) ) {
    qvr_enqueue_cmd( QVR_CMD_CLEAR_CHEATS, 0, 0, 0, NULL );
  } else if( !strcmp( act, "toggle_trainer" ) ) {
    qvr_enqueue_cmd( QVR_CMD_TOGGLE_TRAINER, atoi( idx_s ), atoi( active_s ), 0, NULL );
  } else if( !strcmp( act, "load_pok" ) && file_s[0] && !strstr( file_s, ".." ) ) {
    char full_pok[512];
    snprintf( full_pok, sizeof( full_pok ), "%s/games/%s", g_qvr.base_dir, file_s );
    qvr_enqueue_cmd( QVR_CMD_LOAD_POK, 0, 0, 0, full_pok );
  } else if( !strcmp( act, "pf_search" ) ) {
    qvr_enqueue_cmd( QVR_CMD_PF_SEARCH, val, 0, 0, NULL );
  } else if( !strcmp( act, "pf_inc" ) ) {
    qvr_enqueue_cmd( QVR_CMD_PF_INC, 0, 0, 0, NULL );
  } else if( !strcmp( act, "pf_dec" ) ) {
    qvr_enqueue_cmd( QVR_CMD_PF_DEC, 0, 0, 0, NULL );
  } else if( !strcmp( act, "pf_reset" ) ) {
    qvr_enqueue_cmd( QVR_CMD_PF_RESET, 0, 0, 0, NULL );
  }

  qvr_send_json_response( cs, "{\"ok\":true}" );
}

static void
qvr_handle_control_action( qvr_socket_t cs, const char *query )
{
  char act[64] = { 0 };
  char id[64] = { 0 };
  char file_s[256] = { 0 };

  qvr_get_query_param( query, "action", act, sizeof( act ) );
  qvr_get_query_param( query, "id", id, sizeof( id ) );
  qvr_get_query_param( query, "file", file_s, sizeof( file_s ) );

  if( !strcmp( act, "machine" ) && id[0] ) {
    qvr_enqueue_cmd( QVR_CMD_MACHINE, 0, 0, 0, id );
  } else if( !strcmp( act, "reset" ) ) {
    qvr_enqueue_cmd( QVR_CMD_RESET, 0, 0, 0, NULL );
  } else if( !strcmp( act, "tape_play" ) ) {
    qvr_enqueue_cmd( QVR_CMD_TAPE_PLAY, 0, 0, 0, NULL );
  } else if( !strcmp( act, "tape_rewind" ) ) {
    qvr_enqueue_cmd( QVR_CMD_TAPE_REWIND, 0, 0, 0, NULL );
  } else if( !strcmp( act, "tape_eject" ) ) {
    qvr_enqueue_cmd( QVR_CMD_TAPE_EJECT, 0, 0, 0, NULL );
  } else if( !strcmp( act, "load_local" ) && file_s[0] && !strstr( file_s, ".." ) ) {
    char full_path[512];
    const char *base_file = strrchr( file_s, '/' );
    base_file = base_file ? ( base_file + 1 ) : file_s;
    snprintf( full_path, sizeof( full_path ), "%s/games/%s", g_qvr.base_dir, base_file );
    const char *ext = strrchr( base_file, '.' );
    if( ext && !strcasecmp( ext, ".pok" ) ) {
      qvr_enqueue_cmd( QVR_CMD_LOAD_POK, 0, 0, 0, full_path );
    } else {
      qvr_enqueue_cmd( QVR_CMD_OPEN_FILE, 0, 0, 0, full_path );
    }
  }

  qvr_send_json_response( cs, "{\"ok\":true}" );
}

static void
qvr_handle_tosec_search( qvr_socket_t cs, const char *query )
{
  char q[128] = { 0 };
  char ext_filter[32] = { 0 };
  size_t cap = 32768;
  char *buf = (char *)malloc( cap );
  size_t pos = 0;
  int count = 0;

  qvr_get_query_param( query, "q", q, sizeof( q ) );
  qvr_get_query_param( query, "ext", ext_filter, sizeof( ext_filter ) );

  if( !buf ) {
    qvr_send_json_response( cs, "{\"total\":0,\"results\":[]}" );
    return;
  }

  pos += snprintf( buf + pos, cap - pos, "{\"results\":[" );

#ifdef WIN32
  char pattern[512];
  WIN32_FIND_DATAA fd;
  snprintf( pattern, sizeof( pattern ), "%s/games/*.*", g_qvr.base_dir );
  HANDLE hFind = FindFirstFileA( pattern, &fd );
  if( hFind != INVALID_HANDLE_VALUE ) {
    do {
      if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY ) continue;
      const char *fname = fd.cFileName;
      if( fname[0] == '_' || fname[0] == '.' ) continue;
      const char *dot = strrchr( fname, '.' );
      if( !dot ) continue;
      char ext_up[16];
      size_t ei = 0;
      dot++;
      while( dot[ei] && ei + 1 < sizeof( ext_up ) ) {
        ext_up[ei] = (char)toupper( (unsigned char)dot[ei] );
        ei++;
      }
      ext_up[ei] = '\0';
      if( strcmp( ext_up, "Z80" ) && strcmp( ext_up, "SNA" ) &&
          strcmp( ext_up, "TAP" ) && strcmp( ext_up, "TZX" ) &&
          strcmp( ext_up, "DSK" ) && strcmp( ext_up, "TRD" ) &&
          strcmp( ext_up, "POK" ) ) continue;

      if( ext_filter[0] && strcasecmp( ext_up, ext_filter ) != 0 ) continue;

      if( q[0] ) {
        /* Case-insensitive substring check */
        char fn_low[256], q_low[128];
        size_t k;
        for( k = 0; fname[k] && k + 1 < sizeof( fn_low ); k++ )
          fn_low[k] = (char)tolower( (unsigned char)fname[k] );
        fn_low[k] = '\0';
        for( k = 0; q[k] && k + 1 < sizeof( q_low ); k++ )
          q_low[k] = (char)tolower( (unsigned char)q[k] );
        q_low[k] = '\0';
        if( !strstr( fn_low, q_low ) ) continue;
      }

      if( pos + 256 < cap ) {
        pos += snprintf( buf + pos, cap - pos,
          "%s{\"name\":\"%s\",\"title\":\"%s\",\"ext\":\"%s\",\"category\":\"Local Bundled Game\",\"relPath\":\"%s\",\"size\":%lu}",
          ( count > 0 ) ? "," : "", fname, fname, ext_up, fname, (unsigned long)fd.nFileSizeLow );
        count++;
      }
    } while( FindNextFileA( hFind, &fd ) );
    FindClose( hFind );
  }
#endif

  pos += snprintf( buf + pos, cap - pos, "],\"total\":%d}", count );
  qvr_send_json_response( cs, buf );
  free( buf );
}

typedef struct qvr_game_entry_t {
  char name[128];
  char ext[16];
  unsigned long size;
} qvr_game_entry_t;

static void
qvr_handle_tosec_random( qvr_socket_t cs )
{
  static int last_random_idx = -1;
  qvr_game_entry_t *entries = (qvr_game_entry_t *)malloc( 256 * sizeof( qvr_game_entry_t ) );
  int count = 0;

  if( !entries ) {
    qvr_send_json_response( cs, "{\"error\":\"oom\"}" );
    return;
  }

#ifdef WIN32
  char pattern[512];
  WIN32_FIND_DATAA fd;
  snprintf( pattern, sizeof( pattern ), "%s/games/*.*", g_qvr.base_dir );
  HANDLE hFind = FindFirstFileA( pattern, &fd );
  if( hFind != INVALID_HANDLE_VALUE ) {
    do {
      if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY ) continue;
      const char *fname = fd.cFileName;
      if( fname[0] == '_' || fname[0] == '.' ) continue;
      const char *dot = strrchr( fname, '.' );
      if( !dot ) continue;
      char ext_up[16];
      size_t ei = 0;
      dot++;
      while( dot[ei] && ei + 1 < sizeof( ext_up ) ) {
        ext_up[ei] = (char)toupper( (unsigned char)dot[ei] );
        ei++;
      }
      ext_up[ei] = '\0';
      if( strcmp( ext_up, "Z80" ) && strcmp( ext_up, "SNA" ) &&
          strcmp( ext_up, "TAP" ) && strcmp( ext_up, "TZX" ) &&
          strcmp( ext_up, "DSK" ) && strcmp( ext_up, "TRD" ) ) continue;
      if( count < 256 ) {
        snprintf( entries[count].name, sizeof( entries[count].name ), "%s", fname );
        snprintf( entries[count].ext, sizeof( entries[count].ext ), "%s", ext_up );
        entries[count].size = (unsigned long)fd.nFileSizeLow;
        count++;
      }
    } while( FindNextFileA( hFind, &fd ) );
    FindClose( hFind );
  }
#endif

  if( count <= 0 ) {
    free( entries );
    qvr_send_json_response( cs, "{\"error\":\"No games found\"}" );
    return;
  }

  static uint64_t rng_state = 0x853c49e6748fea9bULL;
  rng_state ^= qvr_now_ms() + 0x9e3779b97f4a7c15ULL;
  rng_state ^= rng_state >> 12;
  rng_state ^= rng_state << 25;
  rng_state ^= rng_state >> 27;
  uint64_t rval = rng_state * 0x2545f4914f6cdd1dULL;

  int idx = (int)( rval % (uint64_t)count );
  if( count > 1 && idx == last_random_idx ) {
    idx = ( idx + 1 + (int)( ( rval >> 16 ) % (uint64_t)( count - 1 ) ) ) % count;
  }
  last_random_idx = idx;

  char resp[512];
  snprintf( resp, sizeof( resp ),
    "{\"name\":\"%s\",\"title\":\"%s\",\"ext\":\"%s\",\"category\":\"Local Bundled Game\",\"relPath\":\"%s\",\"size\":%lu}",
    entries[idx].name, entries[idx].name, entries[idx].ext, entries[idx].name, entries[idx].size );
  free( entries );
  qvr_send_json_response( cs, resp );
}

static void
qvr_handle_frame_pal( qvr_socket_t cs )
{
  uint8_t *pal_buf = (uint8_t *)malloc( 38400 );
  int x, y;
  size_t out_idx = 0;

  if( !pal_buf ) return;

#ifdef WIN32
  for( y = 0; y < DISPLAY_SCREEN_HEIGHT; y++ ) {
    const libspectrum_word *row = win32display_image[y];
    for( x = 0; x < DISPLAY_ASPECT_WIDTH; x += 2 ) {
      uint8_t c0 = (uint8_t)( row[x] & 0x0f );
      uint8_t c1 = (uint8_t)( row[x + 1] & 0x0f );
      pal_buf[out_idx++] = (uint8_t)( ( c0 << 4 ) | c1 );
    }
  }
#else
  memset( pal_buf, 0x77, 38400 );
#endif

  const char *mach = ( machine_current && machine_current->machine ) ?
                     libspectrum_machine_name( machine_current->machine ) : "Spectrum";
  char hdr[320];
  int hlen = snprintf( hdr, sizeof( hdr ),
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: application/octet-stream\r\n"
    "Content-Length: 38400\r\n"
    "X-Fuse-Machine: %s\r\n"
    "Cache-Control: no-store, no-cache\r\n"
    "Access-Control-Allow-Origin: *\r\n"
    "Access-Control-Expose-Headers: X-Fuse-Machine\r\n"
    "Connection: close\r\n\r\n",
    mach ? mach : "Spectrum" );
  qvr_send_all( cs, hdr, (size_t)hlen );
  qvr_send_all( cs, pal_buf, 38400 );
  free( pal_buf );
}

static void
qvr_handle_upload( qvr_socket_t cs, const char *req, int req_len )
{
  char name_s[128] = { 0 };
  char safe_name[128] = { 0 };
  const char *q = strchr( req, '?' );
  if( q ) qvr_get_query_param( q + 1, "name", name_s, sizeof( name_s ) );
  if( !name_s[0] ) snprintf( name_s, sizeof( name_s ), "upload.z80" );

  size_t si = 0, sj = 0;
  while( name_s[si] && sj + 1 < sizeof( safe_name ) ) {
    char c = name_s[si++];
    if( isalnum( (unsigned char)c ) || c == '.' || c == '_' || c == '-' )
      safe_name[sj++] = c;
  }
  safe_name[sj] = '\0';
  if( !safe_name[0] ) snprintf( safe_name, sizeof( safe_name ), "upload.z80" );

  const char *cl_hdr = strstr( req, "Content-Length:" );
  if( !cl_hdr ) cl_hdr = strstr( req, "content-length:" );
  long content_len = cl_hdr ? atol( cl_hdr + 15 ) : 0;

  const char *body_start = strstr( req, "\r\n\r\n" );
  if( !body_start || content_len <= 0 || content_len > 4 * 1024 * 1024 ) {
    qvr_send_json_response( cs, "{\"ok\":false,\"error\":\"invalid_upload\"}" );
    return;
  }
  body_start += 4;
  int already = req_len - (int)( body_start - req );
  uint8_t *payload = (uint8_t *)malloc( (size_t)content_len );
  if( !payload ) {
    qvr_send_json_response( cs, "{\"ok\":false}" );
    return;
  }
  int copied = 0;
  if( already > 0 ) {
    copied = ( already > content_len ) ? (int)content_len : already;
    memcpy( payload, body_start, (size_t)copied );
  }
  while( copied < content_len ) {
    int r = recv( cs, (char *)payload + copied, (int)( content_len - copied ), 0 );
    if( r <= 0 ) break;
    copied += r;
  }

  char out_path[512];
  snprintf( out_path, sizeof( out_path ), "%s/games/_uploaded_%s", g_qvr.base_dir, safe_name );
  FILE *fp = fopen( out_path, "wb" );
  if( fp ) {
    fwrite( payload, 1, (size_t)copied, fp );
    fclose( fp );
    const char *ext = strrchr( safe_name, '.' );
    if( ext && !strcasecmp( ext, ".pok" ) ) {
      qvr_enqueue_cmd( QVR_CMD_LOAD_POK, 0, 0, 0, out_path );
    } else {
      qvr_enqueue_cmd( QVR_CMD_OPEN_FILE, 0, 0, 0, out_path );
    }
  }
  free( payload );
  qvr_send_json_response( cs, "{\"ok\":true}" );
}

static void
qvr_encode_latest_raw_frame( void )
{
  uint8_t *local_rgb = NULL;
  int w = 0, h = 0;
  size_t need = 0;

  qvr_lock_raw();
  if( g_qvr.raw_dirty && g_qvr.raw_rgb && g_qvr.raw_width > 0 && g_qvr.raw_height > 0 ) {
    w = g_qvr.raw_width;
    h = g_qvr.raw_height;
    need = (size_t)w * (size_t)h * 3;
    local_rgb = (uint8_t *)malloc( need );
    if( local_rgb ) {
      memcpy( local_rgb, g_qvr.raw_rgb, need );
      g_qvr.raw_dirty = 0;
    }
  }
  qvr_unlock_raw();

  if( !local_rgb ) return;

  size_t max_jpeg = need + 8192;
  uint8_t *enc_buf = (uint8_t *)malloc( max_jpeg );
  if( enc_buf ) {
    size_t jlen = quest_vr_encode_jpeg_rgb24(
      local_rgb, w, h, g_qvr.jpeg_quality, enc_buf, max_jpeg );
    if( jlen > 0 ) {
      qvr_lock_frame();
      if( g_qvr.jpeg_cap < jlen ) {
        uint8_t *nb = (uint8_t *)realloc( g_qvr.jpeg_buf, jlen );
        if( nb ) { g_qvr.jpeg_buf = nb; g_qvr.jpeg_cap = jlen; }
      }
      if( g_qvr.jpeg_buf && g_qvr.jpeg_cap >= jlen ) {
        memcpy( g_qvr.jpeg_buf, enc_buf, jlen );
        g_qvr.jpeg_len = jlen;
        g_qvr.frame_width = w;
        g_qvr.frame_height = h;
        g_qvr.frame_seq++;
      }
      qvr_unlock_frame();
    }
    free( enc_buf );
  }
  free( local_rgb );
}

#ifdef WIN32
static DWORD WINAPI
qvr_encoder_thread_proc( LPVOID param )
#else
static void *
qvr_encoder_thread_proc( void *param )
#endif
{
  uint64_t fps_t0 = qvr_now_ms();
  unsigned long seq_t0 = g_qvr.frame_seq;
  (void)param;

  while( g_qvr.running ) {
    uint64_t now = qvr_now_ms();
    qvr_tick_macros( now );

    if( g_qvr.raw_dirty ) {
      qvr_encode_latest_raw_frame();
    }

    if( now - fps_t0 >= 1000 ) {
      unsigned long cur_seq = g_qvr.frame_seq;
      g_qvr.measured_fps = (float)( ( cur_seq - seq_t0 ) * 1000.0 / (double)( now - fps_t0 ) );
      seq_t0 = cur_seq;
      fps_t0 = now;
    }

    qvr_sleep_ms( 4 );
  }
  return 0;
}

#ifdef WIN32
static DWORD WINAPI
qvr_client_thread_proc( LPVOID param )
#else
static void *
qvr_client_thread_proc( void *param )
#endif
{
  qvr_socket_t cs = (qvr_socket_t)(uintptr_t)param;
  char req[4096];
  int n;
  int one = 1;

  setsockopt( cs, IPPROTO_TCP, TCP_NODELAY, (const char *)&one, sizeof( one ) );
#ifdef WIN32
  DWORD timeout_ms = 5000;
  setsockopt( cs, SOL_SOCKET, SO_RCVTIMEO, (const char *)&timeout_ms, sizeof( timeout_ms ) );
  setsockopt( cs, SOL_SOCKET, SO_SNDTIMEO, (const char *)&timeout_ms, sizeof( timeout_ms ) );
#endif

  n = recv( cs, req, sizeof( req ) - 1, 0 );
  if( n <= 0 ) {
    qvr_closesocket( cs );
    return 0;
  }
  req[n] = '\0';

  if( strncmp( req, "OPTIONS ", 8 ) == 0 ) {
    const char *resp =
      "HTTP/1.1 204 No Content\r\n"
      "Access-Control-Allow-Origin: *\r\n"
      "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
      "Access-Control-Allow-Headers: Content-Type\r\n"
      "Connection: close\r\n\r\n";
    qvr_send_all( cs, resp, strlen( resp ) );
  } else if( strncmp( req, "POST /api/diag", 14 ) == 0 ) {
    qvr_send_json_response( cs, "{\"ok\":true}" );
  } else if( strncmp( req, "POST /api/upload", 16 ) == 0 ) {
    qvr_handle_upload( cs, req, n );
  } else if( strncmp( req, "GET /api/cheats/action?", 23 ) == 0 ) {
    qvr_handle_cheats_action( cs, req + 23 );
  } else if( strncmp( req, "GET /api/cheats", 15 ) == 0 ) {
    qvr_handle_cheats_json( cs );
  } else if( strncmp( req, "GET /api/control?", 17 ) == 0 ) {
    qvr_handle_control_action( cs, req + 17 );
  } else if( strncmp( req, "GET /api/tosec/random", 21 ) == 0 ) {
    qvr_handle_tosec_random( cs );
  } else if( strncmp( req, "GET /api/tosec/search", 21 ) == 0 ) {
    const char *q = strchr( req, '?' );
    qvr_handle_tosec_search( cs, q ? ( q + 1 ) : "" );
  } else if( strncmp( req, "GET /api/frame.pal", 18 ) == 0 ) {
    qvr_handle_frame_pal( cs );
  } else if( strncmp( req, "GET /frame.jpg", 14 ) == 0 ) {
    uint8_t *copy = NULL;
    size_t len = 0;

    if( g_qvr.raw_dirty ) qvr_encode_latest_raw_frame();

    qvr_lock_frame();
    if( g_qvr.jpeg_buf && g_qvr.jpeg_len > 0 ) {
      len = g_qvr.jpeg_len;
      copy = (uint8_t *)malloc( len );
      if( copy ) memcpy( copy, g_qvr.jpeg_buf, len );
    }
    qvr_unlock_frame();

    if( copy && len > 0 ) {
      char hdr[256];
      int hlen = snprintf( hdr, sizeof( hdr ),
        "HTTP/1.1 200 OK\r\n"
        "Content-Type: image/jpeg\r\n"
        "Content-Length: %zu\r\n"
        "Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Connection: close\r\n\r\n", len );
      qvr_send_all( cs, hdr, (size_t)hlen );
      qvr_send_all( cs, copy, len );
      free( copy );
    } else {
      const char *resp = "HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n";
      qvr_send_all( cs, resp, strlen( resp ) );
    }
  } else if( strncmp( req, "GET /stream.mjpg", 16 ) == 0 ) {
    const char *hdr =
      "HTTP/1.1 200 OK\r\n"
      "Content-Type: multipart/x-mixed-replace; boundary=fuseframe\r\n"
      "Cache-Control: no-store, no-cache\r\n"
      "Access-Control-Allow-Origin: *\r\n"
      "Connection: close\r\n\r\n";
    g_qvr.active_clients++;
    if( qvr_send_all( cs, hdr, strlen( hdr ) ) == 0 ) {
      unsigned long last_sent = 0;
      while( g_qvr.running ) {
        uint8_t *copy = NULL;
        size_t len = 0;
        qvr_lock_frame();
        if( g_qvr.jpeg_buf && g_qvr.jpeg_len > 0 && g_qvr.frame_seq != last_sent ) {
          len = g_qvr.jpeg_len;
          copy = (uint8_t *)malloc( len );
          if( copy ) {
            memcpy( copy, g_qvr.jpeg_buf, len );
            last_sent = g_qvr.frame_seq;
          }
        }
        qvr_unlock_frame();

        if( copy && len > 0 ) {
          char part[160];
          int plen = snprintf( part, sizeof( part ),
            "--fuseframe\r\nContent-Type: image/jpeg\r\nContent-Length: %zu\r\n\r\n", len );
          if( qvr_send_all( cs, part, (size_t)plen ) != 0 ||
              qvr_send_all( cs, copy, len ) != 0 ||
              qvr_send_all( cs, "\r\n", 2 ) != 0 ) {
            free( copy );
            break;
          }
          free( copy );
        }
        qvr_sleep_ms( 16 );
      }
    }
    if( g_qvr.active_clients > 0 ) g_qvr.active_clients--;
  } else if( strncmp( req, "GET /status.json", 16 ) == 0 ) {
    char body[512];
    const char *mach = ( machine_current && machine_current->machine ) ?
                       libspectrum_machine_name( machine_current->machine ) : "Spectrum";
    const char *sc = scaler_name( current_scaler );
    snprintf( body, sizeof( body ),
      "{\"running\":%s,\"port\":%d,\"url\":\"%s\",\"fps\":%.1f,"
      "\"target_fps\":%d,\"quality\":%d,\"frames\":%lu,"
      "\"width\":%d,\"height\":%d,\"stereo_mode\":%d,"
      "\"machine\":\"%s\",\"scaler\":\"%s\"}\n",
      g_qvr.running ? "true" : "false",
      g_qvr.port, g_qvr.url_buf, g_qvr.measured_fps,
      g_qvr.target_fps, g_qvr.jpeg_quality, g_qvr.frame_seq,
      g_qvr.frame_width, g_qvr.frame_height, (int)g_qvr.stereo_mode,
      mach ? mach : "Spectrum", sc ? sc : "Normal" );
    qvr_send_json_response( cs, body );
  } else if( strncmp( req, "GET /input?", 11 ) == 0 ) {
    qvr_handle_remote_input( req + 11 );
    qvr_send_json_response( cs, "{\"ok\":true}" );
  } else if( strncmp( req, "GET /", 5 ) == 0 ) {
    char url_path[512] = { 0 };
    size_t i = 0;
    const char *p = req + 4;
    while( p[i] && p[i] != ' ' && p[i] != '?' && p[i] != '\r' && p[i] != '\n' && i + 1 < sizeof( url_path ) ) {
      url_path[i] = p[i];
      i++;
    }
    url_path[i] = '\0';

    if( !qvr_try_serve_static_file( cs, url_path ) ) {
      size_t html_cap = sizeof( quest_vr_studio_html ) + 128;
      char *html = (char *)malloc( html_cap );
      if( html ) {
        int blen = snprintf( html, html_cap, quest_vr_studio_html, (int)g_qvr.stereo_mode );
        char hdr[256];
        int hlen = snprintf( hdr, sizeof( hdr ),
          "HTTP/1.1 200 OK\r\n"
          "Content-Type: text/html; charset=utf-8\r\n"
          "Content-Length: %d\r\n"
          "Cache-Control: no-store\r\n"
          "Connection: close\r\n\r\n", blen );
        qvr_send_all( cs, hdr, (size_t)hlen );
        qvr_send_all( cs, html, (size_t)blen );
        free( html );
      }
    }
  }

  qvr_closesocket( cs );
  return 0;
}

#ifdef WIN32
static DWORD WINAPI
qvr_server_thread_proc( LPVOID param )
#else
static void *
qvr_server_thread_proc( void *param )
#endif
{
  (void)param;
  while( g_qvr.running && g_qvr.listen_sock != QVR_INVALID_SOCKET ) {
    struct sockaddr_in caddr;
#ifdef WIN32
    int clen = sizeof( caddr );
#else
    socklen_t clen = sizeof( caddr );
#endif
    qvr_socket_t cs = accept( g_qvr.listen_sock, (struct sockaddr *)&caddr, &clen );
    if( cs == QVR_INVALID_SOCKET ) {
      if( !g_qvr.running ) break;
      qvr_sleep_ms( 10 );
      continue;
    }
#ifdef WIN32
    HANDLE th = CreateThread( NULL, 0, qvr_client_thread_proc, (LPVOID)(uintptr_t)cs, 0, NULL );
    if( th ) CloseHandle( th );
    else qvr_closesocket( cs );
#else
    pthread_t th;
    if( pthread_create( &th, NULL, qvr_client_thread_proc, (void *)(uintptr_t)cs ) == 0 )
      pthread_detach( th );
    else
      qvr_closesocket( cs );
#endif
  }
  return 0;
}

/* ============================================================================
 * Public API
 * ============================================================================ */

int
quest_vr_init( void )
{
  if( !g_qvr.initialized ) {
#ifdef WIN32
    WSADATA wsa;
    char exe_path[512];
    DWORD len;
    WSAStartup( MAKEWORD( 2, 2 ), &wsa );
    InitializeCriticalSection( &g_qvr.frame_lock );
    InitializeCriticalSection( &g_qvr.raw_lock );
    InitializeCriticalSection( &g_qvr.cmd_lock );

    snprintf( g_qvr.base_dir, sizeof( g_qvr.base_dir ), "." );
    len = GetModuleFileNameA( NULL, exe_path, sizeof( exe_path ) - 1 );
    if( len > 0 ) {
      exe_path[len] = '\0';
      char *last_sep = strrchr( exe_path, '\\' );
      if( !last_sep ) last_sep = strrchr( exe_path, '/' );
      if( last_sep ) {
        *last_sep = '\0';
        snprintf( g_qvr.base_dir, sizeof( g_qvr.base_dir ), "%s", exe_path );
      }
    }
#else
    pthread_mutex_init( &g_qvr.frame_lock, NULL );
    pthread_mutex_init( &g_qvr.raw_lock, NULL );
    pthread_mutex_init( &g_qvr.cmd_lock, NULL );
    snprintf( g_qvr.base_dir, sizeof( g_qvr.base_dir ), "." );
#endif
    g_qvr.port = 8765;
    g_qvr.target_fps = 50;
    g_qvr.jpeg_quality = 82;
    g_qvr.stereo_mode = QUEST_VR_MODE_2D;
    snprintf( g_qvr.url_buf, sizeof( g_qvr.url_buf ), "http://127.0.0.1:8765/" );
    snprintf( g_qvr.detail_buf, sizeof( g_qvr.detail_buf ), "Off" );
    g_qvr.initialized = 1;

    /* Ensure Kempston Joystick is active by default alongside keyboard */
    settings_current.joy_kempston = 1;
    settings_current.joystick_1_output = JOYSTICK_TYPE_KEMPSTON;
    settings_current.joystick_2_output = JOYSTICK_TYPE_KEMPSTON;
    settings_current.joystick_keyboard_output = JOYSTICK_TYPE_KEMPSTON;

#ifdef WIN32
    /* Restore persisted CRT / Graphics Filter if previously selected by user */
    if( g_qvr.base_dir[0] ) {
      char cfg_path[512];
      FILE *fp;
      snprintf( cfg_path, sizeof( cfg_path ), "%s/games/_fxr_scaler.cfg", g_qvr.base_dir );
      fp = fopen( cfg_path, "rb" );
      if( fp ) {
        int saved_sc = -1;
        if( fscanf( fp, "%d", &saved_sc ) == 1 && saved_sc >= 0 && saved_sc < (int)SCALER_NUM ) {
          quest_vr_notify_scaler_changed( saved_sc );
        }
        fclose( fp );
      }
    }
#endif
  }

  quest_vr_apply_settings();
  return 0;
}

void
quest_vr_end( void )
{
  quest_vr_stop();
  if( g_qvr.initialized ) {
    qvr_lock_raw();
    free( g_qvr.raw_rgb );
    g_qvr.raw_rgb = NULL;
    g_qvr.raw_cap = 0;
    qvr_unlock_raw();

    qvr_lock_frame();
    free( g_qvr.jpeg_buf );
    g_qvr.jpeg_buf = NULL;
    g_qvr.jpeg_cap = 0;
    g_qvr.jpeg_len = 0;
    qvr_unlock_frame();

#ifdef WIN32
    DeleteCriticalSection( &g_qvr.frame_lock );
    DeleteCriticalSection( &g_qvr.raw_lock );
    DeleteCriticalSection( &g_qvr.cmd_lock );
#else
    pthread_mutex_destroy( &g_qvr.frame_lock );
    pthread_mutex_destroy( &g_qvr.raw_lock );
    pthread_mutex_destroy( &g_qvr.cmd_lock );
#endif
    g_qvr.initialized = 0;
  }
}

int
quest_vr_start( int requested_port )
{
  int try_port, bound = 0;
  qvr_socket_t s = QVR_INVALID_SOCKET;
  char lan_ip[64];

  if( !g_qvr.initialized ) quest_vr_init();
  if( g_qvr.running ) return 0;

  if( requested_port <= 0 || requested_port > 65535 )
    requested_port = ( settings_current.quest_vr_port > 0 ) ?
                     settings_current.quest_vr_port : 8765;

  for( try_port = requested_port; try_port < requested_port + 15 && try_port <= 65535; try_port++ ) {
    struct sockaddr_in addr;
    int one = 1;

    s = socket( AF_INET, SOCK_STREAM, IPPROTO_TCP );
    if( s == QVR_INVALID_SOCKET ) break;

    setsockopt( s, SOL_SOCKET, SO_REUSEADDR, (const char *)&one, sizeof( one ) );

    memset( &addr, 0, sizeof( addr ) );
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = htonl( INADDR_ANY );
    addr.sin_port = htons( (uint16_t)try_port );

    if( bind( s, (struct sockaddr *)&addr, sizeof( addr ) ) == 0 &&
        listen( s, 16 ) == 0 ) {
      g_qvr.port = try_port;
      bound = 1;
      break;
    }
    qvr_closesocket( s );
    s = QVR_INVALID_SOCKET;
  }

  if( !bound || s == QVR_INVALID_SOCKET ) {
    ui_error( UI_ERROR_ERROR, "Quest VR Broadcast: failed to bind HTTP port %d",
              requested_port );
    return 1;
  }

  g_qvr.listen_sock = s;
  if( g_qvr.jpeg_len == 0 ) {
    qvr_generate_standby_frame();
  }

  qvr_detect_lan_ip( lan_ip, sizeof( lan_ip ) );
  snprintf( g_qvr.url_buf, sizeof( g_qvr.url_buf ), "http://%s:%d/",
            lan_ip, g_qvr.port );
  snprintf( g_qvr.detail_buf, sizeof( g_qvr.detail_buf ), "On :%d", g_qvr.port );

  g_qvr.running = 1;
  settings_current.quest_vr = 1;
  settings_current.quest_vr_port = g_qvr.port;

#ifdef WIN32
  g_qvr.encoder_thread = CreateThread( NULL, 0, qvr_encoder_thread_proc, NULL, 0, NULL );
  g_qvr.server_thread = CreateThread( NULL, 0, qvr_server_thread_proc, NULL, 0, NULL );
#else
  pthread_create( &g_qvr.encoder_thread, NULL, qvr_encoder_thread_proc, NULL );
  pthread_create( &g_qvr.server_thread, NULL, qvr_server_thread_proc, NULL );
#endif

  display_refresh_all();
  return 0;
}

void
quest_vr_stop( void )
{
  if( !g_qvr.running ) return;

  g_qvr.running = 0;
  if( g_qvr.listen_sock != QVR_INVALID_SOCKET ) {
    qvr_closesocket( g_qvr.listen_sock );
    g_qvr.listen_sock = QVR_INVALID_SOCKET;
  }

#ifdef WIN32
  if( g_qvr.server_thread ) {
    WaitForSingleObject( g_qvr.server_thread, 1500 );
    CloseHandle( g_qvr.server_thread );
    g_qvr.server_thread = NULL;
  }
  if( g_qvr.encoder_thread ) {
    WaitForSingleObject( g_qvr.encoder_thread, 1500 );
    CloseHandle( g_qvr.encoder_thread );
    g_qvr.encoder_thread = NULL;
  }
#else
  pthread_join( g_qvr.server_thread, NULL );
  pthread_join( g_qvr.encoder_thread, NULL );
#endif

  snprintf( g_qvr.detail_buf, sizeof( g_qvr.detail_buf ), "Off" );
}

int
quest_vr_toggle( void )
{
  if( g_qvr.running ) {
    quest_vr_stop();
    settings_current.quest_vr = 0;
    return 0;
  }
  return quest_vr_start( settings_current.quest_vr_port );
}

int
quest_vr_is_running( void )
{
  return g_qvr.running;
}

int
quest_vr_get_port( void )
{
  return g_qvr.port;
}

void
quest_vr_set_target_fps( int fps )
{
  if( fps < 5 ) fps = 5;
  if( fps > 120 ) fps = 120;
  g_qvr.target_fps = fps;
}

int
quest_vr_get_target_fps( void )
{
  return g_qvr.target_fps;
}

void
quest_vr_set_jpeg_quality( int quality )
{
  if( quality < 20 ) quality = 20;
  if( quality > 98 ) quality = 98;
  g_qvr.jpeg_quality = quality;
}

int
quest_vr_get_jpeg_quality( void )
{
  return g_qvr.jpeg_quality;
}

void
quest_vr_set_stereo_mode( quest_vr_stereo_mode mode )
{
  if( mode < QUEST_VR_MODE_2D || mode > QUEST_VR_MODE_ANAGLYPH_3D )
    mode = QUEST_VR_MODE_2D;
  g_qvr.stereo_mode = mode;
}

quest_vr_stereo_mode
quest_vr_get_stereo_mode( void )
{
  return g_qvr.stereo_mode;
}

const char *
quest_vr_get_url( void )
{
  return g_qvr.url_buf;
}

const char *
quest_vr_get_status_detail( void )
{
  return g_qvr.running ? g_qvr.detail_buf : "Off";
}

unsigned long
quest_vr_get_frame_count( void )
{
  return g_qvr.frame_seq;
}

int
quest_vr_get_client_count( void )
{
  return g_qvr.active_clients;
}

float
quest_vr_get_stream_fps( void )
{
  return g_qvr.measured_fps;
}

int
quest_vr_open_browser( void )
{
  if( !g_qvr.running ) {
    if( quest_vr_start( settings_current.quest_vr_port ) != 0 ) return 1;
  }
#ifdef WIN32
  ShellExecuteA( NULL, "open", g_qvr.url_buf, NULL, NULL, SW_SHOWNORMAL );
  return 0;
#else
  char cmd[256];
  snprintf( cmd, sizeof( cmd ), "xdg-open \"%s\" >/dev/null 2>&1 &", g_qvr.url_buf );
  return system( cmd );
#endif
}

int
quest_vr_copy_url_to_clipboard( void )
{
  if( !g_qvr.running ) {
    quest_vr_start( settings_current.quest_vr_port );
  }
#ifdef WIN32
  if( OpenClipboard( NULL ) ) {
    size_t len = strlen( g_qvr.url_buf ) + 1;
    HGLOBAL hMem = GlobalAlloc( GMEM_MOVEABLE, len );
    if( hMem ) {
      void *ptr = GlobalLock( hMem );
      if( ptr ) {
        memcpy( ptr, g_qvr.url_buf, len );
        GlobalUnlock( hMem );
        EmptyClipboard();
        SetClipboardData( CF_TEXT, hMem );
      } else {
        GlobalFree( hMem );
      }
    }
    CloseClipboard();
    return 0;
  }
#endif
  return 1;
}

void
quest_vr_apply_settings( void )
{
  if( settings_current.quest_vr_port > 0 && settings_current.quest_vr_port <= 65535 )
    g_qvr.port = settings_current.quest_vr_port;

  if( settings_current.quest_vr && !g_qvr.running ) {
    quest_vr_start( g_qvr.port );
  } else if( !settings_current.quest_vr && g_qvr.running ) {
    quest_vr_stop();
  }
}

void
quest_vr_submit_bgra32( const void *pixels, int width, int height, int pitch )
{
  uint64_t now, min_interval;
  size_t need;
  int x, y;

  if( !g_qvr.running || !pixels || width <= 0 || height <= 0 || pitch <= 0 )
    return;

  now = qvr_now_ms();
  min_interval = ( g_qvr.target_fps > 0 ) ? (uint64_t)( 1000 / g_qvr.target_fps ) : 20;
  if( g_qvr.frame_seq > 1 && ( now - g_qvr.last_submit_ms ) < min_interval )
    return;
  g_qvr.last_submit_ms = now;

  need = (size_t)width * (size_t)height * 3;
  qvr_lock_raw();
  if( g_qvr.raw_cap < need ) {
    uint8_t *nb = (uint8_t *)realloc( g_qvr.raw_rgb, need );
    if( nb ) { g_qvr.raw_rgb = nb; g_qvr.raw_cap = need; }
  }
  if( g_qvr.raw_rgb && g_qvr.raw_cap >= need ) {
    uint8_t *dst = g_qvr.raw_rgb;
    for( y = 0; y < height; y++ ) {
      const uint8_t *src = (const uint8_t *)pixels + (size_t)y * (size_t)pitch;
      for( x = 0; x < width; x++ ) {
        dst[0] = src[2]; /* R */
        dst[1] = src[1]; /* G */
        dst[2] = src[0]; /* B */
        dst += 3;
        src += 4;
      }
    }
    g_qvr.raw_width = width;
    g_qvr.raw_height = height;
    g_qvr.raw_dirty = 1;
  }
  qvr_unlock_raw();
}

void
quest_vr_submit_rgb565( const void *pixels, int width, int height, int pitch )
{
  uint64_t now, min_interval;
  size_t need;
  int x, y;

  if( !g_qvr.running || !pixels || width <= 0 || height <= 0 || pitch <= 0 )
    return;

  now = qvr_now_ms();
  min_interval = ( g_qvr.target_fps > 0 ) ? (uint64_t)( 1000 / g_qvr.target_fps ) : 20;
  if( g_qvr.frame_seq > 1 && ( now - g_qvr.last_submit_ms ) < min_interval )
    return;
  g_qvr.last_submit_ms = now;

  need = (size_t)width * (size_t)height * 3;
  qvr_lock_raw();
  if( g_qvr.raw_cap < need ) {
    uint8_t *nb = (uint8_t *)realloc( g_qvr.raw_rgb, need );
    if( nb ) { g_qvr.raw_rgb = nb; g_qvr.raw_cap = need; }
  }
  if( g_qvr.raw_rgb && g_qvr.raw_cap >= need ) {
    uint8_t *dst = g_qvr.raw_rgb;
    for( y = 0; y < height; y++ ) {
      const uint16_t *src = (const uint16_t *)( (const uint8_t *)pixels + (size_t)y * (size_t)pitch );
      for( x = 0; x < width; x++ ) {
        uint16_t px = src[x];
        uint8_t r5 = (uint8_t)( ( px >> 11 ) & 0x1f );
        uint8_t g6 = (uint8_t)( ( px >> 5 ) & 0x3f );
        uint8_t b5 = (uint8_t)( px & 0x1f );
        dst[0] = (uint8_t)( ( r5 << 3 ) | ( r5 >> 2 ) );
        dst[1] = (uint8_t)( ( g6 << 2 ) | ( g6 >> 4 ) );
        dst[2] = (uint8_t)( ( b5 << 3 ) | ( b5 >> 2 ) );
        dst += 3;
      }
    }
    g_qvr.raw_width = width;
    g_qvr.raw_height = height;
    g_qvr.raw_dirty = 1;
  }
  qvr_unlock_raw();
}

/* ============================================================================
 * Native Win32 FuseXR Dropdown Menus & Interactive Desktop Studio Windows
 * ============================================================================ */

#ifdef WIN32

#define IDM_FXR_RANDOM_ANY         40001
#define IDM_FXR_RANDOM_Z80         40002
#define IDM_FXR_RANDOM_TAP         40003
#define IDM_FXR_RANDOM_DSK         40004
#define IDM_FXR_RANDOM_TRD         40005
#define IDM_FXR_RANDOM_TZX         40006
#define IDM_FXR_RANDOM_LOCAL       40007
#define IDM_FXR_TOSEC_SEARCH_DLG   40008
#define IDM_FXR_DICE_BTN           40009
#define IDM_FXR_ONLINE_RANDOM_ANY  40010
#define IDM_FXR_ONLINE_IA_TOSEC    40011
#define IDM_FXR_ONLINE_IA_LIB      40012
#define IDM_FXR_ONLINE_VTRDOS      40013
#define IDM_FXR_ONLINE_FMT_Z80     40014
#define IDM_FXR_ONLINE_FMT_TAP     40015
#define IDM_FXR_ONLINE_FMT_DSK     40016
#define IDM_FXR_ONLINE_FMT_TRD     40017
#define IDM_FXR_ONLINE_FMT_TZX     40018
#define IDM_FXR_ONLINE_TOGGLE_DICE 40019

#define IDM_FXR_ARCHIVE_IA_LIB     40020
#define IDM_FXR_ARCHIVE_IA_WOS     40021
#define IDM_FXR_ARCHIVE_IA_Z80     40022
#define IDM_FXR_ARCHIVE_ZXDB       40023
#define IDM_FXR_ARCHIVE_WOS        40024
#define IDM_FXR_ARCHIVE_TIPSHOP    40025
#define IDM_FXR_ARCHIVE_VTRDOS     40026
#define IDM_FXR_OPEN_DOWNLOADS_DIR 40029

#define IDM_FXR_CHEAT_AUTO        40040
#define IDM_FXR_CHEAT_STUDIO_DLG  40041
#define IDM_FXR_CHEAT_LOAD_POK    40042
#define IDM_FXR_CHEAT_POKEMEM_UI  40043
#define IDM_FXR_CHEAT_PF_UI       40044
#define IDM_FXR_CHEAT_CLEAR_ALL   40045
#define IDM_FXR_CHEAT_CURATED_0   40100 /* 40100 .. 40139 */

#define IDM_FXR_MACH_128          40200
#define IDM_FXR_MACH_PLUS3        40201
#define IDM_FXR_MACH_PLUS2        40202
#define IDM_FXR_MACH_48           40203
#define IDM_FXR_MACH_PENTAGON     40204
#define IDM_FXR_MACH_SCORPION     40205

#define IDM_FXR_FILT_TV2X         40220
#define IDM_FXR_FILT_TV3X         40221
#define IDM_FXR_FILT_PALTV        40222
#define IDM_FXR_FILT_NORMAL       40223
#define IDM_FXR_FILT_2X           40224
#define IDM_FXR_FILT_3X           40225
#define IDM_FXR_FILT_SUPEREAGLE   40226
#define IDM_FXR_FILT_ADVMAME2X    40227
#define IDM_FXR_FILT_ADVMAME3X    40228
#define IDM_FXR_FILT_PALTV3X      40229
#define IDM_FXR_FILT_DOTMATRIX    40230
#define IDM_FXR_FILT_HQ3X         40231

#define IDM_FXR_JOY_KEMPSTON      40240
#define IDM_FXR_JOY_CURSOR        40241
#define IDM_FXR_JOY_SINCLAIR1     40242
#define IDM_FXR_JOY_SINCLAIR2     40243
#define IDM_FXR_JOY_TIMEX1        40244

#define IDM_FXR_QUICK_TAPE_PLAY   40260
#define IDM_FXR_QUICK_TAPE_REWIND 40261
#define IDM_FXR_QUICK_TAPE_EJECT  40262
#define IDM_FXR_QUICK_RESET_SOFT  40263
#define IDM_FXR_QUICK_RESET_HARD  40264
#define IDM_FXR_QUICK_FULLSCREEN  40265

#define IDM_FXR_VR_TOGGLE         40280
#define IDM_FXR_VR_OPEN_BROWSER   40281
#define IDM_FXR_VR_COPY_URL       40282
#define IDM_FXR_VR_MODE_2D        40283
#define IDM_FXR_VR_MODE_SBS       40284
#define IDM_FXR_VR_MODE_TB        40285
#define IDM_FXR_VR_MODE_ANA       40286
#define IDM_FXR_VR_FPS_30         40287
#define IDM_FXR_VR_FPS_50         40288
#define IDM_FXR_VR_FPS_60         40289
#define IDM_FXR_VR_FPS_72         40290
#define IDM_FXR_VR_FPS_90         40291

#define IDM_FXR_LOCAL_GAME_BASE   41000 /* 41000 .. 41255 */

typedef struct fxr_poke_pair_t {
  int addr;
  int val;
} fxr_poke_pair_t;

typedef struct fxr_curated_cheat_t {
  const char *menu_label;
  const char *keyword;
  fxr_poke_pair_t pokes[3];
  int poke_count;
} fxr_curated_cheat_t;

static const fxr_curated_cheat_t g_fxr_cheats[] = {
  { "Manic Miner - Infinite Lives (POKE 35136,0)",             "manic",    { { 35136,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Jet Set Willy - Infinite Lives (POKE 35899,0)",           "willy",    { { 35899,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Chuckie Egg - Infinite Lives (POKE 42508,0)",             "chuckie",  { { 42508,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Knight Lore - Immunity / Infinite Lives (POKE 58165,201)","knight",   { { 58165, 201 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Sabre Wulf - Immunity / Infinite Lives (POKE 43222,0)",   "sabre",    { { 43222,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Atic Atac - Infinite Energy / Immunity (POKE 37479,0)",   "atic",     { { 37479,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Head Over Heels - Infinite Lives (POKE 44747,0)",         "heels",    { { 44747,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Target Renegade - Infinite P1 Energy (POKE 34955,0)",     "renegade", { { 34955,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Chase H.Q. - Infinite Time & Turbo (POKE 39535,0)",       "chase",    { { 39535,   0 }, { 61029, 9 }, { 0, 0 } }, 2 },
  { "R-Type - Infinite Lives & Invincibility (POKE 36709,0)",  "r-type",   { { 36709,   0 }, { 37282, 0 }, { 0, 0 } }, 2 },
  { "Rainbow Islands - Infinite Lives (POKE 41892,0)",         "rainbow",  { { 41892,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Robocop - Infinite Lives (POKE 39812,0)",                 "robocop",  { { 39812,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Exolon - Infinite Lives & Ammo (POKE 33378,0 + 30633,0)", "exolon",   { { 33378,   0 }, { 30633, 0 }, { 0, 0 } }, 2 },
  { "Bomb Jack - Infinite Lives (POKE 40620,0)",               "bomb",     { { 40620,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Cobra - Infinite Lives (POKE 36910,0)",                   "cobra",    { { 36910,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Green Beret - Infinite Lives (POKE 34597,0)",             "beret",    { { 34597,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Starquake - Infinite Lives (POKE 52398,0)",               "starquake",{ { 52398,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Dizzy - Infinite Lives (POKE 61213,0)",                   "dizzy",    { { 61213,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Monty on the Run - Infinite Lives (POKE 34766,0)",        "monty",    { { 34766,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
  { "Jetpac - Infinite Lives (POKE 36922,0)",                  "jetpac",   { { 36922,   0 }, { 0, 0 }, { 0, 0 } }, 1 },
};
#define FXR_CHEAT_COUNT ( (int)( sizeof( g_fxr_cheats ) / sizeof( g_fxr_cheats[0] ) ) )

static char g_fxr_local_games[256][128];
static int g_fxr_local_game_count = 0;
static char g_fxr_current_game[256] = "Sinclair BASIC";
static HWND g_fxr_main_hwnd = NULL;

typedef struct fxr_tosec_entry_t {
  char title[120];
  char full_path[320];
  char fmt[8];
} fxr_tosec_entry_t;

static fxr_tosec_entry_t *g_fxr_tosec = NULL;
static int g_fxr_tosec_count = 0;
static int g_fxr_tosec_cap = 0;
static int g_fxr_tosec_indexed = 0;
static int g_fxr_local_tosec_found = 0;
static int g_fxr_force_online_dice = 1;
static int g_fxr_suppress_ui_error = 0;
static int g_fxr_fullscreen = 0;
static HMENU g_fxr_saved_menu = NULL;
static LONG g_fxr_saved_style = 0;
static WINDOWPLACEMENT g_fxr_saved_wp = { sizeof( WINDOWPLACEMENT ) };
static HMENU g_fxr_hSubCloud = NULL;
static HMENU g_fxr_hSubFilt = NULL;
static HMENU g_fxr_hSubJoy = NULL;
static int g_fxr_locked_scaler = -1;
static HBITMAP g_fxr_dice_bmp = NULL;

int
quest_vr_should_suppress_error( void )
{
  return quest_vr_is_running() || g_fxr_suppress_ui_error;
}

int
quest_vr_is_fullscreen( void )
{
  return g_fxr_fullscreen;
}

int
quest_vr_get_locked_scaler( void )
{
  return g_fxr_locked_scaler;
}

void
quest_vr_notify_scaler_changed( int scaler )
{
  if( scaler < 0 || scaler >= (int)SCALER_NUM ) return;
  g_fxr_locked_scaler = scaler;
#ifdef WIN32
  if( g_fxr_hSubFilt ) {
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_TV2X,       MF_BYCOMMAND | ( scaler == (int)SCALER_TV2X       ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_TV3X,       MF_BYCOMMAND | ( ( scaler == (int)SCALER_TV3X || scaler == (int)SCALER_TV4X ) ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_PALTV,      MF_BYCOMMAND | ( scaler == (int)SCALER_PALTV2X    ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_PALTV3X,    MF_BYCOMMAND | ( ( scaler == (int)SCALER_PALTV3X || scaler == (int)SCALER_PALTV4X ) ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_DOTMATRIX,  MF_BYCOMMAND | ( scaler == (int)SCALER_DOTMATRIX  ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_HQ3X,       MF_BYCOMMAND | ( ( scaler == (int)SCALER_HQ2X || scaler == (int)SCALER_HQ3X || scaler == (int)SCALER_HQ4X ) ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_NORMAL,     MF_BYCOMMAND | ( scaler == (int)SCALER_NORMAL     ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_2X,         MF_BYCOMMAND | ( scaler == (int)SCALER_DOUBLESIZE ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_3X,         MF_BYCOMMAND | ( ( scaler == (int)SCALER_TRIPLESIZE || scaler == (int)SCALER_QUADSIZE ) ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_SUPEREAGLE, MF_BYCOMMAND | ( scaler == (int)SCALER_SUPEREAGLE ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_ADVMAME2X,  MF_BYCOMMAND | ( scaler == (int)SCALER_ADVMAME2X  ? MF_CHECKED : MF_UNCHECKED ) );
    CheckMenuItem( g_fxr_hSubFilt, IDM_FXR_FILT_ADVMAME3X,  MF_BYCOMMAND | ( scaler == (int)SCALER_ADVMAME3X  ? MF_CHECKED : MF_UNCHECKED ) );
  }
  if( g_qvr.base_dir[0] ) {
    char cfg_path[512];
    FILE *fp;
    snprintf( cfg_path, sizeof( cfg_path ), "%s/games/_fxr_scaler.cfg", g_qvr.base_dir );
    fp = fopen( cfg_path, "wb" );
    if( fp ) {
      fprintf( fp, "%d\n", scaler );
      fclose( fp );
    }
  }
#endif
}

void
quest_vr_on_mouse_move( void *hWnd_ptr, int x, int y )
{
#ifdef WIN32
  HWND hWnd = (HWND)hWnd_ptr;
  (void)x;
  if( !g_fxr_fullscreen || !hWnd || !g_fxr_saved_menu ) return;

  if( y <= 14 && GetMenu( hWnd ) == NULL ) {
    SetMenu( hWnd, g_fxr_saved_menu );
    DrawMenuBar( hWnd );
    InvalidateRect( hWnd, NULL, TRUE );
  } else if( y > 48 && GetMenu( hWnd ) != NULL ) {
    SetMenu( hWnd, NULL );
    InvalidateRect( hWnd, NULL, TRUE );
  }
#else
  (void)hWnd_ptr;
  (void)x;
  (void)y;
#endif
}

void
quest_vr_toggle_fullscreen( void *hWnd_ptr )
{
#ifdef WIN32
  HWND hWnd = (HWND)hWnd_ptr;
  HWND hStat;
  if( !hWnd ) hWnd = g_fxr_main_hwnd;
  if( !hWnd ) return;
  hStat = FindWindowExA( hWnd, NULL, "msctls_statusbar32", NULL );

  if( !g_fxr_fullscreen ) {
    MONITORINFO mi;
    mi.cbSize = sizeof( mi );
    if( !GetMonitorInfoA( MonitorFromWindow( hWnd, MONITOR_DEFAULTTONEAREST ), &mi ) )
      return;

    g_fxr_saved_style = GetWindowLongA( hWnd, GWL_STYLE );
    GetWindowPlacement( hWnd, &g_fxr_saved_wp );
    if( GetMenu( hWnd ) ) g_fxr_saved_menu = GetMenu( hWnd );
    if( g_fxr_saved_menu ) SetMenu( hWnd, NULL );
    if( hStat ) ShowWindow( hStat, SW_HIDE );

    g_fxr_fullscreen = 1;
    SetWindowLongA( hWnd, GWL_STYLE,
                    ( g_fxr_saved_style & ~WS_OVERLAPPEDWINDOW ) | WS_POPUP | WS_VISIBLE | WS_CLIPCHILDREN );
    SetWindowPos( hWnd, HWND_TOP,
                  mi.rcMonitor.left, mi.rcMonitor.top,
                  mi.rcMonitor.right - mi.rcMonitor.left,
                  mi.rcMonitor.bottom - mi.rcMonitor.top,
                  SWP_NOOWNERZORDER | SWP_FRAMECHANGED );
    InvalidateRect( hWnd, NULL, TRUE );
  } else {
    g_fxr_fullscreen = 0;
    if( g_fxr_saved_menu ) {
      SetMenu( hWnd, g_fxr_saved_menu );
    }
    if( hStat && settings_current.statusbar ) {
      ShowWindow( hStat, SW_SHOW );
    }
    SetWindowLongA( hWnd, GWL_STYLE, g_fxr_saved_style );
    SetWindowPlacement( hWnd, &g_fxr_saved_wp );
    SetWindowPos( hWnd, NULL, 0, 0, 0, 0,
                  SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_NOOWNERZORDER | SWP_FRAMECHANGED );
    DrawMenuBar( hWnd );
    InvalidateRect( hWnd, NULL, TRUE );
  }
#else
  (void)hWnd_ptr;
#endif
}

static void
fxr_update_window_title( const char *status_suffix )
{
  char buf[384];
  if( !g_fxr_main_hwnd ) return;
  if( status_suffix && status_suffix[0] ) {
    snprintf( buf, sizeof( buf ), "FuseXR 1.10.0 - %s [%s]", g_fxr_current_game, status_suffix );
  } else {
    snprintf( buf, sizeof( buf ), "FuseXR 1.10.0 - %s", g_fxr_current_game );
  }
  SetWindowTextA( g_fxr_main_hwnd, buf );
}

/* ============================================================================
 * 16x16 3D Emerald-Green Casino Die Icon (GDI DIB Section) for Top Menu Bar
 * ============================================================================ */

static HBITMAP
fxr_get_dice_bitmap( void )
{
  if( g_fxr_dice_bmp ) return g_fxr_dice_bmp;

  BITMAPINFO bmi;
  void *bits = NULL;
  HDC hdc = GetDC( NULL );
  memset( &bmi, 0, sizeof( bmi ) );
  bmi.bmiHeader.biSize = sizeof( BITMAPINFOHEADER );
  bmi.bmiHeader.biWidth = 16;
  bmi.bmiHeader.biHeight = -16; /* top-down */
  bmi.bmiHeader.biPlanes = 1;
  bmi.bmiHeader.biBitCount = 32;
  bmi.bmiHeader.biCompression = BI_RGB;

  g_fxr_dice_bmp = CreateDIBSection( hdc, &bmi, DIB_RGB_COLORS, &bits, NULL, 0 );
  ReleaseDC( NULL, hdc );

  if( g_fxr_dice_bmp && bits ) {
    uint32_t *px = (uint32_t *)bits;
    int x, y;
    for( y = 0; y < 16; y++ ) {
      for( x = 0; x < 16; x++ ) {
        /* Rounded 14x14 die body inside 16x16 canvas */
        if( x < 1 || x > 14 || y < 1 || y > 14 ) {
          px[y * 16 + x] = 0x00000000;
          continue;
        }
        if( ( x == 1 || x == 14 ) && ( y == 1 || y == 14 ) ) {
          px[y * 16 + x] = 0x00000000;
          continue;
        }
        /* Outer dark emerald border */
        if( x == 1 || x == 14 || y == 1 || y == 14 ||
            ( ( x == 2 || x == 13 ) && ( y == 2 || y == 13 ) ) ) {
          px[y * 16 + x] = 0xFF047857;
          continue;
        }
        /* Top/left 3D specular highlight vs bottom/right shadow bevel */
        if( x == 2 || y == 2 ) {
          px[y * 16 + x] = 0xFF34D399;
        } else if( x == 13 || y == 13 ) {
          px[y * 16 + x] = 0xFF059669;
        } else {
          px[y * 16 + x] = 0xFF10B981;
        }
      }
    }
    /* Draw 5 crisp white 2x2 pips (classic '5' casino die face) */
    const int pips[5][2] = { { 4, 4 }, { 10, 4 }, { 7, 7 }, { 4, 10 }, { 10, 10 } };
    int p;
    for( p = 0; p < 5; p++ ) {
      int px0 = pips[p][0], py0 = pips[p][1];
      px[( py0 + 0 ) * 16 + ( px0 + 0 )] = 0xFFFFFFFF;
      px[( py0 + 0 ) * 16 + ( px0 + 1 )] = 0xFFFFFFFF;
      px[( py0 + 1 ) * 16 + ( px0 + 0 )] = 0xFFFFFFFF;
      px[( py0 + 1 ) * 16 + ( px0 + 1 )] = 0xFFFFFFFF;
    }
  }
  return g_fxr_dice_bmp;
}

/* ============================================================================
 * WinINet HTTPS Cloud Downloader & Legitimate Online Game File Hosts
 *   1. Internet Archive TOSEC Cloud (44,528 ZX Spectrum files via HTTP Range)
 *   2. Internet Archive ZX Spectrum Software Library (12,305 .Z80 Snapshots)
 *   3. Virtual TR-DOS (https://vtrd.in Pentagon 128 .TRD / .SCL Full Games)
 * ============================================================================ */

static void
fxr_ensure_downloads_dir( char *out_dir, size_t cap )
{
  if( !g_qvr.initialized ) quest_vr_init();
  snprintf( out_dir, cap, "%s/games", g_qvr.base_dir );
  CreateDirectoryA( out_dir, NULL );
  snprintf( out_dir, cap, "%s/games/downloads", g_qvr.base_dir );
  CreateDirectoryA( out_dir, NULL );
}

static void
fxr_sanitize_filename( const char *in, char *out, size_t cap )
{
  size_t i = 0, j = 0;
  while( in[i] && j + 1 < cap ) {
    unsigned char c = (unsigned char)in[i++];
    if( c == '/' || c == '\\' || c == ':' || c == '*' ||
        c == '?' || c == '"' || c == '<' || c == '>' || c == '|' ) {
      out[j++] = '_';
    } else {
      out[j++] = (char)c;
    }
  }
  out[j] = '\0';
}

static void
fxr_url_encode_component( const char *in, char *out, size_t cap )
{
  static const char hex[] = "0123456789ABCDEF";
  size_t i = 0, j = 0;
  while( in[i] && j + 4 < cap ) {
    unsigned char c = (unsigned char)in[i++];
    if( ( c >= 'A' && c <= 'Z' ) || ( c >= 'a' && c <= 'z' ) ||
        ( c >= '0' && c <= '9' ) || c == '-' || c == '_' || c == '.' || c == '~' ) {
      out[j++] = (char)c;
    } else {
      out[j++] = '%';
      out[j++] = hex[( c >> 4 ) & 0x0F];
      out[j++] = hex[c & 0x0F];
    }
  }
  out[j] = '\0';
}

static int
fxr_http_get_buffer( const char *url, const char *extra_headers,
                     char *out_buf, size_t out_cap, size_t *out_len )
{
  HINTERNET hNet, hUrl;
  DWORD timeout_ms = 8000;
  DWORD status = 0, status_len = sizeof( status );
  size_t total = 0;

  if( out_len ) *out_len = 0;
  if( !url || !out_buf || out_cap < 16 ) return 0;

  hNet = InternetOpenA( "FuseXR/1.10.0 (ZX Spectrum Studio)",
                        INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0 );
  if( !hNet ) return 0;

  InternetSetOptionA( hNet, INTERNET_OPTION_CONNECT_TIMEOUT, &timeout_ms, sizeof( timeout_ms ) );
  InternetSetOptionA( hNet, INTERNET_OPTION_RECEIVE_TIMEOUT, &timeout_ms, sizeof( timeout_ms ) );

  hUrl = InternetOpenUrlA(
    hNet, url, extra_headers, extra_headers ? (DWORD)-1L : 0,
    INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE, 0 );
  if( !hUrl ) {
    InternetCloseHandle( hNet );
    return 0;
  }

  if( HttpQueryInfoA( hUrl, HTTP_QUERY_STATUS_CODE | HTTP_QUERY_FLAG_NUMBER,
                      &status, &status_len, NULL ) ) {
    if( status != 200 && status != 206 ) {
      InternetCloseHandle( hUrl );
      InternetCloseHandle( hNet );
      return 0;
    }
  }

  while( total + 1 < out_cap ) {
    DWORD chunk = (DWORD)( ( out_cap - 1 - total ) > 16384 ? 16384 : ( out_cap - 1 - total ) );
    DWORD got = 0;
    if( !InternetReadFile( hUrl, out_buf + total, chunk, &got ) || got == 0 ) break;
    total += (size_t)got;
  }
  out_buf[total] = '\0';
  if( out_len ) *out_len = total;

  InternetCloseHandle( hUrl );
  InternetCloseHandle( hNet );
  return ( total > 0 ) ? 1 : 0;
}

static int
fxr_http_download_file( const char *url, const char *dest_path )
{
  size_t cap = 2 * 1024 * 1024; /* 2 MB max buffer for ZX Spectrum games */
  char *buf = (char *)malloc( cap );
  size_t len = 0;
  FILE *fp;

  if( !buf ) return 0;
  if( !fxr_http_get_buffer( url, NULL, buf, cap, &len ) || len < 128 ) {
    free( buf );
    return 0;
  }

  /* Reject HTML error pages */
  if( !strncasecmp( buf, "<!doctype", 9 ) || !strncasecmp( buf, "<html", 5 ) ) {
    free( buf );
    return 0;
  }

  fp = fopen( dest_path, "wb" );
  if( !fp ) {
    free( buf );
    return 0;
  }
  fwrite( buf, 1, len, fp );
  fclose( fp );
  free( buf );
  return 1;
}

static uint64_t
fxr_next_rand( void )
{
  static uint64_t rng = 0x9e3779b97f4a7c15ULL;
  rng ^= qvr_now_ms() + (uint64_t)GetTickCount() * 0x517cc1b727220a95ULL;
  rng ^= rng >> 12;
  rng ^= rng << 25;
  rng ^= rng >> 27;
  return rng * 0x2545f4914f6cdd1dULL;
}

static int fxr_load_file_direct( const char *full_path, const char *display_name, const char *fmt_hint );

/* Host 1: Internet Archive TOSEC 44,528-file Cloud Archive via HTTP Range Slice */
static int
fxr_online_random_ia_tosec( const char *fmt_filter )
{
  typedef struct { const char *fmt; long start_b; long end_b; } tosec_range_t;
  static const tosec_range_t ranges[] = {
    { "z80", 2132776L, 3275000L },
    { "tap", 3417433L, 4028000L },
    { "dsk",  415012L,  526000L },
    { "trd", 3349987L, 3401000L },
    { "tzx",  534860L, 2099000L }
  };
  int r_idx = 0;
  uint64_t rv = fxr_next_rand();

  if( fmt_filter && fmt_filter[0] ) {
    int i;
    for( i = 0; i < 5; i++ ) {
      if( !strcasecmp( fmt_filter, ranges[i].fmt ) ) {
        r_idx = i;
        break;
      }
    }
  } else {
    /* Weighted random across instant-boot Z80 (45%), TAP (30%), +3 DSK (15%), Pentagon TRD (10%) */
    int pick = (int)( rv % 100 );
    if( pick < 45 )      r_idx = 0; /* z80 */
    else if( pick < 75 ) r_idx = 1; /* tap */
    else if( pick < 90 ) r_idx = 2; /* dsk */
    else                 r_idx = 3; /* trd */
  }

  long span = ranges[r_idx].end_b - ranges[r_idx].start_b;
  if( span < 4096 ) span = 4096;
  long offset = ranges[r_idx].start_b + (long)( ( rv >> 8 ) % (uint64_t)span );

  char range_hdr[128];
  snprintf( range_hdr, sizeof( range_hdr ), "Range: bytes=%ld-%ld\r\n", offset, offset + 12287L );

  char *slice = (char *)malloc( 16384 );
  if( !slice ) return 0;

  size_t slice_len = 0;
  const char *idx_url = "https://archive.org/download/Sinclair_ZX_Spectrum_TOSEC_2012_04_23/Sinclair_ZX_Spectrum_TOSEC_2012_04_23.txt";
  if( !fxr_http_get_buffer( idx_url, range_hdr, slice, 16384, &slice_len ) || slice_len < 64 ) {
    free( slice );
    return 0;
  }

  /* Extract all complete "Sinclair ZX Spectrum [TOSEC]/Games/...zip" paths in this slice */
  char candidates[64][280];
  int cand_count = 0;
  char *line = slice;
  while( line && *line && cand_count < 64 ) {
    char *eol = strchr( line, '\n' );
    if( !eol ) break; /* skip partial trailing line */
    *eol = '\0';
    char *p = strstr( line, "Sinclair ZX Spectrum [TOSEC]/Games/[" );
    char *z = p ? strstr( p, ".zip" ) : NULL;
    if( p && z ) {
      z[4] = '\0';
      snprintf( candidates[cand_count++], sizeof( candidates[0] ), "%s", p );
    }
    line = eol + 1;
  }
  free( slice );

  if( cand_count <= 0 ) return 0;

  int attempt;
  int start_idx = (int)( fxr_next_rand() % (uint64_t)cand_count );
  for( attempt = 0; attempt < 4 && attempt < cand_count; attempt++ ) {
    const char *chosen = candidates[( start_idx + attempt * 7 ) % cand_count];
    const char *slash = strrchr( chosen, '/' );
    const char *raw_fname = slash ? ( slash + 1 ) : chosen;

    char encoded_inner[1024];
    fxr_url_encode_component( chosen, encoded_inner, sizeof( encoded_inner ) );

    char dl_url[1400];
    snprintf( dl_url, sizeof( dl_url ),
      "https://archive.org/download/Sinclair_ZX_Spectrum_TOSEC_2012_04_23/Sinclair_ZX_Spectrum_TOSEC_2012_04_23.zip/%s",
      encoded_inner );

    char dl_dir[512], clean_fname[256], dest_path[768], title[256];
    fxr_ensure_downloads_dir( dl_dir, sizeof( dl_dir ) );
    fxr_sanitize_filename( raw_fname, clean_fname, sizeof( clean_fname ) );
    snprintf( dest_path, sizeof( dest_path ), "%s/%s", dl_dir, clean_fname );

    snprintf( title, sizeof( title ), "%s", raw_fname );
    char *zext = strstr( title, ".zip" );
    if( zext ) *zext = '\0';

    fxr_update_window_title( "Downloading from Internet Archive TOSEC Cloud..." );
    if( !fxr_http_download_file( dl_url, dest_path ) ) continue;

    if( fxr_load_file_direct( dest_path, title, ranges[r_idx].fmt ) ) {
      fxr_update_window_title( "Cloud: IA TOSEC 44k" );
      return 1;
    }
  }
  return 0;
}

/* Host 2: Internet Archive 12,305 ZX Spectrum Software Library (.Z80 Snapshots) */
static int
fxr_online_random_ia_softlib( void )
{
  char search_url[512];
  char json_buf[8192];
  size_t json_len = 0;
  int page = 1 + (int)( fxr_next_rand() % 11500ULL );

  snprintf( search_url, sizeof( search_url ),
    "https://archive.org/advancedsearch.php?q=collection:softwarelibrary_zx_spectrum&fl[]=identifier,title&rows=1&page=%d&output=json",
    page );

  fxr_update_window_title( "Querying Internet Archive ZX Spectrum Library..." );
  if( !fxr_http_get_buffer( search_url, NULL, json_buf, sizeof( json_buf ), &json_len ) )
    return 0;

  /* Parse "identifier":"..." and "title":"..." */
  char *id_key = strstr( json_buf, "\"identifier\":\"" );
  if( !id_key ) return 0;
  id_key += 14;
  char *id_end = strchr( id_key, '"' );
  if( !id_end ) return 0;
  char identifier[160] = { 0 };
  size_t id_len = (size_t)( id_end - id_key );
  if( id_len >= sizeof( identifier ) ) id_len = sizeof( identifier ) - 1;
  memcpy( identifier, id_key, id_len );

  char title[160] = { 0 };
  char *t_key = strstr( id_end + 1, "\"title\":\"" );
  if( t_key ) {
    t_key += 9;
    char *t_end = strchr( t_key, '"' );
    if( t_end ) {
      size_t t_len = (size_t)( t_end - t_key );
      if( t_len >= sizeof( title ) ) t_len = sizeof( title ) - 1;
      memcpy( title, t_key, t_len );
    }
  }
  if( !title[0] ) snprintf( title, sizeof( title ), "%s", identifier );

  /* Query /metadata/<identifier>/files to find the .z80/.sna/.tap/.dsk file */
  char meta_url[512];
  snprintf( meta_url, sizeof( meta_url ), "https://archive.org/metadata/%s/files", identifier );

  char *meta_buf = (char *)malloc( 65536 );
  if( !meta_buf ) return 0;
  size_t meta_len = 0;
  if( !fxr_http_get_buffer( meta_url, NULL, meta_buf, 65536, &meta_len ) ) {
    free( meta_buf );
    return 0;
  }

  char file_name[256] = { 0 };
  char file_fmt[16] = "z80";
  char *scan = meta_buf;
  while( ( scan = strstr( scan, "\"name\":\"" ) ) != NULL ) {
    scan += 8;
    char *f_end = strchr( scan, '"' );
    if( !f_end ) break;
    size_t flen = (size_t)( f_end - scan );
    if( flen > 4 && flen < sizeof( file_name ) ) {
      char cand[256];
      memcpy( cand, scan, flen );
      cand[flen] = '\0';
      const char *dot = strrchr( cand, '.' );
      if( dot && ( !strcasecmp( dot, ".z80" ) || !strcasecmp( dot, ".sna" ) ||
                   !strcasecmp( dot, ".tap" ) || !strcasecmp( dot, ".dsk" ) ||
                   !strcasecmp( dot, ".trd" ) || !strcasecmp( dot, ".tzx" ) ) ) {
        snprintf( file_name, sizeof( file_name ), "%s", cand );
        snprintf( file_fmt, sizeof( file_fmt ), "%s", dot + 1 );
        break;
      }
    }
    scan = f_end + 1;
  }
  free( meta_buf );

  if( !file_name[0] ) return 0;

  char enc_file[512], dl_url[1024], dl_dir[512], clean_fn[256], dest_path[768];
  fxr_url_encode_component( file_name, enc_file, sizeof( enc_file ) );
  snprintf( dl_url, sizeof( dl_url ), "https://archive.org/download/%s/%s", identifier, enc_file );

  fxr_ensure_downloads_dir( dl_dir, sizeof( dl_dir ) );
  fxr_sanitize_filename( file_name, clean_fn, sizeof( clean_fn ) );
  snprintf( dest_path, sizeof( dest_path ), "%s/%s", dl_dir, clean_fn );

  fxr_update_window_title( "Downloading from IA ZX Spectrum Library..." );
  if( !fxr_http_download_file( dl_url, dest_path ) ) return 0;

  if( !fxr_load_file_direct( dest_path, title, file_fmt ) ) return 0;
  fxr_update_window_title( "Cloud: IA Software Library" );
  return 1;
}

/* Host 3: Virtual TR-DOS (https://vtrd.in) Pentagon 128 Full Disk Games */
static int
fxr_online_random_vtrdos( void )
{
  static const char letters[] = "1abcdefghijklmnopqrstuvwxyz";
  char letter = letters[(int)( fxr_next_rand() % ( sizeof( letters ) - 1 ) )];
  char list_url[256];
  snprintf( list_url, sizeof( list_url ), "https://vtrd.in/games.php?t=full_ver&l=%c", letter );

  char *html = (char *)malloc( 131072 );
  if( !html ) return 0;
  size_t html_len = 0;

  fxr_update_window_title( "Querying Virtual TR-DOS Archive (vtrd.in)..." );
  if( !fxr_http_get_buffer( list_url, NULL, html, 131072, &html_len ) || html_len < 128 ) {
    free( html );
    return 0;
  }

  char links[128][128];
  int link_count = 0;
  char *p = html;
  while( ( p = strstr( p, "href=\"/full_ver/" ) ) != NULL && link_count < 128 ) {
    p += 16; /* skip href="/full_ver/ */
    char *q = strchr( p, '"' );
    if( !q ) break;
    size_t len = (size_t)( q - p );
    if( len > 4 && len < sizeof( links[0] ) ) {
      memcpy( links[link_count], p, len );
      links[link_count][len] = '\0';
      if( strstr( links[link_count], ".zip" ) || strstr( links[link_count], ".ZIP" ) ) {
        link_count++;
      }
    }
    p = q + 1;
  }
  free( html );

  if( link_count <= 0 ) return 0;

  const char *chosen = links[(int)( fxr_next_rand() % (uint64_t)link_count )];
  char dl_url[512], dl_dir[512], clean_fn[256], dest_path[768];
  snprintf( dl_url, sizeof( dl_url ), "https://vtrd.in/full_ver/%s", chosen );

  fxr_ensure_downloads_dir( dl_dir, sizeof( dl_dir ) );
  fxr_sanitize_filename( chosen, clean_fn, sizeof( clean_fn ) );
  snprintf( dest_path, sizeof( dest_path ), "%s/%s", dl_dir, clean_fn );

  fxr_update_window_title( "Downloading TR-DOS Disk from vtrd.in..." );
  if( !fxr_http_download_file( dl_url, dest_path ) ) return 0;

  if( !fxr_load_file_direct( dest_path, chosen, "trd" ) ) return 0;
  fxr_update_window_title( "Cloud: Virtual TR-DOS" );
  return 1;
}

static int
fxr_download_random_online_game( const char *host_or_fmt )
{
  HCURSOR hOldCur = SetCursor( LoadCursor( NULL, IDC_WAIT ) );
  int ok = 0;

  if( host_or_fmt && !strcasecmp( host_or_fmt, "ia_tosec" ) ) {
    ok = fxr_online_random_ia_tosec( NULL );
  } else if( host_or_fmt && !strcasecmp( host_or_fmt, "ia_lib" ) ) {
    ok = fxr_online_random_ia_softlib();
  } else if( host_or_fmt && !strcasecmp( host_or_fmt, "vtrdos" ) ) {
    ok = fxr_online_random_vtrdos();
  } else if( host_or_fmt && host_or_fmt[0] ) {
    /* Specific format ("z80", "tap", "dsk", "trd", "tzx") */
    ok = fxr_online_random_ia_tosec( host_or_fmt );
    if( !ok && !strcasecmp( host_or_fmt, "trd" ) ) ok = fxr_online_random_vtrdos();
    if( !ok ) ok = fxr_online_random_ia_softlib();
  } else {
    /* Rotate across all 3 legitimate online hosts with automatic fallback */
    int pick = (int)( fxr_next_rand() % 100 );
    if( pick < 55 ) {
      ok = fxr_online_random_ia_tosec( NULL );
      if( !ok ) ok = fxr_online_random_ia_softlib();
      if( !ok ) ok = fxr_online_random_vtrdos();
    } else if( pick < 85 ) {
      ok = fxr_online_random_ia_softlib();
      if( !ok ) ok = fxr_online_random_ia_tosec( NULL );
    } else {
      ok = fxr_online_random_vtrdos();
      if( !ok ) ok = fxr_online_random_ia_tosec( NULL );
    }
  }

  SetCursor( hOldCur );
  if( !ok ) {
    fxr_update_window_title( "Online Download Failed - Check Connection" );
  }
  return ok;
}

static void
fxr_build_tosec_index( void )
{
  const char *tosec_root = "C:/Users/adria/Desktop/DEV FOLDER/_=[ 07_3MU_R37R0 ]=_/Sinclair ZX Spectrum [TOSEC]/Games";
  const char *cats[] = { "[Z80]", "[TAP]", "[DSK]", "[TRD]", "[TZX]" };
  const char *fmts[] = { "z80",   "tap",   "dsk",   "trd",   "tzx" };
  int c;

  if( g_fxr_tosec_indexed ) return;
  g_fxr_tosec_indexed = 1;

  g_fxr_tosec_cap = 32768;
  g_fxr_tosec = (fxr_tosec_entry_t *)malloc( (size_t)g_fxr_tosec_cap * sizeof( fxr_tosec_entry_t ) );
  if( !g_fxr_tosec ) return;
  g_fxr_tosec_count = 0;

  for( c = 0; c < 5; c++ ) {
    char pattern[512];
    WIN32_FIND_DATAA fd;
    HANDLE hFind;
    snprintf( pattern, sizeof( pattern ), "%s/%s/*.*", tosec_root, cats[c] );
    hFind = FindFirstFileA( pattern, &fd );
    if( hFind == INVALID_HANDLE_VALUE ) continue;
    do {
      if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY ) continue;
      if( fd.cFileName[0] == '.' ) continue;
      if( g_fxr_tosec_count >= g_fxr_tosec_cap ) break;
      fxr_tosec_entry_t *e = &g_fxr_tosec[g_fxr_tosec_count++];
      snprintf( e->title, sizeof( e->title ), "%s", fd.cFileName );
      char *zext = strstr( e->title, ".zip" );
      if( !zext ) zext = strstr( e->title, ".ZIP" );
      if( zext ) *zext = '\0';
      snprintf( e->full_path, sizeof( e->full_path ), "%s/%s/%s", tosec_root, cats[c], fd.cFileName );
      snprintf( e->fmt, sizeof( e->fmt ), "%s", fmts[c] );
    } while( FindNextFileA( hFind, &fd ) );
    FindClose( hFind );
  }

  if( g_fxr_tosec_count > 0 ) {
    g_fxr_local_tosec_found = 1;
    return;
  }

  /* No local TOSEC folder installed! Automatically fetch & index the Cloud TOSEC catalog from Internet Archive */
  g_fxr_local_tosec_found = 0;
  {
    char dl_dir[512], cloud_idx_path[768];
    fxr_ensure_downloads_dir( dl_dir, sizeof( dl_dir ) );
    snprintf( cloud_idx_path, sizeof( cloud_idx_path ), "%s/tosec_cloud_index.txt", dl_dir );

    FILE *fp = fopen( cloud_idx_path, "rb" );
    if( !fp ) {
      HCURSOR hOld = SetCursor( LoadCursor( NULL, IDC_WAIT ) );
      fxr_update_window_title( "Downloading Cloud TOSEC 29k Catalog from Internet Archive..." );
      size_t cap = 6 * 1024 * 1024;
      char *buf = (char *)malloc( cap );
      size_t len = 0;
      if( buf && fxr_http_get_buffer(
            "https://archive.org/download/Sinclair_ZX_Spectrum_TOSEC_2012_04_23/Sinclair_ZX_Spectrum_TOSEC_2012_04_23.txt",
            NULL, buf, cap, &len ) && len > 100000 ) {
        fp = fopen( cloud_idx_path, "wb" );
        if( fp ) {
          fwrite( buf, 1, len, fp );
          fclose( fp );
        }
      }
      if( buf ) free( buf );
      SetCursor( hOld );
      fp = fopen( cloud_idx_path, "rb" );
    }

    if( fp ) {
      char line[512];
      while( fgets( line, sizeof( line ), fp ) && g_fxr_tosec_count < g_fxr_tosec_cap ) {
        char *p = strstr( line, "Sinclair ZX Spectrum [TOSEC]/Games/[" );
        if( !p ) continue;
        char *z = strstr( p, ".zip" );
        if( !z ) continue;
        z[4] = '\0';

        const char *fmt = NULL;
        if( strstr( p, "/Games/[Z80]/" ) )      fmt = "z80";
        else if( strstr( p, "/Games/[TAP]/" ) ) fmt = "tap";
        else if( strstr( p, "/Games/[DSK]/" ) ) fmt = "dsk";
        else if( strstr( p, "/Games/[TRD]/" ) ) fmt = "trd";
        else if( strstr( p, "/Games/[TZX]/" ) ) fmt = "tzx";
        if( !fmt ) continue;

        const char *slash = strrchr( p, '/' );
        if( !slash || !slash[1] ) continue;

        fxr_tosec_entry_t *e = &g_fxr_tosec[g_fxr_tosec_count++];
        snprintf( e->title, sizeof( e->title ), "%s", slash + 1 );
        char *ext = strstr( e->title, ".zip" );
        if( ext ) *ext = '\0';
        snprintf( e->full_path, sizeof( e->full_path ), "cloud://%s", p );
        snprintf( e->fmt, sizeof( e->fmt ), "%s", fmt );
      }
      fclose( fp );
    }
  }
}

static int
fxr_load_file_direct( const char *full_path, const char *display_name, const char *fmt_hint )
{
  char resolved_path[768];
  int is_cloud_cache = 0;
  if( !full_path || !full_path[0] ) return 0;
  if( !g_qvr.initialized ) quest_vr_init();

  /* If this entry is a Cloud TOSEC path ("cloud://Sinclair ZX Spectrum [TOSEC]/..."), download on demand! */
  if( strncmp( full_path, "cloud://", 8 ) == 0 ) {
    const char *inner = full_path + 8;
    const char *slash = strrchr( inner, '/' );
    const char *raw_fn = slash ? ( slash + 1 ) : inner;
    char enc_inner[1024], dl_url[1400], dl_dir[512], clean_fn[256];

    fxr_ensure_downloads_dir( dl_dir, sizeof( dl_dir ) );
    fxr_sanitize_filename( raw_fn, clean_fn, sizeof( clean_fn ) );
    snprintf( resolved_path, sizeof( resolved_path ), "%s/%s", dl_dir, clean_fn );

    /* Download from Internet Archive if not already cached in games/downloads/ */
    if( GetFileAttributesA( resolved_path ) == INVALID_FILE_ATTRIBUTES ) {
      HCURSOR hOld = SetCursor( LoadCursor( NULL, IDC_WAIT ) );
      fxr_url_encode_component( inner, enc_inner, sizeof( enc_inner ) );
      snprintf( dl_url, sizeof( dl_url ),
        "https://archive.org/download/Sinclair_ZX_Spectrum_TOSEC_2012_04_23/Sinclair_ZX_Spectrum_TOSEC_2012_04_23.zip/%s",
        enc_inner );
      fxr_update_window_title( "Downloading Game from Internet Archive Cloud..." );
      int ok = fxr_http_download_file( dl_url, resolved_path );
      SetCursor( hOld );
      if( !ok ) {
        fxr_update_window_title( "Cloud Download Failed" );
        return 0;
      }
    }
    full_path = resolved_path;
    is_cloud_cache = 1;
  } else if( strstr( full_path, "games/downloads" ) || strstr( full_path, "games\\downloads" ) ) {
    is_cloud_cache = 1;
  }

  settings_current.joy_prompt = 0;
  settings_current.confirm_actions = 0;
  settings_current.auto_load = 1;
  settings_current.detect_loader = 1;
  settings_current.fastload = 1;
  settings_current.accelerate_loader = 1;
  settings_current.disk_ask_merge = 0;

  if( fmt_hint && ( !strcasecmp( fmt_hint, "tap" ) || !strcasecmp( fmt_hint, "tzx" ) ) ) {
    ui_media_drive_eject_all();
    if( display_name && ( strstr( display_name, "128" ) || strstr( display_name, "+2" ) || strstr( display_name, "+3" ) ) ) {
      machine_select_id( "128" );
    } else {
      machine_select_id( "48" );
    }
  } else if( fmt_hint && !strcasecmp( fmt_hint, "dsk" ) ) {
    tape_close();
    machine_select_id( "plus3" );
  } else if( fmt_hint && ( !strcasecmp( fmt_hint, "trd" ) || !strcasecmp( fmt_hint, "scl" ) ) ) {
    tape_close();
    machine_select_id( "pentagon" );
  }

  g_fxr_suppress_ui_error = 1;
  int err = utils_open_file( full_path, 1, NULL );
  g_fxr_suppress_ui_error = 0;

  if( err != 0 ) {
    if( is_cloud_cache ) DeleteFileA( full_path );
    return 0;
  }

  pokemem_autoload_pokfile();
  display_refresh_all();

  snprintf( g_fxr_current_game, sizeof( g_fxr_current_game ), "%s",
            ( display_name && display_name[0] ) ? display_name : full_path );
  fxr_update_window_title( NULL );
  return 1;
}

static void
fxr_load_random_game( const char *fmt_filter, int local_only )
{
  uint64_t rval = fxr_next_rand();

  if( !local_only ) {
    /* Check if local TOSEC folder exists without triggering a 5MB index download first */
    const char *tosec_root = "C:/Users/adria/Desktop/DEV FOLDER/_=[ 07_3MU_R37R0 ]=_/Sinclair ZX Spectrum [TOSEC]/Games";
    if( !g_fxr_tosec_indexed && GetFileAttributesA( tosec_root ) == INVALID_FILE_ATTRIBUTES ) {
      /* User doesn't have local TOSEC configured! Use fast 1-click Online Random Game Download! */
      if( fxr_download_random_online_game( fmt_filter ) ) return;
    }

    fxr_build_tosec_index();
    if( !g_fxr_local_tosec_found ) {
      if( fxr_download_random_online_game( fmt_filter ) ) return;
    }

    if( g_fxr_tosec && g_fxr_tosec_count > 0 ) {
      int tries;
      for( tries = 0; tries < 500; tries++ ) {
        int idx = (int)( ( rval + (uint64_t)tries * 7919ULL ) % (uint64_t)g_fxr_tosec_count );
        const fxr_tosec_entry_t *e = &g_fxr_tosec[idx];
        if( fmt_filter && fmt_filter[0] ) {
          if( strcasecmp( e->fmt, fmt_filter ) != 0 ) continue;
        } else {
          if( !strcasecmp( e->fmt, "tzx" ) ) continue;
        }
        if( fxr_load_file_direct( e->full_path, e->title, e->fmt ) ) {
          return;
        }
      }
    }
  }

  if( g_fxr_local_game_count > 0 ) {
    int tries;
    for( tries = 0; tries < g_fxr_local_game_count; tries++ ) {
      int idx = (int)( ( rval + (uint64_t)tries ) % (uint64_t)g_fxr_local_game_count );
      char full_path[512];
      const char *fname = g_fxr_local_games[idx];
      const char *ext = strrchr( fname, '.' );
      if( !g_qvr.initialized ) quest_vr_init();
      snprintf( full_path, sizeof( full_path ), "%s/games/%s", g_qvr.base_dir, fname );
      if( fxr_load_file_direct( full_path, fname, ext ? ( ext + 1 ) : "z80" ) ) {
        return;
      }
    }
  }
}

static void
fxr_apply_poke_direct( int bank, int addr, int val )
{
  int i, found = -1;
  uint8_t orig;
  addr &= 0xffff;
  val &= 0xff;
  orig = qvr_read_mem_byte( bank, addr );

  qvr_lock_cmd();
  for( i = 0; i < g_qvr.custom_poke_count; i++ ) {
    if( g_qvr.custom_pokes[i].active &&
        g_qvr.custom_pokes[i].bank == bank &&
        g_qvr.custom_pokes[i].address == addr ) {
      found = i;
      break;
    }
  }
  if( found >= 0 ) {
    g_qvr.custom_pokes[found].value = val;
  } else if( g_qvr.custom_poke_count < QVR_MAX_CUSTOM_POKES ) {
    qvr_custom_poke_t *p = &g_qvr.custom_pokes[g_qvr.custom_poke_count++];
    p->active = 1;
    p->bank = bank;
    p->address = addr;
    p->value = val;
    p->orig = orig;
  }
  qvr_unlock_cmd();

  qvr_write_mem_byte( bank, addr, (uint8_t)val );
  display_refresh_all();
}

static void
fxr_clear_all_cheats_direct( void )
{
  int i;
  GSList *item;
  qvr_lock_cmd();
  for( i = 0; i < g_qvr.custom_poke_count; i++ ) {
    if( g_qvr.custom_pokes[i].active ) {
      qvr_write_mem_byte( g_qvr.custom_pokes[i].bank,
                          g_qvr.custom_pokes[i].address,
                          (uint8_t)g_qvr.custom_pokes[i].orig );
      g_qvr.custom_pokes[i].active = 0;
    }
  }
  g_qvr.custom_poke_count = 0;
  qvr_unlock_cmd();

  for( item = trainer_list; item; item = item->next ) {
    trainer_t *tr = (trainer_t *)item->data;
    if( tr && tr->active ) {
      pokemem_trainer_deactivate( tr );
    }
  }
  display_refresh_all();
  fxr_update_window_title( "Cheats Restored" );
}

static void
fxr_apply_curated_cheat( int cheat_idx )
{
  int k;
  if( cheat_idx < 0 || cheat_idx >= FXR_CHEAT_COUNT ) return;
  const fxr_curated_cheat_t *c = &g_fxr_cheats[cheat_idx];
  for( k = 0; k < c->poke_count; k++ ) {
    fxr_apply_poke_direct( 8, c->pokes[k].addr, c->pokes[k].val );
  }
  fxr_update_window_title( c->menu_label );
}

static int
fxr_auto_apply_current_game_cheat( void )
{
  char low[256];
  size_t i;
  int c;
  for( i = 0; g_fxr_current_game[i] && i + 1 < sizeof( low ); i++ ) {
    low[i] = (char)tolower( (unsigned char)g_fxr_current_game[i] );
  }
  low[i] = '\0';

  for( c = 0; c < FXR_CHEAT_COUNT; c++ ) {
    if( strstr( low, g_fxr_cheats[c].keyword ) ) {
      fxr_apply_curated_cheat( c );
      return 1;
    }
  }
  return 0;
}

/* ============================================================================
 * Native Win32 Modeless Window 1: TOSEC 29,000+ Archive Search & Launcher
 * ============================================================================ */

static HWND g_hwnd_tosec_dlg = NULL;
static HWND g_hwnd_tosec_edit = NULL;
static HWND g_hwnd_tosec_list = NULL;
static HWND g_hwnd_tosec_status = NULL;
static char g_tosec_dlg_fmt[16] = "";
static int g_tosec_dlg_map[400];
static int g_tosec_dlg_map_count = 0;

#define IDC_TOSEC_EDIT    5001
#define IDC_TOSEC_BTN_GO  5002
#define IDC_TOSEC_BTN_RND 5003
#define IDC_TOSEC_BTN_ALL 5004
#define IDC_TOSEC_BTN_Z80 5005
#define IDC_TOSEC_BTN_TAP 5006
#define IDC_TOSEC_BTN_DSK 5007
#define IDC_TOSEC_BTN_TRD 5008
#define IDC_TOSEC_BTN_TZX 5009
#define IDC_TOSEC_LIST    5010
#define IDC_TOSEC_LOAD    5011
#define IDC_TOSEC_CLOUD   5012

static void
fxr_refresh_tosec_listbox( void )
{
  char q[128] = { 0 };
  char q_low[128] = { 0 };
  int i, total_matched = 0;
  size_t k;

  if( !g_hwnd_tosec_list ) return;
  fxr_build_tosec_index();

  if( g_hwnd_tosec_edit ) {
    GetWindowTextA( g_hwnd_tosec_edit, q, sizeof( q ) );
  }
  for( k = 0; q[k] && k + 1 < sizeof( q_low ); k++ ) {
    q_low[k] = (char)tolower( (unsigned char)q[k] );
  }
  q_low[k] = '\0';

  SendMessageA( g_hwnd_tosec_list, LB_RESETCONTENT, 0, 0 );
  g_tosec_dlg_map_count = 0;

  for( i = 0; i < g_fxr_tosec_count; i++ ) {
    const fxr_tosec_entry_t *e = &g_fxr_tosec[i];
    if( g_tosec_dlg_fmt[0] && strcasecmp( e->fmt, g_tosec_dlg_fmt ) != 0 ) continue;
    if( q_low[0] ) {
      char t_low[128];
      for( k = 0; e->title[k] && k + 1 < sizeof( t_low ); k++ ) {
        t_low[k] = (char)tolower( (unsigned char)e->title[k] );
      }
      t_low[k] = '\0';
      if( !strstr( t_low, q_low ) ) continue;
    }
    total_matched++;
    if( g_tosec_dlg_map_count < 350 ) {
      char row_txt[160];
      snprintf( row_txt, sizeof( row_txt ), "[%s]  %s", e->fmt, e->title );
      SendMessageA( g_hwnd_tosec_list, LB_ADDSTRING, 0, (LPARAM)row_txt );
      g_tosec_dlg_map[g_tosec_dlg_map_count++] = i;
    }
  }

  if( g_tosec_dlg_map_count > 0 ) {
    SendMessageA( g_hwnd_tosec_list, LB_SETCURSEL, 0, 0 );
  }

  if( g_hwnd_tosec_status ) {
    char st[180];
    snprintf( st, sizeof( st ),
      "Showing %d of %d matching games (%s Catalog: %d games). Double-click any game to play!",
      g_tosec_dlg_map_count, total_matched,
      g_fxr_local_tosec_found ? "Local TOSEC" : "Internet Archive Cloud",
      g_fxr_tosec_count );
    SetWindowTextA( g_hwnd_tosec_status, st );
  }
}

static void
fxr_tosec_load_selected( void )
{
  if( !g_hwnd_tosec_list ) return;
  int sel = (int)SendMessageA( g_hwnd_tosec_list, LB_GETCURSEL, 0, 0 );
  if( sel >= 0 && sel < g_tosec_dlg_map_count ) {
    int idx = g_tosec_dlg_map[sel];
    if( idx >= 0 && idx < g_fxr_tosec_count ) {
      const fxr_tosec_entry_t *e = &g_fxr_tosec[idx];
      fxr_load_file_direct( e->full_path, e->title, e->fmt );
    }
  }
}

static LRESULT CALLBACK
fxr_tosec_wnd_proc( HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam )
{
  switch( msg ) {
  case WM_COMMAND: {
    WORD id = LOWORD( wParam );
    WORD code = HIWORD( wParam );
    if( id == IDC_TOSEC_EDIT && code == EN_CHANGE ) {
      fxr_refresh_tosec_listbox();
      return 0;
    }
    if( id == IDC_TOSEC_BTN_GO ) {
      fxr_refresh_tosec_listbox();
      return 0;
    }
    if( id == IDC_TOSEC_BTN_RND ) {
      fxr_load_random_game( g_tosec_dlg_fmt, 0 );
      return 0;
    }
    if( id == IDC_TOSEC_CLOUD ) {
      fxr_download_random_online_game( g_tosec_dlg_fmt[0] ? g_tosec_dlg_fmt : NULL );
      return 0;
    }
    if( id == IDC_TOSEC_BTN_ALL ) { g_tosec_dlg_fmt[0] = '\0'; fxr_refresh_tosec_listbox(); return 0; }
    if( id == IDC_TOSEC_BTN_Z80 ) { strcpy( g_tosec_dlg_fmt, "z80" ); fxr_refresh_tosec_listbox(); return 0; }
    if( id == IDC_TOSEC_BTN_TAP ) { strcpy( g_tosec_dlg_fmt, "tap" ); fxr_refresh_tosec_listbox(); return 0; }
    if( id == IDC_TOSEC_BTN_DSK ) { strcpy( g_tosec_dlg_fmt, "dsk" ); fxr_refresh_tosec_listbox(); return 0; }
    if( id == IDC_TOSEC_BTN_TRD ) { strcpy( g_tosec_dlg_fmt, "trd" ); fxr_refresh_tosec_listbox(); return 0; }
    if( id == IDC_TOSEC_BTN_TZX ) { strcpy( g_tosec_dlg_fmt, "tzx" ); fxr_refresh_tosec_listbox(); return 0; }
    if( id == IDC_TOSEC_LOAD || ( id == IDC_TOSEC_LIST && code == LBN_DBLCLK ) ) {
      fxr_tosec_load_selected();
      return 0;
    }
    break;
  }
  case WM_CLOSE:
    DestroyWindow( hWnd );
    g_hwnd_tosec_dlg = NULL;
    g_hwnd_tosec_edit = NULL;
    g_hwnd_tosec_list = NULL;
    g_hwnd_tosec_status = NULL;
    return 0;
  }
  return DefWindowProcA( hWnd, msg, wParam, lParam );
}

static void
fxr_open_tosec_search_dialog( HWND hParent )
{
  static int class_reg = 0;
  HFONT hFont;

  if( g_hwnd_tosec_dlg && IsWindow( g_hwnd_tosec_dlg ) ) {
    ShowWindow( g_hwnd_tosec_dlg, SW_RESTORE );
    SetForegroundWindow( g_hwnd_tosec_dlg );
    return;
  }

  if( !class_reg ) {
    WNDCLASSA wc;
    memset( &wc, 0, sizeof( wc ) );
    wc.lpfnWndProc = fxr_tosec_wnd_proc;
    wc.hInstance = GetModuleHandleA( NULL );
    wc.hCursor = LoadCursor( NULL, IDC_ARROW );
    wc.hbrBackground = (HBRUSH)( COLOR_BTNFACE + 1 );
    wc.lpszClassName = "FuseXR_TOSEC_Dlg";
    RegisterClassA( &wc );
    class_reg = 1;
  }

  g_hwnd_tosec_dlg = CreateWindowExA(
    0, "FuseXR_TOSEC_Dlg",
    "FuseXR - Search 29,000+ ZX Spectrum TOSEC Archive & Online Cloud",
    WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX | WS_VISIBLE,
    CW_USEDEFAULT, CW_USEDEFAULT, 660, 500,
    hParent, NULL, GetModuleHandleA( NULL ), NULL );

  hFont = (HFONT)GetStockObject( DEFAULT_GUI_FONT );

  HWND hLbl = CreateWindowA( "STATIC", "Search Game Title:", WS_CHILD | WS_VISIBLE,
    14, 16, 110, 20, g_hwnd_tosec_dlg, NULL, NULL, NULL );
  SendMessageA( hLbl, WM_SETFONT, (WPARAM)hFont, TRUE );

  g_hwnd_tosec_edit = CreateWindowExA( WS_EX_CLIENTEDGE, "EDIT", "",
    WS_CHILD | WS_VISIBLE | WS_TABSTOP | ES_AUTOHSCROLL,
    125, 13, 210, 24, g_hwnd_tosec_dlg, (HMENU)IDC_TOSEC_EDIT, NULL, NULL );
  SendMessageA( g_hwnd_tosec_edit, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBtnGo = CreateWindowA( "BUTTON", "Search", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    341, 12, 70, 26, g_hwnd_tosec_dlg, (HMENU)IDC_TOSEC_BTN_GO, NULL, NULL );
  SendMessageA( hBtnGo, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBtnRnd = CreateWindowA( "BUTTON", "Random Local", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    417, 12, 102, 26, g_hwnd_tosec_dlg, (HMENU)IDC_TOSEC_BTN_RND, NULL, NULL );
  SendMessageA( hBtnRnd, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBtnCloud = CreateWindowA( "BUTTON", "Cloud Random", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    525, 12, 110, 26, g_hwnd_tosec_dlg, (HMENU)IDC_TOSEC_CLOUD, NULL, NULL );
  SendMessageA( hBtnCloud, WM_SETFONT, (WPARAM)hFont, TRUE );

  /* Format filter buttons */
  struct { int id; const char *txt; int x; int w; } fb[] = {
    { IDC_TOSEC_BTN_ALL, "All Formats (29k)", 14,  115 },
    { IDC_TOSEC_BTN_Z80, ".Z80 Snapshots",   135, 100 },
    { IDC_TOSEC_BTN_TAP, ".TAP Tapes",       241,  90 },
    { IDC_TOSEC_BTN_DSK, "+3 .DSK Disks",    337,  98 },
    { IDC_TOSEC_BTN_TRD, "TR-DOS .TRD",      441,  96 },
    { IDC_TOSEC_BTN_TZX, ".TZX Tapes",       543,  92 },
  };
  int b;
  for( b = 0; b < 6; b++ ) {
    HWND hb = CreateWindowA( "BUTTON", fb[b].txt, WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
      fb[b].x, 45, fb[b].w, 25, g_hwnd_tosec_dlg, (HMENU)(uintptr_t)fb[b].id, NULL, NULL );
    SendMessageA( hb, WM_SETFONT, (WPARAM)hFont, TRUE );
  }

  g_hwnd_tosec_status = CreateWindowA( "STATIC", "Indexing TOSEC Archive...", WS_CHILD | WS_VISIBLE,
    14, 77, 620, 18, g_hwnd_tosec_dlg, NULL, NULL, NULL );
  SendMessageA( g_hwnd_tosec_status, WM_SETFONT, (WPARAM)hFont, TRUE );

  g_hwnd_tosec_list = CreateWindowExA( WS_EX_CLIENTEDGE, "LISTBOX", "",
    WS_CHILD | WS_VISIBLE | WS_VSCROLL | LBS_NOTIFY | LBS_NOINTEGRALHEIGHT,
    14, 98, 622, 315, g_hwnd_tosec_dlg, (HMENU)IDC_TOSEC_LIST, NULL, NULL );
  SendMessageA( g_hwnd_tosec_list, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBtnLoad = CreateWindowA( "BUTTON", "Load Selected Game into FuseXR",
    WS_CHILD | WS_VISIBLE | BS_DEFPUSHBUTTON,
    14, 422, 622, 34, g_hwnd_tosec_dlg, (HMENU)IDC_TOSEC_LOAD, NULL, NULL );
  SendMessageA( hBtnLoad, WM_SETFONT, (WPARAM)hFont, TRUE );

  fxr_refresh_tosec_listbox();
  SetFocus( g_hwnd_tosec_edit );
}

/* ============================================================================
 * Native Win32 Modeless Window 2: Easy Cheat & Live Pokefinder Studio
 * ============================================================================ */

static HWND g_hwnd_cheat_dlg = NULL;
static HWND g_hwnd_cheat_combo = NULL;
static HWND g_hwnd_poke_bank = NULL;
static HWND g_hwnd_poke_addr = NULL;
static HWND g_hwnd_poke_val = NULL;
static HWND g_hwnd_peek_out = NULL;
static HWND g_hwnd_pf_val = NULL;
static HWND g_hwnd_pf_list = NULL;
static HWND g_hwnd_pf_status = NULL;

static int g_pf_cand_bank[256];
static int g_pf_cand_addr[256];
static int g_pf_cand_count = 0;

#define IDC_CHEAT_COMBO      6001
#define IDC_CHEAT_APPLY_CUR  6002
#define IDC_CHEAT_AUTO_BTN   6003
#define IDC_POKE_BANK        6004
#define IDC_POKE_ADDR        6005
#define IDC_POKE_VAL         6006
#define IDC_POKE_APPLY_BTN   6007
#define IDC_PEEK_BTN         6008
#define IDC_CHEAT_CLEAR_BTN  6009
#define IDC_PF_VAL           6010
#define IDC_PF_SEARCH_BTN    6011
#define IDC_PF_INC_BTN       6012
#define IDC_PF_DEC_BTN       6013
#define IDC_PF_RESET_BTN     6014
#define IDC_PF_LIST          6015
#define IDC_PF_POKE_CAND_BTN 6016

static void
fxr_refresh_pf_candidates( void )
{
  size_t page, offset;
  if( !g_hwnd_pf_list ) return;
  SendMessageA( g_hwnd_pf_list, LB_RESETCONTENT, 0, 0 );
  g_pf_cand_count = 0;

  if( pokefinder_count > 0 && pokefinder_count <= 250 ) {
    for( page = 0; page < MEMORY_PAGES_IN_16K * SPECTRUM_RAM_PAGES && g_pf_cand_count < 200; page++ ) {
      memory_page *mapping = &memory_map_ram[page];
      int bank = mapping->page_num;
      for( offset = 0; offset < MEMORY_PAGE_SIZE && g_pf_cand_count < 200; offset++ ) {
        if( !( pokefinder_impossible[page][offset / 8] & ( 1 << ( offset & 7 ) ) ) ) {
          int bank_offset = (int)( ( mapping->offset + offset ) & 0x3fff );
          int addr16 = bank_offset;
          if( bank == 5 ) addr16 = 0x4000 + bank_offset;
          else if( bank == 2 ) addr16 = 0x8000 + bank_offset;
          else if( bank == 0 ) addr16 = 0xc000 + bank_offset;
          int cur_val = mapping->page[offset];
          char row[128];
          snprintf( row, sizeof( row ), "Bank %d  |  Address: %d (0x%04X)  |  Current Value: %d",
                    bank, addr16, addr16, cur_val );
          SendMessageA( g_hwnd_pf_list, LB_ADDSTRING, 0, (LPARAM)row );
          g_pf_cand_bank[g_pf_cand_count] = bank;
          g_pf_cand_addr[g_pf_cand_count] = addr16;
          g_pf_cand_count++;
        }
      }
    }
  }

  if( g_pf_cand_count > 0 ) {
    SendMessageA( g_hwnd_pf_list, LB_SETCURSEL, 0, 0 );
  }

  if( g_hwnd_pf_status ) {
    char st[160];
    snprintf( st, sizeof( st ), "Live Pokefinder Matches: %lu candidate(s)%s",
              (unsigned long)pokefinder_count,
              ( pokefinder_count > 250 ) ? " (narrow down to <=250 to list)" : "" );
    SetWindowTextA( g_hwnd_pf_status, st );
  }
}

static LRESULT CALLBACK
fxr_cheat_wnd_proc( HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam )
{
  switch( msg ) {
  case WM_COMMAND: {
    WORD id = LOWORD( wParam );
    WORD code = HIWORD( wParam );
    if( id == IDC_CHEAT_APPLY_CUR ) {
      int sel = (int)SendMessageA( g_hwnd_cheat_combo, CB_GETCURSEL, 0, 0 );
      if( sel >= 0 && sel < FXR_CHEAT_COUNT ) {
        fxr_apply_curated_cheat( sel );
        if( g_hwnd_peek_out ) SetWindowTextA( g_hwnd_peek_out, g_fxr_cheats[sel].menu_label );
      }
      return 0;
    }
    if( id == IDC_CHEAT_AUTO_BTN ) {
      if( !fxr_auto_apply_current_game_cheat() ) {
        if( g_hwnd_peek_out ) SetWindowTextA( g_hwnd_peek_out, "No exact title match - pick a game from the dropdown above." );
      } else {
        if( g_hwnd_peek_out ) SetWindowTextA( g_hwnd_peek_out, "Auto-applied Infinite Lives for current game!" );
      }
      return 0;
    }
    if( id == IDC_POKE_APPLY_BTN ) {
      char b_s[32] = {0}, a_s[32] = {0}, v_s[32] = {0}, out[128];
      GetWindowTextA( g_hwnd_poke_bank, b_s, sizeof( b_s ) );
      GetWindowTextA( g_hwnd_poke_addr, a_s, sizeof( a_s ) );
      GetWindowTextA( g_hwnd_poke_val,  v_s, sizeof( v_s ) );
      int bank = b_s[0] ? atoi( b_s ) : 8;
      int addr = (int)strtol( a_s, NULL, 0 );
      int val  = (int)strtol( v_s, NULL, 0 );
      if( addr > 0 && addr <= 65535 ) {
        fxr_apply_poke_direct( bank, addr, val );
        snprintf( out, sizeof( out ), "Applied POKE %d, %d (Bank %d)", addr, val & 0xff, bank );
        if( g_hwnd_peek_out ) SetWindowTextA( g_hwnd_peek_out, out );
      }
      return 0;
    }
    if( id == IDC_PEEK_BTN ) {
      char a_s[32] = {0}, out[160];
      GetWindowTextA( g_hwnd_poke_addr, a_s, sizeof( a_s ) );
      int addr = (int)strtol( a_s, NULL, 0 ) & 0xffff;
      snprintf( out, sizeof( out ), "PEEK %d..%d:  [%d, %d, %d, %d, %d, %d, %d, %d]",
        addr, ( addr + 7 ) & 0xffff,
        qvr_read_mem_byte( 8, addr ),     qvr_read_mem_byte( 8, addr + 1 ),
        qvr_read_mem_byte( 8, addr + 2 ), qvr_read_mem_byte( 8, addr + 3 ),
        qvr_read_mem_byte( 8, addr + 4 ), qvr_read_mem_byte( 8, addr + 5 ),
        qvr_read_mem_byte( 8, addr + 6 ), qvr_read_mem_byte( 8, addr + 7 ) );
      if( g_hwnd_peek_out ) SetWindowTextA( g_hwnd_peek_out, out );
      return 0;
    }
    if( id == IDC_CHEAT_CLEAR_BTN ) {
      fxr_clear_all_cheats_direct();
      if( g_hwnd_peek_out ) SetWindowTextA( g_hwnd_peek_out, "Restored all POKEs and deactivated trainers." );
      return 0;
    }
    if( id == IDC_PF_SEARCH_BTN ) {
      char v_s[32] = {0};
      GetWindowTextA( g_hwnd_pf_val, v_s, sizeof( v_s ) );
      int val = (int)strtol( v_s, NULL, 0 ) & 0xff;
      if( !pokefinder_is_allocated() || pokefinder_count == 0 ) pokefinder_clear();
      pokefinder_search( (libspectrum_byte)val );
      fxr_refresh_pf_candidates();
      return 0;
    }
    if( id == IDC_PF_INC_BTN ) {
      if( !pokefinder_is_allocated() ) pokefinder_clear();
      pokefinder_incremented();
      fxr_refresh_pf_candidates();
      return 0;
    }
    if( id == IDC_PF_DEC_BTN ) {
      if( !pokefinder_is_allocated() ) pokefinder_clear();
      pokefinder_decremented();
      fxr_refresh_pf_candidates();
      return 0;
    }
    if( id == IDC_PF_RESET_BTN ) {
      pokefinder_clear();
      fxr_refresh_pf_candidates();
      return 0;
    }
    if( id == IDC_PF_POKE_CAND_BTN || ( id == IDC_PF_LIST && code == LBN_DBLCLK ) ) {
      int sel = (int)SendMessageA( g_hwnd_pf_list, LB_GETCURSEL, 0, 0 );
      if( sel >= 0 && sel < g_pf_cand_count ) {
        char v_s[32] = {0}, out[128];
        GetWindowTextA( g_hwnd_pf_val, v_s, sizeof( v_s ) );
        int val = v_s[0] ? ( (int)strtol( v_s, NULL, 0 ) & 0xff ) : 99;
        int bank = g_pf_cand_bank[sel];
        int addr = g_pf_cand_addr[sel];
        fxr_apply_poke_direct( 8, addr, val );
        snprintf( out, sizeof( out ), "Locked candidate POKE %d, %d (Bank %d)!", addr, val, bank );
        if( g_hwnd_peek_out ) SetWindowTextA( g_hwnd_peek_out, out );
      }
      return 0;
    }
    break;
  }
  case WM_CLOSE:
    DestroyWindow( hWnd );
    g_hwnd_cheat_dlg = NULL;
    return 0;
  }
  return DefWindowProcA( hWnd, msg, wParam, lParam );
}

static void
fxr_open_easy_cheat_dialog( HWND hParent )
{
  static int class_reg = 0;
  HFONT hFont;
  int i;

  if( g_hwnd_cheat_dlg && IsWindow( g_hwnd_cheat_dlg ) ) {
    ShowWindow( g_hwnd_cheat_dlg, SW_RESTORE );
    SetForegroundWindow( g_hwnd_cheat_dlg );
    return;
  }

  if( !class_reg ) {
    WNDCLASSA wc;
    memset( &wc, 0, sizeof( wc ) );
    wc.lpfnWndProc = fxr_cheat_wnd_proc;
    wc.hInstance = GetModuleHandleA( NULL );
    wc.hCursor = LoadCursor( NULL, IDC_ARROW );
    wc.hbrBackground = (HBRUSH)( COLOR_BTNFACE + 1 );
    wc.lpszClassName = "FuseXR_Cheat_Dlg";
    RegisterClassA( &wc );
    class_reg = 1;
  }

  g_hwnd_cheat_dlg = CreateWindowExA(
    0, "FuseXR_Cheat_Dlg",
    "FuseXR - Easy Cheat, Custom POKE & Live Pokefinder Studio",
    WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX | WS_VISIBLE,
    CW_USEDEFAULT, CW_USEDEFAULT, 620, 490,
    hParent, NULL, GetModuleHandleA( NULL ), NULL );

  hFont = (HFONT)GetStockObject( DEFAULT_GUI_FONT );

  /* 1. Curated 1-Click Cheats */
  HWND hL1 = CreateWindowA( "STATIC", "1. Curated 1-Click Classic Cheats:", WS_CHILD | WS_VISIBLE,
    14, 14, 240, 18, g_hwnd_cheat_dlg, NULL, NULL, NULL );
  SendMessageA( hL1, WM_SETFONT, (WPARAM)hFont, TRUE );

  g_hwnd_cheat_combo = CreateWindowA( "COMBOBOX", "",
    WS_CHILD | WS_VISIBLE | CBS_DROPDOWNLIST | WS_VSCROLL,
    14, 34, 355, 300, g_hwnd_cheat_dlg, (HMENU)IDC_CHEAT_COMBO, NULL, NULL );
  SendMessageA( g_hwnd_cheat_combo, WM_SETFONT, (WPARAM)hFont, TRUE );
  for( i = 0; i < FXR_CHEAT_COUNT; i++ ) {
    SendMessageA( g_hwnd_cheat_combo, CB_ADDSTRING, 0, (LPARAM)g_fxr_cheats[i].menu_label );
  }
  SendMessageA( g_hwnd_cheat_combo, CB_SETCURSEL, 0, 0 );

  HWND hBApply = CreateWindowA( "BUTTON", "Apply Cheat", WS_CHILD | WS_VISIBLE | BS_DEFPUSHBUTTON,
    376, 33, 105, 25, g_hwnd_cheat_dlg, (HMENU)IDC_CHEAT_APPLY_CUR, NULL, NULL );
  SendMessageA( hBApply, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBAuto = CreateWindowA( "BUTTON", "Auto-Detect Game", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    487, 33, 108, 25, g_hwnd_cheat_dlg, (HMENU)IDC_CHEAT_AUTO_BTN, NULL, NULL );
  SendMessageA( hBAuto, WM_SETFONT, (WPARAM)hFont, TRUE );

  /* 2. Direct Memory POKE & PEEK */
  HWND hL2 = CreateWindowA( "STATIC", "2. Direct Memory POKE / PEEK (Bank 8 = Active 64K, Address 16384..65535, Value 0..255):",
    WS_CHILD | WS_VISIBLE, 14, 72, 580, 18, g_hwnd_cheat_dlg, NULL, NULL, NULL );
  SendMessageA( hL2, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hLBk = CreateWindowA( "STATIC", "Bank:", WS_CHILD | WS_VISIBLE, 14, 97, 36, 18, g_hwnd_cheat_dlg, NULL, NULL, NULL );
  SendMessageA( hLBk, WM_SETFONT, (WPARAM)hFont, TRUE );
  g_hwnd_poke_bank = CreateWindowExA( WS_EX_CLIENTEDGE, "EDIT", "8", WS_CHILD | WS_VISIBLE,
    52, 94, 38, 23, g_hwnd_cheat_dlg, (HMENU)IDC_POKE_BANK, NULL, NULL );
  SendMessageA( g_hwnd_poke_bank, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hLAd = CreateWindowA( "STATIC", "Address:", WS_CHILD | WS_VISIBLE, 100, 97, 52, 18, g_hwnd_cheat_dlg, NULL, NULL, NULL );
  SendMessageA( hLAd, WM_SETFONT, (WPARAM)hFont, TRUE );
  g_hwnd_poke_addr = CreateWindowExA( WS_EX_CLIENTEDGE, "EDIT", "35136", WS_CHILD | WS_VISIBLE,
    154, 94, 72, 23, g_hwnd_cheat_dlg, (HMENU)IDC_POKE_ADDR, NULL, NULL );
  SendMessageA( g_hwnd_poke_addr, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hLVl = CreateWindowA( "STATIC", "Value:", WS_CHILD | WS_VISIBLE, 236, 97, 40, 18, g_hwnd_cheat_dlg, NULL, NULL, NULL );
  SendMessageA( hLVl, WM_SETFONT, (WPARAM)hFont, TRUE );
  g_hwnd_poke_val = CreateWindowExA( WS_EX_CLIENTEDGE, "EDIT", "0", WS_CHILD | WS_VISIBLE,
    278, 94, 52, 23, g_hwnd_cheat_dlg, (HMENU)IDC_POKE_VAL, NULL, NULL );
  SendMessageA( g_hwnd_poke_val, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBPoke = CreateWindowA( "BUTTON", "Apply POKE", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    338, 93, 86, 25, g_hwnd_cheat_dlg, (HMENU)IDC_POKE_APPLY_BTN, NULL, NULL );
  SendMessageA( hBPoke, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBPeek = CreateWindowA( "BUTTON", "PEEK 8B", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    430, 93, 72, 25, g_hwnd_cheat_dlg, (HMENU)IDC_PEEK_BTN, NULL, NULL );
  SendMessageA( hBPeek, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBClear = CreateWindowA( "BUTTON", "Restore All", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    508, 93, 87, 25, g_hwnd_cheat_dlg, (HMENU)IDC_CHEAT_CLEAR_BTN, NULL, NULL );
  SendMessageA( hBClear, WM_SETFONT, (WPARAM)hFont, TRUE );

  g_hwnd_peek_out = CreateWindowA( "STATIC", "Status: Ready.", WS_CHILD | WS_VISIBLE,
    14, 124, 580, 18, g_hwnd_cheat_dlg, NULL, NULL, NULL );
  SendMessageA( g_hwnd_peek_out, WM_SETFONT, (WPARAM)hFont, TRUE );

  /* 3. Live Pokefinder */
  HWND hL3 = CreateWindowA( "STATIC", "3. Live Pokefinder (Find Lives / Ammo Counters in Real Time):",
    WS_CHILD | WS_VISIBLE, 14, 152, 580, 18, g_hwnd_cheat_dlg, NULL, NULL, NULL );
  SendMessageA( hL3, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hLPfV = CreateWindowA( "STATIC", "Lives/Value:", WS_CHILD | WS_VISIBLE, 14, 177, 72, 18, g_hwnd_cheat_dlg, NULL, NULL, NULL );
  SendMessageA( hLPfV, WM_SETFONT, (WPARAM)hFont, TRUE );
  g_hwnd_pf_val = CreateWindowExA( WS_EX_CLIENTEDGE, "EDIT", "3", WS_CHILD | WS_VISIBLE,
    88, 174, 55, 23, g_hwnd_cheat_dlg, (HMENU)IDC_PF_VAL, NULL, NULL );
  SendMessageA( g_hwnd_pf_val, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBPfS = CreateWindowA( "BUTTON", "Search Exact Value", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    150, 173, 130, 25, g_hwnd_cheat_dlg, (HMENU)IDC_PF_SEARCH_BTN, NULL, NULL );
  SendMessageA( hBPfS, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBPfI = CreateWindowA( "BUTTON", "Increased (+)", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    286, 173, 100, 25, g_hwnd_cheat_dlg, (HMENU)IDC_PF_INC_BTN, NULL, NULL );
  SendMessageA( hBPfI, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBPfD = CreateWindowA( "BUTTON", "Decreased (-)", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    392, 173, 100, 25, g_hwnd_cheat_dlg, (HMENU)IDC_PF_DEC_BTN, NULL, NULL );
  SendMessageA( hBPfD, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBPfR = CreateWindowA( "BUTTON", "Reset", WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    498, 173, 97, 25, g_hwnd_cheat_dlg, (HMENU)IDC_PF_RESET_BTN, NULL, NULL );
  SendMessageA( hBPfR, WM_SETFONT, (WPARAM)hFont, TRUE );

  g_hwnd_pf_status = CreateWindowA( "STATIC", "Live Pokefinder Matches: Ready", WS_CHILD | WS_VISIBLE,
    14, 204, 580, 18, g_hwnd_cheat_dlg, NULL, NULL, NULL );
  SendMessageA( g_hwnd_pf_status, WM_SETFONT, (WPARAM)hFont, TRUE );

  g_hwnd_pf_list = CreateWindowExA( WS_EX_CLIENTEDGE, "LISTBOX", "",
    WS_CHILD | WS_VISIBLE | WS_VSCROLL | LBS_NOTIFY | LBS_NOINTEGRALHEIGHT,
    14, 224, 581, 180, g_hwnd_cheat_dlg, (HMENU)IDC_PF_LIST, NULL, NULL );
  SendMessageA( g_hwnd_pf_list, WM_SETFONT, (WPARAM)hFont, TRUE );

  HWND hBPfLock = CreateWindowA( "BUTTON", "POKE Selected Candidate Address with Value Above",
    WS_CHILD | WS_VISIBLE | BS_PUSHBUTTON,
    14, 412, 581, 30, g_hwnd_cheat_dlg, (HMENU)IDC_PF_POKE_CAND_BTN, NULL, NULL );
  SendMessageA( hBPfLock, WM_SETFONT, (WPARAM)hFont, TRUE );

  fxr_refresh_pf_candidates();
}

#endif /* WIN32 */

void
quest_vr_populate_win32_menus( void *hWnd_ptr )
{
#ifdef WIN32
  HWND hWnd = (HWND)hWnd_ptr;
  HMENU hBar;
  int i;

  if( !hWnd ) return;
  g_fxr_main_hwnd = hWnd;
  if( !g_qvr.initialized ) quest_vr_init();

  hBar = GetMenu( hWnd );
  if( !hBar ) return;

  /* 1. Build "Games & Archives" Menu */
  HMENU hMenuGames = CreatePopupMenu();
  HMENU hSubRndFmt = CreatePopupMenu();
  HMENU hSubCloud  = CreatePopupMenu();
  HMENU hSubSnap   = CreatePopupMenu();
  HMENU hSubTape   = CreatePopupMenu();
  HMENU hSubDisk   = CreatePopupMenu();
  HMENU hSubArch   = CreatePopupMenu();
  g_fxr_hSubCloud  = hSubCloud;

  AppendMenuA( hSubRndFmt, MF_STRING, IDM_FXR_RANDOM_Z80,   "Random .&Z80 Snapshot (Instant)" );
  AppendMenuA( hSubRndFmt, MF_STRING, IDM_FXR_RANDOM_TAP,   "Random .&TAP Cassette Tape" );
  AppendMenuA( hSubRndFmt, MF_STRING, IDM_FXR_RANDOM_DSK,   "Random +3 .&DSK Floppy Disk" );
  AppendMenuA( hSubRndFmt, MF_STRING, IDM_FXR_RANDOM_TRD,   "Random Pentagon .&TRD Disk" );
  AppendMenuA( hSubRndFmt, MF_STRING, IDM_FXR_RANDOM_TZX,   "Random .T&ZX Turbo Tape" );
  AppendMenuA( hSubRndFmt, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hSubRndFmt, MF_STRING, IDM_FXR_RANDOM_LOCAL, "Random &Bundled Classic Game" );

  AppendMenuA( hSubCloud, MF_STRING, IDM_FXR_ONLINE_IA_TOSEC,    "Internet Archive - &TOSEC 44,528-Game Cloud (All Formats)" );
  AppendMenuA( hSubCloud, MF_STRING, IDM_FXR_ONLINE_IA_LIB,      "Internet Archive - &ZX Spectrum Software Library (12,305 .Z80s)" );
  AppendMenuA( hSubCloud, MF_STRING, IDM_FXR_ONLINE_VTRDOS,      "&Virtual TR-DOS - Pentagon 128 Full Disks (vtrd.in .TRD)" );
  AppendMenuA( hSubCloud, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hSubCloud, MF_STRING, IDM_FXR_ONLINE_FMT_Z80,     "Cloud Download: Random .&Z80 Snapshot" );
  AppendMenuA( hSubCloud, MF_STRING, IDM_FXR_ONLINE_FMT_TAP,     "Cloud Download: Random .&TAP Cassette Tape" );
  AppendMenuA( hSubCloud, MF_STRING, IDM_FXR_ONLINE_FMT_DSK,     "Cloud Download: Random +3 .&DSK Floppy Disk" );
  AppendMenuA( hSubCloud, MF_STRING, IDM_FXR_ONLINE_FMT_TRD,     "Cloud Download: Random Pentagon .T&RD Disk" );
  AppendMenuA( hSubCloud, MF_STRING, IDM_FXR_ONLINE_FMT_TZX,     "Cloud Download: Random .TZX T&urbo Tape" );
  AppendMenuA( hSubCloud, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hSubCloud, MF_STRING | ( g_fxr_force_online_dice ? MF_CHECKED : MF_UNCHECKED ),
               IDM_FXR_ONLINE_TOGGLE_DICE, "Top-Bar Dice Button: Always Use &Online Cloud Downloads" );
  AppendMenuA( hSubCloud, MF_STRING, IDM_FXR_OPEN_DOWNLOADS_DIR, "&Open Downloaded Games Folder (games/downloads)..." );

  /* Scan bundled games/ folder */
  g_fxr_local_game_count = 0;
  {
    char pattern[512];
    WIN32_FIND_DATAA fd;
    HANDLE hFind;
    snprintf( pattern, sizeof( pattern ), "%s/games/*.*", g_qvr.base_dir );
    hFind = FindFirstFileA( pattern, &fd );
    if( hFind != INVALID_HANDLE_VALUE ) {
      do {
        if( fd.dwFileAttributes & FILE_ATTRIBUTE_DIRECTORY ) continue;
        const char *fn = fd.cFileName;
        if( fn[0] == '.' || fn[0] == '_' ) continue;
        const char *dot = strrchr( fn, '.' );
        if( !dot ) continue;
        const char *ext = dot + 1;
        if( g_fxr_local_game_count >= 250 ) break;
        if( !strcasecmp( ext, "z80" ) || !strcasecmp( ext, "sna" ) ) {
          int idx = g_fxr_local_game_count++;
          snprintf( g_fxr_local_games[idx], sizeof( g_fxr_local_games[idx] ), "%s", fn );
          AppendMenuA( hSubSnap, MF_STRING, IDM_FXR_LOCAL_GAME_BASE + idx, fn );
        } else if( !strcasecmp( ext, "tap" ) || !strcasecmp( ext, "tzx" ) ) {
          int idx = g_fxr_local_game_count++;
          snprintf( g_fxr_local_games[idx], sizeof( g_fxr_local_games[idx] ), "%s", fn );
          AppendMenuA( hSubTape, MF_STRING, IDM_FXR_LOCAL_GAME_BASE + idx, fn );
        } else if( !strcasecmp( ext, "dsk" ) || !strcasecmp( ext, "trd" ) || !strcasecmp( ext, "scl" ) ) {
          int idx = g_fxr_local_game_count++;
          snprintf( g_fxr_local_games[idx], sizeof( g_fxr_local_games[idx] ), "%s", fn );
          AppendMenuA( hSubDisk, MF_STRING, IDM_FXR_LOCAL_GAME_BASE + idx, fn );
        }
      } while( FindNextFileA( hFind, &fd ) );
      FindClose( hFind );
    }
  }

  AppendMenuA( hSubArch, MF_STRING, IDM_FXR_ARCHIVE_IA_LIB,  "Internet Archive - &ZX Spectrum Library" );
  AppendMenuA( hSubArch, MF_STRING, IDM_FXR_ARCHIVE_IA_WOS,  "Internet Archive - &World of Spectrum Showcase" );
  AppendMenuA( hSubArch, MF_STRING, IDM_FXR_ARCHIVE_IA_Z80,  "Internet Archive - .&Z80 Snapshot Collection" );
  AppendMenuA( hSubArch, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hSubArch, MF_STRING, IDM_FXR_ARCHIVE_ZXDB,    "&Spectrum Computing (Official ZXDB)" );
  AppendMenuA( hSubArch, MF_STRING, IDM_FXR_ARCHIVE_WOS,     "World of Spectrum (&Classic Archive)" );
  AppendMenuA( hSubArch, MF_STRING, IDM_FXR_ARCHIVE_TIPSHOP, "The &Tipshop (.POK Trainers && Cheats)" );
  AppendMenuA( hSubArch, MF_STRING, IDM_FXR_ARCHIVE_VTRDOS,  "&Virtual TR-DOS (.TRD / .SCL Disks)" );

  AppendMenuA( hMenuGames, MF_STRING, IDM_FXR_RANDOM_ANY,        "Load &Random Game (Local / Auto-Cloud)\tF11" );
  AppendMenuA( hMenuGames, MF_STRING, IDM_FXR_ONLINE_RANDOM_ANY, "&Download Random Online Game (Live Cloud)\tShift+F11" );
  AppendMenuA( hMenuGames, MF_POPUP,  (UINT_PTR)hSubCloud,       "Online Random by &Host / Format (No TOSEC Needed)" );
  AppendMenuA( hMenuGames, MF_POPUP,  (UINT_PTR)hSubRndFmt,      "Random Game by &Format" );
  AppendMenuA( hMenuGames, MF_STRING, IDM_FXR_TOSEC_SEARCH_DLG,  "&Search TOSEC 29,000+ Archive..." );
  AppendMenuA( hMenuGames, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hMenuGames, MF_POPUP,  (UINT_PTR)hSubSnap,        "Featured &Snapshots (.Z80)" );
  AppendMenuA( hMenuGames, MF_POPUP,  (UINT_PTR)hSubTape,        "Featured &Tapes (.TAP / .TZX)" );
  AppendMenuA( hMenuGames, MF_POPUP,  (UINT_PTR)hSubDisk,        "Featured &Disks (+3 .DSK && TR-DOS .TRD)" );
  AppendMenuA( hMenuGames, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hMenuGames, MF_POPUP,  (UINT_PTR)hSubArch,        "Legitimate &Online Game Archives" );

  /* 2. Build "Easy Cheat" Menu */
  HMENU hMenuCheat = CreatePopupMenu();
  HMENU hSubCurated = CreatePopupMenu();
  for( i = 0; i < FXR_CHEAT_COUNT; i++ ) {
    AppendMenuA( hSubCurated, MF_STRING, IDM_FXR_CHEAT_CURATED_0 + i, g_fxr_cheats[i].menu_label );
  }
  AppendMenuA( hMenuCheat, MF_STRING, IDM_FXR_CHEAT_AUTO,       "&Auto-Apply Infinite Lives for Current Game" );
  AppendMenuA( hMenuCheat, MF_STRING, IDM_FXR_CHEAT_STUDIO_DLG, "Open &Easy Cheat && Live Pokefinder Studio..." );
  AppendMenuA( hMenuCheat, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hMenuCheat, MF_POPUP,  (UINT_PTR)hSubCurated,    "&Curated 1-Click Game Cheats (20 Classics)" );
  AppendMenuA( hMenuCheat, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hMenuCheat, MF_STRING, IDM_FXR_CHEAT_LOAD_POK,   "&Load .POK Trainer File..." );
  AppendMenuA( hMenuCheat, MF_STRING, IDM_FXR_CHEAT_POKEMEM_UI, "Manage Active .&POK Trainers..." );
  AppendMenuA( hMenuCheat, MF_STRING, IDM_FXR_CHEAT_PF_UI,      "Classic Fuse Poke &Finder..." );
  AppendMenuA( hMenuCheat, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hMenuCheat, MF_STRING, IDM_FXR_CHEAT_CLEAR_ALL,  "C&lear && Restore All Active Cheats" );

  /* 3. Build "Quick Setup" Menu */
  HMENU hMenuQuick = CreatePopupMenu();
  HMENU hSubMach   = CreatePopupMenu();
  HMENU hSubFilt   = CreatePopupMenu();
  HMENU hSubJoy    = CreatePopupMenu();
  g_fxr_hSubFilt   = hSubFilt;
  g_fxr_hSubJoy    = hSubJoy;

  AppendMenuA( hSubMach, MF_STRING, IDM_FXR_MACH_128,      "ZX Spectrum &128K (Toastrack)" );
  AppendMenuA( hSubMach, MF_STRING, IDM_FXR_MACH_PLUS3,    "ZX Spectrum +&3 (3\" Floppy Disk)" );
  AppendMenuA( hSubMach, MF_STRING, IDM_FXR_MACH_PLUS2,    "ZX Spectrum +&2 (Datacorder)" );
  AppendMenuA( hSubMach, MF_STRING, IDM_FXR_MACH_48,       "ZX Spectrum &48K (Rubber Key)" );
  AppendMenuA( hSubMach, MF_STRING, IDM_FXR_MACH_PENTAGON, "&Pentagon 128 (TR-DOS)" );
  AppendMenuA( hSubMach, MF_STRING, IDM_FXR_MACH_SCORPION, "&Scorpion ZS 256" );

  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_TV3X,       "T&V 3x (Crisp CRT Scanlines)" );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_TV2X,       "&TV 2x (CRT Scanlines)" );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_PALTV3X,    "P&AL TV 3x (Composite CRT)" );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_PALTV,      "&PAL TV 2x (Composite CRT)" );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_DOTMATRIX,  "&Dot Matrix" );
  AppendMenuA( hSubFilt, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_NORMAL,     "&Normal (1x)" );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_2X,         "&Double Size (2x)" );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_3X,         "T&riple Size (3x)" );
  AppendMenuA( hSubFilt, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_HQ3X,       "&HQ 3x Smooth" );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_SUPEREAGLE, "&SuperEagle" );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_ADVMAME2X,  "&AdvMAME 2x" );
  AppendMenuA( hSubFilt, MF_STRING, IDM_FXR_FILT_ADVMAME3X,  "A&dvMAME 3x" );

  AppendMenuA( hSubJoy, MF_STRING | MF_CHECKED, IDM_FXR_JOY_KEMPSTON,  "&Kempston Joystick (Default)" );
  AppendMenuA( hSubJoy, MF_STRING,              IDM_FXR_JOY_CURSOR,    "&Cursor / Protek Joystick" );
  AppendMenuA( hSubJoy, MF_STRING,              IDM_FXR_JOY_SINCLAIR1, "Sinclair &1 (Keys 6-0)" );
  AppendMenuA( hSubJoy, MF_STRING,              IDM_FXR_JOY_SINCLAIR2, "Sinclair &2 (Keys 1-5)" );
  AppendMenuA( hSubJoy, MF_STRING,              IDM_FXR_JOY_TIMEX1,    "&Timex 1 Joystick" );

  AppendMenuA( hMenuQuick, MF_POPUP,  (UINT_PTR)hSubMach,        "Switch &Machine Model (1-Click)" );
  AppendMenuA( hMenuQuick, MF_POPUP,  (UINT_PTR)hSubFilt,        "&CRT && Display Filter (1-Click)" );
  AppendMenuA( hMenuQuick, MF_POPUP,  (UINT_PTR)hSubJoy,         "&Joystick Input Mode (1-Click)" );
  AppendMenuA( hMenuQuick, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hMenuQuick, MF_STRING, IDM_FXR_QUICK_TAPE_PLAY,   "&Play / Pause Tape\tF8" );
  AppendMenuA( hMenuQuick, MF_STRING, IDM_FXR_QUICK_TAPE_REWIND, "Re&wind Tape" );
  AppendMenuA( hMenuQuick, MF_STRING, IDM_FXR_QUICK_TAPE_EJECT,  "&Eject / Clear Tape" );
  AppendMenuA( hMenuQuick, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hMenuQuick, MF_STRING, IDM_FXR_QUICK_FULLSCREEN,  "&Fullscreen / Zen Mode\tF10" );
  AppendMenuA( hMenuQuick, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hMenuQuick, MF_STRING, IDM_FXR_QUICK_RESET_SOFT,  "&Quick Reset Machine (No Prompt)" );
  AppendMenuA( hMenuQuick, MF_STRING, IDM_FXR_QUICK_RESET_HARD,  "&Hard Reset Machine (No Prompt)" );

  /* 4. Build "Quest VR" Top-Level Menu */
  HMENU hMenuVR = CreatePopupMenu();
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_TOGGLE,       "&Start / Stop Quest VR Broadcast\tF12" );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_OPEN_BROWSER, "&Open WebXR Studio in Browser" );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_COPY_URL,     "&Copy Stream URL to Clipboard" );
  AppendMenuA( hMenuVR, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_MODE_2D,      "Mode: &2D Cinema" );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_MODE_SBS,     "Mode: &SBS 3D Depth" );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_MODE_TB,      "Mode: Top-&Bottom 3D" );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_MODE_ANA,     "Mode: &Anaglyph Red/Cyan 3D" );
  AppendMenuA( hMenuVR, MF_SEPARATOR, 0, NULL );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_FPS_30,       "Target FPS: &30 FPS" );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_FPS_50,       "Target FPS: &50 FPS (PAL Native)" );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_FPS_60,       "Target FPS: &60 FPS" );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_FPS_72,       "Target FPS: &72 FPS (Quest)" );
  AppendMenuA( hMenuVR, MF_STRING, IDM_FXR_VR_FPS_90,       "Target FPS: &90 FPS (Quest 3)" );

  /* Insert the 4 compact top-level menus before "&Help" so all items + Random Dice fit on 1 row */
  int count = GetMenuItemCount( hBar );
  int insert_pos = ( count > 1 ) ? ( count - 1 ) : count;
  InsertMenuA( hBar, insert_pos++, MF_BYPOSITION | MF_POPUP, (UINT_PTR)hMenuGames, "&Games" );
  InsertMenuA( hBar, insert_pos++, MF_BYPOSITION | MF_POPUP, (UINT_PTR)hMenuCheat, "&Cheats" );
  InsertMenuA( hBar, insert_pos++, MF_BYPOSITION | MF_POPUP, (UINT_PTR)hMenuQuick, "&Setup" );
  InsertMenuA( hBar, insert_pos++, MF_BYPOSITION | MF_POPUP, (UINT_PTR)hMenuVR,    "&VR" );

  /* Add the 1-Click 3D Emerald Dice Button ("Random") right-aligned at the far right of the top menu bar */
  {
    MENUITEMINFOA mii;
    memset( &mii, 0, sizeof( mii ) );
    mii.cbSize = sizeof( mii );
    mii.fMask = MIIM_ID | MIIM_FTYPE | MIIM_STRING | MIIM_BITMAP;
    mii.fType = MFT_STRING | MFT_RIGHTJUSTIFY;
    mii.wID = IDM_FXR_DICE_BTN;
    mii.dwTypeData = (LPSTR)"Random";
    mii.hbmpItem = fxr_get_dice_bitmap();
    InsertMenuItemA( hBar, GetMenuItemCount( hBar ), TRUE, &mii );
  }

  if( g_fxr_locked_scaler >= 0 ) {
    quest_vr_notify_scaler_changed( g_fxr_locked_scaler );
  }
  DrawMenuBar( hWnd );
  fxr_update_window_title( NULL );
#else
  (void)hWnd_ptr;
#endif
}

int
quest_vr_handle_win32_menu( unsigned int cmd_id, void *hWnd_ptr )
{
#ifdef WIN32
  HWND hWnd = (HWND)hWnd_ptr;

  /* Bundled Featured Classic Game clicked */
  if( cmd_id >= IDM_FXR_LOCAL_GAME_BASE &&
      cmd_id < (unsigned int)( IDM_FXR_LOCAL_GAME_BASE + g_fxr_local_game_count ) ) {
    int idx = (int)( cmd_id - IDM_FXR_LOCAL_GAME_BASE );
    char full_path[512];
    const char *fn = g_fxr_local_games[idx];
    const char *ext = strrchr( fn, '.' );
    snprintf( full_path, sizeof( full_path ), "%s/games/%s", g_qvr.base_dir, fn );
    fxr_load_file_direct( full_path, fn, ext ? ( ext + 1 ) : "z80" );
    return 1;
  }

  /* Curated 1-Click Cheat clicked */
  if( cmd_id >= IDM_FXR_CHEAT_CURATED_0 &&
      cmd_id < (unsigned int)( IDM_FXR_CHEAT_CURATED_0 + FXR_CHEAT_COUNT ) ) {
    fxr_apply_curated_cheat( (int)( cmd_id - IDM_FXR_CHEAT_CURATED_0 ) );
    return 1;
  }

  switch( cmd_id ) {
  case IDM_FXR_DICE_BTN:
  case IDM_FXR_RANDOM_ANY:
    if( g_fxr_force_online_dice || ( GetKeyState( VK_SHIFT ) & 0x8000 ) ) {
      if( !fxr_download_random_online_game( NULL ) ) {
        fxr_load_random_game( NULL, 0 );
      }
    } else {
      fxr_load_random_game( NULL, 0 );
    }
    return 1;
  case IDM_FXR_RANDOM_Z80:   fxr_load_random_game( "z80", 0 ); return 1;
  case IDM_FXR_RANDOM_TAP:   fxr_load_random_game( "tap", 0 ); return 1;
  case IDM_FXR_RANDOM_DSK:   fxr_load_random_game( "dsk", 0 ); return 1;
  case IDM_FXR_RANDOM_TRD:   fxr_load_random_game( "trd", 0 ); return 1;
  case IDM_FXR_RANDOM_TZX:   fxr_load_random_game( "tzx", 0 ); return 1;
  case IDM_FXR_RANDOM_LOCAL: fxr_load_random_game( NULL,  1 ); return 1;

  case IDM_FXR_ONLINE_RANDOM_ANY: fxr_download_random_online_game( NULL );       return 1;
  case IDM_FXR_ONLINE_IA_TOSEC:   fxr_download_random_online_game( "ia_tosec" ); return 1;
  case IDM_FXR_ONLINE_IA_LIB:     fxr_download_random_online_game( "ia_lib" );   return 1;
  case IDM_FXR_ONLINE_VTRDOS:     fxr_download_random_online_game( "vtrdos" );   return 1;
  case IDM_FXR_ONLINE_FMT_Z80:    fxr_download_random_online_game( "z80" );      return 1;
  case IDM_FXR_ONLINE_FMT_TAP:    fxr_download_random_online_game( "tap" );      return 1;
  case IDM_FXR_ONLINE_FMT_DSK:    fxr_download_random_online_game( "dsk" );      return 1;
  case IDM_FXR_ONLINE_FMT_TRD:    fxr_download_random_online_game( "trd" );      return 1;
  case IDM_FXR_ONLINE_FMT_TZX:    fxr_download_random_online_game( "tzx" );      return 1;

  case IDM_FXR_ONLINE_TOGGLE_DICE:
    g_fxr_force_online_dice = !g_fxr_force_online_dice;
    if( g_fxr_hSubCloud ) {
      CheckMenuItem( g_fxr_hSubCloud, IDM_FXR_ONLINE_TOGGLE_DICE,
                     MF_BYCOMMAND | ( g_fxr_force_online_dice ? MF_CHECKED : MF_UNCHECKED ) );
    }
    fxr_update_window_title( g_fxr_force_online_dice ? "Dice Button: Online Cloud Mode" : "Dice Button: Auto/Local Mode" );
    return 1;

  case IDM_FXR_OPEN_DOWNLOADS_DIR: {
    char dl_dir[512];
    fxr_ensure_downloads_dir( dl_dir, sizeof( dl_dir ) );
    ShellExecuteA( NULL, "open", dl_dir, NULL, NULL, SW_SHOWNORMAL );
    return 1;
  }

  case IDM_FXR_TOSEC_SEARCH_DLG:
    fxr_open_tosec_search_dialog( hWnd );
    return 1;

  case IDM_FXR_ARCHIVE_IA_LIB:
    ShellExecuteA( NULL, "open", "https://archive.org/details/softwarelibrary_zx_spectrum", NULL, NULL, SW_SHOWNORMAL );
    return 1;
  case IDM_FXR_ARCHIVE_IA_WOS:
    ShellExecuteA( NULL, "open", "https://archive.org/details/world_of_spectrum", NULL, NULL, SW_SHOWNORMAL );
    return 1;
  case IDM_FXR_ARCHIVE_IA_Z80:
    ShellExecuteA( NULL, "open", "https://archive.org/details/zx_spectrum_library_z80", NULL, NULL, SW_SHOWNORMAL );
    return 1;
  case IDM_FXR_ARCHIVE_ZXDB:
    ShellExecuteA( NULL, "open", "https://spectrumcomputing.co.uk/", NULL, NULL, SW_SHOWNORMAL );
    return 1;
  case IDM_FXR_ARCHIVE_WOS:
    ShellExecuteA( NULL, "open", "https://worldofspectrum.org/archive", NULL, NULL, SW_SHOWNORMAL );
    return 1;
  case IDM_FXR_ARCHIVE_TIPSHOP:
    ShellExecuteA( NULL, "open", "https://the-tipshop.co.uk/", NULL, NULL, SW_SHOWNORMAL );
    return 1;
  case IDM_FXR_ARCHIVE_VTRDOS:
    ShellExecuteA( NULL, "open", "https://vtrd.in/", NULL, NULL, SW_SHOWNORMAL );
    return 1;

  case IDM_FXR_CHEAT_AUTO:
    if( !fxr_auto_apply_current_game_cheat() ) {
      fxr_open_easy_cheat_dialog( hWnd );
    }
    return 1;

  case IDM_FXR_CHEAT_STUDIO_DLG:
    fxr_open_easy_cheat_dialog( hWnd );
    return 1;

  case IDM_FXR_CHEAT_LOAD_POK: {
    char file_buf[512] = { 0 };
    OPENFILENAMEA ofn;
    memset( &ofn, 0, sizeof( ofn ) );
    ofn.lStructSize = sizeof( ofn );
    ofn.hwndOwner = hWnd;
    ofn.lpstrFilter = "POK Trainer Files (*.pok)\0*.pok\0All Files (*.*)\0*.*\0";
    ofn.lpstrFile = file_buf;
    ofn.nMaxFile = sizeof( file_buf );
    ofn.Flags = OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR;
    if( GetOpenFileNameA( &ofn ) && file_buf[0] ) {
      pokemem_read_from_file( file_buf );
      menu_machine_pokememory( 0 );
    }
    return 1;
  }

  case IDM_FXR_CHEAT_POKEMEM_UI:
    menu_machine_pokememory( 0 );
    return 1;

  case IDM_FXR_CHEAT_PF_UI:
    menu_machine_pokefinder( 0 );
    return 1;

  case IDM_FXR_CHEAT_CLEAR_ALL:
    fxr_clear_all_cheats_direct();
    return 1;

  case IDM_FXR_MACH_128:      machine_select_id( "128" );      display_refresh_all(); fxr_update_window_title( "128K" ); return 1;
  case IDM_FXR_MACH_PLUS3:    machine_select_id( "plus3" );    display_refresh_all(); fxr_update_window_title( "+3" ); return 1;
  case IDM_FXR_MACH_PLUS2:    machine_select_id( "plus2" );    display_refresh_all(); fxr_update_window_title( "+2" ); return 1;
  case IDM_FXR_MACH_48:       machine_select_id( "48" );       display_refresh_all(); fxr_update_window_title( "48K" ); return 1;
  case IDM_FXR_MACH_PENTAGON: machine_select_id( "pentagon" ); display_refresh_all(); fxr_update_window_title( "Pentagon 128" ); return 1;
  case IDM_FXR_MACH_SCORPION: machine_select_id( "scorpion" ); display_refresh_all(); fxr_update_window_title( "Scorpion" ); return 1;

  case IDM_FXR_FILT_TV2X:       quest_vr_notify_scaler_changed( SCALER_TV2X );       scaler_select_scaler( SCALER_TV2X );       display_refresh_all(); return 1;
  case IDM_FXR_FILT_TV3X:       quest_vr_notify_scaler_changed( SCALER_TV3X );       scaler_select_scaler( SCALER_TV3X );       display_refresh_all(); return 1;
  case IDM_FXR_FILT_PALTV:      quest_vr_notify_scaler_changed( SCALER_PALTV2X );    scaler_select_scaler( SCALER_PALTV2X );    display_refresh_all(); return 1;
  case IDM_FXR_FILT_PALTV3X:    quest_vr_notify_scaler_changed( SCALER_PALTV3X );    scaler_select_scaler( SCALER_PALTV3X );    display_refresh_all(); return 1;
  case IDM_FXR_FILT_DOTMATRIX:  quest_vr_notify_scaler_changed( SCALER_DOTMATRIX );  scaler_select_scaler( SCALER_DOTMATRIX );  display_refresh_all(); return 1;
  case IDM_FXR_FILT_HQ3X:       quest_vr_notify_scaler_changed( SCALER_HQ3X );       scaler_select_scaler( SCALER_HQ3X );       display_refresh_all(); return 1;
  case IDM_FXR_FILT_NORMAL:     quest_vr_notify_scaler_changed( SCALER_NORMAL );     scaler_select_scaler( SCALER_NORMAL );     display_refresh_all(); return 1;
  case IDM_FXR_FILT_2X:         quest_vr_notify_scaler_changed( SCALER_DOUBLESIZE ); scaler_select_scaler( SCALER_DOUBLESIZE ); display_refresh_all(); return 1;
  case IDM_FXR_FILT_3X:         quest_vr_notify_scaler_changed( SCALER_TRIPLESIZE ); scaler_select_scaler( SCALER_TRIPLESIZE ); display_refresh_all(); return 1;
  case IDM_FXR_FILT_SUPEREAGLE: quest_vr_notify_scaler_changed( SCALER_SUPEREAGLE ); scaler_select_scaler( SCALER_SUPEREAGLE ); display_refresh_all(); return 1;
  case IDM_FXR_FILT_ADVMAME2X:  quest_vr_notify_scaler_changed( SCALER_ADVMAME2X );  scaler_select_scaler( SCALER_ADVMAME2X );  display_refresh_all(); return 1;
  case IDM_FXR_FILT_ADVMAME3X:  quest_vr_notify_scaler_changed( SCALER_ADVMAME3X );  scaler_select_scaler( SCALER_ADVMAME3X );  display_refresh_all(); return 1;

  case IDM_FXR_JOY_KEMPSTON:
  case IDM_FXR_JOY_CURSOR:
  case IDM_FXR_JOY_SINCLAIR1:
  case IDM_FXR_JOY_SINCLAIR2:
  case IDM_FXR_JOY_TIMEX1: {
    int jtype = JOYSTICK_TYPE_KEMPSTON;
    const char *jlabel = "Joystick: Kempston";
    if( cmd_id == IDM_FXR_JOY_CURSOR )    { jtype = JOYSTICK_TYPE_CURSOR;     jlabel = "Joystick: Cursor"; }
    if( cmd_id == IDM_FXR_JOY_SINCLAIR1 ) { jtype = JOYSTICK_TYPE_SINCLAIR_1; jlabel = "Joystick: Sinclair 1"; }
    if( cmd_id == IDM_FXR_JOY_SINCLAIR2 ) { jtype = JOYSTICK_TYPE_SINCLAIR_2; jlabel = "Joystick: Sinclair 2"; }
    if( cmd_id == IDM_FXR_JOY_TIMEX1 )    { jtype = JOYSTICK_TYPE_TIMEX_1;    jlabel = "Joystick: Timex 1"; }
    settings_current.joystick_1_output = jtype;
    settings_current.joystick_2_output = jtype;
    /* Keep keyboard joystick on Kempston so QAOP+Space and 67890 on the keyboard always work! */
    settings_current.joystick_keyboard_output = JOYSTICK_TYPE_KEMPSTON;
    settings_current.joy_kempston = 1;
    periph_update();
    if( g_fxr_hSubJoy ) {
      CheckMenuItem( g_fxr_hSubJoy, IDM_FXR_JOY_KEMPSTON,  MF_BYCOMMAND | ( cmd_id == IDM_FXR_JOY_KEMPSTON  ? MF_CHECKED : MF_UNCHECKED ) );
      CheckMenuItem( g_fxr_hSubJoy, IDM_FXR_JOY_CURSOR,    MF_BYCOMMAND | ( cmd_id == IDM_FXR_JOY_CURSOR    ? MF_CHECKED : MF_UNCHECKED ) );
      CheckMenuItem( g_fxr_hSubJoy, IDM_FXR_JOY_SINCLAIR1, MF_BYCOMMAND | ( cmd_id == IDM_FXR_JOY_SINCLAIR1 ? MF_CHECKED : MF_UNCHECKED ) );
      CheckMenuItem( g_fxr_hSubJoy, IDM_FXR_JOY_SINCLAIR2, MF_BYCOMMAND | ( cmd_id == IDM_FXR_JOY_SINCLAIR2 ? MF_CHECKED : MF_UNCHECKED ) );
      CheckMenuItem( g_fxr_hSubJoy, IDM_FXR_JOY_TIMEX1,    MF_BYCOMMAND | ( cmd_id == IDM_FXR_JOY_TIMEX1    ? MF_CHECKED : MF_UNCHECKED ) );
    }
    fxr_update_window_title( jlabel );
    return 1;
  }

  case IDM_FXR_QUICK_TAPE_PLAY:   tape_toggle_play( 0 ); return 1;
  case IDM_FXR_QUICK_TAPE_REWIND: tape_rewind(); return 1;
  case IDM_FXR_QUICK_TAPE_EJECT:  tape_close(); return 1;
  case IDM_FXR_QUICK_FULLSCREEN:  quest_vr_toggle_fullscreen( hWnd ); return 1;
  case IDM_FXR_QUICK_RESET_SOFT:  machine_reset( 0 ); display_refresh_all(); return 1;
  case IDM_FXR_QUICK_RESET_HARD:  machine_reset( 1 ); display_refresh_all(); return 1;

  case IDM_FXR_VR_TOGGLE:       quest_vr_toggle(); return 1;
  case IDM_FXR_VR_OPEN_BROWSER: quest_vr_open_browser(); return 1;
  case IDM_FXR_VR_COPY_URL:     quest_vr_copy_url_to_clipboard(); return 1;
  case IDM_FXR_VR_MODE_2D:      quest_vr_set_stereo_mode( QUEST_VR_MODE_2D ); return 1;
  case IDM_FXR_VR_MODE_SBS:     quest_vr_set_stereo_mode( QUEST_VR_MODE_SBS_3D ); return 1;
  case IDM_FXR_VR_MODE_TB:      quest_vr_set_stereo_mode( QUEST_VR_MODE_TB_3D ); return 1;
  case IDM_FXR_VR_MODE_ANA:     quest_vr_set_stereo_mode( QUEST_VR_MODE_ANAGLYPH_3D ); return 1;
  case IDM_FXR_VR_FPS_30:       quest_vr_set_target_fps( 30 ); return 1;
  case IDM_FXR_VR_FPS_50:       quest_vr_set_target_fps( 50 ); return 1;
  case IDM_FXR_VR_FPS_60:       quest_vr_set_target_fps( 60 ); return 1;
  case IDM_FXR_VR_FPS_72:       quest_vr_set_target_fps( 72 ); return 1;
  case IDM_FXR_VR_FPS_90:       quest_vr_set_target_fps( 90 ); return 1;
  }
#else
  (void)cmd_id;
  (void)hWnd_ptr;
#endif
  return 0;
}
