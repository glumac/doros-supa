import { supabase } from "./supabaseClient";

/**
 * Transform options for image resizing
 */
export interface TransformOptions {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
  quality?: number; // 20-100, default 80
  format?: 'origin' | 'webp';
}

/**
 * Upload an image to Supabase Storage
 * Returns the file path (not a URL) which should be stored in the database
 * For private buckets, use getImageSignedUrl() to generate display URLs
 */
export async function uploadPomodoroImage(file: File, userId: string) {
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("pomodoro-images")
    .upload(fileName, file, {
      contentType: file.type,
    });

  if (error) {
    console.error("Upload error:", error);
    return { imagePath: null, error };
  }

  // Return the path, not a URL
  // Store this path in the database (image_url column)
  return { imagePath: fileName, error: null };
}

/**
 * Get a signed URL for an image path stored in the database
 * Use this when displaying images from private storage bucket
 * Signed URLs expire after the specified time (default: 1 hour)
 *
 * @param imagePath - The path stored in image_url column (e.g., "userId/timestamp.jpg")
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @param transform - Optional transform options for image resizing/optimization
 */
export async function getImageSignedUrl(
  imagePath: string,
  expiresIn: number = 3600,
  transform?: TransformOptions
): Promise<string | null> {
  if (!imagePath) return null;

  // Extract path from full URL if needed (handles both paths and URLs)
  let path = imagePath.trim();

  // If it's a Supabase storage URL (public or signed), extract the path
  // Handles formats like:
  // - https://project.supabase.co/storage/v1/object/public/pomodoro-images/userId/file.jpg
  // - https://project.supabase.co/storage/v1/object/sign/pomodoro-images/userId/file.jpg?token=...
  if (imagePath.includes("/pomodoro-images/")) {
    const parts = imagePath.split("/pomodoro-images/");
    path = parts[parts.length - 1] || imagePath;
  }

  // Remove query parameters if present (from previous signed URLs)
  const pathParts = path.split("?");
  path = pathParts[0] || path;

  // Remove any leading slashes
  path = path.replace(/^\/+/, "");

  // If path is empty after cleaning, return null
  if (!path) {
    console.error("Empty path after extraction from:", imagePath);
    return null;
  }

  const { data, error } = await supabase.storage
    .from("pomodoro-images")
    .createSignedUrl(path, expiresIn, transform ? { transform } : undefined);

  if (error) {
    // "Object not found" is expected when images are missing from storage
    // (e.g., from data migration or deleted files). Handle silently.
    if (error.message?.includes("Object not found") || error.message?.includes("not found")) {
      // Silently return null for missing images
      return null;
    }
    // Log other unexpected errors
    console.error("Error creating signed URL:", error);
    console.error("Path attempted:", path);
    return null;
  }

  if (!data || !data.signedUrl) {
    console.error("No signed URL returned from Supabase for path:", path);
    return null;
  }

  return data.signedUrl;
}

export async function deletePomodoroImage(imageUrl: string) {
  // Extract the file path from the URL
  const urlParts = imageUrl.split("/pomodoro-images/");
  if (urlParts.length < 2) return { error: new Error("Invalid image URL") };

  const filePath = urlParts[1];
  if (!filePath) return { error: new Error("Invalid file path") };

  const { error } = await supabase.storage
    .from("pomodoro-images")
    .remove([filePath]);

  return { error };
}

/**
 * Get a signed URL for a feed thumbnail image (height: 630px, 2x for retina)
 * Display height is ~314px controlled by CSS
 * Width is auto to maintain aspect ratio for both portrait and landscape images
 */
export async function getFeedImageUrl(
  imagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  return getImageSignedUrl(imagePath, expiresIn, {
    height: 630,
    resize: 'contain',
    quality: 80,
  });
}

/**
 * Get a signed URL for a detail page image (height: 1200px, 2x for retina)
 * Display height is ~600px controlled by CSS
 * Width is auto to maintain aspect ratio for both portrait and landscape images
 */
export async function getDetailImageUrl(
  imagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  return getImageSignedUrl(imagePath, expiresIn, {
    height: 1200,
    resize: 'contain',
    quality: 85,
  });
}

/**
 * Get a signed URL for a full-size image (no transform)
 * Use this for modal or full-resolution display
 */
export async function getFullSizeImageUrl(
  imagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  return getImageSignedUrl(imagePath, expiresIn);
}
