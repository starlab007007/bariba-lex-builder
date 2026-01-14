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
    fontSize: 14,
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
};

// CSS keyframes for spinner (injected once)
const spinnerKeyframes = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export const OneTakePro: React.FC<OneTakeProProps> = ({
  audioUrl,
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
  
  // States
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
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
      
      // 1. Créer AssetManager
      console.log('📦 Création AssetManager...');
      const assetManager = new AssetManager();
      assetManagerRef.current = assetManager;
      setProgress(20);
      
      // 2. Précharger assets essentiels
      console.log('⏳ Préchargement assets...');
      await assetManager.preloadEssentials();
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
        console.log('🔥 Ajout effets continus (smoke, fire)...');
        await effectsRenderer.addContinuousSmoke().catch(err => console.warn('Smoke failed:', err));
        await effectsRenderer.addContinuousFire().catch(err => console.warn('Fire failed:', err));
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
   * Idle render loop - shows effects preview without audio
   */
  const startIdleRenderLoop = useCallback(() => {
    if (!canvasRef.current || !effectsRendererRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const idleRender = () => {
      if (isPlayingRef.current || !canvasRef.current) return;
      
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw gradient background
      const gradient = ctx.createRadialGradient(
        canvasRef.current.width / 2, canvasRef.current.height / 3, 0,
        canvasRef.current.width / 2, canvasRef.current.height / 3, canvasRef.current.height
      );
      gradient.addColorStop(0, 'rgba(255, 100, 50, 0.15)');
      gradient.addColorStop(0.5, 'rgba(100, 50, 20, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw base content (inline)
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      
      // Draw user text
      if (userText) {
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 72px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(userText, width / 2, height / 2);
        ctx.restore();
      }
      
      // Render continuous effects (smoke, fire)
      effectsRendererRef.current?.render();
      
      // Continue loop if not playing
      animationFrameRef.current = requestAnimationFrame(idleRender);
    };
    
    idleRender();
  }, [userText]);
  
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
      
      // 2. Dessiner contenu de base
      drawBaseContent(ctx);
      
      // 3. Checker et déclencher beats
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
      
      // 4. Render tous les effets visuels
      effectsRendererRef.current?.render();
      
      // 5. Continuer la boucle
      animationFrameRef.current = requestAnimationFrame(render);
    };
    
    render();
  }, [beats]);
  
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
  }, []);
  
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
          
          <div style={styles.info}>
            <p style={{ margin: '2px 0' }}>Beats détectés : {beats.length}</p>
            <p style={{ margin: '2px 0' }}>Beat actuel : {currentBeatIndexRef.current} / {beats.length}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OneTakePro;
