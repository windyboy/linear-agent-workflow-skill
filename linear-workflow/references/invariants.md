# Non-Negotiable Invariants

These five rules are the foundation of safe Agent operation on Linear. They apply to **all Profiles** and **cannot be overridden** by configuration, user instruction, or project settings.

## Invariant 1: Read-Only Requests Must Not Write

**Rule**: Read-only requests (inspect, analyze, explain) must never produce write operations to Linear.

**Why**: Prevents accidental mutations when the user only asked for information.

**Implementation**:
- Classify user intent: read-only verbs (inspect, look at, analyze, explain, read, show, describe, list, find, search) vs. write verbs (start, create, update, move, mark, set, assign, close, complete, delete, add, claim).
- If intent is read-only, perform no writes regardless of findings.
- If intent is ambiguous, ask the user for clarification before writing.
- Every write operation must be preceded by a fresh read of the current state (to prevent lost updates).

**Test Case**:
```
Given: User says "inspect ABC-123"
When: Agent reads the issue
Then: Agent must NOT write any state change, even if findings suggest an update

Given: User says "start work on ABC-123"
When: Agent reads the issue
Then: Agent must re-read before writing to ensure state hasn't changed, then proceed
```

## Invariant 2: Write-Back Verification

**Rule**: After every write to Linear, the Agent must immediately read back the written value to confirm success.

**Why**: Confirms that the write succeeded and the state is now as intended. Prevents silent failures.

**Implementation**:
- After writing a status change, immediately read the issue again.
- Compare the read-back state with the intended state.
- If they match, report success.
- If they don't match, report failure and do not mark the operation as complete.

**Test Case**:
```
Given: Agent writes issue ABC-123 to "started" state
When: Write succeeds in Linear API
Then: Agent must immediately read back and verify state is "started"
And: Only then report success to user
```

## Invariant 3: Authorization

**Rule**: No write operation can proceed without explicit user authorization.

**Why**: Prevents unintended modifications to issues the user didn't explicitly ask for.

**Implementation**:
- Before creating an issue, moving to a new state, or closing an issue, confirm with the user.
- User authorization can be implicit (e.g., "start work on ABC-123" implies authorization to move to "started").
- User authorization can be explicit (e.g., "yes, mark as done").
- Ambiguous situations must escalate to the user for confirmation.

**Test Case**:
```
Given: User says "look at ABC-123"
When: Agent reads the issue
Then: Agent must NOT write any state change without explicit user request

Given: User says "start work on ABC-123"
When: Agent has read the issue
Then: Agent can write to "started" state (implicit authorization)
```

## Invariant 4: Team Boundary Is Fixed

**Rule**: Write operations must not cross team boundaries. Team is a hard security boundary.

**Why**: Prevents accidental modifications to issues in other teams. Teams are organizational security domains.

**Implementation**:
- Before writing to an issue, verify that the issue's team matches the current context.
- If the issue is in a different team, STOP and report the boundary violation. Do not proceed even with user confirmation.
- If the issue is in a different project (within the same team), check project configuration; if `project_check: required`, require confirmation.

**Test Case**:
```
Given: Current context is team "Engineering"
When: User requests "move ABC-123 to started"
And: ABC-123 is in team "Engineering"
Then: Agent can proceed

When: User requests "move XYZ-456 to started"
And: XYZ-456 is in team "Design"
Then: Agent must STOP and report: "XYZ-456 is in team Design, which is outside the current context. Cannot proceed."
```

## Invariant 5: Reality Check

**Rule**: The Agent must not report completion based on proxy signals (PR, CI, merge) without actual evidence of the intended outcome.

**Why**: Prevents false positives where a PR is merged but the code doesn't actually work, or CI passes but the feature isn't deployed.

**Implementation**:
- When marking an issue as "Done", the Agent must have evidence that matches the configured `completion_gate`.
- If `completion_gate: release_confirmed`, the Agent must have explicit user confirmation or evidence of release.
- If `completion_gate: production_deployment`, the Agent must have evidence that the code is running in production (e.g., deployment logs, health checks).
- The Agent must never report "deployed" based solely on "PR merged" or "CI passed".

**Test Case**:
```
Given: completion_gate is "release_confirmed"
When: User says "mark ABC-123 as done"
Then: Agent can mark as done

When: User says "PR merged"
And: completion_gate is "production_deployment"
Then: Agent must NOT mark as done; must ask for production deployment evidence
```

---

## Enforcement

- **CI Validation**: Every change to the Skill must include tests that verify all five invariants.
- **Runtime Checks**: The Agent runtime must log every invariant check and its result.
- **Configuration Schema**: The configuration schema must forbid any override that would violate these invariants.
- **User Communication**: When an invariant prevents an action, the Agent must clearly explain which invariant and why.

---

## Invariant Violation Examples

| Scenario | Invariant | Violation | Correct Behavior |
|---|---|---|---|
| User says "inspect ABC-123" and Agent writes state change | 1 | Read-only request produced write | Classify intent as read-only, perform no writes |
| Agent writes status but doesn't verify | 2 | Skipped write-back verification | Read back immediately after write |
| Agent creates issue without user request | 3 | Missing authorization | Ask user for confirmation first |
| Agent moves issue from team A to team B | 4 | Crossed team boundary | STOP and report boundary violation |
| Agent marks done because PR merged, but no deployment | 5 | False positive completion | Require actual deployment evidence |

---

## Profile Interaction

Profiles can adjust **when** these invariants are checked (e.g., minimal might not require user acceptance before moving to Review), but they cannot disable the invariants themselves.

Example: `minimal` Profile might have `review_gate: pr_ready`, meaning the Agent moves to Review as soon as PR is ready. However, the Agent must still:
- Never write on read-only requests (Invariant 1)
- Verify every write succeeded (Invariant 2)
- Have user authorization (Invariant 3, implicit in "start work")
- Respect team boundaries (Invariant 4, hard boundary)
- Not report false completion (Invariant 5)

## Execution Context & Workflow Binding

The optional Execution Context (Layer 2 working memory) and Workflow Binding (Layer 1 governance metadata) introduced in v0.5 **add no sixth invariant** and may not override these five. In particular:

- A local `completed` context state is working memory only and is **not** completion evidence (Invariant 5).
- A Workflow Binding freezes governance configuration; it is metadata, not a write authority, and never relaxes Authorization (Invariant 3) or Team Boundary (Invariant 4).
- Conflict or paused states are reported in the current output; the Agent does not silently auto-repair or auto-merge (consistent with Invariant 1 read-before-write and Invariant 2 verification).
