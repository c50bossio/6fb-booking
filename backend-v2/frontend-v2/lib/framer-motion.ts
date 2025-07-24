// Framer Motion fallback for web
import React from 'react';

// Basic motion component fallback with animation prop support
export const motion = {
  div: React.forwardRef<HTMLDivElement, React.ComponentProps<'div'> & {
    initial?: any;
    animate?: any;
    exit?: any;
    variants?: any;
    transition?: any;
    whileHover?: any;
    whileTap?: any;
    drag?: any;
    dragConstraints?: any;
    dragElastic?: any;
    onDrag?: any;
    onDragEnd?: any;
    onDragStart?: any;
  }>((props, ref) => {
    const { initial, animate, exit, variants, transition, whileHover, whileTap, drag, dragConstraints, dragElastic, onDrag, onDragEnd, onDragStart, ...htmlProps } = props;
    return React.createElement('div', { ...htmlProps, ref });
  }),
  span: React.forwardRef<HTMLSpanElement, React.ComponentProps<'span'> & {
    initial?: any;
    animate?: any;
    exit?: any;
    variants?: any;
  }>((props, ref) => {
    const { initial, animate, exit, variants, ...htmlProps } = props;
    return React.createElement('span', { ...htmlProps, ref });
  }),
  button: React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'> & {
    initial?: any;
    animate?: any;
    exit?: any;
    variants?: any;
    whileHover?: any;
    whileTap?: any;
  }>((props, ref) => {
    const { initial, animate, exit, variants, whileHover, whileTap, ...htmlProps } = props;
    return React.createElement('button', { ...htmlProps, ref });
  })
};

// Basic animation utilities
export const AnimatePresence = ({ children }: { children: React.ReactNode }) => 
  React.createElement('div', {}, children);

export const useAnimation = () => ({
  start: (config?: any) => {},
  stop: () => {},
  set: (config?: any) => {}
});

export const useSpring = (config: any) => config;

export const useTransform = (value: any, input: any, output: any) => value;

// Types for compatibility
export interface PanInfo {
  point: { x: number; y: number };
  delta: { x: number; y: number };
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
}