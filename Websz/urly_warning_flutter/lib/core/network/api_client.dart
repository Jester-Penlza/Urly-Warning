import 'package:dio/dio.dart';

import '../constants/app_constants.dart';

class ApiClient {
  ApiClient({String? authToken})
      : dio = Dio(
          BaseOptions(
            baseUrl: AppConstants.scannerApiBase,
            connectTimeout: const Duration(milliseconds: AppConstants.requestTimeoutMs),
            receiveTimeout: const Duration(milliseconds: AppConstants.requestTimeoutMs),
            sendTimeout: const Duration(milliseconds: AppConstants.requestTimeoutMs),
            headers: {
              'Content-Type': 'application/json',
              if (authToken != null && authToken.isNotEmpty) 'Authorization': 'Bearer $authToken',
            },
          ),
        );

  final Dio dio;
}
