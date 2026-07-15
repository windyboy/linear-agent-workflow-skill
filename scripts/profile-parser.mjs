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
 * @param {string|object} configPath - Path to config file or config object
 * @returns {object} Parsed configuration
 */
export function parseConfig(configPath) {
  let config;
  
  if (typeof configPath === 'object') {
    config = configPath;
  } else if (typeof configPath === 'string') {
    if (!fs.existsSync(configPath)) {
      return { profile: 'standard', overrides: {} };
    }
    
    const content = fs.readFileSync(configPath, 'utf-8');
    try {
      // Try JSON first
      config = JSON.parse(content);
    } catch {
      // Fall back to simple YAML parsing (minimal subset)
      config = parseSimpleYAML(content);
    }
  } else {
    return { profile: 'standard', overrides: {} };
  }
  
  return config;
}

/**
 * Minimal YAML parser for linear-workflow config format.
 */
function parseSimpleYAML(content) {
  const config = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const [key, ...valueParts] = trimmed.split(':');
    const value = valueParts.join(':').trim();
    
    if (key && value) {
      config[key.trim()] = value.replace(/^['"]|['"]$/g, '');
    }
  }
  
  return config;
}

/**
 * Merge profile defaults with overrides, applying priority rules.
 * @param {string} profile - Profile name (minimal, standard, strict)
 * @param {object} overrides - Strategy item overrides
 * @returns {object} Merged configuration
 */
export function mergeConfig(profile = 'standard', overrides = {}) {
  // Validate profile
  if (!PROFILE_DEFAULTS[profile]) {
    profile = 'standard';
  }
  
  // Start with profile defaults
  const merged = { ...PROFILE_DEFAULTS[profile] };
  merged.profile = profile;  // Add profile field
  
  // Check for Invariant overrides
  for (const invariant of Object.keys(PROTECTED_INVARIANTS)) {
    if (invariant in overrides) {
      throw new Error(`Cannot override Invariant '${invariant}'`);
    }
  }
  
  // Apply overrides
  for (const [key, value] of Object.entries(overrides)) {
    if (!STRATEGY_SCHEMA[key]) {
      console.warn(`Unknown strategy item '${key}', ignoring`);
      continue;
    }
    
    if (!STRATEGY_SCHEMA[key].includes(value)) {
      console.warn(`Invalid value '${value}' for '${key}', using profile default`);
      continue;
    }
    
    merged[key] = value;
  }
  
  return merged;
}

/**
 * Validate configuration against schema and invariants.
 * @param {object} config - Configuration to validate
 * @returns {object} Validation result { valid: boolean, errors: string[] }
 */
export function validateConfig(config) {
  const errors = [];
  
  if (!config.profile) {
    config.profile = 'standard';
  }
  
  if (!PROFILE_DEFAULTS[config.profile]) {
    errors.push(`Invalid profile: '${config.profile}'`);
  }
  
  const overrides = config.overrides || {};
  for (const [key, value] of Object.entries(overrides)) {
    if (!STRATEGY_SCHEMA[key]) {
      errors.push(`Unknown strategy item: '${key}'`);
      continue;
    }
    
    if (!STRATEGY_SCHEMA[key].includes(value)) {
      errors.push(`Invalid value '${value}' for '${key}'. Valid values: ${STRATEGY_SCHEMA[key].join(', ')}`);
    }
  }
  
  // Check for illegal combinations
  const merged = mergeConfig(config.profile, overrides);
  
  // team_boundary_fixed invariant: cannot set team_boundary to anything other than 'fixed'
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
    const isOverridden = overrides[key] !== undefined;
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
