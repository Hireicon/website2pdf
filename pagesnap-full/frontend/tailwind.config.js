/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        serif: ['Instrument Serif', 'serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        accent: { DEFAULT: '#c84b2f', hover: '#b0401f', light: 'rgba(200,75,47,0.08)' },
        ink: { DEFAULT: '#0f0e0d', 2: '#3a3835', 3: '#7a7673' },
        cream: { DEFAULT: '#faf8f4', paper: '#f2ede4' },
        border: { DEFAULT: '#ddd8ce', 2: '#e8e3d8' },
      },
    },
  },
  plugins: [],
}
