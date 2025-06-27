import { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

/**
 * Dashboard layout - simplified since ConditionalLayout in root layout
 * now handles sidebar rendering for dashboard routes automatically.
 * This layout just passes through children.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <>{children}</>;
}
