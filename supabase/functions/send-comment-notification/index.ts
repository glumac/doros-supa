import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "your-secret-key-here"; // For unsubscribe tokens

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CommentNotificationPayload {
  comment_id: string;
}

interface EmailData {
  owner_id: string;
  owner_email: string;
  owner_name: string;
  commenter_id: string;
  commenter_name: string;
  commenter_avatar: string | null;
  comment_text: string;
  pomodoro_id: string;
  task: string;
  email_enabled: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse the incoming payload
    const payload: CommentNotificationPayload = await req.json();
    const { comment_id } = payload;

    console.log("Received comment_id:", comment_id);

    if (!comment_id) {
      throw new Error("comment_id is required");
    }

    // Initialize Supabase client with service role
    // Service role bypasses RLS, but we need to configure it correctly
    const supabase = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: {
          schema: 'public'
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            // Ensure service role is used
            apikey: SUPABASE_SERVICE_ROLE_KEY!,
            // Force read from primary to avoid replication lag
            'x-supabase-read-consistency': 'strong'
          }
        }
      }
    );

    // Fetch comment with simple join
    const { data: commentData, error: commentError } = await supabase
      .from('comments')
      .select('id, comment_text, user_id, pomodoro_id')
      .eq('id', comment_id)
      .single();

    if (commentError || !commentData) {
      console.error("Error fetching comment:", commentError);
      throw new Error(`Comment not found: ${commentError?.message}`);
    }

    console.log("Comment found:", commentData);

    // Fetch commenter details
    const { data: commenter, error: commenterError } = await supabase
      .from('users')
      .select('id, user_name, avatar_url')
      .eq('id', commentData.user_id)
      .single();

    if (commenterError || !commenter) {
      console.error("Error fetching commenter:", commenterError);
      throw new Error("Commenter not found");
    }

    // Fetch pomodoro details
    const { data: pomodoro, error: pomodoroError } = await supabase
      .from('pomodoros')
      .select('id, task, user_id')
      .eq('id', commentData.pomodoro_id)
      .single();

    if (pomodoroError || !pomodoro) {
      console.error("Error fetching pomodoro:", pomodoroError);
      throw new Error("Pomodoro not found");
    }

    // Fetch pomodoro owner details
    const { data: owner, error: ownerError } = await supabase
      .from('users')
      .select('id, user_name, email, notification_preferences')
      .eq('id', pomodoro.user_id)
      .single();

    if (ownerError || !owner) {
      console.error("Error fetching owner:", ownerError);
      throw new Error("Owner not found");
    }

    console.log("All data fetched successfully");

    const emailData: EmailData = {
      owner_id: owner.id,
      owner_email: owner.email,
      owner_name: owner.user_name,
      commenter_id: commenter.id,
      commenter_name: commenter.user_name,
      commenter_avatar: commenter.avatar_url,
      comment_text: commentData.comment_text,
      pomodoro_id: pomodoro.id,
      task: pomodoro.task,
      email_enabled: owner.notification_preferences?.email_comments || false,
    };

    // Don't send email if user commented on their own pomodoro
    if (emailData.owner_id === emailData.commenter_id) {
      console.log("Skipping: User commented on their own pomodoro");
      return new Response(JSON.stringify({ skipped: "self-comment" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if email notifications are enabled
    if (!emailData.email_enabled) {
      console.log("Skipping: Email notifications disabled for user");
      return new Response(JSON.stringify({ skipped: "notifications-disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if commenter is blocked
    const { data: blockCheck } = await supabase
      .from("blocks")
      .select("id")
      .eq("blocker_id", emailData.owner_id)
      .eq("blocked_id", emailData.commenter_id)
      .maybeSingle();

    if (blockCheck) {
      console.log("Skipping: Commenter is blocked");
      return new Response(JSON.stringify({ skipped: "blocked-user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Generate unsubscribe token (valid for 90 days)
    const unsubscribeToken = await create(
      { alg: "HS256", typ: "JWT" },
      {
        userId: emailData.owner_id,
        preference: "email_comments",
        exp: getNumericDate(90 * 24 * 60 * 60), // 90 days
      },
      JWT_SECRET
    );

    const unsubscribeUrl = `https://crush.quest/unsubscribe?token=${unsubscribeToken}`;
    const pomodoroUrl = `https://crush.quest/doro/${emailData.pomodoro_id}`;

    // Send email via Resend
    const emailHtml = generateRetroEmailTemplate(emailData, pomodoroUrl, unsubscribeUrl);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Crush Quest <onboarding@resend.dev>", // Change to notifications@crush.quest after domain verification
        to: emailData.owner_email,
        subject: `💬 New comment from ${emailData.commenter_name}`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      throw new Error("Failed to send email");
    }

    console.log("Email sent successfully:", resendData);

    return new Response(
      JSON.stringify({ success: true, email_id: resendData.id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-comment-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function generateRetroEmailTemplate(
  emailData: EmailData,
  pomodoroUrl: string,
  unsubscribeUrl: string
): string {
  // Retro 80s/90s terminal-style email design
  const truncatedComment = emailData.comment_text.length > 200
    ? emailData.comment_text.substring(0, 200) + "..."
    : emailData.comment_text;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Courier New', Courier, monospace;
      background-color: #000000;
      color: #00ff00;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0a0a0a;
      border: 2px solid #00ff00;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #00ff00;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      color: #00ff00;
      letter-spacing: 2px;
    }
    .ascii-art {
      text-align: center;
      font-size: 10px;
      line-height: 1.2;
      color: #00ff00;
      margin: 10px 0;
    }
    .content {
      margin: 20px 0;
    }
    .label {
      color: #ffaa00;
      font-weight: bold;
    }
    .value {
      color: #00ff00;
      margin-left: 10px;
    }
    .comment-box {
      background-color: #1a1a1a;
      border: 1px solid #00ff00;
      padding: 15px;
      margin: 15px 0;
    }
    .separator {
      color: #00ff00;
      text-align: center;
      margin: 15px 0;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background-color: #00ff00;
      color: #000000;
      padding: 10px 20px;
      text-decoration: none;
      border: 2px solid #00ff00;
      margin: 10px 5px;
      font-weight: bold;
      text-align: center;
    }
    .button:hover {
      background-color: #000000;
      color: #00ff00;
    }
    .footer {
      border-top: 2px solid #00ff00;
      padding-top: 15px;
      margin-top: 20px;
      font-size: 12px;
      color: #888888;
      text-align: center;
    }
    .footer a {
      color: #ffaa00;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    @media (max-width: 600px) {
      body {
        padding: 10px;
      }
      .container {
        padding: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="ascii-art">
 _____ ____  _    _ _____ _    _    ___  _    _ _____ _____ _____
|  _  |  _ \\| |  | |  ___| |  | |  / _ \\| |  | |  ___|  _  |_   _|
| | | | |_) | |  | | |_  | |  | | | | | | |  | | |_  | |_| | | |
| |_| |  _ &lt;| |__| |  _| | |__| | | |_| | |__| |  _| |  _  | | |
|_____|_| \\_\\______|_|   |______|  \\__\\_\\______|_|   |_| |_| |_|
    </div>

    <div class="header">
      <h1>═══ NEW COMMENT ═══</h1>
    </div>

    <div class="content">
      <p><span class="label">FROM:</span><span class="value">${emailData.commenter_name}</span></p>
      <p><span class="label">TASK:</span><span class="value">${emailData.task}</span></p>

      <div class="separator">════════════════════════════════</div>

      <div class="comment-box">
        <div class="label">COMMENT:</div>
        <div style="margin-top: 10px; color: #00ff00;">
          "${truncatedComment}"
        </div>
      </div>

      <div class="separator">════════════════════════════════</div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="${pomodoroUrl}" class="button">&gt;&gt; VIEW POMODORO &lt;&lt;</a>
      </div>
    </div>

    <div class="footer">
      <p>Don't want these emails?</p>
      <p><a href="${unsubscribeUrl}">[ UNSUBSCRIBE ]</a> | <a href="https://crush.quest/settings">[ SETTINGS ]</a></p>
      <p style="margin-top: 10px;">Crush Quest © ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}
