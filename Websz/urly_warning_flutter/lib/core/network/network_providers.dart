import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/auth_controller.dart';
import 'api_client.dart';
import 'scanner_api_service.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  final token = ref.watch(authControllerProvider.select((state) => state.token));
  return ApiClient(authToken: token);
});

final scannerApiServiceProvider = Provider<ScannerApiService>(
  (ref) => ScannerApiService(ref.watch(apiClientProvider)),
);
