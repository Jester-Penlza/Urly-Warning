# URLy Warning Flutter App

This folder contains the Flutter version of URLy Warning for:
- Flutter Web
- Flutter Android

## What It Does
- Lets users sign in or register
- Scans URLs for safety risk
- Shows risk labels, score breakdown, and recommendations
- Keeps recent scan history
- Lets users manage scanner settings and blocklist entries

## Runtime Notes
- The app talks to the scanner API from the existing project.
- Web uses `http://localhost:5050`.
- Android emulator uses `http://10.0.2.2:5050`.
- Supabase is used for authentication when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are supplied.
- If Supabase values are not supplied, the app still keeps a local session for demo/testing.

## Expected Flutter Setup
After installing Flutter, run:
```bash
flutter pub get
flutter run -d chrome
flutter run -d emulator-5554
```

## Recommended Run Flags
Use `--dart-define` for environment values:
```bash
flutter run -d chrome \
  --dart-define=SCANNER_API_BASE=http://localhost:5050 \
  --dart-define=SUPABASE_URL=your_supabase_url \
  --dart-define=SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Optimization Notes
- The app uses Riverpod for state separation.
- API calls are grouped into a single service layer.
- Screens are split by feature to keep the code easy to maintain.
- The navigation shell uses an indexed tab layout for fast switching.
- The scanner UI is designed to show fallback text if the backend returns partial data.

## Planned Next Improvements
- Add dedicated Flutter web landing pages if needed
- Add richer loading animations and result cards
- Add charts for scan stats
- Add stronger form validation and retry handling
