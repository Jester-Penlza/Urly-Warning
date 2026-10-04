/**
 * Configuration Sync with Runtime API
 * Syncs React config changes with backend runtime config for real-time updates.
 */

import { configManagerInstance } from './useConfig';

const API_BASE = 'http://localhost:5050';

// Mapping between frontend config paths and backend runtime config keys.
const CONFIG_MAPPING = {
  // Scanning settings
  'scanning.enableDNSLookup': { key: 'dns_enabled', type: 'boolean' },
  'scanning.enableSSLCheck': { key: 'ssl_enabled', type: 'boolean' },
  'scanning.enableContentAnalysis': { key: 'heuristics_enabled', type: 'boolean' },
  'scanning.followRedirects': { key: 'follow_redirects', type: 'boolean' },
  'scanning.maxBatchSize': { key: 'max_batch_size', type: 'number' },
  'scanning.maxConcurrentRequests': { key: 'max_concurrent_requests', type: 'number' },
  'scanning.maxRedirects': { key: 'max_redirects', type: 'number' },
  
  // Security settings
  'api.googleSafeBrowsing.enabled': { key: 'gsb_enabled', type: 'boolean' },
  'heuristics.enabled': { key: 'heuristics_enabled', type: 'boolean' },
};

/**
 * Sync a single config value to runtime API.
 */
async function syncConfigToRuntime(path, value) {
  const mapping = CONFIG_MAPPING[path];
  
  if (!mapping) {
    // Not runtime-synced config, skip.
    return;
  }
  
  try {
    console.log(`🔄 Syncing config to runtime API: ${path} = ${value}`);
    
    const response = await fetch(`${API_BASE}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: mapping.key,
        value: value,
        type: mapping.type,
        description: `Auto-synced from frontend: ${path}`
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Config synced: ${mapping.key}`);
      return result;
    } else {
      console.warn(`⚠️ Failed to sync config: ${response.status}`);
    }
  } catch (error) {
    console.warn(`⚠️ Runtime config sync failed:`, error.message);
    // Do not block UI if backend is temporarily unavailable.
  }
}

/**
 * Load config from runtime API on startup.
 */
async function loadConfigFromRuntime() {
  try {
    console.log('📥 Loading runtime config...');
    
    const response = await fetch(`${API_BASE}/api/config`);
    if (!response.ok) {
      console.warn('⚠️ Could not load runtime config');
      return;
    }
    
    const result = await response.json();
    const runtimeConfig = result.config || {};
    
    // Reverse mapping: backend keys to frontend paths.
    const REVERSE_MAPPING = {};
    Object.entries(CONFIG_MAPPING).forEach(([path, { key }]) => {
      REVERSE_MAPPING[key] = path;
    });
    
    // Update frontend config with backend runtime values.
    let updatedCount = 0;
    Object.entries(runtimeConfig).forEach(([key, rawValue]) => {
      const frontendPath = REVERSE_MAPPING[key];
      if (frontendPath) {
        const currentValue = configManagerInstance.get(frontendPath);
        // Support both shapes:
        // 1) { config: { key: primitive } }
        // 2) { config: { key: { value: primitive } } }
        const nextValue = (rawValue && typeof rawValue === 'object' && 'value' in rawValue)
          ? rawValue.value
          : rawValue;
        if (currentValue !== nextValue) {
          configManagerInstance.set(frontendPath, nextValue);
          updatedCount++;
        }
      }
    });
    
    if (updatedCount > 0) {
      console.log(`✅ Loaded ${updatedCount} runtime config values`);
    } else {
      console.log('✅ Runtime config in sync');
    }
  } catch (error) {
    console.warn('⚠️ Failed to load runtime config:', error.message);
  }
}

/**
 * Initialize config sync system
 */
export function initConfigSync() {
  console.log('🔄 Initializing config sync with runtime API...');
  
  // Load config from runtime API on startup.
  loadConfigFromRuntime();
  
  // Subscribe to config changes and sync to backend runtime API
  configManagerInstance.subscribe((newConfig) => {
    // Individual sync is handled by the set wrapper below.
  });
  
  // Wrap the set method to auto-sync
  const originalSet = configManagerInstance.set.bind(configManagerInstance);
  configManagerInstance.set = function(path, value) {
    const result = originalSet(path, value);
    // Sync to backend (async, do not block UI).
    syncConfigToRuntime(path, value);
    return result;
  };
  
  console.log('✅ Config sync initialized');
}

export { syncConfigToRuntime, loadConfigFromRuntime };
