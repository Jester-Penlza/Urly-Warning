# Transfer & Setup Guide - Websz Project

**Use this guide when moving this project to a new PC.**

---

## What This Project Contains

This is a **multi-platform application** with:
- **Web App**: React + Vite (Frontend)
- **Backend Services**: Node.js (Scanner server, Express APIs)
- **Mobile App**: Flutter (Android + Web)
- **Database**: Supabase integration
- **Tools**: PDF generation, URL feed management

---

## ⚠️ IMPORTANT: Transferring the Project (Zip/Copy Issues)

### Files That Might NOT Extract Properly in ZIP

**Problem**: Some files won't extract from ZIP on Windows. Here's what to watch for:

**Hidden Files (start with `.`)**
- `.env` - CRITICAL! Has API keys and database connection
- `.gitignore` - Needed for Git
- `.git/` - Version control history (optional)

**Solution for ZIP Transfer:**
1. **Use 7-Zip instead of Windows ZIP** (more reliable):
   - Download: https://www.7-zip.org/
   - Right-click folder > 7-Zip > Add to archive
   - Extract with 7-Zip on new PC

2. **Or use PowerShell** (preserves all files):
   ```powershell
   # Compress
   Compress-Archive -Path "C:\path\to\Websz" -DestinationPath "Websz.zip"
   
   # Extract
   Expand-Archive -Path "Websz.zip" -DestinationPath "C:\new\location"
   ```

3. **Or use Git** (cleanest):
   ```powershell
   git clone your-repo-url
   ```

### Files That Might Cause Issues

| File/Folder | Issue | Solution |
|-------------|-------|----------|
| `.env` | Hidden file, won't show in Explorer | Use 7-Zip or PowerShell to transfer |
| `node_modules/` | Too large (400MB+), slow to transfer | Exclude from ZIP, regenerate with `npm install` |
| `urly_warning_flutter/build/` | Too large, not needed | Exclude from ZIP |
| `dist/` | Build output, not needed | Exclude from ZIP |
| `.git/` | Large, not needed unless using Git | Exclude unless tracking history |
| Long file paths | Windows has 260 char limit | Use PowerShell extraction, not Windows ZIP |

### What MUST Be Transferred (Don't Exclude)

```
✅ Transfer everything EXCEPT:
   ✗ node_modules/
   ✗ .dart_tool/
   ✗ urly_warning_flutter/build/
   ✗ dist/
   ✗ .git/ (optional - only if tracking history)

⚠️ DO transfer even though hidden:
   ✅ .env (has API keys!)
   ✅ .gitignore
   ✅ .env.example
```

### Step-by-Step: Safe Transfer Process

**Option A: Using 7-Zip (RECOMMENDED)**
1. Download 7-Zip: https://www.7-zip.org/
2. Right-click `Websz` folder > 7-Zip > Add to archive
3. Uncheck `node_modules/` and `build/` folders in list
4. Create archive
5. Transfer ZIP to new PC
6. Extract with 7-Zip (right-click > Extract)
7. Run `npm install` and `flutter pub get`

**Option B: Using PowerShell**
```powershell
# Create ZIP (preserves hidden files)
Compress-Archive -Path "C:\path\to\Websz" -DestinationPath "Websz.zip" -Force

# Extract on new PC
Expand-Archive -Path "Websz.zip" -DestinationPath "C:\new\location" -Force

# Then run
cd "C:\new\location\Websz"
npm install
cd urly_warning_flutter && flutter pub get && cd ..
npm run dev:all
```

**Option C: Using Git (Best for version control)**
```powershell
# Push to GitHub/GitLab first
git push

# On new PC
git clone https://github.com/yourname/websz-project.git
cd websz-project
npm install
cd urly_warning_flutter && flutter pub get && cd ..
npm run dev:all
```

### If Files Don't Extract

**Problem**: "Can't extract file" or missing `.env`

**Solution**:
1. Use 7-Zip or PowerShell (not Windows ZIP)
2. Or manually recreate `.env`:
   ```
   Copy the credentials from .env.example
   ```
3. Check file permissions: Right-click > Properties > Security

---

## Prerequisites to Install (First Time on New PC)

### 1. **Node.js** (for Web + Backend)
- **Download**: https://nodejs.org/ (LTS version recommended)
- **Verify**: Open PowerShell and run:
  ```
  node --version
  npm --version
  ```
- **What it's for**: Running React frontend, scanner server, and Node.js tools

### 2. **Flutter SDK** (for Mobile App)
- **Download**: https://flutter.dev/docs/get-started/install
- **Installation**: Follow the OS-specific guide (Windows requires Visual Studio Build Tools)
- **Verify**:
  ```
  flutter --version
  flutter doctor
  ```
- **What it's for**: Building and running the Android/Web mobile app

### 3. **Git** (for version control)
- **Download**: https://git-scm.com/
- **Verify**: 
  ```
  git --version
  ```

### 4. **Android Studio** (Optional, for Flutter Android)
- **Download**: https://developer.android.com/studio
- **Why**: To run Flutter app on Android emulator or device

---

## Step-by-Step Setup After Transferring Files

### Step 1: Copy Project Folder
```
Copy the entire "Websz" folder to your new PC
```

### Step 2: Install Web Dependencies
```powershell
cd "C:\path\to\Websz"
npm install
```
- **What it does**: Downloads all Node.js packages listed in `package.json`
- **Location stored**: `node_modules/` folder (NOT included in transfer, rebuilt here)

### Step 3: Install Flutter Dependencies
```powershell
cd "C:\path\to\Websz\urly_warning_flutter"
flutter pub get
```
- **What it does**: Downloads all Flutter packages listed in `pubspec.yaml`
- **Location stored**: `.dart_tool/` and `pubspec.lock` (auto-generated)

### Step 4: Database is Already Set Up ✅
**Good news: Supabase is already configured!**

The database connection and API keys are already in place:
- `config/supabase-config.js` - Has Supabase URL and API key
- `.env` file - Already has credentials
- `database/schemas/supabase-schema.sql` - Schema is ready to use
- Flutter: `urly_warning_flutter/lib/core/constants/app_constants.dart` - Already configured

**Just transfer everything and it will work.**

On the new PC, the developer only needs to:
1. Copy all files (including `.env` with credentials)
2. Run `npm install` and `flutter pub get`
3. Run `npm run dev:all`
4. Database automatically connects ✓

⚠️ **Important**: The `.env` file with API keys is included. Treat it as sensitive - never share or commit to public Git!

---

## Development Workflow (Making Changes)

### Editing React Frontend (Web)
1. Edit files in `src/` folder
2. Frontend auto-reloads in browser (hot reload)
3. Files to edit:
   - `src/components/` - UI components
   - `src/pages/` - Page screens
   - `src/App.jsx` - Main app
4. No need to restart - just save file

### Editing Flutter Mobile App
1. Edit files in `urly_warning_flutter/lib/` 
2. Run the app with hot reload:
   ```powershell
   cd urly_warning_flutter
   flutter run
   ```
3. Press `R` in terminal to hot-reload
4. Press `R` twice for full rebuild
5. Files to edit:
   - `lib/features/` - App screens
   - `lib/core/` - Services and utilities
   - `lib/models/` - Data models

### Editing Backend (Scanner Server)
1. Edit files in `scanner/` or `database/`
2. **Must restart** - auto-reload not available
3. Stop scanner server (Ctrl+C)
4. Start again: `npm run scan`
5. Files commonly edited:
   - `scanner/scan-server.js` - Scanning logic
   - `database/db-routes.js` - API endpoints

### Code Quality Tools
```powershell
# Format code (if available)
dart format .

# Check for issues
flutter analyze
```

---

## Testing & Verification

### Test 1: Web App Works
```
1. Start: npm run dev:all
2. Open: http://localhost:5173
3. Can you see the home page? ✓
```

### Test 2: Scanner Server Responds
```
1. Open in browser: http://localhost:5050/health
2. Should return: {"status":"ok"} ✓
```

### Test 3: Database Connection Works ✅
```
1. The database is pre-configured (already connected)
2. Start app: npm run dev:all
3. Try to register/login - should work immediately ✓
```

### Test 4: Flutter App Works
```powershell
cd urly_warning_flutter
flutter run
# Select device/emulator when prompted
# App should launch ✓
```

### Test 5: Scan Feature Works
```
1. Web: Enter a URL and click "Scan Links"
2. Should show results ✓
3. Try same URL again - should show "(Cached)" ✓
```

---

## Building for Production

### Build Web App
```powershell
npm run build
# Creates "dist/" folder ready for deployment
```

### Build Flutter Android App
```powershell
cd urly_warning_flutter
flutter build apk
# Creates: build/app/outputs/flutter-app-release.apk
```

### Build Flutter Web
```powershell
cd urly_warning_flutter
flutter build web
# Creates: build/web/ folder
```

---

## Common Modifications & Where to Find Code

| Feature | File | What to Change |
|---------|------|----------------|
| Change app name | `urly_warning_flutter/pubspec.yaml` | Line 2: `name:` |
| Change colors | `src/App.css` | Color variables |
| Add new scanning rule | `scanner/scan-server.js` | Add regex check |
| Change logo | `public/images/` | Replace image files |
| Add new page | `src/pages/` | Create new .jsx file |
| Modify API endpoint | `database/db-routes.js` | Add route handler |
| Change form fields | `src/components/` | Edit component JSX |
| Update Flutter UI | `urly_warning_flutter/lib/features/` | Edit .dart files |

---

## IDE Setup (Recommended)

### For Web Development
- **VS Code** (already open)
- Install extensions: ES7+ React/Redux/React-Native snippets
- Install: Prettier (code formatter)

### For Flutter Development
- **VS Code** or **Android Studio**
- Install extensions: Flutter, Dart
- VS Code path: Extensions > Search "Flutter" > Install

### For Database
- **Supabase Web Dashboard** - GUI editor
- **pgAdmin** (optional) - SQL client

---

## Project Initialization Reference

**Do this ONCE after transfer:**

```powershell
# 1. Navigate to project
cd "C:\path\to\Websz"

# 2. Install Node dependencies
npm install
# ⏱ Takes ~2-3 minutes

# 3. Install Flutter dependencies (if needed)
cd urly_warning_flutter
flutter pub get
# ⏱ Takes ~1-2 minutes
cd ..

# 4. Start everything (database already configured!)
npm run dev:all

# 5. Open in browser
# http://localhost:5173
```

**Every time after that:** Just run `npm run dev:all`

**That's it!** No need to set up Supabase - it's already connected.

---

## Key Configuration Files (What They Do)

| File | Purpose | Edit if... |
|------|---------|-----------|
| `.env` | Environment variables | Changing Supabase credentials |
| `config/supabase-config.js` | Database settings | Using different Supabase project |
| `config/scanner.config.json` | Scanner options | Changing security rules |
| `vite.config.js` | Frontend build | Changing port or build output |
| `urly_warning_flutter/pubspec.yaml` | Flutter dependencies | Adding new packages |
| `package.json` | Node.js dependencies | Adding new npm packages |

---

## Important Security Notes for Developer

⚠️ **NEVER commit to Git:**
- `.env` file (has API keys!)
- `node_modules/` (too large, auto-generated)
- `.dart_tool/` (Flutter cache, auto-generated)
- API keys in code (use .env instead)

✅ **DO commit to Git:**
- Source code (`src/`, `urly_warning_flutter/lib/`)
- Configuration templates (`.env.example`)
- Documentation files
- `package.json` and `pubspec.yaml` (dependencies list)



### Option 1: Start Everything (Recommended)
```powershell
npm run dev:all
```
This opens:
- **Scanner Server**: http://localhost:5050
- **Vite Dev Server**: http://localhost:5173 (or next available port)

### Option 2: Start Individually
```powershell
# Terminal 1 - Frontend only
npm run dev

# Terminal 2 - Scanner server only
npm run scan
```

### Option 3: Flutter Mobile App
```powershell
cd urly_warning_flutter

# Run on connected device or emulator
flutter run

# Or build for production
flutter build apk    # Android
flutter build web    # Web version
```

---

## Folder Structure Overview

| Folder | Purpose | Needs Setup? |
|--------|---------|--------------|
| `src/` | React frontend components | ✓ `npm install` |
| `scanner/` | URL scanning server (Node.js) | ✓ `npm install` |
| `database/` | Supabase connection code | ✓ Env vars |
| `config/` | Configuration files (scanner, Supabase) | ✓ Edit if needed |
| `urly_warning_flutter/` | Flutter mobile app source | ✓ `flutter pub get` |
| `public/` | Static HTML test pages | ✗ Ready to use |
| `tests/` | Test data and scripts | ✗ Ready to use |
| `docs/` | Documentation | ✗ Reference only |
| `feeds/` | URL feed lists | ✗ Auto-updated by scripts |
| `node_modules/` | **NOT in transfer** - regenerated by `npm install` | Auto-created |

---

## Dependencies Summary

### Node.js Dependencies (Web/Backend)
```
✓ React 18 - Frontend framework
✓ Vite - Build tool
✓ Express - Backend API server
✓ Supabase - Database/Auth
✓ Framer Motion - Animations
✓ React Router - Navigation
✓ Bcrypt - Password hashing
✓ Dotenv - Environment variables
```

### Flutter Dependencies (Mobile)
```
✓ Flutter SDK - Core framework
✓ Supabase Flutter - Database integration
✓ Riverpod - State management
✓ GoRouter - Navigation
✓ Dio - HTTP client
✓ Shared Preferences - Local storage
```

### Development Tools
```
✓ HTML-PDF Node - PDF generation
✓ Marked - Markdown parsing
✓ Flutter Lints - Code quality
```

---

## Troubleshooting

### Issue: `npm: command not found`
**Solution**: Install Node.js from https://nodejs.org/

### Issue: `flutter: command not found`
**Solution**: 
1. Install Flutter: https://flutter.dev/docs/get-started/install
2. Add to PATH (Windows: See Flutter docs)
3. Run `flutter doctor` to verify

### Issue: Port 5050 or 5173 already in use
**Solution**: 
```powershell
# Check what's using the port
netstat -ano | findstr :5050

# Kill the process (replace PID with number from above)
taskkill /PID <PID> /F

# Or change port in config files
```

### Issue: Supabase connection fails
**Solution**: 
```
1. Supabase is pre-configured - should work immediately
2. Verify .env file was transferred (has API keys)
3. Check internet connection
4. If still fails, verify Supabase URL in config/supabase-config.js
```

### Issue: Flutter build fails
**Solution**: 
```powershell
flutter clean
flutter pub get
flutter pub upgrade
flutter pub global activate fvm  # (optional, for version management)
```

### Issue: "Cannot GET /health" when accessing scanner
**Solution**: 
```
1. Check if scanner server started (you should see messages)
2. Make sure you used: npm run dev:all (not just npm run dev)
3. If port 5050 error, check what's using it
```

### Issue: React components not updating after edit
**Solution**: 
```
1. Save file (Ctrl+S)
2. Check VS Code bottom-left for errors
3. Hard refresh browser (Ctrl+Shift+R)
4. Check terminal for build errors
```

### Issue: `.env` file is missing after extraction
**Solution**:
```
1. Check if file exists but hidden: View > Show hidden files
2. If still missing, copy from .env.example:
   - Open .env.example
   - Save as .env
   - Paste your API keys (should already be there)
3. If that doesn't work, use PowerShell to extract instead of ZIP
```

### Issue: "node_modules not found" error
**Solution**: 
```
1. This is normal - node_modules is excluded from transfer
2. Just run: npm install
3. It will regenerate everything
```

### Issue: "Cannot find some files after ZIP extraction"
**Solution**:
```
1. Use 7-Zip or PowerShell instead of Windows ZIP
2. Windows ZIP doesn't handle:
   - Hidden files (starting with .)
   - Long file paths
   - Symlinks
3. Re-extract using: Expand-Archive -Path "Websz.zip" -DestinationPath "C:\location" -Force
```

---

## Step-by-Step Verification Checklist

After setup, verify each step works:

- [ ] 1. Node.js installed: `node --version` shows v18+
- [ ] 2. npm installed: `npm --version` shows v9+
- [ ] 3. Flutter installed: `flutter --version` works
- [ ] 4. Project copied to new location
- [ ] 5. **Critical**: `.env` file exists in root folder
- [ ] 6. **Critical**: `config/supabase-config.js` exists
- [ ] 7. **Critical**: `urly_warning_flutter/pubspec.yaml` exists
- [ ] 8. `npm install` completed (took 2-3 min)
- [ ] 9. `flutter pub get` completed (took 1-2 min)
- [ ] 10. `npm run dev:all` starts without errors
- [ ] 11. Web app opens at http://localhost:5173
- [ ] 12. Scanner responds at http://localhost:5050/health
- [ ] 13. Can register new user (database auto-connected)
- [ ] 14. Can login with registered account
- [ ] 15. Scan feature works
- [ ] 16. Flutter app runs: `flutter run`

---

## Critical Files Verification (Do This After Transfer!)

Before starting development, verify these files exist:

```powershell
# Check in PowerShell - all should return paths
Get-Item ".env"
Get-Item "config/supabase-config.js"
Get-Item "package.json"
Get-Item "urly_warning_flutter/pubspec.yaml"
Get-Item "src/App.jsx"
Get-Item "scanner/scan-server.js"
Get-Item "database/db-routes.js"
```

**If any of these are missing**, files didn't transfer properly:
1. Use 7-Zip or PowerShell to re-extract
2. Check Windows hidden files are visible
3. Manually copy missing files from original PC

---

## Quick Code Examples (Start Modifying Here)

### Example 1: Add New Button to Web Frontend
**File**: `src/pages/Home.jsx`
```jsx
// Find the button section and add:
<button onClick={() => alert('New button works!')}>
  Click Me
</button>
```
**Result**: Button appears instantly (hot reload)

### Example 2: Add New API Endpoint
**File**: `database/db-routes.js`
```javascript
// Add new route:
app.post('/api/myfeature', async (req, res) => {
  // Your code here
  res.json({ success: true });
});
```
**How to test**: 
```powershell
# Open browser console
fetch('http://localhost:5050/api/myfeature', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

### Example 3: Modify Flutter UI
**File**: `urly_warning_flutter/lib/features/scan/scan_screen.dart`
```dart
// Change button text:
ElevatedButton(
  onPressed: () => _scanUrl(),
  child: Text('Scan Now'), // Change this
)
```
**Result**: Press `R` in terminal for hot reload

### Example 4: Add New Dart Package
**File**: `urly_warning_flutter/pubspec.yaml`
```yaml
dependencies:
  flutter:
    sdk: flutter
  new_package: ^1.0.0  # Add this line
```
**Then run**:
```powershell
flutter pub get
```

---

## How Developers Will Use This

### Scenario 1: Bug Fix
```
1. Read error message in browser/terminal
2. Find file in src/ or scanner/
3. Fix the code
4. See fix instantly (hot reload or refresh)
5. Test the fix
6. Done!
```

### Scenario 2: Add New Feature
```
1. Add code to src/ or urly_warning_flutter/lib/
2. Add new API endpoint if needed in database/db-routes.js
3. Test in browser/app
4. If database needed, add SQL in supabase-schema.sql
5. Done!
```

### Scenario 3: Change Styling
```
1. Edit src/App.css
2. Refresh browser (Ctrl+R)
3. See changes immediately
```

### Scenario 4: Add New Scanning Rule
```
1. Edit scanner/scan-server.js
2. Add your check logic
3. Restart scanner (Ctrl+C, then npm run scan)
4. Test with URL
```

---

## Most Important Files to Know

For a developer, these 8 files are 80% of what they'll work with:

| File | What | When |
|------|------|------|
| `src/App.jsx` | Main web app structure | Layout changes |
| `src/pages/*.jsx` | Each web page | Modifying pages |
| `src/components/*.jsx` | Reusable components | Building UI |
| `database/db-routes.js` | Backend APIs | Adding endpoints |
| `scanner/scan-server.js` | Scanning logic | Changing scan rules |
| `urly_warning_flutter/lib/features/` | Flutter screens | Mobile app UI |
| `.env` | API keys & secrets | Configuration |
| `package.json` | Dependencies | Adding npm packages |

**Master these 8 and you can modify almost anything.**

---

## Documentation Reference Map

| Need | File | Time |
|------|------|------|
| Quick start | **THIS FILE** ← Start here | 5 min |
| Database setup | DATABASE-INTEGRATION-GUIDE.md | 10 min |
| File locations | FILE-ORGANIZATION.md | 5 min |
| API endpoints | docs/api/API-DOCUMENTATION.md | 15 min |
| System design | docs/system-analysis/SYSTEM-FLOW-DIAGRAM.md | 10 min |
| Tech stack | FLUTTER-WEB-ANDROID-FUNCTIONAL-SPEC.md | 20 min |
| Project status | PHASE-2-COMPLETE.md | 5 min |

**Recommended reading order:**
1. This file (you are here)
2. DATABASE-INTEGRATION-GUIDE.md
3. FILE-ORGANIZATION.md
4. Then reference others as needed

---

## Useful Commands Reference

```powershell
# Web/Backend
npm run dev        # Start web only
npm run scan       # Start scanner only
npm run dev:all    # Start both (RECOMMENDED)
npm run build      # Build for production
npm run feeds:update  # Update URL filter lists

# Flutter
flutter run        # Run app on device/emulator
flutter clean      # Clean build cache
flutter pub get    # Install packages
flutter pub upgrade # Update packages
flutter doctor     # Check system setup
flutter build apk  # Build Android app
flutter build web  # Build web version

# Node.js utilities
node <filename>    # Run JavaScript file
npm list           # Show installed packages
npm outdated       # Check for updates
```

---

## What's Ready to Use (Don't Change Yet)

These are pre-configured and working:

✅ Supabase database tables (created by schema)  
✅ Scanner server endpoints  
✅ React component structure  
✅ Flutter navigation (GoRouter)  
✅ API routes in database/db-routes.js  
✅ Authentication system  
✅ Cache deduplication  
✅ History logging  

**Just modify business logic, don't refactor architecture.**

---

## Next Steps After Setup

**First developer should:**

1. ✅ Complete setup (all 15 checklist items)
2. ✅ Read DATABASE-INTEGRATION-GUIDE.md
3. ✅ Make a small test change (edit button text)
4. ✅ Create a simple new feature
5. ✅ Document any issues in this file

**Then the project is ready for real development.**

---

## Automated Setup Scripts (Optional)

To automate this process, run in PowerShell:
```powershell
# Install all dependencies automatically
cd "C:\path\to\Websz"
npm install
cd urly_warning_flutter
flutter pub get
cd ..
```

---

## What Gets Auto-Generated (Don't Transfer)

These folders are created automatically when you run setup commands:
- ✗ `node_modules/` - npm packages (recreated by `npm install`)
- ✗ `urly_warning_flutter/.dart_tool/` - Flutter cache (recreated by `flutter pub get`)
- ✗ `urly_warning_flutter/build/` - Build outputs (recreated by build commands)
- ✗ `.env` - Environment variables (create manually on new PC)

**Transfer everything else from the original PC.**

---

## Quick Reference Card

| Task | Command | Location |
|------|---------|----------|
| Install web deps | `npm install` | Root folder |
| Install Flutter deps | `flutter pub get` | `urly_warning_flutter/` |
| Start everything | `npm run dev:all` | Root folder |
| Start web only | `npm run dev` | Root folder |
| Start scanner only | `npm run scan` | Root folder |
| Build web | `npm run build` | Root folder |
| Run Flutter | `flutter run` | `urly_warning_flutter/` |
| Update URL feeds | `npm run feeds:update` | Root folder |

---

---

## Summary: Simple 3-Step Setup

**When next developer gets this project:**

```
STEP 1: Copy folder
STEP 2: npm install
STEP 3: Run: npm run dev:all
```

**That's it!** 

- ✅ Database already connected
- ✅ API keys already configured
- ✅ Everything auto-generates
- ✅ Open http://localhost:5173

---

**Last Updated**: May 16, 2026  
**Project Name**: Websz (URLy Warning Application)  
**Version**: 1.0.0  
**Status**: Production Ready

---

## For the Next Developer 👋

This project is set up to be **developer-friendly**. 

✅ Everything auto-generates on first setup  
✅ Hot reload for instant feedback  
✅ Clear file structure with documentation  
✅ Database already configured  
✅ Backend APIs ready to use  
✅ Flutter app ready to modify

**You can start modifying code immediately after setup.**

If you need help:
1. Check this file first
2. Check DATABASE-INTEGRATION-GUIDE.md
3. Check FILE-ORGANIZATION.md
4. Check docs/ folder for technical details
