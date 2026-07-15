# Migration Guide: v0.2.0 → v0.3.0

Linear Workflow v0.3.0 introduces **Profiles** and **configurable strategy items** while maintaining backward compatibility with v0.2.0 behavior. This guide helps you upgrade and choose the right profile for your project.

## What Changed

### v0.2.0 Behavior

In v0.2.0, Linear Workflow enforced a strict, one-size-fits-all workflow:

- Always require explicit user confirmation before starting work
- Always require user acceptance before moving to Review
- Always require production deployment evidence for Done
- Always add detailed audit comments
- Always check project scope
- Always coordinate release scope

This was appropriate for enterprise and regulated projects, but too strict for personal and small-team projects.

### v0.3.0 Profiles

v0.3.0 introduces three profiles that let you choose the right workflow for your project:

| Profile | Behavior | Best For |
|---|---|---|
| **minimal** | Implicit plan confirmation, PR-ready review gate, release-confirmed completion, no audit comments | Personal projects, rapid prototyping |
| **standard** | Risk-based plan confirmation, PR-ready review gate, release-confirmed completion, summary audit comments | Small teams (3–5 people) |
| **strict** | Explicit plan confirmation, user acceptance review gate, production deployment completion, detailed audit comments | Enterprise, multi-team, regulated |

### Five Non-Negotiable Invariants

All profiles enforce five core rules that cannot be overridden:

1. **Read-Before-Write** — Re-read the issue before any status change
2. **Write-Back Verification** — Confirm every write succeeded by reading back the new state
3. **Authorization** — Require explicit user authorization before creating or modifying issues
4. **Team/Project Boundary** — Respect team and project scope; escalate cross-boundary writes
5. **Reality Check** — Report completion only with evidence matching the configured completion_gate

See [linear-workflow/references/invariants.md](linear-workflow/references/invariants.md) for details.

## Upgrade Path

### Step 1: Understand Your Current Behavior

v0.2.0 enforced strict confirmations and detailed audit trails. Your current behavior is equivalent to the **strict** profile in v0.3.0.

### Step 2: Create Configuration File

Create `linear-workflow.config.yaml` in your project root:

```yaml
version: 1
profile: strict
```

This preserves your current v0.2.0 behavior exactly.

### Step 3: Test Behavior

Run your workflow with the new version and verify behavior matches your expectations. The `strict` profile should behave identically to v0.2.0.

### Step 4: (Optional) Adjust Profile

If you want to relax some confirmations or reduce audit trail verbosity, choose a different profile:

**For personal projects**:

```yaml
version: 1
profile: minimal
```

**For small teams**:

```yaml
version: 1
profile: standard
```

### Step 5: (Optional) Fine-Tune with Overrides

If you want to keep most of a profile but adjust specific strategy items:

```yaml
version: 1
profile: minimal
overrides:
  completion_gate: production_deployment
  audit_comments: summary
```

See [linear-workflow/configuration.md](linear-workflow/configuration.md) for complete customization options.

## Behavior Comparison

### v0.2.0 vs v0.3.0 (strict profile)

| Aspect | v0.2.0 | v0.3.0 (strict) | Equivalent? |
|---|---|---|---|
| Plan confirmation | Explicit | Explicit | ✓ |
| Review gate | User acceptance | User acceptance | ✓ |
| Completion gate | Production deployment | Production deployment | ✓ |
| Audit comments | Detailed | Detailed | ✓ |
| Project checking | Required | Required | ✓ |
| Release coordination | Enabled | Enabled | ✓ |

**Result**: v0.3.0 strict profile is 100% backward compatible with v0.2.0 behavior.

### v0.2.0 vs v0.3.0 (minimal profile)

| Aspect | v0.2.0 | v0.3.0 (minimal) | Difference |
|---|---|---|---|
| Plan confirmation | Explicit | Implicit | Faster (no confirmation) |
| Review gate | User acceptance | PR-ready | Faster (automatic) |
| Completion gate | Production deployment | Release-confirmed | Faster (user confirmation only) |
| Audit comments | Detailed | None | Less verbose |
| Project checking | Required | Disabled | Simpler |
| Release coordination | Enabled | Disabled | Simpler |

**Result**: v0.3.0 minimal profile is significantly faster and simpler, appropriate for personal projects.

## Migration Scenarios

### Scenario 1: Enterprise Project (Migrate to strict)

**Current**: Using v0.2.0 with strict confirmations and detailed audit trail

**Upgrade**:

```yaml
version: 1
profile: strict
```

**Result**: No behavior change. Continue using Linear Workflow exactly as before.

### Scenario 2: Personal Project (Migrate to minimal)

**Current**: Using v0.2.0 but finding it too strict for personal projects

**Upgrade**:

```yaml
version: 1
profile: minimal
```

**Result**: Faster workflow with implicit confirmations and no audit comments.

### Scenario 3: Small Team (Migrate to standard)

**Current**: Using v0.2.0 but want to balance speed and accountability

**Upgrade**:

```yaml
version: 1
profile: standard
```

**Result**: Risk-based confirmations (automatic for simple changes, escalate for risky ones) and summary audit comments.

### Scenario 4: Custom Configuration (Migrate with overrides)

**Current**: Using v0.2.0 but want to keep most of strict profile except production deployment requirement

**Upgrade**:

```yaml
version: 1
profile: strict
overrides:
  completion_gate: release_confirmed
```

**Result**: Same as strict profile except mark Done when user confirms release (not production deployment).

## Breaking Changes

v0.3.0 introduces no breaking changes. All v0.2.0 workflows continue to work with the `strict` profile.

However, if you choose a different profile (minimal or standard), behavior will change:

- **Plan confirmation**: May become implicit or risk-based instead of explicit
- **Review gate**: May become PR-ready instead of user acceptance
- **Completion gate**: May become release-confirmed instead of production deployment
- **Audit comments**: May be reduced or removed
- **Project checking**: May be disabled or conditional
- **Release coordination**: May be disabled or on-request

These are intentional changes to support different project types. See the profile definitions for details.

## New Features in v0.3.0

### Profiles

Choose from three pre-configured profiles (minimal, standard, strict) instead of one-size-fits-all workflow.

### Configurable Strategy Items

Fine-tune specific aspects of the workflow without maintaining separate versions:

- `plan_confirmation`: implicit / risk_based / explicit
- `review_gate`: pr_ready / user_acceptance
- `completion_gate`: release_confirmed / production_deployment / manual
- `audit_comments`: none / summary / detailed
- `project_check`: disabled / when_configured / required
- `release_reconciliation`: disabled / on_request / enabled
- `output_verbosity`: minimal / standard / detailed

### Five Non-Negotiable Invariants

Core safety rules that apply to all profiles and cannot be overridden.

### Examples

Three complete workflow examples showing how each profile behaves in practice:

- [linear-workflow/examples/minimal-project.md](linear-workflow/examples/minimal-project.md)
- [linear-workflow/examples/standard-team.md](linear-workflow/examples/standard-team.md)
- [linear-workflow/examples/strict-enterprise.md](linear-workflow/examples/strict-enterprise.md)

### Enhanced Packaging

New packaging and verification scripts ensure source → dist → runtime parity:

- `npm run package`: Generates packaged artifact with version metadata
- `npm run install-verify`: Verifies artifact matches source
- `npm run ci`: Full CI pipeline (package → verify → validate)

## Troubleshooting

### Configuration Not Applied

**Check**:
1. Is the file named `linear-workflow.config.yaml`?
2. Is it in the project root?
3. Does it have valid YAML syntax?
4. Run `linear-workflow config diagnose` to see what's loaded

### Unexpected Behavior

**Debug**:
1. Run `linear-workflow config diagnose` to see effective configuration
2. Check which strategy items are different from expected
3. Verify overrides are spelled correctly
4. Check if the issue is in a different project or team

### Artifact Mismatch

**Error**: "Source hash mismatch! The packaged artifact is stale."

**Solution**: Run `npm run package` to regenerate the packaged artifact.

## Support

For questions or issues during migration:

1. Read [linear-workflow/configuration.md](linear-workflow/configuration.md) for configuration details
2. Review the profile examples in [linear-workflow/examples/](linear-workflow/examples/)
3. Check [linear-workflow/references/invariants.md](linear-workflow/references/invariants.md) for core rules
4. Open an issue on GitHub with your configuration and expected behavior

---

**Version**: 0.3.0  
**Last Updated**: 2026-07-15  
**Upgrade Path**: v0.2.0 → v0.3.0 (backward compatible with strict profile)
