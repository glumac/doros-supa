#!/usr/bin/env tsx
/**
 * Download images from Sanity CDN
 * Downloads all pomodoro images to local storage
 * Run with: npm run migrate:download
 */

import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import https from 'https';

interface Pomodoro {
  _id: string;
  imageUrl?: string;
  [key: string]: any;
}

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(filepath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filepath).catch(() => {}); // Clean up on error
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(filepath).catch(() => {}); // Clean up on error
      reject(err);
    });
  });
}

async function downloadAllImages() {
  console.log('🚀 Starting image download...\n');

  try {
    // Read pomodoros data
    const pomodorosData = await fs.readFile('migration-data/pomodoros.json', 'utf8');
    const pomodoros: Pomodoro[] = JSON.parse(pomodorosData);

    // Filter pomodoros with images
    const pomodorosWithImages = pomodoros.filter(p => p.imageUrl);
    console.log(`📊 Found ${pomodorosWithImages.length} pomodoros with images\n`);

    if (pomodorosWithImages.length === 0) {
      console.log('✅ No images to download');
      return;
    }

    // Create images directory
    await fs.mkdir('migration-data/images', { recursive: true });

    // Download images
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < pomodorosWithImages.length; i++) {
      const pom = pomodorosWithImages[i];
      const filename = `${pom._id}.jpg`;
      const filepath = path.join('migration-data/images', filename);

      try {
        console.log(`[${i + 1}/${pomodorosWithImages.length}] Downloading ${filename}...`);
        await downloadImage(pom.imageUrl!, filepath);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    // Summary
    console.log('\n✅ Download complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed:     ${errorCount}`);
    console.log(`   Total:      ${pomodorosWithImages.length}`);
    console.log('\n📁 Images saved to: migration-data/images/');
    console.log('\n▶️  Next step: npm run migrate:import');
  } catch (error) {
    console.error('\n❌ Download failed:', error);
    process.exit(1);
  }
}

downloadAllImages();
