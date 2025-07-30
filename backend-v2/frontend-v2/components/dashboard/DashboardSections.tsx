/**
 * Dashboard Sections with Code Splitting
 * Each section is lazy loaded to improve initial page load
 */
import dynamic from 'next/dynamic';
import React, { Suspense } from 'react';

const SectionSkeleton = ({ title }: { title: string }) => (
  <div className="bg-white rounded-lg shadow p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
  </div>
);

// Lazy load dashboard sections
const BookingSection = dynamic(
  () => import('./sections/BookingSection').catch(() => ({ 
    default: () => <div className="p-4 text-center text-gray-500">Booking section unavailable</div> 
  })),
  {
    loading: () => <SectionSkeleton title="Bookings" />,
    ssr: false
  }
);

const RevenueSection = dynamic(
  () => import('./sections/RevenueSection').catch(() => ({ 
    default: () => <div className="p-4 text-center text-gray-500">Revenue section unavailable</div> 
  })),
  {
    loading: () => <SectionSkeleton title="Revenue" />,
    ssr: false
  }
);

const ClientSection = dynamic(
  () => import('./sections/ClientSection').catch(() => ({ 
    default: () => <div className="p-4 text-center text-gray-500">Client section unavailable</div> 
  })),
  {
    loading: () => <SectionSkeleton title="Clients" />,
    ssr: false
  }
);

const AnalyticsSection = dynamic(
  () => import('./sections/AnalyticsSection').catch(() => ({ 
    default: () => <div className="p-4 text-center text-gray-500">Analytics section unavailable</div> 
  })),
  {
    loading: () => <SectionSkeleton title="Analytics" />,
    ssr: false
  }
);

interface DashboardSectionsProps {
  activeSection?: string;
  userRole?: string;
}

export const DashboardSections: React.FC<DashboardSectionsProps> = ({ 
  activeSection = 'bookings',
  userRole = 'barber'
}) => {
  const renderSection = () => {
    switch (activeSection) {
      case 'bookings':
        return <BookingSection userRole={userRole} />;
      case 'revenue':
        return <RevenueSection userRole={userRole} />;
      case 'clients':
        return <ClientSection userRole={userRole} />;
      case 'analytics':
        return <AnalyticsSection userRole={userRole} />;
      default:
        return <BookingSection userRole={userRole} />;
    }
  };

  return (
    <Suspense fallback={<SectionSkeleton title={activeSection} />}>
      <div className="space-y-6">
        {renderSection()}
      </div>
    </Suspense>
  );
};

export default DashboardSections;