import * as QRCode from 'qrcode';

export type QRCodeSize = 'small' | 'medium' | 'large';
export type QRCodeFormat = 'png' | 'svg';

export interface QRCodeOptions {
  size: QRCodeSize;
  format: QRCodeFormat;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  color?: {
    dark: string;
    light: string;
  };
}

export interface QRCodeGenerationResult {
  dataUrl: string;
  downloadUrl: string;
  size: number;
}

const QR_CODE_SIZES: Record<QRCodeSize, number> = {
  small: 128,
  medium: 256,
  large: 512,
};

const DEFAULT_OPTIONS: Partial<QRCodeOptions> = {
  errorCorrectionLevel: 'M',
  margin: 4,
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
};

/**
 * Generate QR code data URL for display
 */
export async function generateQRCodeDataUrl(
  text: string,
  options: QRCodeOptions
): Promise<string> {
  try {
    const size = QR_CODE_SIZES[options.size];
    
    const qrOptions = {
      errorCorrectionLevel: options.errorCorrectionLevel || DEFAULT_OPTIONS.errorCorrectionLevel,
      margin: options.margin || DEFAULT_OPTIONS.margin,
      color: options.color || DEFAULT_OPTIONS.color,
      width: size,
    };

    if (options.format === 'svg') {
      return await QRCode.toString(text, {
        ...qrOptions,
        type: 'svg',
      });
    } else {
      return await QRCode.toDataURL(text, qrOptions);
    }
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code for downloading
 */
export async function generateQRCodeForDownload(
  text: string,
  options: QRCodeOptions,
  filename?: string
): Promise<QRCodeGenerationResult> {
  try {
    const dataUrl = await generateQRCodeDataUrl(text, options);
    const size = QR_CODE_SIZES[options.size];

    // Create download URL
    const downloadUrl = dataUrl;
    
    return {
      dataUrl,
      downloadUrl,
      size,
    };
  } catch (error) {
    console.error('Failed to generate QR code for download:', error);
    throw new Error('Failed to generate QR code for download');
  }
}

/**
 * Download QR code as file
 */
export function downloadQRCode(
  dataUrl: string,
  filename: string = 'qr-code.png'
): void {
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to download QR code:', error);
    throw new Error('Failed to download QR code');
  }
}

/**
 * Generate booking QR code with customizable styling
 */
export async function generateBookingQRCode(
  bookingUrl: string,
  size: QRCodeSize = 'medium',
  customColor?: { dark: string; light: string }
): Promise<QRCodeGenerationResult> {
  const options: QRCodeOptions = {
    size,
    format: 'png',
    errorCorrectionLevel: 'M',
    margin: 4,
    color: customColor || {
      dark: '#059669', // Teal-600 to match design system
      light: '#FFFFFF',
    },
  };

  return generateQRCodeForDownload(bookingUrl, options);
}

/**
 * Validate URL before QR code generation
 */
export function validateBookingUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generate filename for QR code download
 */
export function generateQRCodeFilename(
  prefix: string = 'booking-qr-code',
  size: QRCodeSize = 'medium',
  format: QRCodeFormat = 'png'
): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${size}-${timestamp}.${format}`;
}