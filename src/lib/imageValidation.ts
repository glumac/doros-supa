/**
 * Image validation utilities for file uploads
 * Validates file types and sizes according to Supabase bucket configuration
 */

export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/heic',
] as const;

/**
 * Maximum file size in bytes (5MB)
 * Matches Supabase bucket configuration: fileSizeLimit: 5242880
 */
export const MAX_FILE_SIZE = 5242880; // 5MB

/**
 * Check if file type is supported
 */
export function isValidImageType(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type as typeof SUPPORTED_IMAGE_TYPES[number]);
}

/**
 * Check if file size is within limit
 */
export function isValidImageSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

/**
 * Get error message for invalid image type, or null if valid
 */
export function getImageTypeError(file: File): string | null {
  if (isValidImageType(file)) {
    return null;
  }
  return 'File type not supported. Please use PNG, JPEG, GIF, WebP, or HEIC.';
}

/**
 * Get error message for invalid file size, or null if valid
 */
export function getImageSizeError(file: File): string | null {
  if (isValidImageSize(file)) {
    return null;
  }
  return 'File too large. Maximum size is 5MB.';
}

/**
 * Validate image file (type and size)
 * Returns validation result with error message if invalid
 */
export function validateImageFile(file: File): { valid: boolean; error: string | null } {
  // Check type first (more common error)
  const typeError = getImageTypeError(file);
  if (typeError) {
    return { valid: false, error: typeError };
  }

  // Check size
  const sizeError = getImageSizeError(file);
  if (sizeError) {
    return { valid: false, error: sizeError };
  }

  return { valid: true, error: null };
}

