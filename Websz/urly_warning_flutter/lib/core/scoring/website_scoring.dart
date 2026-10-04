class WebsiteScoreResult {
  WebsiteScoreResult({
    required this.riskScore,
    required this.safetyRating,
    required this.status,
    required this.safetyLevel,
    required this.category,
    required this.reasons,
  });

  final int riskScore;
  final int safetyRating;
  final String status;
  final String safetyLevel;
  final String category;
  final List<String> reasons;
}

class _CategoryInfo {
  const _CategoryInfo({required this.category, required this.trusted});

  final String category;
  final bool trusted;
}

class _HeuristicResult {
  const _HeuristicResult({
    required this.flags,
    required this.notes,
    required this.tld,
    required this.phishingScore,
  });

  final List<String> flags;
  final List<String> notes;
  final String tld;
  final int phishingScore;
}

class _PhishingResult {
  const _PhishingResult({
    required this.flags,
    required this.notes,
    required this.score,
  });

  final List<String> flags;
  final List<String> notes;
  final int score;
}

class _RiskResult {
  const _RiskResult({required this.risk, required this.status, required this.reasons});

  final int risk;
  final String status;
  final List<String> reasons;
}

class WebsiteScoring {
  static final Set<String> _socialMediaDomains = {
    'youtube.com',
    'youtu.be',
    'facebook.com',
    'fb.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'tiktok.com',
    'reddit.com',
  };

  static final Set<String> _newsDomains = {
    'nytimes.com',
    'cnn.com',
    'bbc.co.uk',
    'theguardian.com',
    'reuters.com',
    'apnews.com',
    'bloomberg.com',
    'wsj.com',
  };

  static final Set<String> _researchDomains = {
    'arxiv.org',
    'nature.com',
    'sciencedirect.com',
    'springer.com',
    'acm.org',
    'ieee.org',
    'nih.gov',
    'ncbi.nlm.nih.gov',
    'who.int',
  };

  static final Set<String> _companyDomains = {
    'microsoft.com',
    'google.com',
    'apple.com',
    'amazon.com',
    'meta.com',
    'openai.com',
    'adobe.com',
  };

  static final Set<String> _phishingKeywords = {
    'verify',
    'confirm',
    'suspend',
    'urgent',
    'immediate',
    'expired',
    'locked',
    'security',
    'alert',
    'warning',
    'action',
    'required',
    'update',
    'billing',
    'payment',
    'account',
    'login',
    'signin',
    'secure',
    'validation',
    'authenticate',
    'unauthorized',
    'unusual',
    'activity',
    'click',
    'here',
    'now',
    'limited',
    'time',
  };

  static final List<RegExp> _phishingPatterns = [
    RegExp(r'\b(secure|safety|security|verify|confirm|update|login|signin)[-_]?[a-z0-9]*\.(tk|ml|cf|ga|gq|xyz|top|click)', caseSensitive: false),
    RegExp(r'\b[a-z0-9]+-?(login|signin|verify|secure|update|account)\.', caseSensitive: false),
    RegExp(r'\b(paypal|amazon|apple|google|microsoft|facebook|instagram|twitter|linkedin|netflix|ebay)[-_][a-z0-9]+\.', caseSensitive: false),
    RegExp(r'\b[a-z0-9]+(paypal|amazon|apple|google|microsoft|facebook|instagram|twitter|linkedin|netflix|ebay)\.', caseSensitive: false),
    RegExp(r'[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}'),
    RegExp(r'[a-z0-9]{20,}\.(com|net|org)', caseSensitive: false),
    RegExp(r'[a-z]+-?[0-9]+-?[a-z]+\.(com|net|org)', caseSensitive: false),
  ];

  static final List<Map<String, dynamic>> _brandImpersonationPatterns = [
    {'brand': 'paypal', 'patterns': [RegExp(r'p[a4y]yp[a4l]l?', caseSensitive: false), RegExp(r'payp[a4]l', caseSensitive: false), RegExp(r'p[a4]yp[a4]l', caseSensitive: false)]},
    {'brand': 'amazon', 'patterns': [RegExp(r'[a4]m[a4]z[o0]n', caseSensitive: false), RegExp(r'amaz[o0]n', caseSensitive: false), RegExp(r'amazon[a-z0-9]', caseSensitive: false)]},
    {'brand': 'apple', 'patterns': [RegExp(r'[a4]ppl[e3]', caseSensitive: false), RegExp(r'appl[e3]', caseSensitive: false), RegExp(r'apple[a-z0-9]', caseSensitive: false)]},
    {'brand': 'google', 'patterns': [RegExp(r'g[o0]{1,2}gl[e3]', caseSensitive: false), RegExp(r'googl[e3]', caseSensitive: false), RegExp(r'google[a-z0-9]', caseSensitive: false)]},
    {'brand': 'microsoft', 'patterns': [RegExp(r'micr[o0]s[o0]ft', caseSensitive: false), RegExp(r'micro[s5]oft', caseSensitive: false), RegExp(r'microsoft[a-z0-9]', caseSensitive: false)]},
    {'brand': 'facebook', 'patterns': [RegExp(r'f[a4]ceb[o0]{1,2}k', caseSensitive: false), RegExp(r'facebook[a-z0-9]', caseSensitive: false)]},
    {'brand': 'netflix', 'patterns': [RegExp(r'n[e3]tfl[i1]x', caseSensitive: false), RegExp(r'netflix[a-z0-9]', caseSensitive: false)]},
    {'brand': 'ebay', 'patterns': [RegExp(r'[e3]b[a4]y', caseSensitive: false), RegExp(r'ebay[a-z0-9]', caseSensitive: false)]},
    {'brand': 'instagram', 'patterns': [RegExp(r'[i1]nst[a4]gr[a4]m', caseSensitive: false), RegExp(r'instagram[a-z0-9]', caseSensitive: false)]},
    {'brand': 'twitter', 'patterns': [RegExp(r'tw[i1]tt[e3]r', caseSensitive: false), RegExp(r'twitter[a-z0-9]', caseSensitive: false)]},
    {'brand': 'linkedin', 'patterns': [RegExp(r'l[i1]nk[e3]d[i1]n', caseSensitive: false), RegExp(r'linkedin[a-z0-9]', caseSensitive: false)]},
  ];

  static final List<RegExp> _obfuscationPatterns = [
    RegExp(r'%[0-9a-f]{2}', caseSensitive: false),
    RegExp(r'\\u[0-9a-f]{4}', caseSensitive: false),
    RegExp(r'\\x[0-9a-f]{2}', caseSensitive: false),
    RegExp(r'[^\x20-\x7E]'),
    RegExp(r'[а-я]', caseSensitive: false),
    RegExp(r'[α-ω]', caseSensitive: false),
    RegExp(r'[\u4e00-\u9fff]'),
    RegExp(r'[\u3040-\u309f\u30a0-\u30ff]'),
  ];

  static final Set<String> _suspiciousExtensions = {
    'exe',
    'bat',
    'cmd',
    'com',
    'pif',
    'scr',
    'vbs',
    'js',
    'jar',
    'zip',
    'rar',
    '7z',
    'dmg',
    'pkg',
    'deb',
    'rpm',
  };

  static final Set<String> _suspiciousTlds = {
    'ru',
    'cn',
    'biz',
    'tk',
    'xyz',
    'rest',
    'work',
    'zip',
    'top',
    'guru',
    'click',
    'to',
    'ml',
    'cf',
    'ga',
    'gq',
  };

  static final Set<String> _shortenerHosts = {
    'bit.ly',
    'tinyurl.com',
    't.co',
    'goo.gl',
    'ow.ly',
    'is.gd',
    'buff.ly',
    'cutt.ly',
    'short.ly',
    'short.link',
    'rb.gy',
    's.id',
    '.co',
    '.c',
  };

  static final List<String> _wrongProtocolPatterns = ['hxxp://', 'hxxps://', 'htp://', 'htt://', 'hxtp://', 'hxxtp://'];
  static final RegExp _fakeWwwRegex = RegExp(r'^(ww(?!w\.)|www\d\.|vvw\.|wvw\.)', caseSensitive: false);

  static final List<Map<String, dynamic>> _brandLeetRegexes = [
    {'brand': 'google', 're': RegExp(r'g[o0]{2}g[l1]e', caseSensitive: false), 'canonical': 'google.com', 'requireDigit': true},
    {'brand': 'facebook', 're': RegExp(r'f[a4]ce(?:b|8)[o0]{2}k|faceb[o0]{2}k', caseSensitive: false), 'canonical': 'facebook.com', 'requireDigit': true},
    {'brand': 'yahoo', 're': RegExp(r'yah[o0]{2}', caseSensitive: false), 'canonical': 'yahoo.com', 'requireDigit': true},
    {'brand': 'microsoft', 're': RegExp(r'micr[o0]s[o0]ft|micr0soft', caseSensitive: false), 'canonical': 'microsoft.com', 'requireDigit': true},
    {'brand': 'apple', 're': RegExp(r'app[l1]e', caseSensitive: false), 'canonical': 'apple.com', 'requireDigit': true},
    {'brand': 'amazon', 're': RegExp(r'am[a4]z[o0]n', caseSensitive: false), 'canonical': 'amazon.com', 'requireDigit': true},
  ];

  static final List<String> _brandAttachWords = ['login', 'secure', 'update', 'verify', 'free', 'gift', 'support'];

  static WebsiteScoreResult calculateFromScanPayload({required String inputUrl, required Map<String, dynamic> raw}) {
    Uri? uri;
    try {
      uri = Uri.parse(inputUrl);
    } catch (_) {
      return WebsiteScoreResult(
        riskScore: 100,
        safetyRating: 10,
        status: 'unsafe',
        safetyLevel: 'Very Unsafe',
        category: 'Unknown',
        reasons: const ['Invalid URL format.'],
      );
    }

    final isHttps = uri.scheme.toLowerCase() == 'https';
    final categoryInfo = _categorizeHost(uri.host);
    final heuristic = _analyzeUrlHeuristics(inputUrl, inputUrl);

    final dns = raw['dns'];
    if (dns is Map && dns['ok'] == false) {
      final flags = [...heuristic.flags, 'domain-not-found'];
      final reasons = <String>[
        'Domain does not exist or is unreachable (${dns['error'] ?? 'domain_not_found'})',
        'Uses ${isHttps ? 'HTTPS' : 'HTTP'}.',
        if (heuristic.flags.isNotEmpty) 'Heuristic flags: ${heuristic.flags.join(' • ')}.',
      ];
      return WebsiteScoreResult(
        riskScore: 150,
        safetyRating: 5,
        status: 'unsafe',
        safetyLevel: 'Very Unsafe',
        category: 'Non-existent Domain',
        reasons: [...reasons, 'Flags: ${flags.join(', ')}'],
      );
    }

    int? externalLinks;
    final ext = raw['externalLinks'];
    if (ext is Map && ext['count'] is num) {
      externalLinks = (ext['count'] as num).round();
    }

    final riskResult = _computeRiskScore(
      isHttps: isHttps,
      externalLinks: externalLinks,
      foundMisspellings: const [],
      categoryInfo: categoryInfo,
      heuristicFlags: heuristic.flags,
      tld: heuristic.tld,
      phishingScore: heuristic.phishingScore,
    );

    final safetyRating = _calculateSafetyRating(riskResult.risk, heuristic.phishingScore);
    return WebsiteScoreResult(
      riskScore: riskResult.risk,
      safetyRating: safetyRating,
      status: riskResult.status,
      safetyLevel: _getSafetyLevel(safetyRating),
      category: categoryInfo.category,
      reasons: riskResult.reasons,
    );
  }

  static String _normalizeHost(String hostname) {
    final h = hostname.toLowerCase();
    return h.startsWith('www.') ? h.substring(4) : h;
  }

  static bool _domainMatches(String hostname, String root) {
    final h = _normalizeHost(hostname);
    final r = root.toLowerCase();
    return h == r || h.endsWith('.$r');
  }

  static _CategoryInfo _categorizeHost(String hostname) {
    final host = _normalizeHost(hostname);
    final parts = host.split('.');
    final tld = parts.isEmpty ? '' : parts.last;
    final lowerHost = host;

    if (RegExp(r'(^|\.)gov(\.|$)').hasMatch(lowerHost) || tld == 'gov') {
      return const _CategoryInfo(category: 'Government', trusted: true);
    }
    if (tld == 'edu' || RegExp(r'(^|\.)ac\.').hasMatch(lowerHost)) {
      return const _CategoryInfo(category: 'Education', trusted: true);
    }
    if (_domainMatches(lowerHost, 'who.int')) {
      return const _CategoryInfo(category: 'International Organization', trusted: true);
    }
    for (final d in _socialMediaDomains) {
      if (_domainMatches(lowerHost, d)) return const _CategoryInfo(category: 'Social Media', trusted: true);
    }
    for (final d in _newsDomains) {
      if (_domainMatches(lowerHost, d)) return const _CategoryInfo(category: 'News / Media', trusted: true);
    }
    for (final d in _researchDomains) {
      if (_domainMatches(lowerHost, d)) return const _CategoryInfo(category: 'Research / Study', trusted: true);
    }
    for (final d in _companyDomains) {
      if (_domainMatches(lowerHost, d)) return const _CategoryInfo(category: 'Company', trusted: true);
    }
    if (lowerHost.endsWith('.org')) {
      return const _CategoryInfo(category: 'Organization / Nonprofit', trusted: false);
    }
    return const _CategoryInfo(category: 'General Website', trusted: false);
  }

  static _PhishingResult _detectPhishingPatterns(String url, String hostname, String path) {
    final flags = <String>[];
    final notes = <String>[];
    var score = 0;

    if (RegExp(r'^\d{1,3}(?:\.\d{1,3}){3}$').hasMatch(hostname)) {
      flags.add('ip-address');
      notes.add('Uses IP address instead of domain name - highly suspicious');
      score += 30;
    }

    final fullUrl = url.toLowerCase();
    var obfuscationCount = 0;
    for (final pattern in _obfuscationPatterns) {
      obfuscationCount += pattern.allMatches(fullUrl).length;
    }
    if (obfuscationCount > 3) {
      flags.add('url-obfuscation');
      notes.add('High level of URL obfuscation detected ($obfuscationCount instances)');
      score += 25;
    } else if (obfuscationCount > 0) {
      flags.add('minor-obfuscation');
      notes.add('URL obfuscation detected ($obfuscationCount instances)');
      score += 10;
    }

    for (final brand in _brandImpersonationPatterns) {
      final patterns = (brand['patterns'] as List<dynamic>).cast<RegExp>();
      for (final pattern in patterns) {
        if (pattern.hasMatch(hostname) && !hostname.contains((brand['brand'] as String))) {
          flags.add('brand-impersonation');
          notes.add('Possible ${(brand['brand'] as String)} impersonation detected');
          score += 40;
          break;
        }
      }
    }

    var keywordCount = 0;
    for (final keyword in _phishingKeywords) {
      if (fullUrl.contains(keyword)) keywordCount++;
    }
    if (keywordCount >= 3) {
      flags.add('high-phishing-keywords');
      notes.add('High concentration of phishing keywords ($keywordCount found)');
      score += 35;
    } else if (keywordCount >= 1) {
      flags.add('phishing-keywords');
      notes.add('Phishing keywords detected ($keywordCount found)');
      score += 15;
    }

    for (final pattern in _phishingPatterns) {
      if (pattern.hasMatch(fullUrl)) {
        flags.add('suspicious-pattern');
        notes.add('URL matches known phishing pattern');
        score += 30;
      }
    }

    final pathLower = path.toLowerCase();
    for (final ext in _suspiciousExtensions) {
      if (pathLower.contains('.$ext')) {
        flags.add('suspicious-file');
        notes.add('Suspicious file extension detected: .$ext');
        score += 20;
      }
    }

    final subdomains = hostname.split('.');
    if (subdomains.length > 4) {
      flags.add('subdomain-stuffing');
      notes.add('Excessive subdomain levels (${subdomains.length}) - possible subdomain stuffing');
      score += 15;
    }

    if (RegExp(r'[\u0430-\u044f\u03b1-\u03c9]', caseSensitive: false).hasMatch(hostname)) {
      flags.add('homograph-attack');
      notes.add('Domain contains lookalike characters (possible homograph attack)');
      score += 45;
    }

    if (hostname.length > 50) {
      flags.add('long-domain');
      notes.add('Unusually long domain name (${hostname.length} characters)');
      score += 10;
    }

    if (RegExp(r'[A-Z].*[a-z].*[A-Z]').hasMatch(hostname)) {
      flags.add('mixed-case');
      notes.add('Unusual mixed case pattern in domain');
      score += 5;
    }

    return _PhishingResult(flags: flags, notes: notes, score: score);
  }

  static _HeuristicResult _analyzeUrlHeuristics(String urlString, String rawInput) {
    final flags = <String>[];
    final notes = <String>[];
    var host = '';
    var tld = '';
    var pathname = '';

    try {
      final u = Uri.parse(urlString);
      host = _normalizeHost(u.host);
      pathname = u.path;
      final parts = host.split('.');
      tld = parts.isEmpty ? '' : parts.last.toLowerCase();

      final isShortener = _shortenerHosts.any((d) => _domainMatches(host, d));
      if (isShortener) {
        flags.add('shortener');
        notes.add('Appears to use a link shortener.');
      } else {
        final hostParts = host.split('.');
        if (hostParts.length >= 2) {
          final sld = hostParts[hostParts.length - 2];
          final hostTld = hostParts.last;
          for (final sh in _shortenerHosts) {
            final shParts = sh.split('.');
            if (shParts.length >= 2) {
              final shSld = shParts[shParts.length - 2];
              final shTld = shParts.last;
              if (hostTld == shTld && sld.endsWith(shSld) && sld != shSld) {
                flags.add('shortener-lookalike');
                notes.add("Hostname ends with known shortener label '$shSld' (possible impersonation).");
                break;
              }
            }
          }
        }
      }

      if (_fakeWwwRegex.hasMatch(u.host)) {
        flags.add('fake-www');
        notes.add('Hostname starts with suspicious www variant.');
      }

      if (_suspiciousTlds.contains(tld)) {
        flags.add('suspicious-tld');
        notes.add('Suspicious top-level domain .$tld.');
      }

      final hostPath = (u.host + u.path).toLowerCase();
      for (final kw in _brandAttachWords) {
        for (final b in ['google', 'facebook', 'yahoo', 'microsoft', 'apple', 'amazon', 'meta', 'instagram', 'twitter', 'linkedin']) {
          if (hostPath.contains('$b$kw') || hostPath.contains('$kw$b')) {
            flags.add('brand-keyword');
            notes.add("Brand name appears attached to word '$kw'.");
            break;
          }
        }
      }

      for (final r in _brandLeetRegexes) {
        final canonical = r['canonical'] as String;
        if (_domainMatches(host, canonical)) continue;
        final re = r['re'] as RegExp;
        if (re.hasMatch(host)) {
          final requireDigit = r['requireDigit'] == true;
          if (requireDigit && !RegExp(r'[0-9]').hasMatch(host)) {
            continue;
          }
          flags.add('typosquat');
          notes.add('Hostname resembles a leetspeak variant of ${r['brand']}.');
          break;
        }
      }
    } catch (_) {
      // Ignore parse errors.
    }

    final rawLower = rawInput.trim().toLowerCase();
    if (rawLower.isNotEmpty && _wrongProtocolPatterns.any((p) => rawLower.startsWith(p))) {
      flags.add('wrong-protocol');
      notes.add('Protocol appears obfuscated or misspelled.');
    }

    final phishing = _detectPhishingPatterns(urlString, host, pathname);
    flags.addAll(phishing.flags);
    notes.addAll(phishing.notes);

    if (phishing.score >= 50) {
      flags.add('high-phishing-risk');
      notes.add('High phishing risk detected (score: ${phishing.score})');
    } else if (phishing.score >= 25) {
      flags.add('moderate-phishing-risk');
      notes.add('Moderate phishing risk detected (score: ${phishing.score})');
    } else if (phishing.score > 0) {
      flags.add('low-phishing-risk');
      notes.add('Low phishing risk detected (score: ${phishing.score})');
    }

    return _HeuristicResult(flags: flags, notes: notes, tld: tld, phishingScore: phishing.score);
  }

  static _RiskResult _computeRiskScore({
    required bool isHttps,
    required int? externalLinks,
    required List<String> foundMisspellings,
    required _CategoryInfo categoryInfo,
    required List<String> heuristicFlags,
    required String tld,
    required int phishingScore,
  }) {
    var risk = 0;
    final reasons = <String>[];

    if (!isHttps) {
      risk = 100;
      reasons.add('HTTP detected: only HTTPS is considered safe.');
    } else {
      reasons.add('HTTPS detected: baseline safe.');
    }

    if (externalLinks == null) {
      reasons.add('Deep content analysis unavailable (site may block automated access).');
    }

    if (heuristicFlags.isNotEmpty) {
      var extra = 0;
      for (final f in heuristicFlags) {
        if (f == 'wrong-protocol') {
          extra += 25;
        } else if (f == 'fake-www') {
          extra += 15;
        } else if (f == 'shortener') {
          extra += 35;
        } else if (f == 'shortener-lookalike') {
          extra += 30;
        } else if (f == 'suspicious-tld') {
          extra += 14;
        } else if (f == 'typosquat') {
          extra += 20;
        } else if (f == 'brand-keyword') {
          extra += 10;
        } else if (f == 'ip-address') {
          extra += 35;
        } else if (f == 'brand-impersonation') {
          extra += 40;
        } else if (f == 'homograph-attack') {
          extra += 45;
        } else if (f == 'url-obfuscation') {
          extra += 25;
        } else if (f == 'suspicious-pattern') {
          extra += 30;
        } else if (f == 'phishing-keywords') {
          extra += 15;
        } else if (f == 'high-phishing-keywords') {
          extra += 35;
        } else if (f == 'suspicious-file') {
          extra += 20;
        } else if (f == 'subdomain-stuffing') {
          extra += 15;
        } else if (f == 'high-phishing-risk') {
          extra += 60;
        } else if (f == 'moderate-phishing-risk') {
          extra += 30;
        } else if (f == 'low-phishing-risk') {
          extra += 10;
        } else if (f == 'domain-not-found') {
          extra += 80;
        } else {
          extra += 6;
        }
      }
      risk += extra;
      reasons.add('Heuristic flags: ${heuristicFlags.join(' • ')}.');
    }

    if (phishingScore > 0) {
      risk += phishingScore;
      if (phishingScore >= 50) {
        reasons.add('Critical phishing risk detected (score: $phishingScore)');
      } else if (phishingScore >= 25) {
        reasons.add('Moderate phishing risk detected (score: $phishingScore)');
      } else {
        reasons.add('Low phishing risk detected (score: $phishingScore)');
      }
    }

    if (tld == 'to' && risk < 55) {
      risk = 55;
      reasons.add('Baseline risk elevated due to policy for TLD .to.');
    }

    if (foundMisspellings.length >= 3) {
      risk += 20;
      reasons.add('Multiple common misspellings detected.');
    } else if (foundMisspellings.length == 2) {
      risk += 12;
      reasons.add('Some misspellings detected.');
    } else if (foundMisspellings.length == 1) {
      risk += 6;
      reasons.add('A misspelling was detected.');
    } else {
      reasons.add('No common misspellings detected.');
    }

    if (externalLinks != null) {
      if (externalLinks > 50) {
        risk += 20;
        reasons.add('High number of external links ($externalLinks).');
      } else if (externalLinks > 20) {
        risk += 12;
        reasons.add('Many external links ($externalLinks).');
      } else if (externalLinks > 10) {
        risk += 6;
        reasons.add('Some external links ($externalLinks).');
      } else {
        reasons.add('Few external links ($externalLinks).');
      }
    }

    if (categoryInfo.trusted) {
      risk = (risk * 0.6).round();
      if (risk < 0) risk = 0;
      reasons.add('Trusted category: ${categoryInfo.category}.');
    } else {
      reasons.add('Category: ${categoryInfo.category}.');
    }

    var status = isHttps ? 'safe' : 'unsafe';
    if (risk >= 50) {
      status = 'unsafe';
    } else if (risk >= 20) {
      status = 'caution';
    }

    return _RiskResult(risk: risk, status: status, reasons: reasons);
  }

  static int _calculateSafetyRating(int risk, int phishingScore) {
    final totalRisk = risk + phishingScore;
    final safety = 100 - totalRisk;
    return safety.clamp(10, 100).round();
  }

  static String _getSafetyLevel(int safetyRating) {
    if (safetyRating >= 90) return 'Very Safe';
    if (safetyRating >= 70) return 'Safe but...';
    if (safetyRating >= 30) return 'Not Safe';
    return 'Very Unsafe';
  }
}
