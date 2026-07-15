# Strict Profile Example

**Use case**: Enterprise, multi-team, regulated projects with comprehensive audit trail and automatic coordination.

## Configuration

Create `linear-workflow.config.yaml` in your project root:

```yaml
version: 1
profile: strict
```

## Workflow Example

### 1. Create Issue

**User**: "Create a feature to add payment processing"

**Agent**:
- Reads user request
- Creates issue with Feature template
- Adds detailed audit comment: "Created ABC-123: Add payment processing. Category: Financial feature. Requires PCI compliance review."
- Returns: "Created ABC-123: Add payment processing"

### 2. Start Work

**User**: "Start work on ABC-123"

**Agent**:
- Reads issue ABC-123
- Forms implementation plan
- Requires explicit confirmation: "This feature involves payment processing and requires PCI compliance. Implementation plan: Add payment gateway integration, implement tokenization, add security tests. Proceed?"
- User confirms: "Yes, proceed"
- Updates issue to `started`
- Creates branch `feature/payment-processing`
- Adds detailed audit comment: "Started implementation. Plan: Add payment gateway integration, implement tokenization, add security tests. Risk: PCI compliance required. Decision: Approved by user. Timestamp: 2026-07-15T10:30:00Z"
- Returns: "Started ABC-123. Branch: feature/payment-processing"

### 3. Implement, Test, and Push

**User**: "I've completed the implementation, all tests pass, security review is done"

**Agent**:
- Detects PR #42 created
- Verifies CI passed
- Verifies security review completed
- Does NOT move to Review yet; requires user acceptance
- Adds detailed audit comment: "PR #42 created. CI passed. Security review completed. Awaiting user acceptance."
- Returns: "PR #42 created. Ready for user acceptance."

### 4. User Acceptance

**User**: "I've reviewed the changes, they look good"

**Agent**:
- Reads issue ABC-123
- Records user acceptance
- Moves issue to `review`
- Adds detailed audit comment: "Moved to Review. User acceptance confirmed. PR #42 approved. Security review passed. Ready for merge."
- Returns: "Moved ABC-123 to Review"

### 5. Code Review and Approval

**User**: "The team reviewed the PR, approved for merge"

**Agent**:
- Reads issue ABC-123
- Verifies PR is approved by team
- Merges PR
- Adds detailed audit comment: "PR #42 merged. Team approval confirmed. Timestamp: 2026-07-15T11:00:00Z"
- Returns: "PR #42 merged"

### 6. Deployment Verification

**User**: "The changes are deployed to production, all health checks pass"

**Agent**:
- Reads issue ABC-123
- Verifies production deployment evidence (health checks, metrics)
- Identifies related issues in the release (ABC-124, ABC-125)
- Closes all related issues
- Moves issue to `completed`
- Adds detailed audit comment: "Marked Done. Production deployment confirmed. Health checks passed. Release v1.5.0 includes ABC-123, ABC-124, ABC-125. All issues closed. Timestamp: 2026-07-15T11:30:00Z"
- Returns: "Marked ABC-123 as Done. Release v1.5.0 complete. Closed related issues ABC-124, ABC-125."

## Key Characteristics

- **Explicit plan confirmation**: Always require user confirmation before starting work
- **User acceptance review gate**: Move to Review only after user explicitly confirms implementation is complete
- **Production deployment completion**: Mark Done only when code is verified running in production
- **Detailed audit comments**: Complete audit trail (decision rationale, evidence, timeline, root cause)
- **Required project checking**: Always verify project scope; escalate if ambiguous
- **Enabled release coordination**: Automatically identify and close all related issues in the release

## When to Use

- You have multiple teams working on the same codebase
- You need comprehensive audit trail for compliance
- You want automatic coordination across releases
- You need evidence of production deployment before marking done
- You're in a regulated industry (finance, healthcare, etc.)
- You want to prevent mistakes at every stage

## Example: Multi-Team Coordination

**User**: "Mark ABC-123 as done"

**Agent**:
- Reads issue ABC-123
- Verifies production deployment evidence
- Identifies release v1.5.0 includes: ABC-123 (primary), ABC-124 (related feature), ABC-125 (related bug fix), ABC-126 (documentation)
- Verifies all related issues are ready for closure
- Closes all four issues
- Adds detailed audit comment for each issue with release information
- Adds release notes: "v1.5.0 released. Includes payment processing (ABC-123), improved checkout flow (ABC-124), fixed payment timeout bug (ABC-125), updated payment docs (ABC-126)."
- Returns: "Marked ABC-123 as Done. Release v1.5.0 complete. Closed related issues ABC-124, ABC-125, ABC-126."

## Audit Trail Example

For a single issue, the strict profile generates detailed audit comments at each stage:

```
Created ABC-123
- Category: Financial feature
- Requires PCI compliance review
- Timestamp: 2026-07-15T10:00:00Z

Started implementation
- Plan: Add payment gateway integration, implement tokenization, add security tests
- Risk: PCI compliance required
- Decision: Approved by user
- Timestamp: 2026-07-15T10:30:00Z

Moved to Review
- User acceptance confirmed
- PR #42 approved
- Security review passed
- Timestamp: 2026-07-15T11:00:00Z

PR #42 merged
- Team approval confirmed
- Timestamp: 2026-07-15T11:00:00Z

Marked Done
- Production deployment confirmed
- Health checks passed
- Release v1.5.0
- Related issues closed: ABC-124, ABC-125, ABC-126
- Timestamp: 2026-07-15T11:30:00Z
```

---

**Version**: 0.3.0  
**Profile**: strict  
**Last Updated**: 2026-07-15
