/**
 * Hook for customer booking integration
 */
import { useState } from 'react'
import { useCustomerAuth } from '@/components/customer/CustomerAuthProvider'
import { customerAuthService } from '@/lib/api/customer-auth'

interface GuestBookingData {
  firstName: string
  lastName: string
  email: string
  phone: string
  createAccount?: boolean
  password?: string
}

interface BookingData {
  barberId: string
  serviceId: string
  date: string
  time: string
  locationId: string
  notes?: string
}

export function useCustomerBooking() {
  const { customer, isAuthenticated } = useCustomerAuth()
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  const processBooking = async (bookingData: BookingData, guestData?: GuestBookingData) => {
    if (isAuthenticated) {
      // Customer is logged in, process booking directly
      return processAuthenticatedBooking(bookingData)
    } else {
      // Guest booking
      return processGuestBooking(bookingData, guestData!)
    }
  }

  const processAuthenticatedBooking = async (bookingData: BookingData) => {
    // TODO: Implement authenticated booking API call
    console.log('Processing authenticated booking:', bookingData)

    // This would make an API call to create the booking for the logged-in customer
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerAuthService.getToken()}`
      },
      body: JSON.stringify({
        ...bookingData,
        customerId: customer?.id
      })
    })

    if (!response.ok) {
      throw new Error('Failed to create booking')
    }

    return response.json()
  }

  const processGuestBooking = async (bookingData: BookingData, guestData: GuestBookingData) => {
    console.log('Processing guest booking:', bookingData, guestData)

    // If guest wants to create an account, do that first
    if (guestData.createAccount && guestData.password) {
      try {
        setIsCreatingAccount(true)

        // Create customer account
        await customerAuthService.register({
          email: guestData.email,
          password: guestData.password,
          first_name: guestData.firstName,
          last_name: guestData.lastName,
          phone: guestData.phone,
          newsletter_subscription: true
        })

        // Login the customer
        await customerAuthService.login({
          email: guestData.email,
          password: guestData.password
        })

        setIsCreatingAccount(false)

        // Now process as authenticated booking
        return processAuthenticatedBooking(bookingData)
      } catch (error) {
        setIsCreatingAccount(false)
        throw error
      }
    } else {
      // Process as guest booking (create client record and booking)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/booking/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...bookingData,
          guestInfo: guestData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create guest booking')
      }

      return response.json()
    }
  }

  const suggestAccountCreation = (guestData: GuestBookingData) => {
    // After successful guest booking, suggest account creation
    return {
      email: guestData.email,
      firstName: guestData.firstName,
      lastName: guestData.lastName,
      phone: guestData.phone
    }
  }

  return {
    customer,
    isAuthenticated,
    isCreatingAccount,
    processBooking,
    suggestAccountCreation
  }
}
