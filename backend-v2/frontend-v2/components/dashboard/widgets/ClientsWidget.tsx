/**
 * Clients Widget Component - Placeholder Implementation
 */

'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { BaseWidget, WidgetSize } from './BaseWidget';

interface ClientsWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  data?: any;
  config?: any;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function ClientsWidget(props: ClientsWidgetProps) {
  return (
    <BaseWidget {...props}>
      <div className="text-center py-8">
        <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">Client metrics coming soon</p>
      </div>
    </BaseWidget>
  );
}