/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        surface: {
          0: '#000000',
          1: '#0a0a0b',
          2: '#111113',
          3: '#18181b',
          4: '#232327',
          5: '#2e2e33',
        },
        line: '#2a2a2e',
        'line-bright': '#3a3a40',
        txt: {
          hi: '#f4f4f5',
          mid: '#a1a1aa',
          low: '#63636b',
        },
      },
      fontFamily: {
        ui: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '12px' }],
      },
    },
  },
  plugins: [],
};
