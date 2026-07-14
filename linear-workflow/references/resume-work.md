# Resume Existing Work

When an issue is already in a started state but work was interrupted (session ended, Agent restarted, etc.), resume from the **first stage lacking evidence** rather than starting over.

## Resume Detection

When resuming, check evidence in the following order to locate the first incomplete stage:

| Evidence | Corresponding stage | How to check |
| --- | --- | --- |
| Dedicated branch exists | Branch established | Git branch list contains a branch with the issue ID |
| Local unpushed commits | Implementation phase | Branch has commits ahead of remote |
| PR exists and linked to issue | PR created | Linear/Git integration can read linked PR |
| CI status is passing | CI passed | PR/commit check status |
| User explicitly states acceptance | User acceptance passed | User statement in current session |
| Trusted deployment evidence | Production deployment succeeded | Deploy/release skill or user confirmation |

## Resume Rules

1. **Continue from the first stage without evidence**: Already-passed stages are not re-executed; stages that failed or have no evidence are executed from the beginning.
2. **No evidence means not complete**: If a stage has no evidence (Linear status, Git records, PR, CI, deployment records, user statements), you must not claim it is complete and must execute from that stage.
3. **Status matching**: If the Linear status is already at the target stage's state, do not re-write; if the status lags behind what the evidence shows, update to match the evidence.
4. **User confirms resume point**: When resuming, report detected evidence and the suggested resume point to the user, then execute after confirmation.

## Resume Scenario Examples

| Scenario | Detection result | Resume action |
| --- | --- | --- |
| Branch and commits exist, no PR | Branch exists, commits present, no PR | Resume from PR creation stage |
| PR exists and CI passes, no acceptance | PR + CI pass, no acceptance record | Resume from user acceptance stage |
| PR merged, not deployed | PR merged, no deployment evidence | Resume from deployment stage, then Done after deployment |
| Deployed but Linear not Done | Deployment evidence exists, Linear not completed | Call mark-done directly |
