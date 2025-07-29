import { useState, useEffect, useRef } from 'react'
import { 
  getServices, 
  getPublicServices, 
  getAllUsers,
  getBarbers,
  type Service, 
  type User 
} from '@/lib/api'

interface UseAppointmentServicesProps {
  isPublicBooking?: boolean
  cacheEnabled?: boolean
  cacheDuration?: number
  isDemo?: boolean
}

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function useAppointmentServices({
  isPublicBooking = false,
  cacheEnabled = true,
  cacheDuration = DEFAULT_CACHE_DURATION,
  isDemo = false
}: UseAppointmentServicesProps = {}) {
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<User[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingBarbers, setLoadingBarbers] = useState(false)
  const [servicesError, setServicesError] = useState<string | null>(null)
  const [barbersError, setBarbersError] = useState<string | null>(null)

  // Cache references
  const servicesCacheRef = useRef<{ services: Service[], timestamp: number } | null>(null)
  const barbersCacheRef = useRef<{ barbers: User[], timestamp: number } | null>(null)

  // Load services
  const loadServices = async () => {
    // Check cache first
    if (cacheEnabled && servicesCacheRef.current) {
      const { services: cachedServices, timestamp } = servicesCacheRef.current
      const now = Date.now()
      if (now - timestamp < cacheDuration) {
        setServices(cachedServices)
        return
      }
    }
    
    try {
      setLoadingServices(true)
      setServicesError(null)
      let response: Service[]
      
      if (isPublicBooking) {
        // For public booking, always use public endpoint
        response = await getPublicServices()
      } else {
        // Try authenticated endpoint first
        try {
          response = await getServices()
        } catch (authError: any) {
          // If authentication fails, try public endpoint
          if (authError.status === 401 || authError.message?.includes('401')) {
            response = await getPublicServices()
          } else {
            throw authError
          }
        }
      }
      
      setServices(response)
      
      // Cache the services
      if (cacheEnabled) {
        servicesCacheRef.current = {
          services: response,
          timestamp: Date.now()
        }
      }
    } catch (err: any) {
      console.error('Failed to load services:', err)
      
      // Provide more specific error messages
      if (err.message?.includes('Network') || err.message?.includes('Failed to connect')) {
        setServicesError('Unable to connect to server. Please check your connection.')
      } else if (err.response?.status === 404) {
        setServicesError('Services endpoint not found.')
      } else {
        setServicesError('Failed to load services. Please try again.')
      }
    } finally {
      setLoadingServices(false)
    }
  }

  // Load barbers
  const loadBarbers = async () => {
    // Check cache first
    if (cacheEnabled && barbersCacheRef.current) {
      const { barbers: cachedBarbers, timestamp } = barbersCacheRef.current
      const now = Date.now()
      if (now - timestamp < cacheDuration) {
        setBarbers(cachedBarbers)
        return
      }
    }

    try {
      setLoadingBarbers(true)
      setBarbersError(null)
      let response: User[]
      
      // Try authenticated endpoint first (for consistency)
      try {
        response = await getAllUsers('barber')
      } catch (authError: any) {
        // If authentication fails, fall back to public barbers endpoint
        if (authError.status === 401 || authError.status === 403) {
          response = await getBarbers()
        } else {
          throw authError
        }
      }
      
      setBarbers(response)
      
      // Cache the barbers
      if (cacheEnabled) {
        barbersCacheRef.current = {
          barbers: response,
          timestamp: Date.now()
        }
      }
    } catch (err: any) {
      console.error('Failed to load barbers:', err)
      setBarbersError('Failed to load barbers')
      // Don't show error for barbers loading as it's not critical
    } finally {
      setLoadingBarbers(false)
    }
  }

  // Clear caches
  const clearCache = () => {
    servicesCacheRef.current = null
    barbersCacheRef.current = null
  }

  // Reload all data
  const reload = async () => {
    clearCache()
    await Promise.all([loadServices(), loadBarbers()])
  }

  // Load data on mount (skip in demo mode)
  useEffect(() => {
    if (!isDemo) {
      loadServices()
      loadBarbers()
    }
  }, [isPublicBooking, isDemo])

  return {
    services,
    barbers,
    loadingServices,
    loadingBarbers,
    servicesError,
    barbersError,
    reload,
    clearCache
  }
}