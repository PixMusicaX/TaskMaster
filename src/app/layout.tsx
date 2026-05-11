import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-clip`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col transition-colors duration-300 overflow-x-clip">
        <ThemeProvider>
          <div className="overflow-x-clip w-full relative flex flex-col flex-1 min-h-full">
            <ClassWatermark />
            <SwipeNav />
            <Navbar />
            <main className="flex-1 overflow-auto relative pb-24 lg:pb-0">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
