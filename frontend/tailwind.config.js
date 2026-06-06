/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Design system tokens (design-system.md)
        base: '#F8FAFC',
        surface: '#FFFFFF',
        emerald: {
          DEFAULT: '#198754',
          deep: '#0F5132',
        },
        slate: {
          dark: '#1E293B',
          muted: '#64748B',
        },
        badge: {
          'semai-bg': '#FEF3C7',
          'semai-text': '#B45309',
          'aktif-bg': '#DCFCE7',
          'aktif-text': '#15803D',
          'keluar-bg': '#FFE4E6',
          'keluar-text': '#B91C1C',
        },
      },
      fontSize: {
        // Skala kompak (design-system.md)
        'heading-lg': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700' }],
        'heading-md': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.25rem' }],
        caption: ['0.75rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};
