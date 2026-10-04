class StatsSummary {
  StatsSummary({
    required this.totalScans,
    required this.todayScans,
    required this.averageRisk,
    required this.safe,
    required this.caution,
    required this.unsafe,
  });

  final int totalScans;
  final int todayScans;
  final int averageRisk;
  final int safe;
  final int caution;
  final int unsafe;

  factory StatsSummary.fromJson(Map<String, dynamic> json) {
    final stats = (json['stats'] as Map<String, dynamic>?) ?? json;
    final breakdown = (stats['statusBreakdown'] as Map<String, dynamic>?) ?? <String, dynamic>{};

    return StatsSummary(
      totalScans: (stats['totalScans'] is num) ? (stats['totalScans'] as num).toInt() : 0,
      todayScans: (stats['todayScans'] is num) ? (stats['todayScans'] as num).toInt() : 0,
      averageRisk: (stats['averageRisk'] is num) ? (stats['averageRisk'] as num).toInt() : 0,
      safe: (breakdown['safe'] is num) ? (breakdown['safe'] as num).toInt() : 0,
      caution: (breakdown['caution'] is num) ? (breakdown['caution'] as num).toInt() : 0,
      unsafe: (breakdown['unsafe'] is num) ? (breakdown['unsafe'] as num).toInt() : 0,
    );
  }
}
