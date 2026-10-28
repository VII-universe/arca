// Shared GLSL for the landing's scene. Everything is in linear light inside
// the shaders; the last line of every fragment converts to the display's
// colour space (Three's `colorspace_fragment`). The renderer uses a
// logarithmic depth buffer, so every mesh shader includes Three's
// log-depth chunks.

export const LOGDEPTH_VERT_PARS = /* glsl */ `#include <common>
#include <logdepthbuf_pars_vertex>`;
export const LOGDEPTH_VERT = /* glsl */ `#include <logdepthbuf_vertex>`;
export const LOGDEPTH_FRAG_PARS = /* glsl */ `#include <logdepthbuf_pars_fragment>`;
export const LOGDEPTH_FRAG = /* glsl */ `#include <logdepthbuf_fragment>`;
export const OUTPUT = /* glsl */ `#include <colorspace_fragment>`;

export const NOISE3 = /* glsl */ `
float h3(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm3(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * n3(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
float fbm4(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * n3(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
`;

// A gentle filmic shoulder: linear below ~0.6, rolls off above, never clips hard.
export const TONEMAP = /* glsl */ `
vec3 tonemap(vec3 c){
  c = max(c, 0.0);
  return c / (1.0 + c * 0.35) * 1.08;
}
`;

export const QUAD_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
