# Profile Examples

This directory contains complete workflow examples for each Linear Workflow profile. Use these examples to understand how each profile behaves and to choose the right profile for your project.

## Quick Selection Guide

| Your Situation | Recommended Profile | Example |
|---|---|---|
| You're the only developer or 1–2 person team | minimal | [minimal-project.md](minimal-project.md) |
| You have a small team (3–5 people) | standard | [standard-team.md](standard-team.md) |
| You have multiple teams or regulated industry | strict | [strict-enterprise.md](strict-enterprise.md) |

## Profile Comparison

| Aspect | minimal | standard | strict |
|---|---|---|---|
| **Plan Confirmation** | Implicit | Risk-based | Explicit |
| **Review Gate** | PR ready | PR ready | User acceptance |
| **Completion Gate** | Release confirmed | Release confirmed | Production deployment |
| **Audit Comments** | None | Summary | Detailed |
| **Project Checking** | Disabled | When configured | Required |
| **Release Coordination** | Disabled | On request | Enabled |
| **Best For** | Personal projects | Small teams | Enterprise |

## Reading the Examples

Each example includes:

1. **Configuration**: The `linear-workflow.config.yaml` file to use
2. **Workflow Example**: A step-by-step walkthrough of a typical issue from creation to completion
3. **Key Characteristics**: What makes this profile unique
4. **When to Use**: Situations where this profile is appropriate
5. **Limitations**: What this profile doesn't do

## Choosing Your Profile

### minimal

**Use if**:
- You're the only developer
- You want minimal confirmation overhead
- You trust your own judgment on when to move between states
- You don't need detailed audit trail
- You're iterating rapidly

**Example**: Personal project to add dark mode to a web app.

**Read**: [minimal-project.md](minimal-project.md)

### standard

**Use if**:
- You have a small team (3–5 people)
- You want a balance between speed and accountability
- You need basic audit trail for decisions
- You want automatic escalation for risky changes
- You're ready for more structure than minimal

**Example**: Small team building a feature with database changes.

**Read**: [standard-team.md](standard-team.md)

### strict

**Use if**:
- You have multiple teams working on the same codebase
- You need comprehensive audit trail for compliance
- You want automatic coordination across releases
- You need evidence of production deployment before marking done
- You're in a regulated industry (finance, healthcare, etc.)

**Example**: Enterprise team implementing payment processing.

**Read**: [strict-enterprise.md](strict-enterprise.md)

## Customization

While the examples show the default behavior for each profile, you can customize specific strategy items. For example:

**Start with minimal, but require production deployment verification**:

```yaml
version: 1
profile: minimal
overrides:
  completion_gate: production_deployment
  audit_comments: summary
```

**Start with standard, but require explicit plan confirmation**:

```yaml
version: 1
profile: standard
overrides:
  plan_confirmation: explicit
```

See [../configuration.md](../configuration.md) for complete customization options.

## Migration from v0.2.0

If you're upgrading from Linear Workflow v0.2.0 (which had no profiles), your current behavior is equivalent to the `strict` profile. To migrate:

1. Create `linear-workflow.config.yaml` with `profile: strict`
2. Test that behavior matches your expectations
3. If you want to relax some confirmations, adjust the profile or use overrides

See [../configuration.md](../configuration.md) for migration details.

---

**Version**: 0.3.0  
**Last Updated**: 2026-07-15
