'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');

const POLICY_FILES = [
  'structural.yaml',
  'formatting.yaml',
  'language.yaml',
  'completeness.yaml',
];

const POLICIES_DIR = path.join(__dirname, '..', 'policies');

// JSON schema for a single policy entry
const policySchema = {
  type: 'object',
  required: ['id', 'category', 'name', 'description', 'severity', 'enabled', 'scope', 'check'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', pattern: '^[a-z][a-z0-9-]*$' },
    category: { type: 'string', enum: ['structural', 'formatting', 'language', 'completeness'] },
    name: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    severity: { type: 'string', enum: ['warning'] },
    enabled: { type: 'boolean' },
    scope: { type: 'string', enum: ['extension', 'latex', 'both'] },
    check: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string', enum: ['structure', 'regex', 'macro-presence', 'languagetool'] },
        // structure fields
        required_sections: {
          type: 'array',
          items: {
            type: 'object',
            required: ['pattern', 'label'],
            properties: {
              pattern: { type: 'string' },
              label: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
        order: {
          oneOf: [
            { type: 'null' },
            {
              type: 'object',
              required: ['before', 'after'],
              properties: {
                before: {
                  type: 'object',
                  required: ['pattern', 'label'],
                  properties: {
                    pattern: { type: 'string' },
                    label: { type: 'string' },
                  },
                  additionalProperties: false,
                },
                after: {
                  type: 'object',
                  required: ['pattern', 'label'],
                  properties: {
                    pattern: { type: 'string' },
                    label: { type: 'string' },
                  },
                  additionalProperties: false,
                },
              },
              additionalProperties: false,
            },
          ],
        },
        // regex fields
        pattern: { type: 'string' },
        flags: { type: 'string' },
        message: { type: 'string' },
        // macro-presence fields
        environment: { type: 'string' },
        required_macro: { type: 'string' },
        cross_reference: {
          type: 'object',
          required: ['label_pattern', 'ref_pattern'],
          properties: {
            label_pattern: { type: 'string' },
            ref_pattern: { type: 'string' },
          },
          additionalProperties: false,
        },
        // languagetool fields
        languagetool_rule_ids: {
          type: 'array',
          items: { type: 'string' },
        },
        fallback_regex: {
          type: 'object',
          required: ['pattern', 'flags'],
          properties: {
            pattern: { oneOf: [{ type: 'string' }, { type: 'null' }] },
            flags: { type: 'string' },
          },
          additionalProperties: false,
        },
        word_limit: { type: 'number' },
      },
    },
  },
};

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(policySchema);

function loadAndValidate() {
  let allPolicies = [];
  let hasErrors = false;

  for (const filename of POLICY_FILES) {
    const filepath = path.join(POLICIES_DIR, filename);
    let docs;
    try {
      const raw = fs.readFileSync(filepath, 'utf8');
      docs = yaml.load(raw);
    } catch (err) {
      console.error(`[schema-validate] Failed to parse ${filename}: ${err.message}`);
      hasErrors = true;
      continue;
    }

    if (!Array.isArray(docs)) {
      console.error(`[schema-validate] ${filename}: expected a YAML array of policies`);
      hasErrors = true;
      continue;
    }

    for (const doc of docs) {
      const valid = validate(doc);
      if (!valid) {
        console.error(`[schema-validate] ${filename} → policy "${doc.id || '(unknown)'}":`);
        for (const err of validate.errors) {
          console.error(`  ${err.instancePath || '/'} ${err.message}`);
        }
        hasErrors = true;
      } else {
        // Extra constraint: languagetool type is not allowed on latex-scoped policies
        if (doc.check.type === 'languagetool' && doc.scope === 'latex') {
          console.error(
            `[schema-validate] ${filename} → policy "${doc.id}": type:languagetool is not allowed for scope:latex`
          );
          hasErrors = true;
        }
        // Extra constraint: languagetool type is not allowed on both-scoped policies
        if (doc.check.type === 'languagetool' && doc.scope === 'both') {
          console.error(
            `[schema-validate] ${filename} → policy "${doc.id}": type:languagetool is not allowed for scope:both (latex cannot run NLP)`
          );
          hasErrors = true;
        }

        // Validate that regex patterns actually compile
        if (doc.check.type === 'regex' && doc.check.pattern) {
          try {
            new RegExp(doc.check.pattern, doc.check.flags || '');
          } catch (e) {
            console.error(
              `[schema-validate] ${filename} → policy "${doc.id}": invalid regex pattern: ${e.message}`
            );
            hasErrors = true;
          }
        }
        if (
          doc.check.type === 'languagetool' &&
          doc.check.fallback_regex &&
          doc.check.fallback_regex.pattern
        ) {
          try {
            new RegExp(doc.check.fallback_regex.pattern, doc.check.fallback_regex.flags || '');
          } catch (e) {
            console.error(
              `[schema-validate] ${filename} → policy "${doc.id}": invalid fallback_regex pattern: ${e.message}`
            );
            hasErrors = true;
          }
        }
      }
      allPolicies.push({ file: filename, policy: doc });
    }
  }

  // Check for duplicate IDs across all files
  const seenIds = new Map();
  for (const { file, policy } of allPolicies) {
    if (!policy.id) continue;
    if (seenIds.has(policy.id)) {
      console.error(
        `[schema-validate] Duplicate policy ID "${policy.id}" in ${file} (first seen in ${seenIds.get(policy.id)})`
      );
      hasErrors = true;
    } else {
      seenIds.set(policy.id, file);
    }
  }

  return { hasErrors, count: allPolicies.length };
}

const { hasErrors, count } = loadAndValidate();
if (hasErrors) {
  console.error('[schema-validate] Validation FAILED.');
  process.exit(1);
} else {
  console.log(`[schema-validate] OK — ${count} policies validated.`);
}
