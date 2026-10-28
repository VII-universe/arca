import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS, OUTPUT, TONEMAP } from "./common";

// The Earth, as seen from low orbit: Blue Marble by day, Black Marble by
// night, clouds with their shadows, sun glint on the oceans, and an
// atmosphere with Rayleigh and Mie scattering integrated along the view
// ray. Everything is lit by the one real Sun (direction uSun, from the
// Earth's centre). Positions are camera-relative (the camera is at the
// origin of world space each frame).

export const EARTH_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vWorld; varying vec3 vT;
${LOGDEPTH_VERT_PARS}
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  // Tangent along +u (east): the derivative of the sphere's parametrisation.
  vec3 t = normalize(vec3(-normal.z, 0.0, normal.x));
  vT = normalize(mat3(modelMatrix) * t);
  gl_Position = projectionMatrix * viewMatrix * wp;
  ${LOGDEPTH_VERT}
}`;

export const EARTH_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv; varying vec3 vN; varying vec3 vWorld; varying vec3 vT;
uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uClouds; uniform sampler2D uNormal; uniform sampler2D uSpec;
uniform vec3 uSun;          // unit, from the Earth toward the Sun
uniform vec3 uCentre;       // the Earth's centre (camera-relative)
uniform float uCloudShift;  // clouds drift east over time (uv units)
uniform float uExposure; uniform float uNightLift;
${LOGDEPTH_FRAG_PARS}
${TONEMAP}
void main(){
  ${LOGDEPTH_FRAG}
  vec3 N = normalize(vN);
  vec3 V = normalize(-vWorld);
  vec3 L = normalize(uSun);
  vec3 T = normalize(vT - N * dot(vT, N));
  vec3 B = cross(N, T);

  vec3 day = texture2D(uDay, vUv).rgb;
  vec3 night = texture2D(uNight, vUv).rgb;
  float spec = texture2D(uSpec, vUv).r;                 // 1 = water
  vec3 nm = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
  // Water gets the fine normal (waves); land keeps the geometric normal, its
  // relief is already in the Blue Marble shading.
  vec3 Nw = normalize(mix(N, normalize(T * nm.x + B * nm.y + N * max(nm.z, 0.2) * 2.0), spec * 0.6));

  float ndl = dot(N, L);
  float lit = smoothstep(-0.08, 0.28, ndl);
  // Twilight: the terminator warms up — low sun through a long air column.
  float twilight = exp(-pow((ndl - 0.02) / 0.14, 2.0));
  vec3 sunCol = mix(vec3(1.0, 0.98, 0.95), vec3(1.0, 0.62, 0.32), twilight * 0.85);

  // Clouds and their shadows: the shadow is the cloud texture read a little
  // "upstream" toward the Sun, in the surface's tangent frame.
  vec2 lt = vec2(dot(L, T), dot(L, B));
  vec2 cuv = vec2(vUv.x + uCloudShift, vUv.y);
  float cloudHere = texture2D(uClouds, cuv).r;
  float shadow = texture2D(uClouds, cuv - lt * vec2(0.0045, 0.0045) / max(ndl, 0.12)).r;
  float cloudShadow = 1.0 - 0.55 * shadow * lit;

  // Ocean glint: a tight highlight and a broad sheen, water only.
  vec3 H = normalize(L + V);
  float glint = pow(max(dot(Nw, H), 0.0), 220.0) * 1.8 + pow(max(dot(Nw, H), 0.0), 18.0) * 0.12;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 ocean = sunCol * glint * spec * lit * (0.6 + 0.6 * fres);

  vec3 col = day * sunCol * lit * max(ndl, 0.0) * 1.15 * cloudShadow + ocean;
  // Earthshine + starlight: the night side is never black.
  col += day * vec3(0.012, 0.016, 0.028) * (1.0 - lit);
  // City lights, only where it's night; warm.
  float nightSide = smoothstep(0.12, -0.18, ndl);
  vec3 lights = night * vec3(1.0, 0.86, 0.62) * (1.3 + uNightLift) * nightSide * (1.0 - cloudHere * 0.7);
  col += lights;

  col = tonemap(col * uExposure);
  gl_FragColor = vec4(col, 1.0);
  ${OUTPUT}
}`;

export const CLOUDS_VERT = /* glsl */ `
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

export const CLOUDS_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv; varying vec3 vN; varying vec3 vWorld;
uniform sampler2D uClouds; uniform vec3 uSun; uniform float uCloudShift; uniform float uExposure;
${LOGDEPTH_FRAG_PARS}
${TONEMAP}
void main(){
  ${LOGDEPTH_FRAG}
  vec3 N = normalize(vN);
  vec3 V = normalize(-vWorld);
  vec3 L = normalize(uSun);
  float c = texture2D(uClouds, vec2(vUv.x + uCloudShift, vUv.y)).r;
  float ndl = dot(N, L);
  float lit = smoothstep(-0.1, 0.3, ndl);
  float twilight = exp(-pow((ndl - 0.02) / 0.14, 2.0));
  vec3 sunCol = mix(vec3(1.0), vec3(1.0, 0.6, 0.32), twilight * 0.9);
  // Forward scattering lifts the clouds along the terminator.
  float fwd = pow(max(dot(-V, L), 0.0), 4.0) * 0.35;
  vec3 col = sunCol * (max(ndl, 0.0) * 1.1 + fwd) * lit + vec3(0.01, 0.013, 0.02) * (1.0 - lit);
  // Thin at the limb (we look through less cloud) and never a hard edge.
  float a = smoothstep(0.08, 0.6, c) * (0.75 + 0.25 * max(dot(N, V), 0.0));
  gl_FragColor = vec4(tonemap(col * uExposure) * a, a);
  ${OUTPUT}
}`;

// Atmosphere shell: single scattering integrated through a shell between the
// surface and 100 km, Rayleigh + Mie, light attenuated on the way in and out.
// Units inside are kilometres (positions come in as au and are converted).
export const ATMO_VERT = /* glsl */ `
varying vec3 vWorld;
${LOGDEPTH_VERT_PARS}
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
  ${LOGDEPTH_VERT}
}`;

export const ATMO_FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform vec3 uCentre; uniform vec3 uSun; uniform float uRadius;   // au, au
uniform float uKmPerUnit; uniform float uExposure; uniform int uSteps;
${LOGDEPTH_FRAG_PARS}
${TONEMAP}
const float R = 6371.0;
const float H_ATMO = 100.0;
const float H_R = 8.0;       // Rayleigh scale height, km
const float H_M = 1.2;       // Mie scale height, km
const vec3 BETA_R = vec3(5.8e-3, 13.5e-3, 33.1e-3);   // per km
const float BETA_M = 2.1e-3;
const float G = 0.76;

vec2 sphere(vec3 ro, vec3 rd, float r){
  float b = dot(ro, rd);
  float c = dot(ro, ro) - r * r;
  float h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}
// Optical depth toward the Sun from a point, by 4 samples.
vec2 lightDepth(vec3 p, vec3 L){
  vec2 t = sphere(p, L, R + H_ATMO);
  float len = t.y / 4.0;
  vec2 od = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    vec3 q = p + L * (float(i) + 0.5) * len;
    float h = max(length(q) - R, 0.0);
    od += vec2(exp(-h / H_R), exp(-h / H_M)) * len;
  }
  return od;
}
void main(){
  ${LOGDEPTH_FRAG}
  vec3 ro = -uCentre * uKmPerUnit;            // camera, in km, Earth at the origin
  vec3 rd = normalize(vWorld - vec3(0.0));     // view ray (camera at the origin)
  vec3 L = normalize(uSun);
  vec2 ta = sphere(ro, rd, R + H_ATMO);
  if (ta.y < 0.0) discard;
  float t0 = max(ta.x, 0.0);
  float t1 = ta.y;
  vec2 tg = sphere(ro, rd, R);
  bool hitsGround = tg.x > 0.0;
  if (hitsGround) t1 = tg.x;
  float len = (t1 - t0) / float(uSteps);
  float mu = dot(rd, L);
  float phR = 3.0 / (16.0 * 3.14159265) * (1.0 + mu * mu);
  float phM = 3.0 / (8.0 * 3.14159265) * ((1.0 - G * G) * (1.0 + mu * mu)) / ((2.0 + G * G) * pow(1.0 + G * G - 2.0 * G * mu, 1.5));
  vec3 sumR = vec3(0.0), sumM = vec3(0.0);
  vec2 od = vec2(0.0);
  for (int i = 0; i < 16; i++) {
    if (i >= uSteps) break;
    vec3 p = ro + rd * (t0 + (float(i) + 0.5) * len);
    float h = max(length(p) - R, 0.0);
    vec2 dens = vec2(exp(-h / H_R), exp(-h / H_M)) * len;
    od += dens;
    // Light reaching this sample: through the air above it toward the Sun,
    // or none if the Sun is below the planet from here.
    vec2 tl = sphere(p, L, R);
    if (tl.x > 0.0) continue;
    vec2 odl = lightDepth(p, L);
    vec3 tau = BETA_R * (od.x + odl.x) + BETA_M * 1.1 * (od.y + odl.y);
    vec3 att = exp(-tau);
    sumR += att * dens.x;
    sumM += att * dens.y;
  }
  vec3 inscatter = (sumR * BETA_R * phR + sumM * BETA_M * phM) * 38.0;
  vec3 trans = exp(-(BETA_R * od.x + BETA_M * 1.1 * od.y));
  vec3 col = tonemap(inscatter * uExposure);
  // Premultiplied: what we add, and how much of what's behind survives.
  float a = hitsGround ? clamp(1.0 - dot(trans, vec3(0.3333)), 0.0, 1.0) : 0.0;
  gl_FragColor = vec4(col, a);
  ${OUTPUT}
}`;
