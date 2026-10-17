import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const iconDimensions = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Geometric Isometric Interlocking Hexagon / Cube SVG Logo (Darshana style) */}
      <div className={`relative ${iconDimensions} flex items-center justify-center shrink-0`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full fill-none stroke-[#9E5325] stroke-[4] drop-shadow-sm"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Outer isometric hexagon frame */}
          <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" stroke="#B46536" strokeWidth="4.5" />
          {/* Inner interlocking cubes */}
          <polygon points="50,22 76,37 50,52 24,37" stroke="#9E5325" strokeWidth="4" />
          <polygon points="50,52 76,37 76,67 50,82" stroke="#803C15" strokeWidth="4" />
          <polygon points="50,52 24,37 24,67 50,82" stroke="#B46536" strokeWidth="4" />
          {/* Center axis highlight */}
          <line x1="50" y1="52" x2="50" y2="82" stroke="#7A3912" strokeWidth="3" />
        </svg>
      </div>

      <div className="leading-tight min-w-0">
        <div className={`font-black tracking-[0.18em] text-[#1C1917] font-heading whitespace-nowrap ${titleSize}`}>
          DARSHANA
        </div>
        {showSubtitle && (
          <div className="text-[9px] uppercase tracking-[0.2em] font-semibold text-[#9E5325] whitespace-nowrap truncate">
            Planificador & Bienestar Integral
          </div>
        )}
      </div>
    </div>
  );
};
