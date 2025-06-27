import { ReactNode } from 'react';
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * App layout - simplified since ConditionalLayout in root layout
 * now handles sidebar rendering for dashboard routes automatically.
 * This layout preserves the specific font configuration for the /app route.
 */
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
      {children}
    </div>
  );
}
