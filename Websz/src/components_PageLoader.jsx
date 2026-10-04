import React, { useEffect, useRef } from 'react';

export default function PageLoader({ pageFile }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}_pages/${pageFile}`);
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
        
        // Also handle any remaining /contact.html links specifically
        replaced = replaced.replace(/href="\/contact\.html"/gi, 'href="#/contact"');

        // Public HTML fragments are copied without Vite transforms. Prefix
        // root-relative assets so they work under /Urly-Warning/ on Pages.
        replaced = replaced.replace(/\b(src|href)="\/(?!\/)([^"]+)"/gi, `$1="${baseUrl}$2"`);
        replaced = replaced.replace(/this\.src='\/(?!\/)([^']+)'/gi, `this.src='${baseUrl}$1'`);
        if (cancelled) return;
        // inject HTML
        if (containerRef.current) {
          containerRef.current.innerHTML = replaced;
          containerRef.current.querySelectorAll('a[href^="#/"]').forEach((link) => {
            link.onclick = function(e) {
              e.preventDefault();
              document.body.classList.remove('menu-open');
              window.location.hash = link.getAttribute('href');
            };
          });
        }
        // remove previous script if exists
        const prev = document.getElementById('site-script');
        if (prev) prev.remove();
        // dynamically load the original script so it initializes for the injected content
        const script = document.createElement('script');
        script.src = `${baseUrl}js/script.js`;
        script.id = 'site-script';
        script.onload = function() {
          if (window.attachUIEventListeners) window.attachUIEventListeners();
          if (window.attachSpollerListeners) window.attachSpollerListeners();
          if (window.initScanner) window.initScanner();
          
          // Use one predictable navigation handler for every injected SPA link.
          document.querySelectorAll('a.menu__link[href^="#/"], a.outro__button[href^="#/"]').forEach((link) => {
            link.onclick = function(e) {
              e.preventDefault();
              document.body.classList.remove('menu-open');
              window.location.hash = link.getAttribute('href');
            };
          });
        };
        document.body.appendChild(script);
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
