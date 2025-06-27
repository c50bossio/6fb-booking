import { useState, useEffect } from 'react'

export interface LocationPaymentSettings {
  pay_in_person_enabled: boolean
  pay_in_person_message?: string
  accepts_cash: boolean
  accepts_credit_card: boolean
  accepts_digital_wallet: boolean
  requires_deposit: boolean
  deposit_percentage?: number
  deposit_fixed_amount?: number
}

export function useLocationPaymentSettings(locationId?: number) {
  const [settings, setSettings] = useState<LocationPaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId) {
      setLoading(false)
      return
    }

    const fetchSettings = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/v1/booking/public/shops/${locationId}/payment-settings`)

        if (!response.ok) {
          throw new Error('Failed to fetch payment settings')
        }

        const data = await response.json()
        setSettings(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        // Set default settings if fetch fails
        setSettings({
          pay_in_person_enabled: true,
          pay_in_person_message: 'Pay when you arrive at the shop',
          accepts_cash: true,
          accepts_credit_card: true,
          accepts_digital_wallet: true,
          requires_deposit: false,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [locationId])

  return { settings, loading, error }
}
