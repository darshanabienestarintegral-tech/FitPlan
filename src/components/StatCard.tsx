import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: 'cyan' | 'orange' | 'emerald' | 'purple';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#EAE3D9] shadow-sm flex flex-col justify-between transition-all hover:border-[#D8C5B3]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-[#78716C] tracking-[0.1em] uppercase font-heading">
          {label}
        </span>
        {/* Darshana circular icon badge with thin copper border */}
        <div className="w-9 h-9 rounded-full border-[1.5px] border-[#9E5325] bg-[#FAF7F2] text-[#9E5325] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 stroke-[2px]" />
        </div>
      </div>

      <div>
        <div className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight font-heading">
          {value}
        </div>
        {subtext && (
          <div className="text-xs text-[#78716C] mt-0.5 font-medium">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};
