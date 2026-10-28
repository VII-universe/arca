// The catalogue stars: true 3D positions (au), brightness from the real
// distance to the camera, so the Sun's neighbourhood shifts when the camera
// leaves the solar system. Positions are stored camera-relative by the
// engine each frame (floating origin), so `position` is already the offset.

export const STAR_VERT = /* glsl */ `
attribute float aAbs; attribute vec3 aColor; attribute float aSeed;
uniform vec3 uCam; uniform float uPx; uniform float uTime; uniform float uMagLimit; uniform float uDim; uniform float uTwinkle;
uniform float uPcPerUnit;
varying vec3 vColor; varying float vAlpha; varying float vSize; varying float vBig;
void main(){
  vec3 rel = position - uCam;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(rel, 1.0);
  float d = length(rel) * uPcPerUnit;                       // parsecs
  float m = aAbs + 5.0 * log(max(d, 1e-9) / 10.0) / log(10.0);
  if (m > uMagLimit || d < 1e-4) { gl_PointSize = 0.0; vAlpha = 0.0; gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  float flux = pow(10.0, -0.4 * (m - 1.0));
  vBig = smoothstep(2.2, -1.2, m);
  float size = clamp(2.0 + 3.0 * pow(flux, 0.34), 2.0, 9.0);
  size = mix(size, 18.0 + 22.0 * pow(min(flux, 40.0) / 40.0, 0.5), vBig);
  vSize = size * uPx;
  gl_PointSize = vSize;
  float tw = 1.0 - uTwinkle * (0.5 + 0.5 * sin(uTime * (0.15 + aSeed * 0.4) + aSeed * 40.0));
  vAlpha = clamp(0.18 + 0.9 * pow(flux, 0.4), 0.0, 1.6) * tw * uDim;
  vColor = aColor;
}`;

export const STAR_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor; varying float vAlpha; varying float vSize; varying float vBig;
void main(){
  vec2 c = (gl_PointCoord - 0.5) * vSize;
  float r = length(c);
  float sigma = mix(0.85, 1.5, vBig);
  float core = exp(-r * r / (2.0 * sigma * sigma));
  float halo = exp(-r / (2.2 + 0.18 * vSize)) * 0.2 * vBig;
  float sx = exp(-abs(c.y) / 0.55) * exp(-abs(c.x) / (vSize * 0.16));
  float sy = exp(-abs(c.x) / 0.55) * exp(-abs(c.y) / (vSize * 0.16));
  float spikes = (sx + sy) * 0.4 * vBig;
  float edge = smoothstep(vSize * 0.5, vSize * 0.32, r);
  gl_FragColor = vec4(vColor * (core + halo + spikes) * edge * vAlpha, 1.0);
}`;
