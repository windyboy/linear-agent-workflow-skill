# Configuration Schema

This document defines the configuration format, valid values, and constraints for Linear Workflow profiles and strategy items.

## Configuration File Format

Linear Workflow configuration is stored in `linear-workflow.config.yaml` at the project root or in the Manus project configuration.

### Basic Structure

```yaml
version: 1
profile: standard

overrides:
  review_gate: user_acceptance
  audit_comments: detailed
```

### Schema Definition

<!-- SCHEMA:START -->

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Linear Workflow Configuration",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "version",
    "profile"
  ],
  "properties": {
    "version": {
      "type": "integer",
      "const": 1,
      "description": "Configuration schema version"
    },
    "profile": {
      "type": "string",
      "enum": [
        "minimal",
        "standard",
        "strict"
      ],
      "default": "standard",
      "description": "Preset profile name"
    },
    "overrides": {
      "type": "object",
      "description": "Override specific strategy items",
      "additionalProperties": false,
      "properties": {
        "plan_confirmation": {
          "type": "string",
          "enum": [
            "implicit",
            "risk_based",
            "explicit"
          ]
        },
        "review_gate": {
          "type": "string",
          "enum": [
            "pr_ready",
            "user_acceptance"
          ]
        },
        "completion_gate": {
          "type": "string",
          "enum": [
            "release_confirmed",
            "production_deployment",
            "manual"
          ]
        },
        "audit_comments": {
          "type": "string",
          "enum": [
            "none",
            "summary",
            "detailed"
          ]
        },
        "project_check": {
          "type": "string",
          "enum": [
            "disabled",
            "when_configured",
            "required"
          ]
        },
        "release_reconciliation": {
          "type": "string",
          "enum": [
            "disabled",
            "on_request",
            "enabled"
          ]
        },
        "output_verbosity": {
          "type": "string",
          "enum": [
            "minimal",
            "standard",
            "detailed"
          ]
        }
      }
    },
    "execution_context": {
      "type": "object",
      "description": "Optional local execution memory (Layer 2) configuration. Independent of the seven Profile strategy items.",
      "additionalProperties": false,
      "required": [
        "mode"
      ],
      "properties": {
        "mode": {
          "type": "string",
          "enum": [
            "disabled",
            "auto",
            "required"
          ],
          "default": "disabled",
          "description": "disabled = no Layer 2 files; auto = decide per issue; required = always create context"
        },
        "root": {
          "type": "string",
          "description": "Directory for execution context files (default .agent-work)"
        },
        "format": {
          "type": "string",
          "const": "execution_context_v1",
          "description": "Execution Context file format version"
        }
      }
    }
  },
  "allOf": [
    {
      "if": {
        "properties": {
          "profile": {
            "const": "minimal"
          }
        },
        "required": [
          "profile"
        ]
      },
      "then": {
        "not": {
          "required": [
            "overrides"
          ],
          "properties": {
            "overrides": {
              "required": [
                "completion_gate"
              ],
              "properties": {
                "completion_gate": {
                  "enum": [
                    "production_deployment"
                  ]
                }
              }
            }
          }
        }
      },
      "description": "minimal profile cannot override completion_gate to production_deployment"
    },
    {
      "if": {
        "properties": {
          "profile": {
            "const": "minimal"
          }
        },
        "required": [
          "profile"
        ]
      },
      "then": {
        "not": {
          "required": [
            "overrides"
          ],
          "properties": {
            "overrides": {
              "required": [
                "audit_comments"
              ],
              "properties": {
                "audit_comments": {
                  "enum": [
                    "detailed"
                  ]
                }
              }
            }
          }
        }
      },
      "description": "minimal profile cannot override audit_comments to detailed"
    },
    {
      "if": {
        "properties": {
          "profile": {
            "const": "minimal"
          }
        },
        "required": [
          "profile"
        ]
      },
      "then": {
        "not": {
          "required": [
            "overrides"
          ],
          "properties": {
            "overrides": {
              "required": [
                "release_reconciliation"
              ],
              "properties": {
                "release_reconciliation": {
                  "enum": [
                    "enabled"
                  ]
                }
              }
            }
          }
        }
      },
      "description": "minimal profile cannot override release_reconciliation to enabled"
    },
    {
      "not": {
        "required": [
          "overrides"
        ],
        "properties": {
          "overrides": {
            "required": [
              "completion_gate"
            ],
            "properties": {
              "completion_gate": {
                "enum": [
                  "merge"
                ]
              }
            }
          }
        }
      },
      "description": "completion_gate 'merge' violates Reality Check (Invariant 5)"
    },
    {
      "if": {
        "required": [
          "overrides"
        ],
        "properties": {
          "overrides": {
            "required": [
              "completion_gate",
              "plan_confirmation"
            ],
            "properties": {
              "completion_gate": {
                "const": "production_deployment"
              },
              "plan_confirmation": {
                "const": "implicit"
              }
            }
          }
        }
      },
      "then": false,
      "description": "production_deployment requires explicit/risk_based planning, never implicit"
    },
    {
      "if": {
        "required": [
          "overrides"
        ],
        "properties": {
          "overrides": {
            "required": [
              "review_gate",
              "completion_gate",
              "audit_comments"
            ],
            "properties": {
              "review_gate": {
                "const": "pr_ready"
              },
              "completion_gate": {
                "const": "production_deployment"
              },
              "audit_comments": {
                "const": "none"
              }
            }
          }
        }
      },
      "then": false,
      "description": "pr_ready + production_deployment requires audit summary/detailed"
    }
  ]
}
```

<!-- SCHEMA:END -->
```

## Strategy Items

### plan_confirmation

Controls whether the Agent requires explicit confirmation of the implementation plan before starting work.

| Value | Behavior | When Used |
|---|---|---|
| `implicit` | User says "start work on ABC-123" → Agent starts immediately after reading and planning | minimal |
| `risk_based` | Agent starts immediately for simple changes; escalates for risky changes (DB migration, API change, etc.) | standard |
| `explicit` | Agent always requires user confirmation before starting | strict |

### review_gate

Controls when the Agent moves an issue to Review state.

| Value | Behavior | When Used |
|---|---|---|
| `pr_ready` | Move to Review when PR is created and CI passes | minimal, standard |
| `user_acceptance` | Move to Review only after user explicitly confirms implementation is complete | strict |

### completion_gate

Controls what evidence is required to mark an issue as Done.

| Value | Behavior | When Used |
|---|---|---|
| `merge` | Mark Done when PR is merged | Not recommended; violates Invariant 5 |
| `release_confirmed` | Mark Done when user confirms release or provides release evidence | minimal, standard |
| `production_deployment` | Mark Done only when code is verified running in production | strict |
| `manual` | Mark Done only when user explicitly says so | Fallback for undefined scenarios |

### audit_comments

Controls the detail level of audit comments added to issues during state transitions.

| Value | Behavior | When Used |
|---|---|---|
| `none` | No audit comments | minimal |
| `summary` | Brief comment: what changed, key files, verification status | standard |
| `detailed` | Complete audit trail: decision rationale, evidence, timeline, root cause | strict |

### project_check

Controls whether the Agent verifies project scope before writing.

| Value | Behavior | When Used |
|---|---|---|
| `disabled` | Skip project check; only verify team | minimal |
| `when_configured` | If project is configured in the workflow, verify it; otherwise skip | standard |
| `required` | Always verify project scope; escalate if ambiguous | strict |

### release_reconciliation

Controls whether the Agent automatically coordinates issue closure across a release.

| Value | Behavior | When Used |
|---|---|---|
| `disabled` | Agent only closes the explicitly requested issue | minimal |
| `on_request` | Agent closes related issues only when user explicitly requests it | standard |
| `enabled` | Agent automatically identifies and closes all related issues in the release | strict |

### output_verbosity

Controls the detail level of Agent output and reports.

| Value | Behavior | When Used |
|---|---|---|
| `minimal` | Only essential information: action taken, result, errors | minimal |
| `standard` | Summary of action, key decisions, verification results | standard |
| `detailed` | Complete trace: all decisions, evidence, alternative paths considered | strict |

## Profile Presets

### minimal

```yaml
profile: minimal

overrides:
  plan_confirmation: implicit
  review_gate: pr_ready
  completion_gate: release_confirmed
  audit_comments: none
  project_check: disabled
  release_reconciliation: disabled
  output_verbosity: minimal
```

**Use case**: Personal projects, 1–2 person teams, rapid iteration.

**Characteristics**:
- Minimal confirmation overhead
- No audit trail
- No multi-team coordination
- Fast feedback loop

### standard

```yaml
profile: standard

overrides:
  plan_confirmation: risk_based
  review_gate: pr_ready
  completion_gate: release_confirmed
  audit_comments: summary
  project_check: when_configured
  release_reconciliation: on_request
  output_verbosity: standard
```

**Use case**: Small teams (3–5 people), general projects.

**Characteristics**:
- Balanced safety and speed
- Brief audit trail for accountability
- Optional multi-team coordination
- Clear decision rationale

### strict

```yaml
profile: strict

overrides:
  plan_confirmation: explicit
  review_gate: user_acceptance
  completion_gate: production_deployment
  audit_comments: detailed
  project_check: required
  release_reconciliation: enabled
  output_verbosity: detailed
```

**Use case**: Enterprise, multi-team, regulated projects.

**Characteristics**:
- Comprehensive confirmation at each stage
- Complete audit trail
- Automatic release coordination
- Full traceability

## Configuration Priority

When resolving the final strategy items, the following priority applies:

```
1. Five Non-Negotiable Invariants (highest priority)
   ↓
2. User Current Explicit Instruction
   ↓
3. Project Configuration Override
   ↓
4. Profile Default Value
   ↓
5. System Default (standard profile)
```

### Example: Priority Resolution

**Scenario 1: User Override**

```yaml
profile: minimal
overrides:
  review_gate: user_acceptance
```

**Resolution**:
- Base: minimal profile → `review_gate: pr_ready`
- Override: user specifies `review_gate: user_acceptance`
- Final: `review_gate: user_acceptance`

**Scenario 2: Invariant Violation**

```yaml
profile: minimal
overrides:
  completion_gate: production_deployment
  audit_comments: none
```

**Resolution**:
- Base: minimal profile → `completion_gate: release_confirmed`
- Override: user specifies `completion_gate: production_deployment`
- Invariant check: Invariant 5 (Reality Check) requires evidence matching completion_gate
- Final: **Configuration rejected** (minimal + production_deployment is not allowed)
- Error: "Cannot use production_deployment with minimal profile. Use standard or strict instead."

## Constraint Rules

### Allowed Combinations

The following combinations are explicitly allowed:

| Profile | plan_confirmation | review_gate | completion_gate | audit_comments | project_check | release_reconciliation | output_verbosity |
|---|---|---|---|---|---|---|---|
| minimal | implicit | pr_ready | release_confirmed | none | disabled | disabled | minimal |
| standard | risk_based | pr_ready | release_confirmed | summary | when_configured | on_request | standard |
| strict | explicit | user_acceptance | production_deployment | detailed | required | enabled | detailed |

### Forbidden Combinations

The following combinations are explicitly forbidden:

| Condition | Reason |
|---|---|
| `minimal` + `completion_gate: production_deployment` | Contradicts profile intent; use strict instead |
| `minimal` + `audit_comments: detailed` | Contradicts profile intent; use standard or strict |
| `minimal` + `release_reconciliation: enabled` | Contradicts profile intent; use strict instead |
| `completion_gate: merge` | Violates Invariant 5 (Reality Check); use release_confirmed or production_deployment |
| `completion_gate: production_deployment` + `plan_confirmation: implicit` | Risky: production requires explicit planning; use explicit or risk_based |
| `review_gate: pr_ready` + `completion_gate: production_deployment` + `audit_comments: none` | Insufficient traceability; use summary or detailed |

### Override Restrictions

Users can override strategy items, but with the following restrictions:

1. **Cannot override Invariants**: No configuration can disable or bypass the five non-negotiable invariants.
2. **Cannot create forbidden combinations**: The configuration schema will reject any override that creates a forbidden combination.
3. **Limited override scope**: Only strategy items can be overridden; core state machine and Invariants are fixed.

## Validation Rules

### At Configuration Load Time

1. **Schema validation**: Configuration must match the JSON schema.
2. **Forbidden combination check**: Configuration must not create a forbidden combination.
3. **Profile existence check**: Profile must be one of `minimal`, `standard`, `strict`.
4. **Override item check**: Override items must be valid strategy item names.

### At Runtime

1. **Invariant enforcement**: Every operation must respect the five Invariants.
2. **Strategy item application**: Every decision must apply the configured strategy items.
3. **Audit logging**: Every decision must be logged with the configured audit level.

## Error Handling

### Configuration Load Errors

```yaml
# ❌ Invalid schema
profile: "minimal"  # quoted strings are valid YAML; the real error is the unknown strategy item below
overrides:
  invalid_item: true  # Unknown strategy item

# Error: Unknown strategy item 'invalid_item'. Valid items: plan_confirmation, review_gate, ...
```

```yaml
# ❌ Forbidden combination
profile: minimal
overrides:
  completion_gate: production_deployment

# Error: Forbidden combination: minimal profile cannot override completion_gate to production_deployment.
# Use standard or strict profile instead.
```

### Runtime Errors

```
Invariant Violation: Attempted to write without reading first (Invariant 1)
Operation: Move ABC-123 to started
Action: Skipped write; re-read issue first
```

## Diagnostic Command

The Agent should provide a diagnostic command to show the current effective configuration:

```bash
linear-workflow config diagnose
```

**Output**:

```
Linear Workflow Configuration Diagnosis
========================================

Effective Profile: standard
Source: built-in default

Strategy Items:
  plan_confirmation: risk_based (from profile)
  review_gate: pr_ready (from profile)
  completion_gate: release_confirmed (from profile)
  audit_comments: summary (from profile)
  project_check: when_configured (from profile)
  release_reconciliation: on_request (from profile)
  output_verbosity: standard (from profile)

Invariants:
  ✓ Read-before-write verification enabled
  ✓ Write-back verification enabled
  ✓ Authorization check enabled
  ✓ Team boundary check enabled
  ✓ Reality check enabled

Warnings:
  None

Configuration File: /home/user/project/linear-workflow.config.yaml
Last Loaded: 2026-07-15T10:30:00Z
```

## Migration from v0.2.0

Projects using v0.2.0 (no profiles) should be treated as using the `strict` profile by default, as v0.2.0 enforced all confirmations and detailed audit trails.

To migrate to v0.3.0:

1. **Identify current behavior**: Review current `mark-done.md` and `SKILL.md` to understand current strictness level.
2. **Choose appropriate profile**: Map current behavior to minimal, standard, or strict.
3. **Create configuration file**: Add `linear-workflow.config.yaml` with chosen profile.
4. **Test with new profile**: Verify behavior matches expectations.
5. **Adjust if needed**: Use overrides to fine-tune specific strategy items.

### Migration Example

**Current v0.2.0 behavior**:
- Always require user confirmation before starting
- Always require user acceptance before moving to Review
- Always require production deployment evidence for Done
- Always add detailed audit comments

**Equivalent v0.3.0 configuration**:

```yaml
version: 1
profile: strict
```

No overrides needed; strict profile matches v0.2.0 behavior exactly.
