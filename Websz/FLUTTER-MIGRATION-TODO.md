# Flutter Migration Todo List

## Goal
Convert the current website into a cross-platform Flutter project that supports:
- Web deployment
- Android app deployment (Pixel emulator in Android Studio)

## Phase 1: Planning and Scope
- [ ] Confirm feature parity scope between current website and Flutter version
- [ ] Lock initial release scope (MVP) vs stretch goals
- [ ] Define success criteria for migration completion
- [ ] Decide migration strategy (parallel build vs phased replacement)
- [ ] Create risk list and fallback plan

## Phase 2: Architecture and Project Setup
- [ ] Create new Flutter project structure for web + Android targets
- [ ] Define folder architecture (screens, widgets, services, models, state)
- [ ] Set up environments (dev, staging, production)
- [ ] Define API base URL strategy per platform/environment
- [ ] Add core packages (HTTP, state management, routing, storage)

## Phase 3: Backend Contract Alignment
- [ ] Freeze and document scanner API contracts used by frontend
- [ ] Validate required endpoints for Flutter parity:
  - [ ] POST /api/scan
  - [ ] GET /health
  - [ ] GET /api/scans/recent
  - [ ] GET /api/scans/search
  - [ ] GET /api/scans/:id
  - [ ] GET /api/stats/today
  - [ ] GET /api/stats/summary
  - [ ] GET /api/stats/range
  - [ ] GET /api/blocklist
  - [ ] POST /api/blocklist
  - [ ] DELETE /api/blocklist/:value
  - [ ] GET /api/blocklist/check/:value
  - [ ] GET /api/config
  - [ ] GET /api/config/:key
  - [ ] POST /api/config
- [ ] Define response parsing models for all critical payloads
- [ ] Define API error handling and timeout behavior

## Phase 4: Core Flutter Foundation
- [ ] Implement app theme system (light/dark/auto strategy)
- [ ] Implement global state management baseline
- [ ] Implement app routing/navigation skeleton
- [ ] Implement reusable UI components (buttons, cards, chips, badges, modals)
- [ ] Implement network client with interceptors/logging
- [ ] Implement local storage layer for user settings/cache

## Phase 5: Authentication and User Entry
- [ ] Build Login screen UI
- [ ] Build Register screen UI
- [ ] Implement auth flow and session persistence
- [ ] Add validation and user-friendly auth errors
- [ ] Add logout and session recovery behavior

## Phase 6: Home and Scanner Experience
- [ ] Build Home screen layout
- [ ] Build URL input and scan action flow
- [ ] Connect scanner request to POST /api/scan
- [ ] Implement loading/progress states
- [ ] Implement result rendering states (safe/caution/unsafe)
- [ ] Implement score breakdown rendering
- [ ] Implement recommendations rendering
- [ ] Implement graceful fallback UI when partial scan data is returned

## Phase 7: History, Search, and Stats
- [ ] Build Recent Scans screen
- [ ] Connect GET /api/scans/recent
- [ ] Build Search Scans screen/section
- [ ] Connect GET /api/scans/search
- [ ] Build Scan Details screen
- [ ] Connect GET /api/scans/:id
- [ ] Build Stats summary section/cards
- [ ] Connect stats endpoints (today/summary/range)

## Phase 8: Config and Blocklist Management
- [ ] Build Scanner Configuration screen
- [ ] Map frontend settings to backend runtime keys
- [ ] Connect GET/POST config endpoints
- [ ] Build Blocklist management screen
- [ ] Connect blocklist CRUD/check endpoints
- [ ] Validate real-time behavior after settings changes

## Phase 9: UX and Design Polish
- [ ] Apply final visual direction for both web and mobile
- [ ] Optimize mobile responsiveness and touch targets
- [ ] Add empty states, error states, and recovery actions
- [ ] Add accessibility improvements (contrast, font scaling, semantics)
- [ ] Add micro-interactions and transition polish

## Phase 10: Testing and Quality Assurance
- [ ] Unit tests for services and business logic
- [ ] Widget tests for key screens
- [ ] Integration tests for scanner workflow
- [ ] API failure and timeout scenario testing
- [ ] Regression checklist against current website behavior
- [ ] Manual QA on Flutter Web
- [ ] Manual QA on Android Pixel emulator

## Phase 11: Performance and Reliability
- [ ] Measure and optimize initial load/render performance
- [ ] Optimize scan response handling and UI updates
- [ ] Tune caching strategy for non-critical data
- [ ] Validate behavior under unstable network conditions

## Phase 12: Release Preparation
- [ ] Create release build for Flutter Web
- [ ] Create release build for Android
- [ ] Prepare demo script and screenshots/video
- [ ] Prepare user documentation and quick-start notes
- [ ] Final stakeholder review and sign-off

## Phase 13: Post-Launch Tasks
- [ ] Monitor issues and prioritize fixes
- [ ] Collect user feedback
- [ ] Plan next release features (iOS, advanced analytics, etc.)

## Notes
- This Todo file is planning-only.
- No implementation work is included in this step.
