#!/bin/bash
# Cleanup legacy files after Supabase migration

echo "🧹 Starting cleanup..."

# 1. Remove Sanity files (if they exist)
echo "📦 Checking for Sanity client..."
if [ -f "src/client.js" ]; then
  rm src/client.js
  echo "  ✓ Removed src/client.js"
else
  echo "  ℹ src/client.js not found (already removed)"
fi

if [ -f "src/utils/data.ts" ]; then
  rm src/utils/data.ts
  echo "  ✓ Removed src/utils/data.ts"
else
  echo "  ℹ src/utils/data.ts not found (already removed)"
fi

# 2. Remove duplicate entry points
echo "🔄 Removing duplicate entry point..."
if [ -f "src/index.js" ]; then
  rm src/index.js
  echo "  ✓ Removed src/index.js"
else
  echo "  ℹ src/index.js not found (already removed)"
fi

# 3. Remove duplicate HTML
echo "📄 Removing duplicate HTML..."
if [ -f "public/index.html" ]; then
  rm public/index.html
  echo "  ✓ Removed public/index.html"
else
  echo "  ℹ public/index.html not found (already removed)"
fi

# 4. Archive migration scripts
echo "📦 Archiving migration files..."
mkdir -p archive/scripts

if [ -f "scripts/export-from-sanity.ts" ]; then
  mv scripts/export-from-sanity.ts archive/scripts/
  echo "  ✓ Archived export-from-sanity.ts"
fi

if [ -f "scripts/download-sanity-images.ts" ]; then
  mv scripts/download-sanity-images.ts archive/scripts/
  echo "  ✓ Archived download-sanity-images.ts"
fi

if [ -f "scripts/import-to-supabase.ts" ]; then
  mv scripts/import-to-supabase.ts archive/scripts/
  echo "  ✓ Archived import-to-supabase.ts"
fi

if [ -f "scripts/setup-storage.ts" ]; then
  mv scripts/setup-storage.ts archive/scripts/
  echo "  ✓ Archived setup-storage.ts"
fi

if [ -d "migration-data" ]; then
  mv migration-data archive/
  echo "  ✓ Archived migration-data/"
fi

if [ -d ".github/instructions.md" ]; then
  rm -rf .github/instructions.md
  echo "  ✓ Removed .github/instructions.md/"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Removed Sanity client files (if present)"
echo "  - Removed duplicate entry points"
echo "  - Archived migration scripts to archive/"
echo "  - Removed deprecated config files"
echo ""
echo "🔍 Review changes before committing:"
echo "  git status"
