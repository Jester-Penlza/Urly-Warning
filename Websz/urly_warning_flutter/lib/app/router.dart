import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/auth_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/home/home_shell_screen.dart';
import '../features/settings/blocklist_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);

  return GoRouter(
    initialLocation: '/login',
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/app', builder: (context, state) => const HomeShellScreen()),
      GoRoute(path: '/blocklist', builder: (context, state) => const BlocklistScreen()),
    ],
    redirect: (context, state) {
      final loggingIn = state.matchedLocation == '/login' || state.matchedLocation == '/register';
      final authenticated = authState.isAuthenticated;

      if (!authenticated && !loggingIn) {
        return '/login';
      }

      if (authenticated && loggingIn) {
        return '/app';
      }

      return null;
    },
  );
});
