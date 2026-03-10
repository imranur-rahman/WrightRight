'use strict';

const { offsetToLine } = require('../utils/latex-parse.js');

/**
 * completeness.js — checks cross-reference completeness.
 *
 * - comp-label-referenced: every \label must be \ref'd at least once
 * - comp-figure-referenced / comp-table-referenced: fig:/tab: labels referenced
 * - comp-acronym-first-use: acronyms defined before first use
 *
 * @param {string} source - full LaTeX source
 * @param {object[]} rules - RULES filtered to category:completeness
 * @returns {object[]} violations
 */
function checkCompleteness(source, rules) {
  const violations = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.check.type !== 'macro-presence') continue;

    const { crossReference } = rule.check;
    if (!crossReference) continue;

    if (rule.id === 'comp-acronym-first-use') {
      violations.push(...checkAcronyms(source, rule));
    } else {
      violations.push(...checkLabelRefs(source, rule, crossReference));
    }
  }

  return violations;
}

/**
 * Generic label-reference check.
 * Collects all label definitions and all reference uses,
 * emits a violation for each defined label that is never referenced.
 */
function checkLabelRefs(source, rule, crossReference) {
  const violations = [];

  const labelRe = new RegExp(crossReference.labelPattern, 'g');
  const refRe = new RegExp(crossReference.refPattern, 'g');

  // Collect defined labels: { key, offset }
  const defined = [];
  let m;
  while ((m = labelRe.exec(source)) !== null) {
    defined.push({ key: m[1], offset: m.index });
  }

  // Collect referenced keys
  const referenced = new Set();
  while ((m = refRe.exec(source)) !== null) {
    referenced.add(m[1]);
  }

  // Find defined but never referenced
  for (const { key, offset } of defined) {
    if (!referenced.has(key)) {
      const line = offsetToLine(source, offset);
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: `Label "${key}" is defined but never referenced`,
        line,
        offset,
        excerpt: source.slice(offset, offset + 60).replace(/\n/g, ' '),
      });
    }
  }

  return violations;
}

/**
 * Acronym first-use check.
 * Detects bare uppercase sequences (2-6 chars) that appear before
 * their definition in parentheses "Full Form (ACRONYM)".
 */
function checkAcronyms(source, rule) {
  const violations = [];

  // Find all definitions: "Something (ACRO)" with their offsets
  const defRe = /\(([A-Z]{2,6})\)/g;
  const definedAt = new Map(); // ACRO → first definition offset
  let m;
  while ((m = defRe.exec(source)) !== null) {
    if (!definedAt.has(m[1])) {
      definedAt.set(m[1], m.index);
    }
  }

  // Find all bare usages of known acronyms
  for (const [acro, defOffset] of definedAt) {
    const usageRe = new RegExp(`\\b${acro}\\b`, 'g');
    usageRe.lastIndex = 0;
    while ((m = usageRe.exec(source)) !== null) {
      // Check if this use is the definition itself (inside parentheses)
      const context = source.slice(Math.max(0, m.index - 1), m.index + acro.length + 1);
      if (context.startsWith('(') && context.endsWith(')')) continue;

      // If this use appears before the definition, flag it
      if (m.index < defOffset) {
        const line = offsetToLine(source, m.index);
        violations.push({
          ruleId: rule.id,
          severity: rule.severity,
          message: `Acronym "${acro}" used before its definition`,
          line,
          offset: m.index,
          excerpt: source.slice(m.index, m.index + 60).replace(/\n/g, ' '),
        });
        break; // Only report first occurrence
      }
    }
  }

  return violations;
}

if (typeof module !== 'undefined') {
  module.exports = { checkCompleteness };
}
