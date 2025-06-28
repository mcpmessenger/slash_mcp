import { createClient } from '@supabase/supabase-js';

let client = null;

export function initSupabase(url, serviceRoleKey) {
  try {
    client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
    console.log('Supabase client initialized');
    return true;
  } catch (err) {
    console.error('Failed to init Supabase', err);
    client = null;
    return false;
  }
}

export function getSupabase() {
  return client;
}
