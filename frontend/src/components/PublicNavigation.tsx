'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Menu,
  X,
  Scissors,
  Calendar,
  Phone,
  ChevronDown
} from 'lucide-react';

const navigationItems = [
  {
    name: 'Home',
    href: '/',
    description: 'Platform overview and features'
  },
  {
    name: 'About',
    href: '/about',
    description: 'Our story and mission'
  },
  {
    name: 'Services',
    href: '/services',
    description: 'Complete platform features and pricing'
  },
  {
    name: 'Locations',
    href: '/locations',
    description: 'Find partner barbershops near you'
  },
  {
    name: 'Blog',
    href: '/blog',
    description: 'Industry tips and business insights'
  },
  {
    name: 'Contact',
    href: '/contact',
    description: 'Get in touch with our team'
  }
];

const quickActions = [
  {
    name: 'Book Appointment',
    href: '/book',
    icon: Calendar,
    variant: 'default' as const,
    description: 'Schedule your next visit'
  },
  {
    name: 'For Barbershops',
    href: '/contact',
    icon: Scissors,
    variant: 'outline' as const,
    description: 'Join our platform'
  }
];

export default function PublicNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isMounted) return null;

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled
        ? 'bg-white/95 backdrop-blur-md shadow-md'
        : 'bg-white/90 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <BarChart3 className="h-8 w-8 text-blue-600 transition-transform group-hover:scale-110" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-gray-900">Six Figure Barber</span>
                <Badge variant="secondary" className="ml-2 text-xs">Platform</Badge>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-blue-100 text-blue-700 shadow-sm'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Quick Actions - Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.name}
                  asChild
                  variant={action.variant}
                  size="sm"
                  className={`transition-all duration-200 ${
                    action.variant === 'default'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
                      : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  <Link href={action.href} className="flex items-center">
                    <Icon className="h-4 w-4 mr-2" />
                    {action.name}
                  </Link>
                </Button>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isOpen && (
          <div className="lg:hidden absolute top-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
            <div className="px-4 py-6 space-y-4">
              {/* Mobile Navigation Items */}
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`block px-3 py-3 rounded-md text-base font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Mobile Quick Actions */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.name}
                      asChild
                      variant={action.variant}
                      className="w-full justify-start"
                      onClick={() => setIsOpen(false)}
                    >
                      <Link href={action.href} className="flex items-center">
                        <Icon className="h-4 w-4 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">{action.name}</div>
                          <div className="text-xs opacity-70">{action.description}</div>
                        </div>
                      </Link>
                    </Button>
                  );
                })}
              </div>

              {/* Mobile Contact Info */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center text-gray-600 mb-2">
                  <Phone className="h-4 w-4 mr-2" />
                  <span className="text-sm">Support: (555) BARBER-1</span>
                </div>
                <p className="text-xs text-gray-500">
                  Available Mon-Fri 9AM-6PM EST
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 lg:hidden"
          onClick={() => setIsOpen(false)}
          style={{ top: '4rem' }}
        />
      )}
    </nav>
  );
}
