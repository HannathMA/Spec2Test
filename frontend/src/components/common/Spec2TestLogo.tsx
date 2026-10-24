import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}

export const Spec2TestLogo: React.FC<LogoProps> = ({
  className = '',
  size = 28,
  showWordmark = true
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Precision Geometric Monogram */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Top facet */}
        <path d="M16 2L29 9.5L16 17L3 9.5L16 2Z" fill="#FFFFFF" fillOpacity="0.95" />
        {/* Left facet */}
        <path d="M3 9.5L16 17V30L3 22.5V9.5Z" fill="#365CFF" />
        {/* Right facet with brutalist notch */}
        <path d="M16 17L29 9.5V22.5L16 30V17Z" fill="#C8F169" />
        {/* Inner geometric verification vector */}
        <path d="M12 17L15 20L21 14" stroke="#171717" strokeWidth="2.5" strokeLinecap="square" />
      </svg>

      {showWordmark && (
        <span className="font-extrabold tracking-tight text-white text-[17px] font-sans">
          Spec2Test <span className="text-[#C8F169] font-mono text-[14px] font-normal px-1 py-0.5 border border-[#333333] ml-0.5">AI</span>
        </span>
      )}
    </div>
  );
};
