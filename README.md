# Linear Agent Workflow Skill

A host-agnostic Agent Skill for safely managing the complete Linear issue delivery lifecycle: discovery, planning, implementation, review, release verification, and post-deployment completion.

## Contents

```text
linear-workflow/
├── SKILL.md                        # Compact state-machine router + safety invariants
├── configuration.md                # Profile and strategy configuration guide
├── mark-done.md                    # Simplified Done workflow (core cases)
├── templates/                      # Issue-creation and review templates
│   ├── README.md
│   ├── idea-feature.md
│   ├── bug-report.md
│   ├── refactor.md
│   ├── change-review.md
│   ├── release-review.md
│   └── finding.md
├── examples/                       # Profile configuration examples
│   ├── README.md
│   ├── minimal-project.md
│   ├── standard-team.md
│   └── strict-enterprise.md
└── references/
    ├── invariants.md               # Five non-negotiable safety rules
    ├── configuration-schema.md     # Complete configuration schema
    ├── capability-discovery.md     # Tool capability mapping (first operation)
    ├── issue-discovery.md          # Browsing, creating, querying issues
    ├── start-implementation.md     # Read, plan, branch, implement
    ├── move-to-review.md           # Verification, acceptance, Review transition
    ├── output-contracts.md         # Error format, idempotency rules
    ├── project-scope.md            # Scope boundary decisions
    ├── resume-work.md              # Resuming interrupted work
    └── review-gate-policy.md       # Configurable Review trigger
```

The packaged artifact (`dist/linear-workflow.skill`) is generated locally/CI by `npm run package` and is **not** committed to the repository.

## Workflow

```text
Discover a need or problem
→ Create or select a Linear issue
→ Read the issue and inspect the codebase
→ Produce an implementation plan and obtain confirmation
→ Move to started and create a dedicated branch
→ Implement and run automated checks
→ Commit, push, and open a PR
→ CI passes
→ [Review Gate] → Move to Review (policy-dependent)
→ Human review and merge
→ Successful production release or deployment
→ Mark the Linear issue Done
```

> **Merge is not Done.** An issue is completed only after verified production release or deployment.

### Review Gate policies

The point at which an issue moves to Review is configurable via the **Review Gate** policy:

| Policy | Review trigger | Typical flow |
| --- | --- | --- |
| `pr_ready` (default for `standard`) | PR created and CI passes | CI → Review (acceptance during review) → Merge |
| `user_acceptance` | User explicitly accepts the change | CI → User acceptance → Review → Merge |

Configure via repository instructions (`AGENTS.md`, `CLAUDE.md`), team/project conventions, or explicit user selection. The **Completion Gate** is determined by the active Profile: `release_confirmed` for minimal/standard, `production_deployment` for strict. See `linear-workflow/configuration.md` for customization.

> **v0.5.0 — optional Execution Context.** v0.5.0 adds an opt-in local **Execution Context** (`execution_context.mode`, default `disabled`) for multi-session working memory, plus a durable **Workflow Binding** that freezes the resolved governance configuration per issue. With `disabled` (the default), no Layer 2 local files are created and lifecycle gate semantics remain unchanged; newly managed issues still receive the minimal Layer 1 Binding. See `linear-workflow/references/execution-context.md`.

### Resume existing work

When resuming interrupted work, the skill detects the current state from evidence (branch, commits, PR, CI, deployment records) and continues from the first unverified stage — no stage is skipped without evidence.

## Safety guarantees

- Works with any Agent runtime that supports Markdown Skills, instructions, or equivalent Linear tooling.
- Discovers capabilities rather than assuming a Linear server or function name.
- Uses **team as the required write boundary** and **project as an optional boundary** (unless repo policy requires it); never performs cross-team or cross-project writes.
- Separates four stages for completion: discovery → proposed candidate list → user/trusted-caller authorization → state mutation. Candidate selection never implies write authorization.
- Requires explicit confirmation for both explicit issue IDs and automatically inferred IDs before any `completed` write.
- Reads back every state change before reporting success.
- Requires confirmation before creating an issue. The level of confirmation before **starting implementation** and **moving to Review** is Profile-dependent: `minimal` uses implicit/PR-ready, `standard` uses risk-based/PR-ready, `strict` uses explicit/user-acceptance (see `linear-workflow/configuration.md`).
- Requires release/deployment evidence before Done.
- Supports explicit issue IDs, release-range matching, weak-evidence confirmation, retries, idempotency, and partial-failure reporting.

## Using the Skill

Install or load the `linear-workflow` directory or the packaged `.skill` artifact using your Agent runtime's normal Skill mechanism. Provide a Linear integration with equivalent capabilities to list/search issues, get issue details, inspect workflow states, update issues, and create comments.

The Skill deliberately does not depend on a particular host, CLI, directory convention, MCP server name, or tool function name.

## Templates

The skill ships a small, reusable template system for creating well-structured Linear issues and reviewing changes. It contains exactly five top-level templates plus one shared format:

- **Idea / Feature** — new ideas and user-visible capabilities.
- **Bug Report** — behavior that differs from the documented or expected result.
- **Refactor** — internal restructuring with no intended public behavior change.
- **Change Review** — Quick or Full review of code, docs, workflow rules, or structural changes.
- **Release Review** — packaging and release-readiness verification.
- **Finding** (shared, not a sixth top-level template) — used inside Change Review findings.

Select one template per request using the routing table in `linear-workflow/templates/README.md`. The skill uses the selected template when drafting or creating an issue; this never bypasses the required user-confirmation gate before creation. Optional fields are left blank or marked `unknown` rather than fabricated.

## Done workflow integration

Release, deployment, or review automation can independently invoke `mark-done.md`. Provide verified deployment status and, when available, project scope, release version, release commit, release range, environment, and deployment evidence.

## Development: Validation and Packaging

The skill ships with lightweight, dependency-free validation so defects (invalid state-type literals, broken links, regex divergence, stale bundles) cannot survive review.

| Command | Purpose |
| --- | --- |
| `npm run validate` | Run all static checks (frontmatter, name/dir conventions, relative links, referenced repo paths, state-type literals, canonical identifier policy, dist parity/staleness) **and** the deterministic behavior scenarios. Exits non-zero on any failure. |
| `npm run test` | Run only the behavior scenario tests. |
| `npm run package` | Rebuild `dist/linear-workflow.skill` (generated, gitignored) from `linear-workflow/` so the bundle stays in parity with the source. |
| `npm run ci` | `npm run package` → `npm run install-verify` → `npm run test:all` → `npm run validate` (used by CI). |

`npm run validate` is the single local command for validation. It requires no Linear workspace and performs no writes. A deliberately stale bundle or a broken link causes a non-zero exit.

GitHub Actions runs `npm run ci` (package → install-verify → test:all → validate) for every pull request and on the default branch (see `.github/workflows/validate.yml`).
