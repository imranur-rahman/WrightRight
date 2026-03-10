'use strict';

/**
 * Strips LaTeX commands from source text, producing plain text suitable
 * for NLP processing. Also builds an offset map from plain-text positions
 * back to LaTeX source positions.
 *
 * @param {string} latex - Full LaTeX source
 * @returns {{ text: string, offsetMap: number[] }}
 *   - text: plain text
 *   - offsetMap: array where offsetMap[i] = index in original latex string
 *                corresponding to plain text character i
 */
function stripLatex(latex) {
  const text = [];
  const offsetMap = [];
  let i = 0;

  while (i < latex.length) {
    const ch = latex[i];

    // Skip comments
    if (ch === '%') {
      while (i < latex.length && latex[i] !== '\n') i++;
      continue;
    }

    // Skip LaTeX commands: \commandname or \X (single non-alpha char)
    if (ch === '\\') {
      i++; // skip backslash
      if (i >= latex.length) break;

      if (/[a-zA-Z]/.test(latex[i])) {
        // Skip structural/non-textual commands and their arguments entirely;
        // for all others, just skip the command name and let the main loop
        // process the brace contents (keeping readable text).
        const cmdStart = i;
        while (i < latex.length && /[a-zA-Z]/.test(latex[i])) i++;
        const cmd = latex.slice(cmdStart, i);

        // Commands whose brace arguments should be discarded (non-prose)
        const skipArgCmds = new Set([
          'begin', 'end', 'label', 'ref', 'eqref', 'autoref', 'cref', 'Cref',
          'cite', 'citep', 'citet', 'bibliography', 'bibliographystyle',
          'usepackage', 'documentclass', 'newcommand', 'renewcommand',
          'setcounter', 'stepcounter', 'hspace', 'vspace', 'includegraphics',
          'input', 'include', 'href', 'url',
        ]);

        if (skipArgCmds.has(cmd)) {
          // Skip optional whitespace and all brace/bracket argument groups
          while (i < latex.length && latex[i] === ' ') i++;
          while (i < latex.length && (latex[i] === '{' || latex[i] === '[')) {
            const close = latex[i] === '{' ? '}' : ']';
            i++;
            let depth = 1;
            while (i < latex.length && depth > 0) {
              if (latex[i] === (close === '}' ? '{' : '[')) depth++;
              else if (latex[i] === close) depth--;
              i++;
            }
          }
        }
        // For all other commands (textbf, emph, section, etc.), just skip
        // the command name; brace contents are processed by the main loop
      } else {
        // Single character command like \\ or \{
        i++;
      }
      // Add a space as separator so words don't merge
      if (text.length > 0 && text[text.length - 1] !== ' ') {
        text.push(' ');
        offsetMap.push(i);
      }
      continue;
    }

    // Skip math environments: $...$ and $$...$$
    if (ch === '$') {
      if (latex[i + 1] === '$') {
        i += 2;
        while (i < latex.length && !(latex[i] === '$' && latex[i + 1] === '$')) i++;
        i += 2;
      } else {
        i++;
        while (i < latex.length && latex[i] !== '$') i++;
        i++;
      }
      text.push(' ');
      offsetMap.push(i);
      continue;
    }

    // Skip braces (but keep content)
    if (ch === '{' || ch === '}') {
      i++;
      continue;
    }

    // Keep newlines and regular characters
    text.push(ch);
    offsetMap.push(i);
    i++;
  }

  return {
    text: text.join(''),
    offsetMap,
  };
}

/**
 * Split plain text into sentences (naive, suitable for academic text).
 * Returns array of { text, start, end } where start/end are plain-text offsets.
 */
function splitSentences(plainText) {
  const sentences = [];
  const re = /[^.!?]*[.!?]+/g;
  let match;
  while ((match = re.exec(plainText)) !== null) {
    sentences.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  // Remainder (no terminal punctuation)
  const lastEnd = sentences.length > 0 ? sentences[sentences.length - 1].end : 0;
  const remainder = plainText.slice(lastEnd).trim();
  if (remainder.length > 0) {
    sentences.push({ text: remainder, start: lastEnd, end: plainText.length });
  }
  return sentences;
}

/**
 * Map a plain-text offset back to a LaTeX source offset.
 * @param {number[]} offsetMap
 * @param {number} plainOffset
 * @returns {number} latex source offset
 */
function toLatexOffset(offsetMap, plainOffset) {
  if (plainOffset < 0) return 0;
  if (plainOffset >= offsetMap.length) return offsetMap[offsetMap.length - 1] || 0;
  return offsetMap[plainOffset];
}

/**
 * Given a LaTeX source string and a char offset, return the 1-based line number.
 */
function offsetToLine(source, offset) {
  let line = 1;
  for (let i = 0; i < Math.min(offset, source.length); i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

if (typeof module !== 'undefined') {
  module.exports = { stripLatex, splitSentences, toLatexOffset, offsetToLine };
}
