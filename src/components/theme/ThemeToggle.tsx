'use client';

import { useThemeContext } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';
import { useState } from 'react';

/**
 * Props for ThemeToggle component
 */
interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  'aria-label'?: string;
}

/**
 * ThemeToggle component
 * Provides a button to switch between light and dark themes
 * with animated sun/moon icons and proper accessibility
 */
export function ThemeToggle({ 
  className, 
  size = 'md',
  'aria-label': ariaLabel = 'Toggle theme'
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useThemeContext();

  const handleToggle = () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg',
        'bg-surface hover:bg-surface-hover',
        'border border-border',
        'text-foreground',
        'transition-all duration-200 ease-in-out',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'focus:ring-offset-background',
        'active:scale-95',
        sizeClasses[size],
        className
      )}
      aria-label={ariaLabel}
      aria-pressed={resolvedTheme === 'dark'}
    >
      {/* Sun icon */}
      <svg
        className={cn(
          'absolute transition-all duration-300 ease-in-out',
          'text-foreground',
          iconSizes[size],
          resolvedTheme === 'light' 
            ? 'rotate-0 scale-100 opacity-100' 
            : 'rotate-90 scale-0 opacity-0'
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>

      {/* Moon icon */}
      <svg
        className={cn(
          'absolute transition-all duration-300 ease-in-out',
          'text-foreground',
          iconSizes[size],
          resolvedTheme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100' 
            : '-rotate-90 scale-0 opacity-0'
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>

      {/* System theme indicator */}
      {theme === 'system' && (
        <div className="absolute -bottom-1 -right-1">
          <div className="w-2 h-2 bg-primary rounded-full" />
        </div>
      )}
    </button>
  );
}

/**
 * ThemeToggle with dropdown for system preference
 * Provides options for light, dark, and system themes
 */
export function ThemeToggleDropdown({ 
  className, 
  size = 'md',
  'aria-label': ariaLabel = 'Select theme'
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useThemeContext();
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const themes = [
    { value: 'light' as const, label: 'Light', icon: '☀️' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙' },
    { value: 'system' as const, label: 'System', icon: '💻' },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative inline-flex items-center justify-center rounded-lg',
          'bg-surface hover:bg-surface-hover',
          'border border-border',
          'text-foreground',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'focus:ring-offset-background',
          'active:scale-95',
          sizeClasses[size],
          className
        )}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Current theme icon */}
        <span className={iconSizes[size]}>
          {themes.find(t => t.value === theme)?.icon}
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 z-50 min-w-[120px] rounded-lg bg-surface border border-border shadow-lg">
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                type="button"
                onClick={() => {
                  setTheme(themeOption.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm',
                  'hover:bg-surface-hover',
                  'transition-colors duration-150',
                  'flex items-center gap-2',
                  theme === themeOption.value && 'bg-accent text-accent-foreground'
                )}
              >
                <span>{themeOption.icon}</span>
                <span>{themeOption.label}</span>
                {theme === themeOption.value && (
                  <span className="ml-auto">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
