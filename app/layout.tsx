/* eslint-disable @next/next/no-page-custom-font -- App Router root layout is the correct place for font links; this rule targets Pages Router _document.js */
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Etheon — Mine Ethereum, every single day",
  description: "Own virtual hashrate, watch your rewards accrue in real time, and withdraw whenever you want. Etheon handles the rigs — you keep the upside.",
  icons: {
    icon: "/brand/etheon-icon.svg",
    apple: "/brand/etheon-icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <head>
        {/* Material Symbols loaded via link — not available through next/font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: 'var(--color-background)', color: 'var(--color-text-primary)', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
