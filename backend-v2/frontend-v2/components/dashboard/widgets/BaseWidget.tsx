/**
 * Base Widget Component
 * 
 * Provides common functionality and styling for all dashboard widgets
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, Settings, Maximize2, Minimize2 } from 'lucide-react';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

interface BaseWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  showHeader?: boolean;
  showControls?: boolean;
  onRefresh?: () => void;
  onResize?: (size: WidgetSize) => void;
  onConfigure?: () => void;
  children: React.ReactNode;
}

const sizeClasses = {
  small: 'min-h-[200px]',
  medium: 'min-h-[300px]',
  large: 'min-h-[400px]',
  full: 'min-h-[500px]'
};

export function BaseWidget({
  id,
  title,
  size,
  isLoading = false,
  error = null,
  className = '',
  showHeader = true,
  showControls = false,
  onRefresh,
  onResize,
  onConfigure,
  children
}: BaseWidgetProps) {
  
  const handleResize = () => {
    if (!onResize) return;
    
    const sizeOrder: WidgetSize[] = ['small', 'medium', 'large', 'full'];
    const currentIndex = sizeOrder.indexOf(size);
    const nextIndex = (currentIndex + 1) % sizeOrder.length;
    onResize(sizeOrder[nextIndex]);
  };

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title}
          {error && (
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          )}
        </CardTitle>
        
        {showControls && (
          <div className="flex items-center space-x-1">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            
            {onResize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResize}
                className="h-6 w-6 p-0"
              >
                {size === 'small' ? (
                  <Maximize2 className="h-3 w-3" />
                ) : (
                  <Minimize2 className="h-3 w-3" />
                )}
              </Button>
            )}
            
            {onConfigure && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onConfigure}
                className="h-6 w-6 p-0"
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
    );
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <p className="text-sm text-gray-500">{error}</p>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="mt-2"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <div className="flex space-x-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      );
    }

    return children;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card className={`h-full ${sizeClasses[size]}`}>
        {renderHeader()}
        <CardContent className="pb-2">
          {renderContent()}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default BaseWidget;