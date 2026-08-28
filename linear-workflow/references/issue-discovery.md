# Issue Discovery (Read-Only Default)

"What's left", "show backlog" → browse only. Determine scope from user input; ask if unclear.

## Browse

1. Paginate to cap or exhaustion; state coverage
2. Exclude `completed`, `canceled`, `triage`
3. Surface started/review first; sort by priority then updatedAt
4. Classify Bug vs Feature; mark inferred when guessing from title
5. Output: `ID | Title | Type | Priority | Status | Assignee | Project` — `—` for missing

## Read

Analyze/explain → read only. Surface latest Agent Brief if prior work exists — [agent-brief.md](agent-brief.md).

## Create

Echo proposed title, impact, acceptance criteria, metadata. Create only on explicit user confirm; read back ID. Failure → draft only, don't claim created. Templates don't bypass confirm — [template-system.md](template-system.md).
