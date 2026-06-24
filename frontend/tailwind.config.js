/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        civic: {
          50: '#f8fafc',
          100: '#f0f5fc',
          200: '#dce5f5',
          300: '#c8d5ee',
          400: '#9eb5dc',
          500: '#1e40af',
          600: '#1e3a8a',
          700: '#172554',
          800: '#0f172a',
          900: '#0a0f1f',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fce7a1',
          300: '#fbbf24',
          400: '#f59e0b',
          500: '#d97706',
          600: '#b45309',
          700: '#8b3a0b',
          800: '#661e05',
          900: '#3f1605',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
        display: ['Merriweather', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-10px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
      boxShadow: {
        'civic': '0 4px 12px rgba(30, 58, 138, 0.15)',
      },
    },
  },
  plugins: [],
}
