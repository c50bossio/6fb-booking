'use client'

import { ThemeProvider } from "@/contexts/ThemeContext";
import DemoModernSidebar from "@/components/DemoModernSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <DemoModernSidebar />
        <main className="flex-1 transition-all duration-300 overflow-y-auto">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
