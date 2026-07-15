# Advanced: Multi-Team Scope and Cross-Project Handling

This document covers advanced scope management for multi-team organizations. These features are only loaded when explicitly requested or when `project_check: required` in the active Profile.

## Team Boundary (Fixed)

Team is a **hard security boundary** and cannot be crossed:

- Before writing to any issue, verify the issue's team matches the current context.
- If the issue is in a different team, **STOP** and report the boundary violation.
- Do not proceed even with user confirmation.
- This is **Invariant 4** and applies to all Profiles.

## Project Boundary (Configurable)

Project is a **soft boundary** and behavior depends on configuration:

- **`project_check: disabled`**: Issues without a project are processable; cross-project issues are reported but not blocked.
- **`project_check: when_configured`**: If the current context has a project, only process issues in that project or without a project.
- **`project_check: required`**: Only process issues in the explicitly specified project; cross-project issues are always blocked.

## Cross-Project Candidates

When a release scope infers issues from different projects:

1. **Identify** the project for each inferred issue.
2. **Check** the `project_check` configuration.
3. **Report** cross-project candidates separately.
4. **Require explicit user confirmation** before writing any cross-project issue.

Example output:

```
In-scope issues (same project):
  - ABC-123 (strong evidence)
  - ABC-124 (strong evidence)

Cross-project candidates (require confirmation):
  - XYZ-456 (different project, strong evidence)
  - XYZ-457 (different project, weak evidence)

Out-of-scope (different team):
  - OTHER-1 (different team, cannot process)
```

## Configuration

Set `project_check` in your configuration:

```yaml
profile: standard
overrides:
  project_check: required
```

See `linear-workflow/configuration.md` for details.
