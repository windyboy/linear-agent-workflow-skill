# Resume Existing Work

When an issue is already in a started state but work was interrupted (session ended, Agent restarted, etc.), resume from the **first stage lacking evidence** rather than starting over.

## Resume Detection

When resuming, check evidence in the following order to locate the first incomplete stage:

| Evidence | Corresponding stage | How to check |
| --- | --- | --- |
| Dedicated branch exists | Branch established | Git branch list contains a branch with the issue ID |
| Local unpushed commits | Implementation phase | Branch has commits ahead of remote |
| PR exists and linked to issue | PR created | Linear/Git integration can read linked PR |
| CI status is passing | CI passed | PR/commit check status |
| User explicitly states acceptance | User acceptance passed | User statement in current session |
| Trusted deployment evidence | Production deployment succeeded | Deploy/release skill or user confirmation |

## Resume Rules

1. **Continue from the first stage without evidence**: Already-passed stages are not re-executed; stages that failed or have no evidence are executed from the beginning.
2. **No evidence means not complete**: If a stage has no evidence (Linear status, Git records, PR, CI, deployment records, user statements), you must not claim it is complete and must execute from that stage.
3. **Status matching**: If the Linear status is already at the target stage's state, do not re-write; if the status lags behind what the evidence shows, update to match the evidence.
4. **User confirms resume point**: When resuming, report detected evidence and the suggested resume point to the user, then execute after confirmation.

## Workflow Binding & Execution Context (optional)

The full protocol lives in [execution-context.md](execution-context.md). This section only routes the resume flow.

When resuming, resolve the per-issue **Workflow Binding** via the host capability contract (`read_binding`, discovered per [capability-discovery.md](capability-discovery.md)):

- 0 Bindings + legacy-marked issue → recover via the legacy flow; do **not** backfill a historical Binding.
- 0 Bindings + a v1 Context that references a Binding → fail closed (the referenced Binding is missing; this is **not** a legacy issue).
- 1 Binding → verify schema, issue UUID, and `payload_fingerprint`; mismatch → report a config/history conflict and stop.
- >1 Bindings → fail closed, ask the user to resolve.

**Candidate context discovery.** Discover Execution Context files by the issue's **immutable UUID**, never by display id. If multiple candidate contexts match the UUID, pause and ask the user to select one; do not guess. If the display id (issue key) has changed but the UUID matches, resume the existing context and **report the stale display id** — never auto-rename the context directory.

**Write-free conflict handling.** Before any Context write, re-read `plan.md` and verify `context_revision` and the observed plan hash. If they do not match (another writer touched the file), do **not** modify any Context file. Report `observed context conflict` in the current output and require user selection or explicit takeover. Only after a new baseline is re-read and confirmed may the Context be written (`paused` / `active`).

**Ghost Branch / baseline drift.** If the branch referenced by the context no longer exists, or the working tree has diverged from the recorded baseline, pause and report `ghost branch` / `baseline drift`; do not silently continue.

**Recovery summary (five questions).** After gathering evidence, report the resume point using exactly these five questions:

1. **Goal?** — What was the issue intended to deliver?
2. **Where am I?** — Which stage has evidence and which is the first stage lacking evidence?
3. **What remains?** — What is left to implement, verify, or review?
4. **What was learned?** — Constraints, blockers, or decisions discovered so far.
5. **What was done and verified?** — Completed steps with their evidence (branch, commits, PR, CI, deployment).

Externally-verifiable evidence (Linear status, Git records, PR, CI, deployment) always wins over local Context claims. A local `completed` context state is **not** evidence of release or Done.

## Resume Scenario Examples

| Scenario | Detection result | Resume action |
| --- | --- | --- |
| Branch and commits exist, no PR | Branch exists, commits present, no PR | Resume from PR creation stage |
| PR exists and CI passes, no acceptance | PR + CI pass, no acceptance record | Resume from user acceptance stage |
| PR merged, not deployed | PR merged, no deployment evidence | Resume from deployment stage, then Done after deployment |
| Deployed but Linear not Done | Deployment evidence exists, Linear not completed | Call mark-done directly |
