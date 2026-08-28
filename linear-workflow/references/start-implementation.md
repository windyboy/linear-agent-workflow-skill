# Start Implementation

Follow [work-phases.md](work-phases.md): 发现 → 解决方案 → 任务分解 → 执行 → 检验.

## 1. 发现 (Discover)

Read fully: title, description, acceptance criteria, status, labels, project, comments, links, branch/PR. Read latest Agent Brief first — [agent-brief.md](agent-brief.md). Inspect codebase and VCS; record baseline. Missing info → list gaps; don't fabricate criteria.

## 2. 解决方案 (Solution)

Output before any code or state change:

- Problem and acceptance criteria
- Root cause / design approach
- Affected files or modules
- Minimal change strategy
- Test and rollback plan
- Branch/PR risks

`plan_confirmation` (from profile):
- `implicit` — "start ABC-123" is authorization
- `risk_based` — auto-start simple; confirm risky (DB, API, multi-module)
- `explicit` — wait for explicit confirm

Planning alone never changes state or creates branches.

## 3. 任务分解 (Task Breakdown)

Break solution into numbered, checkable tasks:

```markdown
## Tasks
- [ ] T1: <what> — done when: <criteria>
- [ ] T2: <what> — done when: <criteria>
```

Record in Agent Brief, issue comment, or `plan.md` (if Execution Context). Create Linear sub-issues only when user requests.

## 4. 执行 (Execute)

After authorization, re-read issue and team states:

1. Already started/review → don't re-write. Completed/canceled → no auto-reopen.
2. Backlog/unstarted → `started_state`; assign only if requested.
3. Read back state; fail → no branch/code.
4. Branch per conventions (include issue ID).
5. Implement task by task; mark done in Brief/progress. Minimal changes only.

Post **Agent Brief** after started-state write (include solution + task list).

## Workflow Binding & Context (optional)

Protocol: [execution-context.md](execution-context.md) · Binding: [workflow-binding.md](workflow-binding.md).

**Layer 1** (before started write): 0 → create; 1 → verify; >1 → fail closed.

**Layer 2** (if enabled): init `plan.md` with phases matching tasks → started write → `active` → branch/code.

## 5. 检验 (Verify)

Run tests/build/lint; distinguish pre-existing vs new failures. Never claim pass without running.

- Commits include issue ID (`\b[A-Z0-9]{1,5}-\d+\b`)
- PR: link issue, summary, validation, gaps, risks
- CI failed/unrun → not mergeable
- Then → [move-to-review.md](move-to-review.md) per `review_gate`
