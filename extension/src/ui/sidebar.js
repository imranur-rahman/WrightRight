'use strict';

/**
 * sidebar.js — renders violations grouped by category in a side panel.
 */

let sidebarEl = null;

const CATEGORY_LABELS = {
  structural: 'Structural',
  formatting: 'Formatting',
  language: 'Language & Style',
  completeness: 'Completeness',
};

/**
 * Create and inject the sidebar into Overleaf's editor layout.
 * @returns {HTMLElement} the sidebar element
 */
function createSidebar() {
  if (sidebarEl) return sidebarEl;

  sidebarEl = document.createElement('div');
  sidebarEl.id = 'wr-sidebar';
  sidebarEl.innerHTML = `
    <div id="wr-sidebar-header">
      <span>WriteRight</span>
      <button id="wr-sidebar-close" title="Close">&times;</button>
    </div>
    <div id="wr-sidebar-body">
      <div id="wr-sidebar-empty">
        <div class="wr-checkmark">&#x2713;</div>
        <div>Click "Check Policies" to run checks.</div>
      </div>
    </div>
  `;

  sidebarEl.querySelector('#wr-sidebar-close').addEventListener('click', () => {
    sidebarEl.style.display = 'none';
  });

  // Inject into the editor's flex container
  const editorWrapper =
    document.querySelector('.editor-wrapper') ||
    document.querySelector('.cm-editor')?.parentElement?.parentElement;

  if (editorWrapper) {
    editorWrapper.style.display = 'flex';
    editorWrapper.appendChild(sidebarEl);
  } else {
    document.body.appendChild(sidebarEl);
  }

  return sidebarEl;
}

/**
 * Render violations into the sidebar, grouped by category.
 *
 * @param {object[]} violations
 * @param {function} onViolationClick - called with violation object when user clicks an item
 */
function renderViolations(violations, onViolationClick) {
  const sidebar = createSidebar();
  sidebar.style.display = 'flex';

  const body = sidebar.querySelector('#wr-sidebar-body');
  body.innerHTML = '';

  if (violations.length === 0) {
    body.innerHTML = `
      <div id="wr-sidebar-empty">
        <div class="wr-checkmark">&#x2713;</div>
        <div>No policy violations found.</div>
      </div>
    `;
    return;
  }

  // Group by category
  const groups = {};
  for (const v of violations) {
    const cat = v.ruleId.split('-')[0]; // e.g. "struct", "fmt", "lang", "comp"
    const category = mapCategoryPrefix(cat);
    if (!groups[category]) groups[category] = [];
    groups[category].push(v);
  }

  const categoryOrder = ['structural', 'formatting', 'completeness', 'language'];

  for (const category of categoryOrder) {
    if (!groups[category]) continue;
    const groupViolations = groups[category];

    const groupEl = document.createElement('div');
    groupEl.className = 'wr-category-group';

    const headerEl = document.createElement('div');
    headerEl.className = 'wr-category-header';
    headerEl.textContent = `${CATEGORY_LABELS[category] || category} (${groupViolations.length})`;
    groupEl.appendChild(headerEl);

    for (const v of groupViolations) {
      const itemEl = document.createElement('div');
      itemEl.className = 'wr-violation-item';
      itemEl.dataset.ruleId = v.ruleId;

      const locText = v.line ? `Line ${v.line}` : 'Document-level';

      itemEl.innerHTML = `
        <div class="wr-violation-rule">${escapeHtml(v.ruleId)}</div>
        <div class="wr-violation-msg">${escapeHtml(v.message)}</div>
        <div class="wr-violation-loc">${locText}</div>
        ${v.excerpt ? `<div class="wr-violation-excerpt">${escapeHtml(v.excerpt)}</div>` : ''}
      `;

      itemEl.addEventListener('click', () => onViolationClick(v));
      groupEl.appendChild(itemEl);
    }

    body.appendChild(groupEl);
  }
}

function mapCategoryPrefix(prefix) {
  const map = { struct: 'structural', fmt: 'formatting', lang: 'language', comp: 'completeness' };
  return map[prefix] || prefix;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (typeof module !== 'undefined') {
  module.exports = { createSidebar, renderViolations };
}
