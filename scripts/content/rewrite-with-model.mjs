import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getPromptScienceRisk,
  getRewriteRejection,
  isKnownGeneratedTemplate,
} from "./rewrite-quality.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = join(root, "public/content/manifest.json");
const outputPath = join(root, "content/work/rewrites.json");
const apiKey = process.env.DEVRUSHER_CONTENT_API_KEY;
const baseUrl = (
  process.env.DEVRUSHER_CONTENT_BASE_URL ?? "https://api.openai.com/v1"
).replace(/\/+$/, "");
const model = process.env.DEVRUSHER_CONTENT_MODEL ?? "gpt-5-mini";
const reviewModel = process.env.DEVRUSHER_CONTENT_REVIEW_MODEL ?? model;
const requestTimeoutMs = readIntegerArgument(
  "request-timeout-ms",
  Number(process.env.DEVRUSHER_CONTENT_REQUEST_TIMEOUT_MS ?? 150_000),
  10_000,
  600_000
);
const batchSize = readIntegerArgument("batch-size", 20, 1, 20);
const concurrency = readIntegerArgument("concurrency", 3, 1, 16);
const limit = readIntegerArgument(
  "limit",
  Number.MAX_SAFE_INTEGER,
  1,
  Number.MAX_SAFE_INTEGER
);
const selectedTrack = readStringArgument("track");
const redoIds = new Set(
  (readStringArgument("redo") ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
);
const checkOnly = process.argv.includes("--check");
const singlePass = process.argv.includes("--single-pass");

function readStringArgument(name) {
  const prefix = `--${name}=`;
  return process.argv
    .find(value => value.startsWith(prefix))
    ?.slice(prefix.length);
}

function readIntegerArgument(name, fallback, minimum, maximum) {
  const raw = readStringArgument(name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `--${name} must be an integer between ${minimum} and ${maximum}`
    );
  }
  return value;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function fetchWithTimeout(url, options) {
  // Keep the abort signal alive after fetch resolves so a stalled response
  // body (response.json()/response.text()) is covered by the same deadline.
  // AbortSignal.timeout also releases its timer when the request completes.
  const signal = AbortSignal.timeout(requestTimeoutMs);
  return fetch(url, { ...options, signal });
}

async function readExisting() {
  try {
    const value = await readJson(outputPath);
    return {
      schemaVersion: 1,
      contentVersion: value.contentVersion,
      sourceTracks: Array.isArray(value.sourceTracks)
        ? value.sourceTracks
        : undefined,
      model: value.model,
      updatedAt: value.updatedAt,
      items: Array.isArray(value.items) ? value.items : [],
      rejected: Array.isArray(value.rejected) ? value.rejected : [],
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { schemaVersion: 1, items: [], rejected: [] };
    }
    throw error;
  }
}

async function readPublishedQuestions(manifest) {
  const questions = [];
  for (const track of manifest.tracks) {
    if (selectedTrack && track.id !== selectedTrack) continue;
    const path = join(root, "public", track.file.replace(/^\//, ""));
    questions.push(...(await readJson(path)));
  }
  if (
    selectedTrack &&
    !manifest.tracks.some(track => track.id === selectedTrack)
  ) {
    throw new Error(`Unknown track: ${selectedTrack}`);
  }
  return questions;
}

function extractJson(text) {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(stripped);
}

async function rewriteBatch(items, attempt = 1) {
  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      messages: [
        {
          role: "system",
          content: `你是 DevRusher 的资深技术题库主编。逐条重写输入题目，不回答题目。

目标：每道题必须像真实互联网公司面试官自然提出的问题，语言通顺、技术前提成立、边界明确，并能区分候选人的真实能力。

硬性规则：
- 一条输入对应一条输出，id 必须原样返回，不能合并、拆分、遗漏或改变考察主题。
- 去掉套话、拼接痕迹、重复要求和生硬的名词罗列；不要复用统一句式。
- 每道题只保留一个主要问题和一个连贯场景。若原题把多个互不依赖的使用场景拼在一起，选择其中最适合该题型和难度的一个，不要继续捆绑。
- 不凭空声称某项技术具有不存在的能力，不发明 API、论文、产品、指标、公司实践或故障结论。
- 如果原题前提可能不成立，改写为要求候选人辨析前提、比较方案或给出验证方法，不能把可疑前提继续写成事实。
- 场景题要交代足以作答的现象、约束或目标；故障题不能预设未经证实的根因；设计题要体现规模、可靠性、成本或演进约束中的至少一项。
- 校招题重视基本原理和推理；社招题重视工程取舍、排障证据和生产边界。保持原 audiences、difficulty、questionType 所代表的层级。
- 输出前在内部逐条复核术语、技术前提、因果关系、信息充分性和面试价值，只返回复核后的最终题干，不输出复核过程。
- 不输出答案、提示、来源、URL、公司归属、编辑说明或 Markdown 代码围栏。
- 输出严格 JSON：{"items":[{"id":"...","prompt":"..."}]}。`,
        },
        {
          role: "user",
          content: JSON.stringify({
            items: items.map(
              ({
                id,
                trackId,
                topicLabel,
                prompt,
                questionType,
                difficulty,
                audiences,
                tags,
              }) => ({
                id,
                trackId,
                topicLabel,
                prompt,
                questionType,
                difficulty,
                audiences,
                tags,
                auditHints: [
                  ...(getPromptScienceRisk(prompt)
                    ? [getPromptScienceRisk(prompt)]
                    : []),
                  ...(isKnownGeneratedTemplate(prompt)
                    ? ["generated-template"]
                    : []),
                ],
              })
            ),
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      await new Promise(resolve => setTimeout(resolve, 750 * 2 ** attempt));
      return rewriteBatch(items, attempt + 1);
    }
    throw new Error(
      `Model rewrite failed (${response.status}): ${detail.slice(0, 1_000)}`
    );
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string")
    throw new Error("Model returned no JSON content");
  const parsed = extractJson(content);
  return Array.isArray(parsed) ? parsed : parsed.items;
}

async function reviewBatch(inputs, rewrites, attempt = 1) {
  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: reviewModel,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `你是独立于改写者的技术题库审稿人。检查每道改写题的技术前提、术语、因果关系、信息充分性和面试价值，并直接给出最终题干。

规则：
- id 原样返回，每条输入必须恰好输出一条，不改变主题、难度和目标人群。
- 修正虚假前提、过度绝对的结论、不存在的 API 或能力；不确定的前提必须改成让候选人验证或辨析的开放问题。
- 故障现象与根因要分开；不能从单一现象武断推出根因。
- 避免模板套话、名词堆砌、多题捆绑和答案暗示。
- 一道题只考察一个连贯的工程场景；发现原题混合互不相关的场景时，保留一个并删除其余场景。
- 不添加无法从输入确认的公司、产品实践、性能数字、论文结论或版本事实。
- 不输出答案、来源、解释或 Markdown。
- 输出严格 JSON：{"items":[{"id":"...","prompt":"..."}]}。`,
        },
        {
          role: "user",
          content: JSON.stringify({
            items: inputs.map((input, index) => ({
              id: input.id,
              trackId: input.trackId,
              topicLabel: input.topicLabel,
              questionType: input.questionType,
              difficulty: input.difficulty,
              audiences: input.audiences,
              originalPrompt: input.prompt,
              rewrittenPrompt: rewrites[index].prompt,
              auditHints: [
                ...(getPromptScienceRisk(input.prompt)
                  ? [getPromptScienceRisk(input.prompt)]
                  : []),
                ...(isKnownGeneratedTemplate(input.prompt)
                  ? ["generated-template"]
                  : []),
              ],
            })),
          }),
        },
      ],
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      await new Promise(resolve => setTimeout(resolve, 750 * 2 ** attempt));
      return reviewBatch(inputs, rewrites, attempt + 1);
    }
    throw new Error(
      `Model review failed (${response.status}): ${detail.slice(0, 1_000)}`
    );
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string")
    throw new Error("Review model returned no JSON content");
  const parsed = extractJson(content);
  return Array.isArray(parsed) ? parsed : parsed.items;
}

function validateBatch(inputs, outputs) {
  if (!Array.isArray(outputs))
    throw new Error("Model output items must be an array");
  if (outputs.length !== inputs.length) {
    throw new Error(`Model returned ${outputs.length}/${inputs.length} items`);
  }
  const inputById = new Map(inputs.map(item => [item.id, item]));
  const seen = new Set();
  return outputs.map(output => {
    const original = inputById.get(output?.id);
    if (!original || seen.has(output.id))
      throw new Error(`Unexpected or duplicate id: ${output?.id}`);
    seen.add(output.id);
    const normalized = {
      id: output.id,
      prompt: String(output.prompt ?? "").trim(),
    };
    const rejection = getRewriteRejection(original, normalized);
    if (rejection) throw new Error(`${output.id}: ${rejection}`);
    return normalized;
  });
}

async function produceReviewedBatch(items, attempt = 1) {
  try {
    const draft = validateBatch(items, await rewriteBatch(items));
    if (singlePass) return draft;
    return validateBatch(items, await reviewBatch(items, draft));
  } catch (error) {
    if (attempt < 3) {
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
      return produceReviewedBatch(items, attempt + 1);
    }
    throw error;
  }
}

async function checkpoint(state, sourceManifest) {
  const payload = {
    schemaVersion: 1,
    contentVersion: sourceManifest.contentVersion,
    sourceTracks: sourceManifest.tracks,
    model,
    reviewMode: singlePass ? "inline" : "independent",
    updatedAt: new Date().toISOString(),
    items: state.items,
    rejected: state.rejected,
  };
  const temporaryPath = `${outputPath}.tmp`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`);
  await rename(temporaryPath, outputPath);
}

const state = await readExisting();
const currentManifest = await readJson(manifestPath);
const sourceManifest = state.sourceTracks
  ? { contentVersion: state.contentVersion, tracks: state.sourceTracks }
  : currentManifest;
const published = await readPublishedQuestions(sourceManifest);
const completedIds = new Set([...state.items.map(item => item.id)]);
const publishedIds = new Set(published.map(item => item.id));
const unknownRedoIds = [...redoIds].filter(id => !publishedIds.has(id));
if (unknownRedoIds.length) {
  throw new Error(`Unknown --redo ids: ${unknownRedoIds.join(", ")}`);
}
const scopedPublished = redoIds.size
  ? published.filter(item => redoIds.has(item.id))
  : published;
const pending = scopedPublished
  .filter(item => redoIds.has(item.id) || !completedIds.has(item.id))
  .slice(0, limit);

if (checkOnly) {
  const scienceRiskCounts = {};
  let generatedTemplateQuestions = 0;
  for (const question of pending) {
    const scienceRisk = getPromptScienceRisk(question.prompt);
    if (scienceRisk) {
      scienceRiskCounts[scienceRisk] =
        (scienceRiskCounts[scienceRisk] ?? 0) + 1;
    }
    if (isKnownGeneratedTemplate(question.prompt)) {
      generatedTemplateQuestions += 1;
    }
  }
  console.log(
    JSON.stringify(
      {
        sourceContentVersion: sourceManifest.contentVersion,
        selectedTrack: selectedTrack ?? "all",
        publishedQuestions: published.length,
        completedRewrites: state.items.length,
        rejectedLastRun: state.rejected.length,
        pendingQuestions: pending.length,
        estimatedModelCalls:
          Math.ceil(pending.length / batchSize) * (singlePass ? 1 : 2),
        concurrency,
        reviewMode: singlePass ? "inline" : "independent",
        generatedTemplateQuestions,
        scienceRiskCounts,
      },
      null,
      2
    )
  );
} else {
  if (!apiKey) {
    throw new Error(
      "DEVRUSHER_CONTENT_API_KEY is required in .env or .env.local"
    );
  }

  const batches = [];
  for (let index = 0; index < pending.length; index += batchSize) {
    batches.push({
      number: index / batchSize + 1,
      items: pending.slice(index, index + batchSize),
    });
  }

  let nextBatchIndex = 0;
  let completedBatches = 0;
  let processedQuestions = 0;
  let checkpointQueue = Promise.resolve();

  function scheduleCheckpoint() {
    checkpointQueue = checkpointQueue.then(() =>
      checkpoint(state, sourceManifest)
    );
    return checkpointQueue;
  }

  async function runWorker() {
    while (true) {
      const batchIndex = nextBatchIndex;
      nextBatchIndex += 1;
      const batch = batches[batchIndex];
      if (!batch) return;

      let result;
      try {
        const rewrites = await produceReviewedBatch(batch.items);
        result = { ...batch, rewrites };
      } catch (error) {
        result = { ...batch, error };
      }

      const resultIds = new Set(result.items.map(item => item.id));
      state.rejected = state.rejected.filter(item => !resultIds.has(item.id));
      if (result.error) {
        state.rejected.push(
          ...result.items.map(item => ({
            id: item.id,
            reason: String(result.error?.message ?? result.error),
          }))
        );
        console.error(
          `Rejected batch ${result.number}: ${result.error?.message ?? result.error}`
        );
      } else {
        state.items = state.items.filter(item => !resultIds.has(item.id));
        state.items.push(...result.rewrites);
      }

      completedBatches += 1;
      processedQuestions += batch.items.length;
      if (
        completedBatches % concurrency === 0 ||
        completedBatches === batches.length
      ) {
        const reportedProcessed = processedQuestions;
        await scheduleCheckpoint();
        console.log(
          `Processed ${reportedProcessed}/${pending.length}; total ${state.items.length}/${published.length}, rejected ${state.rejected.length}.`
        );
      }
    }
  }

  const workerCount = Math.min(concurrency, batches.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  await checkpointQueue;

  console.log(
    `Checkpoint contains ${state.items.length} rewrites and ${state.rejected.length} rejected inputs at content/work/rewrites.json.`
  );
}
