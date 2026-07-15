# Minimal Profile Example

**Use case**: Personal projects, rapid prototyping, 1–2 person teams.

## Configuration

Create `linear-workflow.config.yaml` in your project root:

```yaml
version: 1
profile: minimal
```

## Workflow Example

### 1. Create Issue

**User**: "Create a feature to add dark mode"

**Agent**:
- Reads user request
- Creates issue with Feature template
- Returns: "Created ABC-123: Add dark mode"

### 2. Start Work

**User**: "Start work on ABC-123"

**Agent**:
- Reads issue ABC-123
- Forms implementation plan (simple, no escalation needed)
- Updates issue to `started`
- Creates branch `feature/dark-mode`
- Returns: "Started ABC-123. Branch: feature/dark-mode"

### 3. Implement and Push

**User**: "I've pushed the changes"

**Agent**:
- Detects PR #42 created
- Verifies CI passed
- Moves issue to `review`
- Returns: "Moved ABC-123 to Review. PR: #42"

### 4. Mark Done

**User**: "Mark ABC-123 as done"

**Agent**:
- Reads issue ABC-123
- Verifies user confirmation (release_confirmed)
- Moves issue to `completed`
- Returns: "Marked ABC-123 as Done"

## Key Characteristics

- **No plan confirmation**: User says "start work" = authorization to start immediately
- **PR-ready review gate**: Move to Review as soon as PR is created and CI passes
- **Release-confirmed completion**: Mark Done when user confirms release
- **No audit comments**: Minimal output, only essential information
- **No project checking**: Skip project scope verification
- **No release coordination**: Only close the explicitly requested issue

## When to Use

- You're the only developer
- You want minimal confirmation overhead
- You trust your own judgment on when to move between states
- You don't need detailed audit trail
- You're iterating rapidly

## Limitations

- No multi-team coordination
- No detailed audit trail for accountability
- No automatic release coordination
- No project scope verification

---

**Version**: 0.3.0  
**Profile**: minimal  
**Last Updated**: 2026-07-15
