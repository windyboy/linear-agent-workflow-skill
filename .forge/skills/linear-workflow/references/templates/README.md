# Templates

Concise, action-oriented templates for creating Linear issues and reviewing changes. The skill selects one when drafting or creating an issue; using a template never bypasses the required user-confirmation gate before creation.

## Top-level templates (exactly five)

1. **Idea / Feature** — new ideas and user-visible capabilities.
2. **Bug Report** — behavior that differs from the documented or expected result.
3. **Refactor** — internal restructuring with no intended public behavior change.
4. **Change Review** — Quick or Full review of changes.
5. **Release Review** — packaging and release-readiness verification.

The shared **Finding** format (`finding.md`) is used inside Change Review; it is not a sixth top-level template.

## When to use which

| Request | Template |
| -- | -- |
| New idea or capability | Idea / Feature |
| Existing behavior is wrong | Bug Report |
| Internal structure should improve without intended behavior change | Refactor |
| Review a change, PR, or workflow design | Change Review |
| Validate a packaged artifact or release | Release Review |

If a request combines types, pick one primary template and link follow-up issues rather than producing a large mixed issue.

## Packaging boundary

Runtime templates live under `linear-workflow/references/templates/`. The packaged artifact (`dist/linear-workflow.skill`) bundles `linear-workflow/`, so these templates ship with the skill. Repository-maintenance tooling (for example `scripts/`) is excluded from the bundle by design.
