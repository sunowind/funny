import React from 'react';

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Separator({ orientation = 'horizontal', className = '' }: SeparatorProps) {
  const baseClasses = orientation === 'vertical' 
    ? 'w-px bg-gray-300 dark:bg-gray-600' 
    : 'h-px bg-gray-300 dark:bg-gray-600';
  
  return <div className={`${baseClasses} ${className}`} />;
} 