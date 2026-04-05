/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFB',
        surface: '#FFFFFF',
        primary: '#2563EB',
        secondary: '#059669',
        tertiary: '#93C5FD',
      },
      borderRadius: {
        lg: '24px',
        xl: '32px',
        full: '9999px',
      }
    },
  },
  plugins: [],
}
