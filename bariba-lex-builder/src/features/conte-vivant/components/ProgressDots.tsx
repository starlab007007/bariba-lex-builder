interface ProgressDotsProps {
  current: number;
  total: number;
}

export default function ProgressDots({ current, total }: ProgressDotsProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full transition-all duration-300"
          style={{
            backgroundColor:
              i < current ? 'rgba(255,255,255,0.9)' :
              i === current ? '#F5A623' :
              'rgba(255,255,255,0.25)',
            boxShadow: i === current ? '0 0 6px #F5A623' : 'none',
            transform: i === current ? 'scale(1.3)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  );
}
