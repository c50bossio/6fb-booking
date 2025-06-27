import { ReactNode } from 'react';

interface BarbersLayoutProps {
  children: ReactNode;
}

/**
 * Barbers layout - simplified since ConditionalLayout in root layout
 * now handles sidebar rendering for dashboard routes automatically.
 * This layout just passes through children.
 */
export default function BarbersLayout({ children }: BarbersLayoutProps) {
  return <>{children}</>;
}
