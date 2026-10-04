# File Organization & Structure Guide

## Directory Map (Complete)

### Root Level
```
Websz/
├── APP-SETUP-GUIDE.md              ← Setup instructions
├── DATABASE-INTEGRATION-GUIDE.md    ← NEW: Database integration steps
├── PROJECT-ORGANIZATION.md          ← Project overview
├── README.md                        ← Project README
├── REORGANIZATION-SUMMARY.md        ← Previous changes
├── index.html                       ← Entry point (served by Vite)
├── vite.config.js                   ← Vite build config
├── package.json                     ← Node dependencies & scripts
├── .gitignore
└── node_modules/
```

---

## `/config` — Configuration Files
**Purpose:** Environment, API keys, database credentials

```
config/
├── db-config.example.js             ← Template for local DB config
├── db-config.js                     ← GITIGNORED: Local database connection
├── scanner.config.json              ← Scanner behavior settings (scan timeouts, weights)
└── supabase-config.js               ← GITIGNORED: Supabase keys (use env vars in production)
```

**When to use:**
- Add new API keys → `supabase-config.js`
- Change scan timeouts → `scanner.config.json`
- Change database host → `db-config.js`

---

## `/database` — Database Layer
**Purpose:** Schema, migrations, management tools

```
database/
├── db-manager.js                    ← Connection pooling & setup
├── db-routes.js                     ← NEW: All database API endpoints (auth, cache, history)
├── db-init.js                       ← NEW: Run this to initialize Supabase schema
├── schemas/
│   ├── database-schema.sql          ← Original local DB schema (reference)
│   └── supabase-schema.sql          ← NEW: Supabase/PostgreSQL schema
├── scripts/
│   ├── init-db.js                   ← Initialize database
│   ├── export-database.cjs          ← Export data for backup
│   ├── import-database.cjs          ← Import data from backup
│   ├── populate-blocklist.js        ← Load malicious URL feeds
│   ├── verify-database.cjs          ← Check DB integrity
│   └── view-blocklist.js            ← View loaded blocklist
└── database-exports/
    ├── README-2025-*.md             ← Export metadata
    ├── urly-database-*.json         ← JSON backups
    └── urly-database-*.sql          ← SQL backups
```

**When to add:**
- New table? → Edit `supabase-schema.sql`, run `db-init.js`
- New API endpoint? → Add to `db-routes.js`
- Debug connectivity? → Run `verify-database.cjs`

---

## `/scanner` — Scanning Engine
**Purpose:** URL security analysis, heuristics, external API calls

```
scanner/
├── scan-server.js                   ← MAIN: Express server for /api/scan endpoint
│                                      - Heuristics scoring
│                                      - DNS/SSL/TLS checks
│                                      - Google Safe Browsing check
│                                      - NEW: Cache check + auth handling
├── add-detection-sensitivity.js     ← Utility to adjust heuristic weights
├── check-latest-scan.cjs            ← View most recent scan result
├── enable-ssl-check.js              ← Enable/disable SSL validation
├── scan-server.js                   ← (duplicate entry, see above)
└── view-recommendations.js          ← View recommendations for a URL
```

**When to modify:**
- Change timeout behavior → `scan-server.js` (line 36: `TIMEOUT_MS`)
- Adjust heuristic weights → `scanner.config.json` OR `add-detection-sensitivity.js`
- Add new check type → `scan-server.js` (add function, integrate into POST handler)

---

## `/src` — React Website Source
**Purpose:** Website UI, routing, pages

```
src/
├── main.jsx                         ← React entry point (Vite loads this)
├── App.jsx                          ← Main router, layout, auth gate
├── components_PageLoader.jsx        ← Loads HTML pages into React
├── components/
│   ├── ui/
│   │   ├── background-paths.jsx     ← Animated background (login page)
│   │   ├── background-paths.css     ← Background animation styles
│   │   └── ...
│   └── ...
├── config/
│   └── useConfig.js                 ← Config manager for website
├── pages/
│   ├── Login.jsx                    ← Login page (new)
│   ├── Login.css                    ← Login styles
│   ├── Home.jsx                     ← Home/dashboard
│   ├── About.jsx
│   ├── Services.jsx
│   ├── Contact.jsx
│   └── ...
└── utils/
    ├── scannerAPI.js                ← Calls scanner backend
    └── ...
```

**When to modify:**
- Add new page? → Create in `/pages`, add route in `App.jsx`
- Change login UI? → Edit `Login.jsx` and `Login.css`
- Change homepage? → Edit `Home.jsx`
- Call scanner API? → Use `scannerAPI.js` utility

---

## `/public` — Static Assets
**Purpose:** HTML templates, CSS, images, test pages

```
public/
├── api-test.html                    ← Test scanner API endpoints
├── config-test.html                 ← Test config system
├── design-showcase.html             ← Design reference
├── display-test.html                ← Display/rendering test
├── test-button.html                 ← Button component test
├── test-realtime-config.html        ← Real-time config test
├── css/
│   └── ...                          ← Shared styles
├── images/
│   └── ...                          ← PNG/JPG/SVG images
├── img/
│   └── ...                          ← More images
└── js/
    ├── scanner-config.js            ← Centralized scanning config
    └── ...
```

**When to add:**
- New test page? → Create `.html` file here
- New image? → Place in `/images` and reference in `src/pages/`

---

## `/scripts` — Utility Scripts
**Purpose:** One-off tasks, maintenance, data operations

```
scripts/
├── update-feeds.js                  ← Download latest phishing/malware feeds
└── ...
```

**When to use:**
- Need to refresh blocklist? → `npm run feeds:update`

---

## `/docs` — Documentation
**Purpose:** Guides, API specs, explanations

```
docs/
├── CAUTION-STATUS-FIX.md            ← Status code explanations
├── GSB-EXPLANATION.md               ← Google Safe Browsing info
├── GSB-IMPACT-ANALYSIS.md           ← Performance impact analysis
├── RECOMMENDATION-BUG-FIX.md        ← Recommendation logic
├── RECOMMENDATION-LEVELS-EXPLAINED.md ← Risk level definitions
├── api/
│   ├── API-DOCUMENTATION.md         ← All endpoints documented
│   ├── API-STATUS.md                ← Endpoint health
│   └── API-WORKING-CONFIRMATION.md  ← Test results
├── configuration/
│   ├── CONFIGURATION-GUIDE.md       ← How to configure
│   ├── CONFIGURATION-ISSUE-REPORT.md
│   ├── CONFIGURATION-SYSTEM.md      ← Config system design
│   ├── SCANNING-OPTIONS-VERIFICATION.md
│   └── SSL-VALIDATION-EXPLANATION.md
├── database/
│   ├── DATABASE-SECURITY-GUIDE.md   ← DB security best practices
│   └── ...
├── system-analysis/
│   └── ...
├── testing/
│   └── ...
└── wireframes/
    └── ...
```

**When to reference:**
- Debugging API issue? → Check `docs/api/API-DOCUMENTATION.md`
- Setting up database? → Check `docs/database/`
- Understanding scoring? → Check `docs/RECOMMENDATION-LEVELS-EXPLAINED.md`

---

## `/feeds` — Malicious URL Lists
**Purpose:** Offline blocklists for domain/URL checking

```
feeds/
├── local-denylist.txt               ← Custom blocked URLs (editable)
└── urls.txt                         ← Downloaded phishing/malware feeds (auto-updated)
```

**When to update:**
- Run `npm run feeds:update` to refresh from external sources
- Edit `local-denylist.txt` to add custom domains

---

## `/urly_warning_flutter` — Flutter Android App
**Purpose:** Mobile application source code

```
urly_warning_flutter/
├── lib/
│   ├── main.dart                    ← App entry point
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth_service.dart    ← Auth business logic (NEW: DB integration)
│   │   │   ├── auth_controller.dart ← State management
│   │   │   ├── login_screen.dart    ← Login UI
│   │   │   ├── register_screen.dart ← Registration UI
│   │   │   └── providers.dart       ← Riverpod providers
│   │   ├── scan/
│   │   │   ├── scan_service.dart    ← Calls scanner API
│   │   │   ├── scan_controller.dart ← State management
│   │   │   ├── scan_screen.dart     ← Scan UI
│   │   │   └── providers.dart       ← Riverpod providers
│   │   ├── history/
│   │   │   ├── history_service.dart ← Load from database
│   │   │   ├── history_controller.dart ← State management
│   │   │   ├── history_screen.dart  ← History UI
│   │   │   └── providers.dart       ← Riverpod providers
│   │   ├── home/
│   │   │   ├── home_screen.dart
│   │   │   └── ...
│   │   └── settings/
│   │       └── ...
│   ├── core/
│   │   ├── constants/
│   │   │   └── app_constants.dart   ← URLs, timeouts, API keys
│   │   ├── models/
│   │   │   ├── scan_result.dart
│   │   │   ├── user.dart            ← NEW: User model
│   │   │   ├── session.dart         ← NEW: Session model
│   │   │   └── ...
│   │   ├── network/
│   │   │   ├── api_client.dart      ← Dio HTTP client
│   │   │   ├── scanner_api_service.dart ← Scanner endpoints (NEW: auth)
│   │   │   ├── auth_api_service.dart    ← NEW: Auth endpoints
│   │   │   └── network_providers.dart
│   │   ├── storage/
│   │   │   └── local_storage.dart   ← NEW: SharedPreferences wrapper
│   │   └── ...
│   └── ...
├── pubspec.yaml                     ← Dependencies
├── pubspec.lock                     ← Dependency lock file
├── android/
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/
│   │       └── main/
│   │           └── AndroidManifest.xml
│   └── ...
├── ios/
│   └── ...                          ← iOS config (not used in current project)
└── test/
    └── widget_test.dart
```

**When to modify:**
- Add new screen? → Create in `features/<feature>/` with `_screen.dart`, `_controller.dart`, `_service.dart`
- Change API endpoint? → Update `core/network/scanner_api_service.dart`
- Add new data model? → Create in `core/models/`
- Change app config? → Edit `core/constants/app_constants.dart`
- Add new package? → Edit `pubspec.yaml`, run `flutter pub get`

---

## `/tests` — Test Data & Scripts
**Purpose:** Test URLs, integration tests

```
tests/
├── phishing-test-urls.txt           ← Known phishing URLs for testing
├── test-config-system.js            ← Test config system
├── test-db-operations.js            ← Test database ops
├── test-db.js
├── test-integration.js              ← Full integration test
├── test-urls.txt                    ← Sample URLs to scan
├── verified-test-urls.txt           ← Known safe URLs
└── verify-integration.html          ← Browser-based integration test
```

**When to use:**
- Testing scanner? → Use URLs from `test-urls.txt`
- Integration testing? → Run `test-integration.js`
- Need known phishing URLs? → Use `phishing-test-urls.txt`

---

## `/utilities` — Utility Scripts
**Purpose:** Bulk operations, conversions, exports

```
utilities/
├── convert-to-pdf.cjs               ← Convert HTML/JSON to PDF
└── generate-pdf.cjs                 ← Generate PDF reports
```

---

## Quick Lookup Table

| Need to... | Go to... |
|-----------|---------|
| Change API timeout | `scanner/scan-server.js` line 36 |
| Add auth endpoint | `database/db-routes.js` |
| Change heuristic weights | `config/scanner.config.json` |
| Create new DB table | `database/schemas/supabase-schema.sql` |
| Add new Flutter screen | `urly_warning_flutter/lib/features/<feature>/` |
| Check API endpoints | `docs/api/API-DOCUMENTATION.md` |
| Fix login UI | `src/pages/Login.jsx` + `src/pages/Login.css` |
| Update blocklist | `scripts/update-feeds.js` |
| Add new package (Node) | `package.json` |
| Add new package (Flutter) | `urly_warning_flutter/pubspec.yaml` |
| Configure Supabase | `config/supabase-config.js` |
| Test API | `public/api-test.html` |

---

## File Naming Conventions

To maintain consistency, follow these patterns:

### Dart/Flutter
- **Screens:** `*_screen.dart` (e.g., `login_screen.dart`)
- **Controllers:** `*_controller.dart` (e.g., `auth_controller.dart`)
- **Services:** `*_service.dart` (e.g., `auth_service.dart`)
- **Models:** `*_model.dart` OR just class name in lowercase (e.g., `user.dart` for `User` class)
- **Providers:** `*_providers.dart` (Riverpod providers)

### JavaScript/Node
- **Routes:** `*-routes.js` (e.g., `db-routes.js`)
- **Services:** `*-service.js`
- **Utilities:** `*-util.js` OR `*-helper.js`
- **Config:** `*-config.js` OR `*-config.json`

### React/JavaScript (Web)
- **Components:** PascalCase (e.g., `LoginScreen.jsx`)
- **Utilities:** camelCase (e.g., `scannerAPI.js`)
- **Styles:** `ComponentName.css` (e.g., `Login.css`)

### Documentation
- **Guides:** `GUIDE-NAME.md` (uppercase)
- **Feature docs:** `FEATURE-EXPLANATION.md`
- **Issues:** `ISSUE-DESCRIPTION.md`

---

## How to Keep Things Organized

1. **Before creating a new file:**
   - Check this guide to see if it fits an existing folder
   - Use the naming convention for your language
   - Create related files together (e.g., `.dart`, `_screen.dart`, and `_controller.dart` in same folder)

2. **When adding a feature:**
   - Create a folder in `features/<feature_name>/`
   - Keep `_screen.dart`, `_controller.dart`, `_service.dart` in the same place
   - Add tests in `tests/<feature_name>_test.dart`

3. **Documentation:**
   - Always update relevant docs when changing behavior
   - Add comments in code for non-obvious logic
   - Update `DATABASE-INTEGRATION-GUIDE.md` as you progress

4. **Don't:**
   - Put unrelated files in `/src` or `/lib` roots
   - Mix web and mobile code
   - Store sensitive keys in version control (use `.gitignore`)
