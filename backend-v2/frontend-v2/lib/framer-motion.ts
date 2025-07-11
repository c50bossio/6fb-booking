// Framer Motion fallback for web
import React from 'react';

// Basic motion component fallback
export const motion = {
  div: React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>((props, ref) => 
    React.createElement('div', { ...props, ref })
  ),
  span: React.forwardRef<HTMLSpanElement, React.ComponentProps<'span'>>((props, ref) => 
    React.createElement('span', { ...props, ref })
  ),
  button: React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>((props, ref) => 
    React.createElement('button', { ...props, ref })
  )
};

// Basic animation utilities
export const AnimatePresence = ({ children }: { children: React.ReactNode }) => 
  React.createElement('div', {}, children);

export const useAnimation = () => ({
  start: () => {},
  stop: () => {},
  set: () => {}
});

export const useSpring = (config: any) => config;

export const useTransform = (value: any, input: any, output: any) => value;