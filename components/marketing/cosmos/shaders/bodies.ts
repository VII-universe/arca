import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS, NOISE3, OUTPUT, TONEMAP } from "./common";

// Planets, the Moon, Saturn's rings, the Sun and its corona, and the small
// markers that keep a planet readable when it is too far to be a disc.

export const PLANET_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vWorld;
${LOGDEPTH_VERT_PARS}
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
  ${LOGDEPTH_VERT}
}`;

export const PLANET_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv; varying vec3 vN; varying vec3 vWorld;
uniform sampler2D uMap; uniform vec3 uSun; uniform float uExposure; uniform float uAmbient;
uniform float uHasRing; uniform vec3 uCentre; uniform vec3 uRingNormal; uniform float uRingInner; uniform float uRingOuter; uniform sampler2D uRing;
uniform float uHaze; uniform vec3 uHazeColor;
uniform vec3 uCaster; uniform float uCasterR;   // another body that can shadow this one (body-centred), e.g. the Earth over the Moon
${LOGDEPTH_FRAG_PARS}
${TONEMAP}
void main(){
  ${LOGDEPTH_FRAG}
  vec3 N = normalize(vN);
  vec3 V = normalize(-vWorld);
  vec3 L = normalize(uSun);
  vec3 albedo = texture2D(uMap, vUv).rgb;
  float ndl = dot(N, L);
  float lit = max(ndl, 0.0);
  // A crisp terminator with a short soft band.
  float soft = smoothstep(-0.03, 0.12, ndl);
  // The rings' shadow on the planet: walk from the surface toward the Sun to
  // the ring plane and read the ring's density there.
  float shade = 1.0;
  if (uHasRing > 0.5) {
    vec3 p = vWorld - uCentre;
    float denom = dot(L, uRingNormal);
    if (abs(denom) > 1e-4) {
      float t = -dot(p, uRingNormal) / denom;
      if (t > 0.0) {
        vec3 q = p + L * t;
        float r = length(q);
        if (r > uRingInner && r < uRingOuter) {
          float a = texture2D(uRing, vec2((r - uRingInner) / (uRingOuter - uRingInner), 0.5)).a;
          shade = 1.0 - 0.85 * a;
        }
      }
    }
  }
  // The caster's shadow (eclipse): the ray toward the Sun passes through it.
  if (uCasterR > 0.0) {
    vec3 p = vWorld - uCentre;
    vec3 cp = uCaster - p;
    float bc = dot(cp, L);
    if (bc > 0.0) {
      float dc2 = dot(cp, cp) - bc * bc;
      shade *= 1.0 - 0.92 * smoothstep(uCasterR * uCasterR, uCasterR * uCasterR * 0.8, dc2);
    }
  }
  vec3 col = albedo * (lit * 1.15 * shade * soft + uAmbient);
  // The atmosphere's rim in the planet's own colour: thin, brightest where the limb faces the Sun.
  float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);
  col += uHazeColor * fres * uHaze * soft * (0.5 + 0.7 * lit);
  gl_FragColor = vec4(tonemap(col * uExposure), 1.0);
  ${OUTPUT}
}`;

// Saturn's rings: a flat annulus, uv.x = radius (0 inner → 1 outer).
export const RING_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vWorld;
${LOGDEPTH_VERT_PARS}
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  ${LOGDEPTH_VERT}
}`;

export const RING_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv; varying vec3 vWorld;
uniform sampler2D uRing; uniform vec3 uSun; uniform vec3 uCentre; uniform float uPlanetRadius; uniform vec3 uNormal; uniform float uExposure;
${LOGDEPTH_FRAG_PARS}
${TONEMAP}
void main(){
  ${LOGDEPTH_FRAG}
  vec4 ring = texture2D(uRing, vec2(vUv.x, 0.5));
  if (ring.a < 0.01) discard;
  vec3 L = normalize(uSun);
  vec3 V = normalize(-vWorld);
  vec3 p = vWorld - uCentre;
  // The planet's shadow across the rings.
  float b = dot(p, L);
  float d2 = dot(p, p) - b * b;
  float inShadow = (b < 0.0 && d2 < uPlanetRadius * uPlanetRadius) ? smoothstep(uPlanetRadius * uPlanetRadius, uPlanetRadius * uPlanetRadius * 0.9, d2) : 0.0;
  float ndl = abs(dot(uNormal, L));
  // Lit face vs. unlit face (light leaks through the thin rings a little).
  float facing = dot(uNormal, L) * dot(uNormal, V) > 0.0 ? 1.0 : 0.35;
  float fwd = pow(max(dot(-V, L), 0.0), 8.0) * 0.5;
  vec3 col = ring.rgb * ((0.3 + 1.3 * ndl) * facing + fwd) * (1.0 - 0.92 * inShadow) + ring.rgb * 0.03;
  gl_FragColor = vec4(tonemap(col * uExposure) * ring.a, ring.a);
  ${OUTPUT}
}`;

// The Sun's photosphere: limb-darkened, slightly granular, HDR-bright.
export const SUN_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vWorld; varying vec3 vLocal;
${LOGDEPTH_VERT_PARS}
void main(){
  vLocal = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
  ${LOGDEPTH_VERT}
}`;

export const SUN_FRAG = /* glsl */ `
precision highp float;
varying vec3 vN; varying vec3 vWorld; varying vec3 vLocal;
uniform float uTime; uniform float uExposure;
${LOGDEPTH_FRAG_PARS}
${NOISE3}
${TONEMAP}
void main(){
  ${LOGDEPTH_FRAG}
  vec3 N = normalize(vN);
  vec3 V = normalize(-vWorld);
  float mu = max(dot(N, V), 0.0);
  float limb = 0.4 + 0.6 * pow(mu, 0.55);            // limb darkening
  float gran = 0.9 + 0.2 * fbm4(normalize(vLocal) * 40.0 + uTime * 0.02);
  vec3 col = vec3(1.0, 0.93, 0.80) * limb * gran * 6.0;
  gl_FragColor = vec4(tonemap(col * uExposure), 1.0);
  ${OUTPUT}
}`;

// The corona and glare: a camera-facing billboard, additive. Its size is set
// by the engine from the Sun's apparent size plus a glare that never shrinks
// below a few pixels, so the Sun stays the brightest star from far away.
export const CORONA_VERT = /* glsl */ `
varying vec2 vUv;
${LOGDEPTH_VERT_PARS}
void main(){
  vUv = uv - 0.5;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
  gl_Position = projectionMatrix * mv;
  ${LOGDEPTH_VERT}
}`;

export const CORONA_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec3 uColor; uniform float uIntensity; uniform float uTime; uniform float uDisc;   // uDisc: the photosphere's radius in quad units
${LOGDEPTH_FRAG_PARS}
${NOISE3}
void main(){
  ${LOGDEPTH_FRAG}
  float r = length(vUv) * 2.0;
  float a = atan(vUv.y, vUv.x);
  float rr = max(r - uDisc, 0.0);
  float corona = exp(-rr * 12.0) * 0.9 + exp(-rr * 4.5) * 0.3;
  float glow = exp(-r * 4.0) * 0.22;
  float streamers = pow(max(0.0, fbm3(vec3(cos(a) * 4.0, sin(a) * 4.0, uTime * 0.02))), 2.5) * exp(-rr * 5.0) * 0.5;
  float spikes = (exp(-abs(vUv.y) * 300.0) + exp(-abs(vUv.x) * 300.0)) * exp(-r * 4.0) * 0.1;
  float core = exp(-r * r / max(uDisc * uDisc * 1.2, 0.0006)) * 1.6;   // keeps a point of light when the disc is subpixel
  vec3 c = mix(uColor, vec3(1.0, 0.98, 0.94), clamp(core, 0.0, 1.0) * 0.7);
  gl_FragColor = vec4(c * (corona + glow + streamers + spikes + core) * uIntensity * smoothstep(0.95, 0.35, r), 1.0);
  ${OUTPUT}
}`;

// Planet markers: one point per planet, its mean colour, shown when the disc
// would be too small to read; fades out as the disc grows.
export const MARKER_VERT = /* glsl */ `
attribute vec3 aColor; attribute float aAlpha;
uniform float uPx;
varying vec3 vColor; varying float vAlpha;
${LOGDEPTH_VERT_PARS}
void main(){
  vColor = aColor; vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 7.0 * uPx;
  if (aAlpha <= 0.001) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  ${LOGDEPTH_VERT}
}`;

export const MARKER_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor; varying float vAlpha;
${LOGDEPTH_FRAG_PARS}
void main(){
  ${LOGDEPTH_FRAG}
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float core = exp(-r * r * 9.0);
  float halo = exp(-r * 3.5) * 0.3;
  gl_FragColor = vec4(vColor * (core + halo) * vAlpha, 1.0);
  ${OUTPUT}
}`;
