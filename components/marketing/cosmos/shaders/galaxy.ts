// The Milky Way seen from outside: a disc of points (stars by the thousand,
// each point a few hundred suns), the bulge, spiral arms as density, and
// dust as dark points along the arms' inner edges. Muted; the only place on
// the page allowed to be a little illustrative, and even here the
// proportions are real: the Sun 26 700 ly from the centre, the disc about
// 100 000 ly across.

export const GALAXY_VERT = /* glsl */ `
attribute vec3 aColor; attribute float aSize;
uniform float uPx; uniform float uAlpha; uniform float uRef; uniform float uMaxScale; uniform float uNear;
varying vec3 vColor; varying float vAlpha;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = length(mv.xyz);
  // From far outside the size is set in pixels; nearer than uRef each point (hundreds of suns) swells
  // into a soft glow, so the disc seen from inside or just above is a continuous light, not sparse dots.
  // Points nearer than uNear are the neighbourhood the real stars already show: they go.
  float k = clamp(uRef / max(d, 1e-3), 1.0, uMaxScale);
  gl_PointSize = aSize * 2.4 * uPx * k;
  vColor = aColor;
  vAlpha = uAlpha / sqrt(k) * smoothstep(uNear, uNear * 3.0, d);
}`;

export const GALAXY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor; varying float vAlpha;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-r * r * 4.0) * smoothstep(1.0, 0.7, r);
  gl_FragColor = vec4(vColor * a * vAlpha, a * vAlpha);
}`;

// Dust: multiplies what is behind it (dark lanes).
export const DUST_FRAG = /* glsl */ `
precision highp float;
varying vec3 vColor; varying float vAlpha;
void main(){
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-r * r * 3.0) * smoothstep(1.0, 0.6, r) * vAlpha;
  gl_FragColor = vec4(vec3(1.0 - a * 0.45), 1.0);
}`;
