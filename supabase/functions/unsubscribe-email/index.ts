import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "your-secret-key-here";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UnsubscribePayload {
  token: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: UnsubscribePayload = await req.json();
    const { token } = payload;

    if (!token) {
      throw new Error("Token is required");
    }

    // Verify and decode the JWT token
    const secretKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    let decodedToken;
    try {
      decodedToken = await verify(token, secretKey);
    } catch (error) {
      console.error("Token verification failed:", error);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const { userId, preference } = decodedToken as {
      userId: string;
      preference: string;
    };

    if (!userId || !preference) {
      throw new Error("Invalid token payload");
    }

    // Validate preference is one of the allowed values
    const validPreferences = ["email_comments", "email_likes", "email_follow_requests"];
    if (!validPreferences.includes(preference)) {
      throw new Error("Invalid preference type");
    }

    // Initialize Supabase client with service role
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch current notification preferences
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("notification_preferences, user_name")
      .eq("id", userId)
      .single();

    if (fetchError || !currentUser) {
      console.error("Error fetching user:", fetchError);
      throw new Error("User not found");
    }

    // Update the specific preference to false (unsubscribe)
    const updatedPreferences = {
      ...currentUser.notification_preferences,
      [preference]: false,
    };

    const { error: updateError } = await supabase
      .from("users")
      .update({ notification_preferences: updatedPreferences })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating preferences:", updateError);
      throw new Error("Failed to update preferences");
    }

    console.log(`User ${currentUser.user_name} unsubscribed from ${preference}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Successfully unsubscribed",
        preference,
        userName: currentUser.user_name,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in unsubscribe-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
