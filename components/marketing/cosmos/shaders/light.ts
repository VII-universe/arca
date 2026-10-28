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
  // r in sprite radii; the sprite is ~64 px, the disc ~8 px, the bloom the rest.
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float disc = smoothstep(0.17, 0.09, r) * 1.2;
  float bloom = exp(-r * r * 9.0) * 0.55 + exp(-r * 2.4) * 0.28;
  vec3 c = mix(uColor, vec3(1.0, 0.96, 0.88), clamp(disc, 0.0, 1.0) * 0.5);
  gl_FragColor = vec4(c * (disc + bloom) * uAlpha * smoothstep(1.0, 0.8, r), 1.0);
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

// The ribbon: the filament's trail as one continuous strip of light drawn
// in screen space (NDC), width and opacity falling off along it; and the
// ring of light the filament sends out when it arrives at a stop.
export const RIBBON_VERT = /* glsl */ `
attribute float aA;
varying float vA;
void main(){
  vA = aA;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const RIBBON_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor; uniform float uAlpha;
varying float vA;
void main(){
  gl_FragColor = vec4(uColor * vA * uAlpha, 1.0);
}`;

export const RING_VERT = /* glsl */ `
uniform vec2 uCentre; uniform vec2 uRadius;   // NDC centre, NDC radii (x, y)
void main(){
  gl_Position = vec4(uCentre + position.xy * uRadius, 0.0, 1.0);
}`;

export const RING_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor; uniform float uAlpha;
void main(){
  gl_FragColor = vec4(uColor * uAlpha, 1.0);
}`;
