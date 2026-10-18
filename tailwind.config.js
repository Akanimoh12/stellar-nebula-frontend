/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#050716',
          900: '#090b21',
          800: '#10133a',
          700: '#1b1f55',
          600: '#2c3273',
        },
        cosmic: {
          blue: '#60a5fa',
          cyan: '#22d3ee',
          purple: '#a78bfa',
          violet: '#7c3aed',
          pink: '#f472b6',
          rose: '#fb7185',
        },
        nebula: {
          core: '#e879f9',
          haze: '#c084fc',
          dust: '#38bdf8',
          void: '#020617',
        },
      },
      backgroundImage: {
        'nebula-radial':
          'radial-gradient(circle at 20% 20%, rgba(232, 121, 249, 0.24), transparent 32%), radial-gradient(circle at 80% 0%, rgba(96, 165, 250, 0.2), transparent 28%), linear-gradient(135deg, #050716 0%, #090b21 52%, #10133a 100%)',
      },
      boxShadow: {
        cosmic: '0 24px 80px rgba(124, 58, 237, 0.22)',
        'nebula-glow': '0 0 32px rgba(232, 121, 249, 0.28)',
        'focus-ring': '0 0 0 3px #e879f9',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
        'touch-sm': '44px',
        'touch-lg': '48px',
      },
      minWidth: {
        touch: '44px',
        'touch-sm': '44px',
        'touch-lg': '48px',
      },
      height: {
        touch: '44px',
        'touch-lg': '48px',
      },
      width: {
        touch: '44px',
        'touch-lg': '48px',
      },
      spacing: {
        'touch-gap': '8px',
      },
    },
  },
  plugins: [],
}
