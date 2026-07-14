# Mark Done：发布证据到 `completed`

本子流程可被 release、deploy、review 或其他 Skill 独立调用；不依赖主工作流的隐式上下文，也不把 Done 当作默认收尾动作。使用当前环境的 Linear integration，不假设工具名、宿主或固定状态名称。

## 调用契约

调用方提供可用信息（均可选，除 `deployment_status` 在自动调用时必须存在）：

```text
issue_ids: optional list of explicit identifiers
project_scope: optional current project/team identifier; required when scope cannot be inferred
release_version: optional
release_commit: optional
previous_release_ref: optional
current_release_ref: optional
deployment_environment: optional
deployment_status: required for automated caller; must indicate success
deployment_evidence: optional URL, record, or user statement
source: optional calling skill or user request
```

输出结构（以用户可读表格和等价字段表达）：

```text
updated_issues
already_done_issues
failed_issues
weak_matches_requiring_confirmation
unmatched_issues
comments_created
comment_failures
```

## 项目范围校验

默认只处理当前代码项目范围内的 issue。调用方应传入 `project_scope`，或提供可验证的当前项目/团队映射；缺失、冲突或无法验证时，不得写入。对发布范围中的跨项目候选，只报告为跨项目项，除非用户明确指定该项目范围并确认写入。

## 确认发布前置条件

仅在满足其一时写入 `completed`：

1. 用户在当前会话明确说明对应变更已经发布、上线或部署成功；
2. 调用方提供 `deployment_status=success` 和可信部署证据；
3. 当前环境能读取明确的生产发布成功记录。

release tag、构建包、commit、push、PR、PR merge、测试或批准本身都不是充分证据；tag 仅在有部署/发布记录或其他证据证明其已在目标环境生效时才有效。证据不足时不写入、不把 In Review 改为 Done，并说明缺少什么。

### 无人值守自动完成（unattended automated completion）的精确条件

仅当**全部**满足时才允许调用方在无人确认的情况下自动写入 `completed`：

1. 调用方为可信自动化（release/deploy/review 流程或等价 Skill），且显式传入 `deployment_status=success`；
2. 提供可信部署证据（`deployment_evidence` 或环境可读的成功部署记录）；
3. 已验证目标 issue 的 **team** 归属（team 为必需写入边界）；
4. 若请求为 project 范围，则已验证 project 归属；纯 team 范围且无 project-only 限制时，无 project 的 issue 也可处理；
5. 每个待写入 issue 已通过显式 ID 或强证据进入候选清单，并获得本条件 1–4 的授权。

强证据或“进入候选清单”本身**绝不**构成无人值守完成的授权；缺少上述任一条件时停止并说明缺少什么，不得写入。

## 模式 A：显式 issue ID

用户明确给出合法 identifier 时进入此模式。**显式 ID 仅标识目标 issue，不构成写入授权**；仍须满足「确认发布前置条件」中的发布确认（用户明确说明已发布/上线/部署成功，或可信调用方提供 `deployment_status=success` 与可信证据）后才授权写入。

1. 验证 identifier 为完整边界格式 `\b[A-Z0-9]{1,5}-\d+\b`（比较时规范大小写与格式，前缀允许字母与数字，如 `w1n-11`）；格式错误或不存在时单独报告。
2. 逐个读取 issue，记录标题、原状态、team、assignee、priority 与发布证据；**每次写入前验证 team 归属**（team 为必需写入边界）。
3. 已 completed 的 issue 跳过；canceled/tried 不改；backlog/unstarted 不改并说明需先走生命周期。仅 started/Review 等可完成状态进入写入。
4. 读取该 team workflow states，唯一解析 `completed_state`，使用其 ID 更新。
5. 回读，确认 state 为 completed 且 assignee、priority 等保留字段未意外改变。
6. 添加并回读发布评论；检查是否已有相同发布证据/版本/commit 的评论以避免重复。

评论包含：版本、release commit、环境、时间、发布证据、调用来源，以及 `Marked by linear-workflow / mark-done`。不可用字段写 `—`，不编造。

## 模式 B：从发布范围自动核对

仅当没有显式 issue ID 时使用。优先采用调用方提供的 `previous_release_ref`、`current_release_ref`、`release_commit` 或 `release_version` 确定范围。缺失时可检查部署记录、release tag/branch 或发布 commit；若仍无法可靠确定范围，停止并要求范围或 issue IDs，**不得**随意扫描最近若干 commits。

收集范围内的 commit hash/message、branch、PR、Linear 关联、revert/cherry-pick/squash 信息与发布说明。merge commit 本身不作为完成证据，应检查其引入的实际提交；squash merge 可用 PR 标题/描述作为来源并注明。

| 证据等级 | 可进入候选清单（不隐含授权写入） |
| --- | --- |
| 强：完整 identifier 出现在 commit message、branch、PR 标题、Linear 关联或发布说明 | 可以加入候选清单 |
| 弱：标题语义、修改文件、评论内容、时间或作者相似 | 不可以；仅展示候选并等待用户确认 |

> 强证据只是把 issue 加入**候选清单**，绝不隐含写入授权。是否写入由「授权」阶段决定（见下文四阶段与确认规则对照）。

完整边界匹配防止 `ABC-12` 命中 `ABC-123`。一个提交可关联多个 issue，同一 issue 可有多个提交。检测 `revert:`、`This reverts commit` 或等价撤销关系时，不将原变更自动 Done；仅当后续证据表明修复被恢复且已发布时才重新考虑。处理 revert of revert、cherry-pick、hotfix/release branch 时记录证据链。

将候选分为四个不可混淆的阶段：

1. **发现（discovery）**：扫描发布范围，找出可能的 issue。
2. **候选清单（proposed list）**：强证据可进入候选清单；弱证据仅展示候选。候选清单只是建议，不是待办。
3. **授权（authorization）**：写入 `completed` 必须由用户明确确认，或可信调用方（release/deploy/review 自动化）在提供 `deployment_status=success` 与可信证据时授权。
4. **变更（mutation）**：仅在阶段 3 授权后才执行实际状态写入与评论。

对强证据列出候选清单；对弱证据显示：`Issue | 匹配依据 | 证据等级 | 建议`。**进入候选清单不等于获得写入授权**：自动推断的任何 issue 均需确认后才写入；显式 IDs 只需先回显清单，但同样需要发布确认（见确认发布前置条件）才授权写入。

### 确认规则对照（显式 ID vs 推断 ID）

| 来源 | 进入候选清单 | 授权写入所需确认 |
| --- | --- | --- |
| 显式 ID（用户给出） | 是（直接定位） | 仍需发布确认：用户说已发布，或可信调用方 `deployment_status=success`+证据 |
| 强推断（完整 identifier 出现在 commit/branch/PR/关联/发布说明） | 是 | 需用户或可信调用方明确授权；不得自动写入 |
| 弱推断（语义/文件/评论/时间/作者相似） | 仅展示候选 | 需用户明确确认；不得自动写入 |

无论来源，写入前都必须验证 team 归属；跨 team/跨 project 的候选一律不得写入，除非用户逐 issue 明确确认范围。

## 示例

以下场景说明候选清单、授权与写入的边界：

- **显式 ID（授权后写入）**：用户说“W1N-20 已发布”，给出 `W1N-20`。验证为完整边界格式、读取 issue、确认 team 归属、用户已确认发布 → 授权写入 `completed`。
- **强推断（候选，需授权）**：发布范围 commit 含 `Fix W1N-21 ...`，`W1N-21` 完整出现在 commit message。进入候选清单；但**不自动写入**，需用户或可信调用方确认后才写入。
- **弱推断（仅候选，需确认）**：某 commit 修改了与 `W1N-22` 描述相关的文件，但无 identifier。仅展示为候选并说明匹配依据；不得写入，除非用户明确确认。
- **无 project 的 issue（team 已验证可处理）**：`W1N-23` 属于团队 W1ndy 但无 Linear project。team 边界已验证且无 project-only 限制 → 可按上述规则正常处理；不因缺少 project 而阻塞。
- **跨 project 候选（排除/需逐 issue 确认）**：发布范围推断出的 `OTHER-5` 属于另一 team/project。默认排除、仅报告为跨项目项；除非用户明确指定该项目范围并逐 issue 确认，否则不写入。
- **跨 team 候选（一律排除）**：推断出的 issue 属于不同 team。无论证据强弱，一律不写入，team 为必需边界。

## 批量执行、幂等性与部分失败

将每个 issue 作为独立单元：读取 → 映射 completed → 更新 → 回读 → 评论 → 回读。一个 issue 失败不阻止其他已确认、独立 issue 的处理；认证/全局集成不可用等全局故障除外。

- 每次写入前读取；已在目标状态时跳过状态写入。
- 更新超时后先重新读取，确认是否已成功，再决定是否重试。
- 状态成功、评论失败：报告部分成功，保留待补评论内容；重跑时仅补评论。
- 评论成功、状态失败：报告部分成功，不称为 Done；重跑时仅处理状态并避免重复评论。
- issue 被取消、删除、归档、无权限或 team/state 不存在时，记录该 issue 失败并继续其他可处理项。

最终报告：

| Issue | 标题 | 原状态 | 目标状态 | 状态结果 | 评论结果 | 证据 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |

将结果区分为 updated、already done、skipped、failed、needs confirmation。对于每项失败，输出：

```text
Issue：
步骤：
结果：
错误原因：
是否可重试：
建议处理方式：
```
