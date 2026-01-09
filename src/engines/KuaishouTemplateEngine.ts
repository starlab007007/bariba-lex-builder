/**
 * KuaishouTemplateEngine.ts
 * Moteur principal pour le rendu et le traitement des templates vidéo Kuaishou
 * Version: 1.0.0
 */

import {
  KuaishouTemplateConfig,
  TemplateSegment,
  VideoSegment,
  KenBurnsConfig,
  LightLeakConfig,
  ColorGradingConfig,
  EffectType
} from '../types/KuaishouTypes';

export class KuaishouTemplateEngine {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private currentTemplate: KuaishouTemplateConfig | null = null;
  private userSegments: Map<string, VideoSegment> = new Map();
  private templateSegments: Map<string, HTMLVideoElement> = new Map();
  private audioContext: AudioContext;
  private currentTime: number = 0;

  // Cache
  private lutCache: Map<string, ImageData> = new Map();
  private assetCache: Map<string, HTMLImageElement> = new Map();

  constructor(width: number = 1080, height: number = 1920) {
    this.canvas = new OffscreenCanvas(width, height);
    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    })!;
    this.audioContext = new AudioContext();
  }

  // ==========================================
  // CHARGEMENT TEMPLATE
  // ==========================================

  async loadTemplate(templateId: string): Promise<void> {
    try {
      // Charger manifest
      const response = await fetch(`/templates/manifests/${templateId}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${templateId}`);
      }
      this.currentTemplate = await response.json();

      // Précharger assets
      await this.preloadTemplateAssets();

      console.log(`✅ Template loaded: ${this.currentTemplate?.name}`);
    } catch (error) {
      console.error('❌ Error loading template:', error);
      throw error;
    }
  }

  setTemplate(template: KuaishouTemplateConfig): void {
    this.currentTemplate = template;
  }

  private async preloadTemplateAssets(): Promise<void> {
    if (!this.currentTemplate) return;

    const videoSegments = this.currentTemplate.segments.filter(
      s => s.type === 'template_video' && s.videoUrl
    );

    // Précharger vidéos en parallèle
    await Promise.all(
      videoSegments.map(segment => this.loadTemplateVideo(segment))
    );

    // Précharger stickers
    if (this.currentTemplate.overlays?.stickers) {
      await Promise.all(
        this.currentTemplate.overlays.stickers.map(sticker =>
          this.loadAsset(sticker.assetUrl)
        )
      );
    }

    // Précharger LUTs
    if (this.currentTemplate.autoEffects?.colorGrading?.enabled) {
      await this.loadLUT(this.currentTemplate.autoEffects.colorGrading.lut);
    }
  }

  private async loadTemplateVideo(segment: TemplateSegment): Promise<void> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = segment.videoUrl!;
      video.preload = 'auto';
      video.muted = true;
      video.onloadeddata = () => {
        this.templateSegments.set(segment.id, video);
        resolve();
      };
      video.onerror = () => {
        reject(new Error(`Failed to load video: ${segment.videoUrl}`));
      };
    });
  }

  private async loadAsset(url: string): Promise<HTMLImageElement> {
    if (this.assetCache.has(url)) {
      return this.assetCache.get(url)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        this.assetCache.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load asset: ${url}`));
      };
    });
  }

  // ==========================================
  // GESTION SEGMENTS UTILISATEUR
  // ==========================================

  addUserSegment(segment: VideoSegment): void {
    if (segment.templateSegmentId) {
      this.userSegments.set(segment.templateSegmentId, segment);
    }
  }

  getUserSegment(templateSegmentId: string): VideoSegment | undefined {
    return this.userSegments.get(templateSegmentId);
  }

  getAllUserSegments(): VideoSegment[] {
    return Array.from(this.userSegments.values());
  }

  clearUserSegments(): void {
    this.userSegments.clear();
  }

  // ==========================================
  // RENDU PRINCIPAL
  // ==========================================

  async renderFrame(timestamp: number): Promise<void> {
    if (!this.currentTemplate) {
      console.warn('No template loaded');
      return;
    }

    this.currentTime = timestamp;

    // Effacer canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Trouver segment actif
    const activeSegment = this.findActiveSegment(timestamp);
    if (!activeSegment) {
      return;
    }

    // Rendu selon type
    switch (activeSegment.type) {
      case 'template_video':
        await this.renderTemplateSegment(activeSegment, timestamp);
        break;
      case 'user_capture':
        await this.renderUserSegment(activeSegment, timestamp);
        break;
      case 'photo_slot':
        await this.renderPhotoSegment(activeSegment, timestamp);
        break;
    }

    // Appliquer effets automatiques
    if (this.currentTemplate.autoEffects) {
      this.applyAutoEffects(timestamp);
    }

    // Appliquer transitions
    this.applyTransition(timestamp);

    // Appliquer overlays
    if (this.currentTemplate.overlays) {
      this.applyOverlays(timestamp);
    }
  }

  private findActiveSegment(timestamp: number): TemplateSegment | null {
    if (!this.currentTemplate) return null;

    return this.currentTemplate.segments.find(
      segment => timestamp >= segment.start && timestamp < segment.start + segment.duration
    ) || null;
  }

  // ==========================================
  // RENDU SEGMENTS
  // ==========================================

  private async renderTemplateSegment(
    segment: TemplateSegment,
    timestamp: number
  ): Promise<void> {
    const video = this.templateSegments.get(segment.id);
    if (!video) {
      console.warn(`Template video not loaded: ${segment.id}`);
      return;
    }

    // Calculer le temps local dans le segment
    const localTime = timestamp - segment.start;

    // Synchroniser vidéo
    if (Math.abs(video.currentTime - localTime) > 0.1) {
      video.currentTime = localTime;
    }

    // Dessiner frame
    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);

    // Appliquer effets du segment
    for (const effect of segment.effects) {
      await this.applyEffect(effect, segment, timestamp);
    }
  }

  private async renderUserSegment(
    segment: TemplateSegment,
    timestamp: number
  ): Promise<void> {
    const userSegment = this.getUserSegment(segment.id);
    if (!userSegment || !userSegment.videoElement) {
      // Afficher placeholder avec guidance
      this.renderGuidancePlaceholder(segment);
      return;
    }

    const localTime = timestamp - segment.start;

    // Synchroniser vidéo
    if (Math.abs(userSegment.videoElement.currentTime - localTime) > 0.1) {
      userSegment.videoElement.currentTime = localTime;
    }

    // Dessiner vidéo utilisateur
    this.ctx.drawImage(
      userSegment.videoElement,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    // Appliquer effets du segment
    for (const effect of segment.effects) {
      await this.applyEffect(effect, segment, timestamp);
    }
  }

  private async renderPhotoSegment(
    segment: TemplateSegment,
    timestamp: number
  ): Promise<void> {
    const userSegment = this.getUserSegment(segment.id);
    if (!userSegment || !userSegment.image) {
      this.renderPhotoPlaceholder(segment);
      return;
    }

    // Dessiner photo
    this.ctx.drawImage(
      userSegment.image,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    // Appliquer Ken Burns si configuré
    if (segment.kenBurns) {
      this.applyKenBurns(segment.kenBurns, timestamp - segment.start, segment.duration);
    }

    // Appliquer light leak si configuré
    if (segment.lightLeak) {
      await this.applyLightLeak(segment.lightLeak, timestamp - segment.start);
    }

    // Appliquer effets du segment
    for (const effect of segment.effects) {
      await this.applyEffect(effect, segment, timestamp);
    }
  }

  private renderGuidancePlaceholder(segment: TemplateSegment): void {
    // Fond semi-transparent
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Texte guidance
    if (segment.guidance) {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        segment.guidance.text,
        this.canvas.width / 2,
        this.canvas.height / 2
      );
    }

    // Icône caméra
    this.ctx.font = '120px Arial';
    this.ctx.fillText('📹', this.canvas.width / 2, this.canvas.height / 2 - 100);
  }

  private renderPhotoPlaceholder(segment: TemplateSegment): void {
    // Fond semi-transparent
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Icône photo
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '120px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('🖼️', this.canvas.width / 2, this.canvas.height / 2);

    // Texte
    this.ctx.font = 'bold 36px Arial';
    this.ctx.fillText(
      'Ajoutez une photo',
      this.canvas.width / 2,
      this.canvas.height / 2 + 100
    );
  }

  // ==========================================
  // EFFETS
  // ==========================================

  private async applyEffect(
    effect: EffectType,
    segment: TemplateSegment,
    timestamp: number
  ): Promise<void> {
    switch (effect) {
      case 'beauty':
        this.applyBeautyFilter();
        break;
      case 'stabilization':
        // Stabilisation déjà appliquée pendant capture
        break;
      case 'ken_burns':
        if (segment.kenBurns) {
          this.applyKenBurns(segment.kenBurns, timestamp - segment.start, segment.duration);
        }
        break;
      case 'light_leak':
        if (segment.lightLeak) {
          await this.applyLightLeak(segment.lightLeak, timestamp - segment.start);
        }
        break;
      case 'color_grading':
        if (segment.colorGrading) {
          await this.applyColorGrading(segment.colorGrading);
        }
        break;
      case 'film_grain':
        this.applyFilmGrain();
        break;
      case 'vignette':
        this.applyVignette();
        break;
      case 'hdr_like':
        this.applyHDREffect();
        break;
      case 'sharpness':
        this.applySharpness();
        break;
    }
  }

  private applyBeautyFilter(): void {
    if (!this.currentTemplate?.autoEffects?.beauty?.enabled) return;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const intensity = this.currentTemplate.autoEffects.beauty.intensity;

    // Skin smoothing simple (blur sélectif sur tons chair)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Détection approximative de peau
      if (r > 95 && g > 40 && b > 20 && r > g && r > b) {
        // Lissage
        const smoothFactor = intensity * 0.3;
        data[i] = r + (128 - r) * smoothFactor;
        data[i + 1] = g + (128 - g) * smoothFactor;
        data[i + 2] = b + (128 - b) * smoothFactor;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyKenBurns(
    config: KenBurnsConfig,
    localTime: number,
    duration: number
  ): void {
    const progress = Math.min(localTime / duration, 1);
    const easedProgress = this.easeInOutQuad(progress);

    // Interpolation
    const scale = this.lerp(config.startScale, config.endScale, easedProgress);
    const x = this.lerp(config.startPosition.x, config.endPosition.x, easedProgress);
    const y = this.lerp(config.startPosition.y, config.endPosition.y, easedProgress);

    // Appliquer transformation
    this.ctx.save();
    this.ctx.translate(this.canvas.width * x, this.canvas.height * y);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);

    // Redessiner avec transformation
    const tempImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.putImageData(tempImageData, 0, 0);

    this.ctx.restore();
  }

  private async applyLightLeak(
    config: LightLeakConfig,
    localTime: number
  ): Promise<void> {
    const leakImg = await this.loadAsset(config.asset);

    // Animation pulse
    const pulse = 0.3 + Math.sin(localTime * 0.5) * 0.1;
    const opacity = config.opacity * pulse;

    this.ctx.save();
    const blendMap: Record<string, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'hard-light': 'hard-light',
      'soft-light': 'soft-light'
    };
    this.ctx.globalCompositeOperation = blendMap[config.blendMode] || 'screen';
    this.ctx.globalAlpha = opacity;

    // Position
    let x = 0, y = 0;
    if (typeof config.position === 'string') {
      switch (config.position) {
        case 'top_right':
          x = this.canvas.width - leakImg.width;
          y = 0;
          break;
        case 'top_left':
          x = 0;
          y = 0;
          break;
        case 'bottom_right':
          x = this.canvas.width - leakImg.width;
          y = this.canvas.height - leakImg.height;
          break;
        case 'bottom_left':
          x = 0;
          y = this.canvas.height - leakImg.height;
          break;
      }
    } else {
      x = config.position.x * this.canvas.width;
      y = config.position.y * this.canvas.height;
    }

    this.ctx.drawImage(leakImg, x, y);
    this.ctx.restore();
  }

  private async applyColorGrading(config: ColorGradingConfig): Promise<void> {
    // Charger LUT si pas en cache
    if (!this.lutCache.has(config.lut)) {
      await this.loadLUT(config.lut);
    }

    // Application simplifiée de color grading
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Temperature
      if (config.temperature) {
        data[i] += config.temperature * 10; // Rouge
        data[i + 2] -= config.temperature * 10; // Bleu
      }

      // Saturation
      if (config.saturation !== undefined) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray + config.saturation * (data[i] - gray);
        data[i + 1] = gray + config.saturation * (data[i + 1] - gray);
        data[i + 2] = gray + config.saturation * (data[i + 2] - gray);
      }

      // Contrast
      if (config.contrast !== undefined) {
        const factor = (259 * (config.contrast + 255)) / (255 * (259 - config.contrast));
        data[i] = factor * (data[i] - 128) + 128;
        data[i + 1] = factor * (data[i + 1] - 128) + 128;
        data[i + 2] = factor * (data[i + 2] - 128) + 128;
      }

      // Brightness
      if (config.brightness) {
        data[i] += config.brightness * 255;
        data[i + 1] += config.brightness * 255;
        data[i + 2] += config.brightness * 255;
      }

      // Clamp values
      data[i] = Math.max(0, Math.min(255, data[i]));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyFilmGrain(): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const intensity = 0.15;

    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * intensity * 255;
      data[i] += grain;
      data[i + 1] += grain;
      data[i + 2] += grain;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyVignette(): void {
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      0,
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.max(this.canvas.width, this.canvas.height) * 0.7
    );

    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.6, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.6)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private applyHDREffect(): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const avg = (r + g + b) / 3;

      // Highlights
      if (avg > 180) {
        data[i] = r * 0.95;
        data[i + 1] = g * 0.95;
        data[i + 2] = b * 0.95;
      }

      // Shadows
      if (avg < 75) {
        data[i] = r * 1.2;
        data[i + 1] = g * 1.2;
        data[i + 2] = b * 1.2;
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applySharpness(): void {
    // Sharpening simple avec kernel
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

    const output = new Uint8ClampedArray(data.length);

    for (let y = 1; y < this.canvas.height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const ki = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[ki] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          output[i + c] = Math.max(0, Math.min(255, sum));
        }
        output[i + 3] = data[i + 3];
      }
    }

    for (let i = 0; i < data.length; i++) {
      data[i] = output[i];
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyAutoEffects(timestamp: number): void {
    if (!this.currentTemplate?.autoEffects) return;

    const { beauty, colorGrading, sharpness, hdrLike, filmGrain } = this.currentTemplate.autoEffects;

    if (beauty?.enabled) {
      this.applyBeautyFilter();
    }

    if (colorGrading?.enabled) {
      this.applyColorGrading(colorGrading);
    }

    if (sharpness?.enabled) {
      this.applySharpness();
    }

    if (hdrLike?.enabled) {
      this.applyHDREffect();
    }

    if (filmGrain?.enabled) {
      this.applyFilmGrain();
    }
  }

  // ==========================================
  // TRANSITIONS
  // ==========================================

  private applyTransition(timestamp: number): void {
    if (!this.currentTemplate) return;

    // Trouver transition active
    const transition = this.currentTemplate.transitions.find(t => {
      const segment1 = this.currentTemplate!.segments.find(s => s.id === t.between[0]);
      const segment2 = this.currentTemplate!.segments.find(s => s.id === t.between[1]);
      if (!segment1 || !segment2) return false;

      const transitionStart = segment1.start + segment1.duration;
      const transitionEnd = transitionStart + t.duration;

      return timestamp >= transitionStart && timestamp < transitionEnd;
    });

    if (!transition) return;

    // Calculer progress de transition
    const segment1 = this.currentTemplate.segments.find(s => s.id === transition.between[0])!;
    const transitionStart = segment1.start + segment1.duration;
    const progress = (timestamp - transitionStart) / transition.duration;

    // Appliquer selon type
    switch (transition.type) {
      case 'crossfade':
        this.ctx.globalAlpha = 1 - progress;
        break;
      case 'fade_to_black':
        this.ctx.fillStyle = `rgba(0,0,0,${progress})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        break;
      case 'zoom_blur':
        // Effet zoom blur simplifié
        const scale = 1 + progress * 0.2;
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);
        this.ctx.restore();
        break;
    }
  }

  // ==========================================
  // OVERLAYS
  // ==========================================

  private applyOverlays(timestamp: number): void {
    if (!this.currentTemplate?.overlays) return;

    // Stickers
    for (const sticker of this.currentTemplate.overlays.stickers) {
      if (timestamp >= sticker.startTime && timestamp <= sticker.endTime) {
        this.renderSticker(sticker, timestamp);
      }
    }

    // Text overlays
    for (const text of this.currentTemplate.overlays.text) {
      this.renderTextOverlay(text, timestamp);
    }

    // CTA
    if (this.currentTemplate.overlays.cta) {
      this.renderCTA(this.currentTemplate.overlays.cta, timestamp);
    }
  }

  private async renderSticker(sticker: any, timestamp: number): Promise<void> {
    const img = await this.loadAsset(sticker.assetUrl);

    this.ctx.save();
    this.ctx.globalAlpha = sticker.opacity || 1;

    let x = 0, y = 0;
    if (typeof sticker.position === 'string') {
      // Positions prédéfinies
      switch (sticker.position) {
        case 'above_head':
          x = this.canvas.width / 2 - sticker.size.width / 2;
          y = 100;
          break;
        case 'bottom_right':
          x = this.canvas.width - sticker.size.width - 20;
          y = this.canvas.height - sticker.size.height - 20;
          break;
      }
    } else {
      x = sticker.position.x * this.canvas.width;
      y = sticker.position.y * this.canvas.height;
    }

    // Animation bounce si configurée
    if (sticker.animation === 'bounce_on_beat') {
      const bounce = Math.sin(timestamp * 10) * 10;
      y += bounce;
    }

    this.ctx.drawImage(img, x, y, sticker.size.width, sticker.size.height);
    this.ctx.restore();
  }

  private renderTextOverlay(text: any, timestamp: number): void {
    this.ctx.save();

    this.ctx.fillStyle = text.color || '#FFFFFF';
    this.ctx.font = `${text.font?.weight || 'bold'} ${text.font?.size || 36}px ${text.font?.family || 'Arial'}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    let x = this.canvas.width / 2;
    let y = this.canvas.height * 0.85;

    if (typeof text.position !== 'string') {
      x = text.position.x * this.canvas.width;
      y = text.position.y * this.canvas.height;
    }

    // Ombre
    if (text.shadow) {
      this.ctx.shadowColor = text.shadow.color;
      this.ctx.shadowBlur = text.shadow.blur;
      this.ctx.shadowOffsetX = text.shadow.offsetX;
      this.ctx.shadowOffsetY = text.shadow.offsetY;
    }

    // Outline
    if (text.outline) {
      this.ctx.strokeStyle = text.outline.color;
      this.ctx.lineWidth = text.outline.width;
      this.ctx.strokeText(text.content, x, y);
    }

    this.ctx.fillText(text.content, x, y);
    this.ctx.restore();
  }

  private renderCTA(cta: any, timestamp: number): void {
    if (timestamp < cta.startTime) return;
    if (cta.endTime && timestamp > cta.endTime) return;

    this.ctx.save();

    // Position
    const x = this.canvas.width / 2;
    const y = this.canvas.height - 100;

    // Background button
    this.ctx.fillStyle = cta.style?.backgroundColor || 'rgba(255, 50, 50, 0.9)';
    this.ctx.beginPath();
    this.ctx.roundRect(x - 150, y - 30, 300, 60, 30);
    this.ctx.fill();

    // Text
    this.ctx.fillStyle = cta.style?.textColor || '#FFFFFF';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(cta.text, x, y);

    this.ctx.restore();
  }

  // ==========================================
  // UTILS
  // ==========================================

  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private async loadLUT(lutName: string): Promise<void> {
    // Placeholder - implémentation complète nécessiterait un parser de LUT .cube
    console.log(`Loading LUT: ${lutName}`);
  }

  // ==========================================
  // EXPORT
  // ==========================================

  getCanvas(): OffscreenCanvas {
    return this.canvas;
  }

  getContext(): OffscreenCanvasRenderingContext2D {
    return this.ctx;
  }

  getCurrentTemplate(): KuaishouTemplateConfig | null {
    return this.currentTemplate;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  destroy(): void {
    // Cleanup
    this.templateSegments.forEach(video => {
      video.pause();
      video.src = '';
    });
    this.templateSegments.clear();
    this.userSegments.clear();
    this.assetCache.clear();
    this.lutCache.clear();

    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

export default KuaishouTemplateEngine;
