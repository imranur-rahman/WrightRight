'use strict';

/* global RULES */

const { checkStructural } = require('./checks/structural.js');
const { checkFormatting } = require('./checks/formatting.js');
const { checkCompleteness } = require('./checks/completeness.js');
const { checkLanguageTool, loadLTSettings } = require('./checks/languagetool.js');

/**
 * Run all enabled policy checks against the LaTeX source.
 *
 * @param {string} source - full LaTeX source text
 * @returns {Promise<object[]>} all violations sorted by line
 */
async function runAllChecks(source) {
  // RULES is loaded from generated-rules.js (var RULES = [...])
  const rules = typeof RULES !== 'undefined' ? RULES : [];

  const structuralRules = rules.filter((r) => r.category === 'structural');
  const formattingRules = rules.filter((r) => r.category === 'formatting');
  const completenessRules = rules.filter((r) => r.category === 'completeness');
  const languageRules = rules.filter((r) => r.category === 'language');

  const ltSettings = await loadLTSettings();

  const [structViolations, fmtViolations, compViolations, langViolations] = await Promise.all([
    Promise.resolve(checkStructural(source, structuralRules)),
    Promise.resolve(checkFormatting(source, formattingRules)),
    Promise.resolve(checkCompleteness(source, completenessRules)),
    checkLanguageTool(source, languageRules, ltSettings),
  ]);

  const all = [
    ...structViolations,
    ...fmtViolations,
    ...compViolations,
    ...langViolations,
  ];

  // Sort by line (nulls last)
  all.sort((a, b) => {
    if (a.line === null && b.line === null) return 0;
    if (a.line === null) return 1;
    if (b.line === null) return -1;
    return a.line - b.line;
  });

  return all;
}

if (typeof module !== 'undefined') {
  module.exports = { runAllChecks };
}
