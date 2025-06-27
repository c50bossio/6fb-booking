'use client'

import React, { useState, useRef, useEffect } from 'react'
import { X, Lock } from 'lucide-react'

interface PINEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onAuthenticate: (barberId: number, pin: string) => Promise<void>
  barbers: Array<{ id: number; name: string }>
}

export function PINEntryModal({ isOpen, onClose, onAuthenticate, barbers }: PINEntryModalProps) {
  const [selectedBarber, setSelectedBarber] = useState<number | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const pinInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && selectedBarber !== null && pinInputRef.current) {
      pinInputRef.current.focus()
    }
  }, [isOpen, selectedBarber])

  const handleBarberSelect = (barberId: number) => {
    setSelectedBarber(barberId)
    setPin('')
    setError('')
  }

  const handlePinChange = (value: string) => {
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setPin(value)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBarber || pin.length < 4) {
      setError('Please select a barber and enter a valid PIN')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await onAuthenticate(selectedBarber, pin)
    } catch (err) {
      setError('Invalid PIN. Please try again.')
      setPin('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNumberPadClick = (digit: string) => {
    if (digit === 'clear') {
      setPin('')
    } else if (digit === 'back') {
      setPin(prev => prev.slice(0, -1))
    } else {
      handlePinChange(pin + digit)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6" />
            Barber Login
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!selectedBarber ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Select Your Name</h3>
              <div className="grid grid-cols-2 gap-3">
                {barbers.map(barber => (
                  <button
                    key={barber.id}
                    onClick={() => handleBarberSelect(barber.id)}
                    className="p-4 text-center border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors font-medium"
                  >
                    {barber.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">
                  {barbers.find(b => b.id === selectedBarber)?.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedBarber(null)}
                  className="text-sm text-blue-600 hover:underline mt-1"
                >
                  Change barber
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter PIN
                </label>
                <input
                  ref={pinInputRef}
                  type="password"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  className="w-full px-4 py-3 text-center text-2xl tracking-widest border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="••••"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Touch-friendly number pad */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumberPadClick(num.toString())}
                    className="p-4 text-xl font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNumberPadClick('clear')}
                  className="p-4 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handleNumberPadClick('0')}
                  className="p-4 text-xl font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleNumberPadClick('back')}
                  className="p-4 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  ←
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || pin.length < 4}
                className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Authenticating...' : 'Login'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
