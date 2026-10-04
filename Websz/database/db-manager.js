/**
 * Database Manager
 * Handles connection to Supabase PostgreSQL database
 */

import { createClient } from '@supabase/supabase-js';
import supabaseConfig from '../config/supabase-config.js';

let supabaseClient = null;

/**
 * Initialize Supabase client
 * Call this once on app startup
 */
export function initializeDatabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const { url, anonKey, serviceKey } = supabaseConfig;
  const apiKey = serviceKey || anonKey;

  if (!url || url === 'YOUR_SUPABASE_URL_HERE') {
    console.error('❌ Supabase URL not configured. Set SUPABASE_URL environment variable.');
    return null;
  }

  if (!apiKey || apiKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.error('❌ Supabase API key not configured. Set SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY environment variable.');
    return null;
  }

  try {
    supabaseClient = createClient(url, apiKey);
    console.log('✅ Database connected to Supabase');
    return supabaseClient;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error.message);
    return null;
  }
}

/**
 * Get the initialized Supabase client
 * @returns {SupabaseClient} Supabase client instance
 */
export function getDatabase() {
  if (!supabaseClient) {
    console.warn('⚠️ Database not initialized. Call initializeDatabase() first.');
    return initializeDatabase();
  }
  return supabaseClient;
}

/**
 * Test database connection
 */
export async function testConnection() {
  const db = getDatabase();
  if (!db) return false;

  try {
    const { error } = await db.from('users').select('id').limit(1);
    if (error) {
      console.error('❌ Database test failed:', error.message);
      return false;
    }
    console.log('✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error('❌ Database test error:', error.message);
    return false;
  }
}

export default {
  initializeDatabase,
  getDatabase,
  testConnection,
};
