// GLSL ES 1.00 (WebGL 1) — the widest-supported target; one full-screen
// triangle, everything happens in the fragment shader.
//
// Coordinate space: `p` is in "viewport-height units" — x in [0, aspect],
// y in [0, 1] with 0 at the TOP, so it matches CSS/DOM coordinates and the
// orb positions the JS side computes from layout.

export const MAX_ORBS = 8;

export const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

#define MAX_ORBS ${MAX_ORBS}

uniform vec2  uRes;        // render target size in px
uniform float uTime;       // seconds
uniform float uScroll;     // page scroll in viewport heights
uniform vec2  uMouse;      // -1..1, smoothed
uniform vec3  uA;          // atmosphere light A (top left)
uniform vec3  uB;          // atmosphere light B (bottom)
uniform vec3  uC;          // atmosphere light C (right)
uniform vec3  uDeep;       // atmosphere base
uniform float uStars;      // 0..1 — strength of the far "waiting messages" lights
uniform float uDetail;     // 0..1 — quality knob (noise octaves, dispersion)
uniform vec4  uOrb[MAX_ORBS];     // xy centre (p-space), z radius, w opacity
uniform vec4  uOrbTint[MAX_ORBS]; // rgb tint, a = inner light
uniform int   uOrbCount;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    if (float(i) > 1.0 + uDetail) break;
    v += a * noise(p);
    p = p * 2.03 + 11.7;
    a *= 0.5;
  }
  return v;
}

// Soft radial light, shaped like the CSS radial-gradient fallback.
float light(vec2 p, vec2 c, float r) {
  float d = length(p - c) / r;
  return pow(clamp(1.0 - d, 0.0, 1.0), 1.6);
}

// The atmosphere behind everything — what the glass orbs refract.
vec3 field(vec2 p) {
  float aspect = uRes.x / uRes.y;
  float t = uTime * 0.035;
  vec2 warp = vec2(fbm(p * 1.4 + vec2(t, -t)), fbm(p * 1.4 + vec2(5.2 - t, 1.3 + t))) - 0.5;
  vec2 q = p + warp * 0.22;
  float drift = uScroll * 0.08;

  vec3 col = uDeep;
  col += uA * 0.62 * light(q, vec2(0.12 * aspect + 0.04 * sin(t * 2.1), 0.06 - drift), 1.25);
  col += uC * 0.52 * light(q, vec2(0.92 * aspect, 0.30 + 0.05 * cos(t * 1.7) - drift * 0.6), 1.05);
  col += uB * 0.56 * light(q, vec2(0.46 * aspect + 0.05 * cos(t * 1.3), 1.12 - drift * 0.3), 1.45);
  return col;
}

// Far, tiny lights — every one a message that is waiting.
vec3 stars(vec2 p) {
  vec2 sp = p * 34.0 + vec2(0.0, uScroll * 6.0);
  vec2 cell = floor(sp);
  vec2 f = fract(sp) - 0.5;
  float h = hash(cell);
  if (h < 0.86) return vec3(0.0);
  vec2 o = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
  float d = length(f - o * 0.7);
  float tw = 0.55 + 0.45 * sin(uTime * (0.6 + h * 1.4) + h * 40.0);
  float s = smoothstep(0.09, 0.0, d) * tw;
  return vec3(s) * (0.35 + 0.65 * fract(h * 13.0));
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = frag / uRes.y;
  float px = 1.0 / uRes.y;

  vec3 col = field(p);
  col += stars(p + uMouse * 0.004) * uStars;

  for (int i = 0; i < MAX_ORBS; i++) {
    if (i >= uOrbCount) break;
    vec4 o = uOrb[i];
    vec4 tint = uOrbTint[i];
    float r = o.z;
    vec2 rel = p - o.xy;
    float d = length(rel);

    // Emission halo — the light each message carries.
    float halo = exp(-pow(max(d - r * 0.6, 0.0) / (r * 1.1), 2.0));
    col += tint.rgb * halo * 0.28 * tint.a * o.w;

    if (d < r + px * 2.0) {
      vec2 nxy = rel / r;
      float nz = sqrt(max(1.0 - dot(nxy, nxy), 0.0));
      vec3 n = vec3(nxy, nz);

      // Refraction with a little chromatic dispersion.
      float bend = r * (0.55 + 0.25 * uDetail) * (1.0 - nz);
      vec2 off = -nxy * bend;
      float disp = 0.06 * uDetail;
      vec3 refr = vec3(
        field(p + off * (1.0 - disp)).r,
        field(p + off).g,
        field(p + off * (1.0 + disp)).b
      );

      // Light carried inside the glass.
      vec3 core = tint.rgb * (0.25 + 0.75 * nz) * tint.a;

      float fres = pow(1.0 - nz, 3.0);
      vec3 L = normalize(vec3(-0.55, -0.7, 0.9));
      float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 48.0);
      float spec2 = pow(max(dot(reflect(-normalize(vec3(0.6, 0.5, 0.6)), n), vec3(0.0, 0.0, 1.0)), 0.0), 16.0);

      vec3 glass = refr * 1.08 + core * 0.55;
      glass += mix(tint.rgb, vec3(1.0), 0.55) * fres * 0.75;
      glass += vec3(1.0) * spec * 0.9 + tint.rgb * spec2 * 0.12;

      float edge = smoothstep(r + px * 1.5, r - px * 1.5, d);
      col = mix(col, glass, edge * o.w);
    }
  }

  // Dither against banding (the CSS grain sits on top as well).
  col += (hash(frag + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;
