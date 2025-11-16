/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}', 
  ],
  theme: {
    extend: {
      // --- ეს არის ჩვენი დიზაინი ---
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        'brand-red': '#e50914',
        'brand-dark': '#141414',
      },
      // --- დასასრული ---
    },
  },
  plugins: [],
};

export default config;