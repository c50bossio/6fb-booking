import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Book Appointment - Booked Barber',
  description: 'Book your appointment with professional barbers',
}

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}