import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showWordmark?: boolean;
  className?: string;
  isAnimating?: boolean; // Kept for backwards compatibility, ignored since image logo is removed
}

export default function BrandLogo({ 
  size = 'md', 
  className = ''
}: BrandLogoProps) {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
    '2xl': 'text-6xl md:text-7xl'
  };

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      {/* Beautiful modern color gradient font style representing ConFile */}
      <span className={`font-display font-black tracking-tight ${textSizes[size]}`}>
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D946EF] via-[#A855F7] to-[#EC4899] drop-shadow-[0_2px_15px_rgba(168,85,247,0.35)]">
          ConFile
        </span>
      </span>
    </div>
  );
}
