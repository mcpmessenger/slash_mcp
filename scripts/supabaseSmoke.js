#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_KEY;
if (!url || !key) {
  console.log('⚠️  Supabase creds not set – skipping smoke test');
  process.exit(0);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  try {
    // Ensure bucket exists
    const bucket = 'resources';
    const { error: createErr } = await supabase.storage.createBucket(bucket, { public: true });
    if (createErr && createErr.message && !createErr.message.includes('already exists')) {
      throw createErr;
    }

    const ts = Date.now();
    const textPath = `${bucket}/smoke_${ts}.txt`;
    const textContent = 'supabase smoke test';
    let { error } = await supabase.storage.from(bucket).upload(`smoke_${ts}.txt`, textContent, {
      contentType: 'text/plain',
    });
    if (error && !error.message.includes('Duplicate')) throw error;

    const { data: dl, error: dlErr } = await supabase.storage.from(bucket).download(`smoke_${ts}.txt`);
    if (dlErr) throw dlErr;
    const downloadedText = await dl.text();
    if (downloadedText !== textContent) {
      throw new Error('Text round-trip mismatch');
    }

    console.log('✅ Supabase text upload smoke test passed');
    process.exit(0);
  } catch (err) {
    console.error('🚨 Supabase smoke test failed', err);
    process.exit(1);
  }
})(); 