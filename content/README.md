# Content workspace

DevRusher 只把可直接部署的最终题集提交到
`public/content`。采集输入、种子、课程图谱、模型清洗结果和生成报告都是维护者本地过程数据，不进入 Git。

## Git 边界

| 目录                           | 是否提交 | 用途                                 |
| ------------------------------ | -------- | ------------------------------------ |
| `public/content/manifest.json` | 是       | 当前内容版本、题量、题包路径和校验和 |
| `public/content/packs/`        | 是       | 浏览器直接加载的最终不可变题包       |
| `content/inbox/`               | 否       | 临时采集输入，可短暂包含来源 URL     |
| `content/seeds/`               | 否       | 本地种子与历史题集                   |
| `content/curricula/`           | 否       | 本地课程图谱和批量生成定义           |
| `content/work/`                | 否       | 模型清洗后的中间结果                 |
| `content/reports/`             | 否       | 每次构建产生的质量与分布报告         |

全新 clone 可以运行 `pnpm content:check`
校验已经发布的最终题包，但只有持有本地内容工作区的维护者才能运行
`pnpm content:build` 重新生成题包。

## Pipeline

1. 把临时 JSON 输入放入
   `content/inbox`。文件可以在处理期间包含采集 URL，但该目录不会提交。
2. 参照 `.env.example`，在 `.env` 或 `.env.local`
   配置维护者专用的兼容模型凭据；两者同时存在时 `.env.local` 优先。
3. 运行
   `pnpm content:clean`。模型会改写题干、规范分类，并拒绝推测公司来源；结果写入
   `content/work/cleaned.json`，不保留来源字段。
4. 每次准备发布前运行
   `pnpm content:rewrite`。流水线会从当前最终题包逐题改写，再由独立审稿提示复核技术前提；结果按批次原子写入
   `content/work/rewrites.json`。命令可中断续跑，也可用
   `--track=frontend`、`--limit=100` 和 `--batch-size=20`
   控制范围；默认并发处理三个批次，也可用 `--concurrency=1` 至
   `--concurrency=16` 调整。追求更高吞吐时可加
   `--single-pass`，让模型在一次请求内完成改写与逐条自检；默认模式仍使用独立的第二次审稿请求。执行前可运行
   `pnpm content:rewrite:check`
   查看待处理数量、预计模型调用次数和已识别风险。并发任务使用持续 worker 池调度，完成一个批次后立即领取下一个批次，避免慢请求阻塞其他并发槽；断点按并发批次数量持续落盘。重写只覆盖题干并保持题目 ID 与分类不变。人工抽样发现单题需要重做时，可使用
   `pnpm content:rewrite -- --redo=<题目 ID>`
   定向替换断点中的结果。HTTP 限流、服务端错误、返回条数不完整或质量校验失败会自动重试；连续失败的整批题目进入
   `rejected`，不会污染最终题包，下一次运行会从这些未完成 ID 继续。单次模型请求默认 150 秒超时，可用
   `DEVRUSHER_CONTENT_REQUEST_TIMEOUT_MS` 调整，避免端点无响应时无限挂起。
5. 在 `content/curricula/tracks`
   维护概念、场景、失败模式和工程产物；发布主题统一在
   `scripts/content/topic-taxonomy.mjs`
   维护。主题表示稳定知识域，技术深度由难度、题型和标签表达，不再拆成“基础 / 内核 / 生产 / 性能”等平行主题。
6. 运行
   `pnpm content:build`，合并课程图谱、清洗结果和本地种子，再执行规范化、过滤、去重和分包。
7. 在 `scripts/content/technology-baseline.mjs`
   维护需要持续覆盖的真实技术对象及其官方文档或原始论文。公开题包不会携带来源字段，但构建时会检查每项技术是否有足量题目。
8. 运行
   `pnpm content:audit`，检查全部最终题目的错误前提、残缺代码、多题拼接、重复题、五档难度和技术基线覆盖。
9. 运行
   `pnpm content:release-check`。每个一级方向必须至少有 2,000 道题；课程题必须覆盖既定主题体系（最多允许一个兼容主题仅由历史题集补充）、五档难度和主要题型。发布门禁还要求最终题包中的每道题都经过重写复核，并限制高频语言骨架，防止题库重新退化为少量模板拼接。
10. 只提交更新后的 `public/content/manifest.json` 和
    `public/content/packs/<version>/*.json`。

`pnpm content:check`
是常规质量门禁的一部分，用于验证清单、校验和、题量、唯一 ID、主题粒度、技术基线、题干风险、字段结构以及公开题包中不存在来源字段。未登记的主题 ID、不一致的主题名称、没有足量真实技术题目的基线项或带有已知错误前提的题目都会直接导致构建失败。

## Inbox shape

每个 `.json` 文件可以是数组，也可以是包含 `items` 数组的对象。问题文本可以使用
`prompt`、`question` 或旧格式的 `q`。可选元数据示例：

```json
{
  "prompt": "需要被清洗和改写的原始问题",
  "trackId": "backend",
  "topicLabel": "分布式系统",
  "company": "仅在输入明确声称时填写",
  "interviewStage": "二面",
  "sourceUrl": "仅在 inbox 中短暂存在"
}
```

允许的方向 ID：`fundamentals`、`frontend`、`backend`、`mobile`、`quality`、`platform`、`llm-algorithm`、`agent-evaluation`
和 `agent-engineering`。
