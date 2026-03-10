'use strict';

const fs = require('fs');
const path = require('path');
const { checkFormatting } = require('../../extension/src/checks/formatting.js');

const FIXTURES = path.join(__dirname, 'fixtures');
const samplePaper = fs.readFileSync(path.join(FIXTURES, 'sample-paper.tex'), 'utf8');
const brokenPaper = fs.readFileSync(path.join(FIXTURES, 'broken-paper.tex'), 'utf8');

const FORMATTING_RULES = [
  {
    id: 'fmt-figure-needs-caption',
    category: 'formatting',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'macro-presence',
      environment: 'figure',
      requiredMacro: '\\\\caption\\s*\\{',
    },
  },
  {
    id: 'fmt-table-needs-caption',
    category: 'formatting',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'macro-presence',
      environment: 'table',
      requiredMacro: '\\\\caption\\s*\\{',
    },
  },
  {
    id: 'fmt-label-prefix-figure',
    category: 'formatting',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'regex',
      pattern:
        '\\\\begin\\{figure[^}]*\\}[\\s\\S]*?\\\\label\\{(?!fig:)[^}]+\\}[\\s\\S]*?\\\\end\\{figure\\}',
      flags: 'g',
      message: 'Figure label does not use fig: prefix',
    },
  },
  {
    id: 'fmt-label-prefix-table',
    category: 'formatting',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'regex',
      pattern:
        '\\\\begin\\{table[^}]*\\}[\\s\\S]*?\\\\label\\{(?!tab:)[^}]+\\}[\\s\\S]*?\\\\end\\{table\\}',
      flags: 'g',
      message: 'Table label does not use tab: prefix',
    },
  },
  {
    id: 'fmt-label-prefix-section',
    category: 'formatting',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'regex',
      pattern:
        '\\\\(?:sub)*section\\*?\\{[^}]+\\}(?:(?!\\\\begin\\{)[\\s\\S]){0,200}?\\\\label\\{(?!sec:)[^}]+\\}',
      flags: 'g',
      message: 'Section label does not use sec: prefix',
    },
  },
  {
    id: 'fmt-label-prefix-equation',
    category: 'formatting',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'regex',
      pattern:
        '\\\\begin\\{(?:equation|align|gather|multline)[^}]*\\}[\\s\\S]*?\\\\label\\{(?!eq:)[^}]+\\}[\\s\\S]*?\\\\end\\{(?:equation|align|gather|multline)\\}',
      flags: 'g',
      message: 'Equation label does not use eq: prefix',
    },
  },
];

describe('checkFormatting — sample-paper.tex (well-formed)', () => {
  test('no formatting violations', () => {
    const violations = checkFormatting(samplePaper, FORMATTING_RULES);
    expect(violations).toHaveLength(0);
  });
});

describe('checkFormatting — broken-paper.tex', () => {
  let violations;

  beforeAll(() => {
    violations = checkFormatting(brokenPaper, FORMATTING_RULES);
  });

  test('detects figure without caption', () => {
    expect(violations.some((v) => v.ruleId === 'fmt-figure-needs-caption')).toBe(true);
  });

  test('detects table without caption', () => {
    expect(violations.some((v) => v.ruleId === 'fmt-table-needs-caption')).toBe(true);
  });

  test('detects figure label without fig: prefix', () => {
    expect(violations.some((v) => v.ruleId === 'fmt-label-prefix-figure')).toBe(true);
  });

  test('detects table label without tab: prefix', () => {
    expect(violations.some((v) => v.ruleId === 'fmt-label-prefix-table')).toBe(true);
  });

  test('detects section label without sec: prefix', () => {
    expect(violations.some((v) => v.ruleId === 'fmt-label-prefix-section')).toBe(true);
  });

  test('detects equation label without eq: prefix', () => {
    expect(violations.some((v) => v.ruleId === 'fmt-label-prefix-equation')).toBe(true);
  });

  test('violations include line numbers', () => {
    for (const v of violations) {
      if (v.line !== null) {
        expect(typeof v.line).toBe('number');
        expect(v.line).toBeGreaterThan(0);
      }
    }
  });
});
