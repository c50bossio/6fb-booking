'use client';

import React from 'react';
import { EmbedCodeGenerator } from '../../components/booking/EmbedCodeGenerator';

export default function EmbedPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Embed Code Generator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Generate embed codes to add the 6FB booking widget to your barbershop website or any external site.
          </p>
        </div>

        <EmbedCodeGenerator
          barberId="sample-barber-id"
          serviceId="sample-service-id"
          locationId="sample-location-id"
        />
      </div>
    </div>
  );
}