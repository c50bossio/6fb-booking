/**
 * Auth migration utility for moving from localStorage to cookie-based auth
 */

import { smartStorage } from './storage'

export const authMigration = {
  migrate: () => {
    try {
      // Check if there's user data in localStorage that needs to be migrated
      const storedUser = smartStorage.getItem('user')
      const storedToken = smartStorage.getItem('access_token')

      if (storedUser && storedToken) {
        console.log('[AuthMigration] Found legacy auth data, migration may be needed')
        // Migration logic would go here if needed
        // For now, we'll just log that legacy data exists
      }
    } catch (error) {
      console.error('[AuthMigration] Migration failed:', error)
    }
  }
}

export default authMigration
