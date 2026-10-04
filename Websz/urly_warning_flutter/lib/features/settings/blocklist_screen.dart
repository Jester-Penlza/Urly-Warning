import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'settings_controller.dart';

class BlocklistScreen extends ConsumerStatefulWidget {
  const BlocklistScreen({super.key});

  @override
  ConsumerState<BlocklistScreen> createState() => _BlocklistScreenState();
}

class _BlocklistScreenState extends ConsumerState<BlocklistScreen> {
  final _valueController = TextEditingController();
  final _reasonController = TextEditingController(text: 'Manual block');

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(settingsControllerProvider.notifier).load());
  }

  @override
  void dispose() {
    _valueController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(settingsControllerProvider);
    final notifier = ref.read(settingsControllerProvider.notifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Blocklist')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(controller: _valueController, decoration: const InputDecoration(labelText: 'URL or hostname')),
          const SizedBox(height: 8),
          TextField(controller: _reasonController, decoration: const InputDecoration(labelText: 'Reason')),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: () async {
              final value = _valueController.text.trim();
              if (value.isEmpty) return;
              await notifier.addBlocklist(value: value, type: value.startsWith('http') ? 'url' : 'hostname');
            },
            child: const Text('Add'),
          ),
          const SizedBox(height: 16),
          if (state.blocklist.isEmpty)
            const Text('No custom blocklist entries yet.')
          else
            ...state.blocklist.map(
              (entry) => Card(
                child: ListTile(
                  title: Text(entry['value']?.toString() ?? ''),
                  subtitle: Text(entry['reason']?.toString() ?? ''),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () => notifier.removeBlocklist(entry['value']?.toString() ?? ''),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
