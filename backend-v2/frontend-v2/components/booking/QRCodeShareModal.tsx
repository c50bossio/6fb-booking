'use client';

import { useState } from 'react';
import { X, Share2, QrCode } from 'lucide-react';
import QRCodeGenerator from './QRCodeGenerator';
import { Button } from '../ui/button';

interface QRCodeShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingUrl: string;
  title?: string;
  serviceName?: string;
}

export default function QRCodeShareModal({
  isOpen,
  onClose,
  bookingUrl,
  title = 'Share Booking Link',
  serviceName,
}: QRCodeShareModalProps) {
  if (!isOpen) return null;

  const modalTitle = serviceName 
    ? `Share ${serviceName} Booking Link`
    : title;

  const description = serviceName
    ? `Share this QR code to let customers book ${serviceName} appointments`
    : 'Share this QR code to let customers book appointments';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <QrCode className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {modalTitle}
                </h2>
                <p className="text-sm text-gray-600">
                  Generate and share QR codes for easy booking
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <QRCodeGenerator
              bookingUrl={bookingUrl}
              title={modalTitle}
              description={description}
              defaultSize="medium"
              showSizeSelector={true}
              showDownloadButton={true}
              showShareButton={true}
              showCopyButton={true}
              className="border-0 shadow-none bg-transparent p-0"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Share2 className="w-4 h-4" />
              <span>Perfect for business cards, flyers, and social media</span>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for using the QR Code Share Modal
export function useQRCodeShareModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [bookingUrl, setBookingUrl] = useState('');
  const [serviceName, setServiceName] = useState<string | undefined>();

  const openModal = (url: string, service?: string) => {
    setBookingUrl(url);
    setServiceName(service);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setBookingUrl('');
    setServiceName(undefined);
  };

  return {
    isOpen,
    bookingUrl,
    serviceName,
    openModal,
    closeModal,
  };
}