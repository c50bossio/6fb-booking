'use client'

import TestimonialsSection from '../TestimonialsSection'

/**
 * Example usage of the TestimonialsSection component
 *
 * This component can be easily integrated into any page by simply importing and using it.
 * It's fully self-contained with no external dependencies except for Heroicons.
 */
export default function TestimonialsSectionExample() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-center p-8">
        TestimonialsSection Component Example
      </h1>

      {/* The component is used exactly like this - no props needed */}
      <TestimonialsSection />

      <div className="bg-gray-100 p-8">
        <h2 className="text-2xl font-bold mb-4">Usage Notes:</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>No props required - all data is self-contained</li>
          <li>Fully responsive design with mobile-first approach</li>
          <li>CSS transitions for smooth hover effects (no framer-motion)</li>
          <li>TypeScript interfaces for type safety</li>
          <li>Reusable sub-components for maintainability</li>
          <li>Optimized for fast compilation and runtime performance</li>
        </ul>
      </div>
    </div>
  )
}
