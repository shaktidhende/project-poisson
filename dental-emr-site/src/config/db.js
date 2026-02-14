import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ukabjwrlpnxaybrawxbc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrYWJqd3JscG54YXlicmF3eGJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzczODksImV4cCI6MjA4NTE1MzM4OX0.9vWWhS7GSgCwUOQc0mxClKxs4NYwzrxFfjGxXWaPrUg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export function initDb() {
  console.log('Supabase DB client ready');
}

export default supabase;
