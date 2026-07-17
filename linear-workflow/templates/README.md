# Issue Templates

Linear Workflow provides templates for creating and reviewing issues. Templates are organized into two categories: **creation templates** (for creating new issues) and **output templates** (for documenting reviews and releases).

## Creation Templates

Use these templates when creating new issues in Linear.

### Feature / Idea

Use for new features, improvements, and exploratory ideas.

**File**: `idea-feature.md`

### Bug

Use when existing behavior differs from documented or expected results.

**File**: `bug-report.md`

### Refactor

Use for code cleanup, technical debt, maintenance, and structural improvements.

**File**: `refactor.md`

## Output Templates

Use these templates when documenting reviews and releases. Output templates are not used to create issues; instead, they are used to structure findings and decisions.

### Change Review

Use to review code, documentation, workflow rules, or structural changes.

**File**: `change-review.md`

### Release Review

Use to verify a release is ready for deployment.

**File**: `release-review.md`

## Shared Format

### Finding

Use to document individual findings within a Change Review or Release Review.

**File**: `finding.md`

## Template Usage in Workflow

| Phase | Template | When to Use |
|---|---|---|
| **Issue Creation** | Feature / Idea, Bug, Refactor | When creating a new issue |
| **Implementation Review** | Change Review | When reviewing code or documentation changes |
| **Release Verification** | Release Review | Before marking an issue as Done (for strict profile) |
| **Finding Documentation** | Finding | Within Change Review or Release Review |

## Template Routing

The Agent uses the following logic to select the appropriate template:

1. **User explicitly requests a template**: Use the requested template
2. **Creating a new issue**: Determine type (Feature/Bug/Refactor) based on user description, use corresponding creation template
3. **Reviewing changes**: Use Change Review template
4. **Verifying release**: Use Release Review template
5. **Documenting findings**: Use Finding format within the parent review template

## Templates vs. Local Working Memory

Issue templates are **creation and review artifacts** stored in Linear or used to structure reviews. They are distinct from the optional **Execution Context** local working memory (`execution_context_v1` `plan.md` / `findings.md` / `progress.md`) described in [references/execution-context.md](../references/execution-context.md):

- Creation templates (`idea-feature.md`, `bug-report.md`, `refactor.md`) contain **no** structural Execution Context fields; they never reference `execution_context` or `workflow_binding`.
- The Finding shared format (`finding.md`) is for documenting review findings **inside** a Change/Release Review; it is **not** raw local findings storage for an Execution Context.
- Output templates (`change-review.md`, `release-review.md`) may reference an optional Execution Context Reconciliation/alignment section, but the template itself does not store local working memory.

## Packaging Boundary

Runtime templates live under `linear-workflow/templates/`. The packaged artifact (`dist/linear-workflow.skill`) bundles `linear-workflow/`, so these templates ship with the skill. Repository-maintenance tooling (for example `scripts/`) is excluded from the bundle by design.

---

**Total Templates**: 6 (3 creation + 2 output + 1 shared format)  
**Last Updated**: 2026-07-17  
**Version**: 0.5.0
