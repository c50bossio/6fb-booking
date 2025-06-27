import { ReactNode } from 'react';

interface ClientsLayoutProps {
  children: ReactNode;
}

/**
 * Clients layout - simplified since ConditionalLayout in root layout
 * now handles sidebar rendering for dashboard routes automatically.
 * This layout just passes through children.
 */
export default function ClientsLayout({ children }: ClientsLayoutProps) {
  return <>{children}</>;
}
