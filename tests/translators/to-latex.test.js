'use strict';

const path = require('path');
const fs = require('fs');

describe('to-latex translator', () => {
  const outputPath = path.join(__dirname, '..', '..', 'latex', 'writeright.sty');

  beforeAll(() => {
    require('../../translators/to-latex.js');
  });

  test('generates writeright.sty', () => {
    expect(fs.existsSync(outputPath)).toBe(true);
  });

  test('output contains AUTO-GENERATED banner', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('AUTO-GENERATED');
    expect(content).toContain('do not edit');
  });

  test('output has \\ProvidesPackage declaration', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('\\ProvidesPackage{writeright}');
  });

  test('output requires etoolbox and xstring', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('\\RequirePackage{etoolbox}');
    expect(content).toContain('\\RequirePackage{xstring}');
  });

  test('each policy has a DeclareOption disable switch', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('\\DeclareOption{no-struct-required-abstract}');
    expect(content).toContain('\\DeclareOption{no-fmt-figure-needs-caption}');
    expect(content).toContain('\\DeclareOption{no-comp-label-referenced}');
  });

  test('structural checks emit PackageWarning', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('[struct-required-abstract]');
    expect(content).toContain('[struct-required-introduction]');
    expect(content).toContain('[struct-required-conclusion]');
    expect(content).toContain('[struct-required-references]');
    expect(content).toContain('[struct-abstract-before-intro]');
  });

  test('formatting checks emit PackageWarning', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('[fmt-figure-needs-caption]');
    expect(content).toContain('[fmt-table-needs-caption]');
    expect(content).toContain('[fmt-label-prefix-figure]');
    expect(content).toContain('[fmt-label-prefix-table]');
    expect(content).toContain('[fmt-label-prefix-section]');
    expect(content).toContain('[fmt-label-prefix-equation]');
  });

  test('completeness checks emit PackageWarning', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).toContain('[comp-label-referenced]');
    expect(content).toContain('[comp-figure-referenced]');
    expect(content).toContain('[comp-table-referenced]');
  });

  test('language rules are NOT in the .sty (extension-only)', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content).not.toContain('lang-passive-voice');
    expect(content).not.toContain('lang-sentence-length');
  });

  test('ends with \\endinput', () => {
    const content = fs.readFileSync(outputPath, 'utf8');
    expect(content.trimEnd()).toMatch(/\\endinput$/);
  });
});
