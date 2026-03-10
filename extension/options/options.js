'use strict';

const DEFAULT_ENDPOINT = 'https://api.languagetool.org/v2/check';

document.addEventListener('DOMContentLoaded', () => {
  const endpointInput = document.getElementById('lt-endpoint');
  const usernameInput = document.getElementById('lt-username');
  const apikeyInput = document.getElementById('lt-apikey');
  const form = document.getElementById('options-form');
  const status = document.getElementById('save-status');

  // Load saved settings
  chrome.storage.local.get(['ltEndpointUrl', 'ltApiUsername', 'ltApiKey'], (result) => {
    endpointInput.value = result.ltEndpointUrl || DEFAULT_ENDPOINT;
    usernameInput.value = result.ltApiUsername || '';
    apikeyInput.value = result.ltApiKey || '';
  });

  // Save on submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const settings = {
      ltEndpointUrl: endpointInput.value.trim() || DEFAULT_ENDPOINT,
      ltApiUsername: usernameInput.value.trim(),
      ltApiKey: apikeyInput.value.trim(),
    };

    chrome.storage.local.set(settings, () => {
      status.style.display = 'inline';
      setTimeout(() => {
        status.style.display = 'none';
      }, 2500);
    });
  });
});
