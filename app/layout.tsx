import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { NO_FLASH_SCRIPT } from "./lib/theme";

// Body, UI, and headings — one clean humanist grotesque (not Geist/Inter; no
// serif). A utility reads as a utility: plain, fast, legible.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-sans-base",
  subsets: ["latin"],
  display: "swap",
});

// Figures — tabular mono for stats, deadlines, salary, counts.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-base",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "JobHunter",
  description:
    "Find the UK employers who will actually sponsor your Skilled Worker visa — and track every application in one calm dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${hankenGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Set the theme class before first paint to avoid a flash of the
            wrong theme. suppressHydrationWarning above covers the resulting
            server/client class mismatch on <html>. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
