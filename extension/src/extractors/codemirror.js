'use strict';

/**
 * Extract LaTeX source text and CodeMirror view from Overleaf's editor.
 *
 * Overleaf uses CodeMirror 6. The EditorView is attached to the .cm-editor DOM
 * element via a Symbol property whose toString() includes 'cm'.
 *
 * @returns {{ text: string, view: object|null, fallback: boolean }}
 */
function extractFromCodeMirror() {
  const editorEl = document.querySelector('.cm-editor');
  if (!editorEl) {
    return { text: null, view: null, fallback: false, error: 'No .cm-editor element found' };
  }

  // Try to retrieve the CM6 EditorView via its Symbol property
  try {
    const symbols = Object.getOwnPropertySymbols(editorEl);
    const cmSymbol = symbols.find((s) => s.toString().includes('cm'));
    if (cmSymbol) {
      const view = editorEl[cmSymbol];
      if (view && view.state && view.state.doc) {
        const text = view.state.doc.toString();
        return { text, view, fallback: false };
      }
    }
  } catch (_) {
    // Fall through to fallback
  }

  // Fallback: concatenate .cm-line textContent (loses precise offset mapping)
  try {
    const lines = Array.from(document.querySelectorAll('.cm-content .cm-line'));
    if (lines.length > 0) {
      const text = lines.map((l) => l.textContent).join('\n');
      return { text, view: null, fallback: true };
    }
  } catch (_) {
    // Fall through
  }

  return { text: null, view: null, fallback: false, error: 'Could not extract editor content' };
}

/**
 * Given a CM6 EditorView and a character offset, return the 1-based line number.
 * Falls back to scanning the text manually if view is not available.
 *
 * @param {object|null} view - CM6 EditorView
 * @param {number} offset - character offset in source
 * @param {string} [text] - fallback: full text
 * @returns {number} 1-based line number
 */
function offsetToLine(view, offset, text) {
  if (view && view.state && view.state.doc) {
    try {
      const line = view.state.doc.lineAt(offset);
      return line.number;
    } catch (_) {
      // Fall through
    }
  }
  // Manual scan
  if (!text) return 1;
  let line = 1;
  for (let i = 0; i < Math.min(offset, text.length); i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

if (typeof module !== 'undefined') {
  module.exports = { extractFromCodeMirror, offsetToLine };
}
