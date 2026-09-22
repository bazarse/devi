import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdeff',
          300: '#8eccff',
          400: '#58afff',
          500: '#2196f3', // Devi Blue Primary
          600: '#1976d2', // Darker Blue
          700: '#1565c0',
          800: '#17529b',
          900: '#18457d',
        },
      },
    },
  },
  plugins: [],
};
export default config;
