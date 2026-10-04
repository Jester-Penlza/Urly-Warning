import 'package:flutter/foundation.dart';

class AppConstants {
  AppConstants._();

  static const appName = 'URLy Warning';

  // Configure values with --dart-define during run/build.
  static const scannerApiBase = String.fromEnvironment(
    'SCANNER_API_BASE',
    defaultValue: kIsWeb ? 'http://localhost:5050' : 'http://10.0.2.2:5050',
  );

  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL', defaultValue: '');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY', defaultValue: '');

  static const requestTimeoutMs = 30000;
  static const scanRequestTimeoutMs = 90000;
}
