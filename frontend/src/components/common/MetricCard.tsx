import React from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  subValue?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  iconBg?: string;
  accentColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subValue,
  trend,
  trendDirection = 'up',
  icon,
  iconBg = 'bg-[#F5F4EF]',
  accentColor = '#171717'
}) => {
  return (
    <div className="bg-white border border-[#D7D6D0] p-4 flex flex-col justify-between hover:border-[#171717] transition-colors relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-[#777777] uppercase tracking-wider font-sans">
          {label}
        </span>
        {icon && (
          <div className={`w-7 h-7 flex items-center justify-center border border-[#D7D6D0] ${iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <span className="text-3xl font-extrabold text-[#171717] tracking-tight font-sans">
          {value}
        </span>
        {subValue && (
          <span className="text-xs font-mono text-[#777777]">{subValue}</span>
        )}
      </div>

      {trend && (
        <div className="mt-2.5 pt-2 border-t border-[#F5F4EF] flex items-center gap-1.5 text-xs font-mono">
          <span
            className={
              trendDirection === 'up'
                ? 'text-[#16845B] font-semibold'
                : trendDirection === 'down'
                ? 'text-[#D93D3D] font-semibold'
                : 'text-[#777777]'
            }
          >
            {trend}
          </span>
          <span className="text-[#999999] text-[11px]">vs baseline</span>
        </div>
      )}
    </div>
  );
};
