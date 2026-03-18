const tintColorLight = '#4b5563';
const tintColorDark = '#d1d5db';

export default {
  light: {
    text: '#1f2933',
    background: '#f9fafb',
    tint: tintColorLight,
    tabIconDefault: '#9ca3af',
    tabIconSelected: tintColorLight,

    card: '#ffffffcc',
    border: '#e5e7eb',
    muted: '#6b7280',

    // Search / Input
    inputBackground: '#f3f4f6',   // very light gray
    inputBorder: '#d1d5db',
    inputText: '#1f2933',
    inputPlaceholder: '#9ca3af',
    inputFocusBorder: '#6b7280',  // slightly darker on focus
  },

  dark: {
    text: '#e5e7eb',
    background: '#111827',
    tint: tintColorDark,
    tabIconDefault: '#6b7280',
    tabIconSelected: tintColorDark,

    card: '#1f2933',
    border: '#374151',
    muted: '#9ca3af',

    // Search / Input
    inputBackground: '#1f2933',   // blends with card
    inputBorder: '#374151',
    inputText: '#e5e7eb',
    inputPlaceholder: '#6b7280',
    inputFocusBorder: '#9ca3af',  // lighter on focus for visibility
  },
};