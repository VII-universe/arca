import { LOGDEPTH_FRAG, LOGDEPTH_FRAG_PARS, LOGDEPTH_VERT, LOGDEPTH_VERT_PARS, OUTPUT } from "./common";

// The message's light: one amber point that flies the journey a little
// ahead of the camera, its trail of sparks (particles left behind, each
// fading on its own), and the dust that streams past the camera for depth.
// All positions come in camera-relative (floating origin).

export const FILAMENT_VERT = /* glsl */ `
uniform float uPx; uniform float uSize;
${LOGDEPTH_VERT_PARS}
void main(){
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * uPx;
  ${LOGDEPTH_VERT}
}`;

export const FILAMENT_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor; uniform float uAlpha;
${LOGDEPTH_FRAG_PARS}
void main(){
  ${LOGDEPTH_FRAG}
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float core = exp(-r * r * 28.0) * 1.0;
  float glow = exp(-r * 3.2) * 0.5;
  vec3 c = mix(uColor, vec3(1.0, 0.95, 0.85), clamp(core, 0.0, 1.0) * 0.35);
  gl_FragColor = vec4(c * (core + glow) * uAlpha * smoothstep(1.0, 0.75, r), 1.0);
  ${OUTPUT}
}`;

// aAge: seconds since the spark was left behind (negative = unused).
export const SPARK_VERT = /* glsl */ `
attribute float aAge; attribute float aSeed;
uniform float uPx; uniform float uLife;
varying float vA;
${LOGDEPTH_VERT_PARS}
void main(){
  float t = clamp(aAge / uLife, 0.0, 1.0);
  float on = aAge < 0.0 || aAge > uLife ? 0.0 : 1.0;
  vA = on * (1.0 - t) * (1.0 - t) * (0.5 + 0.4 * aSeed);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = (2.6 + 4.0 * (1.0 - t) + aSeed * 2.0) * uPx;
  if (on < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  ${LOGDEPTH_VERT}
}`;

export const SPARK_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
varying float vA;
${LOGDEPTH_FRAG_PARS}
void main(){
  ${LOGDEPTH_FRAG}
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-r * r * 6.0) * smoothstep(1.0, 0.6, r);
  gl_FragColor = vec4(uColor * a * vA, 1.0);
  ${OUTPUT}
}`;

// Dust: positions are in a unit cube around the camera, scaled by uL (au);
// the engine moves them against the camera's motion and wraps them.
export const FLOW_VERT = /* glsl */ `
attribute float aSeed;
uniform float uPx; uniform float uL; uniform float uAlpha;
varying float vA;
${LOGDEPTH_VERT_PARS}
void main(){
  vec3 p = position * uL;
  float d = length(p);
  float edge = 1.0 - smoothstep(0.34, 0.5, max(abs(position.x), max(abs(position.y), abs(position.z))));
  float near = smoothstep(0.015, 0.06, d / uL);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = clamp(0.22 * uL / max(d, 1e-9), 1.0, 3.4) * uPx * (0.7 + 0.6 * aSeed);
  vA = uAlpha * edge * near * (0.5 + 0.5 * aSeed) * clamp(0.5 * uL / max(d, 1e-9), 0.25, 1.0);
  ${LOGDEPTH_VERT}
}`;

export const FLOW_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
varying float vA;
${LOGDEPTH_FRAG_PARS}
void main(){
  ${LOGDEPTH_FRAG}
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-r * r * 5.0) * smoothstep(1.0, 0.6, r);
  gl_FragColor = vec4(uColor * a * vA, 1.0);
  ${OUTPUT}
}`;
