// Database API Routes for URLY Scanner
// Add these routes to your scan-server.js

import dbManager from './db-manager.js';

function unwrap(result, label) {
  if (!result || result.success === false) {
    throw new Error(result?.error || `${label} failed`);
  }
  return result.data;
}

// ==================== SCAN HISTORY ENDPOINTS ====================

/**
 * GET /api/scans/recent
 * Get recent scans
 */
export async function getRecentScansRoute(req, res) {
  const limit = parseInt(req.query.limit) || 100;
  const scans = await dbManager.getRecentScans(limit);
  res.json({ success: true, count: scans.length, scans });
}

/**
 * GET /api/scans/:id
 * Get scan by ID with recommendations
 */
export async function getScanByIdRoute(req, res) {
  const { id } = req.params;
  const scan = unwrap(await dbManager.getScanById(parseInt(id)), 'Get scan');
  
  if (!scan) {
    return res.status(404).json({ success: false, error: 'Scan not found' });
  }
  
  res.json({ success: true, scan });
}

/**
 * GET /api/scans/search
 * Search scans by URL or hostname
 */
export async function searchScansRoute(req, res) {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({ success: false, error: 'Query parameter required' });
  }
  
  const scans = await dbManager.searchScans(q);
  res.json({ success: true, count: scans.length, scans });
}

// ==================== STATISTICS ENDPOINTS ====================

/**
 * GET /api/stats/today
 * Get today's statistics
 */
export async function getTodayStatsRoute(req, res) {
  const stats = await dbManager.getTodayStats();
  res.json({ success: true, stats });
}

/**
 * GET /api/stats/summary
 * Get summary statistics
 */
export async function getSummaryStatsRoute(req, res) {
  const stats = await dbManager.getSummaryStats();
  res.json({ success: true, stats });
}

/**
 * GET /api/stats/range
 * Get statistics for date range
 */
export async function getStatsRangeRoute(req, res) {
  const { start, end } = req.query;
  
  if (!start || !end) {
    return res.status(400).json({ 
      success: false, 
      error: 'Start and end date required (YYYY-MM-DD)' 
    });
  }
  
  const result = await dbManager.getStatistics(start, end);
  const stats = unwrap(result, 'Get statistics');
  res.json({ success: true, count: stats.length, stats, totals: result.totals });
}

// ==================== BLOCKLIST ENDPOINTS ====================

/**
 * GET /api/blocklist
 * Get all blocklist entries
 */
export async function getBlocklistRoute(req, res) {
  const entries = await dbManager.getAllBlocklist();
  res.json({ success: true, count: entries.length, entries });
}

/**
 * POST /api/blocklist
 * Add entry to blocklist
 */
export async function addToBlocklistRoute(req, res) {
  const { type, value, reason, addedBy } = req.body;
  
  if (!type || !value) {
    return res.status(400).json({ 
      success: false, 
      error: 'Type and value required' 
    });
  }
  
  if (!['url', 'hostname', 'pattern'].includes(type)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Type must be: url, hostname, or pattern' 
    });
  }
  
  const result = await dbManager.addToBlocklist(type, value, reason, addedBy || 'api');
  res.status(result.success ? 201 : 503).json({
    success: result.success,
    entry: result.data || null,
    error: result.error,
    message: result.success ? 'Added to blocklist' : 'Failed to add'
  });
}

/**
 * DELETE /api/blocklist/:value
 * Remove entry from blocklist
 */
export async function removeFromBlocklistRoute(req, res) {
  const { value } = req.params;
  const result = await dbManager.removeFromBlocklist(decodeURIComponent(value));
  res.status(result.success ? 200 : 503).json({
    success: result.success,
    error: result.error,
    message: result.success ? 'Removed from blocklist' : 'Failed to remove'
  });
}

/**
 * GET /api/blocklist/check/:value
 * Check if entry is in blocklist
 */
export async function checkBlocklistRoute(req, res) {
  const { value } = req.params;
  const inBlocklist = await dbManager.isInBlocklist(decodeURIComponent(value));
  res.json({ success: true, inBlocklist, blocked: inBlocklist });
}

// ==================== CONFIGURATION ENDPOINTS ====================

/**
 * GET /api/config
 * Get all configuration
 */
export async function getAllConfigRoute(req, res) {
  const config = unwrap(await dbManager.getAllConfig(), 'Get configuration');
  res.json({ success: true, config });
}

/**
 * GET /api/config/:key
 * Get specific configuration value
 */
export async function getConfigRoute(req, res) {
  const { key } = req.params;
  const row = unwrap(await dbManager.getConfig(key), 'Get configuration');
  const value = row?.value;
  
  if (value === null || value === undefined) {
    return res.status(404).json({ success: false, error: 'Config key not found' });
  }
  
  res.json({ success: true, key, value });
}

/**
 * POST /api/config
 * Set configuration value
 */
export async function setConfigRoute(req, res) {
  const { key, value, type, description } = req.body;
  
  if (!key || value === undefined) {
    return res.status(400).json({ 
      success: false, 
      error: 'Key and value required' 
    });
  }
  
  const result = await dbManager.updateConfig(key, value, type || null, description);
  res.status(result.success ? 200 : 503).json({
    success: result.success,
    config: result.data || null,
    error: result.error,
    message: result.success ? 'Config updated' : 'Failed to update'
  });
}

// ==================== CLEANUP ENDPOINTS ====================

/**
 * POST /api/cleanup/old-scans
 * Manually trigger cleanup of old scans
 */
export async function cleanupOldScansRoute(req, res) {
  const deleted = await dbManager.cleanupOldScans();
  res.json({ success: true, deleted, message: `Deleted ${deleted} old scan(s)` });
}

/**
 * POST /api/cleanup/enforce-limit
 * Manually enforce max history limit
 */
export async function enforceMaxHistoryRoute(req, res) {
  const deleted = await dbManager.enforceMaxHistory();
  res.json({ success: true, deleted, message: `Deleted ${deleted} scan(s)` });
}

// Export all routes
export default {
  // Scans
  getRecentScansRoute,
  getScanByIdRoute,
  searchScansRoute,
  
  // Statistics
  getTodayStatsRoute,
  getSummaryStatsRoute,
  getStatsRangeRoute,
  
  // Blocklist
  getBlocklistRoute,
  addToBlocklistRoute,
  removeFromBlocklistRoute,
  checkBlocklistRoute,
  
  // Configuration
  getAllConfigRoute,
  getConfigRoute,
  setConfigRoute,
  
  // Cleanup
  cleanupOldScansRoute,
  enforceMaxHistoryRoute
};
