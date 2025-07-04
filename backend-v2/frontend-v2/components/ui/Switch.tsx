'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type SwitchSize = 'sm' | 'md' | 'lg';

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  size?: SwitchSize;
}

export function Switch({ 
  checked = false, 
  onCheckedChange, 
  disabled = false, 
  className,
  id,
  size = 'md'
}: SwitchProps) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleClick();
    }
  };

  // Size configurations
  const sizeConfigs = {
    sm: {
      switch: 'h-4 w-7',
      thumb: 'h-3 w-3',
      translate: 'translate-x-3'
    },
    md: {
      switch: 'h-6 w-11',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5'
    },
    lg: {
      switch: 'h-8 w-14',
      thumb: 'h-7 w-7',
      translate: 'translate-x-6'
    }
  };

  const config = sizeConfigs[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      id={id}
      className={cn(
        'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        config.switch,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked 
          ? 'bg-primary-500 dark:bg-primary-600' 
          : 'bg-gray-200 dark:bg-gray-700',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform',
          config.thumb,
          checked ? config.translate : 'translate-x-0'
        )}
      />
    </button>
  );
}