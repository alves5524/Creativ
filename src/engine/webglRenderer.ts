import { THERMAL_PALETTES } from '../data/presets';
import { MotionBlurMode, StudioParams } from '../types/studio';

const VERTEX_SHADER = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_time;

// Displacement & Pixel Melt
uniform float u_dispAmount;
uniform float u_dispScale;
uniform float u_pixelMelt;
uniform float u_motionWave;

// Motion Blur
uniform int u_blurMode; // 0: directional, 1: radial, 2: spin, 3: slit_scan, 4: cross_axis, 5: crt_streak
uniform float u_blurAmount;
uniform float u_blurAngle;
uniform int u_blurSamples;
uniform float u_slitFreq;
uniform float u_trailDecay;
uniform float u_spectralEcho;

// Chromatic Dispersion
uniform float u_chromatic;
uniform float u_prismAngle;

// Thermal Camera
uniform int u_thermalEnabled;
uniform float u_thermalIntensity;
uniform float u_thermalBias;
uniform float u_thermalContrast;
uniform float u_isolines;
uniform float u_glow;
uniform float u_thermalPulse;
uniform vec3 u_stop0;
uniform vec3 u_stop1;
uniform vec3 u_stop2;
uniform vec3 u_stop3;

// Scanlines, Bayer Dither, Grain & Halftone
uniform float u_scanlineMix;
uniform float u_bayerDither;
uniform float u_ditherGrain;
uniform int u_grainType; // 0: film, 1: stipple
uniform float u_halftoneMix;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i + vec2(0.0, 0.0)), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float bayer4x4(vec2 fragCoord) {
  int x = int(mod(fragCoord.x, 4.0));
  int y = int(mod(fragCoord.y, 4.0));
  int idx = y * 4 + x;
  if (idx == 0) return 0.0 / 16.0;
  if (idx == 1) return 8.0 / 16.0;
  if (idx == 2) return 2.0 / 16.0;
  if (idx == 3) return 10.0 / 16.0;
  if (idx == 4) return 12.0 / 16.0;
  if (idx == 5) return 4.0 / 16.0;
  if (idx == 6) return 14.0 / 16.0;
  if (idx == 7) return 6.0 / 16.0;
  if (idx == 8) return 3.0 / 16.0;
  if (idx == 9) return 11.0 / 16.0;
  if (idx == 10) return 1.0 / 16.0;
  if (idx == 11) return 9.0 / 16.0;
  if (idx == 12) return 15.0 / 16.0;
  if (idx == 13) return 7.0 / 16.0;
  if (idx == 14) return 13.0 / 16.0;
  return 5.0 / 16.0;
}

vec3 hueShiftRainbow(float t) {
  // Smooth thermal/rainbow tint for spectral motion echo (orange -> green -> cyan -> cobalt)
  vec3 a = vec3(0.55, 0.55, 0.55);
  vec3 b = vec3(0.45, 0.45, 0.45);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.0, 0.33, 0.67);
  return clamp(a + b * cos(6.28318 * (c * t + d)), 0.0, 1.0);
}

vec2 displaceUV(vec2 uv) {
  vec2 resUV = uv;
  if (u_dispAmount > 0.001) {
    float n1 = valueNoise(uv * u_dispScale + vec2(u_time * 0.35, -u_time * 0.25));
    float n2 = valueNoise(uv * u_dispScale * 1.7 + vec2(-u_time * 0.3, u_time * 0.4));
    vec2 offset = (vec2(n1, n2) - 0.5) * u_dispAmount * 0.14;
    resUV += offset;
  }
  if (u_pixelMelt > 0.001) {
    float colNoise = valueNoise(vec2(floor(uv.x * 180.0) * 0.12, u_time * 0.45));
    float drip = pow(colNoise, 2.2) * u_pixelMelt * 0.18;
    resUV.y += drip;
  }
  return clamp(resUV, 0.001, 0.999);
}

vec3 sampleWithChromatic(vec2 uv) {
  if (u_chromatic <= 0.001) {
    return texture(u_tex, clamp(uv, 0.001, 0.999)).rgb;
  }
  vec2 dir = vec2(cos(u_prismAngle), sin(u_prismAngle));
  float edgeDist = length(uv - 0.5) * 1.4 + 0.35;
  vec2 shift = dir * u_chromatic * 0.022 * edgeDist;

  float r = texture(u_tex, clamp(uv + shift, 0.001, 0.999)).r;
  float g = texture(u_tex, clamp(uv, 0.001, 0.999)).g;
  float b = texture(u_tex, clamp(uv - shift, 0.001, 0.999)).b;
  return vec3(r, g, b);
}

vec3 sampleMotionBlur(vec2 baseUV) {
  if (u_blurAmount <= 0.001) {
    return sampleWithChromatic(baseUV);
  }

  vec3 acc = vec3(0.0);
  vec3 weightAcc = vec3(0.0);
  int steps = clamp(u_blurSamples, 6, 32);
  float waveAmp = 1.0 + sin(u_time * 2.2) * u_motionWave * 0.35;
  float amount = u_blurAmount * waveAmp;

  vec2 dirVec = vec2(cos(u_blurAngle), sin(u_blurAngle));
  vec2 centered = baseUV - 0.5;

  for (int i = 0; i < 32; i++) {
    if (i >= steps) break;
    float fi = float(i) / float(max(1, steps - 1)); // 0..1
    float signedF = fi - 0.5; // -0.5..0.5
    float baseWeight = mix(1.0, 1.0 - fi * 0.72, u_trailDecay);

    vec2 sampleUV = baseUV;

    if (u_blurMode == 0) {
      // Directional Linear Motion Blur
      sampleUV = baseUV + dirVec * signedF * amount * 0.16;
    } else if (u_blurMode == 1) {
      // Radial Zoom Blur
      sampleUV = 0.5 + centered * (1.0 - fi * amount * 0.24);
    } else if (u_blurMode == 2) {
      // Rotational Spin Blur
      float theta = signedF * amount * 0.35;
      float cs = cos(theta);
      float sn = sin(theta);
      sampleUV = 0.5 + vec2(
        centered.x * cs - centered.y * sn,
        centered.x * sn + centered.y * cs
      );
    } else if (u_blurMode == 3) {
      // Slit-Scan Ribbon Extrusion
      float phase = sin(baseUV.y * u_slitFreq + u_time * 2.4 + fi * 2.2);
      vec2 ribbonOffset = dirVec * fi * amount * 0.18 + vec2(phase * amount * 0.055, 0.0);
      sampleUV = baseUV - ribbonOffset;
    } else if (u_blurMode == 4) {
      // Orthogonal Cross-Axis Streak Blur (X + Y flare)
      bool horiz = (i % 2 == 0);
      float axisF = (float(i / 2) / float(max(1, steps / 2 - 1))) - 0.5;
      if (horiz) {
        sampleUV = baseUV + vec2(axisF * amount * 0.24, 0.0);
      } else {
        sampleUV = baseUV + vec2(0.0, axisF * amount * 0.24);
      }
    } else {
      // CRT / Xerox Scanner Horizontal Streak Bleed
      float rowJitter = (hash12(vec2(floor(baseUV.y * 280.0), floor(u_time * 12.0))) - 0.5) * 0.008;
      sampleUV = baseUV - vec2(fi * amount * 0.18 + rowJitter, 0.0);
    }

    vec3 tap = sampleWithChromatic(sampleUV);
    vec3 tint = mix(vec3(1.0), hueShiftRainbow(fi * 0.85 + 0.05) * 1.45, u_spectralEcho);
    vec3 w = tint * baseWeight;

    acc += tap * w;
    weightAcc += w;
  }

  return acc / max(vec3(0.001), weightAcc);
}

vec3 thermalRamp(float t) {
  float x = clamp(t, 0.0, 1.0);
  if (x < 0.333) {
    return mix(u_stop0, u_stop1, x / 0.333);
  } else if (x < 0.666) {
    return mix(u_stop1, u_stop2, (x - 0.333) / 0.333);
  }
  return mix(u_stop2, u_stop3, (x - 0.666) / 0.334);
}

void main() {
  vec2 warpedUV = displaceUV(v_uv);
  vec3 color = sampleMotionBlur(warpedUV);

  if (u_thermalEnabled == 1) {
    float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
    float pulse = sin(u_time * 2.5) * u_thermalPulse * 0.08;
    float heat = clamp((lum - 0.5) * u_thermalContrast + 0.5 + u_thermalBias + pulse, 0.0, 1.0);

    vec3 thermalCol = thermalRamp(heat);

    if (u_isolines > 0.01) {
      float band = abs(fract(heat * 10.0) - 0.5) * 2.0;
      float line = 1.0 - smoothstep(0.0, 0.14, band);
      thermalCol = mix(thermalCol, u_stop3, line * u_isolines * 0.85);
    }

    if (u_glow > 0.01) {
      float hotMask = smoothstep(0.58, 1.0, heat);
      thermalCol += thermalCol * hotMask * u_glow * 0.75;
    }

    color = mix(color, thermalCol, u_thermalIntensity);
  }

  // CRT / Scanner Horizontal Scanlines
  if (u_scanlineMix > 0.01) {
    float scan = sin(gl_FragCoord.y * 1.45) * 0.5 + 0.5;
    float lineFactor = mix(1.0, 0.62 + 0.38 * scan, u_scanlineMix);
    color *= lineFactor;
  }

  // Ordered 4x4 Bayer Matrix Dithering
  if (u_bayerDither > 0.01) {
    float threshold = bayer4x4(gl_FragCoord.xy);
    vec3 quant = step(vec3(threshold), color);
    color = mix(color, quant, u_bayerDither * 0.85);
  }

  // Optional Halftone Dot Screen
  if (u_halftoneMix > 0.01) {
    vec2 grid = v_uv * u_resolution / 7.5;
    vec2 cell = fract(grid) - 0.5;
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    float radius = sqrt(clamp(lum, 0.0, 1.0)) * 0.55;
    float dotMask = 1.0 - smoothstep(radius - 0.06, radius + 0.06, length(cell));
    vec3 halftoneColor = mix(color * 0.25, color * 1.25, dotMask);
    color = mix(color, halftoneColor, u_halftoneMix);
  }

  // Tactile Film or Stochastic Stipple Grain
  if (u_ditherGrain > 0.005) {
    float rnd = hash12(gl_FragCoord.xy + fract(u_time * 13.37) * 512.0);
    if (u_grainType == 1) {
      // Heavy stochastic stipple / pointillist xerox grain
      float stipple = (rnd - 0.5) * u_ditherGrain * 0.65;
      color = clamp(color + stipple, 0.0, 1.0);
    } else {
      color += (rnd - 0.5) * u_ditherGrain * 0.22;
    }
  }

  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

function hexToRgbVec(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

function blurModeToInt(mode: MotionBlurMode): number {
  switch (mode) {
    case 'directional':
      return 0;
    case 'radial':
      return 1;
    case 'spin':
      return 2;
    case 'slit_scan':
      return 3;
    case 'cross_axis':
      return 4;
    case 'crt_streak':
      return 5;
  }
}

export class WebGLThermalRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private contextLost = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initContext();

    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
  };

  private handleContextRestored = () => {
    this.contextLost = false;
    this.initContext();
  };

  public isAvailable(): boolean {
    return this.gl !== null && !this.contextLost && this.program !== null;
  }

  public getMaxTextureSize(): number {
    return this.gl ? this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) : 4096;
  }

  private initContext() {
    const gl = this.canvas.getContext('webgl2', {
      preserveDrawingBuffer: true,
      antialias: true,
      alpha: false,
    });
    if (!gl) {
      this.gl = null;
      return;
    }
    this.gl = gl;

    const vs = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('WebGL2 link error:', gl.getProgramInfoLog(prog));
      return;
    }

    this.program = prog;
    gl.useProgram(prog);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    this.vao = vao;

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.texture = tex;

    const uniformNames = [
      'u_tex',
      'u_resolution',
      'u_time',
      'u_dispAmount',
      'u_dispScale',
      'u_pixelMelt',
      'u_motionWave',
      'u_blurMode',
      'u_blurAmount',
      'u_blurAngle',
      'u_blurSamples',
      'u_slitFreq',
      'u_trailDecay',
      'u_spectralEcho',
      'u_chromatic',
      'u_prismAngle',
      'u_thermalEnabled',
      'u_thermalIntensity',
      'u_thermalBias',
      'u_thermalContrast',
      'u_isolines',
      'u_glow',
      'u_thermalPulse',
      'u_stop0',
      'u_stop1',
      'u_stop2',
      'u_stop3',
      'u_scanlineMix',
      'u_bayerDither',
      'u_ditherGrain',
      'u_grainType',
      'u_halftoneMix',
    ];
    for (const name of uniformNames) {
      this.uniforms[name] = gl.getUniformLocation(prog, name);
    }
  }

  private compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    source: string
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('WebGL2 shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  public render(
    sourceCanvas: HTMLCanvasElement,
    params: StudioParams,
    timeSec: number
  ): void {
    const gl = this.gl;
    if (!gl || !this.program || !this.texture || !this.vao || this.contextLost) {
      return;
    }

    const w = sourceCanvas.width;
    const h = sourceCanvas.height;

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    gl.viewport(0, 0, w, h);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);

    const stops =
      params.thermal.palette === 'custom'
        ? params.thermal.customStops
        : THERMAL_PALETTES[params.thermal.palette].stops;

    const s0 = hexToRgbVec(stops[0]);
    const s1 = hexToRgbVec(stops[1]);
    const s2 = hexToRgbVec(stops[2]);
    const s3 = hexToRgbVec(stops[3]);

    gl.uniform1i(this.uniforms.u_tex, 0);
    gl.uniform2f(this.uniforms.u_resolution, w, h);
    gl.uniform1f(this.uniforms.u_time, timeSec);

    gl.uniform1f(this.uniforms.u_dispAmount, params.optics.displacementAmount);
    gl.uniform1f(this.uniforms.u_dispScale, params.optics.displacementScale);
    gl.uniform1f(this.uniforms.u_pixelMelt, params.optics.pixelMelt);
    gl.uniform1f(this.uniforms.u_motionWave, params.animation.motionWave);

    gl.uniform1i(this.uniforms.u_blurMode, blurModeToInt(params.motionBlur.mode));
    gl.uniform1f(this.uniforms.u_blurAmount, params.motionBlur.amount);
    gl.uniform1f(
      this.uniforms.u_blurAngle,
      (params.motionBlur.angle * Math.PI) / 180
    );
    gl.uniform1i(this.uniforms.u_blurSamples, params.motionBlur.samples);
    gl.uniform1f(this.uniforms.u_slitFreq, params.motionBlur.slitFrequency);
    gl.uniform1f(this.uniforms.u_trailDecay, params.motionBlur.trailDecay);
    gl.uniform1f(this.uniforms.u_spectralEcho, params.motionBlur.spectralEcho);

    gl.uniform1f(this.uniforms.u_chromatic, params.optics.chromaticAberration);
    gl.uniform1f(
      this.uniforms.u_prismAngle,
      (params.optics.prismAngle * Math.PI) / 180
    );

    gl.uniform1i(this.uniforms.u_thermalEnabled, params.thermal.enabled ? 1 : 0);
    gl.uniform1f(this.uniforms.u_thermalIntensity, params.thermal.intensity);
    gl.uniform1f(this.uniforms.u_thermalBias, params.thermal.temperatureBias);
    gl.uniform1f(this.uniforms.u_thermalContrast, params.thermal.contrast);
    gl.uniform1f(this.uniforms.u_isolines, params.thermal.isolines);
    gl.uniform1f(this.uniforms.u_glow, params.thermal.glow);
    gl.uniform1f(this.uniforms.u_thermalPulse, params.animation.thermalPulse);

    gl.uniform3fv(this.uniforms.u_stop0, s0);
    gl.uniform3fv(this.uniforms.u_stop1, s1);
    gl.uniform3fv(this.uniforms.u_stop2, s2);
    gl.uniform3fv(this.uniforms.u_stop3, s3);

    gl.uniform1f(this.uniforms.u_scanlineMix, params.optics.scanlineMix);
    gl.uniform1f(this.uniforms.u_bayerDither, params.optics.bayerDither);
    gl.uniform1f(this.uniforms.u_ditherGrain, params.optics.ditherGrain);
    gl.uniform1i(this.uniforms.u_grainType, params.optics.grainType === 'stipple' ? 1 : 0);
    gl.uniform1f(this.uniforms.u_halftoneMix, params.optics.halftoneMix);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored
    );
    if (this.gl) {
      if (this.texture) this.gl.deleteTexture(this.texture);
      if (this.program) this.gl.deleteProgram(this.program);
      if (this.vao) this.gl.deleteVertexArray(this.vao);
    }
    this.gl = null;
  }
}
