import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        'brand-green-dark': '#004d40',   // A deep, rich green for primary text and elements
        'brand-green': '#00796b',       // A vibrant mid-tone green for primary actions
        'brand-green-light': '#b2dfdb', // A light green for backgrounds and highlights
        'brand-yellow': '#ffc107',      // A bright, energetic yellow for accents and buttons
        'brand-yellow-dark': '#ffa000', // A darker yellow for hover states
        'neutral-light': '#f5f5f5',     // Light grey for page backgrounds
        'neutral-medium': '#e0e0e0',    // Medium grey for borders and dividers
        'neutral-dark': '#424242',      // Dark grey for secondary text
        'neutral-black': '#212121',     // Near-black for primary headings

        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        body: 'var(--font-mullerB)',
        heading: 'var(--font-mullerH)',
        malayalam: 'var(--font-anek)'
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        "spin-and-fade": {
          from: { opacity: '0', transform: 'scale(0.5) rotate(-90deg)' },
          to: { opacity: '1', transform: 'scale(1) rotate(0deg)' },
        },
        'progress': {
          '0%': { width: '0%', opacity: '0.5' },
          '50%': { width: '75%', opacity: '1' },
          '100%': { width: '100%', opacity: '0.5' },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "spin-and-fade": "spin-and-fade 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
        'progress': 'progress 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;