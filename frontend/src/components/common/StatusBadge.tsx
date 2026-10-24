import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status?.toLowerCase() || 'unverified';

  let bg = 'bg-[#F0F0EE] text-[#777777] border-[#D7D6D0]';
  let dot = 'bg-[#777777]';
  let label = status;

  if (norm === 'passed' || norm === 'verified') {
    bg = 'bg-[#EBF7EE] text-[#16845B] border-[#C2E7CB]';
    dot = 'bg-[#16845B]';
    label = norm === 'verified' ? 'Verified' : 'Passed';
  } else if (norm === 'failed') {
    bg = 'bg-[#FDEDED] text-[#D93D3D] border-[#F8C8C8]';
    dot = 'bg-[#D93D3D]';
    label = 'Failed';
  } else if (norm === 'stale') {
    bg = 'bg-[#FFF9E6] text-[#B76E00] border-[#FCE199]';
    dot = 'bg-[#B76E00]';
    label = 'Stale';
  } else if (norm === 'running') {
    bg = 'bg-[#EBF0FF] text-[#365CFF] border-[#B8CCFF]';
    dot = 'bg-[#365CFF] animate-pulse';
    label = 'Running';
  } else if (norm === 'error') {
    bg = 'bg-[#FFF0F0] text-[#D93D3D] border-[#F5C2C2]';
    dot = 'bg-[#D93D3D]';
    label = 'Error';
  } else if (norm === 'approved') {
    bg = 'bg-[#EBF7EE] text-[#16845B] border-[#C2E7CB]';
    dot = 'bg-[#16845B]';
    label = 'Approved';
  }

  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium border rounded-sm ${bg} ${padding} uppercase tracking-wider font-mono`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};
