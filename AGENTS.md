# AGENTS.md

Any agent working in this project must follow these rules.

## Linear workflow policy

- For work involving a Linear issue, follow the `linear-workflow/` skill in this repository (the source of truth). The host runtime installs a generated copy at `.forge/skills/linear-workflow/` produced by `npm run sync:forge` from `linear-workflow/`; edit the repository source, never the generated copy.
- Never claim an issue state changed unless the Linear MCP write succeeded and a read-back verified it.
- Do not claim or start an issue unless the user explicitly selects it and confirms the issue understanding.
- Move an issue to a `started` state only after the planning and confirmation workflow has been completed (see `linear-workflow/SKILL.md` for Profile-specific requirements).
- Code completion or passing CI is not user verification. Move to In Review according to the active Review Gate policy (see `linear-workflow/configuration.md`): either when the user explicitly says they verified it, or when PR is ready and CI passes (depending on profile).
- Move an issue to `completed` according to the active Completion Gate policy (see `linear-workflow/configuration.md`): either after production deployment (strict), or after user-confirmed release (minimal/standard).
- Resolve workflow states from the team via MCP. Use state IDs for writes and state types for semantic decisions; never assume state names or IDs.
- If MCP is unavailable or any required operation fails, stop the state change and report the failure.
- Prefer commit messages containing a complete Linear identifier such as `ABC-123`; extract identifiers with a boundary-safe match.

## General principles

- The skill defines the procedure; this file defines non-negotiable constraints.
- When there is a conflict between this file and the skill, the **Five Non-Negotiable Invariants** (see `linear-workflow/references/invariants.md`) always take precedence.
- Profile and strategy configuration (see `linear-workflow/configuration.md`) determines gate policies and confirmation requirements, subject to these invariants.
