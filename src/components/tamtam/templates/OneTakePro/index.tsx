// src/components/tamtam/templates/OneTakePro/index.tsx

import React, { useEffect, useRef, useState } from 'react';
import { AssetManager } from './AssetManager';
import { EffectsRenderer, Beat } from './EffectsRenderer';

interface OneTakeProProps {
  audioUrl: string;
  userText?: string;
  userName?: string;
  onComplete?: (videoBlob: Blob) => void;
  onError?: (error: Error) => void;
}

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
  
  // States
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Beat detection state
  const [beats, setBeats] = useState<Beat[]>([]);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(0);
  
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
  const initializeTemplate = async () => {
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
      }
      setProgress(60);
      
      // 4. Analyser audio pour détecter beats
      console.log('🎵 Analyse audio...');
      const detectedBeats = await analyzeBeatsSample(audioUrl);
      setBeats(detectedBeats);
      setProgress(80);
      
      // 5. Optionnel : Ajouter effets continus
      // await effectsRenderer.addContinuousSmoke();
      
      setProgress(100);
      setLoading(false);
      
      console.log('✅ Template One-Take Pro initialisé');
      
    } catch (err) {
      console.error('❌ Erreur initialisation:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      setLoading(false);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  };
  
  /**
   * Analyse audio simplifiée pour détecter beats
   * NOTE: Ceci est une version simplifiée. Pour une vraie détection,
   * utilisez Web Audio API avec analyse spectrale.
   */
  const analyzeBeatsSample = async (url: string): Promise<Beat[]> => {
    // Pour l'exemple, on génère des beats synthétiques
    // Dans votre vraie implémentation, utilisez Web Audio API
    
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        const sampleBeats: Beat[] = [];
        
        // Générer beats tous les 0.5s avec force variable
        // NOTE: Remplacez ceci par votre vraie logique de détection
        for (let t = 0; t < duration; t += 0.5) {
          sampleBeats.push({
            time: t,
            strength: 0.5 + Math.random() * 0.5 // 0.5 à 1.0
          });
        }
        
        console.log(`✅ ${sampleBeats.length} beats détectés (sample)`);
        resolve(sampleBeats);
      });
      
      audio.addEventListener('error', () => {
        console.warn('⚠️ Impossible de charger audio pour analyse');
        resolve([]); // Retourner tableau vide en cas d'erreur
      });
    });
  };
  
  /**
   * Démarrer la lecture et le rendu
   */
  const startPlayback = () => {
    if (!audioRef.current || !canvasRef.current) return;
    
    setIsPlaying(true);
    audioRef.current.play();
    
    const startTime = Date.now();
    setCurrentBeatIndex(0);
    
    // Démarrer render loop
    startRenderLoop(startTime);
  };
  
  /**
   * Loop de rendu principal
   */
  const startRenderLoop = (startTime: number) => {
    if (!canvasRef.current || !effectsRendererRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      // Calculer temps actuel
      const currentTime = (Date.now() - startTime) / 1000;
      
      // 1. Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      
      // 2. Dessiner contenu de base
      drawBaseContent(ctx);
      
      // 3. Checker et déclencher beats
      if (beats.length > 0 && currentBeatIndex < beats.length) {
        const currentBeat = beats[currentBeatIndex];
        
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
          setCurrentBeatIndex(prev => prev + 1);
        }
      }
      
      // 4. Render tous les effets visuels
      effectsRendererRef.current?.render();
      
      // 5. Continuer la boucle
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };
    
    render();
  };
  
  /**
   * Dessiner le contenu de base (texte, logo, etc.)
   */
  const drawBaseContent = (ctx: CanvasRenderingContext2D) => {
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
  };
  
  /**
   * Arrêter la lecture
   */
  const stopPlayback = () => {
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setCurrentBeatIndex(0);
  };
  
  /**
   * Export vidéo
   */
  const exportVideo = async () => {
    if (!canvasRef.current) return;
    
    try {
      console.log('📹 Début export vidéo...');
      
      // Utiliser MediaRecorder pour capturer le canvas
      const stream = canvasRef.current.captureStream(30); // 30 FPS
      
      // Ajouter piste audio
      if (audioRef.current) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audioRef.current);
        const dest = audioContext.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioContext.destination);
        
        stream.addTrack(dest.stream.getAudioTracks()[0]);
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
  };
  
  // Render
  return (
    <div className="one-take-pro-container">
      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <p className="loading-text">
              Chargement des effets visuels... {progress}%
            </p>
            <div className="loading-bar">
              <div 
                className="loading-progress" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="error-message">
          <p>❌ Erreur : {error}</p>
          <button onClick={initializeTemplate}>Réessayer</button>
        </div>
      )}
      
      {/* Canvas principal */}
      <canvas
        ref={canvasRef}
        width={1080}
        height={1920}
        className="template-canvas"
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
        <div className="controls">
          <button 
            onClick={isPlaying ? stopPlayback : startPlayback}
            className="control-button"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          
          <button 
            onClick={exportVideo}
            className="control-button export-button"
            disabled={isPlaying}
          >
            📹 Export Vidéo
          </button>
          
          <div className="info">
            <p>Beats détectés : {beats.length}</p>
            <p>Beat actuel : {currentBeatIndex} / {beats.length}</p>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .one-take-pro-container {
          position: relative;
          width: 100%;
          height: 100vh;
          background: #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        
        .template-canvas {
          max-width: 100%;
          max-height: 80vh;
          border: 2px solid #333;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .loading-content {
          text-align: center;
          color: #fff;
        }
        
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .loading-text {
          font-size: 16px;
          margin-bottom: 15px;
        }
        
        .loading-bar {
          width: 300px;
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
          margin: 0 auto;
        }
        
        .loading-progress {
          height: 100%;
          background: linear-gradient(90deg, #FF6B6B, #4ECDC4);
          transition: width 0.3s ease;
        }
        
        .error-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 0, 0, 0.9);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          z-index: 1000;
        }
        
        .error-message button {
          margin-top: 10px;
          padding: 8px 16px;
          background: white;
          color: red;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .controls {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .control-button {
          padding: 12px 24px;
          font-size: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        
        .control-button:hover {
          transform: scale(1.05);
        }
        
        .control-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .export-button {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .info {
          color: #fff;
          font-size: 14px;
          margin-left: 20px;
        }
        
        .info p {
          margin: 2px 0;
        }
      `}</style>
    </div>
  );
};

export default OneTakePro;
