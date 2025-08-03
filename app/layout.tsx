import type { Metadata } from "next";
import { mullerB, mullerH, anekMal } from "./fonts";
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
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
      className={`${mullerB.variable} ${mullerH.variable} ${anekMal.variable} antialiased`}
      >
        <head></head>
      <body className='font-body'>
        {children}
      </body>
    </html>
  );
}
