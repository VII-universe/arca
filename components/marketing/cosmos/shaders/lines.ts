import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS, OUTPUT } from "./common";

// Orbits as thin lines, and the Earth's trail: one line that spirals out a
// hair with every completed orbit, so the years read as rings.

export const ORBIT_VERT = /* glsl */ `
uniform float uAlpha;
varying float vA;
${LOGDEPTH_VERT_PARS}
void main(){
  vA = uAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  ${LOGDEPTH_VERT}
}`;

export const ORBIT_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
varying float vA;
${LOGDEPTH_FRAG_PARS}
void main(){
  ${LOGDEPTH_FRAG}
  gl_FragColor = vec4(uColor * vA, vA);
  ${OUTPUT}
}`;

// aS: orbits travelled at this vertex (0 = today). uOrbits: orbits travelled
// so far. The line is only drawn up to uOrbits; older rings fade.
export const TRAIL_VERT = /* glsl */ `
attribute float aS;
uniform float uOrbits; uniform float uFade; uniform float uAlpha;
varying float vA;
${LOGDEPTH_VERT_PARS}
void main(){
  float age = uOrbits - aS;
  float on = step(0.0, age);
  float a = on * mix(1.0, 0.35, clamp(age / max(uOrbits, 1.0), 0.0, 1.0)) * uAlpha * uFade;
  // The leading edge: the last tenth of an orbit brightens toward the Earth.
  a *= 1.0 + 0.8 * smoothstep(0.12, 0.0, age);
  vA = a;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  if (on < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  ${LOGDEPTH_VERT}
}`;

export const TRAIL_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
varying float vA;
${LOGDEPTH_FRAG_PARS}
void main(){
  ${LOGDEPTH_FRAG}
  gl_FragColor = vec4(uColor * vA, vA);
  ${OUTPUT}
}`;
