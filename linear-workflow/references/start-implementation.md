# Start Implementation

Follow [work-phases.md](work-phases.md): discover → solution → tasks → execute → verify.

## Discover

Read issue fully + latest Agent Brief ([agent-brief.md](agent-brief.md)). Inspect codebase/VCS; record baseline. Gaps → list; don't fabricate criteria.

## Solution

Before code or state change: problem, acceptance criteria, root cause/design, affected files, minimal approach, test/rollback, risks.

`plan_confirmation`: `implicit` (start = auth) · `risk_based` (confirm risky) · `explicit` (wait). Planning never changes state.

## Tasks

Numbered checklist with done-criteria (see [work-phases.md](work-phases.md)). Required before `started` unless implicit profile authorizes first — then write immediately after auth.

## Execute

After auth, re-read issue:

1. Started/review → don't re-write; completed/canceled → no reopen
2. Backlog/unstarted → `started_state`
3. Read back; fail → no branch/code
4. Branch (include issue ID); implement task-by-task
5. Post Agent Brief (solution + tasks)

**Binding/Context (optional):** Layer 1 before started write ([workflow-binding.md](workflow-binding.md)). Layer 2: `plan.md` → started → `active` → code ([execution-context.md](execution-context.md)).

## Verify

Run tests/build/lint; never claim pass without running. Commits include issue ID. PR + CI → [move-to-review.md](move-to-review.md).
