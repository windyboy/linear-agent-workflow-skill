# Five Invariants

Apply to **all profiles**; cannot be overridden by config, user instruction, or project settings.

## 1. Read-Only → No Write

Inspect/analyze/explain/list/search → no Linear writes. Ambiguous intent → ask. Every write preceded by fresh read.

## 2. Write-Back Verification

After every write, read back and confirm state matches. Mismatch → report failure.

## 3. Authorization

No create/state-change/close without user authorization. Implicit OK (e.g. "start ABC-123" → `started`). Ambiguous → ask.

## 4. Team Boundary Fixed

Verify issue team matches context. Cross-team → STOP, report, don't proceed even if user confirms. Cross-project within team → per `project_check`.

## 5. Reality Check

Done only with evidence matching `completion_gate`. PR merged / CI passed alone ≠ deployed. `release_confirmed` needs user or release evidence; `production_deployment` needs production evidence.

---

## Violation Examples

| Scenario | Invariant | Fix |
|---|---|---|
| "inspect ABC-123" triggers write | 1 | Read-only; no write |
| Write without read-back | 2 | Read back immediately |
| Create issue unrequested | 3 | Confirm first |
| Cross-team write | 4 | STOP; report |
| Done on PR merge, gate = production | 5 | Require deployment evidence |

## Profiles

Profiles change **when** gates apply, not **whether** invariants apply. Example: `minimal` + `pr_ready` still requires read-before-write, write-back, authorization, team boundary, and real completion evidence.

## Execution Context

Adds no sixth invariant. Local `completed` context ≠ Done evidence. Binding is governance metadata, not write authority. Context conflicts → report; don't auto-repair.
