
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/scan_result.dart';
import 'scan_controller.dart';

class _BreakdownItem {
  const _BreakdownItem({
    required this.title,
    required this.points,
    required this.detail,
    required this.status,
    this.onTap,
  });

  final String title;
  final int points;
  final String detail;
  final String status;
  final VoidCallback? onTap;
}

class _RecommendationsData {
  const _RecommendationsData({
    required this.messages,
    required this.actions,
    required this.context,
  });

  final List<String> messages;
  final List<String> actions;
  final List<String> context;
}

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final _urlController = TextEditingController();

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
  }

  Color _riskColor(String risk) {
    switch (risk.toLowerCase()) {
      case 'low':
      case 'safe':
        return Colors.green;
      case 'medium':
      case 'caution':
        return Colors.orange;
      case 'high':
      case 'unsafe':
        return Colors.red;
      default:
        return Colors.blueGrey;
    }
  }

  BoxDecoration _screenDecoration(BuildContext context, String? status) {
    final baseColor = Theme.of(context).scaffoldBackgroundColor;
    if (status == null) {
      return BoxDecoration(color: baseColor);
    }

    switch (status.toLowerCase()) {
      case 'safe':
        return const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0F172A),
              Color(0xFF14532D),
              Color(0xFF16A34A),
            ],
          ),
        );
      case 'unsafe':
        return const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0F172A),
              Color(0xFF7F1D1D),
              Color(0xFFDC2626),
            ],
          ),
        );
      case 'caution':
        return const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF0F172A),
              Color(0xFFB45309),
              Color(0xFFF59E0B),
            ],
          ),
        );
      default:
        return BoxDecoration(color: baseColor);
    }
  }

  Map<String, dynamic> _mapOrEmpty(dynamic value) {
    if (value is Map) {
      return value.cast<String, dynamic>();
    }
    return <String, dynamic>{};
  }

  List<dynamic> _listOrEmpty(dynamic value) {
    if (value is List) {
      return value;
    }
    return const [];
  }

  List<String> _stringList(dynamic value) {
    return _listOrEmpty(value).whereType<String>().toList(growable: false);
  }

  List<Map<String, dynamic>> _mapList(dynamic value) {
    return _listOrEmpty(value).whereType<Map>().map((e) => e.cast<String, dynamic>()).toList(growable: false);
  }

  int _asInt(dynamic value, [int fallback = 0]) {
    if (value is num) {
      return value.round();
    }
    return fallback;
  }

  String _asString(dynamic value, [String fallback = '']) {
    if (value == null) {
      return fallback;
    }
    return value.toString();
  }

  String _formatFlagName(String flag) {
    final normalized = flag.replaceAll('-', ' ').replaceAll('_', ' ');
    return normalized
        .split(' ')
        .where((part) => part.isNotEmpty)
        .map((part) => part[0].toUpperCase() + part.substring(1))
        .join(' ');
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'safe':
        return const Color(0xFF22C55E);
      case 'caution':
        return const Color(0xFFF59E0B);
      case 'unsafe':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFF64748B);
    }
  }

  String _formatScannedAt(BuildContext context, DateTime? value) {
    if (value == null) {
      return 'Unknown';
    }
    final local = value.toLocal();
    final date = MaterialLocalizations.of(context).formatFullDate(local);
    final time = MaterialLocalizations.of(context).formatTimeOfDay(TimeOfDay.fromDateTime(local));
    return '$date $time';
  }

  String _resolveCategory(dynamic rawCategory) {
    if (rawCategory is Map) {
      final category = rawCategory['category'];
      if (category != null) {
        return category.toString();
      }
    }
    if (rawCategory is String && rawCategory.isNotEmpty) {
      return rawCategory;
    }
    return 'Unknown';
  }

  String _heuristicStatus(int score) {
    if (score >= 36) {
      return 'unsafe';
    }
    if (score >= 12) {
      return 'caution';
    }
    return 'safe';
  }

  _RecommendationsData _parseRecommendations(ScanResult result) {
    final raw = _mapOrEmpty(result.raw['recommendations']);
    final messages = _stringList(raw['messages']);
    final actions = _stringList(raw['actions']);
    final context = _stringList(raw['context']);

    if (messages.isEmpty && actions.isEmpty && context.isEmpty) {
      return _RecommendationsData(
        messages: result.recommendations,
        actions: const [],
        context: const [],
      );
    }

    return _RecommendationsData(messages: messages, actions: actions, context: context);
  }

  List<_BreakdownItem> _buildBreakdownItems(BuildContext context, ScanResult result) {
    final raw = result.raw;
    final heuristics = _mapOrEmpty(raw['heuristics']);
    final gsb = _mapOrEmpty(raw['gsb']);
    final blocklist = _mapOrEmpty(raw['blocklist']);
    final dns = _mapOrEmpty(raw['dns']);
    final tls = _mapOrEmpty(raw['tls']);

    final heurScore = _asInt(heuristics['score']);
    final heurFlags = _listOrEmpty(heuristics['flags']).length;

    final gsbEnabled = gsb['enabled'] == true;
    final gsbVerdict = _asString(gsb['verdict'], 'unknown');
    final gsbPoints = gsbVerdict == 'safe' ? 100 : 0;
    final gsbStatus = gsbVerdict == 'unsafe'
        ? 'unsafe'
        : gsbVerdict == 'safe'
            ? 'safe'
            : 'caution';
    final gsbDetail = gsbEnabled ? 'Status: $gsbVerdict' : 'Status: disabled';

    final blockMatch = blocklist['match'] == true || blocklist['isBlocked'] == true;
    final blockPoints = blockMatch ? 0 : 100;
    final blockStatus = blockMatch ? 'unsafe' : 'safe';
    final blockDetail = blockMatch ? 'Match found' : 'No match';

    final dnsSkipped = dns['skipped'] == true;
    final dnsOk = dns['ok'] == true || dns['resolved'] == true;
    final dnsPoints = dnsOk ? 100 : 0;
    final dnsStatus = dnsSkipped ? 'caution' : (dnsOk ? 'safe' : 'unsafe');
    final dnsDetail = dnsSkipped ? 'Skipped' : (dnsOk ? 'Resolved' : 'Failed');

    final tlsOk = tls['ok'] == true || tls['valid'] == true;
    final tlsPoints = tlsOk ? 100 : 0;
    final tlsStatus = tlsOk ? 'safe' : 'unsafe';
    final tlsDetail = tlsOk ? 'Valid' : 'Invalid';

    return [
      _BreakdownItem(
        title: 'Heuristic Analysis',
        points: heurScore,
        detail: 'Flags: $heurFlags',
        status: _heuristicStatus(heurScore),
        onTap: () => _showHeuristicDetailsDialog(context, raw),
      ),
      _BreakdownItem(
        title: 'Google Safe Browsing',
        points: gsbPoints,
        detail: gsbDetail,
        status: gsbStatus,
      ),
      _BreakdownItem(
        title: 'Blocklist',
        points: blockPoints,
        detail: blockDetail,
        status: blockStatus,
      ),
      _BreakdownItem(
        title: 'DNS Lookup',
        points: dnsPoints,
        detail: dnsDetail,
        status: dnsStatus,
      ),
      _BreakdownItem(
        title: 'SSL/TLS',
        points: tlsPoints,
        detail: tlsDetail,
        status: tlsStatus,
      ),
    ];
  }

  Widget _buildBreakdownItemCard(_BreakdownItem item) {
    final accent = _statusColor(item.status);
    final content = Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(item.title, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 6),
          Text('${item.points} points', style: const TextStyle(color: Colors.white, fontSize: 16)),
          const SizedBox(height: 4),
          Text(item.detail, style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
        ],
      ),
    );

    if (item.onTap == null) {
      return content;
    }

    return InkWell(
      onTap: item.onTap,
      borderRadius: BorderRadius.circular(12),
      child: content,
    );
  }

  Widget _buildBreakdownPanel(BuildContext context, ScanResult result) {
    final items = _buildBreakdownItems(context, result);
    final accent = _statusColor(result.websiteScore.status);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            accent.withValues(alpha: 0.35),
            Colors.black.withValues(alpha: 0.5),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: accent.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Score Breakdown', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          ...items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _buildBreakdownItemCard(item),
              )),
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required String label,
    required String value,
    VoidCallback? onTap,
  }) {
    final valueWidget = onTap == null
        ? Text(value, style: const TextStyle(color: Colors.white))
        : InkWell(
            onTap: onTap,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Flexible(child: Text(value, style: const TextStyle(color: Colors.white))),
                const SizedBox(width: 6),
                const Icon(Icons.open_in_new, size: 14, color: Colors.white),
              ],
            ),
          );

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 4,
            child: Text(label, style: TextStyle(color: Colors.white.withValues(alpha: 0.7))),
          ),
          Expanded(flex: 6, child: Align(alignment: Alignment.centerRight, child: valueWidget)),
        ],
      ),
    );
  }

  Widget _buildResultPanel(BuildContext context, ScanResult result, DateTime? scannedAt) {
    final raw = result.raw;
    final http = _mapOrEmpty(raw['http']);
    final tls = _mapOrEmpty(raw['tls']);
    final gsb = _mapOrEmpty(raw['gsb']);
    final blocklist = _mapOrEmpty(raw['blocklist']);
    final externalLinks = _mapOrEmpty(raw['externalLinks']);

    final status = result.websiteScore.status;
    final statusColor = _statusColor(status);
    final protocolRaw = _asString(http['protocol']);
    final protocol = protocolRaw.isNotEmpty
        ? protocolRaw.replaceAll(':', '').toUpperCase()
        : (result.inputUrl.startsWith('https') ? 'HTTPS' : 'HTTP');

    final tlsOk = tls['ok'] == true || tls['valid'] == true;
    final tlsIssuer = _asString(tls['issuer'], 'Unknown');
    final tlsProtocol = _asString(tls['protocol'], 'Unknown');
    final tlsDays = _asInt(tls['daysToExpire'], -1);
    final tlsExpiry = tlsDays >= 0 ? '$tlsDays days' : 'Unknown';

    final category = _resolveCategory(raw['category']);
    final externalCount = _asInt(externalLinks['count']);

    final blockMatch = blocklist['match'] == true || blocklist['isBlocked'] == true;
    final gsbVerdict = _asString(gsb['verdict'], 'unknown');
    final reputationParts = <String>[];
    if (blockMatch) {
      reputationParts.add('Blocklist match');
    } else if (blocklist.isNotEmpty) {
      reputationParts.add('No blocklist match');
    }
    if (gsb['enabled'] == true) {
      reputationParts.add('GSB $gsbVerdict');
    }

    final reasonsSummary = result.websiteScore.reasons.isEmpty
        ? 'No notable issues'
        : result.websiteScore.reasons.take(3).join(' | ');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColor.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 8,
                height: 48,
                decoration: BoxDecoration(
                  color: statusColor,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Scan Result', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(result.inputUrl, style: const TextStyle(color: Colors.white70)),
                  ],
                ),
              ),
              if (gsbVerdict == 'safe')
                const Chip(
                  label: Text('GSB SAFE'),
                  backgroundColor: Color(0xFF16A34A),
                  labelStyle: TextStyle(color: Colors.white),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Center(
            child: Column(
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: statusColor,
                    boxShadow: [
                      BoxShadow(color: statusColor.withValues(alpha: 0.4), blurRadius: 18, spreadRadius: 2),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    '${result.websiteScore.safetyRating}%',
                    style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 10),
                Text(result.websiteScore.safetyLevel, style: const TextStyle(color: Colors.white, fontSize: 16)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _buildDetailRow(label: 'Protocol', value: protocol),
          _buildDetailRow(label: 'SSL Certificate', value: tlsOk ? 'Valid' : 'Invalid'),
          _buildDetailRow(label: 'Certificate Expiry', value: tlsExpiry),
          _buildDetailRow(label: 'Certificate Authority', value: tlsIssuer),
          _buildDetailRow(label: 'TLS Protocol', value: tlsProtocol),
          _buildDetailRow(label: 'Category', value: category),
          _buildDetailRow(
            label: 'External links',
            value: '$externalCount',
            onTap: () => _showExternalLinksDialog(context, raw),
          ),
          _buildDetailRow(
            label: 'Risk score',
            value: '${result.websiteScore.riskScore} (${status.toUpperCase()})',
            onTap: () => _showRiskScoreDialog(context, result),
          ),
          _buildDetailRow(label: 'Scanned at', value: _formatScannedAt(context, scannedAt)),
          if (reputationParts.isNotEmpty) _buildDetailRow(label: 'Reputation', value: reputationParts.join(', ')),
          _buildDetailRow(label: 'Notes', value: reasonsSummary),
        ],
      ),
    );
  }

  Widget _buildRecommendationsPanel(BuildContext context, ScanResult result) {
    final recommendations = _parseRecommendations(result);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            const Color(0xFF1E3A8A).withValues(alpha: 0.8),
            Colors.black.withValues(alpha: 0.55),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF2563EB).withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Recommendations', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (recommendations.messages.isEmpty)
            const Text('No recommendations returned.', style: TextStyle(color: Colors.white70))
          else
            ...recommendations.messages.map(
              (msg) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle, color: Colors.white, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(msg, style: const TextStyle(color: Colors.white))),
                  ],
                ),
              ),
            ),
          if (recommendations.actions.isNotEmpty) ...[
            const SizedBox(height: 10),
            const Text('Suggested Actions', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            ...recommendations.actions.map(
              (action) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.arrow_right, color: Colors.white, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(action, style: const TextStyle(color: Colors.white))),
                  ],
                ),
              ),
            ),
          ],
          if (recommendations.context.isNotEmpty) ...[
            const SizedBox(height: 10),
            const Text('Technical Context', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            ...recommendations.context.map(
              (ctx) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info, color: Colors.white, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(ctx, style: const TextStyle(color: Colors.white70))),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildScanResultPanels(BuildContext context, ScanResult result, DateTime? scannedAt) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 1000;
        final breakdown = _buildBreakdownPanel(context, result);
        final resultPanel = _buildResultPanel(context, result, scannedAt);
        final recommendations = _buildRecommendationsPanel(context, result);

        if (isWide) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: breakdown),
              const SizedBox(width: 16),
              Expanded(child: resultPanel),
              const SizedBox(width: 16),
              Expanded(child: recommendations),
            ],
          );
        }

        return Column(
          children: [
            breakdown,
            const SizedBox(height: 16),
            resultPanel,
            const SizedBox(height: 16),
            recommendations,
          ],
        );
      },
    );
  }

  Widget _buildRiskSection({
    required String title,
    required Color accent,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: accent.withValues(alpha: 0.6)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: accent, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  Widget _buildCheckRow({
    required IconData icon,
    required String title,
    required String status,
    required String detail,
  }) {
    final color = _statusColor(status);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(detail, style: TextStyle(color: Colors.white.withValues(alpha: 0.7))),
              ],
            ),
          ),
          Text(status.toUpperCase(), style: TextStyle(color: color, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  void _showHeuristicDetailsDialog(BuildContext context, Map<String, dynamic> raw) {
    final heuristics = _mapOrEmpty(raw['heuristics']);
    final score = _asInt(heuristics['score']);
    final breakdown = _mapList(raw['scoreBreakdown']).firstWhere(
      (item) => _asString(item['category']).toLowerCase() == 'heuristic analysis',
      orElse: () => <String, dynamic>{},
    );
    final flags = _mapList(breakdown['flags']);
    final fallbackFlags = _stringList(heuristics['flags']);

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Heuristic Analysis'),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Score: $score points'),
              const SizedBox(height: 12),
              if (flags.isEmpty && fallbackFlags.isEmpty)
                const Text('No heuristic flags detected.')
              else if (flags.isNotEmpty)
                SizedBox(
                  height: 240,
                  child: ListView.separated(
                    itemCount: flags.length,
                    separatorBuilder: (_, __) => const Divider(height: 12),
                    itemBuilder: (context, index) {
                      final flag = flags[index];
                      final name = _asString(flag['name']);
                      final points = _asInt(flag['points']);
                      final severity = _asString(flag['severity'], 'safe');
                      final severityColor = _statusColor(severity);
                      return Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(color: severityColor, shape: BoxShape.circle),
                          ),
                          const SizedBox(width: 8),
                          Expanded(child: Text(name)),
                          Text('$points', style: TextStyle(color: severityColor)),
                        ],
                      );
                    },
                  ),
                )
              else
                SizedBox(
                  height: 200,
                  child: ListView.separated(
                    itemCount: fallbackFlags.length,
                    separatorBuilder: (_, __) => const Divider(height: 12),
                    itemBuilder: (context, index) => Text(fallbackFlags[index]),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close')),
        ],
      ),
    );
  }

  void _showExternalLinksDialog(BuildContext context, Map<String, dynamic> raw) {
    final externalLinks = _mapOrEmpty(raw['externalLinks']);
    final links = _stringList(externalLinks['links']);
    final error = _asString(externalLinks['error']);

    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('External Links'),
        content: SizedBox(
          width: 420,
          child: links.isEmpty
              ? Text(error.isNotEmpty ? error : 'No external links found.')
              : ListView.separated(
                  shrinkWrap: true,
                  itemCount: links.length,
                  separatorBuilder: (_, __) => const Divider(height: 12),
                  itemBuilder: (context, index) {
                    final link = links[index];
                    return InkWell(
                      onTap: () async {
                        await Clipboard.setData(ClipboardData(text: link));
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Link copied to clipboard.')),
                          );
                        }
                      },
                      child: Row(
                        children: [
                          const Icon(Icons.link, size: 16),
                          const SizedBox(width: 8),
                          Expanded(child: Text(link)),
                          const Icon(Icons.copy, size: 16),
                        ],
                      ),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Close')),
        ],
      ),
    );
  }

  void _showRiskScoreDialog(BuildContext context, ScanResult result) {
    final raw = result.raw;
    final status = result.websiteScore.status;
    final statusColor = _statusColor(status);
    final safetyRating = result.websiteScore.safetyRating;
    final riskLevel = (100 - safetyRating).clamp(0, 100);

    final heuristics = _mapOrEmpty(raw['heuristics']);
    final heuristicScore = _asInt(heuristics['score']);
    final heuristicFlags = _stringList(heuristics['flags']);

    final externalLinks = _mapOrEmpty(raw['externalLinks']);
    final externalCountRaw = externalLinks['count'];
    final externalCount = externalCountRaw is num ? externalCountRaw.round() : null;

    final misspellingsRaw = raw['misspellings'];
    final misspellings = misspellingsRaw is List
        ? misspellingsRaw.length
        : (misspellingsRaw is num ? misspellingsRaw.round() : 0);

    final blocklist = _mapOrEmpty(raw['blocklist']);
    final gsb = _mapOrEmpty(raw['gsb']);
    final dns = _mapOrEmpty(raw['dns']);
    final tls = _mapOrEmpty(raw['tls']);

    final blocklistMatch = blocklist['match'] == true || blocklist['isBlocked'] == true;
    final gsbUnsafe = gsb['verdict']?.toString() == 'unsafe';
    final categoryTrusted = result.websiteScore.reasons
        .any((reason) => reason.toLowerCase().contains('trusted category'));

    final step3Penalties = <Map<String, dynamic>>[];
    double step3StartingSafety = (100 - heuristicScore).toDouble();
    double step3CurrentSafety = step3StartingSafety;

    if (externalCount != null) {
      if (externalCount > 50) {
        step3Penalties.add({
          'name': 'High External Links',
          'detail': '$externalCount external links detected (greater than 50)',
          'penalty': 20.0,
          'formula': '${step3CurrentSafety.toStringAsFixed(1)} - 20 = ${(step3CurrentSafety - 20).toStringAsFixed(1)}',
        });
        step3CurrentSafety -= 20;
      } else if (externalCount > 20) {
        step3Penalties.add({
          'name': 'Many External Links',
          'detail': '$externalCount external links detected (greater than 20)',
          'penalty': 12.0,
          'formula': '${step3CurrentSafety.toStringAsFixed(1)} - 12 = ${(step3CurrentSafety - 12).toStringAsFixed(1)}',
        });
        step3CurrentSafety -= 12;
      } else if (externalCount > 10) {
        step3Penalties.add({
          'name': 'Some External Links',
          'detail': '$externalCount external links detected (greater than 10)',
          'penalty': 6.0,
          'formula': '${step3CurrentSafety.toStringAsFixed(1)} - 6 = ${(step3CurrentSafety - 6).toStringAsFixed(1)}',
        });
        step3CurrentSafety -= 6;
      }
    }

    if (misspellings > 0) {
      step3Penalties.add({
        'name': 'Misspellings Detected',
        'detail': '$misspellings common misspellings found',
        'penalty': 10.0,
        'formula': '${step3CurrentSafety.toStringAsFixed(1)} - 10 = ${(step3CurrentSafety - 10).toStringAsFixed(1)}',
      });
      step3CurrentSafety -= 10;
    }

    if (blocklistMatch) {
      final beforeCap = step3CurrentSafety;
      step3CurrentSafety = step3CurrentSafety < 25 ? step3CurrentSafety : 25;
      if (beforeCap > 25) {
        step3Penalties.add({
          'name': 'Blocklist Match',
          'detail': 'URL found in blocklist',
          'penalty': beforeCap - 25,
          'formula': 'min(${beforeCap.toStringAsFixed(1)}, 25) = 25',
          'isCap': true,
        });
      }
    }

    if (gsbUnsafe) {
      final beforeCap = step3CurrentSafety;
      step3CurrentSafety = step3CurrentSafety < 20 ? step3CurrentSafety : 20;
      if (beforeCap > 20) {
        step3Penalties.add({
          'name': 'Google Safe Browsing Threat',
          'detail': 'Flagged as unsafe by Google',
          'penalty': beforeCap - 20,
          'formula': 'min(${beforeCap.toStringAsFixed(1)}, 20) = 20',
          'isCap': true,
        });
      }
    }

    if (categoryTrusted && step3CurrentSafety < 100) {
      final beforeReduction = step3CurrentSafety;
      final riskPortion = 100 - step3CurrentSafety;
      final reducedRisk = (riskPortion * 0.6).roundToDouble();
      step3CurrentSafety = 100 - reducedRisk;
      step3Penalties.add({
        'name': 'Trusted Category Bonus',
        'detail': 'Trusted category reduces risk by 40 percent',
        'penalty': -(step3CurrentSafety - beforeReduction),
        'formula': 'Risk ${riskPortion.toStringAsFixed(1)} x 0.6 = ${reducedRisk.toStringAsFixed(1)}; Safety = ${step3CurrentSafety.toStringAsFixed(1)}',
        'isBonus': true,
      });
    }

    final unexplainedDiff = step3CurrentSafety - safetyRating;
    if (unexplainedDiff.abs() > 0.5) {
      step3Penalties.add({
        'name': 'Additional Adjustments',
        'detail': 'Other risk factors or rounding adjustments',
        'penalty': unexplainedDiff,
        'formula': '${step3CurrentSafety.toStringAsFixed(1)} -> $safetyRating',
      });
    }

    const flagPoints = {
      'http_not_encrypted': 100,
      'ip_literal_host': 30,
      'ip_address': 30,
      'punycode_host': 15,
      'punycode': 15,
      'suspicious_tld': 10,
      'many_subdomains': 10,
      'many_hyphens': 8,
      'long_hostname': 8,
      'long_path': 6,
      'long_query': 6,
      'high_host_entropy': 10,
      'high_path_entropy': 6,
      'at_in_path': 8,
      'many_encoded_chars': 6,
      'link_shortener': 6,
      'phishy_keywords': 10,
      'phishing_keywords': 10,
      'tld_help_with_reward_pattern': 12,
      'suspicious_patterns': 12,
      'typosquat_leetspeak': 14,
      'typosquat': 14,
    };

    final calculatedTotal = heuristicFlags.fold<int>(
      0,
      (total, flag) => total + (flagPoints[flag] ?? 0),
    );

    final riskNotes = _asString(_mapOrEmpty(raw['verdict'])['notes']);

    showDialog<void>(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: const Color(0xFF0F172A),
          insetPadding: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 720, maxHeight: 720),
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Risk Score Breakdown',
                          style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close, color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF111827),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    child: Column(
                      children: [
                        _buildDetailRow(label: 'Safety score', value: '$safetyRating%'),
                        _buildDetailRow(label: 'Risk level', value: '${result.websiteScore.riskScore} ($riskLevel)'),
                        _buildDetailRow(label: 'Status', value: status.toUpperCase()),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildRiskSection(
                    title: 'Step 1: URL Pattern Analysis',
                    accent: const Color(0xFFF59E0B),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Scanning the URL for suspicious patterns...', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                        const SizedBox(height: 12),
                        if (heuristicFlags.isEmpty)
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFF052E16),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF16A34A)),
                            ),
                            child: const Text('No suspicious patterns detected (0 points).', style: TextStyle(color: Colors.white)),
                          )
                        else
                          Column(
                            children: heuristicFlags.map((flag) {
                              final points = flagPoints[flag] ?? 0;
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF111827),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: const Color(0xFFF59E0B)),
                                ),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _formatFlagName(flag),
                                        style: const TextStyle(color: Colors.white),
                                      ),
                                    ),
                                    Text('+$points', style: const TextStyle(color: Color(0xFFF59E0B), fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              );
                            }).toList(growable: false),
                          ),
                        const SizedBox(height: 8),
                        Text('Total heuristic points: $heuristicScore', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                        if (heuristicFlags.isNotEmpty)
                          Text('Calculated total: $calculatedTotal', style: TextStyle(color: Colors.white.withValues(alpha: 0.6))),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildRiskSection(
                    title: 'Step 2: Base Safety Score',
                    accent: const Color(0xFF3B82F6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Safety Score = 100 - Heuristic Points', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                        const SizedBox(height: 8),
                        Text('Safety Score = 100 - $heuristicScore = ${100 - heuristicScore}%', style: const TextStyle(color: Colors.white)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildRiskSection(
                    title: 'Step 3: Penalties and Adjustments',
                    accent: const Color(0xFF8B5CF6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Starting safety: ${step3StartingSafety.toStringAsFixed(1)}%', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                        const SizedBox(height: 10),
                        if (step3Penalties.isEmpty)
                          const Text('No penalties applied.', style: TextStyle(color: Colors.white))
                        else
                          Column(
                            children: step3Penalties.map((penalty) {
                              final penaltyValue = (penalty['penalty'] as num).toDouble();
                              final isBonus = penalty['isBonus'] == true || penaltyValue < 0;
                              final isCap = penalty['isCap'] == true;
                              final color = isCap
                                  ? const Color(0xFFEF4444)
                                  : (isBonus ? const Color(0xFF22C55E) : const Color(0xFFF59E0B));
                              final sign = isBonus ? '+' : '-';
                              final absValue = penaltyValue.abs().toStringAsFixed(1);
                              return Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF111827),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: color),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            penalty['name'].toString(),
                                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                        Text('$sign$absValue%', style: TextStyle(color: color, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(penalty['detail'].toString(), style: TextStyle(color: Colors.white.withValues(alpha: 0.7))),
                                    const SizedBox(height: 4),
                                    Text(penalty['formula'].toString(), style: TextStyle(color: Colors.white.withValues(alpha: 0.6))),
                                  ],
                                ),
                              );
                            }).toList(growable: false),
                          ),
                        const SizedBox(height: 8),
                        Text('Final safety: $safetyRating%', style: TextStyle(color: Colors.white.withValues(alpha: 0.9))),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildRiskSection(
                    title: 'Step 4: Final Risk Level',
                    accent: statusColor,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Risk Level = 100 - Final Safety Score', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                        const SizedBox(height: 8),
                        Text('Risk Level = 100 - $safetyRating = $riskLevel', style: TextStyle(color: statusColor, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildRiskSection(
                    title: 'Calculation Summary',
                    accent: statusColor,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Step 1: Heuristic points = $heuristicScore', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                        Text('Step 2: Base safety = ${100 - heuristicScore}%', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                        Text('Step 3: Final safety = $safetyRating%', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
                        Text('Step 4: Risk level = $riskLevel', style: TextStyle(color: statusColor, fontWeight: FontWeight.bold)),
                        if (riskNotes.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text('Notes: $riskNotes', style: TextStyle(color: Colors.white.withValues(alpha: 0.7))),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildRiskSection(
                    title: 'Security Checks',
                    accent: const Color(0xFF2563EB),
                    child: Column(
                      children: [
                        _buildCheckRow(
                          icon: Icons.psychology,
                          title: 'Heuristic Analysis',
                          status: heuristicScore == 0
                              ? 'safe'
                              : heuristicScore >= 35
                                  ? 'unsafe'
                                  : heuristicScore >= 18
                                      ? 'caution'
                                      : 'safe',
                          detail: '$heuristicScore/100 risk points, ${heuristicFlags.length} flags',
                        ),
                        _buildCheckRow(
                          icon: Icons.security,
                          title: 'Google Safe Browsing',
                          status: gsb['enabled'] == true
                              ? (gsb['verdict']?.toString() == 'safe' ? 'safe' : 'unsafe')
                              : 'caution',
                          detail: gsb['enabled'] == true
                              ? 'Status: ${_asString(gsb['verdict'], 'unknown')}'
                              : 'Check disabled',
                        ),
                        _buildCheckRow(
                          icon: Icons.list_alt,
                          title: 'Blocklist Check',
                          status: blocklistMatch ? 'unsafe' : 'safe',
                          detail: blocklistMatch ? 'Match found' : 'No match',
                        ),
                        _buildCheckRow(
                          icon: Icons.public,
                          title: 'DNS Lookup',
                          status: dns['ok'] == true ? 'safe' : (dns['skipped'] == true ? 'caution' : 'unsafe'),
                          detail: dns['ok'] == true ? 'Resolved' : (dns['skipped'] == true ? 'Skipped' : 'Failed'),
                        ),
                        _buildCheckRow(
                          icon: Icons.lock,
                          title: 'SSL/TLS',
                          status: tls['ok'] == true || tls['valid'] == true ? 'safe' : 'unsafe',
                          detail: tls['ok'] == true || tls['valid'] == true ? 'Valid' : 'Invalid',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(scanControllerProvider);
    final notifier = ref.read(scanControllerProvider.notifier);
    final status = state.result?.websiteScore.status;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 350),
      decoration: _screenDecoration(context, status),
      child: RefreshIndicator(
        onRefresh: () async {},
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Card(
              child: ListTile(
                leading: Icon(Icons.cloud_done, color: Colors.green),
                title: Text('Scanner API Status'),
                subtitle: Text('Online and ready'),
                trailing: IconButton(
                  tooltip: 'Status is always available',
                  onPressed: null,
                  icon: Icon(Icons.refresh),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _urlController,
              decoration: InputDecoration(
                labelText: 'URL to scan',
                hintText: 'https://example.com',
                suffixIcon: IconButton(
                  onPressed: state.isLoading ? null : () => notifier.scan(_urlController.text.trim()),
                  icon: const Icon(Icons.search),
                ),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: state.isLoading ? null : () => notifier.scan(_urlController.text.trim()),
              icon: state.isLoading
                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.security),
              label: const Text('Scan URL'),
            ),
            const SizedBox(height: 16),
            Card(
              child: ExpansionTile(
                title: const Text('Scan Settings'),
                childrenPadding: const EdgeInsets.all(12),
                children: [
                  SwitchListTile(
                    title: const Text('Enable DNS'),
                    value: state.settings.enableDns,
                    onChanged: (value) => notifier.updateSettings(state.settings.copyWith(enableDns: value)),
                  ),
                  SwitchListTile(
                    title: const Text('Enable SSL/TLS'),
                    value: state.settings.enableSsl,
                    onChanged: (value) => notifier.updateSettings(state.settings.copyWith(enableSsl: value)),
                  ),
                  SwitchListTile(
                    title: const Text('Enable Google Safe Browsing'),
                    value: state.settings.enableGsb,
                    onChanged: (value) => notifier.updateSettings(state.settings.copyWith(enableGsb: value)),
                  ),
                  SwitchListTile(
                    title: const Text('Enable Heuristics'),
                    value: state.settings.enableHeuristics,
                    onChanged: (value) => notifier.updateSettings(state.settings.copyWith(enableHeuristics: value)),
                  ),
                ],
              ),
            ),
            if (state.error != null)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(state.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            if (state.result != null) ...[
              const SizedBox(height: 16),
              _buildScanResultPanels(context, state.result!, state.scannedAt),
            ],
          ],
        ),
      ),
    );
  }
}
