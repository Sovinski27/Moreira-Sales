/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bakery: {
          50: '#FDFBF7',
          100: '#FBF5EB',
          200: '#F4E7CE',
          300: '#E9D0A7',
          400: '#D9AD6A',
          500: '#C78C39', // Gold sourdough crust
          600: '#A96B26',
          700: '#834E1C',
          800: '#5A3414',
          900: '#2F1808', // Espresso roast
        },
        cream: {
          50: '#FFFEFA',
          100: '#FBF9F3',
          200: '#F3EFE4',
          300: '#E8E1D1',
        },
        emeraldReward: {
          DEFAULT: '#059669',
          light: '#D1FAE5',
          dark: '#065F46',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
