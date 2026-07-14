# Current Project Scope (Default Boundaries)

All Linear queries, creation, assignment, state changes, comments, and Done operations default to the **current code project** only. Before performing any Linear operation, identify the current Linear project and team from the repository's project description, Agent instructions, existing issue/PR/branch associations, configuration, or user input; never guess the mapping from directory names alone.

## Write Boundary

**Team is the required boundary, project is an optional boundary.** Every write must verify the target issue's team membership; cross-team writes are never allowed. Project is an additional constraint only when explicitly required by repository policy; without a project-only restriction, issues with verified team membership may be processed even without a project.

## Scope Rules

- **Scope determined**: Lists default to that project's issues, retaining the Project column in output; creation and writes verify the target issue belongs to that team (and, if applicable, project).
- **Scope unclear or mapping conflict**: Perform only read-only analysis that does not cross team/project boundaries and ask the user; do not create, assign, move to Review, or mark Done.
- **Issue lacks a project (but team verified)**: Does not block writes; as long as the team boundary is verified and there is no project-only restriction, the lifecycle proceeds normally. Only blocks when repository policy explicitly requires a project.
- **User explicitly specifies other project/team or cross-project issue**: Echo the exception scope; cross-project writes still require each issue's team/project to be confirmed before execution.
- **Project scope requests**: Still exclude issues without a project and cross-project issues; these candidates are only reported, not auto-updated.
- **Auto-inferring Done from release scope**: Only accept candidates confirmed to belong to the current team/project scope; others are listed as cross-project/cross-team items and not auto-updated.
