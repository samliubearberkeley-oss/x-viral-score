/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'retro-beige': '#F5F5DC',
        'retro-beige-light': '#FAFAF0',
        'retro-blue': '#4A90E2',
        'retro-blue-dark': '#357ABD',
        'retro-orange': '#FF8C42',
        'retro-orange-dark': '#E67E2E',
        'retro-pink': '#FFB6C1',
        'retro-pink-dark': '#FF91A4',
        'retro-yellow': '#FFD700',
        'retro-yellow-dark': '#E6C200',
      },
    },
  },
  plugins: [],
}

