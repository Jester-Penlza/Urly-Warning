import 'package:flutter/material.dart';

class AppTheme {
  AppTheme._();

  static final light = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0B6E4F)),
    scaffoldBackgroundColor: const Color(0xFFF7FAF8),
  );

  static final dark = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: const Color(0xFF0B6E4F),
      brightness: Brightness.dark,
    ),
  );
}
