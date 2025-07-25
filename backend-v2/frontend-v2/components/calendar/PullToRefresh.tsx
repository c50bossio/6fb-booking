/**
 * Pull to Refresh Component
 * Native-like pull-to-refresh functionality for mobile calendar
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  onRefresh,
  isRefreshing,
  children,
  threshold = 60,
  className = ''
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    
    // Apply resistance effect
    const resistance = distance < threshold ? distance : threshold + (distance - threshold) * 0.5;
    
    setPullDistance(resistance);
    setCanRefresh(distance >= threshold);
    
    // Prevent default scrolling when pulling
    if (distance > 0) {
      e.preventDefault();
    }
  }, [isPulling, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (canRefresh && !isRefreshing) {
      // Trigger haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
    }
    
    setPullDistance(0);
    setCanRefresh(false);
  }, [isPulling, canRefresh, isRefreshing, onRefresh]);

  const getRefreshIcon = () => {
    if (isRefreshing) {
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="h-5 w-5 text-blue-600" />
        </motion.div>
      );
    }
    
    if (canRefresh) {
      return <RefreshCw className="h-5 w-5 text-blue-600" />;
    }
    
    return <ArrowDown className="h-5 w-5 text-gray-400" />;
  };

  const getRefreshText = () => {
    if (isRefreshing) return 'Refreshing...';
    if (canRefresh) return 'Release to refresh';
    return 'Pull to refresh';
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
        transition: isPulling ? 'none' : 'transform 0.3s ease-out'
      }}
    >
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10"
            style={{ 
              height: Math.max(pullDistance, isRefreshing ? 60 : 0),
              marginTop: -60
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col items-center space-y-2">
              {getRefreshIcon()}
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {getRefreshText()}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}