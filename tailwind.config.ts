import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-grey': '#f3f4f5',
        'primary-dark-grey': '#e1e1e0',
        'secondary-white': '#fefeff',
        'secondary-light-black': '#342d2d',
        'dark-green': '#418740',
        'light-green': '#72b141',
        'icon-green': '#145f17',
        'button-yellow': '#ffc106',
        'heading-text-black': '#000000',
        'text-grey': '#5c5d5c',
        'button-text-black': '#000000',
        'sub-heading-text-grey': '#6e716e',
        'link-text-green': '#016501',
      },
      fontFamily: {
        body: "var(--font-inter)",
        heading: "var(--font-playfair)",
        malayalam: "var(--font-anek)"
      },
    },
  },
  plugins: [],
};
export default config;
