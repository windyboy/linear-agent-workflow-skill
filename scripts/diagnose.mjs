#!/usr/bin/env node

// scripts/diagnose.mjs
// CLI tool for diagnosing Profile and configuration.

import { parseConfig, mergeConfig, validateConfig, diagnose, getSchema } from './profile-parser.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'help';

switch (command) {
  case 'config':
    handleConfig(args.slice(1));
    break;
  case 'schema':
    handleSchema();
    break;
  case 'help':
  default:
    showHelp();
}

function handleConfig(args) {
  const configFile = args[0] || 'linear-workflow.config.yaml';
  const config = parseConfig(configFile);
  
  const validation = validateConfig(config);
  if (!validation.valid) {
    console.error('Configuration errors:');
    validation.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
  
  const output = diagnose(config.profile, config.overrides || {});
  console.log(output);
}

function handleSchema() {
  const schema = getSchema();
  console.log(JSON.stringify(schema, null, 2));
}

function showHelp() {
  console.log(`
linear-workflow config diagnose

Usage:
  node scripts/diagnose.mjs config [config-file]
  node scripts/diagnose.mjs schema
  node scripts/diagnose.mjs help

Commands:
  config [file]     Diagnose configuration from file (default: linear-workflow.config.yaml)
  schema            Output JSON Schema for configuration
  help              Show this help message

Examples:
  node scripts/diagnose.mjs config
  node scripts/diagnose.mjs config ./my-config.yaml
  node scripts/diagnose.mjs schema > schema.json
`);
}
