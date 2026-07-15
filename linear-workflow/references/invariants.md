# Non-Negotiable Invariants

These five rules are the foundation of safe Agent operation on Linear. They apply to **all Profiles** and **cannot be overridden** by configuration, user instruction, or project settings.

## Invariant 1: Read-Before-Write

**Rule**: Every write operation to Linear must be preceded by a read of the current state.

**Why**: Prevents lost updates and ensures the Agent operates on fresh data, not stale cache.

**Implementation**:
- Before any status transition, re-read the issue from Linear.
- If the issue state has changed since the last read, report the change and ask the user for confirmation.
- If the issue is already in the target state, skip the write.

**Test Case**:
```
Given: Issue ABC-123 is in "unstarted" state
When: Agent reads issue, then user requests "move to started"
Then: Agent must re-read before writing, verify state is still "unstarted", then write
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

## Invariant 4: Team/Project Boundary

**Rule**: Write operations must not cross team or project boundaries without explicit user confirmation.

**Why**: Prevents accidental modifications to issues in other teams or projects.

**Implementation**:
- Before writing to an issue, verify that the issue's team matches the current context.
- If the issue is in a different team, require explicit user confirmation.
- If the issue is in a different project (within the same team), check project configuration; if `project_check: required`, require confirmation.

**Test Case**:
```
Given: Current context is team "Engineering", project "Backend"
When: User requests "move ABC-123 to started"
And: ABC-123 is in team "Engineering", project "Backend"
Then: Agent can proceed without confirmation

When: User requests "move XYZ-456 to started"
And: XYZ-456 is in team "Design"
Then: Agent must ask for explicit confirmation
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
| User says "mark ABC-123 done" without reading first | 1 | Skipped read-before-write | Read issue, verify state, then write |
| Agent writes status but doesn't verify | 2 | Skipped write-back verification | Read back immediately after write |
| Agent creates issue without user request | 3 | Missing authorization | Ask user for confirmation first |
| Agent moves issue from team A to team B | 4 | Crossed team boundary | Ask user for explicit confirmation |
| Agent marks done because PR merged, but no deployment | 5 | False positive completion | Require actual deployment evidence |

---

## Profile Interaction

Profiles can adjust **when** these invariants are checked (e.g., minimal might not require user acceptance before moving to Review), but they cannot disable the invariants themselves.

Example: `minimal` Profile might have `review_gate: pr_ready`, meaning the Agent moves to Review as soon as PR is ready. However, the Agent must still:
- Read the issue before writing (Invariant 1)
- Verify the write succeeded (Invariant 2)
- Have user authorization (Invariant 3, implicit in "start work")
- Respect team boundaries (Invariant 4)
- Not report false completion (Invariant 5)
