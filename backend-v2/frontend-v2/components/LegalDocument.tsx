'use client'

import React, { ReactNode } from 'react'
import { format } from 'date-fns'
import { Calendar, PrinterIcon, Download, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface LegalDocumentProps {
  title: string
  lastUpdated: Date
  effectiveDate?: Date
  icon?: ReactNode
  children: ReactNode
  printable?: boolean
  downloadable?: boolean
  relatedDocuments?: Array<{
    title: string
    href: string
    description?: string
  }>
  contactInfo?: {
    email?: string
    address?: string
    phone?: string
    dpo?: string
  }
}

interface LegalSectionProps {
  title: string
  children: ReactNode
  numbered?: boolean
  subsection?: boolean
}

export const LegalSection: React.FC<LegalSectionProps> = ({ 
  title, 
  children, 
  numbered = false, 
  subsection = false 
}) => {
  return (
    <Card className={`mb-6 ${subsection ? 'ml-4 border-l-4 border-blue-200' : ''}`}>
      <CardHeader className={subsection ? 'pb-3' : ''}>
        <CardTitle className={`${subsection ? 'text-lg' : 'text-xl'} text-gray-900`}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 prose prose-gray max-w-none">
        {children}
      </CardContent>
    </Card>
  )
}

interface LegalListProps {
  items: Array<string | ReactNode>
  ordered?: boolean
  className?: string
}

export const LegalList: React.FC<LegalListProps> = ({ 
  items, 
  ordered = false, 
  className = '' 
}) => {
  const ListComponent = ordered ? 'ol' : 'ul'
  const listClass = ordered 
    ? 'list-decimal list-inside space-y-2 ml-4' 
    : 'list-disc list-inside space-y-2 ml-4'

  return (
    <ListComponent className={`${listClass} ${className}`}>
      {items.map((item, index) => (
        <li key={index} className="text-sm">
          {typeof item === 'string' ? <span>{item}</span> : item}
        </li>
      ))}
    </ListComponent>
  )
}

interface ContactSectionProps {
  contactInfo: LegalDocumentProps['contactInfo']
}

export const ContactSection: React.FC<ContactSectionProps> = ({ contactInfo }) => {
  if (!contactInfo) return null

  return (
    <LegalSection title="Contact Information">
      <p>For questions about this document or to exercise your rights:</p>
      <div className="bg-gray-50 p-4 rounded-lg not-prose">
        {contactInfo.email && (
          <p><strong>Email:</strong> {contactInfo.email}</p>
        )}
        {contactInfo.dpo && (
          <p><strong>Data Protection Officer:</strong> {contactInfo.dpo}</p>
        )}
        {contactInfo.address && (
          <p><strong>Address:</strong> {contactInfo.address}</p>
        )}
        {contactInfo.phone && (
          <p><strong>Phone:</strong> {contactInfo.phone}</p>
        )}
      </div>
    </LegalSection>
  )
}

const LegalDocument: React.FC<LegalDocumentProps> = ({
  title,
  lastUpdated,
  effectiveDate,
  icon,
  children,
  printable = true,
  downloadable = false,
  relatedDocuments = [],
  contactInfo
}) => {
  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Convert document to PDF or downloadable format
    // This would typically use a library like jsPDF or similar
    console.log('Download functionality would be implemented here')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-8">
          {icon && (
            <div className="flex justify-center mb-4">
              {icon}
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
          
          {/* Document Meta Information */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Last updated: {format(lastUpdated, 'MMMM d, yyyy')}</span>
            </div>
            {effectiveDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Effective: {format(effectiveDate, 'MMMM d, yyyy')}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-2 mt-4">
            {printable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <PrinterIcon className="h-4 w-4" />
                Print
              </Button>
            )}
            {downloadable && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="legal-document-content">
          {children}
        </div>

        {/* Contact Information */}
        {contactInfo && <ContactSection contactInfo={contactInfo} />}

        {/* Related Documents */}
        {relatedDocuments.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Related Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {relatedDocuments.map((doc, index) => (
                  <a
                    key={index}
                    href={doc.href}
                    className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-primary">{doc.title}</div>
                    {doc.description && (
                      <div className="text-sm text-gray-600 mt-1">{doc.description}</div>
                    )}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Navigation */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-4">
              <a href="/terms" className="text-primary hover:underline text-sm">
                Terms of Service
              </a>
              <a href="/privacy" className="text-primary hover:underline text-sm">
                Privacy Policy
              </a>
              <a href="/cookies" className="text-primary hover:underline text-sm">
                Cookie Policy
              </a>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {format(lastUpdated, 'MMMM d, yyyy')}
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .legal-document-content {
            color: black;
            background: white;
          }
          
          .legal-document-content h1,
          .legal-document-content h2,
          .legal-document-content h3,
          .legal-document-content h4 {
            color: black;
            page-break-after: avoid;
          }
          
          .legal-document-content ul,
          .legal-document-content ol {
            page-break-inside: avoid;
          }
          
          .legal-document-content > div {
            page-break-inside: avoid;
          }
          
          body {
            font-size: 12pt;
            line-height: 1.4;
          }
          
          .container {
            max-width: none;
            margin: 0;
            padding: 0;
          }
          
          .bg-gray-50 {
            background: white !important;
          }
          
          .border {
            border: 1px solid #ddd !important;
          }
          
          .shadow-lg {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default LegalDocument