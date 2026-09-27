// Low-level WebGL helpers: programs, FBOs, textures, fullscreen quad.

export interface Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
  attributes: Record<string, number>;
}

export interface FBO {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
}

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

export class GLCore {
  gl: WebGLRenderingContext;
  private quadBuffer: WebGLBuffer;
  private programs = new Map<string, Program>();

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
    }) as WebGLRenderingContext | null;
    if (!gl) throw new Error('WebGL not available');
    this.gl = gl;
    const buf = gl.createBuffer();
    if (!buf) throw new Error('Cannot create buffer');
    this.quadBuffer = buf;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
  }

  compile(name: string, vertSrc: string, fragSrc: string): Program {
    const cached = this.programs.get(name);
    if (cached) return cached;
    const gl = this.gl;
    const vs = this.shader(gl.VERTEX_SHADER, vertSrc, `${name}.vert`);
    const fs = this.shader(gl.FRAGMENT_SHADER, fragSrc, `${name}.frag`);
    const program = gl.createProgram();
    if (!program) throw new Error('Cannot create program');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Link error (${name}): ${gl.getProgramInfoLog(program)}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < uniformCount; i++) {
      const info = gl.getActiveUniform(program, i);
      if (!info) continue;
      const clean = info.name.replace(/\[0\]$/, '');
      uniforms[clean] = gl.getUniformLocation(program, info.name);
    }
    const attributes: Record<string, number> = {
      a_pos: gl.getAttribLocation(program, 'a_pos'),
    };
    const prog: Program = { program, uniforms, attributes };
    this.programs.set(name, prog);
    return prog;
  }

  private shader(type: number, source: string, label: string): WebGLShader {
    const gl = this.gl;
    const sh = gl.createShader(type);
    if (!sh) throw new Error('Cannot create shader');
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error(`Shader compile error (${label}): ${log}`);
    }
    return sh;
  }

  createTexture(width = 1, height = 1): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error('Cannot create texture');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return tex;
  }

  createFBO(width: number, height: number): FBO {
    const gl = this.gl;
    const texture = this.createTexture(width, height);
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error('Cannot create framebuffer');
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { framebuffer, texture, width, height };
  }

  resizeFBO(fbo: FBO, width: number, height: number): void {
    if (fbo.width === width && fbo.height === height) return;
    const gl = this.gl;
    fbo.width = width;
    fbo.height = height;
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  bindFBO(fbo: FBO | null): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo ? fbo.framebuffer : null);
    const w = fbo ? fbo.width : gl.drawingBufferWidth;
    const h = fbo ? fbo.height : gl.drawingBufferHeight;
    gl.viewport(0, 0, w, h);
  }

  useProgram(prog: Program): void {
    this.gl.useProgram(prog.program);
    const loc = prog.attributes.a_pos;
    if (loc >= 0) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
      this.gl.enableVertexAttribArray(loc);
      this.gl.vertexAttribPointer(loc, 2, this.gl.FLOAT, false, 0, 0);
    }
  }

  drawQuad(): void {
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  clear(r = 0, g = 0, b = 0, a = 0): void {
    const gl = this.gl;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  setTexture(unit: number, texture: WebGLTexture, uniform: WebGLUniformLocation | null): void {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (uniform) gl.uniform1i(uniform, unit);
  }

  /** Copy src texture into dst FBO (1:1). */
  blit(src: WebGLTexture, dst: FBO | null, progPassthrough: Program): void {
    this.bindFBO(dst);
    this.useProgram(progPassthrough);
    this.setTexture(0, src, progPassthrough.uniforms.u_tex);
    this.drawQuad();
  }
}
