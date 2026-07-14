---
name: linear-workflow
description: 管理 Linear issue 的端到端交付生命周期。用户提及 Linear、issue 标识符（如 ABC-123）、未完成需求或 Bug、创建 issue、开始处理/领取、实施计划、分支、PR、验证通过、转 Review、发布/上线或关闭 issue，或英文意图如 “start issue”、“create issue”、“move to review”、“mark issues done” 时使用。仅用于 Linear issue 生命周期，不用于普通代码 Review；通过当前运行环境的 Linear 集成安全执行查询、started、Review 与发布后 completed。
---

# Linear Workflow

本 Skill 与宿主无关：使用当前 Agent runtime 提供的 **Linear integration**（Linear MCP、API、connector 或等价工具提供者），不得假设产品、目录、server、工具函数或状态名称。工具名如 `list issues`、`get issue`、`update issue`、`create comment` 仅为示意；实际名称由当前环境决定。

## 生命周期选择

采用以下端到端流程：

```text
发现需求/问题 →（确认后）创建或选择 Linear Issue → 读取完整 Issue
→ 核对代码与工作区 → 输出实施计划 → 用户确认开始
→ 更新为 started + 建立专用分支 → 实现与自动化测试
→ Commit / Push / PR → CI → 请求用户最终验收
→ 用户验收通过后转 Review 并回写 Linear → 人工 Review → Merge
→ 实际发布/部署成功 → Linear Done
```

`Merge ≠ Done`。代码完成、测试通过、commit、push、PR、CI、审批、merge 或 release tag 本身均不等于生产发布成功。仅真实发布/部署成功才可进入 Done。阶段不可跳过；每个 Linear 写入必须回读验证。

## 当前项目范围（默认边界）

所有 Linear 查询、创建、领取、状态变更、评论和 Done 操作默认只与**当前代码项目**有关。开始 Linear 操作前，从当前仓库的项目说明、Agent instructions、现有 issue/PR/branch 关联、配置或用户输入识别当前 Linear project 与 team；不得仅因目录名猜测映射。

**写入边界：team 为必需边界，project 为可选边界。** 每次写入前必须验证目标 issue 的 team 归属；team 不匹配（跨 team）一律不得写入。project 仅在仓库策略明确要求时作为额外限制；无 project-only 限制时，已验证 team 归属的 issue 即使没有 project 也可处理。

- 范围已确定：列表默认只显示该 project 的 issue，并在输出中保留 Project 列；创建和写入前确认目标 issue 属于该 team（及，若适用，project）。
- 范围不明确或映射冲突：仅进行不会跨 team/跨项目的只读分析并询问用户；不得创建、领取、转 Review 或 Done。
- issue 缺少 project（但 team 已验证）：**不因此阻塞写入**；只要 team 边界已验证且无 project-only 限制，即可按生命周期正常处理。仅当仓库策略显式要求 project 时才视为阻塞。
- 用户明确指定其他 project/team 或跨项目 issue：回显该例外范围；跨项目写入仍须在每个 issue 的 team/project 已确认后执行。
- project 范围请求：仍排除无 project 与跨 project 的 issue；这些候选仅报告，不自动更新。
- 自动从发布范围推断 Done 时：只接受已确认属于当前 team/project 范围的候选；其他候选列为跨项目/跨 team 项，不自动更新。

## 0. 发现能力与安全边界

每个会话首次执行 Linear 操作前，按能力而非工具名确认并记录映射：

| 能力 | 用途 | 缺失时的处理 |
| --- | --- | --- |
| 查询 team/workspace、项目、负责人、标签 | 确定范围和显示字段 | 限制查询范围并说明；不能猜测 team |
| 列表/搜索 issue，支持分页 | 查询待办与候选 | 只报告已取得页；不能声称完整结果 |
| 按 identifier/ID 获取完整 issue | 浏览、实施与写入前回读 | 不得开始实施或写入该 issue |
| 创建 issue | 将已确认需求/问题记录到 Linear | 可分析和起草内容；不得谎称已创建 |
| 获取 workflow states（含 ID、name、type、顺序） | 映射状态 | 不得更新状态 |
| 更新 issue 状态 | 生命周期变更 | 可继续只读分析，不得声称已变更 |
| 获取/新增评论和关联信息 | 上下文与审计评论 | 可更新状态时须单独报告评论未完成 |

认证失败、权限不足、超时或返回字段不完整时，不得用自然语言替代真实写入。工具超时后，**先重新查询**目标 issue 再决定是否重试。

## 1. 状态映射

先读取 issue 所属 team，再获取该 team 的 workflow states。状态角色为 `backlog_state`、`unstarted_state`、`started_state`、`review_state`、`completed_state`、`canceled_state`。更新时使用实际 state ID；判断使用 type 与语义，不能硬编码 `Todo`、`In Progress`、`In Review` 或 `Done`。

按以下优先级映射目标状态：已验证的显式 state ID → state `type` → 名称的精确语义（如 Review/QA Review/Code Review）→ 状态顺序和团队上下文 → 用户确认。

`started_state` 通常是 type `started` 的实施状态。`review_state` 必须是独立且无歧义的 Review/QA/Code Review 语义状态；不要因为名称相似就猜测。若无独立 Review 状态，不创建状态、不用 completed 代替；报告映射结果并由用户决定保持 started 或使用哪个现有状态。多个候选冲突时同样停止等待确认。

## 2. 发现、创建与查询（只读为默认）

“还有哪些需求没做”“还有哪些 bug”“查看 Linear 待办”等仅表示浏览，不得改变 issue。先确定 team、project、assignee 等用户给出的范围；范围不明确且无法安全默认时先询问。

1. 分页读取至完成、明确的结果上限，或工具无法继续；说明覆盖范围/上限。
2. 排除 type `completed`、`canceled` 与 `tried`；保留 backlog、unstarted、started 和 Review。
3. 先提醒已处于 started/Review 的 issue；其余按 Urgent、High、Medium、Low、无优先级排序，同优先级按更新时间、创建时间、identifier。
4. 使用 issue type、labels、项目约定分类为 Bug 与 Feature/Other。仅从标题或描述推断时标注“推测”。
5. 输出 `ID | 标题 | 类型 | 优先级 | 状态 | 负责人 | 项目`；缺失字段显示 `—`，不编造。

“看看/分析/解释 ABC-123”只读取完整详情，不领取、不改状态。发现新需求/问题时，先回显拟创建的标题、问题/影响、验收标准、team/project/priority/labels；仅在用户明确要求或确认创建后调用创建能力，并回读 identifier。创建失败时可提供草稿，不得称已创建。

## 3. 读取、核对代码与实施计划

开始实施前，完整读取：标题、描述、验收标准、当前状态、优先级、负责人、labels、项目、cycle、评论、附件、父/子 issue、阻塞/被阻塞/关联 issue，以及 branch、PR、commit 关联（若集成可提供）。不得仅凭标题修改代码。

读取项目自身 Agent instructions，检查代码库结构和版本控制状态，定位相关模块，识别构建/测试方式，并尽可能记录修改前基线。若 issue 内容不足，检查关联 issue、历史与代码后列出缺失信息；不要编造验收标准。

输出实施计划，至少包含：问题与验收标准、根因假设/待验证项、影响文件或模块、最小修改方案、测试与回滚考虑、分支建议和 PR/发布风险。等待用户确认“开始处理”或等价明确指令后，才进入实施阶段；仅浏览或计划不改变 issue 状态、不创建分支。

## 4. 领取、分支与实施

用户确认开始后，重新读取当前 issue/state 与 team states：

1. 若已是 started/Review，不重复写入；说明状态。若 completed/canceled/tried，不自动重开，须用户明确要求。若负责人是其他人，告知用户，不擅自改 assignee。
2. 对可开始的 backlog/unstarted，更新为实际 `started_state`；仅在用户要求且工具支持时设置当前用户为负责人。
3. 回读确认目标 state ID/type；验证失败则不创建分支或修改代码。
4. 基于项目既有分支规范建立专用分支；无规范时建议使用包含完整 issue identifier 的短名称。创建前检查工作区，绝不覆盖用户未提交修改。
5. 实现最小必要修改；不要顺带重构、删除有价值注释或改变无关公开行为。

## 5. 自动化验证、Commit、Push 与 PR

实施后，执行适用的测试、构建、lint、类型检查和项目已有静态分析；区分修改前已有失败、未执行项与本次失败，绝不声称未运行的验证通过。

自动化验证达到可审查状态后：

1. 回写可选的进展评论（仅在用户要求或团队约定需要时），内容必须真实且不宣称用户已验收。
2. 检查变更与工作区，创建 commit 时须包含完整 issue identifier（按边界安全正则 `\b[A-Z0-9]{1,5}-\d+\b` 提取，避免 `ABC-12` 命中 `ABC-123`）；仅在用户要求或项目规则允许时 push。
3. 创建 PR 时关联 issue，附变更摘要、验证结果、未执行项和风险；PR 创建失败不影响已验证的本地实现，但必须如实报告。
4. 运行或等待可用 CI；CI 失败/未运行时不能声称可合并。CI 通过也不替代用户验收或生产发布。

## 6. 用户验收与转 Review

在自动化验证、commit/PR/CI 状态均已如实总结后，请求最终验收：

> 请验证 ISSUE-ID 对应的问题是否已经解决。确认通过后，我会将其更新为 Review 状态。

用户说问题仍存在或验收失败时，保持 started，记录反馈（若用户/调用方要求可添加“待继续排查”评论），继续修复；不要添加“已解决”评论或转 Review。

只有用户明确表示其验收通过（如“我验证通过了”）时才触发：

1. 回读 issue，获取 team states，并解析无歧义 `review_state`。
2. 若已在目标 Review 状态，跳过状态写入；检查是否已有本次相同审计评论，避免重复。
3. 更新状态后回读确认实际状态；若失败，报告，不声称成功。
4. 新增并回读解决摘要评论：Resolution summary、Root cause、Implementation、Key files、Validation performed、Validation not performed、Known limitations、Commit/PR reference。
5. 状态成功但评论失败，明确报告“状态成功、评论失败”；评论成功但状态失败时同样分别报告，且不得称为已转 Review。

人工 Review、CI 复核和 Merge 由当前项目流程或相应 Skill 执行。Merge 后保持 Review（或团队定义的等价非完成状态），直到真实发布/部署成功。

## 7. 发布后 Done

当用户明确确认已发布/上线/部署成功，或 release/deploy 等其他 Skill 提供可信成功部署结果时，调用 [mark-done.md](mark-done.md)。Done 子流程可独立调用，调用方应尽量提供其输入契约；不要依赖本文件的隐式上下文。

## 8. 幂等性与错误格式

每次写入前读取，目标状态已满足则跳过；超时后先回读；只补做未成功步骤；不要重复添加完全相同的评论。单 issue 的状态与评论是可独立审计的步骤。

每次状态变更输出：`Issue、原状态、目标状态、实际状态、状态更新、评论更新、验证方式`；批量使用表格且不暴露 token、完整内部 JSON 或无关元数据。错误至少输出：

```text
Issue：
步骤：
结果：
错误原因：
是否可重试：
建议处理方式：
```
