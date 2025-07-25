/**
 * Goals Widget Component - Placeholder Implementation
 */

'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { BaseWidget, WidgetSize } from './BaseWidget';

interface GoalsWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  data?: any;
  config?: any;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function GoalsWidget(props: GoalsWidgetProps) {
  return (
    <BaseWidget {...props}>
      <div className="text-center py-8">
        <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">Goals tracking coming soon</p>
      </div>
    </BaseWidget>
  );
}
EOF < /dev/null