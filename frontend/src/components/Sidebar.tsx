'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  ChartBarIcon,
  CreditCardIcon,
  BanknotesIcon,
  UserGroupIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  CalendarIcon as CalendarIconSolid,
  UsersIcon as UsersIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  CreditCardIcon as CreditCardIconSolid,
  BanknotesIcon as BanknotesIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  BellIcon as BellIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
} from '@heroicons/react/24/solid';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconActive: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    iconActive: HomeIconSolid,
  },
  {
    name: 'Appointments',
    href: '/appointments',
    icon: CalendarIcon,
    iconActive: CalendarIconSolid,
  },
  {
    name: 'Barbers',
    href: '/barbers',
    icon: UsersIcon,
    iconActive: UsersIconSolid,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    iconActive: ChartBarIconSolid,
  },
  {
    name: 'Payments',
    href: '/payments',
    icon: CreditCardIcon,
    iconActive: CreditCardIconSolid,
  },
  {
    name: 'Payouts',
    href: '/payouts',
    icon: BanknotesIcon,
    iconActive: BanknotesIconSolid,
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: UserGroupIcon,
    iconActive: UserGroupIconSolid,
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: BellIcon,
    iconActive: BellIconSolid,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
    iconActive: Cog6ToothIconSolid,
  },
];

interface SidebarProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-[#1a1a1a] border-r border-[#2a2a2a]">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-center border-b border-[#2a2a2a]">
        <h1 className="text-xl font-bold text-white">
          Booked <span className="text-blue-500">Barber</span>
        </h1>
      </div>

      {/* User Profile Section */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2a2a2a]">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span>{user?.name?.charAt(0) || 'U'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {user?.name || 'User'}
          </p>
          <p className="text-xs text-[#a0a0a0] truncate">
            {user?.email || 'user@example.com'}
          </p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = isActive ? item.iconActive : item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'text-[#a0a0a0] hover:bg-[#242424] hover:text-white'
                    }
                  `}
                >
                  <Icon
                    className={`h-5 w-5 transition-colors duration-200 ${
                      isActive ? 'text-blue-500' : 'text-[#a0a0a0] group-hover:text-white'
                    }`}
                  />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="border-t border-[#2a2a2a] p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#a0a0a0] transition-all duration-200 hover:bg-[#242424] hover:text-white"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>

      {/* Bottom Brand Mark */}
      <div className="px-4 py-3 border-t border-[#2a2a2a]">
        <p className="text-xs text-[#666666] text-center">
          Powered by Six Figure Barber
        </p>
      </div>
    </div>
  );
}
