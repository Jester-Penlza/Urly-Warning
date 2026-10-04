# Database Integration Guide

## Overview
This guide organizes the narrow database integration for URLY Warning. Focus: scan dedup, auth, and history persistence.

---

## Phase 1: Database Setup

### Step 1: Set Up Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project (or use existing)
3. Copy `SUPABASE_URL` and `SUPABASE_ANON_KEY`
4. Save to:
   - `config/supabase-config.js` (for backend)
   - `urly_warning_flutter/lib/core/constants/app_constants.dart` (for Flutter)

### Step 2: Create Database Schema
Run these SQL statements in Supabase SQL editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scan cache (dedup results)
CREATE TABLE scan_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  url_hash VARCHAR(64) UNIQUE NOT NULL,
  url VARCHAR(2048) NOT NULL,
  result JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scan history (user-specific)
CREATE TABLE scan_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(2048) NOT NULL,
  result JSONB NOT NULL,
  cached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_scan_cache_hash ON scan_cache(url_hash);
CREATE INDEX idx_scan_cache_expires ON scan_cache(expires_at);
CREATE INDEX idx_scan_history_user ON scan_history(user_id, created_at DESC);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_users_email ON users(email);
```

Location: `database/schemas/supabase-schema.sql`

---

## Phase 2: Backend API Routes

### Step 3: Create Backend Auth Routes
**File:** `database/db-routes.js`

Routes to implement:
- `POST /auth/register` — Create user account
- `POST /auth/login` — Authenticate and return session token
- `POST /auth/logout` — Revoke session token
- `POST /auth/refresh` — Get new token before expiry

### Step 4: Create Backend Cache Routes
**File:** `database/db-routes.js`

Routes to implement:
- `GET /api/cache/check?url=<url>` — Check if URL is cached
- `POST /api/cache/store` — Store scan result in cache

### Step 5: Create Backend History Routes
**File:** `database/db-routes.js`

Routes to implement:
- `GET /api/history` — Get user's scan history (requires auth token)
- `POST /api/history/add` — Save scan to user history

### Step 6: Update `/api/scan` Endpoint
**File:** `scanner/scan-server.js`

Modify the `POST /api/scan` handler:
1. Extract auth token from request header
2. Check `scan_cache` table for URL hash match
3. If cache hit and not expired, return cached result with `cached: true` flag
4. If cache miss, run full scan as normal
5. After scan completes, store result in `scan_cache`
6. If user is authenticated, also save to `scan_history`

---

## Phase 3: Flutter Integration

### Step 7: Update Auth Service
**File:** `urly_warning_flutter/lib/features/auth/auth_service.dart`

Changes:
- Add Supabase client initialization
- Implement `register()` method (calls `/auth/register`)
- Implement `login()` method (calls `/auth/login`, stores token locally)
- Implement `logout()` method (calls `/auth/logout`, clears token)
- Store auth token in SharedPreferences

### Step 8: Update Auth Controller
**File:** `urly_warning_flutter/lib/features/auth/auth_controller.dart`

Changes:
- Add `register()` and `login()` state methods
- On app startup, restore session from local token
- Add `logout()` method

### Step 9: Update Scan Service
**File:** `urly_warning_flutter/lib/core/network/scanner_api_service.dart`

Changes:
- Add auth token to scan request headers
- Include `user_id` in request body (extracted from token)
- Parse `cached: true` flag in response

### Step 10: Update Scan Screen
**File:** `urly_warning_flutter/lib/features/scan/scan_screen.dart`

Changes:
- Show "Cached result" badge if `response.cached == true`
- Send user auth token with scan request

### Step 11: Update History Screen
**File:** `urly_warning_flutter/lib/features/history/history_screen.dart`

Changes:
- Remove in-memory history loading
- Call `GET /api/history` endpoint instead
- Parse and display scan results from database

---

## Phase 4: Testing

### Step 11: Test Auth Flow
1. Register new user in Flutter app
2. Verify user created in Supabase `users` table
3. Login and verify session token returned
4. Kill app and restart → verify auto-login works
5. Logout and verify session revoked

### Step 12: Test Scan Cache
1. Scan `https://example.com`
2. Check `scan_cache` table for result
3. Scan same URL again → should show "Cached result"
4. Verify response is identical (no variation/hallucination)

### Step 13: Test History Sync
1. Scan 3 URLs as user A
2. Logout
3. Login as user A → verify 3 scans in history
4. Login as user B → verify empty history
5. Scan a URL already cached by user A → verify it's reused

---

## File Organization After Integration

```
Websz/
├── database/
│   ├── db-manager.js           (existing - connection setup)
│   ├── db-routes.js            (NEW - all DB endpoints)
│   ├── db-init.js              (NEW - run schema setup)
│   ├── schemas/
│   │   ├── supabase-schema.sql (NEW - SQL schema)
│   │   └── database-schema.sql (existing - keep for reference)
│   └── scripts/
│       ├── init-db.js          (existing)
│       └── verify-database.cjs (existing)
│
├── scanner/
│   └── scan-server.js          (UPDATED - add cache check + auth)
│
├── config/
│   ├── supabase-config.js      (existing - Supabase keys)
│   └── db-config.js            (existing - DB connection)
│
├── src/
│   ├── pages/
│   │   └── Login.jsx           (existing - login UI)
│   ├── components/
│   │   └── ...
│   └── utils/
│       └── scannerAPI.js       (existing)
│
└── urly_warning_flutter/
    ├── lib/
    │   ├── features/
    │   │   ├── auth/
    │   │   │   ├── auth_service.dart      (UPDATED - DB integration)
    │   │   │   ├── auth_controller.dart   (UPDATED - register/login)
    │   │   │   └── login_screen.dart      (existing)
    │   │   ├── scan/
    │   │   │   ├── scan_screen.dart       (UPDATED - show cached badge)
    │   │   │   ├── scan_controller.dart   (existing)
    │   │   │   └── scan_service.dart      (UPDATED - send auth token)
    │   │   └── history/
    │   │       ├── history_screen.dart    (UPDATED - load from DB)
    │   │       └── history_controller.dart (UPDATED - DB service)
    │   └── core/
    │       └── network/
    │           ├── scanner_api_service.dart (UPDATED - add auth)
    │           └── api_client.dart
    └── ...
```

---

## Quick Reference: What Gets Updated

| File | Change | Scope |
|------|--------|-------|
| `database/db-routes.js` | NEW | Auth, cache, history endpoints |
| `scanner/scan-server.js` | Auth header handling + cache check | Existing endpoint |
| `auth_service.dart` | Add Supabase + register/login/logout | Flutter auth |
| `scanner_api_service.dart` | Add auth token header | Flutter scan request |
| `history_screen.dart` | Call DB endpoint instead of memory | Flutter history |
| `supabase-schema.sql` | NEW | Database schema |

---

## Success Criteria

✅ User can register and login
✅ Session persists across app restarts
✅ Same URL always returns identical result (no hallucination)
✅ Scan history is saved per user
✅ Logout clears local session
✅ Scan cache expires after 24 hours (configurable)
