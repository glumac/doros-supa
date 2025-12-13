#!/usr/bin/env tsx
/**
 * Export data from Sanity CMS
 * Exports users, pomodoros, likes, and comments to JSON files
 * Run with: npm run migrate:export
 */

import sanityClient from '@sanity/client';
import fs from 'fs/promises';

interface SanityUser {
  _id: string;
  email: string;
  userName: string;
  image?: string;
}

interface SanityPomodoro {
  _id: string;
  launchAt: string;
  task: string;
  notes?: string;
  completed: boolean;
  userId: string;
  imageUrl?: string;
  _createdAt: string;
  _updatedAt: string;
}

interface SanityLike {
  userId: string;
  _key: string;
}

interface SanityComment {
  userId: string;
  commentText: string;
  _key: string;
}

// Validate environment variables
if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_TOKEN) {
  console.error('Error: Missing Sanity credentials');
  console.error('Required: SANITY_PROJECT_ID, SANITY_TOKEN');
  console.error('\nAdd these to your .env file:');
  console.error('SANITY_PROJECT_ID=your-project-id');
  console.error('SANITY_TOKEN=your-read-token');
  process.exit(1);
}

const client = sanityClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: 'production',
  apiVersion: '2021-11-16',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
});

async function exportData() {
  console.log('🚀 Starting Sanity data export...\n');

  try {
    // Export users
    console.log('📥 Exporting users...');
    const allUsers = await client.fetch<SanityUser[]>('*[_type == "user"]');
    const users = allUsers.filter(u => u.email); // Only include users with email
    console.log(`   ✓ Found ${users.length} users (${allUsers.length - users.length} skipped - missing email)`);

    // Export pomodoros
    console.log('📥 Exporting pomodoros...');
    const pomodoros = await client.fetch<SanityPomodoro[]>(`
      *[_type == "pomodoro"] {
        _id,
        launchAt,
        task,
        notes,
        completed,
        userId,
        "imageUrl": image.asset->url,
        _createdAt,
        _updatedAt
      }
    `);
    console.log(`   ✓ Found ${pomodoros.length} pomodoros`);

    // Export likes
    console.log('📥 Exporting likes...');
    const likes = await client.fetch<Array<{ _id: string; likes: SanityLike[] }>>(`
      *[_type == "pomodoro"] {
        _id,
        "likes": likes[]{ userId, _key }
      }[count(likes) > 0]
    `);
    const totalLikes = likes.reduce((sum, p) => sum + p.likes.length, 0);
    console.log(`   ✓ Found ${totalLikes} likes across ${likes.length} pomodoros`);

    // Export comments
    console.log('📥 Exporting comments...');
    const comments = await client.fetch<Array<{ _id: string; comments: SanityComment[] }>>(`
      *[_type == "pomodoro"] {
        _id,
        "comments": comments[]{ userId, commentText, _key }
      }[count(comments) > 0]
    `);
    const totalComments = comments.reduce((sum, p) => sum + p.comments.length, 0);
    console.log(`   ✓ Found ${totalComments} comments across ${comments.length} pomodoros`);

    // Create migration-data directory
    await fs.mkdir('migration-data', { recursive: true });

    // Save to JSON files
    console.log('\n💾 Saving to JSON files...');
    await fs.writeFile(
      'migration-data/users.json',
      JSON.stringify(users, null, 2)
    );
    console.log('   ✓ Saved users.json');

    await fs.writeFile(
      'migration-data/pomodoros.json',
      JSON.stringify(pomodoros, null, 2)
    );
    console.log('   ✓ Saved pomodoros.json');

    await fs.writeFile(
      'migration-data/likes.json',
      JSON.stringify(likes, null, 2)
    );
    console.log('   ✓ Saved likes.json');

    await fs.writeFile(
      'migration-data/comments.json',
      JSON.stringify(comments, null, 2)
    );
    console.log('   ✓ Saved comments.json');

    // Export summary
    console.log('\n✅ Export complete!');
    console.log('\n📊 Summary:');
    console.log(`   Users:      ${users.length}`);
    console.log(`   Pomodoros:  ${pomodoros.length}`);
    console.log(`   Likes:      ${totalLikes}`);
    console.log(`   Comments:   ${totalComments}`);
    console.log(`   Images:     ${pomodoros.filter(p => p.imageUrl).length}`);

    console.log('\n📁 Files saved to: migration-data/');
    console.log('\n▶️  Next step: npm run migrate:download');
  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  }
}

exportData();
