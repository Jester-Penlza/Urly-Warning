import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/scan_result.dart';
import '../../core/network/scanner_api_service.dart';
import '../../core/network/network_providers.dart';

class ScanSettings {
  const ScanSettings({
    this.enableDns = true,
    this.enableSsl = true,
    this.enableGsb = true,
    this.enableHeuristics = true,
    this.maxRedirects = 5,
  });

  final bool enableDns;
  final bool enableSsl;
  final bool enableGsb;
  final bool enableHeuristics;
  final int maxRedirects;

  ScanSettings copyWith({
    bool? enableDns,
    bool? enableSsl,
    bool? enableGsb,
    bool? enableHeuristics,
    int? maxRedirects,
  }) {
    return ScanSettings(
      enableDns: enableDns ?? this.enableDns,
      enableSsl: enableSsl ?? this.enableSsl,
      enableGsb: enableGsb ?? this.enableGsb,
      enableHeuristics: enableHeuristics ?? this.enableHeuristics,
      maxRedirects: maxRedirects ?? this.maxRedirects,
    );
  }
}

class ScanState {
  const ScanState({
    required this.isLoading,
    this.result,
    this.error,
    this.settings = const ScanSettings(),
    this.scannedAt,
  });

  final bool isLoading;
  final ScanResult? result;
  final String? error;
  final ScanSettings settings;
  final DateTime? scannedAt;

  ScanState copyWith({
    bool? isLoading,
    ScanResult? result,
    String? error,
    ScanSettings? settings,
    DateTime? scannedAt,
  }) {
    return ScanState(
      isLoading: isLoading ?? this.isLoading,
      result: result ?? this.result,
      error: error,
      settings: settings ?? this.settings,
      scannedAt: scannedAt ?? this.scannedAt,
    );
  }

  static const initial = ScanState(isLoading: false);
}

final scanControllerProvider = StateNotifierProvider<ScanController, ScanState>((ref) {
  return ScanController(ref.watch(scannerApiServiceProvider));
});

class ScanController extends StateNotifier<ScanState> {
  ScanController(this._service) : super(ScanState.initial);

  final ScannerApiService _service;

  void updateSettings(ScanSettings settings) {
    state = state.copyWith(settings: settings, error: null);
  }

  Future<void> scan(String url) async {
    state = state.copyWith(isLoading: true, error: null, scannedAt: null);
    try {
      final s = state.settings;
      final result = await _service.scanUrl(
        url,
        enableDns: s.enableDns,
        enableSsl: s.enableSsl,
        enableGsb: s.enableGsb,
        enableHeuristics: s.enableHeuristics,
        maxRedirects: s.maxRedirects,
      );

      // Keep primary scan UX successful even when history write has a transient failure.
      try {
        final isCached = result.raw['cached'] == true || result.raw['cacheHit'] == true;
        await _service.saveScanToHistory(
          url: url,
          result: result.raw,
          cached: isCached,
        );
      } catch (_) {}

      state = state.copyWith(isLoading: false, result: result, error: null, scannedAt: DateTime.now());
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: _service.errorMessage(error),
      );
    }
  }
}
