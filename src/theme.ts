import { Platform, StyleSheet } from 'react-native';
import { ItemCategory } from './types/ledger';

export const MONO_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const COLORS = {
  bg: '#09090B',
  surface: '#121215',
  surfaceHover: '#18181C',
  surfaceActive: '#222228',
  border: '#27272A',
  borderSubtle: '#1C1C20',
  borderActive: '#3F3F46',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  textDim: '#71717A',
  primary: '#10B981',
  primaryHover: '#059669',
  primaryGlow: 'rgba(16, 185, 129, 0.15)',
  danger: '#F43F5E',
  dangerGlow: 'rgba(244, 63, 94, 0.15)',
  warning: '#F59E0B',
  info: '#3B82F6',
  purple: '#A855F7',
};

export const MEMBER_AVATAR_COLORS = [
  { bg: '#064E3B', text: '#34D399', border: '#059669' }, // Emerald
  { bg: '#312E81', text: '#A5B4FC', border: '#4F46E5' }, // Indigo
  { bg: '#701A75', text: '#F472B6', border: '#C026D3' }, // Fuchsia
  { bg: '#78350F', text: '#FCD34D', border: '#D97706' }, // Amber
  { bg: '#1E3A8A', text: '#93C5FD', border: '#2563EB' }, // Blue
  { bg: '#4C1D95', text: '#C4B5FD', border: '#7C3AED' }, // Violet
  { bg: '#134E4A', text: '#5EEAD4', border: '#0D9488' }, // Teal
];

export function getAvatarColor(index: number) {
  return MEMBER_AVATAR_COLORS[index % MEMBER_AVATAR_COLORS.length];
}

export const CATEGORY_COLORS: Record<ItemCategory, { bg: string; border: string; text: string; label: string }> = {
  veg: { bg: 'rgba(16, 185, 129, 0.12)', border: '#10B981', text: '#34D399', label: 'Veg' },
  egg: { bg: 'rgba(245, 158, 11, 0.12)', border: '#F59E0B', text: '#FBBF24', label: 'Egg' },
  non_veg: { bg: 'rgba(244, 63, 94, 0.12)', border: '#F43F5E', text: '#FB7185', label: 'Non-Veg' },
  alcohol: { bg: 'rgba(168, 85, 247, 0.12)', border: '#A855F7', text: '#C084FC', label: 'Alcohol' },
  common: { bg: 'rgba(113, 113, 122, 0.12)', border: '#52525B', text: '#E4E4E7', label: 'Common' },
};

export const shared = StyleSheet.create({
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emeraldDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  amberDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warning },
  sectionHeader: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    fontFamily: MONO_FONT,
    marginBottom: 12,
  },
  sectionMicro: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    fontFamily: MONO_FONT,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monoAmount: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: MONO_FONT,
  },
  profileUpi: {
    color: COLORS.textDim,
    fontSize: 11,
    marginTop: 2,
    fontFamily: MONO_FONT,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
});
