/**
 * QuickActionsWidget Component - Placeholder Implementation
 */

'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { BaseWidget, WidgetSize } from './BaseWidget';

interface QuickActionsWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  data?: any;
  config?: any;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function QuickActionsWidget(props: QuickActionsWidgetProps) {
  return (
    <BaseWidget {...props}>
      <div className="text-center py-8">
        <Zap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">Quick Actions coming soon</p>
      </div>
    </BaseWidget>
  );
}
