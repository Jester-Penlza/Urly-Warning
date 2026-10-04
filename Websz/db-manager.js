// Database Manager for URLY Scanner - Supabase Edition
// Handles all database operations for storing scans, statistics, blocklists, and config

import { supabase } from './supabase-config.js';

// ============================================
// SCAN OPERATIONS
// ============================================

/**
 * Save a new scan result to the database
 */
export async function saveScan(scanData) {
  try {
    // Extract data from the comprehensive scan object
    const url = scanData.inputUrl || scanData.url;
    const httpInfo = scanData.http || {};
    const dnsInfo = scanData.dns || {};
    const tlsInfo = scanData.tls || {};
    const heuristics = scanData.heuristics || {};
    const blocklist = scanData.blocklist || {};
    const gsb = scanData.gsb || {};
    const verdict = scanData.verdict || {};
    
    // Determine status based on risk level
    let status = 'safe';
    if (verdict.risk === 'high' || verdict.risk === 'critical') {
      status = 'unsafe';
    } else if (verdict.risk === 'medium') {
      status = 'caution';
    }

    // Calculate risk score and safety score
    // Heuristics score is 0-100 (higher = more risky)
    const heuristicScore = heuristics.score || 0;
    
    // Calculate safety score (0-100, where 100 is safest)
    let safetyScore = 100 - heuristicScore;
    
    // Adjust safety score based on threats
    if (blocklist.match || blocklist.isBlocked) {
      safetyScore = Math.min(safetyScore, 25);
    }
    if (gsb.verdict === 'unsafe' || (gsb.threats && gsb.threats.length > 0)) {
      safetyScore = Math.min(safetyScore, 20);
    }
    
    // Risk score is inverse of safety score (100 - safetyScore)
    const riskScore = 100 - safetyScore;

    const { data, error } = await supabase
      .from('scans')
      .insert([{
        // URL Information
        url: url,
        normalized_url: httpInfo.normalizedUrl || url,
        protocol: httpInfo.protocol,
        hostname: dnsInfo.hostname || new URL(url).hostname,
        
        // Scores and Status
        risk_score: Math.round(riskScore),
        safety_score: Math.round(safetyScore),
        status: status,
        rating: verdict.risk || 'low',
        
        // Heuristics
        heuristic_score: heuristics.score || 0,
        heuristic_flags: JSON.stringify(heuristics.flags || []),
        
        // External Checks
        gsb_verdict: gsb.verdict || 'safe',
        gsb_threats: JSON.stringify(gsb.threats || []),
        blocklist_match: blocklist.match || blocklist.isBlocked || false,
        blocklist_type: blocklist.matchType || blocklist.source,
        
        // Technical Details
        dns_resolved: dnsInfo.ok !== false && dnsInfo.resolved !== false,
        ssl_valid: tlsInfo.ok ?? tlsInfo.valid,
        ssl_expires_days: tlsInfo.daysToExpire ?? tlsInfo.daysUntilExpiry,
        http_status: httpInfo.status ?? httpInfo.statusCode,
        redirects: httpInfo.redirects ?? httpInfo.redirectCount ?? 0,
        
        // Metadata  
        scanned_at: new Date().toISOString(),
        ip_address: dnsInfo.ip,
        user_agent: httpInfo.userAgent
      }])
      .select()
      .single();

    if (error) throw error;
    
    // Save recommendations if provided (recommendations is an object with messages, actions, context arrays)
    if (scanData.recommendations && typeof scanData.recommendations === 'object') {
      await saveRecommendations(data.id, scanData.recommendations);
    }
    
    return data.id;
  } catch (error) {
    console.error('Error saving scan:', error);
    throw error;
  }
}

/**
 * Get all scans with optional filtering
 */
export async function getScans(filters = {}) {
  try {
    let query = supabase
      .from('scans')
      .select('*')
      .order('scanned_at', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.search) {
      query = query.or(`url.ilike.%${filters.search}%,hostname.ilike.%${filters.search}%`);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting scans:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a specific scan by ID
 */
export async function getScanById(id) {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting scan:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// RECOMMENDATIONS OPERATIONS
// ============================================

/**
 * Save recommendations for a scan
 */
export async function saveRecommendations(scanId, recommendations) {
  try {
    // Handle the actual recommendations structure from scan-server.js
    // It's an object with: { rating, messages[], actions[], context[] }
    if (!recommendations || typeof recommendations !== 'object') {
      console.log('No recommendations to save');
      return { success: true, data: [] };
    }

    const records = [];
    
    // Add main messages as recommendations
    if (recommendations.messages && Array.isArray(recommendations.messages)) {
      recommendations.messages.forEach(message => {
        records.push({
          scan_id: scanId,
          rating: recommendations.rating || 'info',
          message: message,
          action: null,
          context: null
        });
      });
    }
    
    // Add actions as recommendations
    if (recommendations.actions && Array.isArray(recommendations.actions)) {
      recommendations.actions.forEach(action => {
        records.push({
          scan_id: scanId,
          rating: recommendations.rating || 'info',
          message: null,
          action: action,
          context: null
        });
      });
    }
    
    // Add context items as recommendations
    if (recommendations.context && Array.isArray(recommendations.context)) {
      recommendations.context.forEach(ctx => {
        records.push({
          scan_id: scanId,
          rating: recommendations.rating || 'info',
          message: null,
          action: null,
          context: ctx
        });
      });
    }

    if (records.length === 0) {
      console.log('No recommendation records to insert');
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('scan_recommendations')
      .insert(records)
      .select();

    if (error) throw error;
    console.log(`✅ Saved ${records.length} recommendations for scan ${scanId}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error saving recommendations:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recommendations for a specific scan
 */
export async function getRecommendations(scanId) {
  try {
    const { data, error } = await supabase
      .from('scan_recommendations')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// STATISTICS OPERATIONS
// ============================================

/**
 * Update scan statistics for today
 */
export async function updateStatistics(scanData = {}) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Get today's stats or create new
    const { data: existing } = await supabase
      .from('scan_statistics')
      .select('*')
      .eq('stat_date', today)
      .single();

    const status = scanData.status || 'safe';
    const riskScore = scanData.risk_score || 0;
    const gsbThreats = scanData.gsb_threats ? (Array.isArray(scanData.gsb_threats) ? scanData.gsb_threats.length : 0) : 0;
    const blocklistMatch = scanData.blocklist_match ? 1 : 0;

    const statsData = {
      stat_date: today,
      total_scans: (existing?.total_scans || 0) + 1,
      safe_count: (existing?.safe_count || 0) + (status === 'safe' ? 1 : 0),
      caution_count: (existing?.caution_count || 0) + (status === 'caution' ? 1 : 0),
      unsafe_count: (existing?.unsafe_count || 0) + (status === 'unsafe' ? 1 : 0),
      gsb_threats_found: (existing?.gsb_threats_found || 0) + gsbThreats,
      blocklist_matches: (existing?.blocklist_matches || 0) + blocklistMatch,
      avg_risk_score: existing 
        ? ((existing.avg_risk_score * existing.total_scans) + riskScore) / (existing.total_scans + 1)
        : riskScore
    };

    const { data, error } = existing
      ? await supabase
          .from('scan_statistics')
          .update(statsData)
          .eq('stat_date', today)
          .select()
          .single()
      : await supabase
          .from('scan_statistics')
          .insert([statsData])
          .select()
          .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating statistics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get statistics for a date range
 */
export async function getStatistics(days = 30, endDate = null) {
  try {
    let startDate;
    let endDateStr = null;

    if (typeof days === 'string') {
      startDate = new Date(`${days}T00:00:00Z`);
      endDateStr = endDate ? new Date(`${endDate}T23:59:59Z`).toISOString().split('T')[0] : null;
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days || 30));
    }
    const startDateStr = startDate.toISOString().split('T')[0];

    let query = supabase
      .from('scan_statistics')
      .select('*')
      .gte('stat_date', startDateStr)
      .order('stat_date', { ascending: false });

    if (endDateStr) query = query.lte('stat_date', endDateStr);

    const { data, error } = await query;

    if (error) throw error;
    
    // Calculate totals
    const rows = data || [];
    const totals = rows.reduce((acc, day) => ({
      total_scans: acc.total_scans + day.total_scans,
      safe_count: acc.safe_count + day.safe_count,
      caution_count: acc.caution_count + day.caution_count,
      unsafe_count: acc.unsafe_count + day.unsafe_count,
      gsb_threats_found: acc.gsb_threats_found + day.gsb_threats_found,
      blocklist_matches: acc.blocklist_matches + day.blocklist_matches
    }), { 
      total_scans: 0, 
      safe_count: 0, 
      caution_count: 0,
      unsafe_count: 0,
      gsb_threats_found: 0,
      blocklist_matches: 0
    });

    return { 
      success: true, 
      data: rows,
      totals: totals
    };
  } catch (error) {
    console.error('Error getting statistics:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// BLOCKLIST OPERATIONS
// ============================================

/**
 * Add a URL to the blocklist
 */
export async function addToBlocklist(typeOrUrl, valueOrReason = null, reason = null, addedBy = 'api') {
  try {
    const knownTypes = new Set(['url', 'hostname', 'pattern']);
    const isTypedCall = knownTypes.has(typeOrUrl);
    const entryType = isTypedCall ? typeOrUrl : 'url';
    const value = isTypedCall ? valueOrReason : typeOrUrl;
    const entryReason = isTypedCall ? reason : valueOrReason;

    if (!value) return { success: false, error: 'Blocklist value is required' };

    const { data, error } = await supabase
      .from('blocklist')
      .insert([{
        entry_type: entryType,
        value,
        reason: entryReason,
        added_by: addedBy,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error adding to blocklist:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if a URL is in the blocklist
 */
export async function checkBlocklist(url) {
  try {
    const { data, error } = await supabase
      .from('blocklist')
      .select('*')
      .eq('value', url)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, isBlocked: !!data, data };
  } catch (error) {
    console.error('Error checking blocklist:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all blocklisted URLs
 */
export async function getBlocklist() {
  try {
    const { data, error } = await supabase
      .from('blocklist')
      .select('*')
      .eq('is_active', true)
      .order('added_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Remove a URL from the blocklist
 */
export async function removeFromBlocklist(idOrValue) {
  try {
    let query = supabase.from('blocklist').delete();
    query = /^\d+$/.test(String(idOrValue))
      ? query.eq('id', Number(idOrValue))
      : query.eq('value', idOrValue);

    const { error } = await query;

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error removing from blocklist:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load blocklist to memory (for scan-server compatibility)
 */
export async function loadBlocklistToMemory() {
  try {
    const result = await getBlocklist();
    const blocklist = {
      urls: new Set(),
      hosts: new Set(),
      patterns: []
    };

    if (result.success && result.data && Array.isArray(result.data)) {
      result.data.forEach(item => {
        if (item.entry_type === 'url') {
          blocklist.urls.add(item.value);
        } else if (item.entry_type === 'hostname') {
          blocklist.hosts.add(item.value);
        } else if (item.entry_type === 'pattern') {
          blocklist.patterns.push(item.value);
        }
      });
    }

    return blocklist;
  } catch (error) {
    console.error('Error loading blocklist to memory:', error);
    return {
      urls: new Set(),
      hosts: new Set(),
      patterns: []
    };
  }
}

// ============================================
// CONFIGURATION OPERATIONS
// ============================================

/**
 * Get a configuration value
 */
export async function getConfig(key) {
  try {
    const { data, error } = await supabase
      .from('configuration')
      .select('*')
      .eq('config_key', key)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { success: true, data: data ? { ...data, value: parseConfigValue(data.config_value, data.config_type) } : null };
  } catch (error) {
    console.error('Error getting config:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all configuration settings
 */
export async function getAllConfig() {
  try {
    const { data, error } = await supabase
      .from('configuration')
      .select('*')
      .order('config_key', { ascending: true });

    if (error) throw error;
    const config = Object.fromEntries((data || []).map((row) => [row.config_key, {
      ...row,
      value: parseConfigValue(row.config_value, row.config_type)
    }]));
    return { success: true, data: config };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Update a configuration value
 */
export async function updateConfig(key, value, type = null, description = null) {
  try {
    const configType = type || inferConfigType(value);
    const { data, error } = await supabase
      .from('configuration')
      .upsert({
        config_key: key,
        config_value: String(value),
        config_type: configType,
        description,
        updated_at: new Date().toISOString()
      }, { onConflict: 'config_key' })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating config:', error);
    return { success: false, error: error.message };
  }
}

function inferConfigType(value) {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (value && typeof value === 'object') return 'json';
  return 'string';
}

function parseConfigValue(value, type = 'string') {
  if (value === null || value === undefined) return value;
  if (type === 'boolean') return value === true || String(value).toLowerCase() === 'true';
  if (type === 'number') return Number(value);
  if (type === 'json') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

// Compatibility helpers used by the HTTP API and the existing verification scripts.
export async function getRecentScans(limit = 100) {
  const result = await getScans({ limit });
  if (!result.success) throw new Error(result.error || 'Unable to retrieve scans');
  return result.data || [];
}

export async function searchScans(search) {
  const result = await getScans({ search, limit: 100 });
  if (!result.success) throw new Error(result.error || 'Unable to search scans');
  return result.data || [];
}

export async function getTodayStats() {
  const today = new Date().toISOString().split('T')[0];
  const result = await getStatistics(today, today);
  if (!result.success) throw new Error(result.error || 'Unable to retrieve today statistics');
  return result.data?.[0] || {
    stat_date: today,
    total_scans: 0,
    safe_count: 0,
    caution_count: 0,
    unsafe_count: 0,
    avg_risk_score: 0,
    gsb_threats_found: 0,
    blocklist_matches: 0
  };
}

export async function getSummaryStats() {
  const result = await getStatistics(36500);
  if (!result.success) throw new Error(result.error || 'Unable to retrieve summary statistics');
  const today = await getTodayStats();
  const rows = result.data || [];
  const weightedRiskTotal = rows.reduce((sum, row) => sum + (Number(row.avg_risk_score || 0) * Number(row.total_scans || 0)), 0);
  const totalScans = result.totals.total_scans || 0;
  return {
    totalScans,
    todayScans: today.total_scans || 0,
    averageRisk: totalScans ? weightedRiskTotal / totalScans : 0,
    statusBreakdown: {
      safe: result.totals.safe_count || 0,
      caution: result.totals.caution_count || 0,
      unsafe: result.totals.unsafe_count || 0
    }
  };
}

export async function getAllBlocklist() {
  const result = await getBlocklist();
  if (!result.success) throw new Error(result.error || 'Unable to retrieve blocklist');
  return result.data || [];
}

export async function isInBlocklist(value) {
  const result = await checkBlocklist(value);
  if (!result.success) throw new Error(result.error || 'Unable to check blocklist');
  return result.isBlocked;
}

export async function cleanupOldScans(days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days || 30));
  const { data, error } = await supabase
    .from('scans')
    .delete()
    .lt('scanned_at', cutoff.toISOString())
    .select('id');
  if (error) throw error;
  return data?.length || 0;
}

export async function enforceMaxHistory(maxHistory = 1000) {
  const { data: keepBoundary, error: readError } = await supabase
    .from('scans')
    .select('scanned_at')
    .order('scanned_at', { ascending: false })
    .range(Number(maxHistory), Number(maxHistory));
  if (readError) throw readError;
  if (!keepBoundary?.length) return 0;

  const { data, error } = await supabase
    .from('scans')
    .delete()
    .lte('scanned_at', keepBoundary[0].scanned_at)
    .select('id');
  if (error) throw error;
  return data?.length || 0;
}

/**
 * Initialize default configuration if not exists
 */
export async function initializeConfig() {
  try {
    const { data: existing } = await supabase
      .from('configuration')
      .select('config_key');

    if (existing && existing.length > 0) {
      return { success: true, message: 'Config already initialized' };
    }

    const defaultConfig = [
      { config_key: 'api_enabled', config_value: 'true' },
      { config_key: 'max_scans_per_day', config_value: '1000' },
      { config_key: 'cache_duration', config_value: '3600' },
      { config_key: 'auto_block_threats', config_value: 'false' },
      { config_key: 'notification_email', config_value: '' },
      { config_key: 'scan_timeout', config_value: '30' },
      { config_key: 'enable_recommendations', config_value: 'true' },
      { config_key: 'log_level', config_value: 'info' },
      { config_key: 'gsb_api_key', config_value: '' },
      { config_key: 'maintenance_mode', config_value: 'false' }
    ];

    const { data, error } = await supabase
      .from('configuration')
      .insert(defaultConfig)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error initializing config:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('configuration')
      .select('count')
      .limit(1);

    if (error) throw error;
    console.log('✅ Database connection successful!');
    return { success: true };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get database health status
 */
export async function getHealthStatus() {
  try {
    const stats = await getStatistics();
    const configCheck = await getAllConfig();
    
    return {
      success: true,
      status: 'healthy',
      stats: stats.data,
      configCount: Object.keys(configCheck.data || {}).length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Export all functions as default object as well
export default {
  // Scans
  saveScan,
  getScans,
  getRecentScans,
  searchScans,
  getScanById,
  
  // Recommendations
  saveRecommendations,
  getRecommendations,
  
  // Statistics
  updateStatistics,
  getStatistics,
  getTodayStats,
  getSummaryStats,
  
  // Blocklist
  addToBlocklist,
  checkBlocklist,
  getBlocklist,
  getAllBlocklist,
  isInBlocklist,
  removeFromBlocklist,
  loadBlocklistToMemory,
  
  // Configuration
  getConfig,
  getAllConfig,
  updateConfig,
  initializeConfig,

  // Cleanup
  cleanupOldScans,
  enforceMaxHistory,
  
  // Utilities
  testConnection,
  getHealthStatus
};
