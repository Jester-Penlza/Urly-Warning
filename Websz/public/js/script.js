(() => {
// Keep this legacy bundle isolated because PageLoader may load it again after
// route changes or hot reloads. Without a private scope, top-level const values
// throw redeclaration errors and disable the page on the second load.

// ============== Attach UI Event Listeners ==============
function attachUIEventListeners() {
  // Allow reattachment of UI listeners for navigation
  // Mobile menu toggle
  var menuBtn = document.querySelector(".icon-menu");
  if (menuBtn) {
    // Remove existing listener
    const newMenuBtn = menuBtn.cloneNode(true);
    menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);
    
    newMenuBtn.addEventListener("click", function (event) {
      event.preventDefault();
      document.body.classList.toggle("menu-open");
      newMenuBtn.setAttribute('aria-expanded', String(document.body.classList.contains('menu-open')));
    });
  }

  // Remove background from shield logos
  removeShieldLogoBackground();

  // Theme (Dark/Light) Toggle - Simplified and reliable
  const STORAGE_KEY = "themePreference";
  
  function applyTheme(mode) {
    const requestedMode = ['light', 'dark', 'auto'].includes(mode) ? mode : 'auto';
    const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effectiveMode = requestedMode === 'auto' ? (systemDark ? 'dark' : 'light') : requestedMode;
    const isDark = effectiveMode === "dark";
    document.body.classList.toggle("theme-dark", isDark);
    document.body.classList.toggle("theme-light", !isDark);
    document.body.classList.toggle("theme-auto", requestedMode === 'auto');
    document.body.style.colorScheme = effectiveMode;
    
    // Update theme toggle button text
    const toggleEl = document.getElementById("themeToggle");
    if (toggleEl) {
      toggleEl.textContent = isDark ? "Light" : "Dark";
      toggleEl.setAttribute("aria-pressed", String(isDark));
      toggleEl.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    }

    // Theme-aware logo handling
    const logos = document.querySelectorAll('img.logo__img[data-logo-light]');
    logos.forEach((img) => {
      const lightSrc = img.getAttribute('data-logo-light');
      const darkSrc = img.getAttribute('data-logo-dark');
      if (isDark && darkSrc) {
        const prev = img.src;
        img.onerror = () => { img.onerror = null; img.src = prev; img.classList.add('logo--filter-fallback'); };
        img.src = darkSrc;
        img.classList.remove('logo--filter-fallback');
      } else if (!isDark && lightSrc) {
        const prev = img.src;
        img.onerror = () => { img.onerror = null; img.src = prev; };
        img.src = lightSrc;
        img.classList.remove('logo--filter-fallback');
      } else {
        img.classList.toggle('logo--filter-fallback', isDark);
      }
    });
  }
  
  function getInitialTheme() {
    const configured = window.configManager?.get('display.colorScheme');
    // The unified config is authoritative, including the explicit "auto"
    // choice. Previously an old localStorage toggle value overrode "auto" on
    // every reload, which made the theme appear to change unpredictably.
    if (configured === 'dark' || configured === 'light' || configured === 'auto') return configured;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        // Migrate the original standalone theme preference into the unified
        // configuration so unrelated settings cannot reset it.
        window.configManager?.set('display.colorScheme', saved);
        return saved;
      }
    } catch (e) {}
    return 'auto';
  }
  
  // Initialize theme
  let currentTheme = getInitialTheme();
  applyTheme(currentTheme);
  window.applyThemePreference = function(mode) {
    currentTheme = mode;
    applyTheme(mode);
  };
  
  // Direct theme toggle button handler
  function setupThemeToggle() {
    const themeToggleBtn = document.getElementById("themeToggle");
    if (themeToggleBtn) {
      // Remove any existing listeners by cloning the button
      const newBtn = themeToggleBtn.cloneNode(true);
      themeToggleBtn.parentNode.replaceChild(newBtn, themeToggleBtn);
      
      // Add fresh event listener
      newBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle theme
        currentTheme = document.body.classList.contains("theme-dark") ? "light" : "dark";
        window.applyThemePreference(currentTheme);
        
        // Save to localStorage
        try { 
          localStorage.setItem(STORAGE_KEY, currentTheme); 
        } catch (e2) {
          console.warn('Could not save theme preference:', e2);
        }
        if (window.configManager?.get('display.colorScheme') !== currentTheme) {
          window.configManager?.set('display.colorScheme', currentTheme);
        }
      });
    }
  }
  
  // Setup theme toggle on load
  setupThemeToggle();

  // Home Button Function
  const homeBtn = document.querySelector('.menu__link[href="index.html"], .menu__link[href="./"], .menu__link[href="/"]');
  if (homeBtn) {
    homeBtn.addEventListener('click', function (e) {
      // Let browser handle navigation to home page (index.html)
    });
  }

  // Navigation (Home, About, Services, Contact)
  document.querySelectorAll('.menu__link').forEach(link => {
    link.addEventListener('click', function (e) {
      // Let the browser handle navigation for anchor links
    });
  });

  // ================= CONTACT BUTTON FUNCTIONALITY ================= 
  
  // Enhanced Contact Button with animations and feedback
  function setupContactButton() {
    const contactButtons = document.querySelectorAll('.outro__button, .button[href*="contact"], a[href*="contact.html"]');
    
    contactButtons.forEach(button => {
      // Remove existing listeners by cloning
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      
      // Add enhanced click functionality
      newButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Add loading state
        const originalText = newButton.textContent;
        newButton.textContent = 'Loading...';
        newButton.style.pointerEvents = 'none';
        newButton.classList.add('loading');
        
        // Create ripple effect
        createRippleEffect(newButton, e);
        
        // Show feedback animation
        newButton.style.transform = 'scale(0.95)';
        
        // Navigate after animation
        setTimeout(() => {
          // Check if we're already on contact page
          if (window.location.pathname.includes('contact.html')) {
            // If already on contact page, scroll to top and highlight content
            window.scrollTo({ top: 0, behavior: 'smooth' });
            highlightContactInfo();
            resetButton();
          } else {
            // Navigate to contact page with smooth transition
            window.location.href = newButton.getAttribute('href') || 'contact.html';
          }
        }, 300);
        
        function resetButton() {
          setTimeout(() => {
            newButton.textContent = originalText;
            newButton.style.pointerEvents = '';
            newButton.classList.remove('loading');
            newButton.style.transform = '';
          }, 1000);
        }
      });
      
      // Add hover effects
      newButton.addEventListener('mouseenter', function() {
        if (!newButton.classList.contains('loading')) {
          newButton.style.transform = 'translateY(-2px) scale(1.02)';
        }
      });
      
      newButton.addEventListener('mouseleave', function() {
        if (!newButton.classList.contains('loading')) {
          newButton.style.transform = '';
        }
      });
    });
  }
  
  // Create ripple effect on button click
  function createRippleEffect(button, event) {
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple-effect');
    
    // Add ripple styles if not already added
    if (!document.querySelector('#ripple-styles')) {
      const style = document.createElement('style');
      style.id = 'ripple-styles';
      style.textContent = `
        .ripple-effect {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          transform: scale(0);
          animation: ripple 0.6s linear;
          pointer-events: none;
        }
        
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        
        .outro__button, .button {
          position: relative !important;
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    button.appendChild(ripple);
    
    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }
  
  // Highlight contact information when button is clicked on same page
  function highlightContactInfo() {
    const contactSection = document.querySelector('.contact');
    const contactItems = document.querySelectorAll('.connect-contact__item');
    
    if (contactSection) {
      // Add highlight class to contact section
      contactSection.style.background = 'rgba(59, 130, 246, 0.05)';
      contactSection.style.transition = 'all 0.5s ease';
      
      // Animate contact items
      contactItems.forEach((item, index) => {
        setTimeout(() => {
          item.style.transform = 'scale(1.05)';
          item.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)';
          item.style.transition = 'all 0.3s ease';
          
          // Reset after highlight
          setTimeout(() => {
            item.style.transform = '';
            item.style.boxShadow = '';
          }, 2000);
        }, index * 100);
      });
      
      // Reset contact section background
      setTimeout(() => {
        contactSection.style.background = '';
      }, 3000);
    }
  }
  
  // Enhanced social media links functionality
  function setupSocialLinks() {
    const socialLinks = document.querySelectorAll('.contact__link');
    
    socialLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        // For demo purposes, show an alert since URLs aren't provided
        if (link.getAttribute('href') === '#') {
          e.preventDefault();
          
          const img = link.querySelector('img');
          const platform = img ? img.getAttribute('src').split('/').pop().split('.')[0] : 'social media';
          
          // Create custom notification
          showNotification(`${platform.toUpperCase()} link coming soon!`, 'info');
        }
      });
      
      // Add hover effects
      link.addEventListener('mouseenter', function() {
        link.style.transform = 'scale(1.1) rotate(5deg)';
        link.style.transition = 'all 0.2s ease';
      });
      
      link.addEventListener('mouseleave', function() {
        link.style.transform = '';
      });
    });
  }
  
  // Custom notification system
  function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.custom-notification');
    existing.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `custom-notification ${type}`;
    notification.textContent = message;
    
    // Add notification styles
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        .custom-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #3b82f6;
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          z-index: 10000;
          animation: slideIn 0.3s ease;
          font-weight: 500;
        }
        
        .custom-notification.info {
          background: #3b82f6;
        }
        
        .custom-notification.success {
          background: #10b981;
        }
        
        .custom-notification.warning {
          background: #f59e0b;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
  
  // Initialize contact functionality
  setupContactButton();
  setupSocialLinks();
}

// ================= CONTACT BUTTON INITIALIZATION =================

// Initialize contact button functionality when DOM is ready
function initializeContactButton() {
  console.log('Contact button initialization disabled - handled by React Router');
  // Contact button functionality is now handled in PageLoader component
  return;
}

// Standalone contact button setup (can be called independently)
function setupContactButtonStandalone() {
  console.log('Setting up contact button standalone...');
  
  // Find all possible contact button selectors
  const selectors = [
    '.outro__button', 
    '.button[href*="contact"]', 
    'a[href*="contact.html"]',
    'a[href="contact.html"]',
    'a[href="/contact.html"]',
    '.outro .button',
    '[class*="contact"][class*="button"]'
  ];
  
  let contactButtons = [];
  
  // Try each selector to find contact buttons
  selectors.forEach(selector => {
    const found = document.querySelectorAll(selector);
    if (found.length > 0) {
      console.log(`Found ${found.length} elements with selector: ${selector}`);
      contactButtons = [...contactButtons, ...Array.from(found)];
    }
  });
  
  // Remove duplicates
  contactButtons = [...new Set(contactButtons)];
  
  console.log(`Total contact buttons found: ${contactButtons.length}`);
  
  if (contactButtons.length === 0) {
    console.warn('No contact buttons found. Available buttons:', 
      Array.from(document.querySelectorAll('button, a, .button')).map(el => ({
        tag: el.tagName,
        class: el.className,
        href: el.href,
        text: el.textContent?.trim()
      }))
    );
    return;
  }
  
  contactButtons.forEach((button, index) => {
    console.log(`Setting up contact button ${index + 1}:`, {
      tag: button.tagName,
      class: button.className,
      href: button.href,
      text: button.textContent?.trim()
    });
    
    // Remove existing listeners by cloning
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add enhanced click functionality
    newButton.addEventListener('click', function(e) {
      console.log('Contact button clicked!');
      e.preventDefault();
      
      // Add loading state
      const originalText = newButton.textContent;
      const originalHref = newButton.getAttribute('href');
      
      console.log('Original text:', originalText);
      console.log('Original href:', originalHref);
      
      newButton.textContent = 'Loading...';
      newButton.style.pointerEvents = 'none';
      newButton.classList.add('loading');
      
      // Create ripple effect
      createRippleEffectStandalone(newButton, e);
      
      // Show feedback animation
      newButton.style.transform = 'scale(0.95)';
      newButton.style.transition = 'all 0.3s ease';
      
      // Navigate after animation
      setTimeout(() => {
        console.log('Navigating to contact page...');
        
        // Check if we're in a React app (HashRouter)
        const currentHash = window.location.hash;
        console.log('Current hash:', currentHash);
        console.log('Current pathname:', window.location.pathname);
        
        // For React HashRouter navigation
        if (currentHash.includes('#/contact')) {
          console.log('Already on contact page, highlighting info...');
          // If already on contact page, scroll to top and highlight content
          window.scrollTo({ top: 0, behavior: 'smooth' });
          highlightContactInfoStandalone();
          resetButton();
        } else {
          console.log('Navigating to contact page via React Router...');
          
          // Navigate using HashRouter format
          const contactUrl = window.location.pathname + '#/contact';
          console.log('Target URL:', contactUrl);
          
          // Use both methods to ensure navigation works
          window.location.hash = '#/contact';
          
          // Fallback: Direct navigation
          setTimeout(() => {
            if (!window.location.hash.includes('contact')) {
              window.location.href = contactUrl;
            }
          }, 100);
          
          resetButton();
        }
      }, 300);
      
      function resetButton() {
        setTimeout(() => {
          newButton.textContent = originalText;
          newButton.style.pointerEvents = '';
          newButton.classList.remove('loading');
          newButton.style.transform = '';
        }, 1000);
      }
    });
    
    // Add hover effects
    newButton.addEventListener('mouseenter', function() {
      if (!newButton.classList.contains('loading')) {
        newButton.style.transform = 'translateY(-2px) scale(1.02)';
        newButton.style.transition = 'all 0.3s ease';
      }
    });
    
    newButton.addEventListener('mouseleave', function() {
      if (!newButton.classList.contains('loading')) {
        newButton.style.transform = '';
      }
    });
    
    console.log(`Contact button ${index + 1} setup complete!`);
  });
}

// Standalone ripple effect function
function createRippleEffectStandalone(button, event) {
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.classList.add('ripple-effect');
  
  // Add ripple styles if not already added
  if (!document.querySelector('#ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'ripple-styles';
    style.textContent = `
      .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        z-index: 1000;
      }
      
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      .outro__button, .button {
        position: relative !important;
        overflow: hidden !important;
      }
      
      .loading {
        opacity: 0.7 !important;
        cursor: wait !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  button.appendChild(ripple);
  
  // Remove ripple after animation
  setTimeout(() => {
    if (ripple && ripple.parentNode) {
      ripple.remove();
    }
  }, 600);
}

// Standalone highlight function
function highlightContactInfoStandalone() {
  const contactSection = document.querySelector('.contact');
  const contactItems = document.querySelectorAll('.connect-contact__item');
  
  if (contactSection) {
    console.log('Highlighting contact section...');
    // Add highlight class to contact section
    contactSection.style.background = 'rgba(59, 130, 246, 0.05)';
    contactSection.style.transition = 'all 0.5s ease';
    
    // Animate contact items
    contactItems.forEach((item, index) => {
      setTimeout(() => {
        item.style.transform = 'scale(1.05)';
        item.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)';
        item.style.transition = 'all 0.3s ease';
        
        // Reset after highlight
        setTimeout(() => {
          item.style.transform = '';
          item.style.boxShadow = '';
        }, 2000);
      }, index * 100);
    });
    
    // Reset contact section background
    setTimeout(() => {
      contactSection.style.background = '';
    }, 3000);
  }
}

// Initialize immediately and also on DOM ready
initializeContactButton();

// Also make it available globally for manual calling
window.setupContactButton = setupContactButtonStandalone;

// Attach listeners on initial load (guarded)
attachUIEventListeners();

// Allow React/SPA to call this after page injection
window.attachUIEventListeners = attachUIEventListeners;

function attachSpollerListeners() {
  if (window.__spollerListenersAttached) return;
  window.__spollerListenersAttached = true;
  const spollerButtons = document.querySelectorAll("[data-spoller] .spollers-faq__button");
  spollerButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const currentItem = button.closest("[data-spoller]");
      const content = currentItem.querySelector(".spollers-faq__text");
      const parent = currentItem.parentNode;
      const isOneSpoller = parent.hasAttribute("data-one-spoller");
      if (isOneSpoller) {
        const allItems = parent.querySelectorAll("[data-spoller]");
        allItems.forEach((item) => {
          if (item !== currentItem) {
            const otherContent = item.querySelector(".spollers-faq__text");
            item.classList.remove("active");
            otherContent.style.maxHeight = null;
          }
        });
      }
      if (currentItem.classList.contains("active")) {
        currentItem.classList.remove("active");
        content.style.maxHeight = null;
      } else {
        currentItem.classList.add("active");
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });
}
attachSpollerListeners();
window.attachSpollerListeners = attachSpollerListeners;

// ================== Configuration-Based Scanner Initialization ==================

/**
 * Initialize configuration system
 */
async function initConfigSystem() {
  try {
    // Check if configuration files are loaded
    if (typeof configManager === 'undefined') {
      console.warn('⚠️ Configuration manager not loaded, using defaults');
      return null;
    }
    
    // Initialize configuration manager
    await configManager.init();
    
    console.log('✅ Configuration system initialized');
    console.log('📊 Configuration summary:', configManager.getSummary());
    
    return configManager.getConfig();
  } catch (error) {
    console.error('❌ Failed to initialize configuration system:', error);
    return null;
  }
}

// Initialize config system on load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initConfigSystem().then(config => {
      if (config) {
        console.log('🎯 Scanner ready with configuration-based features');
      }
    });
  });
}

// Make init function available globally
window.initConfigSystem = initConfigSystem;

// ================== Link Safety Scanner ==================
function initScanner() {
  // Reset scanner state to allow reinitialization
  const input = document.getElementById("scannerInput");
  const scanBtn = document.getElementById("scanBtn");
  const restartBtn = document.getElementById("restartBtn");
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  const resultsEl = document.getElementById("results");
  const historyList = document.getElementById("historyList");
  const summaryEl = document.getElementById("scanSummary");
  const filterButtons = document.querySelectorAll('.filter-button[data-filter]');
  
  // Elements for visual improvements
  const progressContainer = document.getElementById("progressContainer");
  const progressBar = document.getElementById("progressBar");
  
  // Concurrency cap from configuration (with fallback)
  const getMaxConcurrentScans = () => {
    const config = window.configManager ? window.configManager.getConfig() : {};
    return config.scanning?.maxConcurrentRequests || 3;
  };
  const MAX_CONCURRENT_SCANS = getMaxConcurrentScans();
  let currentHistoryFilter = 'all';

  if (!input || !scanBtn || !resultsEl) return;

  // Remove existing event listeners to prevent duplicates
  const newScanBtn = scanBtn.cloneNode(true);
  scanBtn.parentNode.replaceChild(newScanBtn, scanBtn);
  
  if (restartBtn) {
    const newRestartBtn = restartBtn.cloneNode(true);
    restartBtn.parentNode.replaceChild(newRestartBtn, restartBtn);
  }

  // Update references to new elements
  const scanButton = newScanBtn;
  const restartButton = document.getElementById("restartBtn");

  // ============== Progress Bar Functions ==============
  function showProgress() {
    if (progressContainer) {
      progressContainer.classList.add('active');
      progressBar.style.width = '0%';
    }
  }

  function updateProgress(percentage) {
    if (progressBar) {
      progressBar.style.width = percentage + '%';
    }
  }

  function hideProgress() {
    if (progressContainer) {
      setTimeout(() => {
        progressContainer.classList.remove('active');
      }, 500);
    }
  }

  // No tracking needed: we won't show final percentage in the live preview area.

  const commonMisspellings = [
    "definately",
    "seperate",
    "occured",
    "recieve",
    "untill",
    "adress",
    "calender",
    "goverment",
    "enviroment",
    "publically",
    "occassion",
    "accomodate",
    "independant",
    "refered",
    "comming",
    "limted",
  ];

  const socialMediaDomains = new Set([
    "youtube.com",
    "youtu.be",
    "facebook.com",
    "fb.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "tiktok.com",
    "reddit.com"
  ]);

  const newsDomains = new Set([
    "nytimes.com",
    "cnn.com",
    "bbc.co.uk",
    "theguardian.com",
    "reuters.com",
    "apnews.com",
    "bloomberg.com",
    "wsj.com"
  ]);

  const researchDomains = new Set([
    "arxiv.org",
    "nature.com",
    "sciencedirect.com",
    "springer.com",
    "acm.org",
    "ieee.org",
    "nih.gov",
    "ncbi.nlm.nih.gov",
    "who.int"
  ]);

  const companyDomains = new Set([
    "microsoft.com",
    "google.com",
    "apple.com",
    "amazon.com",
    "meta.com",
    "openai.com",
    "adobe.com"
  ]);

  // Lightweight integration with local no-API scanner (if running on port 5050)
  async function tryLocalScan(url) {
    if (window.URLY_STATIC_DEPLOYMENT === true) return null;

    try {
      // Get configuration settings
      const config = window.configManager ? window.configManager.getConfig() : {};
      const apiEndpoint = config.api?.endpoint || 'http://localhost:5050/api/scan';
      // Keep the interface responsive even when network checks are unavailable.
      const timeout = Math.min(Math.max(config.api?.timeout || 12000, 5000), 12000);
      const scanningOptions = config.scanning || {};
      const heuristicsOptions = config.heuristics || {};
      const gsbOptions = config.api?.googleSafeBrowsing || {};
      
      // Build options object
      const options = {
        enableDNS: scanningOptions.enableDNSLookup !== false,
        enableSSL: scanningOptions.enableSSLCheck !== false,
        enableContent: scanningOptions.enableContentAnalysis !== false,
        followRedirects: scanningOptions.followRedirects !== false,
        maxRedirects: scanningOptions.maxRedirects || 5,
        enableGSB: gsbOptions.enabled !== false,
        enableHeuristics: heuristicsOptions.enabled !== false,
        heuristicWeights: heuristicsOptions.weights || {},
        safetyWeights: config.safetyScore?.weights || {}
      };
      
      // Log configuration being sent
      console.log('🔍 Scanning with configuration:', {
        enableGSB: options.enableGSB,
        enableHeuristics: options.enableHeuristics,
        enableDNS: options.enableDNS,
        enableSSL: options.enableSSL,
        weightsCount: Object.keys(options.heuristicWeights).length
      });
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      let resp;
      try {
        resp = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, options }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
      
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn('Scan timeout for URL:', url);
      }
      return null; // scanner not running or blocked; fall back to heuristics only
    }
  }

  // ==================== ADVANCED PHISHING DETECTION PATTERNS ====================
  
  // Known phishing keywords and patterns
  const phishingKeywords = new Set([
    "verify", "confirm", "suspend", "urgent", "immediate", "expired", "locked",
    "security", "alert", "warning", "action", "required", "update", "billing",
    "payment", "account", "login", "signin", "secure", "validation", "authenticate",
    "unauthorized", "unusual", "activity", "click", "here", "now", "limited", "time"
  ]);
  
  // Common phishing URL patterns
  const phishingPatterns = [
    /\b(secure|safety|security|verify|confirm|update|login|signin)[-_]?[a-z0-9]*\.(tk|ml|cf|ga|gq|xyz|top|click)/i,
    /\b[a-z0-9]+-?(login|signin|verify|secure|update|account)\./i,
    /\b(paypal|amazon|apple|google|microsoft|facebook|instagram|twitter|linkedin|netflix|ebay)[-_][a-z0-9]+\./i,
    /\b[a-z0-9]+(paypal|amazon|apple|google|microsoft|facebook|instagram|twitter|linkedin|netflix|ebay)\./i,
    /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/,  // IP addresses
    /[a-z0-9]{20,}\.(com|net|org)/i,  // Very long random domains
    /[a-z]+-?[0-9]+-?[a-z]+\.(com|net|org)/i,  // Mixed letters and numbers
  ];
  
  // Brand impersonation patterns (more comprehensive)
  const brandImpersonationPatterns = [
    { brand: "paypal", patterns: [/p[a4y]yp[a4l]l?/i, /payp[a4]l/i, /p[a4]yp[a4]l/i] },
    { brand: "amazon", patterns: [/[a4]m[a4]z[o0]n/i, /amaz[o0]n/i, /amazon[a-z0-9]/i] },
    { brand: "apple", patterns: [/[a4]ppl[e3]/i, /appl[e3]/i, /apple[a-z0-9]/i] },
    { brand: "google", patterns: [/g[o0]{1,2}gl[e3]/i, /googl[e3]/i, /google[a-z0-9]/i] },
    { brand: "microsoft", patterns: [/micr[o0]s[o0]ft/i, /micro[s5]oft/i, /microsoft[a-z0-9]/i] },
    { brand: "facebook", patterns: [/f[a4]ceb[o0]{1,2}k/i, /facebook[a-z0-9]/i] },
    { brand: "netflix", patterns: [/n[e3]tfl[i1]x/i, /netflix[a-z0-9]/i] },
    { brand: "ebay", patterns: [/[e3]b[a4]y/i, /ebay[a-z0-9]/i] },
    { brand: "instagram", patterns: [/[i1]nst[a4]gr[a4]m/i, /instagram[a-z0-9]/i] },
    { brand: "twitter", patterns: [/tw[i1]tt[e3]r/i, /twitter[a-z0-9]/i] },
    { brand: "linkedin", patterns: [/l[i1]nk[e3]d[i1]n/i, /linkedin[a-z0-9]/i] }
  ];
  
  // URL obfuscation patterns
  const obfuscationPatterns = [
    /%[0-9a-f]{2}/gi,  // URL encoding
    /\\u[0-9a-f]{4}/gi,  // Unicode escapes
    /\\x[0-9a-f]{2}/gi,  // Hex escapes
    /[^\x20-\x7E]/g,  // Non-printable characters
    /[а-я]/gi,  // Cyrillic characters (common in IDN attacks)
    /[α-ω]/gi,  // Greek characters
    /[\u4e00-\u9fff]/g,  // Chinese characters
    /[\u3040-\u309f\u30a0-\u30ff]/g,  // Japanese characters
  ];
  
  // Suspicious file extensions in URLs
  const suspiciousExtensions = new Set([
    "exe", "bat", "cmd", "com", "pif", "scr", "vbs", "js", "jar", "zip", "rar", "7z", "dmg", "pkg", "deb", "rpm"
  ]);
  
  // Heuristic lists for unsafe link patterns
  const suspiciousTlds = new Set(["ru", "cn", "biz", "tk", "xyz", "rest", "work", "zip", "top", "guru", "click", "to", "ml", "cf", "ga", "gq"]);
  const shortenerHosts = new Set([
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "is.gd",
    "buff.ly",
    "cutt.ly",
    "short.ly",
    "short.link",
    "rb.gy",
    "s.id",
    ".co",
    ".c"
  ]);
  const wrongProtocolPatterns = ["hxxp://", "hxxps://", "htp://", "htt://", "hxtp://", "hxxtp://"];
  const fakeWwwRegex = /^(ww(?!w\.)|www\d\.|vvw\.|wvw\.)/i; // ww., www1., vvw., wvw.
  // Typosquat patterns: require a digit substitution to avoid flagging the exact brand word
  const brandLeetRegexes = [
    { brand: "google", re: /g[o0]{2}g[l1]e/i, canonical: "google.com", requireDigit: true },
    { brand: "facebook", re: /f[a4]ce(?:b|8)[o0]{2}k|faceb[o0]{2}k/i, canonical: "facebook.com", requireDigit: true },
    { brand: "yahoo", re: /yah[o0]{2}/i, canonical: "yahoo.com", requireDigit: true },
    { brand: "microsoft", re: /micr[o0]s[o0]ft|micr0soft/i, canonical: "microsoft.com", requireDigit: true },
    { brand: "apple", re: /app[l1]e/i, canonical: "apple.com", requireDigit: true },
    { brand: "amazon", re: /am[a4]z[o0]n/i, canonical: "amazon.com", requireDigit: true }
  ];
  const brandAttachWords = ["login", "secure", "update", "verify", "free", "gift", "support"];

  // ==================== PHISHING DETECTION FUNCTIONS ====================
  
  function detectPhishingPatterns(url, hostname, path) {
    const phishingFlags = [];
    const phishingNotes = [];
    let phishingScore = 0;
    
    // Check for IP address instead of domain name
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      phishingFlags.push("ip-address");
      phishingNotes.push("Uses IP address instead of domain name - highly suspicious");
      phishingScore += 30;
    }
    
    // Check for URL obfuscation
    const fullUrl = url.toLowerCase();
    let obfuscationCount = 0;
    obfuscationPatterns.forEach(pattern => {
      const matches = fullUrl.match(pattern);
      if (matches) {
        obfuscationCount += matches.length;
      }
    });
    
    if (obfuscationCount > 3) {
      phishingFlags.push("url-obfuscation");
      phishingNotes.push(`High level of URL obfuscation detected (${obfuscationCount} instances)`);
      phishingScore += 25;
    } else if (obfuscationCount > 0) {
      phishingFlags.push("minor-obfuscation");
      phishingNotes.push(`URL obfuscation detected (${obfuscationCount} instances)`);
      phishingScore += 10;
    }
    
    // Check for brand impersonation
    brandImpersonationPatterns.forEach(brand => {
      brand.patterns.forEach(pattern => {
        if (pattern.test(hostname) && !hostname.includes(brand.brand)) {
          phishingFlags.push("brand-impersonation");
          phishingNotes.push(`Possible ${brand.brand} impersonation detected`);
          phishingScore += 40;
        }
      });
    });
    
    // Check for phishing keywords in URL
    let keywordCount = 0;
    phishingKeywords.forEach(keyword => {
      if (fullUrl.includes(keyword)) {
        keywordCount++;
      }
    });
    
    if (keywordCount >= 3) {
      phishingFlags.push("high-phishing-keywords");
      phishingNotes.push(`High concentration of phishing keywords (${keywordCount} found)`);
      phishingScore += 35;
    } else if (keywordCount >= 1) {
      phishingFlags.push("phishing-keywords");
      phishingNotes.push(`Phishing keywords detected (${keywordCount} found)`);
      phishingScore += 15;
    }
    
    // Check for suspicious patterns
    phishingPatterns.forEach(pattern => {
      if (pattern.test(fullUrl)) {
        phishingFlags.push("suspicious-pattern");
        phishingNotes.push("URL matches known phishing pattern");
        phishingScore += 30;
      }
    });
    
    // Check for suspicious file extensions
    const pathLower = path.toLowerCase();
    suspiciousExtensions.forEach(ext => {
      if (pathLower.includes('.' + ext)) {
        phishingFlags.push("suspicious-file");
        phishingNotes.push(`Suspicious file extension detected: .${ext}`);
        phishingScore += 20;
      }
    });
    
    // Check for excessive subdomain levels (subdomain stuffing)
    const subdomains = hostname.split('.');
    if (subdomains.length > 4) {
      phishingFlags.push("subdomain-stuffing");
      phishingNotes.push(`Excessive subdomain levels (${subdomains.length}) - possible subdomain stuffing`);
      phishingScore += 15;
    }
    
    // Check for lookalike domains (homograph attacks)
    const suspiciousChars = /[\u0430-\u044f\u03b1-\u03c9]/gi;  // Cyrillic and Greek
    if (suspiciousChars.test(hostname)) {
      phishingFlags.push("homograph-attack");
      phishingNotes.push("Domain contains lookalike characters (possible homograph attack)");
      phishingScore += 45;
    }
    
    // Check for very long domains (often random)
    if (hostname.length > 50) {
      phishingFlags.push("long-domain");
      phishingNotes.push(`Unusually long domain name (${hostname.length} characters)`);
      phishingScore += 10;
    }
    
    // Check for mixed case in unusual patterns
    if (/[A-Z].*[a-z].*[A-Z]/.test(hostname)) {
      phishingFlags.push("mixed-case");
      phishingNotes.push("Unusual mixed case pattern in domain");
      phishingScore += 5;
    }
    
    return { flags: phishingFlags, notes: phishingNotes, score: phishingScore };
  }

  function analyzeUrlHeuristics(urlString, rawInput) {
    const flags = [];
    const notes = [];
    let host = "";
    let tld = "";
    let pathname = "";
    try {
      const u = new URL(urlString);
      host = normalizeHost(u.hostname);
      pathname = u.pathname || "";
      tld = (host.split(".").pop() || "").toLowerCase();
      // Shorteners (exact or subdomain)
      if ([...shortenerHosts].some((d) => domainMatches(host, d))) {
        flags.push("shortener");
        notes.push("Appears to use a link shortener.");
      } else {
        // Lookalike shorteners: same TLD and ending with known shortener second-level label (e.g. keanbit.ly vs bit.ly)
        // Extract second-level (SLD) + TLD for host and known shorteners to compare suffixes.
        const hostParts = host.split('.');
        if (hostParts.length >= 2) {
          const sld = hostParts.slice(-2)[0]; // e.g. 'keanbit' in keanbit.ly
          const tld = hostParts.slice(-1)[0];
          for (const sh of shortenerHosts) {
            const shParts = sh.split('.');
            if (shParts.length >= 2) {
              const shSld = shParts.slice(-2)[0]; // 'bit' in bit.ly
              const shTld = shParts.slice(-1)[0];
              if (tld === shTld && sld.endsWith(shSld) && sld !== shSld) {
                flags.push("shortener-lookalike");
                notes.push(`Hostname ends with known shortener label '${shSld}' (possible impersonation).`);
                break;
              }
            }
          }
        }
      }
      // Fake www
      if (fakeWwwRegex.test(u.host)) {
        flags.push("fake-www");
        notes.push("Hostname starts with suspicious www variant.");
      }
      // Suspicious TLD
      if (suspiciousTlds.has(tld)) {
        flags.push("suspicious-tld");
        notes.push(`Suspicious top-level domain .${tld}.`);
      }
      // Brand + attach words
      const hostPath = (u.hostname + u.pathname).toLowerCase();
      for (const kw of brandAttachWords) {
        for (const b of ["google", "facebook", "yahoo", "microsoft", "apple", "amazon", "meta", "instagram", "twitter", "linkedin"]) {
          if (hostPath.includes(b + kw) || hostPath.includes(kw + b)) {
            flags.push("brand-keyword");
            notes.push(`Brand name appears attached to word '${kw}'.`);
            break;
          }
        }
      }
      // Typosquatting with leetspeak
      for (const r of brandLeetRegexes) {
        // Skip official domains (e.g., *.facebook.com is not typosquat)
        if (r.canonical && domainMatches(host, r.canonical)) continue;
        if (r.re.test(host)) {
          if (r.requireDigit && !/[0-9]/.test(host)) {
            // Match found but no digit substitution present; treat as benign brand mention
            continue;
          }
          flags.push("typosquat");
          notes.push(`Hostname resembles a leetspeak variant of ${r.brand}.`);
          break;
        }
      }
      // Non-http(s) protocol handled earlier; but detect obfuscated in raw
    } catch (e) {
      // ignore parse error here
    }
    // Wrong protocol spellings in raw input
    const raw = (rawInput || "").trim();
    if (raw) {
      const rawLower = raw.toLowerCase();
      if (wrongProtocolPatterns.some((p) => rawLower.startsWith(p))) {
        flags.push("wrong-protocol");
        notes.push("Protocol appears obfuscated or misspelled.");
      }
    }
    // ==================== INTEGRATE PHISHING DETECTION ====================
    const phishingAnalysis = detectPhishingPatterns(urlString, host, pathname);
    flags.push(...phishingAnalysis.flags);
    notes.push(...phishingAnalysis.notes);
    
    // Add phishing score to the analysis
    const phishingScore = phishingAnalysis.score;
    if (phishingScore >= 50) {
      flags.push("high-phishing-risk");
      notes.push(`High phishing risk detected (score: ${phishingScore})`);
    } else if (phishingScore >= 25) {
      flags.push("moderate-phishing-risk");
      notes.push(`Moderate phishing risk detected (score: ${phishingScore})`);
    } else if (phishingScore > 0) {
      flags.push("low-phishing-risk");
      notes.push(`Low phishing risk detected (score: ${phishingScore})`);
    }
    
    return { flags, notes, tld, phishingScore };
  }

  function domainMatches(hostname, root) {
    const h = normalizeHost(hostname);
    const r = root.toLowerCase();
    return h === r || h.endsWith("." + r);
  }

  function categorizeHost(hostname) {
    const host = normalizeHost(hostname);
    const tld = host.split(".").pop();
    const lowerHost = host;
    // TLD-based
    if (/(^|\.)gov(\.|$)/.test(lowerHost) || tld === "gov") {
      return { category: "Government", trusted: true };
    }
    if (tld === "edu" || /(^|\.)ac\./.test(lowerHost)) {
      return { category: "Education", trusted: true };
    }
    if (domainMatches(lowerHost, "who.int")) {
      return { category: "International Organization", trusted: true };
    }
    // List-based
    for (const d of socialMediaDomains) if (domainMatches(lowerHost, d)) return { category: "Social Media", trusted: true };
    for (const d of newsDomains) if (domainMatches(lowerHost, d)) return { category: "News / Media", trusted: true };
    for (const d of researchDomains) if (domainMatches(lowerHost, d)) return { category: "Research / Study", trusted: true };
    for (const d of companyDomains) if (domainMatches(lowerHost, d)) return { category: "Company", trusted: true };
    if (lowerHost.endsWith(".org")) return { category: "Organization / Nonprofit", trusted: false };
    return { category: "General Website", trusted: false };
  }

  function normalizeHost(hostname) {
    return hostname.replace(/^www\./i, "").toLowerCase();
  }

  function parseLinksFromHtml(html, baseUrl) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const anchors = Array.from(doc.querySelectorAll("a[href]"));
      const baseHost = (() => {
        try {
          return normalizeHost(new URL(baseUrl).hostname);
        } catch (e) {
          return "";
        }
      })();

      let externalCount = 0;
      anchors.forEach((a) => {
        let href = a.getAttribute("href") || "";
        if (!href) return;
        try {
          const urlObj = new URL(href, baseUrl);
          const isExternal = normalizeHost(urlObj.hostname) !== baseHost;
          if (isExternal) externalCount += 1;
        } catch (e) {
          // ignore bad hrefs in HTML
        }
      });
      const text = doc.body ? doc.body.textContent || "" : "";
      return { externalCount, textContent: text };
    } catch (e) {
      return { externalCount: 0, textContent: "" };
    }
  }

  async function fetchPageHtmlWithProxy(url, timeoutMs = 1500) {
    // If running from file:// or offline, avoid network fetches — return null to indicate unavailable
    try {
      if (typeof window !== 'undefined' && (window.location.protocol === 'file:' || (typeof navigator !== 'undefined' && navigator.onLine === false))) {
        return null;
      }
    } catch (e) {
      // fall through to attempt fetch
    }

    const proxies = [
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://r.jina.ai/http://${u.replace(/^https?:\/\//i, "")}`
    ];

    // Helper to fetch with a timeout via AbortController
    async function fetchWithTimeout(endpoint, ms) {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const id = ctl ? setTimeout(() => ctl.abort(), ms) : null;
      try {
        const res = await fetch(endpoint, { method: "GET", signal: ctl ? ctl.signal : undefined });
        if (res && res.ok) return await res.text();
      } catch (e) {
        // ignore and move to next proxy
      } finally {
        if (id) clearTimeout(id);
      }
      return null;
    }

    for (const make of proxies) {
      const endpoint = make(url);
      const txt = await fetchWithTimeout(endpoint, timeoutMs);
      if (txt) return txt;
    }
    // Return null rather than throwing so callers can handle "no deep scan available" gracefully
    return null;
  }

  function analyzeTextForSuspicion(text) {
    const lower = text.toLowerCase();
    const foundMisspellings = [];
    commonMisspellings.forEach((w) => {
      if (lower.includes(w)) foundMisspellings.push(w);
    });

    return { foundMisspellings };
  }

  function computeRiskScore({ isHttps, externalLinks, foundMisspellings, categoryInfo, heuristicFlags, tld, phishingScore }) {
    let risk = 0;
    const reasons = [];
    // Policy: HTTP is not safe, HTTPS is required for safety
    if (!isHttps) {
      risk = 100; // max risk for HTTP
      reasons.push("HTTP detected: only HTTPS is considered safe.");
    } else {
      reasons.push("HTTPS detected: baseline safe.");
    }

    // If deep content checks couldn't run (no externalLinks number), lower confidence
    if (typeof externalLinks !== "number") {
      // Penalize lack of content fetch — this reduces overly-confident 'Very Safe' labels
      risk += 20;
      reasons.push("Deep content checks unavailable (page not fetched).");
    }

    if (Array.isArray(heuristicFlags) && heuristicFlags.length) {
      let extra = 0;
      heuristicFlags.forEach((f) => {
        if (f === "wrong-protocol") extra += 25;
        else if (f === "fake-www") extra += 15;
  else if (f === "shortener") extra += 35; // Increased to trigger "Not Safe" level (below 70%)
  else if (f === "shortener-lookalike") extra += 30; // stronger weight for impersonation of a shortener
        else if (f === "suspicious-tld") extra += 14;
        else if (f === "typosquat") extra += 20;
        else if (f === "brand-keyword") extra += 10;
        // ==================== PHISHING-SPECIFIC FLAGS ====================
        else if (f === "ip-address") extra += 35;
        else if (f === "brand-impersonation") extra += 40;
        else if (f === "homograph-attack") extra += 45;
        else if (f === "url-obfuscation") extra += 25;
        else if (f === "suspicious-pattern") extra += 30;
        else if (f === "phishing-keywords") extra += 15;
        else if (f === "high-phishing-keywords") extra += 35;
        else if (f === "suspicious-file") extra += 20;
        else if (f === "subdomain-stuffing") extra += 15;
        else if (f === "high-phishing-risk") extra += 60;
        else if (f === "moderate-phishing-risk") extra += 30;
        else if (f === "low-phishing-risk") extra += 10;
        else if (f === "domain-not-found") extra += 80; // Very high penalty for non-existent domains
        else extra += 6;
      });
      risk += extra;
      reasons.push(`Heuristic flags: ${heuristicFlags.join(' • ')}.`);
    }

    // ==================== PHISHING SCORE ADJUSTMENT ====================
    if (phishingScore && phishingScore > 0) {
      risk += phishingScore;
      if (phishingScore >= 50) {
        reasons.push(`Critical phishing risk detected (score: ${phishingScore})`);
      } else if (phishingScore >= 25) {
        reasons.push(`Moderate phishing risk detected (score: ${phishingScore})`);
      } else {
        reasons.push(`Low phishing risk detected (score: ${phishingScore})`);
      }
    }

    // Apply baseline TLD risk AFTER additive flags so we can clamp
    if (tld) {
      if (tld === 'to') {
        if (risk < 55) {
          risk = 55;
          reasons.push('Baseline risk elevated due to policy for TLD .to.');
        }
      }
    }

    if (Array.isArray(foundMisspellings)) {
      if (foundMisspellings.length >= 3) {
        risk += 20;
        reasons.push("Multiple common misspellings detected.");
      } else if (foundMisspellings.length === 2) {
        risk += 12;
        reasons.push("Some misspellings detected.");
      } else if (foundMisspellings.length === 1) {
        risk += 6;
        reasons.push("A misspelling was detected.");
      } else {
        reasons.push("No common misspellings detected.");
      }
    }

    if (typeof externalLinks === "number") {
      if (externalLinks > 50) {
        risk += 20;
        reasons.push(`High number of external links (${externalLinks}).`);
      } else if (externalLinks > 20) {
        risk += 12;
        reasons.push(`Many external links (${externalLinks}).`);
      } else if (externalLinks > 10) {
        risk += 6;
        reasons.push(`Some external links (${externalLinks}).`);
      } else {
        reasons.push(`Few external links (${externalLinks}).`);
      }
    }

    // Trusted categories reduce sensitivity to content-only flags
    if (categoryInfo && categoryInfo.trusted) {
      risk = Math.max(0, Math.round(risk * 0.6));
      reasons.push(`Trusted category: ${categoryInfo.category}.`);
    } else if (categoryInfo) {
      reasons.push(`Category: ${categoryInfo.category}.`);
    }

  // Map: any HTTP stays unsafe, HTTPS can still move to caution/unsafe if other severe issues found
  let status = isHttps ? "safe" : "unsafe";
  if (risk >= 50) status = "unsafe";
  else if (risk >= 20) status = "caution";

    return { risk, status, reasons };
  }

  function calculateSafetyRating(risk, phishingScore = 0) {
    // Convert risk score (0-100+) to safety rating (10%-100%)
    // Higher risk = lower safety rating
    // Include phishing score for better accuracy with suspicious patterns like shorteners
    const totalRisk = risk + phishingScore;
    const safetyRating = Math.max(10, Math.min(100, 100 - totalRisk));
    return Math.round(safetyRating);
  }

  function getSafetyLevel(safetyRating) {
    // Make HTTP always read as Not Safe or Very Unsafe due to max risk mapping above
    if (safetyRating >= 90) return "Very Safe";
    if (safetyRating >= 70) return "Safe but...";
    if (safetyRating >= 30) return "Not Safe";
    return "Very Unsafe";
  }

  // Return a descriptive explanation for each 10% decile bucket and include a short summary of computed reasons.
  function getDecileExplanation(safetyRating, reasons) {
    const bucket = Math.max(0, Math.min(100, safetyRating));
    const dec = Math.floor(bucket / 10) * 10;
    const grouped = groupReasons(reasons || []);
    const summaryParts = [];
    if (grouped.protocol) summaryParts.push(grouped.protocol);
    if (grouped.fetch) summaryParts.push(grouped.fetch);
    if (grouped.heuristics) summaryParts.push(grouped.heuristics);
    if (grouped.content) summaryParts.push(grouped.content);
    if (grouped.category) summaryParts.push(grouped.category);
    const summaryLine = summaryParts.length ? `Key signals: ${summaryParts.join(' | ')}` : '';

    const messages = {
      90: `${bucket}% — Very Safe. Strong indicators of legitimacy; no major risk factors detected. ${summaryLine}`,
      80: `${bucket}% — Safe. Generally fine; only minor indicators present. ${summaryLine}`,
      70: `${bucket}% — Caution (upper). Mostly safe but some heuristics suggest a quick double-check. ${summaryLine}`,
      60: `${bucket}% — Caution. Multiple moderate indicators; verify before trusting sensitive info. ${summaryLine}`,
      50: `${bucket}% — Not Safe (borderline). Several warning signs present. ${summaryLine}`,
      40: `${bucket}% — Not Safe. Significant red flags (typos, suspicious TLD, or many external links). ${summaryLine}`,
      30: `${bucket}% — Unsafe. Strong signals of impersonation or manipulation. ${summaryLine}`,
      20: `${bucket}% — Very Unsafe. High likelihood of malicious intent. ${summaryLine}`,
      10: `${bucket}% — Extremely Unsafe. Multiple severe indicators. ${summaryLine}`,
      0:  `${bucket}% — Critical: Unsafe. Do not interact with this link. ${summaryLine}`
    };
    const key = dec >= 90 ? 90 : dec;
    return messages[key] || messages[0];
  }

  function groupReasons(reasonList) {
    // Helper function to capitalize first letter of each word and format flag names
    function formatFlagName(flagName) {
      return flagName
        .replace(/-/g, ' ')           // Replace hyphens with spaces
        .replace(/([a-z])([A-Z])/g, '$1 $2')  // Add space before capital letters
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    const lowerList = reasonList.map(r => r.toLowerCase());
    const pick = (predicate) => reasonList.find(r => predicate(r.toLowerCase()));
    const contains = (substr) => lowerList.some(r => r.includes(substr));
    const out = {};
    if (contains('uses https')) out.protocol = 'HTTPS';
    else if (contains('uses http instead')) out.protocol = 'HTTP only';
    
    if (contains('deep content checks unavailable')) out.fetch = 'No deep scan';
    else if (contains('could not fetch page')) out.fetch = 'Fetch failed';
    else if (contains('domain does not exist')) out.fetch = 'Domain does not exist';
    else if (contains('domain unreachable')) out.fetch = 'Domain unreachable';
    const flagMatch = pick(r => r.includes('heuristic flags'));
    if (flagMatch) {
      const colon = flagMatch.indexOf(':');
      if (colon !== -1) {
        // Split by bullet points (•) or commas, then clean up
        const list = flagMatch.slice(colon + 1).replace(/\.$/, '').split(/[•,]\s*/).map(s => s.trim()).filter(s => s);
        if (list.length) {
          const formattedFlags = list.slice(0,5).map(flag => formatFlagName(flag));
          out.heuristics = `Flags: ${formattedFlags.join(' • ')}`;
        }
      }
    }
    if (contains('multiple common misspellings')) out.content = 'Many misspellings';
    else if (contains('some misspellings')) out.content = 'Some misspellings';
    else if (contains('a misspelling')) out.content = '1 misspelling';
    else if (contains('no common misspellings')) out.content = (out.content || 'No misspellings');
    const extReason = pick(r => r.includes('external links'));
    if (extReason) {
      if (/few external links/i.test(extReason)) out.content = (out.content ? out.content + ', few external links' : 'Few external links');
      else if (/some external links/i.test(extReason)) out.content = (out.content ? out.content + ', some external links' : 'Some external links');
      else if (/many external links/i.test(extReason)) out.content = (out.content ? out.content + ', many external links' : 'Many external links');
      else if (/high number of external links/i.test(extReason)) out.content = (out.content ? out.content + ', high external link count' : 'High external link count');
    }
    if (contains('trusted category')) out.category = 'Trusted category';
    else {
      const catMatch = pick(r => r.startsWith('Category:'));
      if (catMatch) out.category = catMatch.replace('Category:','Category').replace(/\.$/, '').trim();
    }
    return out;
  }

  function getSafetyCircleColor(safetyRating) {
    if (safetyRating >= 90) return "#2e7d32"; // Green
    if (safetyRating >= 70) return "#f9a825"; // Yellow
    if (safetyRating >= 30) return "#f57c00"; // Orange
    return "#c62828"; // Red
  }

  function validateAndNormalizeUrl(raw) {
    let candidate = (raw || "").trim();
    if (!candidate) return null;
    if (!/^https?:\/\//i.test(candidate)) {
      candidate = "http://" + candidate;
    }
    try {
      const u = new URL(candidate);
      return u.toString();
    } catch (e) {
      return null;
    }
  }

  function renderBadge(text, className) {
    const span = document.createElement("span");
    span.className = `badge ${className || ""}`.trim();
    span.textContent = text;
    return span;
  }

  function renderResult(item) {
    const wrapper = document.createElement("div");
    let statusClass = "scanner-result--safe";
    if (item.status === "unsafe") statusClass = "scanner-result--unsafe";
    else if (item.status === "caution") statusClass = "scanner-result--caution";
    wrapper.className = `scanner-result ${statusClass}`;

    const head = document.createElement("div");
    head.className = "scanner-result__head";

    const urlEl = document.createElement("div");
    urlEl.className = "scanner-result__url";
    urlEl.textContent = item.url;

    const iconEl = document.createElement("div");
    iconEl.setAttribute("aria-label", item.status);
    iconEl.textContent = item.status === "unsafe" ? "❌" : item.status === "caution" ? "⚠️" : "✅";

    head.appendChild(urlEl);
    head.appendChild(iconEl);

    // Safety Rating Display with Circle
    const safetyRatingEl = document.createElement("div");
    safetyRatingEl.className = "scanner-result__safety-rating";
    
    const safetyCircle = document.createElement("div");
    safetyCircle.className = "safety-circle";
    safetyCircle.style.setProperty('--circle-color', getSafetyCircleColor(item.safetyRating));
    safetyCircle.textContent = `${item.safetyRating}%`;
    
    const safetyLevelEl = document.createElement("div");
    safetyLevelEl.className = "safety-level";
    safetyLevelEl.textContent = item.safetyLevel;
    
    const safetyExplanationEl = document.createElement("div");
    safetyExplanationEl.className = "safety-explanation";
    safetyExplanationEl.textContent = item.safetyExplanation;
    
    safetyRatingEl.appendChild(safetyCircle);
    safetyRatingEl.appendChild(safetyLevelEl);
    safetyRatingEl.appendChild(safetyExplanationEl);

    // Build a structured body with one row per detail for clearer spacing
    const body = document.createElement('div');
    body.className = 'scanner-result__body';

    function addDetail(label, value, extraClass) {
      const row = document.createElement('div');
      row.className = 'scanner-result__row ' + (extraClass || '');

      const lbl = document.createElement('span');
      lbl.className = 'scanner-result__label';
      lbl.textContent = label + ':';

      const val = document.createElement('span');
      val.className = 'scanner-result__value';
      val.textContent = value;

      row.appendChild(lbl);
      row.appendChild(val);
      body.appendChild(row);
    }

    addDetail('Protocol', item.isHttps ? 'HTTPS' : 'HTTP');
    
    // SSL Certificate Information (if available)
    if (item.localScan && item.localScan.tls && item.isHttps) {
      const tls = item.localScan.tls;
      if (tls.ok !== undefined && tls.ok !== null) {
        const unavailable = Boolean(tls.error);
        const sslStatus = unavailable ? '⚠ Unavailable' : (tls.ok ? '✓ Valid' : '✗ Invalid');
        const sslClass = unavailable ? 'row--ssl-unknown' : (tls.ok ? 'row--ssl-valid' : 'row--ssl-invalid');
        addDetail('SSL Certificate', sslStatus, sslClass);
        
        // Show days to expiration if available
        if (tls.daysToExpire !== null && tls.daysToExpire !== undefined) {
          let expiryText = `${tls.daysToExpire} days`;
          let expiryClass = 'row--ssl-expiry';
          
          if (tls.daysToExpire < 0) {
            expiryText += ' (EXPIRED!)';
            expiryClass = 'row--ssl-expired';
          } else if (tls.daysToExpire <= 7) {
            expiryText += ' (⚠️ Expires soon!)';
            expiryClass = 'row--ssl-warning';
          } else if (tls.daysToExpire <= 30) {
            expiryText += ' (Renew soon)';
          }
          
          addDetail('Certificate Expiry', expiryText, expiryClass);
        }
        
        // Show certificate issuer if available
        if (tls.issuer) {
          addDetail('Certificate Authority', tls.issuer);
        }
        
        // Show TLS protocol version if available
        if (tls.protocol) {
          addDetail('TLS Protocol', tls.protocol);
        }
      }
    }
    
    addDetail('Category', item.category || 'Unknown');
    addDetail('External links', typeof item.externalLinks === 'number' ? item.externalLinks : 'Unknown');
    addDetail('Risk score', `${item.risk} (${item.status.toUpperCase()})`, 'row--risk');
    addDetail('Scanned at', item.scannedAt || 'Unknown');
  const grouped = groupReasons(item.reasons || []);
  const summaryParts = [];
  
  if (grouped.protocol) summaryParts.push(grouped.protocol);
  if (grouped.fetch) summaryParts.push(grouped.fetch);
  if (grouped.heuristics) summaryParts.push(grouped.heuristics);
  if (grouped.content) summaryParts.push(grouped.content);
  if (grouped.category) summaryParts.push(grouped.category);
  
  // Enhanced fallback for better debugging with proper separation
  let summary;
  if (summaryParts.length) {
    // Use proper separators for better readability
    if (summaryParts.length > 1) {
      summary = summaryParts.join(' | ');
    } else {
      summary = summaryParts[0];
    }
  } else {
    summary = item.isSafe ? 'No notable issues' : 
     (item.reasons && item.reasons.length ? 
      `${item.reasons.length} detection${item.reasons.length > 1 ? 's' : ''} found` : 
      'Potential risks detected');
  }
      
  addDetail('Notes', summary);

    // If local scanner results exist, surface key reputation details (HTTP/DNS hidden by request)
    if (item.localScan) {
      const ls = item.localScan;
      // Reputation summary (blocklist + GSB)
      const repParts = [];
      if (ls.blocklist && typeof ls.blocklist.match === 'boolean') {
        repParts.push(ls.blocklist.match ? `blocklist match${ls.blocklist.matchType ? ' (' + ls.blocklist.matchType + ')' : ''}` : 'no blocklist match');
      }
      if (ls.gsb && ls.gsb.enabled) {
        const overallUnsafe = item.status === 'unsafe';
        if (ls.gsb.verdict === 'unsafe') {
          repParts.push('GSB unsafe');
        } else if (overallUnsafe) {
          // Reflect overall verdict in GSB display when scan says unsafe
          repParts.push('GSB unsafe (derived)');
        } else if (ls.gsb.verdict === 'safe') {
          repParts.push('GSB safe');
        } else {
          repParts.push('GSB error');
        }
      }
      if (repParts.length) addDetail('Reputation', repParts.join(', '), 'row--server');
      // HTTP and DNS details intentionally hidden
    }

    // Score Breakdown Section
    const scoreBreakdown = document.createElement('div');
    scoreBreakdown.className = 'scanner-result__score-breakdown';
    scoreBreakdown.style.display = 'none'; // Will be controlled by config
    
    if (item.localScan) {
      const breakdownTitle = document.createElement('h4');
      breakdownTitle.className = 'breakdown-title';
      breakdownTitle.innerHTML = '📊 Score Breakdown';
      scoreBreakdown.appendChild(breakdownTitle);
      
      const breakdownGrid = document.createElement('div');
      breakdownGrid.className = 'breakdown-grid';

      // Prefer the API's canonical breakdown. Every category then uses the
      // same risk-point scale (0 is good, 100 is dangerous), avoiding the old
      // mix of risk points for heuristics and safety points for other checks.
      if (Array.isArray(item.localScan.scoreBreakdown) && item.localScan.scoreBreakdown.length > 0) {
        const icons = {
          'Heuristic Analysis': '🧠',
          'Google Safe Browsing': '🛡️',
          'Blocklist': '📋',
          'DNS Lookup': '🌐',
          'SSL/TLS': '🔒'
        };

        item.localScan.scoreBreakdown.forEach((entry) => {
          const breakdownItem = document.createElement('div');
          breakdownItem.className = `breakdown-item breakdown-item--${entry.status || 'safe'}`;

          const label = document.createElement('div');
          label.className = 'breakdown-label';
          label.textContent = `${icons[entry.category] || '•'} ${entry.category || 'Security check'}`;

          const score = document.createElement('div');
          score.className = 'breakdown-score';
          score.textContent = `${Number(entry.points) || 0} risk points`;

          const detail = document.createElement('div');
          detail.className = 'breakdown-detail';
          const flags = Array.isArray(entry.flags) ? entry.flags.map((flag) => flag.name).filter(Boolean) : [];
          detail.textContent = flags.length ? flags.join(', ') : (entry.description || 'No issues found');

          breakdownItem.append(label, score, detail);
          breakdownGrid.appendChild(breakdownItem);
        });
      } else {
      // Heuristics Score
      if (item.localScan.heuristics && !item.localScan.heuristics.skipped) {
        const heuristicItem = document.createElement('div');
        heuristicItem.className = 'breakdown-item';
        heuristicItem.innerHTML = `
          <div class="breakdown-label">🧠 Heuristic Analysis</div>
          <div class="breakdown-score">${item.localScan.heuristics.score || 0} points</div>
          <div class="breakdown-detail">Flags: ${(item.localScan.heuristics.flags || []).length}</div>
        `;
        breakdownGrid.appendChild(heuristicItem);
      }
      
      // Google Safe Browsing
      if (item.localScan.gsb && item.localScan.gsb.enabled) {
        const gsbItem = document.createElement('div');
        gsbItem.className = 'breakdown-item';
        const gsbScore = item.localScan.gsb.verdict === 'safe' ? 100 : 0;
        gsbItem.innerHTML = `
          <div class="breakdown-label">🛡️ Google Safe Browsing</div>
          <div class="breakdown-score">${gsbScore} points</div>
          <div class="breakdown-detail">Status: ${item.localScan.gsb.verdict}</div>
        `;
        breakdownGrid.appendChild(gsbItem);
      }
      
      // Blocklist Check
      if (item.localScan.blocklist) {
        const blocklistItem = document.createElement('div');
        blocklistItem.className = 'breakdown-item';
        const blocklistScore = item.localScan.blocklist.match ? 0 : 100;
        blocklistItem.innerHTML = `
          <div class="breakdown-label">📋 Blocklist</div>
          <div class="breakdown-score">${blocklistScore} points</div>
          <div class="breakdown-detail">${item.localScan.blocklist.match ? 'Match found' : 'No match'}</div>
        `;
        breakdownGrid.appendChild(blocklistItem);
      }
      
      // DNS Check
      if (item.localScan.dns && !item.localScan.dns.skipped) {
        const dnsItem = document.createElement('div');
        dnsItem.className = 'breakdown-item';
        const dnsScore = item.localScan.dns.ok ? 100 : 0;
        dnsItem.innerHTML = `
          <div class="breakdown-label">🌐 DNS Lookup</div>
          <div class="breakdown-score">${dnsScore} points</div>
          <div class="breakdown-detail">${item.localScan.dns.ok ? 'Resolved' : 'Failed'}</div>
        `;
        breakdownGrid.appendChild(dnsItem);
      }
      
      // SSL/TLS Check
      if (item.localScan.tls && !item.localScan.tls.skipped) {
        const tlsItem = document.createElement('div');
        tlsItem.className = 'breakdown-item';
        const tlsUnavailable = Boolean(item.localScan.tls.error);
        const tlsScore = item.localScan.tls.ok ? 100 : 0;
        tlsItem.innerHTML = `
          <div class="breakdown-label">🔒 SSL/TLS</div>
          <div class="breakdown-score">${tlsScore} points</div>
          <div class="breakdown-detail">${tlsUnavailable ? 'Unavailable' : (item.localScan.tls.ok ? 'Valid' : 'Invalid')}</div>
        `;
        breakdownGrid.appendChild(tlsItem);
      }
      }
      
      scoreBreakdown.appendChild(breakdownGrid);
    }
    
    // Recommendations Section
    const recommendationsSection = document.createElement('div');
    recommendationsSection.className = 'scanner-result__recommendations';
    recommendationsSection.style.display = 'none'; // Will be controlled by config
    
    if (item.localScan && item.localScan.recommendations) {
      const rec = item.localScan.recommendations;
      
      const recTitle = document.createElement('h4');
      recTitle.className = 'recommendations-title';
      recTitle.innerHTML = '💡 RECOMMENDATIONS';
      recommendationsSection.appendChild(recTitle);
      
      // Messages
      if (rec.messages && rec.messages.length > 0) {
        const messagesDiv = document.createElement('div');
        messagesDiv.className = 'recommendations-messages';
        rec.messages.forEach(msg => {
          const msgEl = document.createElement('div');
          msgEl.className = 'recommendation-message';
          msgEl.textContent = msg;
          messagesDiv.appendChild(msgEl);
        });
        recommendationsSection.appendChild(messagesDiv);
      }
      
      // Actions
      if (rec.actions && rec.actions.length > 0) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'recommendations-actions';
        const actionsTitle = document.createElement('div');
        actionsTitle.className = 'actions-title';
        actionsTitle.textContent = 'Suggested Actions:';
        actionsDiv.appendChild(actionsTitle);
        
        rec.actions.forEach(action => {
          const actionEl = document.createElement('div');
          actionEl.className = 'recommendation-action';
          actionEl.textContent = `• ${action}`;
          actionsDiv.appendChild(actionEl);
        });
        recommendationsSection.appendChild(actionsDiv);
      }
      
      // Context
      if (rec.context && rec.context.length > 0) {
        const contextDiv = document.createElement('div');
        contextDiv.className = 'recommendations-context';
        const contextTitle = document.createElement('div');
        contextTitle.className = 'context-title';
        contextTitle.textContent = 'Technical Context:';
        contextDiv.appendChild(contextTitle);
        
        rec.context.forEach(ctx => {
          const ctxEl = document.createElement('div');
          ctxEl.className = 'recommendation-context-item';
          ctxEl.textContent = `ℹ️ ${ctx}`;
          contextDiv.appendChild(ctxEl);
        });
        recommendationsSection.appendChild(contextDiv);
      }
    }

    const badges = document.createElement("div");
    badges.className = "scanner-result__badges";
    // Critical badges first
    if (item.localScan && item.localScan.blocklist && item.localScan.blocklist.match) {
      badges.appendChild(renderBadge('BLOCKLIST', 'badge--critical'));
    }
    if (item.localScan && item.localScan.gsb && item.localScan.gsb.enabled) {
      const overallUnsafe = item.status === 'unsafe';
      if (item.localScan.gsb.verdict === 'unsafe') {
        badges.appendChild(renderBadge('GSB: UNSAFE', 'badge--critical'));
      } else if (overallUnsafe) {
        // Show derived unsafe state when overall verdict is unsafe
        badges.appendChild(renderBadge('GSB: UNSAFE (derived)', 'badge--critical'));
      } else if (item.localScan.gsb.verdict === 'safe') {
        badges.appendChild(renderBadge('GSB: SAFE', 'badge--ok'));
      } else {
        badges.appendChild(renderBadge('GSB: ERROR', 'badge--warn'));
      }
    }
    (item.misspellings || []).forEach((t) => badges.appendChild(renderBadge(`missp: ${t}`, "badge--suspicious")));
    // Heuristic flags badges removed for cleaner display

  wrapper.appendChild(head);
  wrapper.appendChild(safetyRatingEl);
  wrapper.appendChild(body);
    if (badges.childNodes.length) wrapper.appendChild(badges);
    wrapper.appendChild(scoreBreakdown);
    wrapper.appendChild(recommendationsSection);
    
    // Apply display config - check both ways for compatibility
    if (window.configManager) {
      try {
        const showDetailedAnalysis = window.configManager.get('display.showDetailedAnalysis');
        const showScoreBreakdown = window.configManager.get('display.showScoreBreakdown');
        const showRecommendations = window.configManager.get('display.showRecommendations');
        const showTimestamps = window.configManager.get('display.showTimestamps');
        const showPerformanceMetrics = window.configManager.get('display.showPerformanceMetrics');
        
        // Apply visibility for body (detailed analysis)
        body.style.display = showDetailedAnalysis ? 'block' : 'none';
        body.dataset.configKey = 'display.showDetailedAnalysis';
        
        // Apply visibility for score breakdown
        scoreBreakdown.style.display = showScoreBreakdown ? 'block' : 'none';
        scoreBreakdown.dataset.configKey = 'display.showScoreBreakdown';
        
        // Apply visibility for recommendations
        recommendationsSection.style.display = showRecommendations ? 'block' : 'none';
        recommendationsSection.dataset.configKey = 'display.showRecommendations';
        
        // Handle timestamp and performance metrics rows
        const rows = body.querySelectorAll('.scanner-result__row');
        rows.forEach(row => {
          const label = row.querySelector('.scanner-result__label');
          if (label) {
            const text = label.textContent.toLowerCase();
            if (text.includes('scanned at') || text.includes('scan time') || text.includes('duration')) {
              row.style.display = (showTimestamps || showPerformanceMetrics) ? 'flex' : 'none';
            }
          }
        });
        
      } catch (e) {
        console.warn('Could not apply display config:', e);
        // Default to showing if config manager not available
        body.style.display = 'block';
        scoreBreakdown.style.display = 'block';
        recommendationsSection.style.display = 'block';
      }
    } else {
      // No config manager - show by default
      body.style.display = 'block';
      scoreBreakdown.style.display = 'block';
      recommendationsSection.style.display = 'block';
    }

    // Add entrance animation class after inserting to trigger CSS animation
    wrapper.classList.add('scanner-result--enter');
    resultsEl.appendChild(wrapper);
    // Slight delay to allow CSS transition to play (add pop to safety circle)
    requestAnimationFrame(() => {
      wrapper.classList.add('scanner-result--visible');
      const circle = wrapper.querySelector('.safety-circle');
      if (circle) circle.classList.add('safety-circle--pop');
    });
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem("scannerHistory");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem("scannerHistory", JSON.stringify(history));
    } catch (e) {
      // ignore
    }
  }

  function addToHistory(entry) {
    const history = loadHistory();
    history.unshift(entry);
    saveHistory(history);
    renderHistory(history);
  }

  // State for show more functionality
  let showingAllHistory = false;
  const HISTORY_INITIAL_LIMIT = 8;

  function renderHistory(history) {
    if (!historyList) return;
    
    // Use requestAnimationFrame for smoother rendering
    requestAnimationFrame(() => {
      historyList.innerHTML = "";
      
      // Filter history based on current filter
      const filteredHistory = (history || []).filter((h) => {
        const status = h.status || (h.isSafe ? 'safe' : 'unsafe');
        return currentHistoryFilter === 'all' || status === currentHistoryFilter;
      });

      // Determine how many items to show
      const itemsToShow = showingAllHistory ? filteredHistory.length : Math.min(HISTORY_INITIAL_LIMIT, filteredHistory.length);
      const hasMore = filteredHistory.length > HISTORY_INITIAL_LIMIT;

      // OPTIMIZED: Use DocumentFragment for batch DOM updates
      const fragment = document.createDocumentFragment();

      // Render history items
      filteredHistory.slice(0, itemsToShow).forEach((h) => {
        const status = h.status || (h.isSafe ? 'safe' : 'unsafe');
        const item = document.createElement('div');
        item.className = `history-item history-item--${status}`;
        
        // Make history item clickable
        item.style.cursor = 'pointer';
        item.setAttribute('title', 'Click to view scan results');
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        
        const left = document.createElement('div');
        left.innerHTML = `<div>${h.url}</div><div class="history-item__meta">${h.scannedAt}</div>`;
        const right = document.createElement('div');
        right.className = 'history-item__status';
        const badge = document.createElement('span');
        badge.className = `status-badge status-badge--${status}`;
        badge.setAttribute('aria-label', `Status: ${status}`);
        badge.textContent = status === 'safe' ? 'SAFE' : status === 'caution' ? 'CAUTION' : 'UNSAFE';
        right.appendChild(badge);
        item.appendChild(left);
        item.appendChild(right);
        
        // Add click functionality to display cached results
        const showCachedResult = () => {
          // Clear current results
          resultsEl.innerHTML = "";
          summaryEl.textContent = "Showing cached scan result:";
          
          // Display the cached result
          renderResult(h);
          
          // Update page status based on cached result
          const isAllSafe = h.status === 'safe';
          const anyUnsafe = h.status === 'unsafe';
          setPageStatus(isAllSafe, anyUnsafe);
          
          // Scroll to results
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        
        item.addEventListener('click', showCachedResult);
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showCachedResult();
          }
        });
        
        fragment.appendChild(item);
      });

      // Add "Show More" / "Show Less" button if needed
      if (hasMore) {
        const showMoreContainer = document.createElement('div');
        showMoreContainer.className = 'history-show-more';
        showMoreContainer.style.cssText = 'text-align: center; padding: 16px 0; margin-top: 8px;';
        
        const showMoreBtn = document.createElement('button');
        showMoreBtn.type = 'button';
        showMoreBtn.className = 'show-more-button';
        showMoreBtn.style.cssText = `
          background: rgba(76, 175, 80, 0.1);
          border: 2px solid rgba(76, 175, 80, 0.3);
          color: #4CAF50;
          padding: 10px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        `;
        
        const updateButtonText = () => {
          const arrow = showingAllHistory ? '▲' : '▼';
          const text = showingAllHistory ? 'Show Less' : `Show More (${filteredHistory.length - HISTORY_INITIAL_LIMIT} more)`;
          showMoreBtn.innerHTML = `${text} ${arrow}`;
        };
        
        updateButtonText();
        
        showMoreBtn.addEventListener('mouseenter', () => {
          showMoreBtn.style.background = 'rgba(76, 175, 80, 0.2)';
          showMoreBtn.style.borderColor = 'rgba(76, 175, 80, 0.5)';
          showMoreBtn.style.transform = 'translateY(-2px)';
        });
        
        showMoreBtn.addEventListener('mouseleave', () => {
          showMoreBtn.style.background = 'rgba(76, 175, 80, 0.1)';
          showMoreBtn.style.borderColor = 'rgba(76, 175, 80, 0.3)';
          showMoreBtn.style.transform = 'translateY(0)';
        });
        
        showMoreBtn.addEventListener('click', () => {
          showingAllHistory = !showingAllHistory;
          renderHistory(history);
        });
        
        showMoreContainer.appendChild(showMoreBtn);
        fragment.appendChild(showMoreContainer);
      }
      
      // OPTIMIZED: Single DOM update instead of multiple appends
      historyList.appendChild(fragment);
    });
  }

  // Filter button handlers
  if (filterButtons.length) {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.getAttribute('data-filter');
        currentHistoryFilter = value;
        showingAllHistory = false; // Reset to show limited items when filter changes
        filterButtons.forEach(b => b.classList.remove('filter-active'));
        filterButtons.forEach(b => b.setAttribute('aria-pressed','false'));
        btn.classList.add('filter-active');
        btn.setAttribute('aria-pressed','true');
        renderHistory(loadHistory());
      });
    });
    // Initialize first (all) as active if none marked
    const anyActive = Array.from(filterButtons).some(b => b.classList.contains('filter-active'));
    if (!anyActive) {
      const allBtn = Array.from(filterButtons).find(b => b.getAttribute('data-filter') === 'all') || filterButtons[0];
      allBtn.classList.add('filter-active');
      allBtn.setAttribute('aria-pressed','true');
    }
  }

  function setPageStatus(isAllSafe, anyUnsafe) {
    // Use enhanced version if available
    if (typeof window.setPageStatus === 'function' && window.setPageStatus !== setPageStatus) {
      return window.setPageStatus(isAllSafe, anyUnsafe);
    }
    
    // Fallback to basic version
    document.body.classList.remove("scan-safe", "scan-unsafe");
    if (anyUnsafe) {
      document.body.classList.add("scan-unsafe");
      if (summaryEl) summaryEl.textContent = "At least one link appears unsafe. Review details below.";
    } else if (isAllSafe) {
      document.body.classList.add("scan-safe");
      if (summaryEl) summaryEl.textContent = "All scanned links look safe based on basic checks.";
    } else {
      if (summaryEl) summaryEl.textContent = "Scan complete.";
    }
  }

  // Pure scanning of one URL (no DOM side-effects). Returns result object or error wrapper.
  async function scanOne(url, rawInput) {
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol.toLowerCase() === "https:";
      const scannedAt = new Date().toLocaleString();
      const categoryInfo = categorizeHost(parsed.hostname);
      let externalLinks = null;
      let misspellingsFound = [];
      let reasons = [];
  const { flags: heuristicFlags, notes: heuristicNotes, tld, phishingScore } = analyzeUrlHeuristics(url, rawInput);

      // Ask the local scanner first. This keeps DNS/TLS/network access out of the
      // browser and guarantees a bounded fallback when the API is unavailable.
      let localScan = null;
      try {
        localScan = await tryLocalScan(url);
      } catch (e) { /* use browser heuristics only */ }

      const dnsFailed = localScan?.dns && localScan.dns.skipped !== true && localScan.dns.ok === false;
      if (dnsFailed) {
        // Domain doesn't exist - this is highly suspicious
        // Add domain-not-found to existing heuristic flags
        const allFlags = [...heuristicFlags, "domain-not-found"];
        
        // Build comprehensive reasons including heuristic analysis
        const allReasons = [];
        allReasons.push(`Domain could not be resolved (${localScan.dns.error || 'DNS lookup failed'})`);
        allReasons.push(`Uses ${isHttps ? 'HTTPS' : 'HTTP'}.`);
        
        // Add heuristic reasons if any were found
        if (heuristicFlags.length > 0) {
          allReasons.push(`Heuristic flags: ${heuristicFlags.join(' • ')}.`);
        }
        
        // Add specific suspicious pattern explanations
        if (heuristicFlags.includes('suspicious-tld')) {
          allReasons.push(`Suspicious TLD (.${tld}) commonly used in phishing.`);
        }
        if (heuristicFlags.includes('phishing-keywords')) {
          allReasons.push('Contains phishing-related keywords (account, suspended, verify).');
        }
        if (heuristicFlags.includes('suspicious-pattern')) {
          allReasons.push('Matches known phishing URL patterns.');
        }
        if (heuristicFlags.includes('typosquatting')) {
          allReasons.push('Potential typosquatting or brand impersonation attempt.');
        }
        if (heuristicFlags.includes('high-phishing-risk')) {
          allReasons.push('High phishing risk based on URL structure and keywords.');
        }
        
        // For non-existent domains, return early with high risk but comprehensive analysis
        const nonExistentResult = {
          url,
          isHttps,
          externalLinks: 0,
          misspellings: [],
          heuristicFlags: allFlags,
          localScan: null,
          isSafe: false,
          status: "unsafe",
          risk: 150, // Very high risk for non-existent domains
          safetyRating: 5, // Very low safety rating
          safetyLevel: "Very Unsafe",
          safetyExplanation: "5% — Critical: Domain does not exist. This could be a typosquatting attempt or fraudulent link.",
          category: "Non-existent Domain",
          scannedAt,
          reasons: allReasons
        };
        return nonExistentResult;
      }

      // If local scanner already indicates a strong signal (blocklist, early exit, or GSB unsafe),
      // skip the slow HTML proxy fetch to keep results snappy.
      const strongLocalSignal = !!(localScan && (
        (localScan.blocklist && localScan.blocklist.match) ||
        (localScan.gsb && localScan.gsb.enabled && localScan.gsb.verdict === 'unsafe') ||
        (localScan.verdict && /fast result\s*\(early exit\)/i.test(String(localScan.verdict.notes || '')))
      ));

      const config = window.configManager ? window.configManager.getConfig() : {};
      const allowThirdPartyContentProxy = config.advanced?.allowThirdPartyContentProxy === true;
      if (!strongLocalSignal && allowThirdPartyContentProxy && config.scanning?.enableContentAnalysis !== false) {
        try {
          const html = await fetchPageHtmlWithProxy(url, 1500);
          if (html) {
            const { externalCount, textContent } = parseLinksFromHtml(html, url);
            externalLinks = externalCount;
            const { foundMisspellings } = analyzeTextForSuspicion(textContent || "");
            misspellingsFound = foundMisspellings;
          }
        } catch (e) {
          // ignore, rely on localScan + heuristics
        }
      }

      const { risk, status, reasons: computedReasons } = computeRiskScore({
        isHttps,
        externalLinks,
        foundMisspellings: misspellingsFound,
        categoryInfo,
        heuristicFlags,
        tld,
        phishingScore
      });

      // Merge reasons with local scan diagnostics
      if (localScan) {
        if (localScan.http) {
          const s = localScan.http.status;
          if (typeof s === 'number') reasons.push(`HTTP status ${s}`);
          if (localScan.http.redirects) reasons.push(`Redirects: ${localScan.http.redirects}`);
        }
        if (localScan.tls) {
          if (localScan.tls.validHostname === false) reasons.push('TLS hostname mismatch');
          if (typeof localScan.tls.daysToExpire === 'number') reasons.push(`TLS expires in ${localScan.tls.daysToExpire} days`);
        }
        if (localScan.dns && !localScan.dns.ok) reasons.push(`DNS error: ${localScan.dns.error}`);
      }
      reasons = reasons.concat(computedReasons);
      
      // For safety explanation, only include basic non-technical reasons
      const basicReasons = reasons.filter(reason => {
        const lowerReason = reason.toLowerCase();
        return lowerReason.includes('https') || 
               lowerReason.includes('http') || 
               lowerReason.includes('misspelling') ||
               lowerReason.includes('external link') ||
               lowerReason.includes('category') ||
               lowerReason.includes('deep content') ||
               lowerReason.includes('fetch');
      });
      
      const isSafe = status === "safe";
      const safetyRating = calculateSafetyRating(risk, phishingScore);
      const safetyLevel = getSafetyLevel(safetyRating);
      const safetyExplanation = getDecileExplanation(safetyRating, basicReasons);

      return {
        url,
        isHttps,
        externalLinks,
        misspellings: misspellingsFound,
        heuristicFlags,
        localScan,
        isSafe,
        status,
        risk,
        safetyRating,
        safetyLevel,
        safetyExplanation,
        category: categoryInfo.category,
        scannedAt,
        reasons
      };
    } catch (err) {
      return { error: true, url, raw: rawInput, message: err && err.message ? err.message : "Unknown scan error" };
    }
  }

  // Run an array of tasks (functions returning promises) with limited concurrency.
  async function runWithConcurrency(tasks, limit, onProgress) {
    const results = new Array(tasks.length);
    let inFlight = 0;
    let cursor = 0;
    let completed = 0;
    return new Promise((resolve) => {
      function launchNext() {
        if (completed === tasks.length) return resolve(results);
        while (inFlight < limit && cursor < tasks.length) {
          const index = cursor++;
            inFlight++;
          tasks[index]().then((res) => {
            results[index] = res;
          }).catch((e) => {
            results[index] = { error: true, message: e && e.message ? e.message : "Task failed" };
          }).finally(() => {
            inFlight--;
            completed++;
            if (onProgress) onProgress({ completed, total: tasks.length });
            launchNext();
          });
        }
      }
      launchNext();
    });
  }

  function renderAndStore(result) {
    if (!result) return;
    if (!result.error) {
      renderResult(result);
      addToHistory(result);
    } else {
      const wrapper = document.createElement("div");
      wrapper.className = "scanner-result scanner-result--unsafe";
      wrapper.textContent = `Failed to scan ${result.url || result.raw || ''}: ${result.message}`;
      resultsEl.appendChild(wrapper);
    }
  }

  async function scanAll() {
    resultsEl.innerHTML = "";
    document.body.classList.remove("scan-safe", "scan-unsafe");
    if (summaryEl) summaryEl.textContent = "";

    // Show progress bar
    showProgress();

    const rawLines = (input.value || "")
      .split(/\n|\r/)
      .map((s) => s.trim())
      .filter(Boolean);
    const pairs = rawLines
      .map((raw) => ({ raw, normalized: validateAndNormalizeUrl(raw) }))
      .filter((p) => Boolean(p.normalized));

    if (!pairs.length) {
      summaryEl.textContent = "Please paste at least one valid URL (one per line).";
      if (liveSafetyEl) liveSafetyEl.innerHTML = "";
      hideProgress();
      return;
    }

    if (liveSafetyEl) liveSafetyEl.innerHTML = '<div class="live-safety__scanning">Scanning (0/' + pairs.length + ')...</div>';

    // Build task array (preserve order)
    const tasks = pairs.map((p) => () => scanOne(p.normalized, p.raw));

    const orderedResults = await runWithConcurrency(tasks, MAX_CONCURRENT_SCANS, (progress) => {
      // Update both live safety and progress bar
      const percentage = Math.round((progress.completed / progress.total) * 100);
      updateProgress(percentage);
      
      if (liveSafetyEl) liveSafetyEl.innerHTML = '<div class="live-safety__scanning">Scanning (' + progress.completed + '/' + progress.total + ')...</div>';
    });

    // Complete progress bar
    updateProgress(100);
    
    // Render in original order
    orderedResults.forEach(renderAndStore);

    const filtered = orderedResults.filter(r => r && !r.error);
    const anyUnsafe = filtered.some((r) => r.status === "unsafe");
    const allSafe = filtered.length && filtered.every((r) => r.status === "safe");
    setPageStatus(allSafe, anyUnsafe);
    if (!anyUnsafe && !allSafe && filtered.length) {
      summaryEl.textContent = "Some links may require caution. Review details below.";
    }
    if (liveSafetyEl) liveSafetyEl.innerHTML = "";
    
    // Hide progress bar after completion
    hideProgress();
  }

  // ---------------- Live Safety Preview ----------------
  const liveSafetyEl = document.getElementById("liveSafety");

  function renderLiveSafety(result) {
    if (!liveSafetyEl) return;
    if (!result) {
      liveSafetyEl.innerHTML = "";
      return;
    }
    // Always render the non-numeric preview in the live preview area.
    liveSafetyEl.innerHTML = `
      <div class="live-safety__wrapper live-safety__preview">
        <div class="live-safety__info">
          <div class="live-safety__level">${result.safetyLevel}</div>
          <div class="live-safety__text">${result.safetyExplanation}</div>
          ${result.previewNote ? `<div class="live-safety__note">${result.previewNote}</div>` : ""}
        </div>
      </div>
    `;
  }

  // Lightweight compute for preview (no proxy fetch)
  function computePreviewForRaw(raw) {
    const normalized = validateAndNormalizeUrl(raw);
    if (!normalized) return null;
    try {
      const parsed = new URL(normalized);
      const isHttps = parsed.protocol.toLowerCase() === "https:";
      const categoryInfo = categorizeHost(parsed.hostname);
  const { flags: heuristicFlags, notes: heuristicNotes, tld, phishingScore } = analyzeUrlHeuristics(normalized, raw);
      // We can't fetch page content here — assume zero misspellings and external links unknown
      const { risk, status, reasons } = computeRiskScore({
        isHttps,
        externalLinks: 0,
        foundMisspellings: [],
        categoryInfo,
        heuristicFlags,
        tld,
        phishingScore
      });
      const safetyRating = calculateSafetyRating(risk, phishingScore);
      const safetyLevel = getSafetyLevel(safetyRating);
      const safetyExplanation = getSafetyExplanation(safetyRating, status, reasons);
      // Be slightly conservative in the heuristic preview: cap very-high heuristic scores
      // so users understand this is an estimate. We'll also show a clear preview note.
      let previewRating = safetyRating;
      if (!(categoryInfo && categoryInfo.trusted) && safetyRating >= 95) {
        previewRating = Math.max(90, safetyRating - 10);
      }
      const previewNote = "Heuristic preview — full scan may update the rating.";
      return {
        url: normalized,
        safetyRating: previewRating,
        safetyLevel,
        safetyExplanation,
        previewNote,
        isPreview: true
      };
    } catch (e) {
      return null;
    }
  }

  let previewTimeout = null;
  input.addEventListener("input", function (e) {
    const firstLine = (input.value || "").split(/\n|\r/)[0] || "";
    if (previewTimeout) clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
      // Do not show heuristic preview on input — clear live preview until user clicks Scan
      if (liveSafetyEl) liveSafetyEl.innerHTML = "";
    }, 250);
  });

  input.addEventListener("paste", function (e) {
    setTimeout(() => {
      // Clear any live preview when user pastes until they click Scan Links
      if (liveSafetyEl) liveSafetyEl.innerHTML = "";
    }, 50);
  });

  function restart() {
    input.value = "";
    resultsEl.innerHTML = "";
    summaryEl.textContent = "";
    document.body.classList.remove("scan-safe", "scan-unsafe");
  }

  function clearHistory() {
    saveHistory([]);
    renderHistory([]);
  }

  scanButton.addEventListener("click", function (e) {
    e.preventDefault();
    scanAll();
  });

  restartButton && restartButton.addEventListener("click", function (e) {
    e.preventDefault();
    restart();
  });

  clearHistoryBtn && clearHistoryBtn.addEventListener("click", function (e) {
    e.preventDefault();
    clearHistory();
  });

  // Initial history render
  renderHistory(loadHistory());
  
  // Initialize security theme enhancements
  if (typeof initSecurityTheme === 'function') {
    initSecurityTheme();
  }
  
  // Initialize display from config
  if (typeof window.updateDisplayFromConfig === 'function') {
    window.updateDisplayFromConfig();
  }
}

// Do not auto-run multiple times; React will call window.initScanner() after injection.

// Allow React/SPA to call this after page injection
window.initScanner = initScanner;

// Function to update display based on configuration changes
window.updateDisplayFromConfig = function() {
  if (!window.configManager) return;
  
  try {
    // Get all display configuration values
    const showDetailedAnalysis = window.configManager.get('display.showDetailedAnalysis');
    const showScoreBreakdown = window.configManager.get('display.showScoreBreakdown');
    const showRecommendations = window.configManager.get('display.showRecommendations');
    const showPerformanceMetrics = window.configManager.get('display.showPerformanceMetrics');
    const showTimestamps = window.configManager.get('display.showTimestamps');
    const colorScheme = window.configManager.get('display.colorScheme');
    
    // Update score breakdown sections
    document.querySelectorAll('.scanner-result__score-breakdown').forEach(el => {
      el.style.display = showScoreBreakdown ? 'block' : 'none';
    });
    
    // Update recommendations sections
    document.querySelectorAll('.scanner-result__recommendations').forEach(el => {
      el.style.display = showRecommendations ? 'block' : 'none';
    });
    
    // Update detailed analysis (body section with all details)
    document.querySelectorAll('.scanner-result__body').forEach(el => {
      el.style.display = showDetailedAnalysis ? 'block' : 'none';
    });
    
    // Update performance metrics rows
    document.querySelectorAll('.scanner-result__row').forEach(row => {
      const label = row.querySelector('.scanner-result__label');
      if (label) {
        const text = label.textContent.toLowerCase();
        // Check if this is a performance-related row
        if (text.includes('scanned at') || text.includes('scan time') || text.includes('duration')) {
          row.style.display = (showTimestamps || showPerformanceMetrics) ? 'flex' : 'none';
        }
      }
    });
    
    // Theme has one owner. Other configuration changes may refresh display
    // options, but they must not reset the user's selected light/dark mode.
    if (colorScheme && typeof window.applyThemePreference === 'function') {
      window.applyThemePreference(colorScheme);
    }
    
    console.log('✅ Display updated from config:', {
      showDetailedAnalysis,
      showScoreBreakdown,
      showRecommendations,
      showPerformanceMetrics,
      showTimestamps,
      colorScheme
    });
  } catch (e) {
    console.warn('Could not update display from config:', e);
  }
};

// Listen for configuration changes
if (window.configManager) {
  window.configManager.on('change', () => {
    console.log('🔄 Configuration changed, updating display...');
    window.updateDisplayFromConfig();
  });
}

// ========== New Features: API Integration, Training, Whitelist/Blacklist ==========

// 1. Free API Integration (PhishTank example, can be swapped for any open API)
async function checkUrlWithPhishAPI(url) {
  // Example: Use PhishTank public API (or any similar open API)
  // This is a placeholder; you may need to register for an API key for real use.
  // For demo, we'll use a fake endpoint and always return safe.
  // Replace with a real API call as needed.
  try {
    // Example: const res = await fetch(`https://checkurl.phishtank.com/checkurl/?url=${encodeURIComponent(url)}&format=json`);
    // const data = await res.json();
    // if (data.results.in_database && data.results.valid) return { flagged: true, reason: 'PhishTank flagged as phishing' };
    // return { flagged: false };
    return { flagged: false }; // Always safe for demo
  } catch (e) {
    return { flagged: false };
  }
}

// 2. Training System: Store scan results in localStorage and allow user correction
const TRAINING_KEY = 'scannerTrainingData';
function getTrainingData() {
  try {
    return JSON.parse(localStorage.getItem(TRAINING_KEY)) || {};
  } catch {
    return {};
  }
}
function saveTrainingData(data) {
  try {
    localStorage.setItem(TRAINING_KEY, JSON.stringify(data));
  } catch {}
}
function getTrainedStatus(url) {
  const data = getTrainingData();
  return data[url]; // {status, reason}
}
function setTrainedStatus(url, status, reason) {
  const data = getTrainingData();
  data[url] = { status, reason, updated: Date.now() };
  saveTrainingData(data);
}

// 3. Whitelist/Blacklist (domain-based, in localStorage)
const WL_KEY = 'scannerWhitelist';
const BL_KEY = 'scannerBlacklist';
function getWhitelist() {
  try {
    return JSON.parse(localStorage.getItem(WL_KEY)) || [];
  } catch {
    return [];
  }
}
function getBlacklist() {
  try {
    return JSON.parse(localStorage.getItem(BL_KEY)) || [];
  } catch {
    return [];
  }
}
function addToWhitelist(domain) {
  const wl = getWhitelist();
  if (!wl.includes(domain)) wl.push(domain);
  localStorage.setItem(WL_KEY, JSON.stringify(wl));
}
function removeFromWhitelist(domain) {
  const wl = getWhitelist().filter(d => d !== domain);
  localStorage.setItem(WL_KEY, JSON.stringify(wl));
}
function addToBlacklist(domain) {
  const bl = getBlacklist();
  if (!bl.includes(domain)) bl.push(domain);
  localStorage.setItem(BL_KEY, JSON.stringify(bl));
}
function removeFromBlacklist(domain) {
  const bl = getBlacklist().filter(d => d !== domain);
  localStorage.setItem(BL_KEY, JSON.stringify(bl));
}
function getDomainFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

// 4. Integration: Wrap scanOne to add new features (without modifying original)
if (typeof scanOne === 'function') {
  window._originalScanOne = scanOne;
  window.scanOne = async function(url, rawInput) {
    // 1. Whitelist/Blacklist check
    const domain = getDomainFromUrl(url);
    const wl = getWhitelist();
    const bl = getBlacklist();
    if (wl.includes(domain)) {
      return {
        url,
        isHttps: url.startsWith('https://'),
        externalLinks: 0,
        misspellings: [],
        heuristicFlags: [],
        isSafe: true,
        status: 'safe',
        risk: 0,
        safetyRating: 100,
        safetyLevel: 'Very Safe',
        safetyExplanation: 'Whitelisted domain',
        category: 'Whitelisted',
        scannedAt: new Date().toLocaleString(),
        reasons: ['Domain is whitelisted']
      };
    }
    if (bl.includes(domain)) {
      return {
        url,
        isHttps: url.startsWith('https://'),
        externalLinks: 0,
        misspellings: [],
        heuristicFlags: [],
        isSafe: false,
        status: 'unsafe',
        risk: 100,
        safetyRating: 10,
        safetyLevel: 'Very Unsafe',
        safetyExplanation: 'Blacklisted domain',
        category: 'Blacklisted',
        scannedAt: new Date().toLocaleString(),
        reasons: ['Domain is blacklisted']
      };
    }
    // 2. Training data check
    const trained = getTrainedStatus(url);
    if (trained) {
      return {
        url,
        isHttps: url.startsWith('https://'),
        externalLinks: 0,
        misspellings: [],
        heuristicFlags: [],
        isSafe: trained.status === 'safe',
        status: trained.status,
        risk: trained.status === 'safe' ? 0 : 100,
        safetyRating: trained.status === 'safe' ? 100 : 10,
        safetyLevel: trained.status === 'safe' ? 'Very Safe' : 'Very Unsafe',
        safetyExplanation: 'Learned from user correction',
        category: 'Trained',
        scannedAt: new Date().toLocaleString(),
        reasons: [trained.reason || 'User correction']
      };
    }
    // 3. Run original scan
    const result = await window._originalScanOne(url, rawInput);
    // 4. API check (async, can be slow)
    const apiRes = await checkUrlWithPhishAPI(url);
    if (apiRes.flagged) {
      result.risk = Math.max(result.risk, 80);
      result.status = 'unsafe';
      result.isSafe = false;
      result.safetyRating = Math.min(result.safetyRating, 20);
      result.safetyLevel = 'Very Unsafe';
      result.safetyExplanation = (result.safetyExplanation ? result.safetyExplanation + ' | ' : '') + (apiRes.reason || 'Flagged by API');
      result.reasons = (result.reasons || []).concat([apiRes.reason || 'Flagged by API']);
    }
    return result;
  };
}

// 5. UI Helper: User can correct scan result (call from UI as needed)
window.setTrainedStatus = setTrainedStatus;
window.getTrainedStatus = getTrainedStatus;
window.addToWhitelist = addToWhitelist;
window.removeFromWhitelist = removeFromWhitelist;
window.addToBlacklist = addToBlacklist;

// 6. Background Removal for Shield Logos
function removeShieldLogoBackground() {
  const shieldLogos = document.querySelectorAll('img[src*="shield"]');
  
  shieldLogos.forEach(img => {
    // Wait for image to load
    if (img.complete) {
      processShieldLogo(img);
    } else {
      img.onload = () => processShieldLogo(img);
    }
  });
}

function processShieldLogo(img) {
  try {
    // Create a canvas to process the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match image
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    
    // Draw the image to canvas
    ctx.drawImage(img, 0, 0);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Define background colors to remove (gray/light gray)
    const backgroundColors = [
      [169, 169, 169], // Gray
      [192, 192, 192], // Silver/Light Gray
      [211, 211, 211], // Light Gray
      [220, 220, 220], // Gainsboro
      [245, 245, 245], // White Smoke
      [255, 255, 255], // White
    ];
    
    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Check if this pixel matches any background color (with tolerance)
      const isBackground = backgroundColors.some(bgColor => {
        const tolerance = 30;
        return Math.abs(r - bgColor[0]) < tolerance &&
               Math.abs(g - bgColor[1]) < tolerance &&
               Math.abs(b - bgColor[2]) < tolerance;
      });
      
      // Make background pixels transparent
      if (isBackground) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }
    
    // Put the processed image data back
    ctx.putImageData(imageData, 0, 0);
    
    // Replace the original image with the processed one
    img.src = canvas.toDataURL('image/png');
    
    // Add a class to indicate it's been processed
    img.classList.add('background-removed');
    
  } catch (error) {
    console.warn('Could not process shield logo background removal:', error);
    // Fallback to CSS-only approach
    img.style.filter = 'contrast(200%) brightness(120%) saturate(150%)';
    img.style.mixBlendMode = 'multiply';
  }
}
window.removeFromBlacklist = removeFromBlacklist;
window.getWhitelist = getWhitelist;
window.getBlacklist = getBlacklist;

// ==================== CYBERSECURITY THEME ENHANCEMENTS (OPTIMIZED) ====================

// Create floating security particles (OPTIMIZED - reduced count and using CSS transforms)
function createSecurityParticles() {
  // Reduced from 15 to 6 particles for better performance
  const particleCount = 15;
  const colors = [
    'rgba(33, 150, 243, 0.2)',   // Security Blue (reduced opacity)
    'rgba(76, 175, 80, 0.2)',    // Security Green (reduced opacity)
    'rgba(244, 67, 54, 0.2)',    // Security Red (reduced opacity)
    'rgba(156, 39, 176, 0.2)'    // Security Purple (reduced opacity)
  ];
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'security-particle';
    particle.style.cssText = `
      position: fixed;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      pointer-events: none;
      z-index: 1;
      animation-delay: ${Math.random() * 6}s;
      animation-duration: ${Math.random() * 4 + 6}s;
    `;
    document.body.appendChild(particle);
  }
}

// Add scan button pulse effect
function enhanceScanButton() {
  const scanBtn = document.querySelector('#scanBtn, button[onclick*="scanLinks"], .button');
  if (scanBtn) {
    scanBtn.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px) scale(1.02)';
      this.style.boxShadow = '0 8px 25px rgba(33, 150, 243, 0.4)';
    });
    
    scanBtn.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
      this.style.boxShadow = '0 4px 15px rgba(33, 150, 243, 0.3)';
    });
  }
}

// Add typing effect to URL input
function enhanceUrlInput() {
  const urlInput = document.querySelector('#scannerInput, textarea[placeholder*="URL"], input[type="url"]');
  if (urlInput) {
    urlInput.addEventListener('focus', function() {
      this.style.boxShadow = '0 0 20px rgba(33, 150, 243, 0.3)';
      this.style.borderColor = '#2196f3';
    });
    
    urlInput.addEventListener('blur', function() {
      this.style.boxShadow = 'none';
      this.style.borderColor = '#ddd';
    });
  }
}

// Initialize security theme enhancements (OPTIMIZED)
function initSecurityTheme() {
  // Check if already initialized to prevent duplicates
  if (window.__securityThemeInitialized) return;
  window.__securityThemeInitialized = true;
  
  // Create particles after a delay
  setTimeout(() => {
    createSecurityParticles();
  }, 1500);
  
  // Enhance interactive elements
  enhanceScanButton();
  enhanceUrlInput();
  
  // Watch for new scan results being added
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList) {
            // Add animation to newly added result cards
            if (node.classList.contains('scanner-result')) {
              node.classList.add('security-enhanced');
            }
          }
        });
      }
    });
  });
    
  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSecurityTheme);
} else {
  initSecurityTheme();
}

// Make it available for React/SPA
window.initSecurityTheme = initSecurityTheme;

// ==================== ENHANCED SCAN RESULT EFFECTS (OPTIMIZED) ====================

// Create additional visual effects for scan results (OPTIMIZED - reduced particles)
function createScanResultEffects(isUnsafe) {
  // Remove any existing scan effects
  document.querySelectorAll('.scan-effect-particle').forEach(p => p.remove());
  
  const color = isUnsafe ? 'rgba(244, 67, 54, 0.4)' : 'rgba(76, 175, 80, 0.4)';
  const glowColor = isUnsafe ? '#f44336' : '#4caf50';
  
  // Create 25 particles for a nice effect
  const particleCount = 25;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'scan-effect-particle';
    particle.style.cssText = `
      position: fixed;
      width: 5px;
      height: 5px;
      background: ${color};
      border-radius: 50%;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: scanParticleFloat ${Math.random() * 2 + 1.5}s ease-out forwards;
      box-shadow: 0 0 8px ${glowColor};
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(particle);
    
    // Remove particle after animation
    setTimeout(() => particle.remove(), 3500);
  }
  
  // OPTIMIZED: Simplified flash effect
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${color};
    pointer-events: none;
    z-index: 10000;
    opacity: 0;
    animation: screenFlash 0.4s ease-out forwards;
  `;
  document.body.appendChild(flash);
  
  // Remove flash after animation
  setTimeout(() => {
    if (flash.parentNode) {
      flash.remove();
    }
  }, 400);
}

// Enhanced page status function with visual effects (OPTIMIZED)
function setPageStatusEnhanced(isAllSafe, anyUnsafe) {
  // Remove existing scan classes
  document.body.classList.remove("scan-safe", "scan-unsafe");
  
  if (anyUnsafe) {
    document.body.classList.add("scan-unsafe");
    createScanResultEffects(true);
    
    // Add pulsing border to viewport
    document.body.style.boxShadow = 'inset 0 0 50px rgba(244, 67, 54, 0.3)';
    
  } else if (isAllSafe) {
    document.body.classList.add("scan-safe");
    createScanResultEffects(false);
    
    // Add pulsing border to viewport
    document.body.style.boxShadow = 'inset 0 0 50px rgba(76, 175, 80, 0.3)';
  } else {
    // Reset effects for neutral state
    document.body.style.boxShadow = '';
    document.querySelectorAll('.scan-effect-particle').forEach(p => p.remove());
  }
}

// Override the existing setPageStatus function if it exists
if (typeof window.setPageStatus === 'function') {
  window.originalSetPageStatus = window.setPageStatus;
}
window.setPageStatus = setPageStatusEnhanced;

// Initialize display configuration on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for configManager to be ready
    setTimeout(() => {
      if (window.updateDisplayFromConfig) {
        window.updateDisplayFromConfig();
      }
    }, 100);
  });
} else {
  // DOM is already loaded
  setTimeout(() => {
    if (window.updateDisplayFromConfig) {
      window.updateDisplayFromConfig();
    }
  }, 100);
}
})();
