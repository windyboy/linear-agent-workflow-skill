# Task Packet

Use for one collaboration-lite workstream after the Coordinator has planned the Issue. It is a local coordination record, not a Linear issue-creation template and not authorization to dispatch work before the normal `started` transition.

```markdown
# <workstream-id>: <short task>

- Parent issue: ABC-123
- Role: worker | reviewer | third-opinion
- Owner session: <accepted owner or unassigned>
- Status: planned | dispatched | reported | reviewed | excepted
- Depends on: <workstream IDs or none>
- Independent review requested: true | false

## Scope

- Files/symbols: <bounded list>
- Out of scope: <bounded exclusions>

## Acceptance criteria

- [ ] <verifiable outcome>

## Evidence to check

- <tests, links, commands, or artifacts>

## Report locations

- Worker report: `report.md`
- Reviewer finding: `review.md` (if requested or chosen by Coordinator)

## Disagreements / handoff notes

- None known.
```

The Worker appends evidence to `report.md`. The Reviewer uses [finding.md](finding.md) in a separate `review.md`. Model/provider identity is optional advisory context for `review.md` or an Agent Brief summary, not a packet field. Contract and authority rules: [collaboration.md](../references/collaboration.md).
