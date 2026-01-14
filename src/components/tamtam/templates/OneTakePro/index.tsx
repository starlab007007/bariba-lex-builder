// src/components/tamtam/templates/OneTakePro/index.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AssetManager } from './AssetManager';
import { EffectsRenderer, Beat } from './EffectsRenderer';

interface OneTakeProProps {
  audioUrl: string;
  /** caméra existante du FullscreenCreator (stream déjà prêt) */
  videoRef?: React.RefObject<HTMLVideoElement>;
  /** miroir selfie */
  mirror?: boolean;
  userText?: string;
  userName?: string;
  onComplete?: (videoBlob: Blob) => void;
  onError?: (error: Error) => void;
}

// Inline styles (compatible Vite/React - no styled-jsx)
const styles = {
  container: {
    position: 'fixed' as const,
    inset: 0,
    width: '100%',
    height: '100vh',
    background: '#000',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  canvas: {
    maxWidth: '100%',
    maxHeight: '80vh',
    border: '2px solid #333',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    textAlign: 'center' as const,
    color: '#fff',
  },
  loadingSpinner: {
    width: 50,
    height: 50,
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  loadingText: {
    fontSize: 16,
    marginBottom: 15,
    color: '#fff',
  },
  loadingBar: {
    width: 300,
    height: 4,
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden' as const,
    margin: '0 auto',
  },
  loadingProgress: {
    height: '100%',
    background: 'linear-gradient(90deg, #FF6B6B, #4ECDC4)',
    transition: 'width 0.3s ease',
  },
  errorMessage: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(255, 0, 0, 0.9)',
    color: 'white',
    padding: 20,
    borderRadius: 8,
    textAlign: 'center' as const,
    zIndex: 1000,
  },
  errorButton: {
    marginTop: 10,
    padding: '8px 16px',
    background: 'white',
    color: 'red',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  controls: {
    marginTop: 20,
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  controlButton: {
    padding: '12px 24px',
    fontSize: 16,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  exportButton: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  info: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 20,
  },
  closeButton: {
    position: 'absolute' as const,
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    background: 'rgba(0, 0, 0, 0.6)',
    border: 'none',
    borderRadius: '50%',
    color: '#fff',
    fontSize: 24,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
  debugOverlay: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    background: 'rgba(0,0,0,0.7)',
    color: '#0f0',
    padding: 8,
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'monospace',
    maxWidth: 280,
    zIndex: 1002,
  },
  autoplayOverlay: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#FFD700',
    padding: 20,
    borderRadius: 12,
    textAlign: 'center' as const,
    zIndex: 1003,
    cursor: 'pointer',
  },
};

// CSS keyframes for spinner (injected once)
const spinnerKeyframes = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const OneTakePro: React.FC<OneTakeProProps> = ({
  audioUrl,
  videoRef,
  mirror = false,
  userText = 'TAM-TAM',
  userName,
  onComplete,
  onError
}) => {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>();
  const assetManagerRef = useRef<AssetManager>();
  const effectsRendererRef = useRef<EffectsRenderer>();
  const isPlayingRef = useRef(false);
  const lastIdleEffectTimeRef = useRef(0);
  
  // States
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    assetsLoaded: number;
    assetsTotal: number;
    continuousEffects: number;
    activeEffects: number;
    videoErrors: string[];
  }>({ assetsLoaded: 0, assetsTotal: 0, continuousEffects: 0, activeEffects: 0, videoErrors: [] });
  
  // Beat detection state
  const [beats, setBeats] = useState<Beat[]>([]);
  const currentBeatIndexRef = useRef(0);
  
  /**
   * Inject keyframes CSS
   */
  useEffect(() => {
    const styleId = 'one-take-pro-keyframes';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = spinnerKeyframes;
      document.head.appendChild(style);
    }
  }, []);
  
  /**
   * Initialisation du template
   */
  useEffect(() => {
    initializeTemplate();
    
    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      effectsRendererRef.current?.clear();
    };
  }, [audioUrl]);
  
  /**
   * Initialiser le template
   */
  const initializeTemplate = useCallback(async () => {
    try {
      setLoading(true);
      setProgress(10);
      setAutoplayBlocked(false);
      
      // 1. Créer AssetManager
      console.log('📦 Création AssetManager...');
      const assetManager = new AssetManager();
      assetManagerRef.current = assetManager;
      setProgress(20);
      
      // 2. Précharger assets essentiels
      console.log('⏳ Préchargement assets...');
      await assetManager.preloadEssentials();
      const stats = assetManager.getStats();
      setDebugInfo(prev => ({ ...prev, assetsLoaded: stats.loaded, assetsTotal: stats.total }));
      setProgress(40);
      
      // 3. Créer EffectsRenderer
      if (canvasRef.current) {
        console.log('🎨 Création EffectsRenderer...');
        const effectsRenderer = new EffectsRenderer(
          canvasRef.current,
          assetManager
        );
        effectsRendererRef.current = effectsRenderer;
        
        // ✅ CRITICAL: Add continuous background effects (smoke + fire)
        console.log('🔥 Ajout effets continus (smoke, fire, light-leaks)...');
        
        // Try smoke
        const smokeResult = await effectsRenderer.addContinuousSmoke()
          .then(() => ({ ok: true, error: '' }))
          .catch((err: Error) => ({ ok: false, error: `Smoke: ${err.message}` }));
        
        // Try fire
        const fireResult = await effectsRenderer.addContinuousFire()
          .then(() => ({ ok: true, error: '' }))
          .catch((err: Error) => ({ ok: false, error: `Fire: ${err.message}` }));
        
        // Collect errors
        const videoErrors: string[] = [];
        if (!smokeResult.ok) videoErrors.push(smokeResult.error);
        if (!fireResult.ok) videoErrors.push(fireResult.error);
        
        // Check if autoplay was blocked
        if (effectsRenderer.isAutoplayBlocked()) {
          setAutoplayBlocked(true);
        }
        
        setDebugInfo(prev => ({
          ...prev,
          videoErrors,
          continuousEffects: effectsRenderer.getStats().continuous,
        }));
      }
      setProgress(60);
      
      // 4. Analyser audio pour détecter beats
      console.log('🎵 Analyse audio...');
      const detectedBeats = await analyzeBeatsSample(audioUrl);
      setBeats(detectedBeats);
      setProgress(80);
      
      // ✅ Start idle render loop for preview (before user clicks Play)
      if (canvasRef.current && effectsRendererRef.current) {
        console.log('🎬 Démarrage rendu preview...');
        startIdleRenderLoop();
      }
      
      setProgress(100);
      setLoading(false);
      
      console.log('✅ Template One-Take Pro initialisé avec effets visuels');
      
    } catch (err) {
      console.error('❌ Erreur initialisation:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      setLoading(false);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  }, [audioUrl, onError]);
  
  /**
   * Analyse audio simplifiée pour détecter beats
   */
  const analyzeBeatsSample = useCallback(async (url: string): Promise<Beat[]> => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        const sampleBeats: Beat[] = [];
        
        // Générer beats tous les 0.5s avec force variable
        for (let t = 0; t < duration; t += 0.5) {
          sampleBeats.push({
            time: t,
            strength: 0.5 + Math.random() * 0.5
          });
        }
        
        console.log(`✅ ${sampleBeats.length} beats détectés (sample)`);
        resolve(sampleBeats);
      });
      
      audio.addEventListener('error', () => {
        console.warn('⚠️ Impossible de charger audio pour analyse');
        resolve([]);
      });
    });
  }, []);
  
  /**
   * Draw camera video as base layer (cover mode)
   */
  const drawCameraLayer = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const cameraVideo = videoRef?.current;
    
    // If camera is available and has data
    if (cameraVideo && cameraVideo.readyState >= 2 && cameraVideo.videoWidth > 0) {
      ctx.save();
      
      // Apply mirror if selfie
      if (mirror) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      
      // Calculate cover dimensions
      const videoAspect = cameraVideo.videoWidth / cameraVideo.videoHeight;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;
      
      if (videoAspect > canvasAspect) {
        // Video is wider - crop sides
        drawHeight = canvas.height;
        drawWidth = drawHeight * videoAspect;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        // Video is taller - crop top/bottom
        drawWidth = canvas.width;
        drawHeight = drawWidth / videoAspect;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }
      
      ctx.drawImage(cameraVideo, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();
    } else {
      // Fallback: draw gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 3, 0,
        canvas.width / 2, canvas.height / 3, canvas.height
      );
      gradient.addColorStop(0, 'rgba(100, 50, 20, 0.4)');
      gradient.addColorStop(0.5, 'rgba(50, 25, 10, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [videoRef, mirror]);
  
  /**
   * Idle render loop - shows effects preview without audio
   */
  const startIdleRenderLoop = useCallback(() => {
    if (!canvasRef.current || !effectsRendererRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const idleRender = () => {
      if (isPlayingRef.current || !canvasRef.current) return;
      
      const now = Date.now();
      
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // 1. Draw camera as base layer
      drawCameraLayer(ctx);
      
      // 2. Add warm glow overlay
      const gradient = ctx.createRadialGradient(
        canvasRef.current.width / 2, canvasRef.current.height * 0.3, 0,
        canvasRef.current.width / 2, canvasRef.current.height * 0.3, canvasRef.current.height
      );
      gradient.addColorStop(0, 'rgba(255, 150, 80, 0.15)');
      gradient.addColorStop(0.5, 'rgba(255, 100, 50, 0.08)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // 3. Draw user text
      if (userText) {
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 72px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(userText, canvasRef.current.width / 2, canvasRef.current.height / 2);
        ctx.restore();
      }
      
      // 4. Periodically trigger lens flares and light leaks for preview
      if (now - lastIdleEffectTimeRef.current > 2000) { // Every 2 seconds
        lastIdleEffectTimeRef.current = now;
        
        // Trigger a lens flare
        effectsRendererRef.current?.triggerLensFlare({ time: 0, strength: 0.7 });
        
        // 40% chance of light leak
        if (Math.random() > 0.6) {
          effectsRendererRef.current?.triggerLightLeak({ time: 0, strength: 0.9 });
        }
      }
      
      // 5. Render continuous effects (smoke, fire) and active effects
      effectsRendererRef.current?.render();
      
      // Update debug info periodically
      if (now % 500 < 20) {
        const stats = effectsRendererRef.current?.getStats();
        if (stats) {
          setDebugInfo(prev => ({
            ...prev,
            continuousEffects: stats.continuous,
            activeEffects: stats.active,
          }));
        }
      }
      
      // Continue loop if not playing
      animationFrameRef.current = requestAnimationFrame(idleRender);
    };
    
    idleRender();
  }, [userText, drawCameraLayer]);
  
  /**
   * Handle user interaction to unlock autoplay
   */
  const handleUnlockAutoplay = useCallback(async () => {
    if (!effectsRendererRef.current) return;
    
    console.log('🔓 Tentative déblocage autoplay...');
    const success = await effectsRendererRef.current.primeOrResumeVideos();
    
    if (success) {
      setAutoplayBlocked(false);
      console.log('✅ Autoplay débloqué');
    } else {
      console.warn('⚠️ Échec déblocage autoplay');
    }
  }, []);
  
  /**
   * Démarrer la lecture et le rendu
   */
  const startPlayback = useCallback(() => {
    if (!audioRef.current || !canvasRef.current) return;
    
    // Stop idle render loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    audioRef.current.play();
    
    const startTime = Date.now();
    currentBeatIndexRef.current = 0;
    
    // Démarrer render loop
    startRenderLoop(startTime);
  }, []);
  
  /**
   * Loop de rendu principal
   */
  const startRenderLoop = useCallback((startTime: number) => {
    if (!canvasRef.current || !effectsRendererRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      if (!isPlayingRef.current || !canvasRef.current) return;
      
      // Calculer temps actuel
      const currentTime = (Date.now() - startTime) / 1000;
      
      // 1. Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // 2. Draw camera as base
      drawCameraLayer(ctx);
      
      // 3. Dessiner contenu de base (text overlay)
      drawBaseContent(ctx);
      
      // 4. Checker et déclencher beats
      if (beats.length > 0 && currentBeatIndexRef.current < beats.length) {
        const currentBeat = beats[currentBeatIndexRef.current];
        
        // Si on est proche du temps du beat (±50ms)
        if (Math.abs(currentBeat.time - currentTime) < 0.05) {
          // Déclencher lens flare sur beats moyens/forts
          if (currentBeat.strength >= 0.6) {
            effectsRendererRef.current?.triggerLensFlare(currentBeat);
          }
          
          // Déclencher light leak sur beats très forts
          if (currentBeat.strength >= 0.8) {
            effectsRendererRef.current?.triggerLightLeak(currentBeat);
          }
          
          // Passer au beat suivant
          currentBeatIndexRef.current += 1;
        }
      }
      
      // 5. Render tous les effets visuels
      effectsRendererRef.current?.render();
      
      // 6. Continuer la boucle
      animationFrameRef.current = requestAnimationFrame(render);
    };
    
    render();
  }, [beats, drawCameraLayer]);
  
  /**
   * Dessiner le contenu de base (texte, logo, etc.)
   */
  const drawBaseContent = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!canvasRef.current) return;
    
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    // Texte principal
    if (userText) {
      ctx.save();
      
      // Style texte
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 72px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Shadow pour effet
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      
      // Dessiner texte
      ctx.fillText(userText, width / 2, height / 2);
      
      ctx.restore();
    }
    
    // Nom utilisateur (si fourni)
    if (userName) {
      ctx.save();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '32px Arial, sans-serif';
      ctx.textAlign = 'center';
      
      ctx.fillText(`@${userName}`, width / 2, height - 100);
      
      ctx.restore();
    }
  }, [userText, userName]);
  
  /**
   * Arrêter la lecture
   */
  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    currentBeatIndexRef.current = 0;
    
    // Restart idle loop
    startIdleRenderLoop();
  }, [startIdleRenderLoop]);
  
  /**
   * Export vidéo
   */
  const exportVideo = useCallback(async () => {
    if (!canvasRef.current) return;
    
    try {
      console.log('📹 Début export vidéo...');
      
      // Utiliser MediaRecorder pour capturer le canvas
      const stream = canvasRef.current.captureStream(30); // 30 FPS
      
      // Ajouter piste audio
      if (audioRef.current) {
        try {
          const audioContext = new AudioContext();
          const source = audioContext.createMediaElementSource(audioRef.current);
          const dest = audioContext.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioContext.destination);
          
          stream.addTrack(dest.stream.getAudioTracks()[0]);
        } catch (audioErr) {
          console.warn('⚠️ Audio non ajouté:', audioErr);
        }
      }
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });
      
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        onComplete?.(blob);
        console.log('✅ Vidéo exportée');
      };
      
      recorder.start();
      startPlayback();
      
      // Arrêter après la durée de l'audio
      if (audioRef.current) {
        audioRef.current.addEventListener('ended', () => {
          recorder.stop();
          stopPlayback();
        }, { once: true });
      }
      
    } catch (err) {
      console.error('❌ Erreur export vidéo:', err);
      onError?.(err instanceof Error ? err : new Error('Erreur export'));
    }
  }, [onComplete, onError, startPlayback, stopPlayback]);
  
  /**
   * Fermer le composant
   */
  const handleClose = useCallback(() => {
    stopPlayback();
    onError?.(new Error('Fermé par l\'utilisateur'));
  }, [stopPlayback, onError]);
  
  // Render
  return (
    <div style={styles.container}>
      {/* Close button */}
      <button style={styles.closeButton} onClick={handleClose}>
        ✕
      </button>
      
      {/* Loading overlay */}
      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <div style={styles.loadingSpinner} />
            <p style={styles.loadingText}>
              Chargement des effets visuels... {progress}%
            </p>
            <div style={styles.loadingBar}>
              <div 
                style={{ ...styles.loadingProgress, width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Autoplay blocked overlay */}
      {autoplayBlocked && !loading && (
        <div style={styles.autoplayOverlay} onClick={handleUnlockAutoplay}>
          <p style={{ fontSize: 18, marginBottom: 10 }}>🎬 Touchez pour activer les effets</p>
          <p style={{ fontSize: 12, color: '#ccc' }}>Les effets vidéo nécessitent votre interaction</p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div style={styles.errorMessage}>
          <p>❌ Erreur : {error}</p>
          <button style={styles.errorButton} onClick={initializeTemplate}>
            Réessayer
          </button>
        </div>
      )}
      
      {/* Canvas principal */}
      <canvas
        ref={canvasRef}
        width={1080}
        height={1920}
        style={styles.canvas}
      />
      
      {/* Audio element (caché) */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        style={{ display: 'none' }}
      />
      
      {/* Contrôles */}
      {!loading && !error && (
        <div style={styles.controls}>
          <button 
            onClick={isPlaying ? stopPlayback : startPlayback}
            style={styles.controlButton}
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          
          <button 
            onClick={exportVideo}
            style={{ ...styles.controlButton, ...styles.exportButton }}
            disabled={isPlaying}
          >
            📹 Export Vidéo
          </button>
        </div>
      )}
      
      {/* Debug overlay */}
      <div style={styles.debugOverlay}>
        <p>📦 Assets: {debugInfo.assetsLoaded}/{debugInfo.assetsTotal}</p>
        <p>🔥 Continus: {debugInfo.continuousEffects} | Actifs: {debugInfo.activeEffects}</p>
        <p>🎵 Beats: {beats.length}</p>
        <p>📹 Caméra: {videoRef?.current?.readyState ?? 'N/A'}</p>
        {debugInfo.videoErrors.length > 0 && (
          <p style={{ color: '#f66' }}>⚠️ {debugInfo.videoErrors.join(', ')}</p>
        )}
      </div>
    </div>
  );
};

export default OneTakePro;
