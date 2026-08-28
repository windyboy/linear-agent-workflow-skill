# Agent Brief: Handoff Context for Other Agents

When working on a Linear issue, record **what happened** for the next Agent session — not only issue state, plans, tasks, and modifications, but a short **conversation-style brief** that another Agent can read and immediately understand context.

Agent Brief is **working memory for Agents**, stored as a Linear comment. It is independent of `audit_comments` (human audit trail) and Execution Context (local files).

---

## When to Write

Write or update an Agent Brief at meaningful handoff points:

| Moment | What to capture |
|---|---|
| **Start work** | Goal, agreed plan, branch name, constraints the user stated |
| **Meaningful progress** | What changed, decisions made, blockers discovered |
| **Pause / session end** | Current stage, what's done, what's next, where evidence lives |
| **Move to Review** | What was built, how to verify, known gaps |
| **Mark Done** | Final outcome, release/deployment pointer, lessons if any |

Skip writing when nothing meaningful changed since the last brief (see Idempotency below).

---

## When to Read

Before acting on an issue that already has work in progress:

1. Read the issue title, description, and status.
2. Find the **latest** comment containing `---agent-brief---` … `---end-agent-brief---`.
3. Treat it as the primary handoff context; reconcile with Git/PR/CI evidence (evidence wins on conflict).

When resuming, combine the latest Agent Brief with the five recovery questions in [resume-work.md](resume-work.md).

---

## Format

Use this envelope so Agents can locate and parse the brief:

```markdown
---agent-brief---
## For the next agent

**You are picking up:** ABC-123 — Add dark mode toggle

**Where things stand:** Implementation in progress. Branch created; two of four components updated.

**What already happened:**
- Plan: CSS variables + settings-page toggle (user rejected navbar placement)
- Branch `feature/ABC-123-dark-mode`, commits through `a1b2c3d`
- Updated `src/theme.css`, `src/components/Button.tsx`

**What you should know:**
- Do not change `legacy-auth/` — separate issue DEF-456
- User wants system-preference default, manual override in settings

**Suggested next steps:**
1. Finish `Header.tsx` hardcoded colors
2. Add settings toggle + integration tests
3. Open PR when CI passes

**Evidence:** branch `feature/ABC-123-dark-mode` · PR none · last verified: unit tests pass locally
---end-agent-brief---
```

### Writing style

- Write in **second person** ("you are picking up", "you should know") — as if briefing a colleague Agent.
- Be **factual** — no claims without evidence; mark uncertainty explicitly.
- Be **scannable** — short bullets, no long prose.
- **Never** put governance fields here (authorization, review gate, completion gate, profile). Those live in Workflow Binding and config only.

---

## Idempotency

- Append a new brief comment; do not edit prior briefs.
- Before posting, compare with the latest existing brief. If content is substantially the same, **skip** (do not duplicate).
- Redact secrets and personal absolute paths before posting (same rules as [execution-context.md](execution-context.md) §9).

---

## Relationship to Other Records

| Record | Audience | Purpose |
|---|---|---|
| **Agent Brief** | Future Agents | Conversational handoff — "what happened, what to do next" |
| **audit_comments** | Humans / compliance | State-transition audit trail (controlled by profile) |
| **Execution Context** | Local session | `plan.md` / `findings.md` / `progress.md` (optional, local only) |
| **Issue description** | Everyone | Original requirements and acceptance criteria |

All four can coexist. Agent Brief does not replace audit comments or local Execution Context.
