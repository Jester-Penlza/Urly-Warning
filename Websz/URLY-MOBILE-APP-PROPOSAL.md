# URLY Scanner - Mobile App Proposal
## Desktop + Android Application Development

---

## 1. App Title & Team Info

### App Name
**URLY Scanner** — Intelligent URL Safety Detection System

### Group/Team Name
URLY Development Team

### Team Members & Roles
- **Project Lead**: Full-stack development, project coordination
- **Frontend Developer**: React, React Native, UI/UX implementation
- **Backend Developer**: Node.js/Express API, database management
- **QA/DevOps**: Testing, deployment, CI/CD pipeline

---

## 2. Executive Summary

### Problem Statement
Users need a quick, reliable way to check if a URL is safe before clicking it. Current solutions are either:
- Too slow (multiple seconds to load)
- Not standalone (always require browser plugin)
- Not accessible on mobile
- Limited to web browsers only

### Target Users
- **Primary**: General internet users (ages 13-65)
- **Secondary**: Security-conscious professionals, businesses
- **Use Case**: Checking links in emails, messages, search results, social media

### Why URLY is the Solution
URLY provides:
1. **Instant detection** — Real-time scanning with <2 second response times
2. **Multi-platform** — Desktop app (Windows) AND Android mobile app
3. **Smart analysis** — Combines Google Safe Browsing + local heuristics (SSL, DNS, phishing patterns)
4. **Transparency** — Shows risk score breakdown, recommendations, threat details
5. **Offline-ready** — Heuristics work without internet; full features with connection

### Key Differentiators
- No login required (optional for stats tracking)
- Works standalone, not dependent on browser
- Shows WHY a link is flagged, not just YES/NO
- Cross-platform deployment (Windows + Android)

---

## 3. Features & Functionalities

### Core Features (MVP)

#### 1. **URL Scanning Engine**
- **Function**: Accept any URL and return safety verdict
- **Data Returned**:
  - Safety verdict (SAFE / UNSAFE / SUSPICIOUS)
  - Risk score (0-100)
  - Threat types detected (phishing, malware, etc.)
  - Recommendations
- **Speed**: <2 seconds for most URLs
- **Offline**: Heuristics-only mode if internet unavailable

#### 2. **Real-time Analysis Dashboard**
- **Input Field**: Enter or paste URL
- **Scan Button**: Initiate scanning
- **Results Panel**: Display verdict, score, threats, recommendations
- **Visual Indicators**: 
  - Green (SAFE)
  - Red (UNSAFE)
  - Yellow (SUSPICIOUS)
  - Gray (ERROR)

#### 3. **Score Breakdown**
- **Components Shown**:
  - SSL Certificate validity
  - DNS reputation
  - Domain age
  - Phishing heuristics score
  - Malware indicators
- **Optional**: Toggle to show/hide breakdown

#### 4. **Recommendations**
- **Dynamic Messages**: Based on detected threats
- **Examples**:
  - "Don't enter personal data on this site"
  - "Certificate expired, avoid login"
  - "Similar phishing patterns detected"
- **Optional**: Toggle to show/hide recommendations

### Stretch Goals (Phase 2)

#### 5. **Scan History**
- Store last 50 scans
- Show timestamp, URL, verdict, score
- Search/filter history
- Delete individual or all history

#### 6. **Statistics Dashboard**
- Total scans performed
- Safe vs. Unsafe breakdown (pie chart)
- Most common threats (bar chart)
- Daily/weekly scan trends (line chart)

#### 7. **User Accounts** (Optional)
- Create optional account for cloud sync
- Sync scan history across devices
- Export scan reports as PDF
- Custom watchlists (always-safe domains, always-block domains)

#### 8. **Batch Scanning**
- Paste multiple URLs at once
- Scan all in parallel
- Export results as CSV

---

## 4. Technical Stack

### Backend (API Server)
- **Language**: Node.js
- **Framework**: Express.js
- **Runtime**: Node.js 18+
- **Port**: 5050 (dev), Custom (production)

### Database
- **Primary**: Supabase (PostgreSQL)
- **Purpose**: Store scan history, user accounts, statistics
- **Alternative**: SQLite for offline-enabled mobile app

### Frontend - Web/Desktop
- **Framework**: React 18
- **Build Tool**: Vite
- **Package Manager**: npm

### Frontend - Mobile
- **Framework**: React Native
- **Build Tool**: Expo (faster) OR React Native CLI
- **Target**: Android 11+

### External APIs
- **Google Safe Browsing API v4**: URL reputation database
- **DNS/TLS Query APIs**: Node.js built-in modules
- **Supabase API**: Cloud database operations

### Authentication (Optional)
- **Method**: Email/Password (Supabase Auth) OR OAuth (Google)

### Deployment
- **Backend**: Railway, Heroku, or DigitalOcean
- **Mobile**: Google Play Store (APK upload)
- **Desktop**: GitHub releases or website download

### Development Tools
- **Version Control**: Git/GitHub
- **Testing**: Jest (unit), Cypress/Detox (E2E)
- **Monitoring**: Sentry (error tracking)
- **CI/CD**: GitHub Actions

---

## 5. Wireframes & UI Sketches

### Desktop App (Windows) - Layout

```
┌─────────────────────────────────────────────────────────┐
│  URLY Scanner                           [_] [□] [×]     │
├─────────────────────────────────────────────────────────┤
│                                                            │
│  Welcome to URLY Scanner                                 │
│  Verify link safety before clicking                      │
│                                                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Paste or type a URL...                           │   │
│  └──────────────────────────────────────────────────┘   │
│                   [  SCAN URL  ]                         │
│                                                            │
│  ─────────────────────────────────────────────────────   │
│                                                            │
│  RESULTS:                                                │
│  ✓ SAFE   Score: 2/100  (Very Safe)                     │
│                                                            │
│  ┌─ Score Breakdown ───────────┐                        │
│  │ SSL Certificate:  VALID ✓   │                        │
│  │ Domain Reputation: NEW ⚠     │                        │
│  │ Phishing Score:  0% CLEAN ✓  │                        │
│  │ Malware Check:   CLEAR ✓     │                        │
│  └─────────────────────────────┘                        │
│                                                            │
│  👍 Recommendations:                                     │
│    Safe to visit                                         │
│    SSL is valid                                          │
│                                                            │
│  [View History]  [Export Report]                        │
│                                                            │
└─────────────────────────────────────────────────────────┘
```

### Mobile App (Android) - 3 Core Screens

#### Screen 1: Home/Scan Screen
```
┌──────────────────────────┐
│ URLY Scanner        ☰     │
├──────────────────────────┤
│                          │
│  Scan a URL              │
│  Stay Safe Online        │
│                          │
│  ┌────────────────────┐  │
│  │ Enter URL...       │  │
│  └────────────────────┘  │
│                          │
│    [ SCAN URL ]          │
│                          │
│                          │
│  Recent Scans:           │
│  • gmail.com      ✓      │
│  • example.com    ✓      │
│  • test.phish...  ✗      │
│                          │
├──────────────────────────┤
│ Home  History  Settings  │
└──────────────────────────┘
```

#### Screen 2: Results Screen
```
┌──────────────────────────┐
│ Scan Results        ⬅     │
├──────────────────────────┤
│                          │
│ amazon.com               │
│                          │
│     ✓ SAFE              │
│                          │
│  Score: 8/100           │
│  Very Safe              │
│                          │
│  ─────────────────────  │
│                          │
│  Details:                │
│  • SSL: Valid ✓          │
│  • DNS: Good ✓           │
│  • Age: 20 years ✓       │
│  • Phishing: 0% ✓        │
│                          │
│  Recommendation:         │
│  Safe to visit           │
│  Safe for login          │
│                          │
│   [ SCAN AGAIN ]         │
│                          │
├──────────────────────────┤
│ Home  History  Settings  │
└──────────────────────────┘
```

#### Screen 3: History Screen
```
┌──────────────────────────┐
│ Scan History        ⬅     │
├──────────────────────────┤
│                          │
│ [Search scans...]        │
│                          │
│ Today                    │
│ amazon.com        ✓      │
│ 2:45 PM                  │
│                          │
│ google.com        ✓      │
│ 2:40 PM                  │
│                          │
│ phishing-link.x   ✗      │
│ 2:35 PM                  │
│                          │
│ Yesterday                │
│ github.com        ✓      │
│ 11:20 AM                 │
│                          │
│ [Clear History]          │
│                          │
├──────────────────────────┤
│ Home  History  Settings  │
└──────────────────────────┘
```

### Color Scheme
- **Primary Accent**: #007AFF (Blue) — Main buttons, active states
- **Safe**: #34C759 (Green) — Safe verdicts
- **Unsafe**: #FF3B30 (Red) — Unsafe/Dangerous verdicts
- **Warning**: #FF9500 (Orange) — Suspicious verdicts
- **Background**: #F9F9F9 (Light Gray) — Neutral background
- **Text**: #333333 (Dark Gray) — Primary text

---

## 6. User Flow

### Desktop App (Windows)

```
Start App
    ↓
[Home Screen - Empty state]
    ↓
User Types/Pastes URL
    ↓
User Clicks "Scan URL"
    ↓
[Loading Spinner...]
    ↓
API processes: Google Safe Browsing + Heuristics
    ↓
[Results Screen]
    ├─ Verdict (SAFE/UNSAFE/SUSPICIOUS)
    ├─ Risk Score
    ├─ Score Breakdown (expandable)
    └─ Recommendations
    ↓
User Actions:
├─ Scan Another URL → Back to Home
├─ View History → History Screen
└─ Close App
```

### Mobile App (Android)

**Same flow as desktop**, but with mobile-optimized navigation:

```
Launch App
    ↓
[Home Screen - Input field visible]
    ↓
Tap "Enter URL" field
    ↓
Type or paste URL
    ↓
Tap "SCAN URL" button
    ↓
[Loading Toast/Modal...]
    ↓
Results Display
    ├─ Large verdict indicator
    ├─ Scrollable score breakdown
    └─ Tap to expand recommendations
    ↓
Bottom Navigation:
├─ Home (Scan new URL)
├─ History (View past scans)
└─ Settings (Configure app)
```

### Optional: User Account Flow (Stretch Goal)

```
First Launch
    ↓
[Skip / Sign Up Option]
    ├─ Skip → Use without account
    └─ Sign Up → Create account
        ├─ Email + Password
        ├─ Google OAuth
        └─ Verify email
    ↓
[Logged in - Cloud sync enabled]
    ├─ Scan history synced
    ├─ Can view stats dashboard
    └─ Can export reports
```

---

## 7. Project Timeline

### Phase 1: Backend Deployment (Week 1)
- [ ] Deploy Express API to production server (Heroku/Railway)
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up environment variables (API keys, database credentials)
- [ ] Test API endpoints from public internet
- **Deliverable**: API accessible at `https://api.urly.app`

### Phase 2: Desktop App - Electron Setup (Weeks 2-3)
- [ ] Install Electron + electron-builder dependencies
- [ ] Create main.js (Electron entry point)
- [ ] Configure build scripts and package.json
- [ ] Update API endpoints from localhost to production URL
- [ ] Build and test .exe installer on Windows
- [ ] Create app icon and branding assets
- **Deliverable**: `urly-app-setup.exe` installer ready for distribution

### Phase 3: Desktop App - Testing & Polish (Week 4)
- [ ] Manual testing on Windows 10/11
- [ ] Test all scan paths (safe, unsafe, suspicious)
- [ ] Test error handling (network errors, timeouts)
- [ ] Performance optimization
- [ ] Create user documentation
- **Deliverable**: Polished desktop app ready to ship

### Phase 4: Mobile App - React Native Setup (Weeks 5-6)
- [ ] Create new React Native project with Expo
- [ ] Set up project structure (screens, utils, config)
- [ ] Share business logic with desktop app (API calls, heuristics)
- [ ] Build ScanScreen component
- [ ] Build ResultsScreen component
- [ ] Build HistoryScreen component
- **Deliverable**: Functional Android app on emulator

### Phase 5: Mobile App - Testing & Polish (Week 7)
- [ ] Test on Android emulator
- [ ] Test on real Android device (if available)
- [ ] Performance optimization (app size, startup time)
- [ ] User testing with target users
- [ ] Create app screenshots for Play Store
- **Deliverable**: iOS-ready APK

### Phase 6: Deployment to Stores (Week 8)
- [ ] Create Google Play Developer account ($25)
- [ ] Generate signed APK for release
- [ ] Create Play Store listing (screenshots, description, category)
- [ ] Upload APK and metadata
- [ ] Submit for review
- **Deliverable**: App live on Google Play Store

### Phase 7: Post-Launch (Weeks 9+)
- [ ] Monitor user feedback
- [ ] Fix bugs reported
- [ ] Plan Phase 2 features (stats, accounts, batch scanning)
- [ ] Analytics integration

---

## 8. Roles & Responsibilities

| Role | Responsibilities | Hours/Week |
|------|------------------|-----------|
| **Project Lead** | Timeline tracking, milestone planning, stakeholder communication | 8 hours |
| **Frontend Lead** | React, React Native, UI/UX, componentization | 20 hours |
| **Backend Lead** | API optimization, deployment, database management | 15 hours |
| **QA Engineer** | Testing across platforms, bug reporting, user testing | 12 hours |
| **DevOps** | CI/CD setup, server management, monitoring | 8 hours |

---

## 9. Risks & Workarounds

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **Google Safe Browsing API quota exceeded** | Scanning stops working | Medium | Monitor API usage, implement request throttling, fallback to heuristics-only |
| **Supabase database downtime** | Can't store scan history, stats unavailable | Low | Keep heuristics functioning offline, alert users in UI |
| **User internet connection fails** | App stops working | Medium | Heuristics-only mode works offline, local caching of recent results |
| **Android app rejected from Play Store** | Launch delay | Low | Follow Play Store policies strictly, test before submission |
| **React Native compatibility issues** | Mobile development slowdown | Medium | Use Expo (faster iteration), keep dependencies minimal, test early on real device |
| **High app download size** | Low adoption | Medium | Optimize bundle size, use code splitting, remove unused dependencies |
| **Performance lag on slow phones** | Poor UX on budget devices | Medium | Profile on Android Go device, optimize rendering, lazy load results |

---

## 10. Overall Presentation Summary

### What Makes URLY Stand Out

✅ **Solves a real problem**: Users need safe URL checking on ANY device, not just web browsers

✅ **Cross-platform**: Works on Windows + Android simultaneously, not just web

✅ **Fast & accurate**: <2 second scans + 95%+ detection rate via GSB + heuristics

✅ **User-friendly**: No login required, intuitive UI, shows WHY links are flagged

✅ **Technically sound**: Modern stack (React, Node.js, Expo), proven technologies

✅ **Clear roadmap**: Phased delivery starting with MVP, stretch goals for future phases

✅ **Viable business**: Free to use, monetization options (premium accounts, B2B sales)

### Success Metrics

By end of project:
- ✅ Desktop app downloaded 100+ times
- ✅ Android app installed and active on 50+ devices
- ✅ 99%+ uptime on backend API
- ✅ <2 second avg scan time
- ✅ No crash reports in first month
- ✅ 4.5+ star rating on Play Store

### Next Steps (If Approved)

1. **Week 1**: Deploy backend to production
2. **Weeks 2-4**: Complete desktop app (Electron)
3. **Weeks 5-7**: Complete mobile app (React Native)
4. **Week 8**: Launch to Google Play Store
5. **Weeks 9+**: Monitor, iterate, plan Phase 2

---

## Submission

**Proposal Date**: April 18, 2026

**Status**: Ready for implementation

**Estimated Total Cost**: 
- Server hosting: $50-100/month (production)
- Google Play account: $25 one-time
- Development: [As per team hourly rates]
- **Total Dev Time**: 8 weeks, 2 developers

**Demo Access**:
- Desktop App: Available for Windows testing
- Mobile App: Available on Google Play Store (post-launch week 8)
- API: `https://api.urly.app` (assuming deployment in week 1)

---

**End of Proposal Document**

*For more details or questions, contact the URLY Development Team.*
