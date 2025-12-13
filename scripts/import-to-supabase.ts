#!/usr/bin/env tsx
/**
 * Import data to Supabase
 * Imports users, pomodoros, likes, comments, and images
 * Run with: npm run migrate:import
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

interface SanityUser {
  _id: string;
  email: string;
  userName: string;
  image?: string;
}

interface SanityPomodoro {
  _id: string;
  userId: string;
  launchAt: string;
  task: string;
  notes?: string;
  completed: boolean;
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
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing Supabase credentials');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nAdd these to your .env file:');
  console.error('SUPABASE_URL=https://your-project.supabase.co');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for migration
);

async function importData() {
  console.log('🚀 Starting Supabase import...\n');

  try {
    // 1. Import users
    console.log('👥 Importing users...');
    const usersData = await fs.readFile('migration-data/users.json', 'utf8');
    const users: SanityUser[] = JSON.parse(usersData);
    const userIdMap = new Map<string, string>(); // Sanity ID → Supabase UUID

    let userCount = 0;
    for (const user of users) {
      try {
        // Create auth user
        const { data: authUser, error } = await supabase.auth.admin.createUser({
          email: user.email,
          email_confirm: true,
          user_metadata: {
            name: user.userName,
            avatar_url: user.image,
          },
        });

        if (error) {
          console.error(`   ❌ Failed to create user ${user.email}:`, error.message);
          continue;
        }

        userIdMap.set(user._id, authUser.user.id);
        userCount++;
        console.log(`   ✓ Created user: ${user.email} → ${authUser.user.id}`);
      } catch (error) {
        console.error(`   ❌ Error creating user ${user.email}:`, error);
      }
    }
    console.log(`   ✅ Imported ${userCount}/${users.length} users\n`);

    // 2. Import pomodoros
    console.log('📝 Importing pomodoros...');
    const pomodorosData = await fs.readFile('migration-data/pomodoros.json', 'utf8');
    const pomodoros: SanityPomodoro[] = JSON.parse(pomodorosData);
    const pomIdMap = new Map<string, string>(); // Sanity ID → Supabase UUID

    let pomCount = 0;
    for (const pom of pomodoros) {
      const supabaseUserId = userIdMap.get(pom.userId);
      if (!supabaseUserId) {
        console.error(`   ❌ User not found for pomodoro ${pom._id}`);
        continue;
      }

      try {
        // Upload image if exists
        let imageUrl: string | null = null;
        if (pom.imageUrl) {
          const imagePath = path.join('migration-data/images', `${pom._id}.jpg`);
          try {
            const imageFile = await fs.readFile(imagePath);
            const fileName = `${supabaseUserId}/${pom._id}.jpg`;

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('pomodoro-images')
              .upload(fileName, imageFile, {
                contentType: 'image/jpeg',
                upsert: true,
              });

            if (!uploadError && uploadData) {
              // Get public URL
              const { data: { publicUrl } } = supabase.storage
                .from('pomodoro-images')
                .getPublicUrl(fileName);
              imageUrl = publicUrl;
            }
          } catch (imgError) {
            console.error(`   ⚠️  Image upload failed for ${pom._id}:`, imgError);
          }
        }

        // Insert pomodoro
        const { data: newPom, error } = await supabase
          .from('pomodoros')
          .insert({
            user_id: supabaseUserId,
            launch_at: pom.launchAt,
            task: pom.task,
            notes: pom.notes || null,
            completed: pom.completed,
            image_url: imageUrl,
            created_at: pom._createdAt,
            updated_at: pom._updatedAt,
          })
          .select()
          .single();

        if (error) {
          console.error(`   ❌ Failed to create pomodoro ${pom._id}:`, error.message);
          continue;
        }

        pomIdMap.set(pom._id, newPom.id);
        pomCount++;

        if (pomCount % 10 === 0) {
          console.log(`   ... ${pomCount}/${pomodoros.length} pomodoros imported`);
        }
      } catch (error) {
        console.error(`   ❌ Error creating pomodoro ${pom._id}:`, error);
      }
    }
    console.log(`   ✅ Imported ${pomCount}/${pomodoros.length} pomodoros\n`);

    // 3. Import likes
    console.log('❤️  Importing likes...');
    const likesDataRaw = await fs.readFile('migration-data/likes.json', 'utf8');
    const likesData: Array<{ _id: string; likes: SanityLike[] }> = JSON.parse(likesDataRaw);
    let likeCount = 0;

    for (const pomLikes of likesData) {
      const pomId = pomIdMap.get(pomLikes._id);
      if (!pomId) continue;

      for (const like of pomLikes.likes) {
        const userId = userIdMap.get(like.userId);
        if (!userId) continue;

        try {
          const { error } = await supabase
            .from('likes')
            .insert({ pomodoro_id: pomId, user_id: userId });

          if (!error) likeCount++;
        } catch (error) {
          // Ignore duplicate errors
        }
      }
    }
    console.log(`   ✅ Imported ${likeCount} likes\n`);

    // 4. Import comments
    console.log('💬 Importing comments...');
    const commentsDataRaw = await fs.readFile('migration-data/comments.json', 'utf8');
    const commentsData: Array<{ _id: string; comments: SanityComment[] }> = JSON.parse(commentsDataRaw);
    let commentCount = 0;

    for (const pomComments of commentsData) {
      const pomId = pomIdMap.get(pomComments._id);
      if (!pomId) continue;

      for (const comment of pomComments.comments) {
        const userId = userIdMap.get(comment.userId);
        if (!userId) continue;

        try {
          const { error } = await supabase
            .from('comments')
            .insert({
              pomodoro_id: pomId,
              user_id: userId,
              comment_text: comment.commentText,
            });

          if (!error) commentCount++;
        } catch (error) {
          // Continue on error
        }
      }
    }
    console.log(`   ✅ Imported ${commentCount} comments\n`);

    // Summary
    console.log('✅ Import complete!\n');
    console.log('📊 Final Summary:');
    console.log(`   Users:      ${userCount}/${users.length}`);
    console.log(`   Pomodoros:  ${pomCount}/${pomodoros.length}`);
    console.log(`   Likes:      ${likeCount}`);
    console.log(`   Comments:   ${commentCount}`);

    console.log('\n🎉 Migration successful!');
    console.log('\n▶️  Next: Validate data in Supabase Dashboard');
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

importData();
