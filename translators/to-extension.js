'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const POLICY_FILES = [
  'structural.yaml',
  'formatting.yaml',
  'language.yaml',
  'completeness.yaml',
];

const POLICIES_DIR = path.join(__dirname, '..', 'policies');
const OUTPUT_FILE = path.join(__dirname, '..', 'extension', 'src', 'generated-rules.js');

function snakeToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      result[camelKey] = snakeToCamel(value);
    }
    return result;
  }
  return obj;
}

function loadPolicies() {
  const all = [];
  for (const filename of POLICY_FILES) {
    const filepath = path.join(POLICIES_DIR, filename);
    const raw = fs.readFileSync(filepath, 'utf8');
    const docs = yaml.load(raw);
    if (!Array.isArray(docs)) {
      throw new Error(`${filename}: expected a YAML array`);
    }
    all.push(...docs);
  }
  return all;
}

function main() {
  const policies = loadPolicies();
  const filtered = policies.filter(
    (p) => p.enabled && (p.scope === 'extension' || p.scope === 'both')
  );

  const camelCased = filtered.map(snakeToCamel);

  const timestamp = new Date().toISOString();
  const banner = [
    '// AUTO-GENERATED — do not edit',
    `// Generated at: ${timestamp}`,
    '// Source: policies/*.yaml → translators/to-extension.js',
    '',
  ].join('\n');

  const rulesJson = JSON.stringify(camelCased, null, 2);
  const content = `${banner}var RULES = ${rulesJson};\n`;

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, content, 'utf8');

  console.log(
    `[to-extension] Generated ${filtered.length} rules → extension/src/generated-rules.js`
  );
}

main();
