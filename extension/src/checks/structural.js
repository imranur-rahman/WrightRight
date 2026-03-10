'use strict';

/**
 * structural.js — checks for required sections and ordering constraints.
 *
 * @param {string} source - full LaTeX source
 * @param {object[]} rules - RULES filtered to category:structural
 * @returns {object[]} violations
 */
function checkStructural(source, rules) {
  const violations = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.check.type !== 'structure') continue;

    const { requiredSections, order } = rule.check;
    if (!requiredSections || requiredSections.length === 0) continue;

    if (order) {
      // Ordering check: "before" must appear before "after"
      const beforeMatch = findFirstMatch(source, order.before.pattern);
      const afterMatch = findFirstMatch(source, order.after.pattern);

      if (beforeMatch !== null && afterMatch !== null && beforeMatch > afterMatch) {
        violations.push({
          ruleId: rule.id,
          severity: rule.severity,
          message: `${order.before.label} appears after ${order.after.label}`,
          line: null,
          offset: beforeMatch,
          excerpt: source.slice(beforeMatch, beforeMatch + 60),
        });
      }
    } else {
      // Presence check: all required sections must be found
      for (const section of requiredSections) {
        const re = new RegExp(section.pattern);
        if (!re.test(source)) {
          violations.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: `Required section "${section.label}" not found`,
            line: null,
            offset: null,
            excerpt: null,
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Returns the char offset of the first match, or null.
 */
function findFirstMatch(source, pattern) {
  const re = new RegExp(pattern);
  const m = re.exec(source);
  return m ? m.index : null;
}

if (typeof module !== 'undefined') {
  module.exports = { checkStructural };
}
