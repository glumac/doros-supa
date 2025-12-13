# Doros Supabase Migration

**Crush Quest (Doros2) - Migrating from Sanity CMS to Supabase**

---

## 🚀 Quick Status

**✅ Phase 1 Complete:** Database schema, RLS policies, functions  
**✅ Phase 2 Complete:** Data migration (56 users, 5,226 pomodoros, 1,684 likes, 313 comments)  
**🔄 Phase 3 Next:** Frontend development (replace Sanity client)

📖 **[Read STATUS.md for complete progress →](./STATUS.md)**

---

## What This Project Does

Migrates the Crush Quest Pomodoro timer app from Sanity CMS to Supabase with:
- Privacy-focused friends/following system
- Dual leaderboards (Global & Friends)
- Secure image storage
- Google OAuth authentication

---

## Project Links

- **Supabase Dashboard:** https://gwiwnpawhribxvjfxkiw.supabase.co
- **Source App:** https://github.com/glumac/doros2
- **Migration Plan:** [.github/plan-supabaseMigration.prompt.md](./.github/plan-supabaseMigration.prompt.md)

---

## Documentation

- **[STATUS.md](./STATUS.md)** - Current progress and next steps ⭐ START HERE
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick reference guide
- **[PHASE1_COMPLETE.md](./PHASE1_COMPLETE.md)** - Database setup details
- **[PHASE2_GUIDE.md](./PHASE2_GUIDE.md)** - Data migration guide

---

## Commands

```bash
# Data migration (already completed)
npm run migrate:export    # Export from Sanity
npm run migrate:download  # Download images  
npm run migrate:import    # Import to Supabase

# Storage setup (pending)
npm run setup:storage     # Create pomodoro-images bucket
```

---

## Environment

All credentials configured in `.env`:
- ✅ Supabase API keys
- ✅ Sanity credentials
- ✅ Project IDs

---

## Next Steps

1. **Create storage bucket** (manual step required)
2. **Start Phase 3:** Frontend development
3. See [STATUS.md](./STATUS.md) for details
