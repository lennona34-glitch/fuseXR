/**
 * Vintage Easy CRT Monitor Shader for ZX Spectrum XR
 * Features authentic Commodore 1084S / Sony Trinitron aperture grille, subtle scanlines,
 * gentle glass curvature, edge vignette, and phosphor boost matching the Amiga emulator.
 */
import * as THREE from 'three';

export function createCRTMaterial(screenTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: screenTexture },
      uResolution: { value: new THREE.Vector2(320.0, 240.0) },
      uScanlineIntensity: { value: 0.35 },
      uMaskIntensity: { value: 0.20 },
      uBrightness: { value: 1.12 },
      uCurvature: { value: 0.04 },
      uVignette: { value: 0.15 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform vec2 uResolution;
      uniform float uScanlineIntensity;
      uniform float uMaskIntensity;
      uniform float uBrightness;
      uniform float uCurvature;
      uniform float uVignette;

      varying vec2 vUv;

      vec2 curveUv(vec2 uv) {
        if (uCurvature <= 0.001) return uv;
        vec2 d = uv - 0.5;
        float r2 = dot(d, d);
        return 0.5 + d * (1.0 + uCurvature * r2);
      }

      void main() {
        vec2 uv = curveUv(vUv);
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          gl_FragColor = vec4(0.02, 0.02, 0.02, 1.0);
          return;
        }

        vec4 col = texture2D(tDiffuse, uv);

        // 1. Subtle smooth scanlines
        if (uScanlineIntensity > 0.001) {
          float scanline = sin(uv.y * uResolution.y * 3.14159265);
          scanline = (scanline + 1.0) * 0.5;
          col.rgb -= col.rgb * (1.0 - scanline) * uScanlineIntensity;
        }

        // 2. Phosphor Shadow Mask (RGB triad stripes)
        if (uMaskIntensity > 0.001) {
          float m = mod(uv.x * uResolution.x * 3.0, 3.0);
          vec3 mask = vec3(1.0 - uMaskIntensity);
          if (m < 1.0) mask.r = 1.0;
          else if (m < 2.0) mask.g = 1.0;
          else mask.b = 1.0;
          col.rgb *= mask;
        }

        // 3. Subtle Vignette
        if (uVignette > 0.001) {
          vec2 centerDist = (uv - 0.5) * 2.0;
          float vig = 1.0 - dot(centerDist, centerDist) * (uVignette * 0.4);
          col.rgb *= clamp(vig, 0.0, 1.0);
        }

        col.rgb *= uBrightness;
        gl_FragColor = col;
      }
    `,
    side: THREE.DoubleSide
  });
}
