import '../scoring/website_scoring.dart';

class ScanResult {
  ScanResult({
    required this.inputUrl,
    required this.risk,
    required this.score,
    required this.recommendations,
    required this.breakdown,
    required this.websiteScore,
    required this.raw,
  });

  final String inputUrl;
  final String risk;
  final int? score;
  final List<String> recommendations;
  final List<String> breakdown;
  final WebsiteScoreResult websiteScore;
  final Map<String, dynamic> raw;

  factory ScanResult.fromJson(Map<String, dynamic> json) {
    final verdict = (json['verdict'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final scores = (json['scores'] as Map<String, dynamic>?) ?? <String, dynamic>{};
    final recRaw = json['recommendations'];
    final recommendations = <String>[];

    if (recRaw is List) {
      for (final item in recRaw) {
        if (item is String) {
          recommendations.add(item);
        } else if (item is Map && item['message'] != null) {
          recommendations.add(item['message'].toString());
        }
      }
    } else if (recRaw is Map) {
      final messages = recRaw['messages'];
      if (messages is List) {
        for (final item in messages) {
          if (item != null) {
            recommendations.add(item.toString());
          }
        }
      }
    }

    final breakdown = <String>[];
    final breakdownRaw = json['scoreBreakdown'] ?? verdict['breakdown'];
    if (breakdownRaw is List) {
      for (final item in breakdownRaw) {
        if (item is String) {
          breakdown.add(item);
        } else if (item is Map) {
          final category = item['category']?.toString();
          final status = item['status']?.toString();
          final points = item['points'];
          if (category != null && status != null && points is num) {
            breakdown.add('$category: ${points.round()} points ($status)');
          } else if (item['detail'] != null) {
            breakdown.add(item['detail'].toString());
          }
        }
      }
    }

    int? parsedScore;
    final safety = scores['safety'];
    if (safety is num) {
      parsedScore = safety.round();
    } else if (verdict['score'] is num) {
      parsedScore = (verdict['score'] as num).round();
    }

    return ScanResult(
      inputUrl: (json['inputUrl'] ?? '').toString(),
      risk: (verdict['risk'] ?? 'unknown').toString(),
      score: parsedScore,
      recommendations: recommendations,
      breakdown: breakdown,
      websiteScore: WebsiteScoring.calculateFromScanPayload(
        inputUrl: (json['inputUrl'] ?? '').toString(),
        raw: json,
      ),
      raw: json,
    );
  }
}
