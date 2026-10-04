import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'settings_controller.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _blocklistValueController = TextEditingController();
  final _blocklistReasonController = TextEditingController(text: 'Added manually');

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(settingsControllerProvider.notifier).load());
  }

  @override
  void dispose() {
    _blocklistValueController.dispose();
    _blocklistReasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(settingsControllerProvider);
    final notifier = ref.read(settingsControllerProvider.notifier);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Scanner Settings', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('DNS enabled'),
                  value: (state.config['dns_enabled'] as bool?) ?? true,
                  onChanged: (value) => notifier.setConfigBool('dns_enabled', value),
                ),
                SwitchListTile(
                  title: const Text('SSL enabled'),
                  value: (state.config['ssl_enabled'] as bool?) ?? true,
                  onChanged: (value) => notifier.setConfigBool('ssl_enabled', value),
                ),
                SwitchListTile(
                  title: const Text('Google Safe Browsing'),
                  value: (state.config['gsb_enabled'] as bool?) ?? true,
                  onChanged: (value) => notifier.setConfigBool('gsb_enabled', value),
                ),
                SwitchListTile(
                  title: const Text('Heuristics enabled'),
                  value: (state.config['heuristics_enabled'] as bool?) ?? true,
                  onChanged: (value) => notifier.setConfigBool('heuristics_enabled', value),
                ),
                ListTile(
                  title: const Text('Max redirects'),
                  subtitle: Slider(
                    value: ((state.config['max_redirects'] as num?) ?? 5).toDouble(),
                    min: 0,
                    max: 10,
                    divisions: 10,
                    label: '${(state.config['max_redirects'] as num?) ?? 5}',
                    onChanged: (value) => notifier.setConfigNumber('max_redirects', value.toInt()),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Blocklist', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(
                  controller: _blocklistValueController,
                  decoration: const InputDecoration(labelText: 'URL or hostname'),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _blocklistReasonController,
                  decoration: const InputDecoration(labelText: 'Reason'),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () async {
                    final value = _blocklistValueController.text.trim();
                    if (value.isEmpty) return;
                    await notifier.addBlocklist(value: value, type: value.startsWith('http') ? 'url' : 'hostname');
                  },
                  child: const Text('Add to Blocklist'),
                ),
                const SizedBox(height: 12),
                if (state.blocklist.isEmpty)
                  const Text('No custom blocklist entries yet.')
                else
                  ...state.blocklist.map(
                    (entry) => ListTile(
                      dense: true,
                      title: Text(entry['value']?.toString() ?? ''),
                      subtitle: Text(entry['reason']?.toString() ?? ''),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => notifier.removeBlocklist(entry['value']?.toString() ?? ''),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (state.error != null)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(state.error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
      ],
    );
  }
}
