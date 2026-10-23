// Shaders for the landing's sky. Units: parsecs, equatorial J2000 frame
// (the HYG catalogue's x/y/z), Sun at the origin.

export const NOISE3 = /* glsl */ `
float h3(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm3(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++){ v += a * n3(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
`;

// ── Sky light, baked into a cube map once per atmosphere ────────────────────
// The Milky Way (placed by galactic coordinates) and the atmosphere's nebulae.
// RGB is stored as sqrt() so 8 bits keep the dark gradients smooth; alpha is
// the density of unresolved stars, which the per-pixel pass turns into grain.
export const SKYGEN_VERT = /* glsl */ `
varying vec3 vDir;
void main(){
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const SKYGEN_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform vec3 uNebA; uniform vec3 uNebB; uniform float uNebAmt; uniform float uNebScale; uniform float uMilky;
${NOISE3}
// Equatorial (J2000) -> galactic rotation (rows of the IAU matrix).
const vec3 G0 = vec3(-0.0548755604, -0.8734370902, -0.4838350155);
const vec3 G1 = vec3( 0.4941094279, -0.4448296300,  0.7469822445);
const vec3 G2 = vec3(-0.8676661490, -0.1980763734,  0.4559837762);
void main(){
  vec3 d = normalize(vDir);
  vec3 g = vec3(dot(G0, d), dot(G1, d), dot(G2, d));
  float l = atan(g.y, g.x);           // galactic longitude, 0 = centre
  float b = asin(clamp(g.z, -1.0, 1.0));

  // Milky Way: a soft band along b = 0, wider and warmer toward the centre,
  // mottled, cut by the dark lanes of the Great Rift.
  float core = exp(-pow(l / 0.75, 2.0));
  float width = 0.11 + 0.08 * core + 0.04 * (fbm3(d * 3.0) - 0.5);
  float band = exp(-pow(b / width, 2.0));
  float clumps = fbm3(d * 9.0 + 3.1);
  float fine = fbm3(d * 26.0);
  float milky = band * (0.45 + 0.9 * clumps) * (0.6 + 0.5 * fine) * (1.0 + 1.8 * core);
  float rift = smoothstep(0.42, 0.7, fbm3(d * 7.0 + vec3(5.0))) * exp(-pow(b / 0.05, 2.0)) * (0.4 + 0.6 * core);
  milky *= 1.0 - 0.88 * rift;
  vec3 col = mix(vec3(0.62, 0.68, 0.82), vec3(0.95, 0.86, 0.72), core) * milky * 0.14 * uMilky;

  // Nebulae: domain-warped noise at two scales, tinted by the atmosphere,
  // carved by dust, concentrated toward the galactic plane.
  vec3 q = d * uNebScale;
  vec3 w = vec3(fbm3(q + 1.3), fbm3(q + 7.7), fbm3(q + 4.1));
  float neb = fbm3(q + 2.6 * w);
  float neb2 = fbm3(q * 0.45 + 1.7 * w + 9.0);
  float near = 0.35 + 0.65 * exp(-pow(b / 0.45, 2.0));
  float cloud = smoothstep(0.42, 0.9, neb) * near;
  cloud += pow(cloud, 3.0) * 0.8;                       // brighter knots inside the clouds
  float veil = smoothstep(0.38, 0.85, neb2) * near;
  float dust = smoothstep(0.55, 0.85, fbm3(q * 2.2 + w * 3.0));
  col += (uNebA * cloud * 0.7 + uNebB * veil * 0.42) * uNebAmt * (1.0 - 0.6 * dust);

  float density = clamp(band * (0.6 + clumps) * (1.0 - 0.8 * rift), 0.0, 1.0);
  gl_FragColor = vec4(sqrt(clamp(col, 0.0, 1.0)), density);
}`;

// ── Sky, per pixel: the baked light, crossfaded between atmospheres, plus
// unresolved-star grain, film grain and the ground's atmosphere ────────────
export const SKY_VERT = /* glsl */ `
uniform mat4 uViewDir;          // clip-space corner -> world direction
varying vec3 vDir;
void main(){
  vDir = (uViewDir * vec4(position.xy, 1.0, 1.0)).xyz;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform samplerCube uCubeA; uniform samplerCube uCubeB; uniform float uMix; uniform float uCubeFlip;
uniform float uMilky; uniform float uExtinction; uniform vec3 uZenith; uniform float uDim; uniform float uPx;
${NOISE3}
void main(){
  vec3 d = normalize(vDir);
  vec3 cd = vec3(d.x * uCubeFlip, d.yz);
  vec4 a = textureCube(uCubeA, cd), b = textureCube(uCubeB, cd);
  vec3 lightA = a.rgb * a.rgb, lightB = b.rgb * b.rgb;
  vec3 light = mix(lightA, lightB, uMix);
  float density = mix(a.a, b.a, uMix);

  // #05070D — never pure black.
  vec3 col = vec3(0.0196, 0.0275, 0.051) + light;

  // Unresolved stars: a fine grain of faint points, densest in the band —
  // what makes the Milky Way read as "millions of suns", not fog.
  float grain = 0.0;
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 380.0 : 820.0;
    vec3 gp = d * sc;
    vec3 cell = floor(gp);
    float hh = h3(cell + float(k) * 17.0);
    vec3 jit = vec3(h3(cell + 1.3), h3(cell + 2.7), h3(cell + 5.1)) - 0.5;
    float r = length(fract(gp) - 0.5 - jit * 0.55);
    grain += step(mix(0.9965, 0.955, density), hh) * smoothstep(0.32, 0.0, r) * (0.35 + 0.65 * h3(cell + 9.1));
  }
  col += vec3(0.8, 0.84, 0.95) * grain * 0.32 * uMilky;

  // From the ground: the sky dims toward the horizon, airglow lifts it a little.
  float elev = dot(d, uZenith);
  col *= 1.0 - uExtinction * 0.6 * (1.0 - smoothstep(0.0, 0.4, elev));
  col += uExtinction * vec3(0.020, 0.026, 0.042) * exp(-max(elev, 0.0) * 6.0);
  col *= uDim;

  // Film grain (≤ 3 %), which also dithers the dark gradients.
  col += (h3(vec3(floor(gl_FragCoord.xy / max(uPx, 1.0)), 4.0)) - 0.5) * 0.022;
  gl_FragColor = vec4(col, 1.0);
}`;

// ── Stars: true 3D positions, brightness from the real distance to camera ──
export const STAR_VERT = /* glsl */ `
attribute float aAbs; attribute vec3 aColor; attribute float aSeed;
uniform vec3 uCam; uniform float uPx; uniform float uTime; uniform float uMagLimit; uniform float uExtinction; uniform vec3 uZenith;
uniform float uDim; uniform float uTwinkle;
varying vec3 vColor; varying float vAlpha; varying float vSize; varying float vBig;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = distance(position, uCam);
  float m = aAbs + 5.0 * log(max(d, 1e-6) / 10.0) / log(10.0);
  // Seen from the ground, stars near the horizon fade (airmass).
  float elev = dot(normalize(position - uCam), uZenith);
  m += uExtinction * 1.6 * (1.0 - smoothstep(0.0, 0.35, abs(elev)));
  // Hidden: the star we're standing next to (drawn as a corona instead), or too faint.
  if (d < 0.004 || m > uMagLimit) { gl_PointSize = 0.0; vAlpha = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float flux = pow(10.0, -0.4 * (m - 1.0));
  vBig = smoothstep(2.2, -1.2, m);
  float size = clamp(2.2 + 3.3 * pow(flux, 0.34), 2.2, 10.0);
  size = mix(size, 22.0 + 26.0 * pow(min(flux, 40.0) / 40.0, 0.5), vBig);
  vSize = size * uPx;
  gl_PointSize = vSize;
  // Slow twinkle, a different phase per star — breathing, not a disco.
  float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (0.15 + aSeed * 0.4) + aSeed * 40.0));
  vAlpha = clamp(0.2 + 0.9 * pow(flux, 0.4), 0.0, 1.6) * tw * uDim;
  vColor = aColor;
}`;

export const STAR_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor; varying float vAlpha; varying float vSize; varying float vBig;
void main(){
  vec2 c = (gl_PointCoord - 0.5) * vSize;          // in pixels from the centre
  float r = length(c);
  float sigma = mix(0.85, 1.6, vBig);
  float core = exp(-r * r / (2.0 * sigma * sigma));
  float halo = exp(-r / (2.2 + 0.18 * vSize)) * 0.22 * vBig;
  // Soft diffraction — thin, short, only on the brightest stars.
  float sx = exp(-abs(c.y) / 0.55) * exp(-abs(c.x) / (vSize * 0.16));
  float sy = exp(-abs(c.x) / 0.55) * exp(-abs(c.y) / (vSize * 0.16));
  float spikes = (sx + sy) * 0.45 * vBig;
  float edge = smoothstep(vSize * 0.5, vSize * 0.32, r);
  gl_FragColor = vec4(vColor * (core + halo + spikes) * edge * vAlpha, 1.0);
}`;

// ── Night meadow: quiet hills, a wooded ridge, mist and skyglow ────────────
// Screen-space, drawn over the sky while the camera is on the ground.
export const QUAD_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const MEADOW_FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uHorizon; uniform float uYaw; uniform float uFade; uniform vec3 uGlowWarm; uniform float uTime;
${NOISE3}
float n1(float x){ return fbm3(vec3(x, 0.37, 0.71)); }
float r1(float x){ return clamp((n1(x) - 0.3) / 0.4, 0.0, 1.0); }
float aa(float d, float pw){ return smoothstep(pw, -pw, d); }   // 1 inside (d < 0), anti-aliased
// A small conifer with tiered, ragged branches.
float conifer(vec2 p, vec2 base, float h, float seed, float pw){
  vec2 q = (p - base) / h;
  if (q.y < -0.02 || q.y > 1.04) return 0.0;
  float tier = fract(q.y * 6.0 + seed);
  float rag = n3(vec3(q.y * 46.0, seed * 13.0, sign(q.x))) - 0.5;
  float w = (1.0 - q.y) * 0.29 * (0.62 + 0.5 * (1.0 - tier)) + 0.045 * rag * (1.0 - q.y) + 0.006;
  return max(aa(abs(q.x) - w, pw / h) * step(0.06, q.y), aa(abs(q.x) - 0.02, pw / h) * step(q.y, 0.12));
}
// A distant tree line: overlapping spires of different heights.
float treeline(float x, float k, float seed){
  float c = floor(x * k), f = fract(x * k);
  float t1 = (0.45 + 0.55 * h3(vec3(c, seed, 1.0))) * max(0.0, 1.0 - abs(f - 0.5) * 2.3);
  float c2 = floor(x * k + 0.5), f2 = fract(x * k + 0.5);
  float t2 = (0.3 + 0.5 * h3(vec3(c2, seed, 2.0))) * max(0.0, 1.0 - abs(f2 - 0.5) * 2.6);
  return max(t1, t2);
}
float band(float y, float c, float w){ return exp(-pow((y - c) / w, 2.0)); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float pw = 1.2 / uRes.y;
  float x = uv.x * aspect, y = uv.y, h = uHorizon;
  float above = max(y - h, 0.0);

  // Skyglow: cool airglow along the whole horizon, a warm town far off to the left.
  float o = -uYaw * 1.1;
  float town = exp(-pow((x - 0.2 * aspect - o * 0.45) / 0.55, 2.0));
  vec3 air = vec3(0.045, 0.068, 0.105);
  vec3 warm = uGlowWarm * 3.2 * town;
  vec3 glow = air * (exp(-above * 6.0) * 0.8 + exp(-above * 22.0) * 0.5)
            + warm * (exp(-above * 9.0) * 0.55 + exp(-above * 32.0) * 0.6);
  // High above the land there is only the glow: skip the landscape maths.
  if (y > h + 0.12) { gl_FragColor = vec4(glow * uFade, 0.0); return; }

  // Three layers with their own parallax: far hills, a wooded ridge, the meadow.
  float xf = x + uYaw * 0.5, xm = x + uYaw * 0.8, xn = x + uYaw * 1.1;
  float farY = h + 0.016 + 0.05 * r1(xf * 0.8 + 2.0) + 0.005 * n1(xf * 9.0);
  float forest = smoothstep(0.42, 0.62, n1(xm * 0.6 + 13.0));
  float midBase = h + 0.002 + 0.03 * r1(xm * 1.2 + 5.0);
  float midY = midBase + 0.004 * n1(xm * 14.0 + 1.0) + forest * 0.024 * treeline(xm, 70.0, 3.0);
  #define RIDGE(px) (h - 0.035 + 0.11 * smoothstep(0.0, 1.0, r1(((px) + uYaw * 1.1) * 0.42 + 8.0)) + 0.008 * n1(((px) + uYaw * 1.1) * 5.0 + 3.0))
  float nearY = RIDGE(x);
  // Grass: a fine fringe of blades along the near edge, ~2 css px apart.
  float cell = floor(xn * 520.0);
  float blade = pow(h3(vec3(cell, 7.0, 1.0)), 2.5) * 0.009 + 0.005 * n1(xn * 60.0);
  float bladeW = smoothstep(0.5, 0.15, abs(fract(xn * 520.0) - 0.5));
  float nearTop = nearY + blade * bladeW;

  // Two small spruces at the very edge — scale, not a motif.
  vec2 P = vec2(x, y);
  float trees = 0.0, tx;
  tx = 0.035 * aspect + o; trees = max(trees, conifer(P, vec2(tx, RIDGE(tx) - 0.005), 0.062, 0.1, pw));
  tx = 0.058 * aspect + o; trees = max(trees, conifer(P, vec2(tx, RIDGE(tx) - 0.005), 0.042, 0.6, pw));

  float farLand = aa(y - farY, pw);
  float midLand = aa(y - midY, pw);
  float nearLand = max(aa(y - nearTop, pw), trees);

  // Aerial perspective: the further the land, the more it takes the sky's colour.
  vec3 atH = air * 1.3 + warm * 1.15;
  vec3 farCol = atH * mix(0.5, 0.36, smoothstep(farY - 0.04, farY, y));
  vec3 midCol = atH * 0.3;
  float depth01 = clamp((nearY - y) / max(nearY, 0.05), 0.0, 1.0);
  vec3 nearCol = mix(atH * 0.11, vec3(0.004, 0.005, 0.007), pow(depth01, 0.45));
  nearCol *= 1.0 + (h3(vec3(floor(x * 700.0), floor(y * 140.0), 3.0)) - 0.5) * 0.25 * depth01;

  // Mist: drifting banks pooled between the layers, stretched horizontally.
  float drift = uTime * 0.004;
  float mistTex = 0.55 + 0.45 * (0.65 * n3(vec3(x * 2.5 + drift, y * 9.0, 1.0)) + 0.35 * n3(vec3(x * 6.0 - drift, y * 24.0, 4.0)));
  vec3 mistCol = air * 1.6 + warm * 0.55;
  float mistFar = band(y, h + 0.006, 0.02) * mistTex;
  float mistMid = band(y, midBase - 0.01, 0.022) * mistTex;
  float mistNear = band(y, nearY + 0.004, 0.03) * (0.5 + 0.5 * mistTex);

  vec3 col = glow;
  float alpha = 0.0;
  col = mix(col, farCol, farLand); alpha = farLand;
  col += mistCol * mistFar * 0.7;
  col = mix(col, midCol, midLand); alpha = max(alpha, midLand);
  col += mistCol * mistMid * 0.55 * (1.0 - nearLand);
  col = mix(col, mix(nearCol, vec3(0.003, 0.004, 0.006), trees), nearLand); alpha = max(alpha, nearLand);
  col += mistCol * mistNear * 0.35 * (1.0 - trees * 0.6);
  gl_FragColor = vec4(col * uFade, alpha * uFade);
}`;

// ── A star seen up close: core, corona and slow rays (billboard) ────────────
export const CORONA_VERT = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv - 0.5;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));   // camera-facing, keeps the scale
  gl_Position = projectionMatrix * mv;
}`;

export const CORONA_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor; uniform float uIntensity; uniform float uTime;
${NOISE3}
void main(){
  float r = length(vUv) * 2.0;                 // 0 centre .. 1 edge of the quad
  float a = atan(vUv.y, vUv.x);
  float core = exp(-r * r * 900.0) * 4.0 + exp(-r * r * 90.0) * 1.2;
  float corona = exp(-r * 6.5) * 0.85;
  float glow = exp(-r * 2.2) * 0.32 + exp(-r * 0.9) * 0.06;
  float rays = pow(max(0.0, fbm3(vec3(cos(a) * 5.0, sin(a) * 5.0, uTime * 0.03))), 3.0) * exp(-r * 4.5) * 0.9;
  float spikes = (exp(-abs(vUv.y) * 420.0) + exp(-abs(vUv.x) * 420.0)) * exp(-r * 5.0) * 0.14;
  vec3 c = mix(uColor, vec3(1.0), clamp(core * 0.5, 0.0, 1.0));
  gl_FragColor = vec4(c * (core + corona + glow + rays + spikes) * uIntensity * smoothstep(1.0, 0.6, r), 1.0);
}`;

// ── A planet against its star: near-black body with a thin lit limb ────────
export const PLANET_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vV; varying vec3 vWorld;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const PLANET_FRAG = /* glsl */ `
precision highp float;
varying vec3 vN; varying vec3 vV; varying vec3 vWorld;
uniform vec3 uStarPos; uniform vec3 uStarColor;
void main(){
  vec3 N = normalize(vN), V = normalize(vV), L = normalize(uStarPos - vWorld);
  float ndl = dot(N, L);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.5);
  // Backlit: only the limb facing the star catches light (forward scattering).
  float rim = fres * smoothstep(-0.35, 0.6, ndl) * (1.0 + 2.0 * pow(max(dot(-V, L), 0.0), 6.0));
  float day = max(ndl, 0.0) * 0.06;            // the sliver of day side we can see
  rim += pow(1.0 - max(dot(N, V), 0.0), 12.0) * 0.35;   // thin atmosphere all around the limb
  gl_FragColor = vec4(vec3(0.006, 0.008, 0.012) + uStarColor * (rim * 1.4 + day), 1.0);
}`;

// ── Leaving the Earth: faint motes drifting past the camera (view space) ────
// Interstellar dust isn't visible to the eye; this is a depth cue only, kept
// at the threshold so it reads as motion, not as "warp".
export const MOTE_VERT = /* glsl */ `
uniform float uTravel; uniform float uPx;
varying float vA;
void main(){
  float ph = fract(position.z - uTravel);
  vec3 p = vec3(position.xy * 5.0, -mix(0.25, 14.0, ph));
  gl_Position = projectionMatrix * vec4(p, 1.0);
  gl_PointSize = clamp(2.6 / -p.z, 0.8, 3.5) * uPx;
  vA = smoothstep(0.0, 0.12, ph) * smoothstep(1.0, 0.6, ph);
}`;

export const MOTE_FRAG = /* glsl */ `
precision highp float;
uniform float uAlpha;
varying float vA;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  gl_FragColor = vec4(vec3(0.78, 0.82, 0.9) * smoothstep(1.0, 0.0, r) * vA * uAlpha, 1.0);
}`;
