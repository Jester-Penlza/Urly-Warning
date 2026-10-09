import React, { useEffect, useRef } from 'react';

export default function PageLoader({ pageFile }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const baseUrl = import.meta.env.BASE_URL || '/';
    async function load() {
      try {
        const res = await fetch(`${baseUrl}_pages/${pageFile}`);
        if (!res.ok) {
          throw new Error(`Unable to load ${pageFile} (HTTP ${res.status})`);
        }
        const text = await res.text();
        // extract body content if present
        const m = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        const body = m ? m[1] : text;
        // replace links to *.html -> hash routes (e.g., about.html -> #/about), and Home to #/
        let replaced = body.replace(/href="([^"#]+)\.html"/gi, (s, p1) => {
          const route = p1.toLowerCase().replace(/^\/+/, ''); // Remove leading slashes
          if (route === 'index') return 'href="#/"';
          return `href="#/${route}"`;
        });

        // Public assets live under Vite's base path on GitHub Pages.
        replaced = replaced.replace(/(["'])\/(?=(?:images|img|js|css)\/)/gi, `$1${baseUrl}`);
        
        // Also handle any remaining /contact.html links specifically
        replaced = replaced.replace(/href="\/contact\.html"/gi, 'href="#/contact"');
        if (cancelled) return;
        // inject HTML
        if (containerRef.current) {
          containerRef.current.innerHTML = replaced;
        }
        // The legacy script declares global constants, so it must only be
        // evaluated once. On later SPA routes we rebind it to the new markup.
        const initializeInjectedPage = () => {
          if (cancelled) return;
          if (window.attachUIEventListeners) window.attachUIEventListeners();
          if (window.attachSpollerListeners) window.attachSpollerListeners();
          if (window.initScanner) window.initScanner();
          
          // CRITICAL: Reset theme toggle setup flag so it works on each page
          window.__themeToggleSetup = false;
          if (window.setupThemeToggle) {
            window.setupThemeToggle();
            console.log('✅ Theme toggle re-initialized for new page');
          }
          
          // Make Home button only go to root hash route
          const homeBtn = document.querySelector('a.menu__link[href="#/"]');
          if (homeBtn) {
            homeBtn.onclick = function(e) {
              e.preventDefault();
              window.location.hash = '#/'
            };
          }
          
          // Fix Contact button navigation for React Router - Precise targeting
          const contactButtons = document.querySelectorAll('.outro__button[href*="contact"], a.menu__link[href*="contact"]');
          console.log(`Found ${contactButtons.length} contact buttons to fix`);
          
          contactButtons.forEach((button, index) => {
            console.log(`Setting up contact button ${index + 1}:`, {
              href: button.href,
              text: button.textContent?.trim(),
              class: button.className
            });
            
            // Remove any existing event listeners by cloning the element
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              console.log('Contact button clicked - precise navigation to contact page');
              
              // Add visual feedback
              newButton.style.transform = 'scale(0.95)';
              newButton.style.transition = 'all 0.2s ease';
              newButton.style.opacity = '0.8';
              
              // Clear any existing hash and navigate cleanly
              setTimeout(() => {
                newButton.style.transform = '';
                newButton.style.opacity = '';
                
                // Ensure we navigate to exactly #/contact
                const currentHash = window.location.hash;
                console.log('Current hash before navigation:', currentHash);
                
                // Clear hash first if it's different, then set to contact
                if (currentHash !== '#/contact') {
                  window.location.hash = '#/contact';
                  console.log('Navigated to #/contact');
                } else {
                  console.log('Already on contact page');
                }
              }, 200);
            });
            
            console.log(`Contact button ${index + 1} setup complete`);
          });
        };

        const existingScript = document.getElementById('site-script');
        if (existingScript) {
          if (existingScript.dataset.loaded === 'true') {
            initializeInjectedPage();
          } else {
            existingScript.addEventListener('load', initializeInjectedPage, { once: true });
          }
        } else {
          const script = document.createElement('script');
          script.src = `${baseUrl}js/script.js`;
          script.id = 'site-script';
          script.onload = () => {
            script.dataset.loaded = 'true';
            initializeInjectedPage();
          };
          document.body.appendChild(script);
        }
      } catch (err) {
        console.error('Failed to load page', pageFile, err);
      }
    }
    load();
    return () => {
      cancelled = true;
      // cleanup injected HTML
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [pageFile]);

  return <div ref={containerRef}></div>;
}
