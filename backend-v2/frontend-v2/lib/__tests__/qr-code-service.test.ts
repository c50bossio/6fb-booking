import { 
  validateBookingUrl, 
  generateQRCodeFilename,
  type QRCodeSize,
  type QRCodeFormat
} from '../qr-code-service';

describe('QR Code Service', () => {
  describe('validateBookingUrl', () => {
    it('should validate valid HTTPS URLs', () => {
      expect(validateBookingUrl('https://example.com/book')).toBe(true);
      expect(validateBookingUrl('https://barbershop.com/book?service=haircut')).toBe(true);
    });

    it('should validate valid HTTP URLs', () => {
      expect(validateBookingUrl('http://localhost:3000/book')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateBookingUrl('not-a-url')).toBe(false);
      expect(validateBookingUrl('ftp://example.com')).toBe(false);
      expect(validateBookingUrl('')).toBe(false);
      expect(validateBookingUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('generateQRCodeFilename', () => {
    it('should generate filename with default values', () => {
      const filename = generateQRCodeFilename();
      expect(filename).toMatch(/^booking-qr-code-medium-\d{4}-\d{2}-\d{2}\.png$/);
    });

    it('should generate filename with custom parameters', () => {
      const filename = generateQRCodeFilename('test-qr', 'large', 'png');
      expect(filename).toMatch(/^test-qr-large-\d{4}-\d{2}-\d{2}\.png$/);
    });

    it('should include correct size in filename', () => {
      const sizes: QRCodeSize[] = ['small', 'medium', 'large'];
      sizes.forEach(size => {
        const filename = generateQRCodeFilename('test', size);
        expect(filename).toContain(size);
      });
    });

    it('should include correct format in filename', () => {
      const formats: QRCodeFormat[] = ['png', 'svg'];
      formats.forEach(format => {
        const filename = generateQRCodeFilename('test', 'medium', format);
        expect(filename).toEndWith(`.${format}`);
      });
    });

    it('should include current date in filename', () => {
      const today = new Date().toISOString().slice(0, 10);
      const filename = generateQRCodeFilename();
      expect(filename).toContain(today);
    });
  });
});

// Mock tests for async functions (these would need actual testing with proper mocking)
describe('QR Code Generation Functions', () => {
  it('should have generateQRCodeDataUrl function', () => {
    const { generateQRCodeDataUrl } = require('../qr-code-service');
    expect(typeof generateQRCodeDataUrl).toBe('function');
  });

  it('should have generateQRCodeForDownload function', () => {
    const { generateQRCodeForDownload } = require('../qr-code-service');
    expect(typeof generateQRCodeForDownload).toBe('function');
  });

  it('should have generateBookingQRCode function', () => {
    const { generateBookingQRCode } = require('../qr-code-service');
    expect(typeof generateBookingQRCode).toBe('function');
  });

  it('should have downloadQRCode function', () => {
    const { downloadQRCode } = require('../qr-code-service');
    expect(typeof downloadQRCode).toBe('function');
  });
});