# URLy Warning App Proposal

## 1. App Title and Team Info
- App Name: URLy Warning
- Group Name: To be added
- Member Roles: To be added

## 2. Executive Summary
### What problem are you solving?
People receive suspicious links every day through email, chat, social media, and SMS. Many users cannot confidently tell if a link is safe before clicking, which increases the risk of phishing, scams, and malware.

### Who is the target user?
- Students and everyday internet users
- People who frequently open links from messages
- Small teams who want a quick safety check before visiting unknown URLs

### Why is your app the solution?
URLy Warning gives users a fast, simple, and understandable link safety check. Instead of technical cybersecurity language, it provides clear risk labels, a score breakdown, and direct recommendations so users can decide safely in seconds.

## 3. Features and Functionalities
### Core Features
- URL Scan: Analyze a submitted link and return a risk result
- Risk Verdict: Show Safe, Caution, or Unsafe status
- Score Breakdown: Explain what factors affected the result
- Recommendations: Show what the user should do next
- Scan History: Save and review recent scans
- Configurable Scanning: Let users adjust sensitivity and scanner behavior

### Extra Features (Stretch Goals)
- QR Code scan-to-check
- Browser share-to-scan integration on Android
- Multi-language support
- Screenshot/PDF export of scan report
- Team dashboard with shared scan history

### MoSCoW Prioritization
#### Must Have
- URL scanning
- Risk verdict display
- Score breakdown and recommendations
- Login and user profile
- Scan history

#### Should Have
- Adjustable scanner settings
- Blocklist management
- Search and filter in scan history

#### Could Have
- QR scanning
- Report export
- Push alerts for repeated unsafe domains

#### Won't Have (for initial release)
- Enterprise SSO
- Full browser extension integration
- iOS release in first milestone

## 4. Technical Stack
- Frontend: Flutter
- Backend: Supabase

## 5. Wireframes and UI Sketches
Wireframes will be prepared in Figma.

Planned screens to include:
- Login/Register Screen
- Home Screen
- Core Feature Screen 1: URL Scanner and Result View
- Core Feature Screen 2: Scan History and Result Details

Design notes:
- Clean and simple UI for non-technical users
- Clear color cues for risk levels
- Mobile-first layout with responsive web adaptation

## 6. User Flow
User interaction from start to end:

1. Open app or website
2. Register or login
3. Land on Home screen
4. Paste URL in scanner input
5. Tap Scan
6. View result: risk label, score breakdown, recommendations
7. Save result to history
8. Optionally adjust settings for future scans
9. Return to Home and scan another URL

Quick arrow view:
Login/Register -> Home -> Enter URL -> Scan -> View Result -> Review Recommendation -> Save to History -> Repeat

## 7. Project Timeline
Note: Week labels can be adjusted to your actual class calendar.

### Week 1
- Finalize proposal and feature scope
- Assign team roles

### Week 2
- Create wireframes in Figma
- Finalize UI direction and user flow

### Week 3
- Set up Flutter project structure
- Set up Supabase project and base schema

### Week 4
- Build Login/Register and Home screens
- Connect authentication flow

### Week 5
- Implement URL Scanner feature and result display
- Implement risk label and recommendations UI

### Week 6
- Implement scan history and search/filter
- Add configuration settings panel

### Week 7
- QA and bug fixing
- UI polish and performance cleanup

### Week 8 (Finals Week)
- Final testing and demo rehearsal
- Prepare submission package and supporting files

### Who does what?
- Team Lead: Carl Jazhly H. Bartolome
- UI/UX Design: Carl Jazhly H. Bartolome, Jester Penaloza, Jeithro Scott Usi
- Flutter Frontend: Jester Penaloza, Jeithro Scott Usi
- Backend and Database (Supabase): Carl Jazhly H. Bartolome
- Testing and Documentation: Jeithro Scott Usi