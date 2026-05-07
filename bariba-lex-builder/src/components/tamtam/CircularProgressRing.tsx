import React from 'react';

interface CircularProgressRingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  progress,
  size = 64,
  strokeWidth = 3,
  color = '#10B981',
  backgroundColor = 'rgba(255,255,255,0.3)',
  children
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  
  // Gradient color based on progress
  const progressColor = progress < 0.3 
    ? '#10B981' // emerald
    : progress < 0.7 
      ? '#3B82F6' // blue
      : '#EF4444'; // red (near end)
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color || progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s ease'
          }}
        />
      </svg>
      
      {/* Center content */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{ padding: strokeWidth }}
      >
        {children}
      </div>
    </div>
  );
};
