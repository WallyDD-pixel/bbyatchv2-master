/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'nakilla': ['var(--font-nakilla)', 'Playfair Display', 'serif'],
        'aviano': ['var(--font-aviano)', 'Manrope', 'sans-serif'],
        'sans': ['Manrope', 'system-ui', 'sans-serif'],
        'display': ['var(--font-nakilla)', 'Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
};
