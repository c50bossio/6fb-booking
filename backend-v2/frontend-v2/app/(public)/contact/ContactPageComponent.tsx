'use client'

import React, { useState } from 'react'
import { Button, Input, Textarea } from '@/components/ui'

interface ContactForm {
  name: string
  email: string
  phone: string
  subject: string
  inquiryType: string
  message: string
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
}

const ContactPageComponent = () => {
  const [formData, setFormData] = useState<ContactForm>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    inquiryType: 'general',
    message: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const inquiryTypes = [
    { value: 'general', label: 'General Support' },
    { value: 'sales', label: 'Sales Inquiries' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'billing', label: 'Billing Questions' },
    { value: 'partnership', label: 'Partnership Opportunities' },
    { value: 'media', label: 'Media & Press' }
  ]

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required'
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required'
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Here you would typically send the form data to your backend
      console.log('Contact form submitted:', formData)
      
      setIsSubmitted(true)
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        inquiryType: 'general',
        message: ''
      })
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof ContactForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Page Header */}
      <div className="rounded-lg border bg-white shadow-sm p-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Contact Us</h1>
          <p className="text-lg text-gray-600">
            Get in touch with our team - we're here to help you succeed
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white shadow-sm p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Send us a Message</h2>
                <p className="text-gray-600">
                  Fill out the form below and we'll get back to you within 24 hours.
                </p>
              </div>

              {isSubmitted ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <div className="w-12 h-12 text-green-500 mx-auto mb-4">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-green-800 mb-2">Message Sent Successfully!</h3>
                  <p className="text-green-700">
                    Thank you for contacting us. We'll review your message and get back to you within 24 hours.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setIsSubmitted(false)}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Contact Information */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Full Name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      error={errors.name}
                      placeholder="Enter your full name"
                      required
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      error={errors.email}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>

                  {/* Phone and Inquiry Type */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Phone Number (Optional)"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Inquiry Type
                      </label>
                      <select
                        value={formData.inquiryType}
                        onChange={(e) => handleInputChange('inquiryType', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors"
                      >
                        {inquiryTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject */}
                  <Input
                    label="Subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    error={errors.subject}
                    placeholder="Brief description of your inquiry"
                    required
                  />

                  {/* Message */}
                  <Textarea
                    label="Message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    error={errors.message}
                    placeholder="Please provide detailed information about your inquiry..."
                    rows={5}
                    required
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    fullWidth
                    loading={isSubmitting}
                    loadingText="Sending..."
                    className="mt-6"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information Sidebar */}
        <div className="space-y-6">
          {/* Quick Contact */}
          <div className="rounded-lg border bg-white shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Contact</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-blue-500 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <a href="mailto:support@bookedbarber.com" className="text-blue-600 hover:underline">
                    support@bookedbarber.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-blue-500 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Phone</p>
                  <a href="tel:+1-555-BARBER-1" className="text-blue-600 hover:underline">
                    +1 (555) BARBER-1
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-blue-500 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-gray-600">
                    123 Business Avenue<br />
                    Suite 456<br />
                    New York, NY 10001
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div className="rounded-lg border bg-white shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Business Hours</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Monday - Friday</span>
                <span className="font-medium">9:00 AM - 6:00 PM EST</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Saturday</span>
                <span className="font-medium">10:00 AM - 4:00 PM EST</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sunday</span>
                <span className="font-medium">Closed</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>24/7 Emergency Support</strong><br />
                Critical issues only: emergency@bookedbarber.com
              </p>
            </div>
          </div>

          {/* Specialized Support */}
          <div className="rounded-lg border bg-white shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Specialized Support</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-blue-600">Sales Inquiries</h4>
                <p className="text-sm text-gray-600">sales@bookedbarber.com</p>
                <p className="text-sm text-gray-600">For pricing, demos, and new accounts</p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-600">Technical Support</h4>
                <p className="text-sm text-gray-600">tech@bookedbarber.com</p>
                <p className="text-sm text-gray-600">API issues, integrations, bugs</p>
              </div>
              
              <div>
                <h4 className="font-medium text-purple-600">Billing Support</h4>
                <p className="text-sm text-gray-600">billing@bookedbarber.com</p>
                <p className="text-sm text-gray-600">Payments, invoices, subscriptions</p>
              </div>
              
              <div>
                <h4 className="font-medium text-orange-600">Partnership Opportunities</h4>
                <p className="text-sm text-gray-600">partnerships@bookedbarber.com</p>
                <p className="text-sm text-gray-600">Business collaborations</p>
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className="rounded-lg border bg-white shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Response Times</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">General Support</p>
                  <p className="text-xs text-gray-600">Within 4-6 hours</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Technical Issues</p>
                  <p className="text-xs text-gray-600">Within 2-4 hours</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Critical Issues</p>
                  <p className="text-xs text-gray-600">Within 1 hour</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Sales Inquiries</p>
                  <p className="text-xs text-gray-600">Within 24 hours</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="rounded-lg border bg-blue-50 border-blue-200 p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-blue-800 mb-2">
            Need Immediate Help?
          </h3>
          <p className="text-blue-700 mb-4">
            Check out our comprehensive documentation and FAQ section for instant answers to common questions.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" href="/documentation">
              View Documentation
            </Button>
            <Button variant="outline" href="/faq">
              Browse FAQ
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContactPageComponent