import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, X, Check, Scissors, Trash2, 
  Zap, Volume2, Layers, ChevronRight, Wand2,
  MonitorPlay
} from 'lucide-react';

// --- TYPES ---
export interface TimelineSegment {
  id: string;
  blob: Blob;
  type: 'video' | 'image';
  duration: number;   // Durée totale du clip original
  startTime: number;  // Point de début dans la timeline globale
  endTime: number;    // Point de fin dans la timeline globale
  clipStart: number;  // Point de début interne (trim)
  clipEnd: number;    // Point de fin interne (trim)
  speed: number;
  volume: number;
  filter?: string;    // Pour les templates
}

interface TimelineEditorProps {
  segments: TimelineSegment[];
  onSegmentsChange: (segments: TimelineSegment[]) => void;
  onClose: () => void;
  onConfirm: (segments: TimelineSegment[]) => void;
  language?: 'fr' | 'ba'; // Français ou Bambara
}

// --- DATA: TEMPLATES ---
const TEMPLATES = [
  { id: 'none', label: 'Normal', color: 'bg-gray-700' },
  { id: 'vlog', label: 'Vlog Daily', color: 'bg-blue-500', speed: 1.0 },
  { id: 'action', label: 'Action ⚡', color: 'bg-red-500', speed: 1.5 },
  { id: 'vintage', label: 'Retro 80s', color: 'bg-yellow-600', filter: 'sepia' },
  { id: 'cinematic', label: 'Cinema', color: 'bg-purple-600', filter: 'contrast' },
];

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  segments,
  onSegmentsChange,
  onClose,
  onConfirm,
  language = 'fr'
}) => {
  // --- ETATS ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null); // 'template', 'speed', 'volume'
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Calcul de la durée totale
  const totalDuration = segments.reduce((acc, seg) => acc + (seg.endTime - seg.startTime), 0);

  // --- LOGIQUE DE LECTURE ---
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

  // Sync Video Element avec le segment courant
  const currentSegment = segments.find(
    seg => currentTime >= seg.startTime && currentTime < seg.endTime
  );

  useEffect(() => {
    if (videoRef.current && currentSegment) {
      // Simuler le changement de source (dans une vraie app, gérer le buffer est complexe)
      // Ici on assume que le blob est chargé
      const relativeTime = currentTime - currentSegment.startTime + currentSegment.clipStart;
      if (Math.abs(videoRef.current.currentTime - relativeTime) > 0.5) {
        videoRef.current.currentTime = relativeTime;
      }
      videoRef.current.playbackRate = currentSegment.speed;
    }
  }, [currentTime, currentSegment]);

  // --- ACTIONS D'EDITION ---

  // 1. SPLIT (Découper)
  const handleSplit = () => {
    if (!selectedSegmentId) return;
    
    const index = segments.findIndex(s => s.id === selectedSegmentId);
    if (index === -1) return;
    
    const seg = segments[index];
    const splitPoint = currentTime - seg.startTime; // Temps relatif dans le segment

    // Sécurité: ne pas couper trop près des bords
    if (splitPoint < 0.5 || splitPoint > (seg.endTime - seg.startTime - 0.5)) return;

    const newSeg1: TimelineSegment = {
      ...seg,
      id: seg.id + '_a',
      endTime: seg.startTime + splitPoint,
      clipEnd: seg.clipStart + splitPoint
    };

    const newSeg2: TimelineSegment = {
      ...seg,
      id: seg.id + '_b',
      startTime: seg.startTime + splitPoint,
      clipStart: seg.clipStart + splitPoint
    };

    const newSegments = [...segments];
    newSegments.splice(index, 1, newSeg1, newSeg2);
    
    // Recalculer les temps absolus pour la suite
    recalculateTimeline(newSegments);
  };

  // 2. DELETE (Supprimer)
  const handleDelete = () => {
    if (!selectedSegmentId) return;
    const newSegments = segments.filter(s => s.id !== selectedSegmentId);
    recalculateTimeline(newSegments);
    setSelectedSegmentId(null);
  };

  // 3. APPLY TEMPLATE
  const handleApplyTemplate = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    // Appliquer à TOUS les segments ou seulement le sélectionné ?
    // Ici : Appliquer au segment sélectionné pour la démo
    if (selectedSegmentId) {
      const newSegments = segments.map(s => {
        if (s.id === selectedSegmentId) {
          return { 
            ...s, 
            filter: templateId, 
            speed: template.speed || s.speed 
          };
        }
        return s;
      });
      recalculateTimeline(newSegments);
    }
  };

  // Utilitaire pour remettre d'équerre les start/end times
  const recalculateTimeline = (segs: TimelineSegment[]) => {
    let cursor = 0;
    const updated = segs.map(s => {
      const duration = (s.clipEnd - s.clipStart) / s.speed; // Ajustement vitesse
      const newSeg = { ...s, startTime: cursor, endTime: cursor + duration };
      cursor += duration;
      return newSeg;
    });
    onSegmentsChange(updated);
  };

  // --- RENDER HELPERS ---
  const getPreviewUrl = (blob: Blob) => URL.createObjectURL(blob);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col font-sans animate-in slide-in-from-bottom duration-300">
      
      {/* --- HEADER --- */}
      <div className="h-14 flex items-center justify-between px-4 bg-gray-900 border-b border-gray-800">
        <button onClick={onClose} className="text-white p-2">
          <X size={24} />
        </button>
        <span className="text-white font-bold text-sm">
          {language === 'ba' ? 'Video Kalala' : 'Éditeur Pro'}
        </span>
        <button 
          onClick={() => onConfirm(segments)} 
          className="bg-[#FE2C55] text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1"
        >
          <Check size={16} /> {language === 'ba' ? 'A to' : 'Sauver'}
        </button>
      </div>

      {/* --- PREVIEW AREA --- */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {currentSegment ? (
          <video
            ref={videoRef}
            src={getPreviewUrl(currentSegment.blob)}
            className={`max-h-full max-w-full object-contain transition-all duration-300 ${
              currentSegment.filter === 'vintage' ? 'sepia-[.6] contrast-125' : ''
            } ${
              currentSegment.filter === 'cinematic' ? 'contrast-125 saturate-150' : ''
            }`}
            onClick={() => setIsPlaying(!isPlaying)}
          />
        ) : (
          <div className="text-gray-500">Aucun segment</div>
        )}
        
        {/* Play Overlay */}
        {!isPlaying && (
          <button 
            onClick={() => setIsPlaying(true)}
            className="absolute bg-white/20 backdrop-blur-sm p-4 rounded-full"
          >
            <Play className="w-8 h-8 text-white fill-current" />
          </button>
        )}
      </div>

      {/* --- TIMELINE AREA --- */}
      <div className="h-auto bg-gray-900 border-t border-gray-800 flex flex-col">
        
        {/* Time Indicator */}
        <div className="flex justify-center py-2 text-xs text-gray-400 font-mono">
          {Math.floor(currentTime)}s / {Math.floor(totalDuration)}s
        </div>

        {/* Tracks Container */}
        <div className="relative h-24 overflow-x-auto overflow-y-hidden whitespace-nowrap px-[50vw] flex items-center gap-1" ref={timelineRef}>
          {/* Central Playhead Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white z-20 transform -translate-x-1/2 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>

          {segments.map((seg) => {
            const isActive = selectedSegmentId === seg.id;
            const width = (seg.endTime - seg.startTime) * 20; // 20px par seconde
            return (
              <div
                key={seg.id}
                onClick={() => setSelectedSegmentId(seg.id)}
                style={{ width: `${width}px` }}
                className={`
                  relative h-16 rounded-md overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all
                  ${isActive ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-transparent'}
                  ${seg.filter === 'vlog' ? 'bg-blue-900' : 'bg-gray-800'}
                `}
              >
                {/* Thumbnails placeholder */}
                <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                   <MonitorPlay size={16} />
                </div>
                
                {/* Info Label */}
                <div className="absolute bottom-1 left-1 bg-black/50 px-1 rounded text-[10px] text-white">
                  {seg.type}
                </div>
                {seg.filter && seg.filter !== 'none' && (
                  <div className="absolute top-1 right-1 bg-purple-500 px-1 rounded text-[9px] text-white font-bold">
                    ★
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* --- TOOLS PANEL (Dynamic) --- */}
        <div className="h-40 bg-gray-950 px-4 py-4">
          
          {/* 1. MAIN TOOLBAR (Visible if no tool selected) */}
          {!activeTool && (
            <div className="flex justify-between items-start gap-4 overflow-x-auto pb-2">
              <ToolButton 
                icon={Scissors} label="Découper" 
                onClick={handleSplit} disabled={!selectedSegmentId} 
              />
              <ToolButton 
                icon={Wand2} label="Templates" 
                onClick={() => setActiveTool('template')} 
                active={activeTool === 'template'}
              />
              <ToolButton 
                icon={Zap} label="Vitesse" 
                onClick={() => setActiveTool('speed')} 
                disabled={!selectedSegmentId}
              />
              <ToolButton 
                icon={Volume2} label="Volume" 
                onClick={() => setActiveTool('volume')} 
                disabled={!selectedSegmentId}
              />
               <ToolButton 
                icon={Trash2} label="Supprimer" 
                onClick={handleDelete} 
                danger disabled={!selectedSegmentId} 
              />
            </div>
          )}

          {/* 2. TEMPLATE SUB-MENU */}
          {activeTool === 'template' && (
            <div className="animate-in slide-in-from-bottom fade-in duration-200">
               <div className="flex items-center justify-between mb-3">
                 <span className="text-white text-sm font-bold">Choisir un Style</span>
                 <button onClick={() => setActiveTool(null)} className="text-gray-400 text-xs">Fermer</button>
               </div>
               <div className="flex gap-3 overflow-x-auto pb-2">
                 {TEMPLATES.map(t => (
                   <button
                    key={t.id}
                    onClick={() => handleApplyTemplate(t.id)}
                    className="flex flex-col items-center gap-2 min-w-[70px]"
                   >
                     <div className={`w-14 h-14 rounded-lg ${t.color} flex items-center justify-center shadow-lg border-2 ${currentSegment?.filter === t.id ? 'border-white' : 'border-transparent'}`}>
                        <Wand2 className="text-white w-6 h-6" />
                     </div>
                     <span className="text-gray-300 text-xs">{t.label}</span>
                   </button>
                 ))}
               </div>
            </div>
          )}

           {/* 3. SPEED SUB-MENU (Exemple) */}
           {activeTool === 'speed' && (
             <div className="flex items-center justify-center h-full gap-4">
               {[0.5, 1.0, 1.5, 2.0].map(sp => (
                 <button 
                  key={sp}
                  onClick={() => {
                    // Logic to update speed
                    setActiveTool(null);
                  }}
                  className="bg-gray-800 text-white w-12 h-12 rounded-full font-bold text-sm hover:bg-yellow-500 hover:text-black"
                 >
                   {sp}x
                 </button>
               ))}
               <button onClick={() => setActiveTool(null)} className="absolute right-4 text-gray-400">
                 <X size={20}/>
               </button>
             </div>
           )}

        </div>
      </div>
    </div>
  );
};

// --- PETIT COMPOSANT BOUTON ---
const ToolButton = ({ icon: Icon, label, onClick, disabled, danger, active }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`
      flex flex-col items-center gap-1.5 min-w-[60px] group
      ${disabled ? 'opacity-30 grayscale' : 'opacity-100'}
    `}
  >
    <div className={`
      w-10 h-10 rounded-full flex items-center justify-center transition
      ${active ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-white'}
      ${danger ? 'group-hover:bg-red-500' : 'group-hover:bg-gray-700'}
    `}>
      <Icon size={18} />
    </div>
    <span className={`text-[10px] ${active ? 'text-yellow-400' : 'text-gray-400'}`}>
      {label}
    </span>
  </button>
);

export default TimelineEditor;
