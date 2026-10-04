/**
 * Database Routes
 * All REST endpoints for auth, cache, and history
 */

import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getDatabase } from './db-manager.js';

const router = express.Router();
const useLocalAuth = process.env.URLY_AUTH_MODE !== 'supabase';
const localDataDirectory = process.env.URLY_LOCAL_DATA_DIR
  || path.join(os.homedir(), '.urly-warning');
const localAuthFile = path.join(localDataDirectory, 'auth.json');
let localWriteQueue = Promise.resolve();

function createEmptyLocalStore() {
  return { users: [], sessions: [], history: [] };
}

async function readLocalStore() {
  try {
    const parsed = JSON.parse(await fs.readFile(localAuthFile, 'utf8'));
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (error) {
    if (error.code === 'ENOENT') return createEmptyLocalStore();
    throw error;
  }
}

async function updateLocalStore(mutator) {
  const operation = localWriteQueue.catch(() => {}).then(async () => {
    const store = await readLocalStore();
    const result = await mutator(store);
    await fs.mkdir(localDataDirectory, { recursive: true });
    await fs.writeFile(localAuthFile, `${JSON.stringify(store, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    return result;
  });
  localWriteQueue = operation.catch(() => {});
  return operation;
}

async function registerLocalUser(email, password) {
  return updateLocalStore(async (store) => {
    if (store.users.some((user) => user.email === email)) return { conflict: true };
    const user = {
      id: crypto.randomUUID(),
      email,
      password_hash: await hashPassword(password),
      created_at: new Date().toISOString(),
    };
    store.users.push(user);
    return { user: { id: user.id, email: user.email } };
  });
}

async function loginLocalUser(email, password) {
  return updateLocalStore(async (store) => {
    const user = store.users.find((candidate) => candidate.email === email);
    if (!user || !(await verifyPassword(password, user.password_hash))) return null;

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    store.sessions = store.sessions.filter((session) => new Date(session.expires_at) > new Date());
    store.sessions.push({ user_id: user.id, token, expires_at: expiresAt });
    return { token, expiresAt, user: { id: user.id, email: user.email } };
  });
}

async function validateLocalToken(token) {
  const store = await readLocalStore();
  const session = store.sessions.find((candidate) => candidate.token === token);
  if (!session || new Date(session.expires_at) <= new Date()) return null;
  return session.user_id;
}

/**
 * Helper: Hash a password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Helper: Compare password with hash
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Helper: Generate a session token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Helper: Hash URL to create cache key
 */
function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

/**
 * Helper: Check if session token is valid and not expired
 */
async function validateToken(token) {
  if (useLocalAuth) {
    return validateLocalToken(token);
  }

  const db = getDatabase();
  if (!db) return null;

  const { data, error } = await db
    .from('sessions')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (error || !data) return null;

  // Check if token is expired
  if (new Date(data.expires_at) < new Date()) {
    return null;
  }

  return data.user_id;
}

/**
 * Middleware: Require valid auth token
 */
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  const userId = await validateToken(token);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = userId;
  req.authStorage = useLocalAuth ? 'local' : 'supabase';
  next();
}

// ===== AUTH ROUTES =====

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Validate input
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (useLocalAuth) {
      const result = await registerLocalUser(normalizedEmail, password);
      if (result.conflict) {
        return res.status(409).json({ error: 'User already exists' });
      }
      return res.status(201).json({
        success: true,
        user: result.user,
        storage: 'local',
        message: 'User registered successfully',
      });
    }

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    // Check if user already exists
    const { data: existing, error: existingError } = await db
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingError) {
      return res.status(503).json({ error: 'Account database is unavailable' });
    }

    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const { data: newUser, error } = await db
      .from('users')
      .insert({ email: normalizedEmail, password_hash: passwordHash })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: `Failed to create user: ${error.message}` });
    }

    res.status(201).json({
      success: true,
      user: { id: newUser.id, email: newUser.email },
      message: 'User registered successfully',
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to create account' });
  }
});

/**
 * POST /auth/login
 * Login and receive session token
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // Validate input
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (useLocalAuth) {
      const session = await loginLocalUser(normalizedEmail, password);
      if (!session) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      return res.json({
        success: true,
        token: session.token,
        user: session.user,
        expiresAt: session.expiresAt,
        storage: 'local',
      });
    }

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    // Find user
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session (valid for 7 days)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: sessionError } = await db.from('sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    if (sessionError) {
      return res.status(500).json({ error: 'Failed to create session' });
    }

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email },
      expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: 'Unable to sign in' });
  }
});

/**
 * POST /auth/logout
 * Revoke session token
 */
router.post('/auth/logout', requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (useLocalAuth) {
      await updateLocalStore((store) => {
        store.sessions = store.sessions.filter((session) => session.token !== token);
      });
      return res.json({ success: true, message: 'Logged out successfully' });
    }

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    await db.from('sessions').delete().eq('token', token);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /auth/refresh
 * Get a new token before current one expires
 */
router.post('/auth/refresh', requireAuth, async (req, res) => {
  try {
    const oldToken = req.headers.authorization?.replace('Bearer ', '');
    if (useLocalAuth) {
      const refreshed = await updateLocalStore((store) => {
        const oldSession = store.sessions.find((session) => session.token === oldToken);
        if (!oldSession) return null;
        const newToken = generateToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        store.sessions = store.sessions.filter((session) => session.token !== oldToken);
        store.sessions.push({ user_id: oldSession.user_id, token: newToken, expires_at: expiresAt });
        return { newToken, expiresAt };
      });
      if (!refreshed) return res.status(401).json({ error: 'Invalid or expired token' });
      return res.json({ success: true, token: refreshed.newToken, expiresAt: refreshed.expiresAt });
    }

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    // Revoke old token
    await db.from('sessions').delete().eq('token', oldToken);

    // Create new token (valid for 7 days)
    const newToken = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.from('sessions').insert({
      user_id: req.userId,
      token: newToken,
      expires_at: expiresAt,
    });

    res.json({
      success: true,
      token: newToken,
      expiresAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SCAN CACHE ROUTES =====

/**
 * GET /api/cache/check?url=<url>
 * Check if URL result is cached
 */
router.get('/api/cache/check', async (req, res) => {
  try {
    const { url } = req.query;
    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    if (!url) {
      return res.status(400).json({ error: 'URL required' });
    }

    const urlHash = hashUrl(url);

    const { data: cache, error } = await db
      .from('scan_cache')
      .select('*')
      .eq('url_hash', urlHash)
      .single();

    if (error || !cache) {
      return res.json({ cached: false });
    }

    // Check if cache is expired
    if (new Date(cache.expires_at) < new Date()) {
      return res.json({ cached: false });
    }

    res.json({
      cached: true,
      result: cache.result,
      createdAt: cache.created_at,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cache/store
 * Store a scan result in cache
 */
router.post('/api/cache/store', async (req, res) => {
  try {
    const { url, result } = req.body;
    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    if (!url || !result) {
      return res.status(400).json({ error: 'URL and result required' });
    }

    const urlHash = hashUrl(url);
    // Cache for 30 days
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Upsert (update if exists, insert if not)
    const { error } = await db.from('scan_cache').upsert(
      {
        url_hash: urlHash,
        url,
        result,
        expires_at: expiresAt,
      },
      { onConflict: 'url_hash' }
    );

    if (error) {
      return res.status(500).json({ error: 'Failed to store cache' });
    }

    res.json({ success: true, message: 'Result cached' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SCAN HISTORY ROUTES =====

/**
 * GET /api/history
 * Get user's scan history (requires auth)
 */
router.get('/api/history', requireAuth, async (req, res) => {
  try {
    if (useLocalAuth) {
      const store = await readLocalStore();
      const history = store.history
        .filter((scan) => scan.user_id === req.userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json({ success: true, count: history.length, scans: history });
    }

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    const { data: history, error } = await db
      .from('scan_history')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    res.json({
      success: true,
      count: history.length,
      scans: history,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/history/add
 * Save a scan to user's history (requires auth)
 */
router.post('/api/history/add', requireAuth, async (req, res) => {
  try {
    const { url, result, cached } = req.body;

    if (!url || !result) {
      return res.status(400).json({ error: 'URL and result required' });
    }

    if (useLocalAuth) {
      const scanRecord = await updateLocalStore((store) => {
        const record = {
          id: crypto.randomUUID(),
          user_id: req.userId,
          url,
          result,
          cached: Boolean(cached),
          created_at: new Date().toISOString(),
        };
        store.history.push(record);
        return record;
      });
      return res.status(201).json({
        success: true,
        scanId: scanRecord.id,
        message: 'Scan saved to history',
      });
    }

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    const { data: scanRecord, error } = await db
      .from('scan_history')
      .insert({
        user_id: req.userId,
        url,
        result,
        cached: cached || false,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to save scan' });
    }

    res.status(201).json({
      success: true,
      scanId: scanRecord.id,
      message: 'Scan saved to history',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/history/:id
 * Get a specific scan by ID
 */
router.get('/api/history/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (useLocalAuth) {
      const store = await readLocalStore();
      const scan = store.history.find((record) => record.id === id && record.user_id === req.userId);
      if (!scan) return res.status(404).json({ error: 'Scan not found' });
      return res.json({ success: true, scan });
    }

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    const { data: scan, error } = await db
      .from('scan_history')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (error || !scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json({ success: true, scan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/history/:id
 * Delete a scan from history
 */
router.delete('/api/history/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (useLocalAuth) {
      const removed = await updateLocalStore((store) => {
        const originalLength = store.history.length;
        store.history = store.history.filter((record) => !(record.id === id && record.user_id === req.userId));
        return store.history.length < originalLength;
      });
      if (!removed) return res.status(404).json({ error: 'Scan not found' });
      return res.json({ success: true, message: 'Scan deleted' });
    }

    const db = getDatabase();
    if (!db) return res.status(500).json({ error: 'Database not available' });

    const { error } = await db
      .from('scan_history')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete scan' });
    }

    res.json({ success: true, message: 'Scan deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
