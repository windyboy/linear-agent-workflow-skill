# Project Scope

All Linear ops default to **current code project**. Identify team/project from repo config, AGENTS.md, issue/PR/branch links, or user input — never guess from directory names.

**Team = hard boundary** (required). **Project = soft boundary** (when configured).

| Situation | Action |
|---|---|
| Scope clear | Filter to project; verify team (and project if required) on writes |
| Scope unclear | Read-only; ask user |
| No project, team OK | Proceed unless policy requires project |
| User specifies other scope | Echo exception; still verify each issue's boundaries |
| Release reconciliation | Only auto-close in-scope issues |

Cross-team writes never allowed.
