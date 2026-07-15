# Standard Profile Example

**Use case**: Small teams (3–5 people), general projects with basic accountability.

## Configuration

Create `linear-workflow.config.yaml` in your project root:

```yaml
version: 1
profile: standard
```

## Workflow Example

### 1. Create Issue

**User**: "Create a feature to add user authentication"

**Agent**:
- Reads user request
- Creates issue with Feature template
- Returns: "Created ABC-123: Add user authentication"

### 2. Start Work

**User**: "Start work on ABC-123"

**Agent**:
- Reads issue ABC-123
- Forms implementation plan
- Assesses risk: "This involves database schema changes"
- Escalates for confirmation: "This change involves a database migration. Proceed?"
- User confirms: "Yes, start work"
- Updates issue to `started`
- Creates branch `feature/auth`
- Adds summary audit comment: "Started implementation. Plan: Add auth service, update DB schema, add tests."
- Returns: "Started ABC-123. Branch: feature/auth"

### 3. Implement, Test, and Push

**User**: "I've pushed the changes and all tests pass"

**Agent**:
- Detects PR #42 created
- Verifies CI passed
- Moves issue to `review`
- Adds summary audit comment: "Moved to Review. PR #42, CI passed, 5 files changed, 200 lines added."
- Returns: "Moved ABC-123 to Review. PR: #42"

### 4. Code Review and Approval

**User**: "The team reviewed the PR, looks good"

**Agent**:
- Reads issue ABC-123
- Verifies PR is approved
- Merges PR
- Returns: "PR #42 merged"

### 5. Mark Done

**User**: "The changes are deployed to staging"

**Agent**:
- Reads issue ABC-123
- Verifies release confirmation
- Moves issue to `completed`
- Adds summary audit comment: "Marked Done. Deployed to staging. Feature is live for testing."
- Returns: "Marked ABC-123 as Done"

## Key Characteristics

- **Risk-based plan confirmation**: Automatic for simple changes, escalate for risky ones (DB migration, API change, etc.)
- **PR-ready review gate**: Move to Review as soon as PR is created and CI passes
- **Release-confirmed completion**: Mark Done when user confirms release
- **Summary audit comments**: Brief audit trail (what changed, key files, verification status)
- **Conditional project checking**: Check project scope if configured
- **On-request release coordination**: Close related issues only when user explicitly requests it

## When to Use

- You have a small team (3–5 people)
- You want a balance between speed and accountability
- You need basic audit trail for decisions
- You want automatic escalation for risky changes
- You're ready for more structure than minimal, but not as strict as enterprise

## Example: Risky Change Escalation

**User**: "Start work on ABC-124: Refactor authentication service"

**Agent**:
- Reads issue ABC-124
- Forms implementation plan
- Assesses risk: "This refactors a critical service used by all features"
- Escalates for confirmation: "This change affects the authentication service used by all features. Proceed?"
- User confirms: "Yes, but please require code review before merging"
- Updates issue to `started`
- Creates branch `refactor/auth-service`
- Adds summary audit comment: "Started implementation. Risk: Critical service refactor. Requires code review."
- Returns: "Started ABC-124. Branch: refactor/auth-service. Note: Code review required before merging."

---

**Version**: 0.3.0  
**Profile**: standard  
**Last Updated**: 2026-07-15
