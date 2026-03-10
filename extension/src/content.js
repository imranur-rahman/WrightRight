'use strict';

/* global RULES */

// content.js — main entry point injected into Overleaf pages
// All dependencies are loaded as content_scripts in manifest.json order

(function () {
  'use strict';

  // Prevent double-injection
  if (window.__wrLoaded) return;
  window.__wrLoaded = true;

  let cmView = null;

  async function onCheckClick() {
    setButtonLoading(true);

    try {
      const { text, view, fallback, error } = extractFromCodeMirror();

      if (error || !text) {
        console.error('[WriteRight]', error || 'Could not extract editor content');
        setButtonLoading(false);
        return;
      }

      cmView = view;
      const violations = await runAllChecks(text);

      renderAnnotations(violations, view);
      renderViolations(violations, (v) => scrollToViolation(v, cmView));
    } catch (err) {
      console.error('[WriteRight] Check failed:', err);
    } finally {
      setButtonLoading(false);
    }
  }

  // Inject CSS
  if (!document.getElementById('wr-styles')) {
    const link = document.createElement('link');
    link.id = 'wr-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('src/ui/writeright.css');
    document.head.appendChild(link);
  }

  // Wait for Overleaf to load, then inject toolbar button
  watchForToolbar(onCheckClick);
})();
