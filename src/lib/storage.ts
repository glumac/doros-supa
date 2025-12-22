import { supabase } from "./supabaseClient";

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
 */
export async function getImageSignedUrl(
  imagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!imagePath) return null;

  // Extract path from full URL if needed (handles both paths and URLs)
  let path = imagePath;

  // If it's already a full URL, extract the path
  if (imagePath.includes("/pomodoro-images/")) {
    const parts = imagePath.split("/pomodoro-images/");
    path = parts[parts.length - 1] || imagePath;
  }

  // Remove query parameters if present (from previous signed URLs)
  const pathParts = path.split("?");
  path = pathParts[0] || path;

  const { data, error } = await supabase.storage
    .from("pomodoro-images")
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Error creating signed URL:", error);
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
