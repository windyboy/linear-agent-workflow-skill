# Work Phases: Resolve an Issue

Canonical methodology for solving an issue. Maps to Linear states but is **independent** of them — you can plan and decompose before moving to `started`.

```text
发现 → 解决方案 → 任务分解 → 执行 → 检验
discover → solution → tasks → execute → verify
```

| Phase | Goal | Output | Reference |
|---|---|---|---|
| **1. 发现** | Understand the problem | Issue read/created, scope clear, acceptance criteria | [issue-discovery.md](issue-discovery.md) |
| **2. 解决方案** | Design how to fix it | Solution summary: approach, affected areas, risks, rollback | [start-implementation.md](start-implementation.md) § Solution |
| **3. 任务分解** | Break solution into concrete steps | Numbered task list with done-criteria per task | below |
| **4. 执行** | Do the work | Code/commits/PR; tasks marked done as you go | [start-implementation.md](start-implementation.md) § Execute |
| **5. 检验** | Prove it works | Tests, CI, user acceptance per profile | [start-implementation.md](start-implementation.md) § Verify · [move-to-review.md](move-to-review.md) |

## Phase Details

### 1. 发现 (Discover)

- Read issue fully + latest Agent Brief
- Or create issue from user request (template + confirm)
- Output: problem statement, acceptance criteria, unknowns listed

### 2. 解决方案 (Solution)

Before any code or state change:

- Root cause hypothesis (bugs) or design approach (features)
- Affected files/modules
- Minimal change strategy
- Test and rollback plan
- Risks

Confirm per `plan_confirmation` profile before proceeding.

### 3. 任务分解 (Task Breakdown)

Turn the solution into **concrete, checkable tasks**:

```markdown
## Tasks
- [ ] T1: <what> — done when: <criteria>
- [ ] T2: <what> — done when: <criteria>
```

Rules:
- Each task = one verifiable unit of work
- Order by dependency
- Simple one-file fix → 1–2 tasks OK; complex work → more
- Record in Agent Brief, issue comment, or `plan.md` phases (if Execution Context enabled)
- Optional: create Linear sub-issues only when user requests

Do **not** start `started` state or branch until solution + tasks are written (unless profile allows implicit start on "start ABC-123" — then produce solution + tasks immediately after authorization).

### 4. 执行 (Execute)

- Move to `started` → branch → implement task by task
- Mark tasks done in Brief/progress as completed
- Minimal changes; no drive-by refactors
- Post Agent Brief at start and on meaningful progress

### 5. 检验 (Verify)

- Run tests/build/lint; record what passed and what wasn't run
- PR + CI per project rules
- Move to Review per `review_gate`
- Mark Done per `completion_gate` with real evidence

## vs Linear Lifecycle

| Work phases | Linear states (typical) |
|---|---|
| 发现 + 解决方案 + 任务分解 | `backlog` / `unstarted` (read-only until authorized) |
| 执行 | `started` |
| 检验 | `started` (review) → `completed` |

## Handoff

Agent Brief should always reflect current phase and open tasks — [agent-brief.md](agent-brief.md).
