// scripts/profile-parser.mjs
//
// Profile configuration parser and validator.
// Handles YAML/JSON configuration files, applies overrides, and validates against schema.

import fs from 'fs';
import path from 'path';

// Default Profile configurations
export const PROFILE_DEFAULTS = {
  minimal: {
    plan_confirmation: 'implicit',
    review_gate: 'pr_ready',
    completion_gate: 'release_confirmed',
    audit_comments: 'none',
    project_check: 'disabled',
    release_reconciliation: 'disabled',
    output_verbosity: 'minimal',
  },
  standard: {
    plan_confirmation: 'risk_based',
    review_gate: 'pr_ready',
    completion_gate: 'release_confirmed',
    audit_comments: 'summary',
    project_check: 'when_configured',
    release_reconciliation: 'on_request',
    output_verbosity: 'standard',
  },
  strict: {
    plan_confirmation: 'explicit',
    review_gate: 'user_acceptance',
    completion_gate: 'production_deployment',
    audit_comments: 'detailed',
    project_check: 'required',
    release_reconciliation: 'enabled',
    output_verbosity: 'detailed',
  },
};

// Valid values for each strategy item
export const STRATEGY_SCHEMA = {
  plan_confirmation: ['implicit', 'risk_based', 'explicit'],
  review_gate: ['pr_ready', 'user_acceptance'],
  completion_gate: ['release_confirmed', 'production_deployment', 'manual'],
  audit_comments: ['none', 'summary', 'detailed'],
  project_check: ['disabled', 'when_configured', 'required'],
  release_reconciliation: ['disabled', 'on_request', 'enabled'],
  output_verbosity: ['minimal', 'standard', 'detailed'],
};

// Invariants that cannot be overridden
export const PROTECTED_INVARIANTS = {
  read_before_write: true,
  write_back_verification: true,
  authorization_required: true,
  team_boundary: true,
  reality_check: true,
};

/**
 * Parse configuration from YAML/JSON file or object.
 * Missing config file => default `standard` (allowed, not an error).
 * A config file that EXISTS but is invalid => throws (fail closed).
 * @param {string|object} configPath - Path to config file or config object
 * @returns {object} Parsed configuration { profile, overrides }
 */
export function parseConfig(configPath) {
  if (typeof configPath === 'object' && configPath !== null) {
    return validateOrThrow(configPath);
  }
  if (typeof configPath !== 'string') {
    return { profile: 'standard', overrides: {} };
  }
  // A missing config file is allowed: default to standard.
  if (!fs.existsSync(configPath)) {
    return { profile: 'standard', overrides: {} };
  }
  // A present config file MUST be valid. Any malformed/invalid content fails closed.
  const content = fs.readFileSync(configPath, 'utf-8');
  let config;
  try {
    config = JSON.parse(content);
  } catch {
    config = parseSimpleYAML(content);
  }
  return validateOrThrow(config, configPath);
}

// Validate a parsed config object, throwing on any error (fail closed).
function validateOrThrow(config, source = 'config') {
  const validation = validateConfig(config);
  if (!validation.valid) {
    const where = typeof source === 'string' ? ` in ${source}` : '';
    throw new Error(
      `Invalid linear-workflow configuration${where}:\n` + validation.errors.join('\n')
    );
  }
  return config;
}

/**
 * Minimal YAML parser for linear-workflow config format.
 * Supports one level of nesting (e.g. the `overrides:` block) and inline values.
 */
export function parseSimpleYAML(content) {
  const root = {};
  let current = root;
  let indentOf = (line) => line.length - line.replace(/^\s*/, '').length;

  const lines = content.split('\n');
  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = indentOf(line);
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;

    const key = trimmed.slice(0, colon).trim();
    let value = trimmed.slice(colon + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');

    if (indent === 0) {
      if (value === '') {
        // Open a nested object (e.g. `overrides:`)
        root[key] = {};
        current = root[key];
      } else {
        root[key] = value;
        current = root;
      }
    } else {
      current[key] = value;
    }
  }
  return root;
}

/**
 * Merge profile defaults with overrides, applying priority rules.
 * Throws on any invalid profile, unknown override key, or invalid value (fail closed).
 * @param {string} profile - Profile name (minimal, standard, strict)
 * @param {object} overrides - Strategy item overrides
 * @returns {object} Merged configuration
 */
export function mergeConfig(profile = 'standard', overrides = {}) {
  if (!PROFILE_DEFAULTS[profile]) {
    throw new Error(`Invalid profile: '${profile}'. Valid profiles: ${Object.keys(PROFILE_DEFAULTS).join(', ')}`);
  }

  // Start with profile defaults
  const merged = { ...PROFILE_DEFAULTS[profile] };
  merged.profile = profile;

  // Check for Invariant overrides (never allowed)
  for (const invariant of Object.keys(PROTECTED_INVARIANTS)) {
    if (invariant in overrides) {
      throw new Error(`Cannot override Invariant '${invariant}'`);
    }
  }

  // Apply overrides
  for (const [key, value] of Object.entries(overrides)) {
    if (!STRATEGY_SCHEMA[key]) {
      throw new Error(`Unknown strategy item '${key}'. Valid items: ${Object.keys(STRATEGY_SCHEMA).join(', ')}`);
    }
    if (!STRATEGY_SCHEMA[key].includes(value)) {
      throw new Error(`Invalid value '${value}' for '${key}'. Valid values: ${STRATEGY_SCHEMA[key].join(', ')}`);
    }
    merged[key] = value;
  }

  // Forbidden combinations must also fail closed
  const comboErrors = checkForbiddenCombinations(profile, merged);
  if (comboErrors.length) {
    throw new Error(comboErrors.join('; '));
  }

  return merged;
}

/**
 * Check a fully-merged configuration for forbidden profile/strategy combinations.
 * @returns {string[]} List of violation messages (empty if allowed)
 */
export function checkForbiddenCombinations(profile, merged) {
  const errors = [];
  const is = (key, value) => merged[key] === value;

  if (profile === 'minimal') {
    if (is('completion_gate', 'production_deployment')) {
      errors.push("Forbidden: minimal profile cannot use completion_gate 'production_deployment'. Use standard or strict.");
    }
    if (is('audit_comments', 'detailed')) {
      errors.push("Forbidden: minimal profile cannot use audit_comments 'detailed'. Use standard or strict.");
    }
    if (is('release_reconciliation', 'enabled')) {
      errors.push("Forbidden: minimal profile cannot use release_reconciliation 'enabled'. Use strict.");
    }
  }

  // completion_gate: merge violates Reality Check (Invariant 5)
  if (is('completion_gate', 'merge')) {
    errors.push("Forbidden: completion_gate 'merge' violates Reality Check (Invariant 5). Use 'release_confirmed' or 'production_deployment'.");
  }

  // production deployment requires explicit/risk_based planning, never implicit
  if (is('completion_gate', 'production_deployment') && is('plan_confirmation', 'implicit')) {
    errors.push("Forbidden: production_deployment requires explicit/risk_based planning; 'implicit' plan_confirmation is too risky.");
  }

  // pr_ready + production_deployment + no audit has insufficient traceability
  if (is('review_gate', 'pr_ready') && is('completion_gate', 'production_deployment') && is('audit_comments', 'none')) {
    errors.push("Forbidden: pr_ready + production_deployment + audit 'none' has insufficient traceability. Use 'summary' or 'detailed'.");
  }

  return errors;
}

/**
 * Validate configuration against schema and invariants.
 * Pure: returns { valid, errors } and never throws.
 * @param {object} config - Configuration to validate
 * @returns {object} Validation result { valid: boolean, errors: string[] }
 */
export function validateConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return { valid: false, errors: ['Configuration must be an object'] };
  }

  const profile = config.profile || 'standard';

  if (!PROFILE_DEFAULTS[profile]) {
    errors.push(`Invalid profile: '${profile}'. Valid profiles: ${Object.keys(PROFILE_DEFAULTS).join(', ')}`);
  }

  const overrides = config.overrides || {};
  for (const [key, value] of Object.entries(overrides)) {
    if (!STRATEGY_SCHEMA[key]) {
      errors.push(`Unknown strategy item: '${key}'. Valid items: ${Object.keys(STRATEGY_SCHEMA).join(', ')}`);
      continue;
    }
    if (!STRATEGY_SCHEMA[key].includes(value)) {
      errors.push(`Invalid value '${value}' for '${key}'. Valid values: ${STRATEGY_SCHEMA[key].join(', ')}`);
    }
  }

  // Forbidden combination checks (computed on the effective merged config)
  const merged = { ...PROFILE_DEFAULTS[profile], ...overrides };
  errors.push(...checkForbiddenCombinations(profile, merged));

  // team_boundary invariant: cannot be set to anything other than 'fixed'
  if (merged.team_boundary && merged.team_boundary !== 'fixed') {
    errors.push('Invariant violation: team_boundary must always be "fixed"');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate diagnostic output showing effective configuration.
 * @param {string} profile - Profile name
 * @param {object} overrides - Strategy overrides
 * @returns {string} Diagnostic output
 */
export function diagnose(profile = 'standard', overrides = {}) {
  const validation = validateConfig({ profile, overrides });

  if (!validation.valid) {
    return `Configuration errors:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`;
  }

  const merged = mergeConfig(profile, overrides);

  let output = `Profile: ${profile}\n`;
  output += `\nEffective configuration:\n`;

  for (const [key, value] of Object.entries(merged)) {
    const isOverridden = key !== 'profile' && overrides[key] !== undefined;
    const marker = isOverridden ? ' (override)' : '';
    output += `  ${key}: ${value}${marker}\n`;
  }

  output += `\nInvariants (always enforced):\n`;
  output += `  - Read-only requests must not write\n`;
  output += `  - Write-back verification required\n`;
  output += `  - Authorization required for all writes\n`;
  output += `  - Team boundary is fixed (cannot cross)\n`;
  output += `  - Reality check required for completion\n`;

  return output;
}

/**
 * Get the completion gate for a given profile and overrides.
 */
export function getCompletionGate(profile = 'standard', overrides = {}) {
  const config = mergeConfig(profile, overrides);
  return config.completion_gate;
}

/**
 * Export effective configuration as JSON Schema.
 */
export function getSchema() {
  return {
    version: 1,
    type: 'object',
    properties: {
      version: { type: 'integer', const: 1 },
      profile: { type: 'string', enum: Object.keys(PROFILE_DEFAULTS) },
      overrides: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(STRATEGY_SCHEMA).map(([key, values]) => [
            key,
            { type: 'string', enum: values },
          ])
        ),
      },
    },
    required: ['profile'],
  };
}
