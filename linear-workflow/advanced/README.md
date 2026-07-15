# Advanced Features

This directory contains optional, advanced features for the linear-workflow skill. These features are **not loaded by default** and are only available when explicitly requested or when specific Profile settings enable them.

## When to Use Advanced Features

Advanced features are designed for:

- **Large organizations** with multi-team structures and complex scope management.
- **Automated release workflows** that need sophisticated issue reconciliation and revert handling.
- **Enterprise deployments** with strict audit and compliance requirements.

## Available Features

### Release Reconciliation (`release-reconciliation.md`)

**When to load**: `release_reconciliation: enabled` in configuration.

Covers:
- Automatic issue inference from release scope (commits, branches, PRs).
- Revert detection and handling.
- Batch processing and partial failure recovery.
- Complex audit reporting.

**Typical use case**: Automated release pipeline that marks issues as Done based on commit analysis.

### Multi-Team Scope (`multi-team-scope.md`)

**When to load**: `project_check: required` in configuration.

Covers:
- Team boundary enforcement (hard boundary, cannot cross).
- Project boundary handling (soft boundary, configurable).
- Cross-project candidate reporting and confirmation.

**Typical use case**: Organization with multiple teams; need to prevent accidental cross-team writes.

## Loading Advanced Features

Advanced features are loaded **on-demand**:

1. **Explicit request**: User or automation explicitly requests advanced feature.
2. **Profile configuration**: Profile setting (e.g., `release_reconciliation: enabled`) triggers loading.
3. **Runtime detection**: Skill detects that advanced feature is needed (e.g., no explicit issue IDs provided, multiple projects detected).

## Invariants Still Apply

All advanced features are subject to the **Five Non-Negotiable Invariants**:

1. Read-only requests must not write.
2. Write-back verification required.
3. Authorization required for all writes.
4. Team boundary is fixed (cannot cross).
5. Reality check required for completion.

Advanced features **cannot override or weaken** these invariants.

## Performance Considerations

Advanced features may require additional API calls:

- **Release reconciliation**: Requires reading all commits in release scope.
- **Multi-team scope**: Requires reading team and project metadata.

For large releases or organizations, consider:

- Providing explicit issue IDs to skip inference.
- Limiting release scope (e.g., by date or commit count).
- Caching team/project metadata.

## Examples

### Using Release Reconciliation

```yaml
profile: strict
overrides:
  release_reconciliation: enabled
```

Invoke with release scope:

```yaml
previous_release_ref: v1.0.0
current_release_ref: v1.1.0
deployment_status: success
```

### Using Multi-Team Scope

```yaml
profile: standard
overrides:
  project_check: required
```

Invoke with explicit project:

```yaml
project_scope: TEAM-PROJECT
issue_ids: [ABC-123, ABC-124]
deployment_status: success
```
