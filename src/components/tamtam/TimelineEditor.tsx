import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, X, Check, Scissors, Trash2, 
  Zap, Volume2, Layers, ChevronRight, Wand2,
  MonitorPlay, Music2, Type, Sticker, PenTool,
  Sparkles,  LayoutTemplate, Image as ImageIcon,
  Move, Eraser, Undo, Download, Share2
} from 'lucide-react';

// --- TYPES ---
export interface TimelineSegment {
  id: string;
  blob: Blob;
  type: 'video' | 'image';
  duration: number;
  startTime: number;
  endTime: number;
  clipStart: number;
  clipEnd: number;
  speed: number;
  volume: number;
  filter?: string;
}

interface OverlayText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface TimelineEditorProps {
  segments: TimelineSegment[];
  onSegmentsChange: (segments: TimelineSegment[]) => void;
  onClose: () => void;
  onConfirm: (segments: TimelineSegment[]) => void;
  language?: 'fr' | 'ba';
}

// --- DATA: FILTERS & TOOLS ---
const FILTERS = [
  { id: 'none', label: 'Normal', class: '' },
  { id: 'vivid', label: 'Éclatant', class: 'contrast-125 saturate-125' },
  { id: 'vintage', label: 'Rétro', class: 'sepia-[.4] contrast-110' },
  { id: 'bw', label: 'N&B', class: 'grayscale contrast-125' },
];

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  segments,
  onSegmentsChange,
  onClose,
  onConfirm,
  language = 'fr'
}) => {
  // --- ÉTATS PRINCIPAUX ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTimeline, setShowTimeline] = useState(false); // Bascule entre Mode Capture (Screenshot) et Mode Montage
  
  // --- ÉTATS D'ÉDITION (Capture Features) ---
  const [activeFilter, setActiveFilter] = useState('none');
  const [overlays, setOverlays] = useState<OverlayText[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false); // Active le canvas de dessin
  
  // --- REFS ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Calcul de la durée totale
  const totalDuration = segments.reduce((acc, seg) => acc + (seg.endTime - seg.startTime), 0);

  // --- INITIALISATION DU CANVAS (GRAFFITI) ---
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#FE2C55'; // Couleur TikTok Pink
        ctx.lineWidth = 5;
        contextRef.current = ctx;
      }
    }
  }, [drawingMode]); // Re-init quand on active le mode dessin

  // --- LOGIQUE DE LECTURE VIDEO ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  const currentSegment = segments.find(
    seg => currentTime >= seg.startTime && currentTime < seg.endTime
  );

  useEffect(() => {
    if (videoRef.current && currentSegment) {
      const relativeTime = currentTime - currentSegment.startTime + currentSegment.clipStart;
      if (Math.abs(videoRef.current.currentTime - relativeTime) > 0.5) {
        videoRef.current.currentTime = relativeTime;
      }
      videoRef.current.playbackRate = currentSegment.speed;
    }
  }, [currentTime, currentSegment]);

  // --- FONCTIONS "SCREENSHOT UI" ---

  // 1. Ajouter du Texte (Subtitles)
  const handleAddText = () => {
    const text = prompt("Entrez votre texte :");
    if (text) {
      setOverlays([...overlays, { 
        id: Date.now().toString(), 
        text, 
        x: 50, 
        y: 50, 
        color: 'white' 
      }]);
    }
  };

  // 2. Dessiner (Graffiti)
  const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
    if (!drawingMode) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing || !drawingMode) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.lineTo(offsetX, offsetY);
    contextRef.current?.stroke();
  };

  const stopDrawing = () => {
    contextRef.current?.closePath();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (canvasRef.current && contextRef.current) {
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // 3. Filtres (Enhance)
  const toggleFilter = () => {
    const currentIndex = FILTERS.findIndex(f => f.id === activeFilter);
    const nextIndex = (currentIndex + 1) % FILTERS.length;
    setActiveFilter(FILTERS[nextIndex].id);
  };

  // --- RENDU ---
  
  const activeFilterClass = FILTERS.find(f => f.id === activeFilter)?.class || '';

  return (
    <div className="fixed inset-0 z-[60] bg-black font-sans flex flex-col h-[100dvh]">
      
      {/* --- TOP BAR (Comme sur le screenshot) --- */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-12 pb-4 px-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="text-white flex items-center gap-1 opacity-80 hover:opacity-100">
           <span className="text-2xl font-light">×</span> 
           <span className="text-sm font-medium">Record again</span>
        </button>
        
        {/* Music Pill */}
        <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
          <Music2 size={14} className="text-white" />
          <span className="text-white text-xs font-medium">Son original • Incident</span>
          <X size={12} className="text-white/60 ml-2" />
        </div>

        {/* Settings / Menu */}
        <div className="flex flex-col gap-4">
           {/* Placeholder for settings menu top right if needed */}
        </div>
      </div>

      {/* --- MAIN PREVIEW AREA --- */}
      <div className="flex-1 relative overflow-hidden bg-gray-900 rounded-b-xl">
        
        {/* 1. Video Layer */}
        {currentSegment ? (
          <video
            ref={videoRef}
            src={URL.createObjectURL(currentSegment.blob)}
            className={`w-full h-full object-cover transition-all duration-300 ${activeFilterClass}`}
            onClick={() => setIsPlaying(!isPlaying)}
            playsInline
            loop={false}
            muted={false} // Gérer le son selon besoin
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Aucun média
          </div>
        )}

        {/* 2. Canvas Layer (Graffiti) */}
        {drawingMode && (
           <canvas
             ref={canvasRef}
             onMouseDown={startDrawing}
             onMouseMove={draw}
             onMouseUp={stopDrawing}
             onMouseLeave={stopDrawing}
             className="absolute inset-0 z-20 cursor-crosshair touch-none"
           />
        )}

        {/* 3. Text Overlays Layer */}
        {overlays.map((ov) => (
          <div
            key={ov.id}
            style={{ top: `${ov.y}%`, left: `${ov.x}%`, transform: 'translate(-50%, -50%)' }}
            className="absolute z-20 bg-black/50 px-3 py-1 rounded text-white font-bold text-xl select-none cursor-move border border-white/20 backdrop-blur-sm"
            // Note: Le drag & drop complet nécessiterait plus de logique, simplifié ici
          >
            {ov.text}
          </div>
        ))}

        {/* 4. Play/Pause Overlay Centré */}
        {!isPlaying && !drawingMode && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Play className="w-16 h-16 text-white/80 fill-white/20" />
          </div>
        )}

        {/* --- RIGHT SIDEBAR TOOLS (Comme sur le screenshot) --- */}
        <div className="absolute right-2 top-24 bottom-32 flex flex-col gap-6 z-30 items-center">
          
          <RightToolButton 
            icon={Sparkles} 
            label="Enhance" 
            active={activeFilter !== 'none'}
            onClick={toggleFilter} 
          />
          
          <RightToolButton 
            icon={LayoutTemplate} 
            label="Template" 
            onClick={() => alert("Ouvre la bibliothèque de templates")}
          />
          
          <RightToolButton 
            icon={Scissors} 
            label="Montage" 
            active={showTimeline}
            onClick={() => setShowTimeline(!showTimeline)} 
            // C'est le pont vers votre ancien éditeur
          />
          
          <RightToolButton 
            icon={Wand2} 
            label="Effects" 
          />
          
          <RightToolButton 
            icon={Sticker} 
            label="Stickers" 
            onClick={() => alert("Ouvre le panneau stickers")}
          />
          
          <RightToolButton 
            icon={Type} 
            label="Subtitles" 
            onClick={handleAddText} 
          />

          <RightToolButton 
            icon={PenTool} 
            label="Graffiti" 
            active={drawingMode}
            onClick={() => setDrawingMode(!drawingMode)} 
          />

          {drawingMode && (
            <button 
              onClick={clearCanvas}
              className="mt-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-in zoom-in"
            >
              <Eraser size={14} className="text-white" />
            </button>
          )}

          <div className="mt-auto">
             <button className="bg-gray-800/80 p-2 rounded-full rotate-180">
                <ChevronRight size={20} className="text-white" />
             </button>
          </div>
        </div>

        {/* --- TIMELINE OVERLAY (Si activé via "Montage") --- */}
        {showTimeline && (
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-black/90 border-t border-gray-800 animate-in slide-in-from-bottom z-40">
            <div className="flex justify-between p-2 border-b border-gray-800">
               <span className="text-white text-xs font-bold">Timeline Avancée</span>
               <button onClick={() => setShowTimeline(false)}><X size={14} className="text-white"/></button>
            </div>
            {/* ... Insérer ici votre logique de Timeline (Track, Playhead, Split) ... */}
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
               [Interface Timeline simplifiée ici pour découper les clips]
            </div>
          </div>
        )}
      </div>

      {/* --- BOTTOM BAR (Footer Screenshot) --- */}
      <div className="h-20 bg-black flex items-center justify-between px-4 z-30 pb-4">
         {/* Bouton de gauche (Post/Story) */}
         <div className="flex flex-col items-center justify-center w-1/3 opacity-60 hover:opacity-100 transition">
             <div className="bg-gray-800 p-2 rounded-lg mb-1">
               <Download size={20} className="text-white" />
             </div>
             <span className="text-white text-[10px] font-medium">Drafts</span>
         </div>

         {/* Indicateur de mode (Photo/Video/Text) */}
         <div className="flex-1 flex justify-center gap-6">
             <button className="text-gray-500 text-sm font-bold hover:text-white transition">Story</button>
             <button className="text-white text-sm font-bold border-b-2 border-white pb-1">Video</button>
             <button className="text-gray-500 text-sm font-bold hover:text-white transition">Photo</button>
         </div>

         {/* Bouton NEXT (Rose) */}
         <div className="w-1/3 flex justify-end">
            <button 
              onClick={() => onConfirm(segments)}
              className="bg-[#FE2C55] hover:bg-[#e02548] text-white px-6 py-3 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg transform active:scale-95 transition-all"
            >
              Next <ChevronRight size={18} />
            </button>
         </div>
      </div>
    </div>
  );
};

// --- COMPOSANT BOUTON VERTICAL (Sidebar) ---
const RightToolButton = ({ icon: Icon, label, onClick, active }: any) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-1 group relative"
  >
    {active && (
      <div className="absolute -left-2 top-2 w-1 h-1 bg-[#FE2C55] rounded-full" />
    )}
    <div className={`p-1 drop-shadow-md transition-all ${active ? 'text-[#FE2C55]' : 'text-white'}`}>
       <Icon size={26} strokeWidth={2} style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.5))' }} />
    </div>
    <span className="text-white text-[10px] font-medium drop-shadow-md shadow-black">
      {label}
    </span>
  </button>
);

export default TimelineEditor;
