import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const inbox = join(root, "content/inbox");
const output = join(root, "content/work/cleaned.json");
const apiKey = process.env.DEVRUSHER_CONTENT_API_KEY;
const baseUrl = (
  process.env.DEVRUSHER_CONTENT_BASE_URL ?? "https://api.openai.com/v1"
).replace(/\/+$/, "");
const model = process.env.DEVRUSHER_CONTENT_MODEL ?? "gpt-5-mini";
const batchSize = 20;

if (!apiKey) {
  throw new Error(
    "DEVRUSHER_CONTENT_API_KEY is required in .env or .env.local"
  );
}

function extractJson(text) {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(stripped);
}

async function readInbox() {
  let entries;
  try {
    entries = await readdir(inbox, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const value = JSON.parse(await readFile(join(inbox, entry.name), "utf8"));
    items.push(...(Array.isArray(value) ? value : (value.items ?? [])));
  }
  return items;
}

async function cleanBatch(items) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `你是 DevRusher 题库编辑流水线。把输入清洗为可独立作答、简洁、现代且适合程序员面试的问题。

硬性规则：
- 必须进行有意义的改写，不得批量照抄文章或题单原文。
- 不输出答案、来源、URL、作者、许可证或出处说明。
- 只有输入明确包含公司或面试轮次时才保留；绝不推测或发明公司。
- trackId 只能是 fundamentals/frontend/backend/mobile/quality/platform/llm-algorithm/agent-evaluation/agent-engineering。
- questionType 只能是 concept/comparison/coding/practical/scenario/system-design/debugging/testing/operations/behavioral。
- audiences 只能包含 campus/experienced。
- 返回严格 JSON：{"items":[{"prompt","trackId","topicLabel","questionType","difficulty","audiences","tags","company"?,"interviewStage"?,"collectedAt"?}]}。
- 每个输入最多输出一个问题；无法形成可靠问题时跳过。`,
        },
        { role: "user", content: JSON.stringify({ items }) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Model cleaning failed (${response.status}): ${await response.text()}`
    );
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string")
    throw new Error("Model returned no JSON content");
  const cleaned = extractJson(content);
  return Array.isArray(cleaned) ? cleaned : (cleaned.items ?? []);
}

const rawItems = await readInbox();
if (!rawItems.length) throw new Error("No JSON items found in content/inbox");
const cleanedItems = [];

for (let index = 0; index < rawItems.length; index += batchSize) {
  const batch = rawItems.slice(index, index + batchSize);
  cleanedItems.push(...(await cleanBatch(batch)));
  console.log(
    `Cleaned ${Math.min(index + batchSize, rawItems.length)}/${rawItems.length} inputs.`
  );
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(cleanedItems, null, 2)}\n`);
console.log(
  `Wrote ${cleanedItems.length} cleaned questions to content/work/cleaned.json.`
);
