#!/usr/bin/env node

/**
 * Check status of a specific Reddit listing in the database
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

// Get URL from command line or use default test case
const testUrl = process.argv[2] || 'https://www.reddit.com/r/AVexchange/comments/1olxxkk/wts_usaca_h_unique_melody_mest_mkii_w_paypal_venmo/';

console.log(`\n🔍 Checking listing: ${testUrl}\n`);

const { data, error } = await supabase
  .from('used_listings')
  .select('*')
  .eq('url', testUrl)
  .single();

if (error) {
  console.log('❌ Listing NOT found in database');
  console.log(`   Error: ${error.message}`);
  console.log('\n💡 This listing may not have been scraped yet, or the URL format differs.');
} else {
  console.log('✅ Found in database:\n');
  console.log(`   Title: ${data.title}`);
  console.log(`   Status: ${data.status}`);
  console.log(`   Price: $${data.price}`);
  console.log(`   Date posted: ${data.date_posted}`);
  console.log(`   Date sold: ${data.date_sold || 'N/A'}`);
  console.log(`   Seller: ${data.seller_username || 'N/A'}`);
  console.log(`   Buyer: ${data.buyer_username || 'N/A'}`);
  console.log(`   Bot confirmed: ${data.avexchange_bot_confirmed ? '✅ Yes' : '❌ No'}`);
  console.log(`   Last updated: ${data.updated_at || 'N/A'}`);
  console.log(`   Component ID: ${data.component_id}`);
}

console.log('');
