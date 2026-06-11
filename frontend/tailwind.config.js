/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        wa: {
          dark: '#075E54',
          green: '#128C7E',
          light: '#25D366',
          bg: '#ECE5DD',
          input: '#F0F0F0',
          'bubble-user': '#DCF8C6',
          'bubble-bot': '#FFFFFF',
        },
      },
      animation: {
        'bounce-dot': 'bounce 1s infinite',
      },
    },
  },
  plugins: [],
};
