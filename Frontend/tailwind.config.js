/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd1ff',
          300: '#8eb1ff',
          400: '#5d88fb',
          500: '#3a64f0',
          600: '#2747d6',
          700: '#2138ac',
          800: '#1f3289',
          900: '#1f306e',
        },
      },
      boxShadow: {
        soft: '0 4px 20px -8px rgba(15, 23, 42, 0.12)',
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
