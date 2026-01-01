import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  isValidImageType,
  isValidImageSize,
  validateImageFile,
  getImageTypeError,
  getImageSizeError,
} from '../imageValidation';

describe('imageValidation', () => {
  describe('SUPPORTED_IMAGE_TYPES', () => {
    it('includes all Supabase-supported image types', () => {
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/png');
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/jpeg');
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/jpg');
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/gif');
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/webp');
      expect(SUPPORTED_IMAGE_TYPES).toContain('image/heic');
    });

    it('does not include unsupported types', () => {
      expect(SUPPORTED_IMAGE_TYPES).not.toContain('image/svg');
      expect(SUPPORTED_IMAGE_TYPES).not.toContain('image/tiff');
    });
  });

  describe('MAX_FILE_SIZE', () => {
    it('is 5MB (5242880 bytes)', () => {
      expect(MAX_FILE_SIZE).toBe(5242880);
    });
  });

  describe('isValidImageType', () => {
    it('returns true for supported image types', () => {
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      const jpegFile = new File([''], 'test.jpeg', { type: 'image/jpeg' });
      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpg' });
      const gifFile = new File([''], 'test.gif', { type: 'image/gif' });
      const webpFile = new File([''], 'test.webp', { type: 'image/webp' });
      const heicFile = new File([''], 'test.heic', { type: 'image/heic' });

      expect(isValidImageType(pngFile)).toBe(true);
      expect(isValidImageType(jpegFile)).toBe(true);
      expect(isValidImageType(jpgFile)).toBe(true);
      expect(isValidImageType(gifFile)).toBe(true);
      expect(isValidImageType(webpFile)).toBe(true);
      expect(isValidImageType(heicFile)).toBe(true);
    });

    it('returns false for unsupported image types', () => {
      const svgFile = new File([''], 'test.svg', { type: 'image/svg+xml' });
      const tiffFile = new File([''], 'test.tiff', { type: 'image/tiff' });
      const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });

      expect(isValidImageType(svgFile)).toBe(false);
      expect(isValidImageType(tiffFile)).toBe(false);
      expect(isValidImageType(txtFile)).toBe(false);
      expect(isValidImageType(pdfFile)).toBe(false);
    });

    it('returns false for empty type', () => {
      const emptyTypeFile = new File([''], 'test', { type: '' });
      expect(isValidImageType(emptyTypeFile)).toBe(false);
    });
  });

  describe('isValidImageSize', () => {
    it('returns true for files under 5MB', () => {
      const smallFile = new File(['x'.repeat(1000)], 'test.jpg', {
        type: 'image/jpeg',
      });
      expect(isValidImageSize(smallFile)).toBe(true);
    });

    it('returns true for files exactly 5MB', () => {
      const exactSizeFile = new File(
        ['x'.repeat(MAX_FILE_SIZE)],
        'test.jpg',
        { type: 'image/jpeg' }
      );
      expect(isValidImageSize(exactSizeFile)).toBe(true);
    });

    it('returns false for files over 5MB', () => {
      const largeFile = new File(
        ['x'.repeat(MAX_FILE_SIZE + 1)],
        'test.jpg',
        { type: 'image/jpeg' }
      );
      expect(isValidImageSize(largeFile)).toBe(false);
    });

    it('returns true for empty file', () => {
      const emptyFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(isValidImageSize(emptyFile)).toBe(true);
    });
  });

  describe('getImageTypeError', () => {
    it('returns null for valid image types', () => {
      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      expect(getImageTypeError(pngFile)).toBeNull();
    });

    it('returns error message for invalid image types', () => {
      const svgFile = new File([''], 'test.svg', { type: 'image/svg+xml' });
      const error = getImageTypeError(svgFile);
      expect(error).toBeTruthy();
      expect(error).toContain('not supported');
      expect(error).toContain('PNG, JPEG, GIF, WebP, or HEIC');
    });

    it('returns error message for empty type', () => {
      const emptyTypeFile = new File([''], 'test', { type: '' });
      const error = getImageTypeError(emptyTypeFile);
      expect(error).toBeTruthy();
    });
  });

  describe('getImageSizeError', () => {
    it('returns null for files under or equal to 5MB', () => {
      const smallFile = new File(['x'.repeat(1000)], 'test.jpg', {
        type: 'image/jpeg',
      });
      expect(getImageSizeError(smallFile)).toBeNull();

      const exactSizeFile = new File(
        ['x'.repeat(MAX_FILE_SIZE)],
        'test.jpg',
        { type: 'image/jpeg' }
      );
      expect(getImageSizeError(exactSizeFile)).toBeNull();
    });

    it('returns error message for files over 5MB', () => {
      const largeFile = new File(
        ['x'.repeat(MAX_FILE_SIZE + 1)],
        'test.jpg',
        { type: 'image/jpeg' }
      );
      const error = getImageSizeError(largeFile);
      expect(error).toBeTruthy();
      expect(error).toContain('too large');
      expect(error).toContain('5MB');
    });
  });

  describe('validateImageFile', () => {
    it('returns valid: true for valid image file', () => {
      const validFile = new File(['x'.repeat(1000)], 'test.png', {
        type: 'image/png',
      });
      const result = validateImageFile(validFile);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid: false with type error for invalid image type', () => {
      const svgFile = new File([''], 'test.svg', { type: 'image/svg+xml' });
      const result = validateImageFile(svgFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error).toContain('not supported');
    });

    it('returns valid: false with size error for file over 5MB', () => {
      const largeFile = new File(
        ['x'.repeat(MAX_FILE_SIZE + 1)],
        'test.jpg',
        { type: 'image/jpeg' }
      );
      const result = validateImageFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error).toContain('too large');
    });

    it('prioritizes type error over size error', () => {
      const invalidTypeLargeFile = new File(
        ['x'.repeat(MAX_FILE_SIZE + 1)],
        'test.svg',
        { type: 'image/svg+xml' }
      );
      const result = validateImageFile(invalidTypeLargeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('returns valid: false for empty file with wrong type', () => {
      const emptyTypeFile = new File([''], 'test', { type: '' });
      const result = validateImageFile(emptyTypeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});



