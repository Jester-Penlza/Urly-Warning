import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'auth_service.dart';
import 'auth_state.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(authServiceProvider));
});

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._service) : super(AuthState.initial) {
    _restoreSessionOnStartup();
  }

  final AuthService _service;

  Future<void> _restoreSessionOnStartup() async {
    final session = await _service.getSavedSession();
    if (session == null) {
      return;
    }

    state = state.copyWith(
      isAuthenticated: true,
      email: session.email,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      error: null,
    );
  }

  Future<void> restoreSession() async {
    await _restoreSessionOnStartup();
  }

  Future<bool> signIn({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final session = await _service.signIn(email: email, password: password);
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        email: session.email,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt,
        error: null,
      );
      return true;
    } catch (error) {
      state = state.copyWith(isLoading: false, error: error.toString());
      return false;
    }
  }

  Future<bool> register({required String email, required String password}) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final session = await _service.register(email: email, password: password);
      state = state.copyWith(
        isLoading: false,
        isAuthenticated: true,
        email: session.email,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt,
        error: null,
      );
      return true;
    } catch (error) {
      state = state.copyWith(isLoading: false, error: error.toString());
      return false;
    }
  }

  Future<void> signOut() async {
    state = state.copyWith(isLoading: true, error: null);
    await _service.signOut(token: state.token);
    state = AuthState.initial;
  }
}
