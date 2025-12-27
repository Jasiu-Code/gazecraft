import React, { useEffect, useState } from 'react';
import { GameSettings } from '../types';

interface GazeCursorProps {
  position: { x: number; y: number };
  isDwelling: boolean;
  progress: number; // 0 to 1
  settings: GameSettings;
}

export const GazeCursor: React.FC<GazeCursorProps> = ({ position, isDwelling, progress, settings }) => {
  // Use simple spring-like smoothing for cursor visual if needed, 
  // but for eye-tracking accuracy, raw position is often better to reduce lag feeling.
  
  const size = settings.cursorSize;
  const radius = size / 2;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div
      className="pointer-events-none fixed z-50 transition-transform duration-75 ease-out"
      style={{
        left: 0,
        top: 0,
        transform: `translate(${position.x - size / 2}px, ${position.y - size / 2}px)`,
        width: size,
        height: size,
      }}
    >
      {/* Outer Ring (Progress) */}
      <svg
        height={size}
        width={size}
        className={`transform -rotate-90 transition-colors duration-200 ${isDwelling ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'text-white/50'}`}
      >
        <circle
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{
            strokeDasharray: circumference + ' ' + circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.1s linear'
          }}
        />
      </svg>
      
      {/* Center Dot */}
      <div 
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300 ${
            isDwelling ? 'bg-cyan-300 w-3 h-3' : 'bg-white/80 w-2 h-2'
        }`} 
      />
    </div>
  );
};
