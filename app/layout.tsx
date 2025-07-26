import type { Metadata } from "next";
import { inter, playfair, anekMal } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "pmsawafy",
  description: "pmsa wafy college website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${anekMal.variable} antialiased`}
      >
        <head></head>
      <body className='font-body'>
        {children}
      </body>
    </html>
  );
}
