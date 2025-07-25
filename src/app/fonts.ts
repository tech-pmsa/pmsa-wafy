// app/fonts.ts
import localFont from "next/font/local";

export const inter = localFont({
  src: "./fonts/Inter-Variable.ttf",
  variable: "--font-inter",
  display: "swap",
});

export const playfair = localFont({
  src: "./fonts/playfair-regular.ttf",
  variable: "--font-playfair",
  display: "swap",
});
export const anekMal = localFont({
  src: "./fonts/AnekMalayalam-Variable.ttf",
  variable: "--font-anek",
  display: "swap",
});
