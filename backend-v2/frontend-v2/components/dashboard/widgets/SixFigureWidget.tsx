/**
 * SixFigureWidget Component - Placeholder Implementation
 */

'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';
import { BaseWidget, WidgetSize } from './BaseWidget';

interface SixFigureWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  data?: any;
  config?: any;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function SixFigureWidget(props: SixFigureWidgetProps) {
  return (
    <BaseWidget {...props}>
      <div className="text-center py-8">
        <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">Six Figure metrics coming soon</p>
      </div>
    </BaseWidget>
  );
}