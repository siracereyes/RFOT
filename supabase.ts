
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eruihoqhsatieenkqclf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydWlob3Foc2F0aWVlbmtxY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzAwNTMsImV4cCI6MjA4NDAwNjA1M30.eR_QK0xzwXcD56b3JcOhxA-AG_K0JU0zW-n4_6erETQ';

// Primary client for the logged-in user session
export const supabase = createClient(supabaseUrl, supabaseKey);

// Secondary client for background auth operations (prevents auto-logout during judge creation)
export const authClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
