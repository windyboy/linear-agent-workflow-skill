# Linear Agent Workflow Skill

A host-agnostic Agent Skill for safely managing the complete Linear issue delivery lifecycle: discovery, planning, implementation, review, release verification, and post-deployment completion.

## Contents

```text
linear-workflow/
├── SKILL.md                  # Main lifecycle workflow
├── mark-done.md              # Independently callable post-release Done workflow
└── references/
    └── templates/            # Concise issue-creation and review templates
        ├── README.md
        ├── idea-feature.md
        ├── bug-report.md
        ├── refactor.md
        ├── change-review.md
        ├── release-review.md
        └── finding.md
```

The packaged artifact is available at `dist/linear-workflow.skill`.

## Workflow

```text
Discover a need or problem
→ Create or select a Linear issue
→ Read the issue and inspect the codebase
→ Produce an implementation plan and obtain confirmation
→ Move to started and create a dedicated branch
→ Implement and run automated checks
→ Commit, push, and open a PR
→ CI and user acceptance
→ Move to Review
→ Human review and merge
→ Successful production release or deployment
→ Mark the Linear issue Done
```

> **Merge is not Done.** An issue is completed only after verified production release or deployment.

## Safety guarantees

- Works with any Agent runtime that supports Markdown Skills, instructions, or equivalent Linear tooling.
- Discovers capabilities rather than assuming a Linear server or function name.
- Uses **team as the required write boundary** and **project as an optional boundary** (unless repo policy requires it); never performs cross-team or cross-project writes.
- Separates four stages for completion: discovery → proposed candidate list → user/trusted-caller authorization → state mutation. Candidate selection never implies write authorization.
- Requires explicit confirmation for both explicit issue IDs and automatically inferred IDs before any `completed` write.
- Reads back every state change before reporting success.
- Requires explicit user confirmation before creating an issue, starting implementation, and moving to Review.
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

Select one template per request using the routing table in `linear-workflow/references/templates/README.md`. The skill uses the selected template when drafting or creating an issue; this never bypasses the required user-confirmation gate before creation. Optional fields are left blank or marked `unknown` rather than fabricated.

## Done workflow integration

Release, deployment, or review automation can independently invoke `mark-done.md`. Provide verified deployment status and, when available, project scope, release version, release commit, release range, environment, and deployment evidence.
