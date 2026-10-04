class AuthState {
  const AuthState({
    required this.isLoading,
    required this.isAuthenticated,
    this.email,
    this.userId,
    this.token,
    this.expiresAt,
    this.error,
  });

  final bool isLoading;
  final bool isAuthenticated;
  final String? email;
  final String? userId;
  final String? token;
  final DateTime? expiresAt;
  final String? error;

  static const Object _sentinel = Object();

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    Object? email = _sentinel,
    Object? userId = _sentinel,
    Object? token = _sentinel,
    Object? expiresAt = _sentinel,
    Object? error = _sentinel,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      email: identical(email, _sentinel) ? this.email : email as String?,
      userId: identical(userId, _sentinel) ? this.userId : userId as String?,
      token: identical(token, _sentinel) ? this.token : token as String?,
      expiresAt: identical(expiresAt, _sentinel) ? this.expiresAt : expiresAt as DateTime?,
      error: identical(error, _sentinel) ? this.error : error as String?,
    );
  }

  static const initial = AuthState(isLoading: false, isAuthenticated: false);
}
