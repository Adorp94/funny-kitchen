import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function Tooltip({ 
  children, 
  content, 
  side = 'top', 
  className 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };
  
  const arrows = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800',
  };
  
  return (
    <div 
      className="relative flex group"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(false)}
    >
      {children}
      
      {isVisible && (
        <div 
          className={cn(
            "absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded pointer-events-none whitespace-nowrap",
            positions[side],
            className
          )}
        >
          {content}
          <div 
            className={cn(
              "absolute w-0 h-0 border-4 border-transparent",
              arrows[side]
            )}
          />
        </div>
      )}
    </div>
  );
} 