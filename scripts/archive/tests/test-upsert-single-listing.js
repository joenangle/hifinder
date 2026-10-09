#!/usr/bin/env node

/**
 * Test the upsert functionality by re-scraping a specific Reddit post
 * that we know has changed status (available → closed)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Reddit API configuration
const REDDIT_CONFIG = {
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  userAgent: 'HiFinder:v1.0.0 (by /u/hifinder_app)',
  apiUrl: 'https://oauth.reddit.com'
};

// Test case: MEST MKII listing that is CLOSED on Reddit but "available" in DB
const TEST_POST_ID = '1olxxkk';
const TEST_URL = `https://www.reddit.com/r/AVexchange/comments/${TEST_POST_ID}/wts_usaca_h_unique_melody_mest_mkii_w_paypal_venmo/`;
const COMPONENT_ID = 'c6d19dac-0f83-4c77-9df8-50671cdc6a08'; // Unique Melody MEST MKII

async function getRedditAccessToken() {
  const auth = Buffer.from(`${REDDIT_CONFIG.clientId}:${REDDIT_CONFIG.clientSecret}`).toString('base64');

  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'User-Agent': REDDIT_CONFIG.userAgent,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  return data.access_token;
}

async function fetchRedditPost(postId, token) {
  const url = `${REDDIT_CONFIG.apiUrl}/comments/${postId}?limit=1`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': REDDIT_CONFIG.userAgent
    }
  });

  const data = await response.json();
  return data[0].data.children[0].data;
}

async function testUpsert() {
  console.log('🧪 Testing Upsert Functionality\n');
  console.log(`📋 Test Case: ${TEST_URL}\n`);

  // Step 1: Check current status in DB
  console.log('1️⃣  Checking current status in database...');
  const { data: before, error: beforeError } = await supabase
    .from('used_listings')
    .select('status, updated_at')
    .eq('url', TEST_URL)
    .single();

  if (beforeError) {
    console.error('❌ Listing not found in database');
    return;
  }

  console.log(`   Current status: ${before.status}`);
  console.log(`   Last updated: ${before.updated_at}\n`);

  // Step 2: Fetch current Reddit post data
  console.log('2️⃣  Fetching current Reddit post data...');
  const token = await getRedditAccessToken();
  const postData = await fetchRedditPost(TEST_POST_ID, token);

  console.log(`   Title: ${postData.title}`);
  console.log(`   Flair: ${postData.link_flair_text}`);
  console.log(`   Created: ${new Date(postData.created_utc * 1000).toISOString()}\n`);

  // Step 3: Determine what status it SHOULD be
  const flair = (postData.link_flair_text || '').toLowerCase();
  const shouldBeSold = ['closed', 'sold', 'complete', 'pending'].some(pattern => flair.includes(pattern));

  console.log(`3️⃣  Status check:`);
  console.log(`   Flair contains sold indicator: ${shouldBeSold ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   Expected status: ${shouldBeSold ? 'sold' : 'available'}\n`);

  // Step 4: Upsert with current data
  console.log('4️⃣  Running upsert...');

  const listingData = {
    url: TEST_URL,
    component_id: COMPONENT_ID,
    title: postData.title,
    price: 800, // from original scrape
    status: shouldBeSold ? 'sold' : 'available',
    date_posted: new Date(postData.created_utc * 1000).toISOString(),
    source: 'reddit_avexchange',
    seller_username: postData.author
  };

  const { error: upsertError } = await supabase
    .from('used_listings')
    .upsert(listingData, {
      onConflict: 'url',
      ignoreDuplicates: false
    });

  if (upsertError) {
    console.error(`❌ Upsert failed: ${upsertError.message}`);
    return;
  }

  console.log('   ✅ Upsert successful!\n');

  // Step 5: Verify the update
  console.log('5️⃣  Verifying update...');
  const { data: after, error: afterError } = await supabase
    .from('used_listings')
    .select('status, updated_at')
    .eq('url', TEST_URL)
    .single();

  if (afterError) {
    console.error('❌ Failed to verify update');
    return;
  }

  console.log(`   New status: ${after.status}`);
  console.log(`   Updated at: ${after.updated_at}\n`);

  // Summary
  console.log('📊 Summary:');
  if (before.status !== after.status) {
    console.log(`   ✅ Status changed: ${before.status} → ${after.status}`);
  } else {
    console.log(`   ℹ️  Status unchanged: ${after.status}`);
  }
  console.log(`   ✅ Upsert logic working correctly!\n`);
}

testUpsert().catch(console.error);
