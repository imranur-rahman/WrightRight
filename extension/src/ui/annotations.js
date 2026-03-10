'use strict';

/**
 * annotations.js — places inline visual markers on .cm-line elements.
 */

const WR_CLASS = 'wr-annotation';

/**
 * Clear all existing WriteRight annotations.
 */
function clearAnnotations() {
  for (const el of document.querySelectorAll(`.${WR_CLASS}`)) {
    // Unwrap the annotation span, replacing it with its text content
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    }
  }
}

/**
 * Place an annotation on the line corresponding to a violation.
 *
 * @param {object} violation - { ruleId, message, line }
 * @param {object|null} view - CM6 EditorView (used for scrollIntoView)
 */
function placeAnnotation(violation, view) {
  if (!violation.line) return;

  // .cm-line elements are 0-indexed in the DOM but 1-indexed in violation.line
  const lines = document.querySelectorAll('.cm-content .cm-line');
  const lineEl = lines[violation.line - 1];
  if (!lineEl) return;

  // Create annotation wrapper around the first ~20 chars
  const span = document.createElement('span');
  span.className = WR_CLASS;
  span.dataset.wrMsg = `[${violation.ruleId}] ${violation.message}`;

  // We just highlight the line start — wrap first text node
  const firstText = getFirstTextNode(lineEl);
  if (!firstText) return;

  const text = firstText.nodeValue || '';
  const snippet = text.slice(0, 20);
  const rest = text.slice(20);

  span.textContent = snippet;

  const restNode = document.createTextNode(rest);
  firstText.parentNode.replaceChild(restNode, firstText);
  restNode.parentNode.insertBefore(span, restNode);
}

/**
 * Render all violations as annotations.
 *
 * @param {object[]} violations
 * @param {object|null} view
 */
function renderAnnotations(violations, view) {
  clearAnnotations();
  for (const v of violations) {
    placeAnnotation(v, view);
  }
}

/**
 * Scroll the editor to a given violation.
 * Uses CM6's scrollIntoView if available.
 *
 * @param {object} violation
 * @param {object|null} view - CM6 EditorView
 */
function scrollToViolation(violation, view) {
  if (!view || !violation.offset) return;
  try {
    // CM6: dispatch a scroll effect
    const { EditorView } = window; // may not be available
    if (EditorView && EditorView.scrollIntoView) {
      view.dispatch({ effects: EditorView.scrollIntoView(violation.offset, { y: 'center' }) });
    }
  } catch (_) {
    // Fallback: scroll the .cm-line element into view
    if (violation.line) {
      const lines = document.querySelectorAll('.cm-content .cm-line');
      const lineEl = lines[violation.line - 1];
      if (lineEl) lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function getFirstTextNode(el) {
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim().length > 0) {
      return child;
    }
  }
  return null;
}

if (typeof module !== 'undefined') {
  module.exports = { clearAnnotations, renderAnnotations, scrollToViolation };
}
