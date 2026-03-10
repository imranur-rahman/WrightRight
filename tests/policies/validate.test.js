'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const POLICY_FILES = ['structural.yaml', 'formatting.yaml', 'language.yaml', 'completeness.yaml'];
const POLICIES_DIR = path.join(__dirname, '..', '..', 'policies');

function loadAll() {
  const all = [];
  for (const f of POLICY_FILES) {
    const raw = fs.readFileSync(path.join(POLICIES_DIR, f), 'utf8');
    const docs = yaml.load(raw);
    all.push(...docs.map((d) => ({ file: f, policy: d })));
  }
  return all;
}

describe('Policy YAML files', () => {
  let allPolicies;

  beforeAll(() => {
    allPolicies = loadAll();
  });

  test('all files parse as arrays', () => {
    for (const f of POLICY_FILES) {
      const raw = fs.readFileSync(path.join(POLICIES_DIR, f), 'utf8');
      const docs = yaml.load(raw);
      expect(Array.isArray(docs)).toBe(true);
    }
  });

  test('all policies have required fields', () => {
    const required = ['id', 'category', 'name', 'description', 'severity', 'enabled', 'scope', 'check'];
    for (const { file, policy } of allPolicies) {
      for (const field of required) {
        expect({ file, field, has: field in policy }).toEqual({ file, field, has: true });
      }
    }
  });

  test('all IDs are globally unique', () => {
    const seen = new Map();
    for (const { file, policy } of allPolicies) {
      if (seen.has(policy.id)) {
        throw new Error(`Duplicate ID "${policy.id}" in ${file} (first in ${seen.get(policy.id)})`);
      }
      seen.set(policy.id, file);
    }
    expect(seen.size).toBe(allPolicies.length);
  });

  test('all IDs are kebab-case', () => {
    for (const { policy } of allPolicies) {
      expect(policy.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  test('severity is always "warning"', () => {
    for (const { policy } of allPolicies) {
      expect(policy.severity).toBe('warning');
    }
  });

  test('scope is one of extension|latex|both', () => {
    for (const { policy } of allPolicies) {
      expect(['extension', 'latex', 'both']).toContain(policy.scope);
    }
  });

  test('languagetool check type only used with scope:extension', () => {
    for (const { file, policy } of allPolicies) {
      if (policy.check.type === 'languagetool') {
        expect({ file, id: policy.id, scope: policy.scope }).toMatchObject({ scope: 'extension' });
      }
    }
  });

  test('regex patterns compile without error', () => {
    for (const { policy } of allPolicies) {
      if (policy.check.type === 'regex' && policy.check.pattern) {
        expect(() => new RegExp(policy.check.pattern, policy.check.flags || '')).not.toThrow();
      }
      if (policy.check.type === 'languagetool' && policy.check.fallback_regex?.pattern) {
        expect(() =>
          new RegExp(policy.check.fallback_regex.pattern, policy.check.fallback_regex.flags || '')
        ).not.toThrow();
      }
    }
  });

  test('expected policy IDs are present', () => {
    const expectedIds = [
      'struct-required-abstract',
      'struct-required-introduction',
      'struct-required-conclusion',
      'struct-required-references',
      'struct-abstract-before-intro',
      'fmt-figure-needs-caption',
      'fmt-table-needs-caption',
      'fmt-label-prefix-figure',
      'fmt-label-prefix-table',
      'fmt-label-prefix-section',
      'fmt-label-prefix-equation',
      'lang-passive-voice',
      'lang-hedge-words',
      'lang-sentence-length',
      'lang-first-person-singular',
      'comp-acronym-first-use',
      'comp-label-referenced',
      'comp-figure-referenced',
      'comp-table-referenced',
    ];
    const foundIds = new Set(allPolicies.map((p) => p.policy.id));
    for (const id of expectedIds) {
      expect(foundIds.has(id)).toBe(true);
    }
  });
});
