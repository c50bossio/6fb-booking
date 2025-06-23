'use client'

import DemoModernSidebar from "@/components/DemoModernSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Since ClientOnly is already in the root layout, we don't need another mounting check
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar with explicit visibility */}
      <DemoModernSidebar />
      <main className="flex-1 transition-all duration-300 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
