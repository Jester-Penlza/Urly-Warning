import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/constants/app_constants.dart';

class AuthSession {
  const AuthSession({
    required this.userId,
    required this.email,
    required this.token,
    required this.expiresAt,
  });

  final String userId;
  final String email;
  final String token;
  final DateTime expiresAt;
}

class AuthService {
  static const _tokenKey = 'auth_token';
  static const _emailKey = 'auth_email';
  static const _userIdKey = 'auth_user_id';
  static const _expiresAtKey = 'auth_expires_at';

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: AppConstants.scannerApiBase,
      connectTimeout: const Duration(milliseconds: AppConstants.requestTimeoutMs),
      receiveTimeout: const Duration(milliseconds: AppConstants.requestTimeoutMs),
      sendTimeout: const Duration(milliseconds: AppConstants.requestTimeoutMs),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  Future<AuthSession?> getSavedSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    final email = prefs.getString(_emailKey);
    final userId = prefs.getString(_userIdKey);
    final expiresAtRaw = prefs.getString(_expiresAtKey);

    if (token == null || email == null || userId == null || expiresAtRaw == null) {
      return null;
    }

    final expiresAt = DateTime.tryParse(expiresAtRaw);
    if (expiresAt == null || expiresAt.isBefore(DateTime.now())) {
      await clearSavedSession();
      return null;
    }

    return AuthSession(
      userId: userId,
      email: email,
      token: token,
      expiresAt: expiresAt,
    );
  }

  Future<void> _saveSession(AuthSession session) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, session.token);
    await prefs.setString(_emailKey, session.email);
    await prefs.setString(_userIdKey, session.userId);
    await prefs.setString(_expiresAtKey, session.expiresAt.toIso8601String());
  }

  Future<void> clearSavedSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_emailKey);
    await prefs.remove(_userIdKey);
    await prefs.remove(_expiresAtKey);
  }

  Future<AuthSession> signIn({required String email, required String password}) async {
    final response = await _dio.post(
      '/auth/login',
      data: {
        'email': email,
        'password': password,
      },
    );

    final data = (response.data as Map).cast<String, dynamic>();
    final token = (data['token'] ?? '').toString();
    final user = (data['user'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
    final userId = (user['id'] ?? '').toString();
    final userEmail = (user['email'] ?? email).toString();
    final expiresAt = DateTime.tryParse((data['expiresAt'] ?? '').toString()) ??
        DateTime.now().add(const Duration(days: 7));

    if (token.isEmpty || userId.isEmpty) {
      throw Exception('Invalid login response');
    }

    final session = AuthSession(
      userId: userId,
      email: userEmail,
      token: token,
      expiresAt: expiresAt,
    );

    await _saveSession(session);
    return session;
  }

  Future<AuthSession> register({required String email, required String password}) async {
    await _dio.post(
      '/auth/register',
      data: {
        'email': email,
        'password': password,
      },
    );

    // Backend register currently returns user only, so log in to create a session token.
    return signIn(email: email, password: password);
  }

  Future<void> signOut({String? token}) async {
    if (token != null && token.isNotEmpty) {
      try {
        await _dio.post(
          '/auth/logout',
          options: Options(headers: {'Authorization': 'Bearer $token'}),
        );
      } catch (_) {
        // Clear local session even if backend logout fails.
      }
    }

    await clearSavedSession();
  }
}
