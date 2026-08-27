/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uhk: {
          blue: '#0047AB',
          light: '#E8F0FE',
          dark: '#002A66'
        }
      }
    },
  },
  plugins: [],
}
