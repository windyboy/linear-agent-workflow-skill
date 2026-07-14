# Template System: Issue Creation and Review

When drafting or creating a Linear issue, select **one** template from `references/templates/` using the routing table below. Templates only collect information that changes planning, implementation, security, or verification; optional fields are left blank or marked `unknown`, never fabricated.

## Template Routing

| Request | Template |
| --- | --- |
| New idea or user-visible capability | Idea / Feature |
| Existing behavior is incorrect | Bug Report |
| Internal structure should be improved without changing expected behavior | Refactor |
| Reviewing a change, PR, or workflow design | Change Review |
| Verifying a package artifact or release | Release Review |

## Template Files

- `idea-feature.md`, `bug-report.md`, `refactor.md`, `change-review.md`, `release-review.md`
- Shared `finding.md` is only used inside Change Review findings, not a sixth top-level template
- Change Review distinguishes depth via `Review depth: Quick | Full`; does not split into two templates
- Refactor must record the invariant: must not produce unintended public API, behavior, lifecycle, state, or output format changes

## Rules

- **Using a template does not bypass the user confirmation required before issue creation**: after selecting and filling the template, you must still follow the confirmation rules in [issue-discovery.md](issue-discovery.md) to obtain explicit user confirmation before creating the issue.
- **Composite-type requests**: select one primary template, track the rest via related issues; do not produce a single large mixed issue.
- Template overview and selection in `references/templates/README.md`.
