/**
 * Configuration Panel Component
 * Full configuration UI for URL Scanner
 */

import React, { useState } from 'react';
import { useConfig } from '../config/useConfig';
import './ConfigPanel.css';

export default function ConfigPanel({ isOpen, onClose }) {
  const { config, updateConfig, updateConfigs, resetConfig, exportConfig, importConfig } = useConfig();
  const [activeTab, setActiveTab] = useState('scanning');

  const handleToggle = (path) => {
    const currentValue = getConfigValue(path);
    updateConfig(path, !currentValue);
  };

  const handleNumberChange = (path, value) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      updateConfig(path, numValue);
    }
  };

  const handleTextChange = (path, value) => {
    updateConfig(path, value);
  };

  const getConfigValue = (path) => {
    const keys = path.split('.');
    let value = config;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  };

  // Default weights for heuristic parameters (base values at 100%)
  const defaultWeights = {
    httpNotEncrypted: 100,
    ipAddress: 30,
    punycode: 15,
    tldRisk: 10,
    manySubdomains: 10,
    manyHyphens: 8,
    longHostname: 8,
    longPath: 6,
    longQuery: 6,
    highHostEntropy: 10,
    highPathEntropy: 6,
    atInPath: 8,
    manyEncodedChars: 6,
    linkShortener: 6,
    phishingKeywords: 10,
    suspiciousPatterns: 12,
    typosquat: 14
  };

  // Get current sensitivity level (0-200%)
  const getSensitivityLevel = () => {
    const currentHttpWeight = getConfigValue('heuristics.weights.httpNotEncrypted') || 100;
    const baseWeight = defaultWeights.httpNotEncrypted;
    const sensitivity = Math.round((currentHttpWeight / baseWeight) * 100);
    return Math.max(25, Math.min(200, sensitivity));
  };

  // Handle sensitivity change - adjusts all weights proportionally
  const handleSensitivityChange = (multiplier) => {
    const updates = Object.fromEntries(Object.entries(defaultWeights).map(([key, baseValue]) => [
      `heuristics.weights.${key}`,
      Math.round(baseValue * multiplier)
    ]));
    updateConfigs(updates);
  };

  // Get description based on sensitivity level
  const getSensitivityDescription = () => {
    const level = getSensitivityLevel();
    
    if (level < 60) {
      return {
        title: '🟢 Relaxed Mode',
        description: 'Minimal false positives. Best for trusted networks or internal URLs.',
        color: '#28a745',
        level: 'relaxed'
      };
    } else if (level < 85) {
      return {
        title: '🟡 Balanced Mode',
        description: 'Good balance between security and usability. Recommended for most users.',
        color: '#17a2b8',
        level: 'balanced'
      };
    } else if (level < 110) {
      return {
        title: '✅ Normal Mode (Default)',
        description: 'Standard security settings. Suitable for general web browsing.',
        color: '#007bff',
        level: 'normal'
      };
    } else if (level < 140) {
      return {
        title: '🟠 Strict Mode',
        description: 'Enhanced detection. May flag some legitimate sites. Good for high-security needs.',
        color: '#ffc107',
        level: 'strict'
      };
    } else {
      return {
        title: '🔴 Maximum Security',
        description: 'Aggressive detection. High false positive rate. Use for unknown/suspicious links only.',
        color: '#dc3545',
        level: 'maximum'
      };
    }
  };

  const handleExport = () => {
    const configJson = exportConfig();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scanner-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const success = importConfig(e.target.result);
        if (success) {
          alert('Configuration imported successfully!');
        } else {
          alert('Failed to import configuration. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetConfig();
      alert('Configuration reset to defaults!');
    }
  };

  return (
    <div className={`config-panel ${isOpen ? 'open' : ''}`}>
      <div className="config-header">
        <h2>⚙️ Scanner Configuration</h2>
        <button className="close-button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="config-tabs">
        <button 
          className={activeTab === 'scanning' ? 'active' : ''}
          onClick={() => setActiveTab('scanning')}
        >
          🔍 Scanning
        </button>
        <button 
          className={activeTab === 'security' ? 'active' : ''}
          onClick={() => setActiveTab('security')}
        >
          🛡️ Security
        </button>
        <button 
          className={activeTab === 'display' ? 'active' : ''}
          onClick={() => setActiveTab('display')}
        >
          🎨 Display
        </button>
        <button 
          className={activeTab === 'advanced' ? 'active' : ''}
          onClick={() => setActiveTab('advanced')}
        >
          ⚡ Advanced
        </button>
      </div>

      <div className="config-content">
        {/* Scanning Tab */}
        {activeTab === 'scanning' && (
          <div className="config-section">
            <h3>Scanning Behavior</h3>
            
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('scanning.enableDNSLookup')}
                  onChange={() => handleToggle('scanning.enableDNSLookup')}
                />
                Enable DNS Lookup
              </label>
              <p className="config-help">Check domain DNS records for validity</p>
            </div>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('scanning.enableSSLCheck')}
                  onChange={() => handleToggle('scanning.enableSSLCheck')}
                />
                Enable SSL/TLS Check
              </label>
              <p className="config-help">Verify HTTPS certificate validity</p>
            </div>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('scanning.enableContentAnalysis')}
                  onChange={() => handleToggle('scanning.enableContentAnalysis')}
                />
                Enable Content Analysis
              </label>
              <p className="config-help">Analyze webpage content for threats</p>
            </div>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('scanning.followRedirects')}
                  onChange={() => handleToggle('scanning.followRedirects')}
                />
                Follow Redirects
              </label>
              <p className="config-help">Check final destination of redirected URLs</p>
            </div>

            <div className="config-item">
              <label>
                Max Batch Size
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={getConfigValue('scanning.maxBatchSize')}
                  onChange={(e) => handleNumberChange('scanning.maxBatchSize', e.target.value)}
                />
              </label>
              <p className="config-help">Maximum URLs to scan at once</p>
            </div>

            <div className="config-item">
              <label>
                Max Concurrent Requests
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={getConfigValue('scanning.maxConcurrentRequests')}
                  onChange={(e) => handleNumberChange('scanning.maxConcurrentRequests', e.target.value)}
                />
              </label>
              <p className="config-help">Parallel scanning requests</p>
            </div>

            <div className="config-item">
              <label>
                Max Redirects
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={getConfigValue('scanning.maxRedirects')}
                  onChange={(e) => handleNumberChange('scanning.maxRedirects', e.target.value)}
                />
              </label>
              <p className="config-help">Maximum redirect chain length</p>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="config-section">
            <h3>🛡️ Security Settings</h3>
            
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('api.googleSafeBrowsing.enabled')}
                  onChange={() => handleToggle('api.googleSafeBrowsing.enabled')}
                />
                Enable Google Safe Browsing
              </label>
              <p className="config-help">Use Google's threat database for known malicious sites</p>
            </div>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('heuristics.enabled')}
                  onChange={() => handleToggle('heuristics.enabled')}
                />
                Enable Heuristic Analysis
              </label>
              <p className="config-help">Pattern-based URL analysis (17 detection parameters)</p>
            </div>

            <div className="detection-sensitivity-container">
              <h4 className="sensitivity-title">
                🎚️ Detection Sensitivity
              </h4>
              <p className="sensitivity-subtitle">
                Adjust overall security strictness. Controls all 17 heuristic parameters simultaneously.
              </p>

              <div className="sensitivity-presets">
                <button 
                  onClick={() => handleSensitivityChange(0.5)}
                  className="preset-btn preset-relaxed"
                >
                  🟢 Relaxed (50%)
                </button>
                <button 
                  onClick={() => handleSensitivityChange(0.75)}
                  className="preset-btn preset-balanced"
                >
                  🟡 Balanced (75%)
                </button>
                <button 
                  onClick={() => handleSensitivityChange(1.0)}
                  className="preset-btn preset-normal"
                >
                  ✅ Normal (100%)
                </button>
                <button 
                  onClick={() => handleSensitivityChange(1.25)}
                  className="preset-btn preset-strict"
                >
                  🟠 Strict (125%)
                </button>
                <button 
                  onClick={() => handleSensitivityChange(1.5)}
                  className="preset-btn preset-maximum"
                >
                  🔴 Maximum (150%)
                </button>
              </div>

              <div className="sensitivity-slider-wrapper">
                <input
                  type="range"
                  min="25"
                  max="200"
                  step="5"
                  value={getSensitivityLevel()}
                  onChange={(e) => handleSensitivityChange(parseInt(e.target.value) / 100)}
                  className="sensitivity-slider"
                />
                <div className="slider-labels">
                  <span className="slider-min">25%</span>
                  <span className="slider-current">
                    {getSensitivityLevel()}%
                  </span>
                  <span className="slider-max">200%</span>
                </div>
              </div>

              <div className={`sensitivity-description sensitivity-${getSensitivityDescription().level}`}>
                <div className="sensitivity-desc-title">
                  {getSensitivityDescription().title}
                </div>
                <div className="sensitivity-desc-text">
                  {getSensitivityDescription().description}
                </div>
              </div>

              <details className="sensitivity-details">
                <summary className="sensitivity-details-summary">
                  📋 What's being adjusted (17 parameters)
                </summary>
                <div className="sensitivity-details-content">
                  • HTTP Not Encrypted (HTTPS penalty)<br/>
                  • IP Address (instead of domain)<br/>
                  • Punycode (internationalized domains)<br/>
                  • TLD Risk (.tk, .xyz, etc.)<br/>
                  • Many Subdomains ({'>'}2)<br/>
                  • Many Hyphens ({'>'}3)<br/>
                  • Long Hostname ({'>'}45 chars)<br/>
                  • Long Path ({'>'}60 chars)<br/>
                  • Long Query ({'>'}80 chars)<br/>
                  • High Host Entropy (random-looking)<br/>
                  • High Path Entropy (random paths)<br/>
                  • @ Symbol in Path<br/>
                  • Excessive URL Encoding<br/>
                  • Link Shorteners<br/>
                  • Phishing Keywords<br/>
                  • Suspicious Patterns<br/>
                  • Typosquatting/Leetspeak
                </div>
              </details>
            </div>
          </div>
        )}

        {/* Display Tab */}
        {activeTab === 'display' && (
          <div className="config-section">
            <h3>Display Options</h3>
            
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('display.showDetailedAnalysis')}
                  onChange={() => handleToggle('display.showDetailedAnalysis')}
                />
                Show Detailed Analysis
              </label>
              <p className="config-help">Display full breakdown of scan results</p>
            </div>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('display.showTimestamps')}
                  onChange={() => handleToggle('display.showTimestamps')}
                />
                Show Timestamps
              </label>
              <p className="config-help">Display scan date and time</p>
            </div>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('display.showScoreBreakdown')}
                  onChange={() => handleToggle('display.showScoreBreakdown')}
                />
                Show Score Breakdown
              </label>
              <p className="config-help">Show how safety score was calculated</p>
            </div>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('display.showRecommendations')}
                  onChange={() => handleToggle('display.showRecommendations')}
                />
                Show Recommendations
              </label>
              <p className="config-help">Display safety recommendations</p>
            </div>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('display.showPerformanceMetrics')}
                  onChange={() => handleToggle('display.showPerformanceMetrics')}
                />
                Show Performance Metrics
              </label>
              <p className="config-help">Display scan speed and timing</p>
            </div>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('display.animateResults')}
                  onChange={() => handleToggle('display.animateResults')}
                />
                Animate Results
              </label>
              <p className="config-help">Smooth transitions and animations</p>
            </div>

            <div className="config-item">
              <label>
                Color Scheme
                <select
                  value={getConfigValue('display.colorScheme')}
                  onChange={(e) => handleTextChange('display.colorScheme', e.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="config-section">
            <h3>Advanced Settings</h3>
            
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('performance.enableCaching')}
                  onChange={() => handleToggle('performance.enableCaching')}
                />
                Enable Result Caching
              </label>
              <p className="config-help">Cache scan results to improve performance</p>
            </div>

            <div className="config-item">
              <label>
                Cache Expiry (minutes)
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={getConfigValue('performance.cacheExpiry') / 60000}
                  onChange={(e) => handleNumberChange('performance.cacheExpiry', parseInt(e.target.value) * 60000)}
                />
              </label>
              <p className="config-help">How long to keep cached results</p>
            </div>

            <div className="config-item">
              <label>
                API Timeout (seconds)
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={getConfigValue('api.timeout') / 1000}
                  onChange={(e) => handleNumberChange('api.timeout', parseInt(e.target.value) * 1000)}
                />
              </label>
              <p className="config-help">Maximum time to wait for scan results</p>
            </div>

            <div className="config-item">
              <label>
                Retry Attempts
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={getConfigValue('api.retryAttempts')}
                  onChange={(e) => handleNumberChange('api.retryAttempts', e.target.value)}
                />
              </label>
              <p className="config-help">Number of times to retry failed requests</p>
            </div>

            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={getConfigValue('advanced.enableLogging')}
                  onChange={() => handleToggle('advanced.enableLogging')}
                />
                Enable Console Logging
              </label>
              <p className="config-help">Log debug information to browser console</p>
            </div>
          </div>
        )}
      </div>

      <div className="config-footer">
        <button className="btn-secondary" onClick={handleReset}>
          🔄 Reset to Defaults
        </button>
        <button className="btn-secondary" onClick={handleExport}>
          📥 Export Config
        </button>
        <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
          📤 Import Config
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}
