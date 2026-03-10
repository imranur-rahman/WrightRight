'use strict';

/**
 * toolbar-button.js — injects the "Check Policies" button into Overleaf's toolbar.
 *
 * Uses a MutationObserver to wait for the toolbar to appear, then injects the button.
 */

let button = null;

function injectToolbarButton(onClickCallback) {
  if (document.getElementById('wr-check-btn')) return;

  const toolbar = document.querySelector('.toolbar-editor');
  if (!toolbar) return;

  button = document.createElement('button');
  button.id = 'wr-check-btn';
  button.title = 'Check WriteRight policies';
  button.innerHTML = `
    <span class="wr-spinner"></span>
    <span class="wr-label">Check Policies</span>
  `;

  button.addEventListener('click', () => {
    if (button.disabled) return;
    onClickCallback();
  });

  toolbar.appendChild(button);
}

function setButtonLoading(loading) {
  if (!button) return;
  button.disabled = loading;
  button.classList.toggle('wr-loading', loading);
  const label = button.querySelector('.wr-label');
  if (label) label.textContent = loading ? 'Checking…' : 'Check Policies';
}

/**
 * Watch for the toolbar to appear and inject the button.
 */
function watchForToolbar(onClickCallback) {
  // Try immediately
  injectToolbarButton(onClickCallback);

  // Then observe DOM mutations
  const observer = new MutationObserver(() => {
    injectToolbarButton(onClickCallback);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof module !== 'undefined') {
  module.exports = { watchForToolbar, setButtonLoading };
}
