# Advanced Features

Optional; load on demand or when profile enables them.

| Feature | When | File |
|---|---|---|
| Release reconciliation | `release_reconciliation: enabled` | [release-reconciliation.md](release-reconciliation.md) |
| Multi-team scope | `project_check: required` | [multi-team-scope.md](multi-team-scope.md) |

All five invariants still apply. Advanced features cannot weaken them.

**Performance:** reconciliation may scan commits; provide explicit issue IDs to skip inference.
