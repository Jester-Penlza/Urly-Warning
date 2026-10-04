/**
 * Supabase Configuration
 * 
 * Save your Supabase project credentials here.
 * These should be kept SECRET and never committed to version control.
 * 
 * To get your credentials:
 * 1. Go to https://supabase.com
 * 2. Create or open a project
 * 3. Go to Project Settings > API
 * 4. Copy the URL and anon key
 */

const supabaseConfig = {
  // Your Supabase project URL
  // Format: https://<project-id>.supabase.co
  url: process.env.SUPABASE_URL || '',

  // Your Supabase anon key (public, safe to expose)
  anonKey:
    process.env.SUPABASE_ANON_KEY ||
    '',

  // Optional: Service role key (SECRET, keep in .env only)
  serviceKey: process.env.SUPABASE_SERVICE_KEY || null,
};

export default supabaseConfig;
