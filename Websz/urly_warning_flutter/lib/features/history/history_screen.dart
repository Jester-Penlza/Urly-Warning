import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'history_controller.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  final _searchController = TextEditingController();
  bool _loadedOnce = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(historyControllerProvider.notifier).load();
      if (mounted) {
        setState(() {
          _loadedOnce = true;
        });
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(historyControllerProvider);
    final notifier = ref.read(historyControllerProvider.notifier);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            labelText: 'Search scans',
            suffixIcon: IconButton(
              icon: const Icon(Icons.search),
              onPressed: () => notifier.search(_searchController.text),
            ),
          ),
          onSubmitted: notifier.search,
        ),
        const SizedBox(height: 16),
        if (state.stats != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Stats Summary', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text('Total scans: ${state.stats!.totalScans}'),
                  Text('Today: ${state.stats!.todayScans}'),
                  Text('Average risk: ${state.stats!.averageRisk}'),
                  Text('Safe: ${state.stats!.safe}  Caution: ${state.stats!.caution}  Unsafe: ${state.stats!.unsafe}'),
                ],
              ),
            ),
          ),
        const SizedBox(height: 16),
        if (state.loading && !_loadedOnce)
          const Center(child: CircularProgressIndicator())
        else if (state.error != null)
          Text(state.error!, style: TextStyle(color: Theme.of(context).colorScheme.error))
        else if (state.items.isEmpty)
          const Text('No scan history found yet.')
        else
          ...state.items.map(
            (item) => Card(
              child: ListTile(
                leading: Icon(
                  item.status == 'unsafe'
                      ? Icons.error
                      : item.status == 'caution'
                          ? Icons.warning_amber_rounded
                          : Icons.verified,
                ),
                title: Text(item.url),
                subtitle: Text('Risk: ${item.riskScore} • Safety: ${item.safetyScore}'),
                trailing: Text(item.status),
              ),
            ),
          ),
      ],
    );
  }
}
