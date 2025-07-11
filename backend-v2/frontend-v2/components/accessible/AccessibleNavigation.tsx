'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useKeyboardNavigation, useAnnouncement, useSkipNavigation } from '@/hooks/useAccessibility'
import Link from 'next/link'
import { ChevronDown, Menu, X } from 'lucide-react'

// Skip to content link
export function SkipToContent({ contentId = 'main-content' }) {
  const { SkipLink } = useSkipNavigation()
  return <SkipLink href={`#${contentId}`}>Skip to main content</SkipLink>
}

// Accessible breadcrumb navigation
interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface AccessibleBreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function AccessibleBreadcrumbs({ items, className }: AccessibleBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          
          return (
            <li key={index} className="flex items-center">
              {item.href && !item.current ? (
                <Link
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-sm text-foreground"
                  aria-current={item.current ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              
              {!isLast && (
                <ChevronDown className="h-4 w-4 mx-2 rotate-270 text-muted-foreground" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Accessible tabs
interface Tab {
  id: string
  label: string
  content: React.ReactNode
  disabled?: boolean
}

interface AccessibleTabsProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
  onChange?: (tabId: string) => void
}

export function AccessibleTabs({ tabs, defaultTab, className, onChange }: AccessibleTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const tabListRef = useRef<HTMLDivElement>(null)
  const { announce } = useAnnouncement()
  
  const { focusedIndex } = useKeyboardNavigation(
    tabs.filter(tab => !tab.disabled),
    {
      onSelect: (tab) => handleTabChange(tab.id),
      orientation: 'horizontal',
    }
  )
  
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onChange?.(tabId)
    const tab = tabs.find(t => t.id === tabId)
    if (tab) {
      announce(`${tab.label} tab selected`)
    }
  }
  
  const activeTabIndex = tabs.findIndex(tab => tab.id === activeTab)
  
  return (
    <div className={className}>
      <div
        ref={tabListRef}
        role="tablist"
        className="flex border-b"
        aria-label="Tabs"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab
          const isFocused = focusedIndex === index
          
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-all relative',
                'hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                isActive
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground',
                tab.disabled && 'opacity-50 cursor-not-allowed',
                isFocused && 'ring-2 ring-ring ring-offset-2'
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          id={`tabpanel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeTab}
          tabIndex={0}
          className="py-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {tab.id === activeTab && tab.content}
        </div>
      ))}
    </div>
  )
}

// Accessible dropdown menu
interface MenuItem {
  id: string
  label: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  icon?: React.ReactNode
}

interface AccessibleDropdownProps {
  trigger: React.ReactNode
  items: MenuItem[]
  className?: string
}

export function AccessibleDropdown({ trigger, items, className }: AccessibleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { announce } = useAnnouncement()
  
  const { focusedIndex, setFocusedIndex } = useKeyboardNavigation(
    items.filter(item => !item.disabled),
    {
      onSelect: (item) => {
        if (item.onClick) {
          item.onClick()
          setIsOpen(false)
        }
      },
      onCancel: () => setIsOpen(false),
      orientation: 'vertical',
    }
  )
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      announce('Menu opened')
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, announce])
  
  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-haspopup="true"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1"
      >
        {trigger}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      
      {isOpen && (
        <div
          ref={dropdownRef}
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-56 bg-popover rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
        >
          {items.map((item, index) => {
            const isFocused = focusedIndex === index
            const Component = item.href ? Link : 'button'
            
            return (
              <Component
                key={item.id}
                href={item.href as string}
                role="menuitem"
                tabIndex={isFocused ? 0 : -1}
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.()
                  setIsOpen(false)
                }}
                onFocus={() => setFocusedIndex(index)}
                className={cn(
                  'flex items-center gap-2 w-full px-4 py-2 text-sm transition-colors',
                  'hover:bg-accent focus:bg-accent focus:outline-none',
                  item.disabled && 'opacity-50 cursor-not-allowed',
                  isFocused && 'bg-accent'
                )}
              >
                {item.icon}
                {item.label}
              </Component>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Accessible mobile navigation
interface MobileNavItem {
  label: string
  href: string
  current?: boolean
  children?: MobileNavItem[]
}

interface AccessibleMobileNavProps {
  items: MobileNavItem[]
  className?: string
}

export function AccessibleMobileNav({ items, className }: AccessibleMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const { announce, announceElement } = useAnnouncement()
  
  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    )
  }
  
  const handleToggle = () => {
    setIsOpen(!isOpen)
    announce(isOpen ? 'Navigation menu closed' : 'Navigation menu opened')
  }
  
  return (
    <>
      {announceElement}
      
      <div className={className}>
        <button
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
          onClick={handleToggle}
          className="p-2 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        
        <nav
          className={cn(
            'fixed inset-x-0 top-16 bg-background border-b transition-transform duration-300 z-40',
            isOpen ? 'translate-y-0' : '-translate-y-full'
          )}
          aria-label="Mobile navigation"
        >
          <ul className="py-4">
            {items.map((item) => (
              <li key={item.label}>
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleExpanded(item.label)}
                      aria-expanded={expandedItems.includes(item.label)}
                      className="flex items-center justify-between w-full px-4 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
                    >
                      <span className={cn(item.current && 'font-medium')}>
                        {item.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          expandedItems.includes(item.label) && 'rotate-180'
                        )}
                      />
                    </button>
                    
                    {expandedItems.includes(item.label) && (
                      <ul className="pl-4">
                        {item.children.map((child) => (
                          <li key={child.label}>
                            <Link
                              href={child.href}
                              aria-current={child.current ? 'page' : undefined}
                              className={cn(
                                'block px-4 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none',
                                child.current && 'font-medium'
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={item.current ? 'page' : undefined}
                    className={cn(
                      'block px-4 py-2 hover:bg-accent focus:bg-accent focus:outline-none',
                      item.current && 'font-medium'
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}