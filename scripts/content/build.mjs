import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getPromptQualityRejection,
  normalizePublishedPrompt,
} from "./prompt-quality.mjs";
import {
  getCanonicalTopic,
  normalizeTopic,
  topicTaxonomy,
} from "./topic-taxonomy.mjs";
import {
  assertTechnologyBaseline,
  getTechnologyCoverage,
  technologyBaselineReviewedAt,
} from "./technology-baseline.mjs";
import { getRewriteRejection } from "./rewrite-quality.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const trackIds = [
  "fundamentals",
  "frontend",
  "backend",
  "mobile",
  "quality",
  "platform",
  "llm-algorithm",
  "agent-evaluation",
  "agent-engineering",
];
const audiences = new Set(["campus", "experienced"]);
const questionTypes = new Set([
  "concept",
  "comparison",
  "coding",
  "practical",
  "scenario",
  "system-design",
  "debugging",
  "testing",
  "operations",
  "behavioral",
]);
const forbiddenPublishedKeys = /source|provenance|license|author|origin|url/i;
const checkOnly = process.argv.includes("--check");
const releaseCheck = process.argv.includes("--release");
const curriculumTrackIds = new Set(trackIds);
const requiredCurriculumQuestionTypes = [
  "concept",
  "comparison",
  "practical",
  "scenario",
  "system-design",
  "debugging",
  "testing",
  "operations",
];

const topicIds = {
  数据结构与算法: "algorithms",
  数据库: "database",
  计算机网络: "networking",
  操作系统: "operating-systems",
  设计模式: "design-patterns",
  后端开发: "backend-development",
  NodeJS框架原理与源码分析: "nodejs",
  JavaScript: "javascript",
  Typescript: "typescript",
  HTML: "html",
  CSS: "css",
  Vue框架原理与源码分析: "vue",
  React框架原理与源码分析: "react",
  浏览器原理与源码分析: "browser",
  前端工具链和工程化: "frontend-tooling",
  性能与安全: "performance-security",
  小程序与跨端开发: "cross-platform",
  前端测试: "frontend-testing",
  编程题: "coding",
  项目和团队管理: "project-leadership",
  个人: "career",
  成绩或学历: "education",
  其它: "other",
};

const frontendTopics = new Set([
  "JavaScript",
  "Typescript",
  "HTML",
  "CSS",
  "Vue框架原理与源码分析",
  "React框架原理与源码分析",
  "浏览器原理与源码分析",
  "前端工具链和工程化",
  "性能与安全",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function classifyTrack(topic) {
  if (topic === "小程序与跨端开发") return "mobile";
  if (topic === "前端测试") return "quality";
  if (topic === "后端开发" || topic === "NodeJS框架原理与源码分析") {
    return "backend";
  }
  if (frontendTopics.has(topic)) return "frontend";
  return "fundamentals";
}

function normalizeForDuplicate(value) {
  return value
    .trim()
    .toLocaleLowerCase("zh-CN")
    .replace(/^(请问|请说明|请介绍|介绍一下|说一下|谈谈|简述|如何理解)/, "")
    .replace(/[\s，。！？、；：,.!?;:()（）【】\[\]"'“”‘’]/g, "");
}

function slug(value) {
  const ascii = value
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return ascii || `topic-${sha256(value).slice(0, 10)}`;
}

function inferQuestionType(prompt, topicLabel) {
  if (
    /个人|团队|项目|管理|职业|离职|冲突/.test(topicLabel) ||
    /你的项目|团队协作|职业规划|为什么选择/.test(prompt)
  ) {
    return "behavioral";
  }
  if (/手写|实现|编程|代码|伪代码|算法题/.test(prompt)) return "coding";
  if (/系统设计|架构|设计一个|如何设计/.test(prompt)) return "system-design";
  if (/排查|定位|故障|根因|异常/.test(prompt)) return "debugging";
  if (/区别|对比|异同|相比|差异/.test(prompt)) return "comparison";
  if (/测试|验证|用例|质量/.test(prompt)) return "testing";
  if (/部署|监控|告警|运维|上线|容量|发布/.test(prompt)) {
    return "operations";
  }
  if (/如果|假设|场景|你会如何|怎么办/.test(prompt)) return "scenario";
  return "concept";
}

function normalizeQuestion(raw, kind) {
  const prompt = normalizePublishedPrompt(
    raw.prompt ?? raw.question ?? raw.q ?? ""
  );
  const topicLabel = String(
    raw.topicLabel ?? raw.topic ?? raw.t ?? "其它"
  ).trim();
  const requestedTrack = raw.trackId ?? raw.track;
  const trackId = trackIds.includes(requestedTrack)
    ? requestedTrack
    : classifyTrack(topicLabel);
  const difficulty = Math.max(
    1,
    Math.min(5, Math.round(Number(raw.difficulty ?? raw.d ?? 3) || 3))
  );
  const rawAudiences = Array.isArray(raw.audiences)
    ? raw.audiences
    : String(raw.l ?? raw.interviewStage ?? "").includes("社招")
      ? ["experienced"]
      : ["campus", "experienced"];
  const normalizedAudiences = [
    ...new Set(rawAudiences.filter(value => audiences.has(value))),
  ];
  const rawId = raw.id ?? raw.i;
  const id = rawId
    ? `${kind === "legacy" ? "legacy:" : ""}${String(rawId)}`
    : `question:${sha256(`${trackId}:${prompt}`).slice(0, 16)}`;
  const interviewStage = String(raw.interviewStage ?? raw.l ?? "").trim();
  const company = String(raw.company ?? raw.c ?? "").trim();
  const collectedAt = String(raw.collectedAt ?? raw.m ?? "").trim();
  const requestedQuestionType = String(raw.questionType ?? "").trim();
  const questionType = questionTypes.has(requestedQuestionType)
    ? requestedQuestionType
    : inferQuestionType(prompt, topicLabel);
  const tags = Array.isArray(raw.tags)
    ? [
        ...new Set(raw.tags.map(value => String(value).trim()).filter(Boolean)),
      ].slice(0, 12)
    : [];

  return {
    id,
    trackId,
    topicId: String(raw.topicId ?? topicIds[topicLabel] ?? slug(topicLabel)),
    topicLabel,
    prompt,
    questionType,
    difficulty,
    audiences: normalizedAudiences.length
      ? normalizedAudiences
      : ["campus", "experienced"],
    tags,
    ...(interviewStage ? { interviewStage } : {}),
    ...(company ? { company } : {}),
    ...(collectedAt ? { collectedAt } : {}),
  };
}

function validateQuestion(question) {
  if (!question.id) return "missing-id";
  if (!question.prompt || question.prompt.length < 6) return "prompt-too-short";
  if (question.prompt.length > 1_000) return "prompt-too-long";
  if (/https?:\/\/|www\.|来源\s*[:：]/i.test(question.prompt)) {
    return "source-leak-in-prompt";
  }
  const qualityRejection = getPromptQualityRejection(question.prompt);
  if (qualityRejection) return qualityRejection;
  if (!trackIds.includes(question.trackId)) return "invalid-track";
  if (!question.topicLabel || !question.topicId) return "missing-topic";
  if (!questionTypes.has(question.questionType)) return "invalid-question-type";
  if (
    !Number.isInteger(question.difficulty) ||
    question.difficulty < 1 ||
    question.difficulty > 5
  ) {
    return "invalid-difficulty";
  }
  if (
    !Array.isArray(question.audiences) ||
    !question.audiences.length ||
    question.audiences.some(value => !audiences.has(value))
  ) {
    return "invalid-audience";
  }
  if (!Array.isArray(question.tags) || question.tags.length > 12) {
    return "invalid-tags";
  }
  return undefined;
}

function countBy(items, getKey) {
  const counts = {};
  for (const item of items) {
    const keys = getKey(item);
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

function assertUniqueTopicLabels(pack, trackId) {
  const topicIdByLabel = new Map();

  for (const question of pack) {
    const existingId = topicIdByLabel.get(question.topicLabel);
    if (existingId && existingId !== question.topicId) {
      throw new Error(
        `${trackId}: topic label "${question.topicLabel}" uses both "${existingId}" and "${question.topicId}"`
      );
    }
    topicIdByLabel.set(question.topicLabel, question.topicId);
  }
}

function assertCanonicalTopics(pack, trackId) {
  const seenTopicIds = new Set();

  for (const question of pack) {
    const topic = getCanonicalTopic(trackId, question.topicId);
    if (!topic) {
      throw new Error(`${trackId}: unmapped topic "${question.topicId}"`);
    }
    if (question.topicLabel !== topic.label) {
      throw new Error(
        `${trackId}: topic "${question.topicId}" must use label "${topic.label}"`
      );
    }
    seenTopicIds.add(question.topicId);
  }

  const maximum = topicTaxonomy[trackId].length;
  if (seenTopicIds.size > maximum) {
    throw new Error(`${trackId}: topics ${seenTopicIds.size}/${maximum}`);
  }
  return seenTopicIds.size;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readOptionalCleanedItems() {
  const path = join(root, "content/work/cleaned.json");
  try {
    const value = await readJson(path);
    return Array.isArray(value) ? value : (value.items ?? []);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function readOptionalRewrites() {
  const path = join(root, "content/work/rewrites.json");
  try {
    const value = await readJson(path);
    return Array.isArray(value) ? value : (value.items ?? []);
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function assertNoForbiddenKeys(value, path = "root") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoForbiddenKeys(item, `${path}[${index}]`)
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenPublishedKeys.test(key)) {
      throw new Error(`Forbidden provenance field ${path}.${key}`);
    }
    assertNoForbiddenKeys(child, `${path}.${key}`);
  }
}

async function verifyPublishedContent() {
  const manifestPath = join(root, "public/content/manifest.json");
  const manifest = await readJson(manifestPath);
  const seenIds = new Set();
  const releaseDeficits = [];
  let total = 0;

  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.tracks)) {
    throw new Error("Invalid content manifest");
  }

  for (const track of manifest.tracks) {
    const packPath = join(root, "public", track.file.replace(/^\//, ""));
    const serialized = await readFile(packPath, "utf8");
    const pack = JSON.parse(serialized);
    assertNoForbiddenKeys(pack, track.id);

    if (!Array.isArray(pack) || pack.length !== track.count) {
      throw new Error(`Count mismatch for ${track.id}`);
    }
    if (sha256(serialized) !== track.checksum) {
      throw new Error(`Checksum mismatch for ${track.id}`);
    }
    assertUniqueTopicLabels(pack, track.id);
    const topicCount = assertCanonicalTopics(pack, track.id);
    assertTechnologyBaseline(pack, track.id);
    if (track.topicCount !== topicCount) {
      throw new Error(`Topic count mismatch for ${track.id}`);
    }
    if (releaseCheck && pack.length < manifest.targets.launchPerTrack) {
      releaseDeficits.push(
        `${track.id}: ${pack.length}/${manifest.targets.launchPerTrack}`
      );
    }

    if (releaseCheck && curriculumTrackIds.has(track.id)) {
      const curriculumItems = pack.filter(question =>
        question.id.startsWith(`curriculum:v1:${track.id}:`)
      );
      const typeCounts = countBy(
        curriculumItems,
        question => question.questionType
      );
      const topicCount = new Set(
        curriculumItems.map(question => question.topicId)
      ).size;
      const difficultyCount = new Set(
        curriculumItems.map(question => question.difficulty)
      ).size;

      if (curriculumItems.length < 1_000) {
        releaseDeficits.push(
          `${track.id}: curated ${curriculumItems.length}/1000`
        );
      }
      const requiredTopicCount = Math.max(
        1,
        topicTaxonomy[track.id].length - 1
      );
      if (topicCount < requiredTopicCount) {
        releaseDeficits.push(
          `${track.id}: topics ${topicCount}/${requiredTopicCount}`
        );
      }
      if (difficultyCount < 5) {
        releaseDeficits.push(
          `${track.id}: difficulty levels ${difficultyCount}/5`
        );
      }
      for (const questionType of requiredCurriculumQuestionTypes) {
        if ((typeCounts[questionType] ?? 0) < 80) {
          releaseDeficits.push(
            `${track.id}: ${questionType} ${typeCounts[questionType] ?? 0}/80`
          );
        }
      }
    }

    for (const question of pack) {
      const rejection = validateQuestion(question);
      if (rejection) throw new Error(`${question.id}: ${rejection}`);
      if (question.trackId !== track.id) {
        throw new Error(`${question.id}: wrong pack`);
      }
      if (seenIds.has(question.id))
        throw new Error(`Duplicate id ${question.id}`);
      seenIds.add(question.id);
    }
    total += pack.length;
  }

  if (total !== manifest.totalQuestions)
    throw new Error("Manifest total mismatch");
  if (releaseDeficits.length > 0) {
    throw new Error(
      `Launch content is incomplete: ${releaseDeficits.join(", ")}`
    );
  }
  console.log(
    `Content check passed: ${total.toLocaleString("en-US")} questions, ${manifest.tracks.length} tracks.`
  );
}

async function buildContent() {
  let generateInitialCurriculum;
  try {
    ({ generateInitialCurriculum } =
      await import("../../content/curricula/generate.mjs"));
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error(
        "缺少本地题集过程数据 content/curricula；该目录不会提交到 Git。"
      );
    }
    throw error;
  }

  const curriculum = generateInitialCurriculum();
  const [legacy, starter, cleaned, rewrites] = await Promise.all([
    readJson(join(root, "content/seeds/ferusher-legacy.json")),
    readJson(join(root, "content/seeds/starter.json")),
    readOptionalCleanedItems(),
    readOptionalRewrites(),
  ]);
  const inputs = [
    ...legacy.map(item => ({ raw: item, kind: "legacy" })),
    ...starter.map(item => ({ raw: item, kind: "starter" })),
    ...curriculum.map(item => ({ raw: item, kind: "curriculum" })),
    ...cleaned.map(item => ({ raw: item, kind: "cleaned" })),
  ];
  const accepted = new Map();
  const rejected = new Map();
  const rejectionDetails = [];
  const rewriteById = new Map(rewrites.map(item => [item.id, item]));
  const appliedRewriteIds = new Set();
  let duplicates = 0;
  const duplicateDetails = [];

  for (const input of inputs) {
    const normalized = normalizeQuestion(input.raw, input.kind);
    const rewrite = rewriteById.get(normalized.id);
    const rewriteRejection = rewrite
      ? getRewriteRejection(normalized, rewrite)
      : undefined;
    if (rewriteRejection) {
      rejected.set(
        `rewrite-${rewriteRejection}`,
        (rejected.get(`rewrite-${rewriteRejection}`) ?? 0) + 1
      );
      rejectionDetails.push({
        id: normalized.id,
        reason: `rewrite-${rewriteRejection}`,
      });
      continue;
    }
    const question = rewrite
      ? { ...normalized, prompt: normalizePublishedPrompt(rewrite.prompt) }
      : normalized;
    if (rewrite) appliedRewriteIds.add(normalized.id);
    const rejection = validateQuestion(question);
    if (rejection) {
      rejected.set(rejection, (rejected.get(rejection) ?? 0) + 1);
      rejectionDetails.push({ id: question.id, reason: rejection });
      continue;
    }
    const duplicateKey = normalizeForDuplicate(question.prompt);
    if (accepted.has(duplicateKey)) {
      duplicates += 1;
      duplicateDetails.push({
        keptId: accepted.get(duplicateKey).id,
        rejectedId: question.id,
      });
      continue;
    }
    accepted.set(duplicateKey, question);
  }

  const normalizedTopics = [...accepted.values()].map(normalizeTopic);
  const packArtifacts = [];
  const trimmedForStableLimit = {};

  for (const trackId of trackIds) {
    const candidates = normalizedTopics
      .filter(question => question.trackId === trackId)
      .sort((left, right) => {
        const rewritePriority =
          Number(appliedRewriteIds.has(right.id)) -
          Number(appliedRewriteIds.has(left.id));
        if (rewritePriority !== 0) return rewritePriority;
        return String(right.collectedAt ?? "").localeCompare(
          String(left.collectedAt ?? "")
        );
      });
    const pack = candidates.slice(0, 5_000);
    assertUniqueTopicLabels(pack, trackId);
    assertCanonicalTopics(pack, trackId);
    assertTechnologyBaseline(pack, trackId);
    if (candidates.length > pack.length) {
      trimmedForStableLimit[trackId] = candidates.length - pack.length;
    }
    const serialized = JSON.stringify(pack);
    packArtifacts.push({
      id: trackId,
      count: pack.length,
      serialized,
      checksum: sha256(serialized),
      launchReady: pack.length >= 2_000,
      topicCount: new Set(pack.map(question => question.topicId)).size,
      rewrittenCount: pack.filter(question =>
        appliedRewriteIds.has(question.id)
      ).length,
      stats: {
        curriculumCount: pack.filter(question =>
          question.id.startsWith(`curriculum:v1:${trackId}:`)
        ).length,
        questionTypes: countBy(pack, question => question.questionType),
        difficulties: countBy(pack, question => String(question.difficulty)),
        audiences: countBy(pack, question => question.audiences),
        technologyCoverage: getTechnologyCoverage(pack, trackId).map(
          ({ officialSources: _officialSources, ...coverage }) => coverage
        ),
      },
    });
  }

  const contentHash = sha256(
    packArtifacts.map(artifact => artifact.serialized).join("\n")
  );
  const contentVersion = `v1-${contentHash.slice(0, 12)}`;
  const outputDirectory = join(root, "public/content/packs", contentVersion);
  await mkdir(outputDirectory, { recursive: true });
  const tracks = packArtifacts.map(
    ({ serialized: _serialized, stats: _stats, ...artifact }) => ({
      ...artifact,
      file: `/content/packs/${contentVersion}/${artifact.id}.json`,
    })
  );

  await Promise.all(
    packArtifacts.map(artifact =>
      writeFile(
        join(outputDirectory, `${artifact.id}.json`),
        artifact.serialized
      )
    )
  );

  const manifest = {
    schemaVersion: 1,
    contentVersion,
    generatedAt: new Date().toISOString(),
    totalQuestions: tracks.reduce((sum, track) => sum + track.count, 0),
    targets: {
      launchPerTrack: 2_000,
      stableMinPerTrack: 3_000,
      stableMaxPerTrack: 5_000,
      monthlyRefreshMin: 100,
      monthlyRefreshMax: 300,
    },
    tracks,
  };
  const report = {
    schemaVersion: 1,
    technologyBaselineReviewedAt,
    contentVersion: manifest.contentVersion,
    inputCounts: {
      legacy: legacy.length,
      starter: starter.length,
      curriculum: curriculum.length,
      cleaned: cleaned.length,
      rewrites: rewrites.length,
      appliedRewrites: appliedRewriteIds.size,
      orphanedRewrites: rewrites.length - appliedRewriteIds.size,
    },
    accepted: manifest.totalQuestions,
    duplicateRejections: duplicates,
    duplicateDetails,
    trimmedForStableLimit,
    otherRejections: Object.fromEntries(rejected),
    rejectionDetails,
    tracks: packArtifacts.map(artifact => ({
      id: artifact.id,
      count: artifact.count,
      launchReady: artifact.launchReady,
      topicCount: artifact.topicCount,
      ...artifact.stats,
    })),
  };

  await mkdir(join(root, "public/content"), { recursive: true });
  await mkdir(join(root, "content/reports"), { recursive: true });
  await Promise.all([
    writeFile(
      join(root, "public/content/manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`
    ),
    writeFile(
      join(root, "content/reports/latest.json"),
      `${JSON.stringify(report, null, 2)}\n`
    ),
  ]);
  console.log(
    `Published ${manifest.totalQuestions.toLocaleString("en-US")} questions; rejected ${duplicates} duplicates.`
  );
}

if (checkOnly) {
  await verifyPublishedContent();
} else {
  await buildContent();
  await verifyPublishedContent();
}
