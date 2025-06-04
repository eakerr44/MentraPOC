import React from 'react';

interface SprigIconProps {
  type: 'book' | 'classwork' | 'goodgrades' | 'idea' | 'love' | 'money' | 'pointing' | 'shootingstar' | 'stars' | 'smile';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
}

export const SprigIcon: React.FC<SprigIconProps> = ({ 
  type, 
  size = 'md', 
  className = '', 
  alt 
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'sprig-icon size-sm';
      case 'md': return 'sprig-icon size-md';
      case 'lg': return 'sprig-icon size-lg';
      default: return 'sprig-icon size-md';
    }
  };

  const getAltText = () => {
    if (alt) return alt;
    
    switch (type) {
      case 'book': return 'Sprig reading a book';
      case 'classwork': return 'Sprig doing classwork';
      case 'goodgrades': return 'Sprig celebrating good grades';
      case 'idea': return 'Sprig having an idea';
      case 'love': return 'Sprig showing love';
      case 'money': return 'Sprig with reward';
      case 'pointing': return 'Sprig pointing';
      case 'shootingstar': return 'Sprig with shooting star';
      case 'stars': return 'Sprig with stars';
      case 'smile': return 'Sprig smiling';
      default: return 'Sprig mascot';
    }
  };

  return (
    <img
      src={`/assets/sprig/${type}.png`}
      alt={getAltText()}
      className={`${getSizeClass()} ${className}`}
    />
  );
};

// Sprig icon mapping for different contexts
export const sprigIcons = {
  // Navigation contexts
  dashboard: 'stars' as const,
  journal: 'book' as const,
  problems: 'classwork' as const,
  help: 'idea' as const,
  
  // Emotional states
  happy: 'smile' as const,
  proud: 'goodgrades' as const,
  loving: 'love' as const,
  excited: 'shootingstar' as const,
  
  // Activity contexts
  learning: 'book' as const,
  working: 'classwork' as const,
  achieving: 'stars' as const,
  guiding: 'pointing' as const,
  rewarding: 'money' as const,
} as const; 