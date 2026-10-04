import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/scan_history_item.dart';
import '../../core/models/stats_summary.dart';
import '../../core/network/scanner_api_service.dart';
import '../../core/network/network_providers.dart';

class HistoryState {
  const HistoryState({
    required this.loading,
    required this.items,
    this.stats,
    this.error,
  });

  final bool loading;
  final List<ScanHistoryItem> items;
  final StatsSummary? stats;
  final String? error;

  HistoryState copyWith({
    bool? loading,
    List<ScanHistoryItem>? items,
    StatsSummary? stats,
    String? error,
  }) {
    return HistoryState(
      loading: loading ?? this.loading,
      items: items ?? this.items,
      stats: stats ?? this.stats,
      error: error,
    );
  }

  static const initial = HistoryState(loading: false, items: []);
}

final historyControllerProvider = StateNotifierProvider<HistoryController, HistoryState>((ref) {
  return HistoryController(ref.watch(scannerApiServiceProvider));
});

class HistoryController extends StateNotifier<HistoryState> {
  HistoryController(this._service) : super(HistoryState.initial);

  final ScannerApiService _service;
  List<ScanHistoryItem> _allItems = const [];

  Future<void> load() async {
    state = state.copyWith(loading: true, error: null);
    try {
      final items = await _service.getRecentScans(limit: 50);
      _allItems = items;
      final stats = _buildStats(items);
      state = state.copyWith(items: items, stats: stats, error: null, loading: false);
    } catch (error) {
      state = state.copyWith(loading: false, error: _service.errorMessage(error));
    }
  }

  Future<void> search(String query) async {
    if (query.trim().isEmpty) {
      final stats = _buildStats(_allItems);
      state = state.copyWith(loading: false, items: _allItems, stats: stats, error: null);
      return;
    }

    state = state.copyWith(loading: true, error: null);

    final needle = query.trim().toLowerCase();
    final filtered = _allItems
        .where(
          (item) =>
              item.url.toLowerCase().contains(needle) ||
              item.status.toLowerCase().contains(needle) ||
              item.riskScore.toString().contains(needle),
        )
        .toList(growable: false);

    state = state.copyWith(
      loading: false,
      items: filtered,
      stats: _buildStats(filtered),
      error: null,
    );
  }

  StatsSummary _buildStats(List<ScanHistoryItem> items) {
    if (items.isEmpty) {
      return StatsSummary(totalScans: 0, todayScans: 0, averageRisk: 0, safe: 0, caution: 0, unsafe: 0);
    }

    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    var todayScans = 0;
    var totalRisk = 0;
    var safe = 0;
    var caution = 0;
    var unsafe = 0;

    for (final item in items) {
      totalRisk += item.riskScore;

      final scannedAt = item.scannedAt;
      if (scannedAt != null && !scannedAt.isBefore(todayStart)) {
        todayScans += 1;
      }

      switch (item.status.toLowerCase()) {
        case 'unsafe':
          unsafe += 1;
          break;
        case 'caution':
          caution += 1;
          break;
        default:
          safe += 1;
          break;
      }
    }

    return StatsSummary(
      totalScans: items.length,
      todayScans: todayScans,
      averageRisk: (totalRisk / items.length).round(),
      safe: safe,
      caution: caution,
      unsafe: unsafe,
    );
  }
}
