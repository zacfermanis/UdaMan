/**
 * Color system types and interfaces for the Udaman application
 * Based on Radix UI color palette with light/dark theme support
 */

/**
 * Theme types for the application
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Resolved theme (actual light or dark, not system)
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Color scale interface for blue and gray scales
 */
export interface ColorScale {
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
  6: string;
  7: string;
  8: string;
  9: string;
  10: string;
  11: string;
  12: string;
  a1: string;
  a2: string;
  a3: string;
  a4: string;
  a5: string;
  a6: string;
  a7: string;
  a8: string;
  a9: string;
  a10: string;
  a11: string;
  a12: string;
  contrast: string;
  surface: string;
  indicator: string;
  track: string;
}

/**
 * Semantic color tokens
 */
export interface SemanticColors {
  background: string;
  foreground: string;
  surface: string;
  surfaceHover: string;
  border: string;
  ring: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
}

/**
 * Complete color system interface
 */
export interface ColorSystem {
  blue: ColorScale;
  gray: ColorScale;
  semantic: SemanticColors;
}

/**
 * Theme context interface for React Context
 */
export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
}

/**
 * Blue color scale constants (light theme)
 */
export const BLUE_LIGHT: ColorScale = {
  1: '#fbfdff',
  2: '#f5f9ff',
  3: '#edf4ff',
  4: '#e1eeff',
  5: '#cee7fe',
  6: '#b7d9f8',
  7: '#96c7f2',
  8: '#5eb0ef',
  9: '#0091ff',
  10: '#0081f1',
  11: '#006adc',
  12: '#00254d',
  a1: '#0000ff04',
  a2: '#0055ff0a',
  a3: '#0055ff12',
  a4: '#0055ff1e',
  a5: '#0055ff31',
  a6: '#0055ff48',
  a7: '#0055ff69',
  a8: '#0055ffa1',
  a9: '#0091ff',
  a10: '#0081f1',
  a11: '#006adc',
  a12: '#00254d',
  contrast: '#fff',
  surface: '#f5f9ff80',
  indicator: '#0091ff',
  track: '#0091ff',
};

/**
 * Blue color scale constants (dark theme)
 */
export const BLUE_DARK: ColorScale = {
  1: '#0c111c',
  2: '#111725',
  3: '#172448',
  4: '#1d2e61',
  5: '#243974',
  6: '#2d4484',
  7: '#375098',
  8: '#405eb2',
  9: '#3d63dd',
  10: '#3f5cb0',
  11: '#93b4ff',
  12: '#d5e2ff',
  a1: '#0012fb0c',
  a2: '#1156f916',
  a3: '#2b64ff3b',
  a4: '#3567ff56',
  a5: '#3f71fd6b',
  a6: '#4b7afd7c',
  a7: '#5480ff91',
  a8: '#5783ffad',
  a9: '#4571ffdb',
  a10: '#5580feab',
  a11: '#93b4ff',
  a12: '#d5e2ff',
  contrast: '#fff',
  surface: '#111d3980',
  indicator: '#3d63dd',
  track: '#3d63dd',
};

/**
 * Gray color scale constants (light theme)
 */
export const GRAY_LIGHT: ColorScale = {
  1: '#fcfcfc',
  2: '#f8f8f8',
  3: '#f3f3f3',
  4: '#ededed',
  5: '#e7e7e7',
  6: '#d1d1d1',
  7: '#b0b0b0',
  8: '#888888',
  9: '#6d6d6d',
  10: '#5d5d5d',
  11: '#4a4a4a',
  12: '#1c1c1c',
  a1: '#00000003',
  a2: '#00000008',
  a3: '#0000000d',
  a4: '#00000013',
  a5: '#00000019',
  a6: '#0000002f',
  a7: '#00000050',
  a8: '#00000078',
  a9: '#00000093',
  a10: '#000000a3',
  a11: '#000000b6',
  a12: '#000000e4',
  contrast: '#000000',
  surface: 'rgba(0, 0, 0, 0.05)',
  indicator: '#6d6d6d',
  track: '#6d6d6d',
};

/**
 * Gray color scale constants (dark theme)
 */
export const GRAY_DARK: ColorScale = {
  1: '#111113',
  2: '#19191b',
  3: '#222325',
  4: '#292a2e',
  5: '#303136',
  6: '#393a40',
  7: '#46484f',
  8: '#5f606a',
  9: '#6c6e79',
  10: '#797b86',
  11: '#b2b3bd',
  12: '#eeeef0',
  a1: '#1111bb03',
  a2: '#cbcbf90b',
  a3: '#d6e2f916',
  a4: '#d1d9f920',
  a5: '#d7ddfd28',
  a6: '#d9defc33',
  a7: '#dae2fd43',
  a8: '#e0e3fd60',
  a9: '#e0e4fd70',
  a10: '#e3e7fd7e',
  a11: '#eff0feb9',
  a12: '#fdfdffef',
  contrast: '#FFFFFF',
  surface: 'rgba(0, 0, 0, 0.05)',
  indicator: '#6c6e79',
  track: '#6c6e79',
};

/**
 * Semantic colors for light theme
 */
export const SEMANTIC_LIGHT: SemanticColors = {
  background: '#ffffff',
  foreground: '#1c1c1c',
  surface: '#f8f8f8',
  surfaceHover: '#f3f3f3',
  border: '#e7e7e7',
  ring: '#0091ff',
  primary: '#0091ff',
  primaryForeground: '#ffffff',
  secondary: '#f3f3f3',
  secondaryForeground: '#1c1c1c',
  muted: '#f8f8f8',
  mutedForeground: '#6d6d6d',
  accent: '#f5f9ff',
  accentForeground: '#006adc',
  destructive: '#ff0000',
  destructiveForeground: '#ffffff',
  success: '#00c853',
  successForeground: '#ffffff',
  warning: '#ff9800',
  warningForeground: '#ffffff',
};

/**
 * Semantic colors for dark theme
 */
export const SEMANTIC_DARK: SemanticColors = {
  background: '#111113',
  foreground: '#eeeef0',
  surface: '#19191b',
  surfaceHover: '#222325',
  border: '#303136',
  ring: '#3d63dd',
  primary: '#3d63dd',
  primaryForeground: '#ffffff',
  secondary: '#222325',
  secondaryForeground: '#eeeef0',
  muted: '#19191b',
  mutedForeground: '#6c6e79',
  accent: '#172448',
  accentForeground: '#93b4ff',
  destructive: '#ff4444',
  destructiveForeground: '#ffffff',
  success: '#00e676',
  successForeground: '#ffffff',
  warning: '#ffab40',
  warningForeground: '#ffffff',
};

/**
 * Complete color system for light theme
 */
export const COLOR_SYSTEM_LIGHT: ColorSystem = {
  blue: BLUE_LIGHT,
  gray: GRAY_LIGHT,
  semantic: SEMANTIC_LIGHT,
};

/**
 * Complete color system for dark theme
 */
export const COLOR_SYSTEM_DARK: ColorSystem = {
  blue: BLUE_DARK,
  gray: GRAY_DARK,
  semantic: SEMANTIC_DARK,
};

/**
 * Get color system based on theme
 */
export function getColorSystem(theme: ResolvedTheme): ColorSystem {
  return theme === 'dark' ? COLOR_SYSTEM_DARK : COLOR_SYSTEM_LIGHT;
}

/**
 * Get semantic colors based on theme
 */
export function getSemanticColors(theme: ResolvedTheme): SemanticColors {
  return theme === 'dark' ? SEMANTIC_DARK : SEMANTIC_LIGHT;
}

/**
 * Get blue scale based on theme
 */
export function getBlueScale(theme: ResolvedTheme): ColorScale {
  return theme === 'dark' ? BLUE_DARK : BLUE_LIGHT;
}

/**
 * Get gray scale based on theme
 */
export function getGrayScale(theme: ResolvedTheme): ColorScale {
  return theme === 'dark' ? GRAY_DARK : GRAY_LIGHT;
}

/**
 * CSS custom property names for color tokens
 */
export const CSS_CUSTOM_PROPERTIES = {
  // Blue scale
  blue1: '--blue-1',
  blue2: '--blue-2',
  blue3: '--blue-3',
  blue4: '--blue-4',
  blue5: '--blue-5',
  blue6: '--blue-6',
  blue7: '--blue-7',
  blue8: '--blue-8',
  blue9: '--blue-9',
  blue10: '--blue-10',
  blue11: '--blue-11',
  blue12: '--blue-12',
  blueA1: '--blue-a1',
  blueA2: '--blue-a2',
  blueA3: '--blue-a3',
  blueA4: '--blue-a4',
  blueA5: '--blue-a5',
  blueA6: '--blue-a6',
  blueA7: '--blue-a7',
  blueA8: '--blue-a8',
  blueA9: '--blue-a9',
  blueA10: '--blue-a10',
  blueA11: '--blue-a11',
  blueA12: '--blue-a12',
  blueContrast: '--blue-contrast',
  blueSurface: '--blue-surface',
  blueIndicator: '--blue-indicator',
  blueTrack: '--blue-track',

  // Gray scale
  gray1: '--gray-1',
  gray2: '--gray-2',
  gray3: '--gray-3',
  gray4: '--gray-4',
  gray5: '--gray-5',
  gray6: '--gray-6',
  gray7: '--gray-7',
  gray8: '--gray-8',
  gray9: '--gray-9',
  gray10: '--gray-10',
  gray11: '--gray-11',
  gray12: '--gray-12',
  grayA1: '--gray-a1',
  grayA2: '--gray-a2',
  grayA3: '--gray-a3',
  grayA4: '--gray-a4',
  grayA5: '--gray-a5',
  grayA6: '--gray-a6',
  grayA7: '--gray-a7',
  grayA8: '--gray-a8',
  grayA9: '--gray-a9',
  grayA10: '--gray-a10',
  grayA11: '--gray-a11',
  grayA12: '--gray-a12',
  grayContrast: '--gray-contrast',
  graySurface: '--gray-surface',
  grayIndicator: '--gray-indicator',
  grayTrack: '--gray-track',

  // Semantic colors
  background: '--background',
  foreground: '--foreground',
  surface: '--surface',
  surfaceHover: '--surface-hover',
  border: '--border',
  ring: '--ring',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  success: '--success',
  successForeground: '--success-foreground',
  warning: '--warning',
  warningForeground: '--warning-foreground',
} as const;

/**
 * Type for CSS custom property names
 */
export type CSSPropertyName = typeof CSS_CUSTOM_PROPERTIES[keyof typeof CSS_CUSTOM_PROPERTIES];
