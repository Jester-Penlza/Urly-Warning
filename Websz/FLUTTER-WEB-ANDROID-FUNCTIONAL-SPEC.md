# URLY Functional Specification for Website and Flutter App

## 1) Purpose
This document explains how the product works end-to-end for:
- Website (current implementation)
- Flutter Web app (planned)
- Flutter Android app (planned, Pixel emulator compatible)

It includes:
- All major modules
- All active API endpoints
- Main function inventory and what each function does
- Data flow and runtime behavior
- How the same backend supports both website and mobile app

## 2) Product Summary
URLY is a URL safety scanner platform.
Users submit one or more URLs and receive:
- Risk verdicts
- Heuristic findings
- Blocklist/GSB checks
- Score breakdown and recommendations
- Recent scan history and summary statistics

Current runtime is database-free.
The backend stores runtime state in memory.

## 3) Platform Architecture

### 3.1 Current Stack
- Frontend shell: React + Vite
- Injected static UI logic: public JS module
- Backend: Express scanner server
- Storage mode: In-memory runtime store
- Feeds: Local feed files + runtime custom blocklist

### 3.2 Planned Flutter Stack
- One Flutter codebase
- Targets:
  - Web browser (Flutter Web)
  - Android phone/emulator (Flutter Android)
- Uses the same backend scanner API on port 5050

## 4) High-Level User Flows

### 4.1 Scan Flow
1. User enters URL(s) in scanner input.
2. Frontend builds scan options from configuration.
3. Frontend calls POST /api/scan.
4. Backend runs checks (HTTP/DNS/TLS/heuristics/blocklist/GSB depending on config).
5. Backend computes verdict, score breakdown, recommendations.
6. Backend saves scan in runtime memory.
7. Frontend renders detailed results, badges, recommendations, history updates.

### 4.2 Configuration Flow
1. User changes settings in configuration panel.
2. Frontend config manager updates local state and storage.
3. Config sync module maps frontend path to backend runtime key.
4. Frontend sends POST /api/config.
5. Backend updates runtime config overrides immediately.
6. Next scan uses updated settings in real time.

### 4.3 Blocklist Flow
1. User/admin adds entry via runtime API.
2. Backend appends custom blocklist entry.
3. Backend reloads feeds and custom entries.
4. New scans reflect updated blocklist instantly.

## 5) Runtime Data Model (Backend)
Primary runtime object: memoryStore

Fields:
- scans: Array of saved scan records
- nextScanId: Auto-increment scan id
- maxHistory: Max number of stored scans
- customBlocklist: Runtime blocklist entries (url, hostname, pattern)
- nextBlockId: Auto-increment blocklist id
- configOverrides: Active runtime configuration values

## 6) Backend API Contract
Base URL: http://localhost:5050

### 6.1 Core Scanning
- POST /api/scan
  - Scans a URL using runtime config + request options.
  - Returns scan payload with http, dns, tls, heuristics, blocklist, gsb, verdict, recommendations, configApplied.

- GET /health
  - Returns service status, feed counts, GSB enabled flag, and runtime mode metadata.

### 6.2 Scan History
- GET /api/scans/recent
  - Returns latest scans with optional limit query.

- GET /api/scans/search
  - Returns scans filtered by query string in url/hostname.

- GET /api/scans/:id
  - Returns one scan record by id.

### 6.3 Statistics
- GET /api/stats/today
  - Returns aggregated stats for current day.

- GET /api/stats/summary
  - Returns aggregated stats for default rolling window.

- GET /api/stats/range
  - Returns aggregated stats for requested date range.

### 6.4 Blocklist Runtime Management
- GET /api/blocklist
  - Returns runtime custom blocklist entries.

- POST /api/blocklist
  - Adds runtime blocklist entry.

- DELETE /api/blocklist/:value
  - Removes blocklist entry by value/id.

- GET /api/blocklist/check/:value
  - Checks whether URL/host is currently blocked.

### 6.5 Runtime Configuration
- GET /api/config
  - Returns full runtime config overrides.

- GET /api/config/:key
  - Returns single config key value.

- POST /api/config
  - Updates runtime config key/value pair.

### 6.6 Runtime Cleanup
- POST /api/cleanup/old-scans
  - Trims scan history to a smaller keep count.

- POST /api/cleanup/enforce-limit
  - Enforces maxHistory retention size.

## 7) Backend Function Inventory and Behavior
Source: scanner/scan-server.js

### 7.1 Runtime State and Utility
- saveScanToMemory(scanData)
  - Normalizes and stores completed scan with derived scores/status.

- getStatsFromMemory(days)
  - Computes total scans, today scans, average risk, and status breakdown.

- normalizeUrl(u)
  - Canonicalizes URL for consistent matching and dedup logic.

- loadFeeds()
  - Loads feed URLs/hosts plus runtime custom blocklist into active match sets.

- loadConfig()
  - Loads scanner file config.

- loadDbConfig()
  - Loads runtime config overrides into active config map.

- getConfigValue(key, defaultValue)
  - Returns effective config value with runtime override priority.

### 7.2 Reputation and Network Checks
- getGSBKey()
  - Resolves Google Safe Browsing key from environment/runtime/file config.

- checkGSB(url)
  - Calls Google Safe Browsing API with caching and timeout handling.

- timeoutSignal(ms)
  - Creates abort signal for timed operations.

- isHttpUrl(url)
  - Validates protocol is http/https.

- dnsCheck(hostname)
  - Resolves host DNS records.

- extractExternalLinks(url)
  - Fetches page and extracts external links for analysis.

- httpProbe(url)
  - Executes HTTP request path and gathers response metadata.

- parseCertDates(cert)
  - Parses TLS certificate validity dates.

- daysUntil(date)
  - Returns days until given date.

- tlsCheck(hostname, port)
  - Performs TLS certificate and security checks.

### 7.3 Heuristics and Classification
- shannonEntropy(s)
  - Computes entropy for suspicious text randomness checks.

- heuristics(u, customWeights)
  - Applies weighted heuristic rules and returns risk score + flags.

- categorizeUrlHeuristic(url)
  - Category inference using heuristic rules.

- categorizeUrlAPI(url)
  - Category inference using API-enabled logic.

- categorizeUrl(url)
  - Orchestrates effective category determination.

- generateScoreBreakdown(scanData)
  - Produces category-level scoring explanation.

- generateRecommendations(safetyScore, scanData)
  - Produces actionable recommendations from scan output.

## 8) Frontend Website Modules and Behavior

### 8.1 React Shell and Page Loading
Source: src/components_PageLoader.jsx

- PageLoader component
  - Loads static page content from public pages.
  - Rewrites html link targets to hash routes.
  - Injects main public script with cache-busting query.
  - Calls window initialization hooks after script load:
    - attachUIEventListeners
    - attachSpollerListeners
    - initScanner
  - Re-initializes theme toggle behavior.
  - Applies contact navigation fixes for hash routing.

### 8.2 Config Management in React
Source: src/config/useConfig.js and src/config/configSync.js

ConfigManager class methods:
- init()
- get(path)
- set(path, value)
- reset()
- export()
- import(jsonString)
- validate()
- saveToStorage()
- loadFromStorage()
- mergeConfig(base, override)
- subscribe(listener)
- notifyListeners()
- getAll()

Config sync functions:
- syncConfigToRuntime(path, value)
  - Maps frontend config path to runtime backend key and posts update.

- loadConfigFromRuntime()
  - Pulls runtime config and applies mapped values to frontend config manager.

- initConfigSync()
  - Initializes startup pull and auto-sync behavior when settings change.

### 8.3 Configuration UI Panel
Source: src/components/ConfigPanel.jsx

Primary behavior:
- Presents Scanning, Security, and Display tabs.
- Supports booleans, numeric settings, text/theme settings.
- Sensitivity slider and presets update heuristic weights proportionally.
- Supports export/import/reset operations for config JSON.
- Changes propagate to config manager and then runtime API sync.

Key handlers:
- handleToggle(path)
- handleNumberChange(path, value)
- handleTextChange(path, value)
- getConfigValue(path)
- getSensitivityLevel()
- handleSensitivityChange(multiplier)
- getSensitivityDescription()
- handleExport()
- handleImport(event)
- handleReset()

### 8.4 Public Scanner Script Functions
Source: public/js/script.js

Top-level functions:
- attachUIEventListeners()
  - Binds menu, scroll, interaction behavior.

- initializeContactButton()
- setupContactButtonStandalone()
- createRippleEffectStandalone(button, event)
- highlightContactInfoStandalone()
  - Contact/CTA interaction and animation behavior.

- attachSpollerListeners()
  - FAQ/spoller expand-collapse behavior.

- initScanner()
  - Main scanner initialization and orchestration for website UI.
  - Includes:
    - Input persistence via sessionStorage
    - Progress indicator control
    - Config-aware scan request construction
    - Local scanner API call with timeout handling
    - Result rendering (verdict, score, breakdown, recommendations)
    - History update/filter behavior
    - Restart/clear actions
    - UI state transitions and visual effects

- getTrainingData(), saveTrainingData(data), getTrainedStatus(url), setTrainedStatus(url, status, reason)
  - User feedback/training persistence helpers.

- getWhitelist(), getBlacklist(), addToWhitelist(domain), removeFromWhitelist(domain), addToBlacklist(domain), removeFromBlacklist(domain)
  - Local allow/deny helper lists in frontend storage.

- getDomainFromUrl(url)
  - Domain extraction helper.

- removeShieldLogoBackground(), processShieldLogo(img)
  - Brand image processing helpers.

- createSecurityParticles(), enhanceScanButton(), enhanceUrlInput(), initSecurityTheme()
  - Visual/UX enhancement behavior.

- createScanResultEffects(isUnsafe), setPageStatusEnhanced(isAllSafe, anyUnsafe)
  - Dynamic visual status effects after scans.

- showHeuristicDetailsModal(heuristics)
- showExternalLinksModal(externalLinksData)
- showRiskScoreModal(scanData)
  - Modal views for detailed analysis.

## 9) Website and App Behavior Parity (Target)
For Flutter migration, these behaviors should remain equivalent:
- Same runtime APIs and payload shapes
- Same config toggles and thresholds
- Same scan verdict logic visibility
- Same score breakdown and recommendations sections
- Same history, search, and summary statistics behavior
- Same blocklist and runtime config management capabilities

## 10) Flutter Implementation Mapping

### 10.1 UI Layer Mapping
- Scanner input and results page -> Flutter screen
- Configuration panel tabs -> Flutter tab views
- History/statistics pages -> Flutter list + chart widgets
- Detail modals -> Flutter dialogs/bottom sheets

### 10.2 Service Layer Mapping
Create service classes in Flutter:
- ScanService
  - call POST /api/scan
- ConfigService
  - call GET/POST /api/config
- HistoryService
  - call /api/scans and /api/stats endpoints
- BlocklistService
  - call /api/blocklist endpoints
- HealthService
  - call /health

### 10.3 State Management Mapping
Use Provider, Riverpod, or Bloc to mirror:
- Current config state
- Active scan results
- Recent scan history
- Health/runtime status

### 10.4 Platform Targets
- Flutter Web for browser deployment
- Flutter Android for app deployment and Pixel emulator testing
- Same backend endpoint host configurable per environment

## 11) Operational Scripts and Runtime Commands
From package scripts:
- npm run dev
  - Starts website dev server
- npm run scan
  - Starts scanner API server
- npm run dev:all
  - Starts scanner and website together
- npm run build
  - Builds production web app
- npm run preview
  - Runs build preview server
- npm run feeds:update
  - Updates feed data source file(s)

## 12) Non-Functional Characteristics
- Runtime config refresh and real-time updates are enabled.
- Feed reload is periodic.
- GSB uses caching to reduce duplicate calls.
- Scanner supports graceful fallback patterns when subsystems are disabled.
- Current storage is in-memory; data resets on server restart.

## 13) Acceptance Criteria for Website + Flutter Parity
A Flutter migration is considered functionally complete when:
1. All core scan checks are triggerable from Flutter and web.
2. Config changes from Flutter immediately affect backend scan behavior.
3. Score breakdown and recommendations render reliably.
4. History/statistics/blocklist operations match website behavior.
5. Health endpoint and runtime mode indicators are visible in app diagnostics.
6. Android emulator and browser flows both pass smoke tests.

## 14) Practical Note
This document reflects active runtime architecture where database modules have been removed from the execution path.
Historical markdown files may still mention older database structure as archival context, but runtime functionality is memory-based and API-driven.
