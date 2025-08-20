'use client';

import { useContext, useEffect, useState } from 'react';
import { Theme, ResolvedTheme, ThemeContextType } from '@/types/colors';

/**
 * Default theme storage key for localStorage
 */
const THEME_STORAGE_KEY = 'udaman-theme';

/**
 * Default theme for the application
 */
const DEFAULT_THEME: Theme = 'system';

/**
 * Hook for managing theme state
 * Provides theme switching functionality with localStorage persistence
 * and system preference detection
 */
export function useTheme(): ThemeContextType {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    
    // Get theme from localStorage or use default
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const initialTheme = storedTheme || DEFAULT_THEME;
    
    setThemeState(initialTheme);
  }, []);

  // Update resolved theme when theme changes
  useEffect(() => {
    if (!mounted) return;

    const updateResolvedTheme = () => {
      let newResolvedTheme: ResolvedTheme = 'light';

      if (theme === 'system') {
        // Check system preference
        newResolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        newResolvedTheme = theme;
      }

      setResolvedTheme(newResolvedTheme);
      
      // Update document class for CSS targeting
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(newResolvedTheme);
    };

    updateResolvedTheme();

    // Listen for system preference changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateResolvedTheme();
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, mounted]);

  /**
   * Set theme and persist to localStorage
   */
  const setTheme = (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      // Handle localStorage errors gracefully
      console.warn('Failed to save theme preference:', error);
      setThemeState(newTheme);
    }
  };

  return {
    theme,
    setTheme,
    resolvedTheme,
  };
}

/**
 * Hook for accessing theme context
 * Must be used within a ThemeProvider
 */
export function useThemeContext(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  
  return context;
}

/**
 * Theme context for React Context API
 */
import { createContext } from 'react';

export const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Utility function to get system theme preference
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Utility function to get stored theme preference
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  } catch {
    return null;
  }
}

/**
 * Utility function to set stored theme preference
 */
export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Failed to save theme preference:', error);
  }
}

/**
 * Utility function to clear stored theme preference
 */
export function clearStoredTheme(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear theme preference:', error);
  }
}
