// src/utils/CanvasCompositor.ts
// Canvas-based compositor for baking AR effects, filters, stickers, and graphics into captures
// V2: Multi-keyframe interpolation aligned with DOM/Framer Motion animations

// ============= EASING & INTERPOLATION =============

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function interpolateKeyframes(keyframes: number[], t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const count = keyframes.length - 1;
  const raw = clamped * count;
  const index = Math.floor(raw);
  if (index >= count) return keyframes[count];
  const localT = raw - index;
  const eased = easeInOut(localT);
  return keyframes[index] + (keyframes[index + 1] - keyframes[index]) * eased;
}

// ============= PARTICLE STATE (seeded for deterministic positions) =============

interface Particle {
  x: number; y: number; delay: number; duration: number; size: number; speed: number;
  color?: string; rotation?: number;
}

function generateParticles(count: number, seed: number): Particle[] {
  let s = seed;
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 0x7fffffff; };
  return Array.from({ length: count }, () => ({
    x: rand(), y: rand(), delay: rand() * 4, duration: 2 + rand() * 3,
    size: 0.8 + rand() * 1.2, speed: 0.5 + rand() * 1.5,
    rotation: rand() * 360,
  }));
}

const particleCache: Record<string, Particle[]> = {};
function getParticles(effectId: string, count: number, seed: number): Particle[] {
  if (!particleCache[effectId]) particleCache[effectId] = generateParticles(count, seed);
  return particleCache[effectId];
}

// ============= AR EFFECT DRAWING =============

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  const s = size;
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s, y, x - s, y + s * 0.3);
  ctx.bezierCurveTo(x - s, y + s * 0.7, x, y + s, x, y + s * 1.2);
  ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.7, x + s, y + s * 0.3);
  ctx.bezierCurveTo(x + s, y, x, y, x, y + s * 0.3);
  ctx.closePath();
  ctx.fill();
}

export function drawAREffect(
  ctx: CanvasRenderingContext2D,
  effectId: string,
  width: number,
  height: number,
  time: number
) {
  switch (effectId) {
    case 'sparkles': {
      // 40 particles, duration 3-4s, 6-keyframe trajectories, rotation 0->360
      const particles = getParticles('sparkles', 40, 101);
      const xKF = [0, 15, -20, 10, -10, 0];
      const yKF = [0, -15, 10, -20, 5, 0];
      const scaleKF = [0.6, 1.3, 0.8, 1.1, 0.9, 0.6];
      const opacityKF = [0, 1, 0.7, 1, 0.5, 0];

      particles.forEach(p => {
        const dur = 3 + p.speed * 0.5; // 3-4s
        const t = ((time + p.delay) % dur) / dur;
        const px = p.x * width + interpolateKeyframes(xKF, t);
        const py = p.y * height + interpolateKeyframes(yKF, t);
        const scale = interpolateKeyframes(scaleKF, t);
        const alpha = interpolateKeyframes(opacityKF, t);
        const rot = easeInOut(t) * 360 * Math.PI / 180;
        const r = p.size * 3.5 * scale;

        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        // Cross sparkle
        ctx.strokeStyle = '#FFF8DC';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-r * 1.8, 0); ctx.lineTo(r * 1.8, 0);
        ctx.moveTo(0, -r * 1.8); ctx.lineTo(0, r * 1.8);
        ctx.stroke();
        ctx.restore();
      });
      break;
    }

    case 'floating-hearts': {
      // 35 particles, duration 4-5s, multi-keyframe trajectories
      const particles = getParticles('hearts', 35, 202);
      const colors = ['#ff4444', '#ff6b9d', '#ff1493', '#ff69b4', '#e91e63'];
      const xKF = [0, 25, -25, 15, -15, 0];
      const yKF = [0, -40, 20, -30, 10, 0];
      const scaleKF = [0.5, 1.2, 0.9, 1.1, 0.8, 0.5];
      const opacityKF = [0, 1, 0.8, 1, 0.6, 0];

      particles.forEach((p, i) => {
        const dur = 4 + p.speed * 0.5; // 4-5s
        const t = ((time + p.delay) % dur) / dur;
        const baseX = p.x * width;
        const baseY = (1 - t) * height * 1.1; // float upward
        const px = baseX + interpolateKeyframes(xKF, t);
        const py = baseY + interpolateKeyframes(yKF, t);
        const scale = interpolateKeyframes(scaleKF, t);
        const alpha = interpolateKeyframes(opacityKF, t);

        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = colors[i % colors.length];
        drawHeart(ctx, px, py, p.size * 14 * scale);
        ctx.restore();
      });
      break;
    }

    case 'rain': {
      // 60 drops, duration 0.8-1.2s, fast linear fall
      const particles = getParticles('rain', 60, 303);
      ctx.save();
      particles.forEach(p => {
        const dur = 0.8 + p.speed * 0.2; // 0.8-1.2s
        const t = ((time + p.delay) % dur) / dur;
        const px = p.x * width + t * 25;
        const py = t * height * 1.3 - height * 0.1;
        const len = 22 + p.size * 28;
        const alpha = t < 0.05 ? t * 20 : t > 0.9 ? (1 - t) * 10 : 0.6;

        ctx.globalAlpha = alpha;
        const grad = ctx.createLinearGradient(px, py, px + 6, py + len);
        grad.addColorStop(0, 'rgba(100,180,255,0.1)');
        grad.addColorStop(1, 'rgba(100,180,255,0.7)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 6, py + len);
        ctx.stroke();
      });
      ctx.restore();
      break;
    }

    case 'confetti': {
      // 50 particles, duration 3-4s, rotation 0->1080deg, 6 keyframes
      const particles = getParticles('confetti', 50, 404);
      const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6', '#a855f7'];
      const xKF = [0, 30, -20, 25, -15, 5];
      const yKF = [0, 0.15, 0.35, 0.55, 0.78, 1.0];
      const opacityKF = [0, 1, 1, 0.9, 0.7, 0];

      particles.forEach((p, i) => {
        const dur = 3 + p.speed * 0.5; // 3-4s
        const t = ((time + p.delay) % dur) / dur;
        const baseX = p.x * width;
        const px = baseX + interpolateKeyframes(xKF, t);
        const py = interpolateKeyframes(yKF, t) * height * 1.2 - height * 0.1;
        const rot = easeInOut(t) * 1080 * Math.PI / 180;
        const alpha = interpolateKeyframes(opacityKF, t);
        const scaleW = 4 + Math.sin(rot * 2) * 2; // wobble width

        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(-scaleW, -7, scaleW * 2, 14);
        ctx.restore();
      });
      break;
    }

    case 'snow': {
      // 50 flakes, duration 4-6s, lateral drift 7 keyframes
      const particles = getParticles('snow', 50, 505);
      const xDriftKF = [0, 15, -10, 20, -15, 8, -5];
      const opacityKF = [0, 0.8, 1, 0.9, 1, 0.7, 0];

      particles.forEach(p => {
        const dur = 4 + p.speed * 1.0; // 4-6s
        const t = ((time + p.delay) % dur) / dur;
        const drift = interpolateKeyframes(xDriftKF, t);
        const px = p.x * width + drift;
        const py = t * height * 1.3 - height * 0.1;
        const alpha = interpolateKeyframes(opacityKF, t);
        const rotAngle = easeInOut(t) * 180 * Math.PI / 180;

        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.translate(px, py);
        ctx.rotate(rotAngle);
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      break;
    }

    case 'bubbles': {
      // 35 bubbles, duration 4-6s, multi-keyframe rise, scale pulse
      const particles = getParticles('bubbles', 35, 606);
      const xKF = [0, 10, -15, 8, -10, 5, 0];
      const scaleKF = [0.7, 1.0, 1.15, 0.95, 1.1, 1.0, 0.7];
      const opacityKF = [0, 0.5, 0.6, 0.5, 0.55, 0.4, 0];

      particles.forEach(p => {
        const dur = 4 + p.speed * 1.0; // 4-6s
        const t = ((time + p.delay) % dur) / dur;
        const px = p.x * width + interpolateKeyframes(xKF, t);
        const py = (1 - t) * height * 1.2 - height * 0.1;
        const scale = interpolateKeyframes(scaleKF, t);
        const r = p.size * 18 * scale;
        const alpha = interpolateKeyframes(opacityKF, t);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.stroke();
        // Highlight
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(px - r * 0.3, py - r * 0.3, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      break;
    }

    case 'fireflies': {
      // 40 fireflies, duration 5-8s, 7 keyframes x/y, scale pulse
      const particles = getParticles('fireflies', 40, 707);
      const xKF = [0, 30, -20, 40, -10, 25, 0];
      const yKF = [0, -20, 15, -30, 10, -15, 0];
      const scaleKF = [0.8, 1.2, 0.9, 1.4, 1.0, 1.3, 0.8];
      const opacityKF = [0.2, 0.9, 0.4, 1.0, 0.5, 0.8, 0.2];

      particles.forEach(p => {
        const dur = 5 + p.speed * 1.5; // 5-8s
        const t = ((time + p.delay) % dur) / dur;
        const px = p.x * width + interpolateKeyframes(xKF, t);
        const py = p.y * height + interpolateKeyframes(yKF, t);
        const scale = interpolateKeyframes(scaleKF, t);
        const alpha = interpolateKeyframes(opacityKF, t);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 25 * scale;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 3.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      break;
    }
  }
}

// ============= GRAPHICS/FRAMING DRAWING =============

export function drawGraphicsFrame(
  ctx: CanvasRenderingContext2D,
  frameId: string | undefined,
  borderId: string | undefined,
  overlayId: string | undefined,
  width: number,
  height: number
) {
  // Vignette overlay
  if (overlayId === 'vignette' || overlayId === 'dust_overlay') {
    const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.8);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  if (overlayId === 'light_leak') {
    ctx.save();
    ctx.globalAlpha = 0.15;
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, 'rgba(255,200,100,0.4)');
    grad.addColorStop(0.5, 'transparent');
    grad.addColorStop(1, 'rgba(255,100,50,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  if (overlayId === 'bokeh') {
    ctx.save();
    ctx.globalAlpha = 0.15;
    const bokehParticles = getParticles('bokeh_overlay', 12, 999);
    for (const bp of bokehParticles) {
      const bx = bp.x * width;
      const by = bp.y * height;
      const br = 20 + bp.size * 30;
      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      grad.addColorStop(0, 'rgba(255,255,255,0.3)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    ctx.restore();
  }

  // Borders
  if (borderId === 'rainbow_border') {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 0, width, height);
    ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'].forEach((c, i, a) => {
      grad.addColorStop(i / (a.length - 1), c);
    });
    ctx.strokeStyle = grad;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, width - 6, height - 6);
    ctx.restore();
  } else if (borderId === 'dots_border') {
    ctx.save();
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, width - 8, height - 8);
    ctx.restore();
  } else if (borderId === 'glow_border') {
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, width - 12, height - 12);
    ctx.restore();
  }

  // Frames
  if (frameId === 'polaroid') {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, 16);
    ctx.fillRect(0, 0, 16, height);
    ctx.fillRect(width - 16, 0, 16, height);
    ctx.fillRect(0, height - 48, width, 48);
    ctx.restore();
  } else if (frameId === 'neon_frame') {
    ctx.save();
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, width - 8, height - 8);
    ctx.restore();
  } else if (frameId === 'golden_frame') {
    ctx.save();
    ctx.strokeStyle = 'gold';
    ctx.shadowColor = 'rgba(255,215,0,0.5)';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, width - 8, height - 8);
    ctx.restore();
  }
}

// ============= STICKER DRAWING =============

export function drawStickers(
  ctx: CanvasRenderingContext2D,
  stickers: Array<{ content: string; position: { x: number; y: number }; scale: number; rotation: number }>,
  width: number,
  height: number
) {
  for (const sticker of stickers) {
    ctx.save();
    const x = (sticker.position.x / 100) * width;
    const y = (sticker.position.y / 100) * height;
    ctx.translate(x, y);
    ctx.rotate((sticker.rotation * Math.PI) / 180);
    ctx.scale(sticker.scale, sticker.scale);
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sticker.content, 0, 0);
    ctx.restore();
  }
}

// ============= FULL COMPOSITE FRAME =============

export interface CompositeOptions {
  filterId?: string;
  filterIntensity?: number;
  filterCss?: string;
  arEffects: string[];
  stickers: Array<{ content: string; position: { x: number; y: number }; scale: number; rotation: number }>;
  frameId?: string;
  borderId?: string;
  overlayId?: string;
  templateGradient?: string;
}

export function compositeFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  options: CompositeOptions,
  canvasW: number,
  canvasH: number,
  time: number
) {
  // 1. Draw video with filter
  ctx.save();
  if (options.filterCss && options.filterCss !== 'none') {
    ctx.filter = options.filterCss;
  }
  
  const vw = video.videoWidth || canvasW;
  const vh = video.videoHeight || canvasH;
  const srcAR = vw / vh;
  const dstAR = canvasW / canvasH;
  let sx = 0, sy = 0, sw = vw, sh = vh;
  if (srcAR > dstAR) {
    sw = Math.round(vh * dstAR);
    sx = Math.round((vw - sw) / 2);
  } else {
    sh = Math.round(vw / dstAR);
    sy = Math.round((vh - sh) / 2);
  }
  
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
  ctx.filter = 'none';
  ctx.restore();

  // 2. Template overlay gradient
  if (options.templateGradient) {
    ctx.save();
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasH);
    gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }

  // 3. Graphics/framing
  drawGraphicsFrame(ctx, options.frameId, options.borderId, options.overlayId, canvasW, canvasH);

  // 4. AR effects
  for (const arId of options.arEffects) {
    drawAREffect(ctx, arId, canvasW, canvasH, time);
  }

  // 5. Stickers
  drawStickers(ctx, options.stickers, canvasW, canvasH);
}
