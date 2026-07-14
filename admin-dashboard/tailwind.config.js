/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Uber monochrome — primary accent is white, scaling to light grays.
        brand: {
          DEFAULT: '#FFFFFF',
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#ffffff',
          500: '#f5f5f5',
          600: '#d4d4d4',
          700: '#a3a3a3',
        },
        ink: {
          950: '#09090b',
          900: '#111113',
          850: '#161618',
          800: '#1c1c1f',
          700: '#27272a',
          600: '#3f3f46',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.16), 0 8px 30px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
