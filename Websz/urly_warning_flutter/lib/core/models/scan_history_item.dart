import '../scoring/website_scoring.dart';

class ScanHistoryItem {
  ScanHistoryItem({
    required this.id,
    required this.url,
    required this.status,
    required this.riskScore,
    required this.safetyScore,
    required this.scannedAt,
    required this.raw,
  });

  final String id;
  final String url;
  final String status;
  final int riskScore;
  final int safetyScore;
  final DateTime? scannedAt;
  final Map<String, dynamic> raw;

  factory ScanHistoryItem.fromJson(Map<String, dynamic> json) {
    final url = (json['url'] ?? '').toString();
    final rawFromResult = json['result'] is Map ? (json['result'] as Map).cast<String, dynamic>() : <String, dynamic>{};
    final rawFromLegacy = json['raw'] is Map ? (json['raw'] as Map).cast<String, dynamic>() : <String, dynamic>{};
    final raw = rawFromResult.isNotEmpty ? rawFromResult : rawFromLegacy;

    String status = (json['status'] ?? 'unknown').toString();
    int riskScore = (json['risk_score'] is num) ? (json['risk_score'] as num).toInt() : 0;
    int safetyScore = (json['safety_score'] is num) ? (json['safety_score'] as num).toInt() : 0;

    if (raw.isNotEmpty) {
      final payload = <String, dynamic>{...raw};
      payload.putIfAbsent('inputUrl', () => url);
      final websiteScore = WebsiteScoring.calculateFromScanPayload(inputUrl: url, raw: payload);
      status = websiteScore.status;
      riskScore = websiteScore.riskScore;
      safetyScore = websiteScore.safetyRating;
    }

    return ScanHistoryItem(
      id: (json['id'] ?? '').toString(),
      url: url,
      status: status,
      riskScore: riskScore,
      safetyScore: safetyScore,
      scannedAt: DateTime.tryParse((json['created_at'] ?? json['scanned_at'] ?? '').toString()),
      raw: raw,
    );
  }
}
