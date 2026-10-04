import 'package:dio/dio.dart';

import '../constants/app_constants.dart';
import '../models/scan_history_item.dart';
import '../models/scan_result.dart';
import '../models/stats_summary.dart';
import 'api_client.dart';

class ScannerApiService {
  ScannerApiService(this._client);

  final ApiClient _client;

  bool _isConnectionProblem(Object error) {
    return error is DioException &&
        (error.type == DioExceptionType.connectionError ||
            error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout ||
            error.type == DioExceptionType.sendTimeout);
  }

  Future<bool> checkHealth() async {
    try {
      final response = await _client.dio.get('/health');
      final data = response.data;
      return data is Map<String, dynamic> && data['ok'] == true;
    } catch (_) {
      return false;
    }
  }

  Future<ScanResult> scanUrl(
    String url, {
    required bool enableDns,
    required bool enableSsl,
    required bool enableGsb,
    required bool enableHeuristics,
    required int maxRedirects,
  }) async {
    final response = await _client.dio.post(
      '/api/scan',
      options: Options(
        sendTimeout: const Duration(milliseconds: AppConstants.scanRequestTimeoutMs),
        receiveTimeout: const Duration(milliseconds: AppConstants.scanRequestTimeoutMs),
      ),
      data: {
        'url': url,
        'options': {
          'timeout': AppConstants.scanRequestTimeoutMs,
          'enableDNS': enableDns,
          'enableSSL': enableSsl,
          'enableGSB': enableGsb,
          'enableHeuristics': enableHeuristics,
          'maxRedirects': maxRedirects,
        },
      },
    );

    return ScanResult.fromJson((response.data as Map).cast<String, dynamic>());
  }

  Future<List<ScanHistoryItem>> getRecentScans({int limit = 25}) async {
    try {
      final response = await _client.dio.get('/api/history');
      final data = (response.data as Map).cast<String, dynamic>();
      final scans = (data['scans'] as List?) ?? const [];
      final items = scans
          .whereType<Map>()
          .map((e) => ScanHistoryItem.fromJson(e.cast<String, dynamic>()))
          .toList(growable: false);
      if (items.length <= limit) {
        return items;
      }
      return items.take(limit).toList(growable: false);
    } on DioException catch (error) {
      if (_isConnectionProblem(error)) {
        return const [];
      }
      rethrow;
    }
  }

  Future<List<ScanHistoryItem>> searchScans(String query) async {
    final needle = query.toLowerCase();
    final all = await getRecentScans(limit: 500);
    return all
        .where((item) =>
            item.url.toLowerCase().contains(needle) ||
            item.status.toLowerCase().contains(needle) ||
            item.riskScore.toString().contains(needle))
        .toList(growable: false);
  }

  Future<StatsSummary> getStatsSummary() async {
    final items = await getRecentScans(limit: 500);
    if (items.isEmpty) {
      return StatsSummary(totalScans: 0, todayScans: 0, averageRisk: 0, safe: 0, caution: 0, unsafe: 0);
    }

    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    var totalRisk = 0;
    var todayScans = 0;
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

  Future<void> saveScanToHistory({
    required String url,
    required Map<String, dynamic> result,
    bool cached = false,
  }) async {
    await _client.dio.post(
      '/api/history/add',
      data: {
        'url': url,
        'result': result,
        'cached': cached,
      },
    );
  }

  Future<Map<String, dynamic>> getConfig() async {
    final response = await _client.dio.get('/api/config');
    final data = (response.data as Map).cast<String, dynamic>();
    return (data['config'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
  }

  Future<void> updateConfig({required String key, required dynamic value, required String type}) async {
    await _client.dio.post(
      '/api/config',
      data: {'key': key, 'value': value, 'type': type},
    );
  }

  Future<List<Map<String, dynamic>>> getBlocklist() async {
    final response = await _client.dio.get('/api/blocklist');
    final data = (response.data as Map).cast<String, dynamic>();
    final entries = (data['entries'] as List?) ?? const [];
    return entries.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList(growable: false);
  }

  Future<void> addBlocklistEntry({
    required String type,
    required String value,
    required String reason,
  }) async {
    await _client.dio.post(
      '/api/blocklist',
      data: {'type': type, 'value': value, 'reason': reason},
    );
  }

  Future<void> deleteBlocklistEntry(String value) async {
    await _client.dio.delete('/api/blocklist/${Uri.encodeComponent(value)}');
  }

  String errorMessage(Object error) {
    if (error is DioException) {
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.sendTimeout) {
        return 'Scan timed out. Try again, or disable some scan settings for slower websites.';
      }

      final data = error.response?.data;
      if (data is Map && data['error'] != null) {
        return data['error'].toString();
      }
      return error.message ?? 'Request failed';
    }
    return error.toString();
  }
}
