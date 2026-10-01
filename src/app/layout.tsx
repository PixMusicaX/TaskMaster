import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { themeInitScript } from "@/lib/theme-init";
import Navbar from "@/components/navbar";
import SwipeNav from "@/components/swipe-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for headings and the clock
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TaskMaster - Your Personal Planner",
  description: "A feature-rich planner with habits, notes, and calendar.",
  manifest: "/manifest.json",
  icons: {
    apple: "/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import ClassWatermark from "@/components/class-watermark";
import EraAmbient from "@/components/era-ambient";
import { ProgressProvider } from "@/components/progress/progress-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased overflow-x-clip`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col transition-colors duration-300 overflow-x-clip">
        <ThemeProvider>
          <ProgressProvider>
            <div className="overflow-x-clip w-full relative flex flex-col flex-1 min-h-full">
              <EraAmbient />
              <ClassWatermark />
              <SwipeNav />
              <Navbar />
              {/* Clip, not auto: a scroll container here would stop position: sticky from pinning to the viewport */}
              <main className="flex-1 overflow-x-clip relative pb-24 lg:pb-0">
                {children}
              </main>
            </div>
          </ProgressProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
