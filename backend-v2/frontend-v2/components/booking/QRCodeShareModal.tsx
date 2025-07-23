'use client';

import { useState } from 'react';
import { Share2, QrCode } from 'lucide-react';
import QRCodeGenerator from './QRCodeGenerator';
import { Button } from '../ui/button';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description="Generate and share QR codes for easy booking"
      size="2xl"
      position="center"
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      <ModalBody>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
            <QrCode className="w-5 h-5 text-teal-600" />
          </div>
        </div>
        
        <QRCodeGenerator
          bookingUrl={bookingUrl}
          title={modalTitle}
          description={description}
          defaultSize="medium"
          showSizeSelector={true}
          showColorPicker={true}
          showDownloadButton={true}
          showShareButton={true}
          showCopyButton={true}
          className="border-0 shadow-none bg-transparent p-0"
        />
      </ModalBody>

      <ModalFooter>
        <div className="flex items-center gap-2 text-sm text-gray-600 mr-auto">
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
      </ModalFooter>
    </Modal>
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