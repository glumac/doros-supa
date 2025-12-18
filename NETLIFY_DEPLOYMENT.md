# Netlify Deployment Guide

## Setup Steps

### 1. Push Your Code to Git
Ensure your dev branch is pushed to your Git repository (GitHub, GitLab, or Bitbucket).

```bash
git add .
git commit -m "Add Netlify configuration"
git push origin develop  # or your dev branch name
```

### 2. Create Netlify Site

1. Go to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository: `doros-supa`
5. Configure build settings:
   - **Branch to deploy:** `develop` (or your dev branch name)
   - **Build command:** `npm run build` _(auto-filled from netlify.toml)_
   - **Publish directory:** `dist` _(auto-filled from netlify.toml)_

### 3. Set Environment Variables

In Netlify dashboard → **Site settings** → **Environment variables**, add:

**For Development Branch (Current Production):**
```
VITE_SUPABASE_URL=https://gwiwnpawhribxvjfxkiw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3aXducGF3aHJpYnh2amZ4a2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNTE4NzEsImV4cCI6MjA4MDcyNzg3MX0.E_ddu2mqs47IZLdlrEgUkxZ70Gqzgk2h06IZ8mAWCy8
```

**Note:** Once you create an actual Supabase dev branch, you'll need to update these with the dev branch credentials.

### 4. Deploy

Click **"Deploy site"** - Netlify will:
- Install dependencies (`npm install`)
- Build your app (`npm run build`)
- Deploy the `dist` folder
- Give you a URL like `https://random-name-123.netlify.app`

### 5. Enable Continuous Deployment

Continuous deployment is **enabled by default**! Every push to your dev branch will trigger a new deployment automatically.

### 6. Optional: Custom Domain

1. Go to **Domain settings**
2. Add custom domain (e.g., `dev.yourdomain.com` or `staging.yourdomain.com`)
3. Follow DNS configuration instructions

---

## Creating a Supabase Dev Branch (Future Step)

If you want a separate Supabase database for your dev environment:

1. Create a dev branch in Supabase (requires confirmation)
2. Get the new dev branch URL and anon key
3. Update Netlify environment variables with dev branch credentials
4. Redeploy

---

## Monitoring Deployments

- **Deploy log:** Check build logs in Netlify dashboard
- **Preview deploys:** Pull requests get automatic preview deployments
- **Rollback:** Can rollback to previous deployments in one click

---

## Troubleshooting

**Build fails?**
- Check the build log in Netlify
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

**Blank page?**
- Check browser console for errors
- Verify Supabase credentials are correct
- Check that redirects are working (already configured in netlify.toml)

**API errors?**
- Verify Supabase URL and key in environment variables
- Check Supabase RLS policies allow access
- Review Supabase logs

---

## Current Status

✅ netlify.toml created with optimal configuration
✅ Supabase credentials retrieved (production)
⏳ Waiting for you to connect repository to Netlify

**Next step:** Go to Netlify and import your project!
