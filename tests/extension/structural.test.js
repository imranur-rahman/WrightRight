'use strict';

const fs = require('fs');
const path = require('path');
const { checkStructural } = require('../../extension/src/checks/structural.js');

const FIXTURES = path.join(__dirname, 'fixtures');
const samplePaper = fs.readFileSync(path.join(FIXTURES, 'sample-paper.tex'), 'utf8');
const brokenPaper = fs.readFileSync(path.join(FIXTURES, 'broken-paper.tex'), 'utf8');

const STRUCTURAL_RULES = [
  {
    id: 'struct-required-abstract',
    category: 'structural',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'structure',
      requiredSections: [
        { pattern: '\\\\begin\\{abstract\\}|\\\\section\\*?\\{Abstract\\}', label: 'Abstract' },
      ],
      order: null,
    },
  },
  {
    id: 'struct-required-introduction',
    category: 'structural',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'structure',
      requiredSections: [
        { pattern: '\\\\section\\*?\\{Introduction\\}', label: 'Introduction' },
      ],
      order: null,
    },
  },
  {
    id: 'struct-required-conclusion',
    category: 'structural',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'structure',
      requiredSections: [
        { pattern: '\\\\section\\*?\\{Conclusion[s]?\\}', label: 'Conclusion' },
      ],
      order: null,
    },
  },
  {
    id: 'struct-required-references',
    category: 'structural',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'structure',
      requiredSections: [
        {
          pattern:
            '\\\\begin\\{thebibliography\\}|\\\\bibliography\\{|\\\\printbibliography|\\\\section\\*?\\{References\\}',
          label: 'References',
        },
      ],
      order: null,
    },
  },
  {
    id: 'struct-abstract-before-intro',
    category: 'structural',
    severity: 'warning',
    enabled: true,
    scope: 'both',
    check: {
      type: 'structure',
      requiredSections: [
        { pattern: '\\\\begin\\{abstract\\}|\\\\section\\*?\\{Abstract\\}', label: 'Abstract' },
        { pattern: '\\\\section\\*?\\{Introduction\\}', label: 'Introduction' },
      ],
      order: {
        before: {
          pattern: '\\\\begin\\{abstract\\}|\\\\section\\*?\\{Abstract\\}',
          label: 'Abstract',
        },
        after: { pattern: '\\\\section\\*?\\{Introduction\\}', label: 'Introduction' },
      },
    },
  },
];

describe('checkStructural — sample-paper.tex (well-formed)', () => {
  test('no structural violations', () => {
    const violations = checkStructural(samplePaper, STRUCTURAL_RULES);
    expect(violations).toHaveLength(0);
  });
});

describe('checkStructural — broken-paper.tex', () => {
  let violations;

  beforeAll(() => {
    violations = checkStructural(brokenPaper, STRUCTURAL_RULES);
  });

  test('detects missing abstract', () => {
    expect(violations.some((v) => v.ruleId === 'struct-required-abstract')).toBe(true);
  });

  test('detects missing conclusion', () => {
    expect(violations.some((v) => v.ruleId === 'struct-required-conclusion')).toBe(true);
  });

  test('detects missing references', () => {
    expect(violations.some((v) => v.ruleId === 'struct-required-references')).toBe(true);
  });

  test('introduction is present (no violation)', () => {
    expect(violations.some((v) => v.ruleId === 'struct-required-introduction')).toBe(false);
  });
});
