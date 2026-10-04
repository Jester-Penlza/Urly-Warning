/**
 * Configuration Sync with Database
 * Syncs React config changes with backend database for real-time updates
 */

import { configManagerInstance } from './useConfig';

const IS_STATIC_DEPLOYMENT = import.meta.env.VITE_STATIC_DEPLOYMENT === 'true';

const API_BASE = import.meta.env.VITE_SCANNER_API_BASE ||
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `${window.location.protocol}//${window.location.hostname}:5050`
    : window.location.origin);

// Mapping between frontend config paths and backend database keys
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
 * Sync a single config value to database
 */
async function syncConfigToDatabase(path, value) {
  const mapping = CONFIG_MAPPING[path];
  
  if (!mapping) {
    // Not a database-synced config, skip
    return;
  }
  
  try {
    console.log(`🔄 Syncing config to database: ${path} = ${value}`);
    
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
      console.log(`✅ Config synced to database: ${mapping.key}`);
      return result;
    } else {
      console.warn(`⚠️ Failed to sync config: ${response.status}`);
    }
  } catch (error) {
    console.warn(`⚠️ Database sync failed:`, error.message);
    // Don't block UI if database is unavailable
  }
}

/**
 * Load config from database on startup
 */
async function loadConfigFromDatabase() {
  try {
    console.log('📥 Loading config from database...');
    
    const response = await fetch(`${API_BASE}/api/config`);
    if (!response.ok) {
      console.warn('⚠️ Could not load database config');
      return;
    }
    
    const result = await response.json();
    const dbConfig = result.config || {};
    
    // Reverse mapping: database keys to frontend paths
    const REVERSE_MAPPING = {};
    Object.entries(CONFIG_MAPPING).forEach(([path, { key }]) => {
      REVERSE_MAPPING[key] = path;
    });
    
    // Update frontend config with database values
    let updatedCount = 0;
    Object.entries(dbConfig).forEach(([key, dbValue]) => {
      const frontendPath = REVERSE_MAPPING[key];
      if (frontendPath) {
        const currentValue = configManagerInstance.get(frontendPath);
        if (currentValue !== dbValue.value) {
          configManagerInstance.set(frontendPath, dbValue.value);
          updatedCount++;
        }
      }
    });
    
    if (updatedCount > 0) {
      console.log(`✅ Loaded ${updatedCount} config values from database`);
    } else {
      console.log('✅ Database config in sync');
    }
  } catch (error) {
    console.warn('⚠️ Failed to load database config:', error.message);
  }
}

/**
 * Initialize config sync system
 */
export function initConfigSync() {
  if (IS_STATIC_DEPLOYMENT) {
    console.log('ℹ️ Static deployment: settings are stored in this browser only');
    return;
  }

  console.log('🔄 Initializing config sync with database...');
  
  // Load config from database on startup
  loadConfigFromDatabase();
  
  // Subscribe to config changes and sync to database
  configManagerInstance.subscribe((newConfig) => {
    // We'll sync individual changes as they happen
    // This is handled by the updateConfig wrapper below
  });
  
  // Wrap the set method to auto-sync
  const originalSet = configManagerInstance.set.bind(configManagerInstance);
  configManagerInstance.set = function(path, value) {
    const result = originalSet(path, value);
    // Sync to database (async, don't wait)
    syncConfigToDatabase(path, value);
    return result;
  };
  
  console.log('✅ Config sync initialized');
}

export { syncConfigToDatabase, loadConfigFromDatabase };
