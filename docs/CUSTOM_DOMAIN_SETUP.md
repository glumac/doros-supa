# Custom Domain Setup for Google OAuth

This guide will help you set up a custom domain for your Supabase project so that the Google OAuth consent screen shows "crush.quest" instead of your Supabase project domain.

## Important: No Conflict with Your Web App

✅ **Good news:** Your web app is hosted at `https://crush.quest/` (root domain), and Supabase **must use a subdomain** (e.g., `api.crush.quest`). This means **no conflict**!

- **Your web app:** `https://crush.quest/` (root domain)
- **Supabase API:** `https://api.crush.quest/` (subdomain)
- **Result:** Both can coexist perfectly

**Note about Google OAuth consent screen:** Google typically shows the root domain of the callback URL. Since your callback will be `https://api.crush.quest/auth/v1/callback`, Google may show either:

- "crush.quest" (root domain - preferred)
- "api.crush.quest" (subdomain - still better than random Supabase domain)

Either way, it's much better than showing `gwiwnpawhribxvjfxkiw.supabase.co`!

## Prerequisites

### 1. Upgrade Supabase Plan

**⚠️ IMPORTANT:** Custom domains require a **paid Supabase plan** (Pro, Team, or Enterprise).

- Current plan: **Free**
- Required: **Pro** ($25/month) or higher
- Upgrade at: https://supabase.com/dashboard/org/prmmfrbxkykezrtbfnta/billing

### 2. Domain Ownership

You need:

- Access to DNS settings for `crush.quest` (you already have this since your app is hosted there)
- Ability to add CNAME and TXT records

---

## Step-by-Step Setup

### Step 1: Upgrade Your Supabase Plan

1. Go to: https://supabase.com/dashboard/org/prmmfrbxkykezrtbfnta/billing
2. Select **Pro** plan ($25/month) or higher
3. Complete the upgrade process

### Step 2: Configure Custom Domain in Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/gwiwnpawhribxvjfxkiw
2. Navigate to **Settings** → **General** → **Custom Domains**
3. Click **Add Custom Domain**
4. Enter your subdomain: `api.crush.quest` (recommended) or `auth.crush.quest`

**Why a subdomain?**

- Supabase only supports subdomains, not root domains
- Your web app uses the root domain (`crush.quest`)
- Using `api.crush.quest` is a common pattern and keeps things organized

### Step 3: Add DNS Records

Supabase will provide you with DNS records to add. You'll need:

#### A. CNAME Record

- **Name:** `api` (or your chosen subdomain)
- **Value:** `gwiwnpawhribxvjfxkiw.supabase.co.` (note the trailing dot)
- **TTL:** 3600 (or as low as possible for faster propagation)

#### B. TXT Record (for domain verification)

- **Name:** `_acme-challenge.api` (or `_acme-challenge.your-subdomain`)
- **Value:** (provided by Supabase - unique verification token)
- **TTL:** 3600

**Example DNS Configuration:**

```
Type    Name                        Value
CNAME   api                         gwiwnpawhribxvjfxkiw.supabase.co.
TXT     _acme-challenge.api         ca3-F1HvR9i938OgVwpCFwi1jTsbhe1hvT0Ic3efPY3Q
```

### Step 4: Verify Domain Ownership

1. After adding DNS records, wait a few minutes for propagation
2. In Supabase dashboard, click **Verify Domain** or **Reverify**
3. Supabase will check DNS records and issue SSL certificate (can take up to 30 minutes)

### Step 5: Update Google OAuth Configuration

**⚠️ CRITICAL:** Do this BEFORE activating the custom domain to prevent OAuth failures.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID (the one used for Supabase)
4. Click **Edit**
5. Under **Authorized redirect URIs**, add:
   - `https://api.crush.quest/auth/v1/callback` (or your custom domain)
   - **Keep the existing one:** `https://gwiwnpawhribxvjfxkiw.supabase.co/auth/v1/callback`
6. Click **Save**

**Why keep both?** During transition, both URLs will work. Once everything is stable, you can remove the old one.

### Step 6: Activate Custom Domain

1. In Supabase dashboard, once verification is complete, click **Activate Domain**
2. Wait for activation to complete (usually a few minutes)

### Step 7: Update Your Application

#### Update Environment Variables

**Local Development (.env.local):**

```bash
VITE_SUPABASE_URL=https://api.crush.quest
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Netlify Environment Variables:**

1. Go to Netlify dashboard → Your site → **Site settings** → **Environment variables**
2. Update `VITE_SUPABASE_URL` to: `https://api.crush.quest`
3. Redeploy your site

**Note:** The original Supabase URL (`https://gwiwnpawhribxvjfxkiw.supabase.co`) will continue to work, so you can migrate gradually.

### Step 8: Test Google OAuth

1. Clear browser cache/cookies
2. Test the Google sign-in flow
3. Verify the consent screen shows: **"sign in to continue to crush.quest"** (or "api.crush.quest" - both are acceptable and much better than the Supabase domain)

---

## Alternative: Vanity Subdomain (Experimental)

If you prefer a branded subdomain on `supabase.co` instead of a custom domain:

- Example: `crush-quest.supabase.co` instead of `gwiwnpawhribxvjfxkiw.supabase.co`
- Also requires a paid plan
- Simpler setup (no DNS configuration needed)
- Still shows in Google OAuth consent screen

To set up:

1. Use Supabase CLI: `supabase vanity-subdomains check-availability`
2. If available, activate: `supabase vanity-subdomains activate`

---

## Troubleshooting

### DNS Propagation

- DNS changes can take 24-48 hours to fully propagate
- Use low TTL values (300-600) for faster updates
- Verify with: `dig api.crush.quest` or `nslookup api.crush.quest`

### SSL Certificate

- Supabase uses Let's Encrypt for SSL
- Certificate generation can take up to 30 minutes after DNS verification
- Check certificate status in Supabase dashboard

### OAuth Errors

- Ensure both old and new callback URLs are in Google OAuth settings
- Clear browser cache and cookies
- Check browser console for errors

### Domain Verification Fails

- Double-check TXT record value (no extra spaces)
- Some DNS providers auto-append domain name - remove it if present
- Wait a few minutes and try reverifying

---

## Cost Considerations

- **Supabase Pro:** $25/month (required for custom domains)
- **Domain:** Already owned (crush.quest)
- **Total additional cost:** $25/month

---

## Next Steps After Setup

1. ✅ Test Google OAuth flow
2. ✅ Verify consent screen shows custom domain
3. ✅ Update all documentation with new domain
4. ✅ Monitor for any OAuth issues
5. ✅ After 1-2 weeks of stability, optionally remove old Supabase URL from Google OAuth settings

---

## Support

- Supabase Docs: https://supabase.com/docs/guides/platform/custom-domains
- Supabase Support: https://supabase.com/support
