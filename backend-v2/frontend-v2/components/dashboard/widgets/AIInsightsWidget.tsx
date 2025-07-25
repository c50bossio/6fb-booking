/**
 * AIInsightsWidget Component - Placeholder Implementation
 */

'use client';

import React from 'react';
import { Brain } from 'lucide-react';
import { BaseWidget, WidgetSize } from './BaseWidget';

interface AIInsightsWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  data?: any;
  config?: any;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function AIInsightsWidget(props: AIInsightsWidgetProps) {
  return (
    <BaseWidget {...props}>
      <div className="text-center py-8">
        <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">AI insights coming soon</p>
      </div>
    </BaseWidget>
  );
}