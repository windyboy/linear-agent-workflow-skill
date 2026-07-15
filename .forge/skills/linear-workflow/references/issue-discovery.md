# Issue Discovery, Creation, and Query (Read-Only by Default)

"What requirements are left", "what bugs are there", "show me the Linear backlog" these mean browsing only, not changing issues. First determine scope from team, project, assignee etc. that the user provides; ask when scope is unclear and cannot be safely defaulted.

## Browsing

1. Paginate to completion, a clear result cap, or when the tool cannot continue; explain coverage/cap.
2. Exclude types `completed`, `canceled`, and `triage`; keep backlog, unstarted, started, and Review.
3. First alert issues already in started/Review; sort the rest by Urgent, High, Medium, Low, no priority, with same priority by updatedAt, createdAt, identifier.
4. Classify as Bug vs Feature/Other using issue type, labels, project conventions. Mark "inferred" when only inferred from title or description.
5. Output `ID | Title | Type | Priority | Status | Assignee | Project`; missing fields show `—`, never fabricate.

## Reading

"Look at/analyze/explain ABC-123" reads full details only, does not assign or change state.

## Creating

When discovering new needs/problems, echo the proposed title, problem/impact, acceptance criteria, team/project/priority/labels; only call the creation capability when the user explicitly requests or confirms creation, and read back the identifier. On creation failure, provide a draft but must not claim it was created.

Using a template does not bypass user confirmation — see [template-system.md](template-system.md) for details.
