import React from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { useResponsive } from '@/hooks/useResponsive'
import { cn } from '@/lib/utils'

interface Column<T> {
  header: string
  accessor: keyof T | ((item: T) => React.ReactNode)
  className?: string
  mobileLabel?: string // Label to show in mobile view
  hiddenOnMobile?: boolean // Hide this column in mobile view
  priority?: number // Higher priority columns show first on mobile
}

interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T, index: number) => string | number
  className?: string
  emptyMessage?: string
  loading?: boolean
  expandable?: boolean // Enable expandable rows on mobile
  renderExpandedContent?: (item: T) => React.ReactNode
  onRowClick?: (item: T) => void
  rowClassName?: (item: T) => string
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  className = '',
  emptyMessage = 'No data available',
  loading = false,
  expandable = false,
  renderExpandedContent,
  onRowClick,
  rowClassName
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet } = useResponsive()
  const [expandedRows, setExpandedRows] = React.useState<Set<string | number>>(new Set())
  
  const toggleRow = (key: string | number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedRows(newExpanded)
  }
  
  const getCellValue = (item: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(item)
    }
    return item[column.accessor] as React.ReactNode
  }
  
  // Sort columns by priority for mobile view
  const mobileColumns = columns
    .filter(col => !col.hiddenOnMobile)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
  
  if (loading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }
  
  if (data.length === 0) {
    return (
      <div className={cn("text-center py-12 text-gray-500 dark:text-gray-400", className)}>
        {emptyMessage}
      </div>
    )
  }
  
  // Mobile card view
  if (isMobile || isTablet) {
    return (
      <div className={cn("space-y-4", className)}>
        {data.map((item, index) => {
          const key = keyExtractor(item, index)
          const isExpanded = expandedRows.has(key)
          const itemRowClassName = rowClassName ? rowClassName(item) : ''
          
          return (
            <div
              key={key}
              className={cn(
                "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden",
                onRowClick && "cursor-pointer hover:shadow-md transition-shadow",
                itemRowClassName
              )}
              onClick={() => onRowClick?.(item)}
            >
              <div className="p-4">
                {/* Main content */}
                <div className="space-y-2">
                  {mobileColumns.slice(0, 3).map((column, colIndex) => {
                    const value = getCellValue(item, column)
                    const label = column.mobileLabel || column.header
                    
                    return (
                      <div key={colIndex} className="flex justify-between items-start">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {label}:
                        </span>
                        <span className={cn("text-sm text-right ml-2", column.className)}>
                          {value}
                        </span>
                      </div>
                    )
                  })}
                </div>
                
                {/* Expandable content */}
                {expandable && mobileColumns.length > 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleRow(key)
                    }}
                    className="mt-3 w-full flex items-center justify-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUpIcon className="w-4 h-4 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon className="w-4 h-4 mr-1" />
                        Show more
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
                  {mobileColumns.slice(3).map((column, colIndex) => {
                    const value = getCellValue(item, column)
                    const label = column.mobileLabel || column.header
                    
                    return (
                      <div key={colIndex} className="flex justify-between items-start mb-2 last:mb-0">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {label}:
                        </span>
                        <span className={cn("text-sm text-right ml-2", column.className)}>
                          {value}
                        </span>
                      </div>
                    )
                  })}
                  
                  {renderExpandedContent && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      {renderExpandedContent(item)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }
  
  // Desktop table view
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={cn(
                  "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider",
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, index) => {
            const key = keyExtractor(item, index)
            const itemRowClassName = rowClassName ? rowClassName(item) : ''
            
            return (
              <tr
                key={key}
                className={cn(
                  onRowClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                  itemRowClassName
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column, colIndex) => {
                  const value = getCellValue(item, column)
                  
                  return (
                    <td
                      key={colIndex}
                      className={cn(
                        "px-6 py-4 whitespace-nowrap text-sm",
                        column.className
                      )}
                    >
                      {value}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Helper components for common table cell types
export function StatusBadge({ 
  status, 
  variant 
}: { 
  status: string
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default'
}) {
  const variantClasses = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
  
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      variantClasses[variant || 'default']
    )}>
      {status}
    </span>
  )
}

export function ActionButtons({
  actions
}: {
  actions: Array<{
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger'
    icon?: React.ReactNode
  }>
}) {
  return (
    <div className="flex items-center space-x-2">
      {actions.map((action, index) => {
        const variantClasses = {
          primary: 'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300',
          secondary: 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
          danger: 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
        }
        
        return (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation()
              action.onClick()
            }}
            className={cn(
              "text-sm font-medium transition-colors",
              variantClasses[action.variant || 'primary']
            )}
          >
            {action.icon && <span className="inline-block mr-1">{action.icon}</span>}
            {action.label}
          </button>
        )
      })}
    </div>
  )
}