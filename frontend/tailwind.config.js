/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Space Grotesk', 'Inter', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
        grotesk: ['Space Grotesk', 'sans-serif'],
      },
      maxWidth: {
        'content': '1400px',
        'text':    '1200px',
      },
    },
  },
}
