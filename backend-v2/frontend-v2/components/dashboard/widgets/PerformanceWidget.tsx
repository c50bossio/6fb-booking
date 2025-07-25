/**
 * PerformanceWidget Component - Placeholder Implementation
 */

'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { BaseWidget, WidgetSize } from './BaseWidget';

interface PerformanceWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  data?: any;
  config?: any;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function PerformanceWidget(props: PerformanceWidgetProps) {
  return (
    <BaseWidget {...props}>
      <div className="text-center py-8">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">Performance metrics coming soon</p>
      </div>
    </BaseWidget>
  );
}
