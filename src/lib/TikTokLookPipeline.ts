/**
 * TikTokLookPipeline.ts
 * GPU-accelerated WebGL2 beauty/color pipeline for real-time camera processing.
 * Multi-pass shader pipeline: skin smooth → face relight → eye/teeth brighten → tone map → denoise → sharpen
 * 
 * HOW IT WORKS:
 * 1. Camera frame is uploaded as a WebGL texture
 * 2. A segmentation mask (from MediaPipe) marks skin/face/background regions
 * 3. Each shader pass reads from one framebuffer and writes to another (ping-pong)
 * 4. The final result is drawn to the output canvas
 * 
 * TUNING:
 * - Each effect has an intensity (0–100). 0 = pass-through, 100 = maximum effect.
 * - Quality presets control resolution and which passes run.
 * - Use setEnabled() to toggle individual passes on/off.
 */

// ========== GLSL SHADERS (embedded) ==========

const PASSTHROUGH_VERT = `#version 300 es
precision highp float;
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}`;

// Pass 1: Edge-aware skin smoothing (bilateral-like blur)
// 9-tap Gaussian weighted by luminance difference, applied only within skin mask
const SKIN_SMOOTH_FRAG = `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_image;
uniform sampler2D u_mask; // R=skin, G=face, B=background
uniform float u_intensity; // 0-1
uniform vec2 u_texelSize;
out vec4 fragColor;

float luminance(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
  vec4 center = texture(u_image, v_texCoord);
  float skinMask = texture(u_mask, v_texCoord).r;
  
  if (skinMask < 0.3 || u_intensity < 0.01) {
    fragColor = center;
    return;
  }
  
  float centerLum = luminance(center.rgb);
  float sigma = u_intensity * 3.0; // spatial sigma
  float sigmaR = 0.15; // range sigma (edge preservation)
  
  vec3 sum = vec3(0.0);
  float wSum = 0.0;
  
  // 9-tap bilateral approximation
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 offset = vec2(float(x), float(y)) * u_texelSize * sigma;
      vec3 sample_ = texture(u_image, v_texCoord + offset).rgb;
      float sampleLum = luminance(sample_);
      
      float spatialW = exp(-float(x*x + y*y) / (2.0 * sigma * sigma + 0.001));
      float rangeW = exp(-(centerLum - sampleLum) * (centerLum - sampleLum) / (2.0 * sigmaR * sigmaR));
      float w = spatialW * rangeW;
      
      sum += sample_ * w;
      wSum += w;
    }
  }
  
  vec3 smoothed = sum / max(wSum, 0.001);
  vec3 result = mix(center.rgb, smoothed, skinMask * u_intensity);
  fragColor = vec4(result, center.a);
}`;

// Pass 2: Face relighting (midtone gamma lift on face region)
const FACE_RELIGHT_FRAG = `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_image;
uniform sampler2D u_mask;
uniform float u_intensity;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_image, v_texCoord);
  float faceMask = texture(u_mask, v_texCoord).g;
  
  if (faceMask < 0.2 || u_intensity < 0.01) {
    fragColor = color;
    return;
  }
  
  // Gamma lift for midtones (brightens without blowing highlights)
  float gamma = 1.0 - u_intensity * 0.25; // range 1.0 to 0.75
  vec3 lit = pow(color.rgb, vec3(gamma));
  
  // Soft clamp to preserve highlights
  lit = min(lit, vec3(0.95));
  
  vec3 result = mix(color.rgb, lit, faceMask * u_intensity);
  fragColor = vec4(result, color.a);
}`;

// Pass 3: Eye/teeth brighten (subtle luminance boost)
const EYE_TEETH_FRAG = `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_image;
uniform sampler2D u_mask; // A channel = eye/teeth regions
uniform float u_intensity;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_image, v_texCoord);
  float eyeTeethMask = texture(u_mask, v_texCoord).a;
  
  if (eyeTeethMask < 0.2 || u_intensity < 0.01) {
    fragColor = color;
    return;
  }
  
  // Subtle brighten + slight desaturation for teeth whitening effect
  vec3 brightened = color.rgb * (1.0 + u_intensity * 0.3);
  float lum = dot(brightened, vec3(0.299, 0.587, 0.114));
  vec3 whitened = mix(brightened, vec3(lum), u_intensity * 0.15);
  
  vec3 result = mix(color.rgb, whitened, eyeTeethMask);
  fragColor = vec4(min(result, vec3(1.0)), color.a);
}`;

// Pass 4: TikTok-like tone mapping (S-curve, warm WB, controlled saturation)
const TONE_MAP_FRAG = `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_image;
uniform sampler2D u_mask;
uniform float u_intensity;
out vec4 fragColor;

float sCurve(float x) {
  // Cubic S-curve for punchy contrast
  return x * x * (3.0 - 2.0 * x);
}

void main() {
  vec4 color = texture(u_image, v_texCoord);
  float faceMask = texture(u_mask, v_texCoord).g;
  
  if (u_intensity < 0.01) {
    fragColor = color;
    return;
  }
  
  vec3 c = color.rgb;
  
  // S-curve contrast (in luminance domain to preserve hue)
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float newLum = mix(lum, sCurve(lum), u_intensity * 0.6);
  float lumRatio = lum > 0.001 ? newLum / lum : 1.0;
  c *= lumRatio;
  
  // Warm white balance shift (subtle)
  c.r += u_intensity * 0.012;
  c.b -= u_intensity * 0.008;
  
  // Controlled saturation boost (more on face, less on background)
  float sat = dot(c, vec3(0.299, 0.587, 0.114));
  float satBoost = mix(1.0 + u_intensity * 0.08, 1.0 + u_intensity * 0.15, faceMask);
  c = mix(vec3(sat), c, satBoost);
  
  // Shadow lift on face
  if (faceMask > 0.3) {
    float shadowLift = max(0.0, 0.15 - lum) * u_intensity * faceMask;
    c += shadowLift;
  }
  
  fragColor = vec4(clamp(c, 0.0, 1.0), color.a);
}`;

// Pass 5: Spatial denoise (5x5 non-local means approximation)
const DENOISE_FRAG = `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_image;
uniform float u_intensity;
uniform vec2 u_texelSize;
out vec4 fragColor;

void main() {
  vec4 center = texture(u_image, v_texCoord);
  
  if (u_intensity < 0.01) {
    fragColor = center;
    return;
  }
  
  float h = u_intensity * 0.08; // filter strength
  float h2 = h * h;
  
  vec3 sum = vec3(0.0);
  float wSum = 0.0;
  
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 offset = vec2(float(x), float(y)) * u_texelSize;
      vec3 s = texture(u_image, v_texCoord + offset).rgb;
      vec3 diff = s - center.rgb;
      float d2 = dot(diff, diff);
      float w = exp(-d2 / (h2 + 0.0001));
      sum += s * w;
      wSum += w;
    }
  }
  
  fragColor = vec4(sum / max(wSum, 0.001), center.a);
}`;

// Pass 6: Micro-contrast sharpening (unsharp mask, face-weighted)
const SHARPEN_FRAG = `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_image;
uniform sampler2D u_mask;
uniform float u_intensity;
uniform vec2 u_texelSize;
out vec4 fragColor;

void main() {
  vec4 center = texture(u_image, v_texCoord);
  float faceMask = texture(u_mask, v_texCoord).g;
  
  if (u_intensity < 0.01) {
    fragColor = center;
    return;
  }
  
  // 3x3 blur for unsharp mask
  vec3 blur = vec3(0.0);
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      blur += texture(u_image, v_texCoord + vec2(float(x), float(y)) * u_texelSize).rgb;
    }
  }
  blur /= 9.0;
  
  // Unsharp mask: original + (original - blur) * amount
  float amount = u_intensity * mix(0.3, 0.8, faceMask); // stronger on face
  vec3 sharpened = center.rgb + (center.rgb - blur) * amount;
  
  fragColor = vec4(clamp(sharpened, 0.0, 1.0), center.a);
}`;

// ========== TYPES ==========

export type QualityPreset = 'low' | 'standard' | 'high';

export interface PipelineSettings {
  beautyIntensity: number;      // 0-100
  relightIntensity: number;     // 0-100 (internal, derived from beauty)
  eyeTeethIntensity: number;    // 0-100
  lookStrength: number;         // 0-100
  denoiseIntensity: number;     // 0-100
  sharpenIntensity: number;     // 0-100
  qualityPreset: QualityPreset;
  stabilizationEnabled: boolean;
  beautyEnabled: boolean;
  toneMapEnabled: boolean;
  denoiseEnabled: boolean;
  sharpenEnabled: boolean;
}

export interface PerformanceStats {
  fps: number;
  frameTimeMs: number;
  gpuLoad: 'low' | 'medium' | 'high';
}

export const DEFAULT_SETTINGS: PipelineSettings = {
  beautyIntensity: 45,
  relightIntensity: 30,
  eyeTeethIntensity: 25,
  lookStrength: 55,
  denoiseIntensity: 20,
  sharpenIntensity: 35,
  qualityPreset: 'standard',
  stabilizationEnabled: false,
  beautyEnabled: true,
  toneMapEnabled: true,
  denoiseEnabled: true,
  sharpenEnabled: true,
};

// ========== PIPELINE CLASS ==========

export class TikTokLookPipeline {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private programs: Map<string, WebGLProgram> = new Map();
  private framebuffers: WebGLFramebuffer[] = [];
  private fbTextures: WebGLTexture[] = [];
  private inputTexture: WebGLTexture | null = null;
  private maskTexture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private settings: PipelineSettings;
  private destroyed = false;

  // Performance monitoring
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentFps = 0;
  private lastFrameTime = 0;

  // A/B preview
  private showRaw = false;

  constructor(canvas: HTMLCanvasElement, settings?: Partial<PipelineSettings>) {
    this.canvas = canvas;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  /**
   * Initialize the WebGL2 context, compile all shaders, and create framebuffers.
   * Must be called before processFrame().
   */
  async initialize(): Promise<boolean> {
    try {
      this.gl = this.canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        desynchronized: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      });

      if (!this.gl) {
        console.warn('⚠️ WebGL2 not available, falling back to no-op pipeline');
        return false;
      }

      const gl = this.gl;

      // Compile all shader programs
      this.compileProgram('skinSmooth', PASSTHROUGH_VERT, SKIN_SMOOTH_FRAG);
      this.compileProgram('faceRelight', PASSTHROUGH_VERT, FACE_RELIGHT_FRAG);
      this.compileProgram('eyeTeeth', PASSTHROUGH_VERT, EYE_TEETH_FRAG);
      this.compileProgram('toneMap', PASSTHROUGH_VERT, TONE_MAP_FRAG);
      this.compileProgram('denoise', PASSTHROUGH_VERT, DENOISE_FRAG);
      this.compileProgram('sharpen', PASSTHROUGH_VERT, SHARPEN_FRAG);

      // Create fullscreen quad VAO
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);

      const posBuffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  0, 0,
         1, -1,  1, 0,
        -1,  1,  0, 1,
         1,  1,  1, 1,
      ]), gl.STATIC_DRAW);

      // a_position
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
      // a_texCoord
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);

      gl.bindVertexArray(null);

      // Create ping-pong framebuffers
      this.createFramebuffers();

      // Create input + mask textures
      this.inputTexture = this.createTexture();
      this.maskTexture = this.createTexture();

      console.log('✅ TikTokLookPipeline initialized (WebGL2)');
      return true;
    } catch (err) {
      console.error('❌ TikTokLookPipeline init failed:', err);
      return false;
    }
  }

  /**
   * Process a single video frame through the shader pipeline.
   * @param videoFrame - HTMLVideoElement or HTMLCanvasElement with the camera frame
   * @param segmentationMask - Optional mask image (RGBA: R=skin, G=face, B=bg, A=eyeTeeth)
   */
  processFrame(
    videoFrame: HTMLVideoElement | HTMLCanvasElement | TexImageSource,
    segmentationMask?: HTMLCanvasElement | ImageData | null
  ): void {
    if (this.destroyed || !this.gl) return;

    const startTime = performance.now();
    const gl = this.gl;

    // If A/B mode (show raw), just draw the input directly
    if (this.showRaw) {
      this.drawDirect(videoFrame);
      this.updatePerformanceStats(startTime);
      return;
    }

    // Upload camera frame to input texture
    gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoFrame as TexImageSource);

    // Upload mask (or create a default white mask)
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
    if (segmentationMask) {
      if (segmentationMask instanceof ImageData) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, segmentationMask);
      } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, segmentationMask);
      }
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const texelSize = [1.0 / w, 1.0 / h];

    // Build pass list based on settings and quality preset
    let currentInput = this.inputTexture!;

    const passes = this.getActivePasses();
    let pingPongIdx = 0;

    for (const pass of passes) {
      const prog = this.programs.get(pass.name);
      if (!prog) continue;

      const isLast = pass === passes[passes.length - 1];
      
      if (isLast) {
        // Render to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      } else {
        // Render to framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[pingPongIdx % 2]);
      }

      gl.viewport(0, 0, w, h);
      gl.useProgram(prog);

      // Bind input texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, currentInput);
      gl.uniform1i(gl.getUniformLocation(prog, 'u_image'), 0);

      // Bind mask texture
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.uniform1i(gl.getUniformLocation(prog, 'u_mask'), 1);

      // Set uniforms
      gl.uniform1f(gl.getUniformLocation(prog, 'u_intensity'), pass.intensity);
      gl.uniform2fv(gl.getUniformLocation(prog, 'u_texelSize'), texelSize);

      // Draw
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindVertexArray(null);

      if (!isLast) {
        currentInput = this.fbTextures[pingPongIdx % 2];
        pingPongIdx++;
      }
    }

    // If no passes, just draw through
    if (passes.length === 0) {
      this.drawDirect(videoFrame);
    }

    this.updatePerformanceStats(startTime);
  }

  private getActivePasses(): { name: string; intensity: number }[] {
    const s = this.settings;
    const isLow = s.qualityPreset === 'low';
    const passes: { name: string; intensity: number }[] = [];

    if (s.beautyEnabled && s.beautyIntensity > 0) {
      passes.push({ name: 'skinSmooth', intensity: s.beautyIntensity / 100 });
      passes.push({ name: 'faceRelight', intensity: s.relightIntensity / 100 });
      if (s.eyeTeethIntensity > 0) {
        passes.push({ name: 'eyeTeeth', intensity: s.eyeTeethIntensity / 100 });
      }
    }

    if (s.toneMapEnabled && s.lookStrength > 0) {
      passes.push({ name: 'toneMap', intensity: s.lookStrength / 100 });
    }

    if (!isLow && s.denoiseEnabled && s.denoiseIntensity > 0) {
      passes.push({ name: 'denoise', intensity: s.denoiseIntensity / 100 });
    }

    if (!isLow && s.sharpenEnabled && s.sharpenIntensity > 0) {
      passes.push({ name: 'sharpen', intensity: s.sharpenIntensity / 100 });
    }

    return passes;
  }

  private drawDirect(source: HTMLVideoElement | HTMLCanvasElement | TexImageSource): void {
    const gl = this.gl!;
    // Simple passthrough: upload and draw to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // Use toneMap program with intensity=0 as a passthrough
    const prog = this.programs.get('toneMap');
    if (!prog) return;
    gl.useProgram(prog);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as TexImageSource);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_image'), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_mask'), 1);

    gl.uniform1f(gl.getUniformLocation(prog, 'u_intensity'), 0);
    gl.uniform2fv(gl.getUniformLocation(prog, 'u_texelSize'), [1 / this.canvas.width, 1 / this.canvas.height]);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  }

  // ========== SETTINGS ==========

  updateSettings(partial: Partial<PipelineSettings>): void {
    this.settings = { ...this.settings, ...partial };
  }

  getSettings(): PipelineSettings {
    return { ...this.settings };
  }

  setShowRaw(raw: boolean): void {
    this.showRaw = raw;
  }

  isShowingRaw(): boolean {
    return this.showRaw;
  }

  // ========== PERFORMANCE ==========

  getPerformanceStats(): PerformanceStats {
    return {
      fps: this.currentFps,
      frameTimeMs: this.lastFrameTime,
      gpuLoad: this.lastFrameTime > 25 ? 'high' : this.lastFrameTime > 12 ? 'medium' : 'low',
    };
  }

  private updatePerformanceStats(startTime: number): void {
    this.lastFrameTime = performance.now() - startTime;
    this.frameCount++;

    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  // ========== WEBGL HELPERS ==========

  private compileProgram(name: string, vertSrc: string, fragSrc: string): void {
    const gl = this.gl!;
    const vert = this.compileShader(gl.VERTEX_SHADER, vertSrc);
    const frag = this.compileShader(gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);

    // Bind attribute locations before linking
    gl.bindAttribLocation(prog, 0, 'a_position');
    gl.bindAttribLocation(prog, 1, 'a_texCoord');

    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(`Shader link error (${name}):`, gl.getProgramInfoLog(prog));
      return;
    }

    this.programs.set(name, prog);
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createTexture(): WebGLTexture {
    const gl = this.gl!;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // Initialize with 1x1 white pixel
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]));
    return tex;
  }

  private createFramebuffers(): void {
    const gl = this.gl!;
    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let i = 0; i < 2; i++) {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

      this.fbTextures.push(tex);
      this.framebuffers.push(fb);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Resize framebuffers when canvas dimensions change.
   */
  resize(width: number, height: number): void {
    if (!this.gl) return;
    this.canvas.width = width;
    this.canvas.height = height;

    const gl = this.gl;
    for (let i = 0; i < 2; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.fbTextures[i]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
  }

  /**
   * Get the output canvas element (for MediaRecorder.captureStream).
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Clean up all WebGL resources.
   */
  destroy(): void {
    this.destroyed = true;
    if (!this.gl) return;
    const gl = this.gl;

    this.programs.forEach((prog) => gl.deleteProgram(prog));
    this.programs.clear();

    this.framebuffers.forEach((fb) => gl.deleteFramebuffer(fb));
    this.fbTextures.forEach((tex) => gl.deleteTexture(tex));
    if (this.inputTexture) gl.deleteTexture(this.inputTexture);
    if (this.maskTexture) gl.deleteTexture(this.maskTexture);
    if (this.vao) gl.deleteVertexArray(this.vao);

    this.gl = null;
    console.log('🧹 TikTokLookPipeline destroyed');
  }
}

export default TikTokLookPipeline;
