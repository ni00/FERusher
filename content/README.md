# Content workspace

DevRusher 只提交 `public/content`
中可直接部署的最终题包。原始仓库、文章快照、导入结果和报告均为本地过程数据，不进入 Git。

## Git 边界

| 目录                           | 是否提交 | 用途                   |
| ------------------------------ | -------- | ---------------------- |
| `public/content/manifest.json` | 是       | 内容版本、题量和校验和 |
| `public/content/packs/`        | 是       | 标准题目及真实出现记录 |
| `content/inbox/`               | 否       | 原始仓库与文章材料     |
| `content/work/`                | 否       | 导入、分类和去重结果   |
| `content/reports/`             | 否       | 构建与质量报告         |
| `content/seeds/`               | 否       | 待核验的历史材料       |
| `content/curricula/`           | 否       | 已停用的旧模板生成定义 |

全新 clone 可以运行 `pnpm content:check`
校验最终题包。重新生成题包需要维护者本地的来源工作区。

## 数据模型

- `Question` 是语义去重后的标准题目。
- `occurrences`
  保存原始问法、来源 URL、来源类型、时间及原文明确声明的公司和轮次。
- `collectionIds` 维护精选题集；完整题库不设人为上限，精选题集保持可完成。
- `firsthand` 表示第一人称面经，`curated-repository`
  表示有明确维护者和历史记录的社区题库。

同一道题在多个来源出现时只发布一次，同时保留多条出现记录。来源没有明确声明公司时，不推测公司归属。

当前精选规则为前端 200 题、其余方向各 100 题；按主题轮换，并依次优先第一手面经、可信面试题仓库和技术社区问题。

当前版本曾对前端题库进行一次性整理：保留第一手、多来源和精选题，再按来源可信度、时间、主题与语言骨架筛选至 1,900 题。这是本次内容结果，不是后续导入或发布的固定上限。

本地 `content/inbox/manual-curation.json`
保存这次人工保留的前端题目 ID，防止重新导入时恢复已淘汰题；它属于过程数据，不进入 Git，也不构成发布数量门禁。

## 发布流程

1. 将确认过的仓库或文章材料放入 `content/inbox`，保留原始 URL、标题和日期。
2. 运行
   `pnpm content:import`。导入器只做格式整理、分类和语义去重，不增加条件、场景或追问。
3. 运行
   `pnpm content:translate`。纯英文题会等义翻译为简体中文；题目 ID 不变，技术名词和代码保留英文，`occurrences.originalPrompt`
   继续保存来源原文。
4. 运行 `pnpm content:build` 生成版本化题包。
5. 运行
   `pnpm content:release-check`，验证来源、结构、校验和、重复项、错误前提和已知生成模板。
6. 只提交当前版本的 `public/content/manifest.json` 与 `public/content/packs/`。

发布门禁只检查来源、字段结构、校验和、重复题、错误前提和已知生成模板，不限制各方向题量，也不设置前端上限、题型配额或月度新增配额。

## 临时输入

JSON 输入至少应包含题目和来源信息，例如：

```json
{
  "prompt": "需要导入的原始问题",
  "trackId": "backend",
  "category": "Redis",
  "company": "仅在原文明确声明时填写",
  "interviewStage": "二面",
  "sourceUrl": "https://example.com/original-interview"
}
```
