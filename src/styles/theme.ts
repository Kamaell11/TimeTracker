export const lightColors = {
  bg: '#F0F2FA',
  surface: '#FFFFFF',
  surface2: '#F7F8FD',
  surfaceHover: '#EEF0F8',
  primary: '#5B5FDE',
  primaryDark: '#4547B8',
  primaryLight: '#EEEFFE',
  primaryGrad: ['#6366F1', '#8B5CF6'] as const,
  timerGrad: ['#4F46E5', '#7C3AED', '#9333EA'] as const,
  success: '#059669',
  successLight: '#ECFDF5',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  text: '#111827',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  tabBar: '#FFFFFF',
  tabBarBorder: '#F3F4F6',
  shadow: '#6366F1',
  invert: '#FFFFFF',
};

export const darkColors = {
  bg: '#0D1117',
  surface: '#161B27',
  surface2: '#1C2333',
  surfaceHover: '#1F2740',
  primary: '#818CF8',
  primaryDark: '#6366F1',
  primaryLight: '#1E1E3F',
  primaryGrad: ['#6366F1', '#8B5CF6'] as const,
  timerGrad: ['#312E81', '#4C1D95', '#581C87'] as const,
  success: '#34D399',
  successLight: '#064E3B',
  danger: '#F87171',
  dangerLight: '#450A0A',
  warning: '#FCD34D',
  warningLight: '#451A03',
  text: '#F0F6FC',
  textSec: '#8B949E',
  textMuted: '#484F58',
  border: '#21262D',
  borderLight: '#1C2333',
  tabBar: '#161B27',
  tabBarBorder: '#21262D',
  shadow: '#000000',
  invert: '#111827',
};

export type ColorTheme = typeof lightColors;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const shadow = (color: string) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 6,
});
export const shadowSm = (color: string) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.07,
  shadowRadius: 6,
  elevation: 3,
});
