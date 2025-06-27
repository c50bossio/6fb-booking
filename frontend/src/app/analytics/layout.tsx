import { ReactNode } from 'react';

interface AnalyticsLayoutProps {
  children: ReactNode;
}

/**
 * Analytics layout - simplified since ConditionalLayout in root layout
 * now handles sidebar rendering for dashboard routes automatically.
 * This layout just passes through children.
 */
export default function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  return <>{children}</>;
}
