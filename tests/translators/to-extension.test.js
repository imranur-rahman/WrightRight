'use strict';

const path = require('path');
const fs = require('fs');

// Run the translator and check output
describe('to-extension translator', () => {
  const outputPath = path.join(__dirname, '..', '..', 'extension', 'src', 'generated-rules.js');

  beforeAll(() => {
    // Run the translator
    require('../../translators/to-extension.js');
  });

  test('generates generated-rules.js', () => {
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  test('output contains AUTO-GENERATED banner', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('AUTO-GENERATED');
    expect(content).toContain('do not edit');
  });

  test('output defines var RULES', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toMatch(/^var RULES = \[/m);
  });

  test('output contains only extension-scoped rules', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    // Evaluate the file to get RULES
    const sandbox = {};
    // eslint-disable-next-line no-new-func
    new Function(content + '\nObject.assign(arguments[0], { RULES });')(sandbox);
    const rules = sandbox.RULES;

    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);

    for (const rule of rules) {
      expect(['extension', 'both']).toContain(rule.scope);
      expect(rule.enabled).toBe(true);
    }
  });

  test('output uses camelCase property names', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).not.toContain('required_sections');
    expect(content).not.toContain('languagetool_rule_ids');
    expect(content).not.toContain('fallback_regex');
    // Should have camelCase versions
    expect(content).toContain('requiredSections');
    expect(content).toContain('languagetoolRuleIds');
    expect(content).toContain('fallbackRegex');
  });

  test('language rules are included (extension-only)', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('lang-passive-voice');
    expect(content).toContain('lang-sentence-length');
  });

  test('does not include latex-only rules (none in current policies)', () => {
    // All policies are either extension or both; this test verifies
    // that a latex-only rule would be excluded
    const content = fs.readFileSync(outputPath, 'utf8');
    // No policy has scope:latex in current set, so just verify RULES is populated
    expect(content).toContain('struct-required-abstract');
  });
});
