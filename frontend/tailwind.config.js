/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        paper: "#F5F4EF",
        cobalt: "#365CFF",
        "signal-lime": "#C8F169",
        "muted-gray": "#777777",
        "border-gray": "#D7D6D0",
        "error-red": "#D93D3D",
        "success-green": "#16845B",
        sidebar: {
          bg: "#171717",
          border: "#262626",
          text: "#A3A3A3",
          active: "#FFFFFF"
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          '"Geist Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace'
        ]
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '4px',
        lg: '6px'
      }
    },
  },
  plugins: [],
}
