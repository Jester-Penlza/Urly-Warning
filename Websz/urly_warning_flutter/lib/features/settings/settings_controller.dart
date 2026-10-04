import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/scanner_api_service.dart';
import '../../core/network/network_providers.dart';

class SettingsState {
  const SettingsState({
    required this.loading,
    required this.config,
    required this.blocklist,
    this.error,
  });

  final bool loading;
  final Map<String, dynamic> config;
  final List<Map<String, dynamic>> blocklist;
  final String? error;

  SettingsState copyWith({
    bool? loading,
    Map<String, dynamic>? config,
    List<Map<String, dynamic>>? blocklist,
    String? error,
  }) {
    return SettingsState(
      loading: loading ?? this.loading,
      config: config ?? this.config,
      blocklist: blocklist ?? this.blocklist,
      error: error,
    );
  }

  static const initial = SettingsState(
    loading: false,
    config: {},
    blocklist: [],
  );
}

final settingsControllerProvider = StateNotifierProvider<SettingsController, SettingsState>((ref) {
  return SettingsController(ref.watch(scannerApiServiceProvider));
});

class SettingsController extends StateNotifier<SettingsState> {
  SettingsController(this._service) : super(SettingsState.initial);

  final ScannerApiService _service;

  Future<void> load() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final results = await Future.wait([
        _service.getConfig(),
        _service.getBlocklist(),
      ]);

      state = state.copyWith(
        loading: false,
        config: results[0] as Map<String, dynamic>,
        blocklist: results[1] as List<Map<String, dynamic>>,
        error: null,
      );
    } catch (error) {
      state = state.copyWith(loading: false, error: _service.errorMessage(error));
    }
  }

  Future<void> setConfigBool(String key, bool value) async {
    await _service.updateConfig(key: key, value: value, type: 'boolean');
    await load();
  }

  Future<void> setConfigNumber(String key, int value) async {
    await _service.updateConfig(key: key, value: value, type: 'number');
    await load();
  }

  Future<void> addBlocklist({required String value, required String type}) async {
    await _service.addBlocklistEntry(type: type, value: value, reason: 'Added from Flutter app');
    await load();
  }

  Future<void> removeBlocklist(String value) async {
    await _service.deleteBlocklistEntry(value);
    await load();
  }
}
