'use client'

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import DemoModernSidebar from "@/components/DemoModernSidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <ThemeProvider>
      <div className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
          <DemoModernSidebar />
          <main className="flex-1 transition-all duration-300 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
