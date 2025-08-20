'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for GradientBackground component
 */
interface GradientBackgroundProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'intense';
  animated?: boolean;
}

/**
 * GradientBackground component
 * Provides theme-aware gradient backgrounds with smooth transitions
 */
export function GradientBackground({ 
  children, 
  className,
  variant = 'default',
  animated = true
}: GradientBackgroundProps) {
  const variantClasses = {
    default: 'gradient-background',
    subtle: 'gradient-background-subtle',
    intense: 'gradient-background-intense',
  };

  return (
    <div 
      className={cn(
        variantClasses[variant],
        animated && 'animate-gradient',
        'min-h-screen w-full relative',
        'transition-all duration-500 ease-in-out',
        className
      )}
    >
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

/**
 * GradientBackground with custom gradient colors
 */
export function CustomGradientBackground({ 
  children, 
  className,
  fromColor = 'var(--blue-1)',
  viaColor = 'var(--gray-1)',
  toColor = 'var(--blue-4)',
  animated = true
}: {
  children: ReactNode;
  className?: string;
  fromColor?: string;
  viaColor?: string;
  toColor?: string;
  animated?: boolean;
}) {
  const gradientStyle = {
    background: `linear-gradient(135deg, ${fromColor} 0%, ${viaColor} 50%, ${toColor} 100%)`,
    backgroundSize: animated ? '400% 400%' : '100% 100%',
  };

  return (
    <div 
      className={cn(
        'min-h-screen w-full relative',
        'transition-all duration-500 ease-in-out',
        animated && 'animate-gradient',
        className
      )}
      style={gradientStyle}
    >
      {/* Radial overlay for depth */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at 20% 80%, var(--blue-a1) 0%, transparent 50%)`,
        }}
      />
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 80% 20%, var(--blue-a2) 0%, transparent 50%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

/**
 * Simple gradient background without animations
 */
export function StaticGradientBackground({ 
  children, 
  className 
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div 
      className={cn(
        'min-h-screen w-full relative',
        'bg-gradient-to-br from-blue-1 via-gray-1 to-blue-4',
        'transition-colors duration-500 ease-in-out',
        className
      )}
    >
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
