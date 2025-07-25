/**
 * MarketingWidget Component - Placeholder Implementation
 */

'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { BaseWidget, WidgetSize } from './BaseWidget';

interface MarketingWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  data?: any;
  config?: any;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function MarketingWidget(props: MarketingWidgetProps) {
  return (
    <BaseWidget {...props}>
      <div className="text-center py-8">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">Marketing analytics coming soon</p>
      </div>
    </BaseWidget>
  );
}
