'use strict';

const { stripLatex, splitSentences, toLatexOffset, offsetToLine } = require('../utils/latex-parse.js');

const DEFAULT_ENDPOINT = 'https://api.languagetool.org/v2/check';

/**
 * Language checks via LanguageTool API (with fallback to regex).
 *
 * @param {string} source - full LaTeX source
 * @param {object[]} rules - RULES filtered to category:language
 * @param {object} [ltSettings] - { endpointUrl, apiUsername, apiKey }
 * @returns {Promise<object[]>} violations
 */
async function checkLanguageTool(source, rules, ltSettings = {}) {
  const violations = [];
  const enabledRules = rules.filter((r) => r.enabled && r.check.type === 'languagetool');
  if (enabledRules.length === 0) return violations;

  const { text: plainText, offsetMap } = stripLatex(source);

  // Build set of all LT rule IDs we care about, mapped back to WriteRight rule
  const ltRuleMap = new Map(); // ltRuleId → writeright rule
  for (const rule of enabledRules) {
    for (const ltId of rule.check.languagetoolRuleIds || []) {
      ltRuleMap.set(ltId, rule);
    }
  }

  // Attempt LanguageTool API call
  let ltMatches = [];
  try {
    ltMatches = await callLanguageTool(plainText, ltSettings, Array.from(ltRuleMap.keys()));
  } catch (err) {
    // API unavailable — will fall through to fallback regex
    ltMatches = [];
  }

  // Map LT matches to violations
  for (const match of ltMatches) {
    const wrRule = ltRuleMap.get(match.rule.id);
    if (!wrRule) continue;

    const latexOffset = toLatexOffset(offsetMap, match.offset);
    const line = offsetToLine(source, latexOffset);

    violations.push({
      ruleId: wrRule.id,
      severity: wrRule.severity,
      message: wrRule.check.message || match.message,
      line,
      offset: latexOffset,
      excerpt: source.slice(latexOffset, latexOffset + 80).replace(/\n/g, ' '),
    });
  }

  // Run fallback regex checks for rules that didn't get LT matches
  const coveredRuleIds = new Set(violations.map((v) => v.ruleId));

  for (const rule of enabledRules) {
    if (coveredRuleIds.has(rule.id)) continue;

    const { fallbackRegex, wordLimit, message } = rule.check;

    if (wordLimit) {
      // Sentence-length check
      const sentences = splitSentences(plainText);
      for (const sentence of sentences) {
        const wordCount = sentence.text.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > wordLimit) {
          const latexOffset = toLatexOffset(offsetMap, sentence.start);
          const line = offsetToLine(source, latexOffset);
          violations.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: message || `Sentence exceeds ${wordLimit} words`,
            line,
            offset: latexOffset,
            excerpt: sentence.text.slice(0, 80),
          });
        }
      }
    } else if (fallbackRegex && fallbackRegex.pattern) {
      const re = new RegExp(fallbackRegex.pattern, fallbackRegex.flags || '');
      let m;
      while ((m = re.exec(plainText)) !== null) {
        const latexOffset = toLatexOffset(offsetMap, m.index);
        const line = offsetToLine(source, latexOffset);
        violations.push({
          ruleId: rule.id,
          severity: rule.severity,
          message: message || `Pattern match: ${rule.name}`,
          line,
          offset: latexOffset,
          excerpt: m[0].slice(0, 80),
        });
        if (m[0].length === 0) re.lastIndex++;
      }
    }
  }

  return violations;
}

/**
 * POST to LanguageTool API. Returns array of LT match objects.
 */
async function callLanguageTool(plainText, settings = {}, enabledRuleIds = []) {
  const endpointUrl = settings.endpointUrl || DEFAULT_ENDPOINT;

  const params = new URLSearchParams({ text: plainText, language: 'en-US' });
  if (settings.apiUsername) params.set('username', settings.apiUsername);
  if (settings.apiKey) params.set('apiKey', settings.apiKey);
  if (enabledRuleIds.length > 0) {
    params.set('enabledRules', enabledRuleIds.join(','));
    params.set('enabledOnly', 'false');
  }

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`LanguageTool API error: ${response.status}`);
  }

  const data = await response.json();
  return data.matches || [];
}

/**
 * Load LanguageTool settings from chrome.storage.local.
 * @returns {Promise<{endpointUrl: string, apiUsername: string, apiKey: string}>}
 */
function loadLTSettings() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve({ endpointUrl: DEFAULT_ENDPOINT, apiUsername: '', apiKey: '' });
      return;
    }
    chrome.storage.local.get(['ltEndpointUrl', 'ltApiUsername', 'ltApiKey'], (result) => {
      resolve({
        endpointUrl: result.ltEndpointUrl || DEFAULT_ENDPOINT,
        apiUsername: result.ltApiUsername || '',
        apiKey: result.ltApiKey || '',
      });
    });
  });
}

if (typeof module !== 'undefined') {
  module.exports = { checkLanguageTool, callLanguageTool, loadLTSettings };
}
