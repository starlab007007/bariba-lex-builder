interface AudioWaveBarProps {
  isPlaying: boolean;
}

export default function AudioWaveBar({ isPlaying }: AudioWaveBarProps) {
  if (!isPlaying) return null;
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-end gap-1 h-8">
      {[0, 0.15, 0.3, 0.45, 0.6].map((d, i) => (
        <div
          key={i}
          className="w-1 rounded-full"
          style={{
            backgroundColor: '#F5A623',
            animation: `waveHeight 0.8s ease-in-out ${d}s infinite alternate`,
            height: '16px',
          }}
        />
      ))}
      <style>{`
        @keyframes waveHeight {
          0% { height: 6px; }
          100% { height: 24px; }
        }
      `}</style>
    </div>
  );
}
