import { NOISE3 } from "./common";

// The far sky: the band of the Milky Way (placed by galactic coordinates)
// and a faint, atmosphere-tinted dust, baked into a cube map once per
// atmosphere and sampled per pixel with unresolved-star grain. From the
// galaxy's outside the band fades (we're looking at the disc from above
// then, drawn by the galaxy pass instead).
//
// Directions here are in the ecliptic J2000 frame.

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
uniform vec3 uG0; uniform vec3 uG1; uniform vec3 uG2;   // galactic axes in the scene frame
${NOISE3}
void main(){
  vec3 d = normalize(vDir);
  vec3 g = vec3(dot(uG0, d), dot(uG1, d), dot(uG2, d));
  float l = atan(g.y, g.x);
  float b = asin(clamp(g.z, -1.0, 1.0));

  float core = exp(-pow(l / 0.75, 2.0));
  float width = 0.11 + 0.08 * core + 0.04 * (fbm3(d * 3.0) - 0.5);
  float band = exp(-pow(b / width, 2.0));
  float clumps = fbm3(d * 9.0 + 3.1);
  float fine = fbm3(d * 26.0);
  float milky = band * (0.45 + 0.9 * clumps) * (0.6 + 0.5 * fine) * (1.0 + 1.8 * core);
  float rift = smoothstep(0.42, 0.7, fbm3(d * 7.0 + vec3(5.0))) * exp(-pow(b / 0.05, 2.0)) * (0.4 + 0.6 * core);
  milky *= 1.0 - 0.88 * rift;
  vec3 col = mix(vec3(0.62, 0.68, 0.82), vec3(0.95, 0.86, 0.72), core) * milky * 0.12 * uMilky;

  // Dust: domain-warped noise, concentrated toward the plane, tinted by the atmosphere. Faint.
  vec3 q = d * uNebScale;
  vec3 w = vec3(fbm3(q + 1.3), fbm3(q + 7.7), fbm3(q + 4.1));
  float neb = fbm3(q + 2.6 * w);
  float neb2 = fbm3(q * 0.45 + 1.7 * w + 9.0);
  float near = 0.3 + 0.7 * exp(-pow(b / 0.5, 2.0));
  float cloud = smoothstep(0.45, 0.9, neb) * near;
  float veil = smoothstep(0.4, 0.85, neb2) * near;
  float dark = smoothstep(0.55, 0.85, fbm3(q * 2.2 + w * 3.0));
  col += (uNebA * cloud * 0.5 + uNebB * veil * 0.3) * uNebAmt * (1.0 - 0.6 * dark);

  float density = clamp(band * (0.6 + clumps) * (1.0 - 0.8 * rift), 0.0, 1.0);
  gl_FragColor = vec4(sqrt(clamp(col, 0.0, 1.0)), density);
}`;

export const SKY_VERT = /* glsl */ `
uniform mat4 uViewDir;
varying vec3 vDir;
void main(){
  vDir = (uViewDir * vec4(position.xy, 1.0, 1.0)).xyz;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform samplerCube uCubeA; uniform samplerCube uCubeB; uniform float uMix; uniform float uCubeFlip;
uniform float uMilky; uniform float uBand; uniform float uDim; uniform float uPx;
uniform vec3 uTintA; uniform vec3 uTintB; uniform float uWash;   // the atmosphere's two tints, a broad wash at any distance
${NOISE3}
float wfbm(vec3 p){ return 0.5 * n3(p) + 0.25 * n3(p * 2.03 + 11.7) + 0.125 * n3(p * 4.1 + 23.1); }   // cheap: 3 octaves
void main(){
  vec3 d = normalize(vDir);
  vec3 cd = vec3(d.x * uCubeFlip, d.yz);
  vec4 a = textureCube(uCubeA, cd), b = textureCube(uCubeB, cd);
  vec3 light = mix(a.rgb * a.rgb, b.rgb * b.rgb, uMix) * uBand;
  float density = mix(a.a, b.a, uMix) * uBand;

  vec3 col = vec3(0.0196, 0.0275, 0.051) + light;   // #05070D, never pure black
  // The atmosphere far from home: soft clouds of its two tints across the whole sky (the band and its dust fade
  // with distance, this does not), so a chosen atmosphere shows wherever the camera is.
  float w1 = wfbm(d * 1.7 + 3.1) / 0.875, w2 = wfbm(d * 3.4 + 11.0) / 0.875;
  vec3 wash = uTintA * smoothstep(0.35, 0.9, w1 * 0.5 + 0.5) + uTintB * smoothstep(0.45, 0.95, w2 * 0.5 + 0.5) * 0.6;
  col += wash * uWash * 1.05;

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
  col += vec3(0.8, 0.84, 0.95) * grain * 0.3 * uMilky * uBand;
  col *= uDim;
  col += (h3(vec3(floor(gl_FragCoord.xy / max(uPx, 1.0)), 4.0)) - 0.5) * 0.02;
  gl_FragColor = vec4(col, 1.0);
}`;
