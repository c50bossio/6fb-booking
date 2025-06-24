'use client'

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import DemoModernSidebar from "@/components/DemoModernSidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <ThemeProvider>
      <div className={`${inter.variable} ${jetbrainsMono.variable} antialiased min-h-screen`}>
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
