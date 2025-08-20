'use client';

import { ReactNode } from 'react';
import { useTheme, ThemeContext } from '@/hooks/useTheme';

/**
 * Props for ThemeProvider component
 */
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
}

/**
 * ThemeProvider component
 * Provides theme context to the application with localStorage persistence
 * and system preference detection
 */
export function ThemeProvider({ 
  children, 
  defaultTheme = 'system',
  storageKey = 'udaman-theme'
}: ThemeProviderProps) {
  const themeContext = useTheme();

  return (
    <ThemeContext.Provider value={themeContext}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * NoFlash component to prevent theme flash on page load
 * Should be used in the root layout to set initial theme class
 */
export function NoFlash() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var theme = localStorage.getItem('udaman-theme');
              var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              var resolvedTheme = theme === 'system' ? systemTheme : (theme || 'light');
              
              document.documentElement.classList.add(resolvedTheme);
            } catch (e) {
              // Fallback to light theme if localStorage is not available
              document.documentElement.classList.add('light');
            }
          })();
        `,
      }}
    />
  );
}
