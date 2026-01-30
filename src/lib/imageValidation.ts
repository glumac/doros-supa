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
 * Check if a file is HEIC format
 */
export function isHeicFile(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  );
}

/**
 * Convert HEIC file to JPEG
 * Uses dynamic import to load heic2any only when needed (saves ~500KB for non-HEIC uploads)
 * @throws Error if conversion fails
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    // Dynamic import - only loads heic2any when HEIC file is detected
    const heic2any = (await import('heic2any')).default;

    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });

    // heic2any can return Blob or Blob[] - handle both cases
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

    // Ensure we have a valid blob
    if (!blob) {
      throw new Error('Conversion produced an empty result');
    }

    // Create new File from converted Blob with .jpg extension
    const newFileName = file.name.replace(/\.heic?$/i, '.jpg');
    return new File([blob], newFileName, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw new Error('Failed to convert HEIC image. Please try a different format.');
  }
}

/**
 * Convert HEIC file to JPEG if needed, otherwise return original file
 */
export async function convertHeicIfNeeded(file: File): Promise<File> {
  if (isHeicFile(file)) {
    return await convertHeicToJpeg(file);
  }
  return file;
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



