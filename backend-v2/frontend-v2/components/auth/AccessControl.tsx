import React from 'react'

interface AccessControlProps {
  requiredRole?: string
  requiredPermission?: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const AccessControl: React.FC<AccessControlProps> = ({ 
  requiredRole, 
  requiredPermission, 
  children, 
  fallback = null 
}) => {
  // For now, always show children since we don't have auth context
  // In a real implementation, this would check user permissions
  return <>{children}</>
}

// Export as default for compatibility
export default AccessControl