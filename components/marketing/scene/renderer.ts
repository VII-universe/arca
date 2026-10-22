import { FRAGMENT_SHADER, MAX_ORBS, VERTEX_SHADER } from "./shader";

export type RGB = [number, number, number];

export interface OrbDraw {
  x: number; // p-space (viewport heights, y from top)
  y: number;
  r: number;
  opacity: number;
  tint: RGB;
  light: number;
}

export interface FrameUniforms {
  time: number;
  scroll: number;
  mouse: [number, number];
  a: RGB;
  b: RGB;
  c: RGB;
  deep: RGB;
  stars: number;
  detail: number;
  orbs: OrbDraw[];
}

// Bare WebGL 1 — one program, one full-screen triangle. No three.js: the whole
// look lives in a single fragment shader, so a scene graph would add ~150 kB
// and nothing we use.
export class LightRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private orbBuf = new Float32Array(MAX_ORBS * 4);
  private tintBuf = new Float32Array(MAX_ORBS * 4);

  static create(canvas: HTMLCanvasElement): LightRenderer | null {
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power",
    });
    if (!gl) return null;
    try {
      return new LightRenderer(gl);
    } catch (err) {
      console.warn("[LightScene] WebGL init failed, keeping CSS fallback:", err);
      return null;
    }
  }

  private constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    const vs = this.compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = this.compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new Error("createProgram failed");
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
    }
    this.program = program;
    gl.useProgram(program);

    // One triangle that covers the whole viewport.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    for (const name of ["uRes", "uTime", "uScroll", "uMouse", "uA", "uB", "uC", "uDeep", "uStars", "uDetail", "uOrb", "uOrbTint", "uOrbCount"]) {
      this.loc[name] = gl.getUniformLocation(program, name);
    }
  }

  private compile(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error("createShader failed");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? "compile failed");
    }
    return shader;
  }

  resize(width: number, height: number) {
    const canvas = this.gl.canvas as HTMLCanvasElement;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    this.gl.viewport(0, 0, width, height);
  }

  render(u: FrameUniforms) {
    const gl = this.gl;
    const { loc } = this;
    gl.uniform2f(loc.uRes, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(loc.uTime, u.time);
    gl.uniform1f(loc.uScroll, u.scroll);
    gl.uniform2f(loc.uMouse, u.mouse[0], u.mouse[1]);
    gl.uniform3fv(loc.uA, u.a);
    gl.uniform3fv(loc.uB, u.b);
    gl.uniform3fv(loc.uC, u.c);
    gl.uniform3fv(loc.uDeep, u.deep);
    gl.uniform1f(loc.uStars, u.stars);
    gl.uniform1f(loc.uDetail, u.detail);

    const count = Math.min(u.orbs.length, MAX_ORBS);
    for (let i = 0; i < count; i++) {
      const o = u.orbs[i];
      this.orbBuf.set([o.x, o.y, o.r, o.opacity], i * 4);
      this.tintBuf.set([o.tint[0], o.tint[1], o.tint[2], o.light], i * 4);
    }
    gl.uniform4fv(loc.uOrb, this.orbBuf);
    gl.uniform4fv(loc.uOrbTint, this.tintBuf);
    gl.uniform1i(loc.uOrbCount, count);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
