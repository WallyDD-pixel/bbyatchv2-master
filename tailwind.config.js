/** @type {import('tailwindcss').Config} */
module.exports = {
  // dark: uniquement via la classe .dark sur <html> (jamais prefers-color-scheme)
  darkMode: 'class',
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
