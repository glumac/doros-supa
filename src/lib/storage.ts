import { supabase } from "./supabaseClient";

export async function uploadPomodoroImage(file: File, userId: string) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from("pomodoro-images")
    .upload(fileName, file, {
      contentType: file.type,
    });

  if (error) {
    console.error("Upload error:", error);
    return { imageUrl: null, error };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("pomodoro-images").getPublicUrl(fileName);

  return { imageUrl: publicUrl, error: null };
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
