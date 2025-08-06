import React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressBarProps {
  progress: number;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  color?: 'white' | 'blue' | 'red';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className,
  size = 'medium',
  color = 'white'
}) => {
  const sizeClasses = {
    small: 'h-0.5',
    medium: 'h-1',
    large: 'h-2'
  };

  const colorClasses = {
    white: 'bg-white',
    blue: 'bg-blue-500',
    red: 'bg-red-500'
  };

  const backgroundClasses = {
    white: 'bg-white/20',
    blue: 'bg-blue-200',
    red: 'bg-red-200'
  };

  return (
    <div className={cn('absolute bottom-0 left-0 right-0 px-2 pb-1', className)}>
      <div className={cn('w-full rounded', sizeClasses[size], backgroundClasses[color])}>
        <div 
          className={cn('h-full rounded transition-all duration-300', colorClasses[color])} 
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </div>
  );
};
