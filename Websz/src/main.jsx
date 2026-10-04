import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { configManagerInstance } from './config/useConfig'
import { initConfigSync } from './config/configSync'

// GitHub Pages hosts only the static frontend. This flag lets the legacy page
// controller skip local API calls and use its client-side checks immediately.
window.URLY_STATIC_DEPLOYMENT = import.meta.env.VITE_STATIC_DEPLOYMENT === 'true';

// Expose configManager to window for use by public/js/script.js
window.configManager = {
  getConfig: () => configManagerInstance.getAll(),
  get: (path) => configManagerInstance.get(path),
  set: (path, value) => configManagerInstance.set(path, value),
  reset: () => configManagerInstance.reset(),
  on: (event, callback) => {
    if (event === 'change') {
      return configManagerInstance.subscribe(callback);
    }
  }
};

// Initialize config sync with database
initConfigSync();

// Log config manager initialization
console.log('✅ Config Manager initialized and exposed to window');
console.log('📊 Current config:', configManagerInstance.getAll());

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  // In dev, StrictMode double-invokes effects; disable to avoid duplicate bindings.
  <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App />
  </HashRouter>
)
