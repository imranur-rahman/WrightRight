'use strict';

const fs = require('fs');
const path = require('path');
const { checkCompleteness } = require('../../extension/src/checks/completeness.js');

const FIXTURES = path.join(__dirname, 'fixtures');
const samplePaper = fs.readFileSync(path.join(FIXTURES, 'sample-paper.tex'), 'utf8');
const brokenPaper = fs.readFileSync(path.join(FIXTURES, 'broken-paper.tex'), 'utf8');

const COMPLETENESS_RULES = [
  {
    id: 'comp-acronym-first-use',
    category: 'completeness',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'macro-presence',
      environment: 'document',
      requiredMacro: '\\\\(?:ac|acf|acrfull|gls)\\s*\\{|\\([A-Z]{2,6}\\)',
      crossReference: {
        labelPattern: '\\(([A-Z]{2,6})\\)',
        refPattern: '\\b([A-Z]{2,6})\\b',
      },
    },
  },
  {
    id: 'comp-label-referenced',
    category: 'completeness',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'macro-presence',
      environment: 'document',
      requiredMacro: '\\\\ref\\s*\\{|\\\\eqref\\s*\\{|\\\\autoref\\s*\\{|\\\\cref\\s*\\{',
      crossReference: {
        labelPattern: '\\\\label\\{([^}]+)\\}',
        refPattern: '\\\\(?:ref|eqref|autoref|cref|Cref)\\{([^}]+)\\}',
      },
    },
  },
  {
    id: 'comp-figure-referenced',
    category: 'completeness',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'macro-presence',
      environment: 'figure',
      requiredMacro: '\\\\label\\s*\\{',
      crossReference: {
        labelPattern: '\\\\label\\{(fig:[^}]+)\\}',
        refPattern: '\\\\(?:ref|autoref|cref|Cref)\\{(fig:[^}]+)\\}',
      },
    },
  },
  {
    id: 'comp-table-referenced',
    category: 'completeness',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'macro-presence',
      environment: 'table',
      requiredMacro: '\\\\label\\s*\\{',
      crossReference: {
        labelPattern: '\\\\label\\{(tab:[^}]+)\\}',
        refPattern: '\\\\(?:ref|autoref|cref|Cref)\\{(tab:[^}]+)\\}',
      },
    },
  },
];

describe('checkCompleteness — sample-paper.tex (well-formed)', () => {
  test('no completeness violations', () => {
    const violations = checkCompleteness(samplePaper, COMPLETENESS_RULES);
    expect(violations).toHaveLength(0);
  });
});

describe('checkCompleteness — broken-paper.tex', () => {
  let violations;

  beforeAll(() => {
    violations = checkCompleteness(brokenPaper, COMPLETENESS_RULES);
  });

  test('detects acronym used before definition', () => {
    expect(violations.some((v) => v.ruleId === 'comp-acronym-first-use')).toBe(true);
  });

  test('detects unreferenced figure label', () => {
    expect(violations.some((v) => v.ruleId === 'comp-figure-referenced')).toBe(true);
  });

  test('detects unreferenced table label', () => {
    expect(violations.some((v) => v.ruleId === 'comp-table-referenced')).toBe(true);
  });
});
