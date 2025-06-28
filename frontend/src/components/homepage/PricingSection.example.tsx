// Example usage of the PricingSection component
// This shows how to integrate the component into your page

import PricingSection from './PricingSection';

// Simple usage example
export function PricingSectionExample() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Your other components above */}

      <PricingSection />

      {/* Your other components below */}
    </div>
  );
}

// Usage in a page component (like app/page.tsx)
export function HomePage() {
  return (
    <main>
      {/* Hero section */}
      <section className="hero">
        {/* Hero content */}
      </section>

      {/* Features section */}
      <section className="features">
        {/* Features content */}
      </section>

      {/* Pricing section - directly integrated */}
      <PricingSection />

      {/* Contact section */}
      <section className="contact">
        {/* Contact content */}
      </section>
    </main>
  );
}

export default PricingSectionExample;
