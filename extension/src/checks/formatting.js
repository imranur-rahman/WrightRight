'use strict';

const { offsetToLine } = require('../utils/latex-parse.js');

/**
 * formatting.js — checks caption presence and label prefix conventions.
 *
 * Handles:
 *   - type:macro-presence (figure/table captions)
 *   - type:regex (label prefix patterns)
 *
 * @param {string} source - full LaTeX source
 * @param {object[]} rules - RULES filtered to category:formatting
 * @returns {object[]} violations
 */
function checkFormatting(source, rules) {
  const violations = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.check.type === 'macro-presence') {
      violations.push(...checkMacroPresence(source, rule));
    } else if (rule.check.type === 'regex') {
      violations.push(...checkRegex(source, rule));
    }
  }

  return violations;
}

/**
 * Scan each instance of an environment body for a required macro.
 */
function checkMacroPresence(source, rule) {
  const violations = [];
  const { environment, requiredMacro } = rule.check;

  const envRe = new RegExp(
    `\\\\begin\\{${escapeRe(environment)}[^}]*\\}([\\s\\S]*?)\\\\end\\{${escapeRe(environment)}\\}`,
    'g'
  );
  const macroRe = new RegExp(requiredMacro);

  let match;
  while ((match = envRe.exec(source)) !== null) {
    const body = match[1];
    if (!macroRe.test(body)) {
      const line = offsetToLine(source, match.index);
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: rule.check.message || `${environment} environment is missing required macro`,
        line,
        offset: match.index,
        excerpt: source.slice(match.index, match.index + 80).replace(/\n/g, ' '),
      });
    }
  }

  return violations;
}

/**
 * Run a regex pattern against the full source, emit one violation per match.
 */
function checkRegex(source, rule) {
  const violations = [];
  const { pattern, flags, message } = rule.check;
  const re = new RegExp(pattern, flags || '');

  let match;
  while ((match = re.exec(source)) !== null) {
    const line = offsetToLine(source, match.index);
    violations.push({
      ruleId: rule.id,
      severity: rule.severity,
      message: message || `Pattern match: ${rule.name}`,
      line,
      offset: match.index,
      excerpt: match[0].slice(0, 80).replace(/\n/g, ' '),
    });
    // Prevent infinite loops on zero-length matches
    if (match[0].length === 0) re.lastIndex++;
  }

  return violations;
}

function escapeRe(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

if (typeof module !== 'undefined') {
  module.exports = { checkFormatting };
}
