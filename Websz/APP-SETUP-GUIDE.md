# URLY App Setup Guide
## Desktop (Windows) + Android App Development

This guide walks you through converting the URLY website into a working desktop app and Android app.

---

## Table of Contents
1. [Phase 1: Deploy Backend](#phase-1-deploy-backend)
2. [Phase 2: Build Windows Desktop App](#phase-2-build-windows-desktop-app)
3. [Phase 3: Build Android App](#phase-3-build-android-app)
4. [Testing & Publishing](#testing--publishing)

---

## Phase 1: Deploy Backend

Your Express API currently runs on `http://localhost:5050`. Apps need it accessible from the internet.

### Option 1: Heroku (Easiest, 10 minutes)

1. **Create Heroku account**: https://www.heroku.com
2. **Install Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli
3. **In your project folder, run**:
   ```bash
   heroku login
   heroku create urly-api  # Or your preferred name
   git push heroku main
   ```
4. **Your API is now at**: `https://urly-api.herokuapp.com/api/scan`

### Option 2: Railway (Even Easier, 5 minutes)

1. **Go to**: https://railway.app
2. **Connect your GitHub repo**
3. **Deploy automatically**
4. **Your API is now at**: `https://yourproject.railway.app/api/scan`

### Option 3: DigitalOcean (Cheapest long-term, $5/month)

1. **Create account**: https://www.digitalocean.com
2. **Create App Platform project**
3. **Connect GitHub repo**
4. **Deploy Node.js app**
5. **Your API is now at**: `https://yourapp-xxxxxxx.ondigitalocean.app/api/scan`

**➔ Once deployed, note the URL. You'll use it in the next steps.**

---

## Phase 2: Build Windows Desktop App

### Technology: Electron
Electron wraps your React app in a desktop window.

### Step 1: Install Electron Dependencies

In your project folder, run:
```bash
npm install electron electron-builder --save-dev
```

### Step 2: Create `electron/main.js`

Create a new folder `electron/` and add file `main.js`:

```javascript
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(__dirname, '../dist/index.html')}`; // Production build

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

### Step 3: Create `electron/preload.js`

```javascript
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  appVersion: require('../package.json').version,
});
```

### Step 4: Install `electron-is-dev`

```bash
npm install electron-is-dev --save-dev
```

### Step 5: Update `package.json`

Add these scripts in your `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "electron-dev": "electron .",
    "dev:all": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && npm run electron-dev\"",
    "build": "vite build",
    "electron-build": "npm run build && electron-builder",
    "electron-dev": "electron ."
  },
  "main": "electron/main.js",
  "homepage": "./",
  "build": {
    "appId": "com.urly.app",
    "productName": "URLY Scanner",
    "files": [
      "dist/**/*",
      "electron/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": ["nsis"],
      "certificateFile": null
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "installerIcon": "public/urly-icon.ico"
    }
  }
}
```

Also install concurrently:
```bash
npm install concurrently wait-on --save-dev
```

### Step 6: Update API Endpoints in Your Code

Replace all `http://localhost:5050` with your deployed URL.

**In `src/pages/Home.jsx` or wherever you call the API**:

```javascript
// OLD:
const API_URL = 'http://localhost:5050';

// NEW:
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050';
```

### Step 7: Create `.env.local` (for development)

```
REACT_APP_API_URL=http://localhost:5050
```

Create `.env.production` (for released app):

```
REACT_APP_API_URL=https://yourdeployed-url.herokuapp.com
```

### Step 8: Build Windows Installer

```bash
npm run electron-build
```

This creates an installer in `dist/URLY Scanner Setup 1.0.0.exe`

Users can now:
1. Download the `.exe`
2. Run it
3. Install URLY Scanner
4. App will connect to your backend API

---

## Phase 3: Build Android App

### Technology: React Native + Expo

Android requires rebuilding the UI for mobile devices (React components → React Native components).

### Step 1: Create New React Native Project

In a parent folder (not inside your Websz folder):

```bash
npx create-expo-app urly-mobile
cd urly-mobile
npm install
```

### Step 2: Install Core Dependencies

```bash
npm install expo-constants
npm install @react-navigation/native react-navigation
npm install expo-status-bar
npm install axios
```

### Step 3: Create File Structure

```
urly-mobile/
├── src/
│   ├── screens/
│   │   └── ScanScreen.js
│   ├── utils/
│   │   └── apiClient.js
│   └── config/
│       └── constants.js
├── App.js
└── app.json
```

### Step 4: Create `src/config/constants.js`

```javascript
export const API_URL = 'https://yourdeployed-url.herokuapp.com'; // Use your backend URL
```

### Step 5: Create `src/utils/apiClient.js`

```javascript
import axios from 'axios';
import { API_URL } from '../config/constants';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

export const scanURL = async (url) => {
  try {
    const response = await client.post('/api/scan', { url });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getHealth = async () => {
  try {
    const response = await client.get('/health');
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

### Step 6: Create `src/screens/ScanScreen.js`

```javascript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { scanURL } from '../utils/apiClient';

export default function ScanScreen() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await scanURL(url);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>URLY Scanner</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter URL to scan..."
        value={url}
        onChangeText={setUrl}
        placeholderTextColor="#999"
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleScan}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Scanning...' : 'Scan URL'}
        </Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#007AFF" />}

      {error && <Text style={styles.error}>{error}</Text>}

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Scan Results</Text>

          <View style={styles.resultItem}>
            <Text style={styles.label}>URL:</Text>
            <Text style={styles.value}>{result.url}</Text>
          </View>

          <View style={styles.resultItem}>
            <Text style={styles.label}>GSB Verdict:</Text>
            <Text
              style={[
                styles.value,
                {
                  color:
                    result.gsb.verdict === 'unsafe' ? '#FF3B30' : '#34C759',
                },
              ]}
            >
              {result.gsb.verdict.toUpperCase()}
            </Text>
          </View>

          {result.heuristics && (
            <View style={styles.resultItem}>
              <Text style={styles.label}>Heuristics Score:</Text>
              <Text style={styles.value}>{result.heuristics.score}</Text>
            </View>
          )}

          {result.recommendations && result.recommendations.length > 0 && (
            <View style={styles.resultItem}>
              <Text style={styles.label}>Recommendations:</Text>
              {result.recommendations.map((rec, i) => (
                <Text key={i} style={styles.recommendation}>
                  • {rec}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 15,
  },
  resultBox: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  resultItem: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  recommendation: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
});
```

### Step 7: Update `App.js`

```javascript
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import ScanScreen from './src/screens/ScanScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScanScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
```

### Step 8: Test Android App Locally

```bash
# Install Expo CLI if not already
npm install -g expo-cli

# Start development server
npx expo start

# Press 'a' to open Android emulator
```

### Step 9: Build APK for Google Play Store

```bash
eas build --platform android
```

[Follow Expo EAS Build docs](https://docs.expo.dev/build/introduction/)

Once built:
1. Upload APK to Google Play Console
2. Users can download from Google Play Store

---

## Testing & Publishing

### Test Desktop App Locally

```bash
# Terminal 1: Start backend
npm run scan

# Terminal 2: Start Electron dev
npm run dev:all
```

The app opens automatically. Test:
- ✅ Can enter URL
- ✅ Clicks "Scan" button
- ✅ Results display
- ✅ Correctly shows safe/unsafe verdicts

### Test Android App

```bash
npx expo start
# Press 'a' for Android emulator
```

Same tests as desktop.

### Publish Desktop App

Once working:

```bash
npm run electron-build
```

Distributes `URLY Scanner Setup.exe` via:
- Your website download link
- GitHub releases
- App installers

### Publish Android App

1. Create Google Play Developer account ($25 one-time)
2. Create app listing
3. Upload APK from `npx expo build --platform android`
4. Submit for review (takes ~2 hours)
5. Live on Google Play Store

---

## Summary

| Task | Time | Tools |
|------|------|-------|
| Deploy backend | 10 min | Heroku/Railway |
| Build Windows app | 2-3 weeks | Electron |
| Build Android app | 3-4 weeks | React Native |
| **Total** | **6-7 weeks** | |

**Next Steps**:
1. Deploy your backend (Heroku recommended, easiest)
2. Note the URL (e.g., `https://urly-api.herokuapp.com`)
3. Follow Phase 2 to build Windows desktop app
4. Test it works
5. Then move to Phase 3 for Android

---

**Questions?** Refer back to the specific phase and follow exactly. All code provided is copy-paste ready.
