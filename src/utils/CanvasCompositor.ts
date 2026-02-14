// src/utils/CanvasCompositor.ts
// Canvas-based compositor for baking AR effects, filters, stickers, and graphics into captures

// ============= PARTICLE STATE (seeded for deterministic positions) =============

interface Particle {
  x: number; y: number; delay: number; duration: number; size: number; speed: number;
  color?: string; rotation?: number;
}

function generateParticles(count: number, seed: number): Particle[] {
  // Simple seeded random for reproducible particles
  let s = seed;
  const rand = () => { s = (s * 16807 + 0) % 2147483647; return (s & 0x7fffffff) / 0x7fffffff; };
  return Array.from({ length: count }, () => ({
    x: rand(), y: rand(), delay: rand() * 4, duration: 2 + rand() * 3,
    size: 0.8 + rand() * 1.2, speed: 0.5 + rand() * 1.5,
    rotation: rand() * 360,
  }));
}

// Cache particles per effect
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
      const particles = getParticles('sparkles', 40, 101);
      particles.forEach(p => {
        const t = ((time + p.delay) % p.duration) / p.duration;
        const pulse = 0.3 + Math.abs(Math.sin(t * Math.PI * 2)) * 0.7;
        const px = (p.x + Math.sin(time * 0.5 + p.delay) * 0.03) * width;
        const py = (p.y + Math.cos(time * 0.7 + p.delay) * 0.03) * height;
        const r = p.size * 3 * pulse;
        ctx.save();
        ctx.globalAlpha = pulse * 0.9;
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        // Cross sparkle
        ctx.strokeStyle = '#FFF8DC';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px - r * 1.5, py); ctx.lineTo(px + r * 1.5, py);
        ctx.moveTo(px, py - r * 1.5); ctx.lineTo(px, py + r * 1.5);
        ctx.stroke();
        ctx.restore();
      });
      break;
    }

    case 'floating-hearts': {
      const particles = getParticles('hearts', 25, 202);
      const colors = ['#ff4444', '#ff6b9d', '#ff1493', '#ff69b4', '#e91e63'];
      particles.forEach((p, i) => {
        const cycle = (time * p.speed * 0.3 + p.delay) % 5;
        const progress = cycle / 5;
        const px = (p.x + Math.sin(time * 0.4 + p.delay) * 0.05) * width;
        const py = (1 - progress) * height * 1.2 - height * 0.1;
        const alpha = progress < 0.1 ? progress * 10 : progress > 0.85 ? (1 - progress) / 0.15 : 1;
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = colors[i % colors.length];
        drawHeart(ctx, px, py, p.size * 10);
        ctx.restore();
      });
      break;
    }

    case 'rain': {
      const particles = getParticles('rain', 60, 303);
      ctx.save();
      particles.forEach(p => {
        const cycle = (time * p.speed * 2 + p.delay) % 1;
        const px = p.x * width + cycle * 30;
        const py = cycle * height * 1.3 - height * 0.1;
        const len = 20 + p.size * 25;
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = 'rgba(100,180,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + 8, py + len);
        ctx.stroke();
      });
      ctx.restore();
      break;
    }

    case 'confetti': {
      const particles = getParticles('confetti', 35, 404);
      const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6bd6', '#a855f7'];
      particles.forEach((p, i) => {
        const cycle = (time * p.speed * 0.5 + p.delay) % 4;
        const progress = cycle / 4;
        const px = (p.x + Math.sin(time + p.delay) * 0.08) * width;
        const py = progress * height * 1.4 - height * 0.2;
        const rot = (time * 90 + p.rotation!) * Math.PI / 180;
        const alpha = progress < 0.1 ? progress * 10 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(-4, -6, 8, 12);
        ctx.restore();
      });
      break;
    }

    case 'snow': {
      const particles = getParticles('snow', 45, 505);
      particles.forEach(p => {
        const cycle = (time * p.speed * 0.2 + p.delay) % 6;
        const progress = cycle / 6;
        const drift = Math.sin(time * 0.5 + p.delay * 3) * 30;
        const px = p.x * width + drift;
        const py = progress * height * 1.3 - height * 0.1;
        const alpha = progress < 0.1 ? progress * 10 : progress > 0.85 ? (1 - progress) / 0.15 : 1;
        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'white';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      break;
    }

    case 'bubbles': {
      const particles = getParticles('bubbles', 20, 606);
      particles.forEach(p => {
        const cycle = (time * p.speed * 0.25 + p.delay) % 5;
        const progress = cycle / 5;
        const px = (p.x + Math.sin(time * 0.3 + p.delay) * 0.04) * width;
        const py = (1 - progress) * height * 1.2 - height * 0.1;
        const r = p.size * 15;
        const alpha = progress < 0.1 ? progress * 10 : progress > 0.8 ? (1 - progress) / 0.2 : 1;
        ctx.save();
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.stroke();
        // Highlight
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(px - r * 0.3, py - r * 0.3, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      break;
    }

    case 'fireflies': {
      const particles = getParticles('fireflies', 30, 707);
      particles.forEach(p => {
        const pulse = 0.2 + Math.abs(Math.sin(time * 2 + p.delay * 5)) * 0.8;
        const px = (p.x + Math.sin(time * 0.6 + p.delay * 2) * 0.06) * width;
        const py = (p.y + Math.cos(time * 0.5 + p.delay * 3) * 0.06) * height;
        ctx.save();
        ctx.globalAlpha = pulse * 0.9;
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 3, 0, Math.PI * 2);
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
    for (let i = 0; i < 12; i++) {
      const bx = Math.random() * width;
      const by = Math.random() * height;
      const br = 20 + Math.random() * 40;
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

/**
 * Draw a complete composited frame onto the provided canvas context.
 * Used for both photo capture and video recording (via requestAnimationFrame loop).
 */
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
