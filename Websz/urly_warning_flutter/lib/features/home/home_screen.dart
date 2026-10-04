import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Welcome, ${auth.email ?? 'User'}', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                const Text('URLy Warning helps you detect suspicious links before you click.'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        const Card(
          child: ListTile(
            leading: Icon(Icons.verified, color: Colors.green),
            title: Text('Scanner API Status'),
            subtitle: Text('Online and ready'),
          ),
        ),
        const SizedBox(height: 12),
        const Card(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Quick Tips', style: TextStyle(fontWeight: FontWeight.bold)),
                SizedBox(height: 8),
                Text('• Scan links before opening unknown websites.'),
                Text('• Use Strict mode for suspicious messages.'),
                Text('• Review recommendations after each result.'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
