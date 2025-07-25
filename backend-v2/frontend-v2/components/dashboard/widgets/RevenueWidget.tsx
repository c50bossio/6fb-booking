/**
 * Revenue Widget Component
 * 
 * Displays revenue metrics, trends, and Six Figure Barber progress
 */

'use client';

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar } from 'lucide-react';
import { BaseWidget, WidgetSize } from './BaseWidget';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface RevenueData {
  current: number;
  previous: number;
  target?: number;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  currency: string;
  breakdown?: {
    services: number;
    tips: number;
    products: number;
  };
  sixFigureProgress?: {
    annual: number;
    target: number;
    monthlyAverage: number;
    onTrack: boolean;
  };
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

interface RevenueWidgetProps {
  id: string;
  title: string;
  size: WidgetSize;
  data: RevenueData;
  config: {
    period?: string;
    showGoals?: boolean;
    showComparison?: boolean;
    showForecast?: boolean;
    showMultiLocation?: boolean;
  };
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export function RevenueWidget({
  id,
  title,
  size,
  data,
  config,
  isLoading,
  error,
  className
}: RevenueWidgetProps) {
  
  const metrics = useMemo(() => {
    if (!data) return null;

    const changeAmount = data.current - data.previous;
    const changePercentage = data.previous > 0 
      ? (changeAmount / data.previous) * 100 
      : 0;

    const targetProgress = data.target 
      ? (data.current / data.target) * 100 
      : 0;

    return {
      changeAmount,
      changePercentage,
      targetProgress,
      isPositive: changeAmount >= 0
    };
  }, [data]);

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const renderCompactView = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="text-2xl font-bold">
            {formatCurrency(data.current, data.currency)}
          </span>
        </div>
        
        {metrics && (
          <div className="flex items-center space-x-1">
            {metrics.isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              metrics.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(metrics.changePercentage)}
            </span>
          </div>
        )}
      </div>

      {data.target && metrics && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Target Progress</span>
            <span>{formatPercentage(metrics.targetProgress)}</span>
          </div>
          <Progress value={metrics.targetProgress} className="h-2" />
        </div>
      )}
    </div>
  );

  const renderDetailedView = () => (
    <div className="space-y-4">
      {/* Main metric */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <DollarSign className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-500 capitalize">
              {data.period}ly Revenue
            </span>
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(data.current, data.currency)}
          </div>
        </div>

        {metrics && (
          <div className="text-right">
            <div className="flex items-center space-x-1 mb-1">
              {metrics.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                metrics.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercentage(metrics.changePercentage)}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              vs previous {data.period}
            </div>
          </div>
        )}
      </div>

      {/* Target progress */}
      {data.target && metrics && config.showGoals && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium">Target</span>
            </div>
            <span className="text-sm text-gray-500">
              {formatCurrency(data.target, data.currency)}
            </span>
          </div>
          <Progress value={metrics.targetProgress} className="h-2" />
          <div className="text-xs text-gray-500 text-center">
            {formatCurrency(data.current - data.target, data.currency)} 
            {data.current >= data.target ? ' above' : ' to go'}
          </div>
        </div>
      )}

      {/* Revenue breakdown */}
      {data.breakdown && size !== 'small' && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t">
          <div className="text-center">
            <div className="text-sm font-medium">
              {formatCurrency(data.breakdown.services, data.currency)}
            </div>
            <div className="text-xs text-gray-500">Services</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">
              {formatCurrency(data.breakdown.tips, data.currency)}
            </div>
            <div className="text-xs text-gray-500">Tips</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium">
              {formatCurrency(data.breakdown.products, data.currency)}
            </div>
            <div className="text-xs text-gray-500">Products</div>
          </div>
        </div>
      )}

      {/* Six Figure Barber progress */}
      {data.sixFigureProgress && config.showGoals && size !== 'small' && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Six Figure Progress</span>
            <Badge variant={data.sixFigureProgress.onTrack ? 'default' : 'secondary'}>
              {data.sixFigureProgress.onTrack ? 'On Track' : 'Behind'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Annual Progress</span>
              <span>
                {formatCurrency(data.sixFigureProgress.annual, data.currency)} / 
                {formatCurrency(data.sixFigureProgress.target, data.currency)}
              </span>
            </div>
            <Progress 
              value={(data.sixFigureProgress.annual / data.sixFigureProgress.target) * 100} 
              className="h-2" 
            />
          </div>
          
          <div className="text-xs text-gray-500">
            Monthly Average: {formatCurrency(data.sixFigureProgress.monthlyAverage, data.currency)}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <BaseWidget
      id={id}
      title={title}
      size={size}
      isLoading={isLoading}
      error={error}
      className={className}
      showControls={true}
    >
      {size === 'small' ? renderCompactView() : renderDetailedView()}
    </BaseWidget>
  );
}

export default RevenueWidget;