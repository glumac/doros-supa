#!/usr/bin/env tsx
/**
 * Setup Supabase Storage Bucket for Pomodoro Images
 * Run with: npx tsx scripts/setup-storage.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  console.log('Setting up pomodoro-images storage bucket...\n');

  // Check if bucket already exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === 'pomodoro-images');

  if (bucketExists) {
    console.log('✓ Bucket "pomodoro-images" already exists');
    return;
  }

  // Create bucket
  const { data, error } = await supabase.storage.createBucket('pomodoro-images', {
    public: false, // Private bucket, access controlled by RLS
    fileSizeLimit: 5242880, // 5MB max
    allowedMimeTypes: [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/heic',
    ],
  });

  if (error) {
    console.error('✗ Error creating bucket:', error);
    process.exit(1);
  }

  console.log('✓ Successfully created "pomodoro-images" bucket');
  console.log('\nBucket configuration:');
  console.log('  - Access: Private (RLS controlled)');
  console.log('  - Max file size: 5MB');
  console.log('  - Allowed types: PNG, JPEG, GIF, WebP, HEIC');
}

setupStorage()
  .then(() => {
    console.log('\n✓ Storage setup complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n✗ Storage setup failed:', err);
    process.exit(1);
  });
