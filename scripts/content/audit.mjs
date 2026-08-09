import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getPromptQualityRejection } from "./prompt-quality.mjs";
import {
  assertTechnologyBaseline,
  getTechnologyCoverage,
  technologyBaselineReviewedAt,
} from "./technology-baseline.mjs";
import {
  getPromptPremiseRisk,
  getPromptScienceRisk,
  getSkeletonConcentration,
  isKnownGeneratedTemplate,
} from "./rewrite-quality.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = JSON.parse(
  await readFile(join(root, "public/content/manifest.json"), "utf8")
);
const seenPrompts = new Map();
const failures = [];
const reports = [];
const allQuestions = [];
const strictLanguage = process.argv.includes("--strict-language");
let generatedTemplateQuestions = 0;
const scienceRiskCounts = {};

function normalizePrompt(value) {
  return value
    .trim()
    .toLocaleLowerCase("zh-CN")
    .replace(/^(请问|请说明|请介绍|介绍一下|说一下|谈谈|简述|如何理解)/, "")
    .replace(/[\s，。！？、；：,.!?;:()（）【】\[\]"'“”‘’]/g, "");
}

for (const track of manifest.tracks) {
  const pack = JSON.parse(
    await readFile(join(root, "public", track.file.replace(/^\//, "")), "utf8")
  );
  const sourceCounts = {};
  const difficultyCounts = {};
  const questionTypeCounts = {};
  allQuestions.push(...pack);

  for (const question of pack) {
    const source = question.id.split(":")[0];
    sourceCounts[source] = (sourceCounts[source] ?? 0) + 1;
    difficultyCounts[question.difficulty] =
      (difficultyCounts[question.difficulty] ?? 0) + 1;
    questionTypeCounts[question.questionType] =
      (questionTypeCounts[question.questionType] ?? 0) + 1;

    const qualityRisk = getPromptQualityRejection(question.prompt);
    if (qualityRisk) failures.push(`${question.id}: ${qualityRisk}`);
    const premiseRisk = getPromptPremiseRisk(question.prompt);
    if (premiseRisk) failures.push(`${question.id}: ${premiseRisk}`);
    const scienceRisk = getPromptScienceRisk(question.prompt);
    if (scienceRisk) {
      scienceRiskCounts[scienceRisk] =
        (scienceRiskCounts[scienceRisk] ?? 0) + 1;
    }
    if (strictLanguage && scienceRisk) {
      failures.push(`${question.id}: ${scienceRisk}`);
    }
    if (isKnownGeneratedTemplate(question.prompt)) {
      generatedTemplateQuestions += 1;
    }

    const duplicateKey = normalizePrompt(question.prompt);
    const duplicateId = seenPrompts.get(duplicateKey);
    if (duplicateId) {
      failures.push(`${question.id}: duplicates ${duplicateId}`);
    } else {
      seenPrompts.set(duplicateKey, question.id);
    }
  }

  if (Object.keys(difficultyCounts).length !== 5) {
    failures.push(`${track.id}: incomplete difficulty coverage`);
  }
  assertTechnologyBaseline(pack, track.id);
  reports.push({
    trackId: track.id,
    questions: pack.length,
    sourceCounts,
    difficultyCounts,
    questionTypeCounts,
    technologyCoverage: getTechnologyCoverage(pack, track.id).map(
      ({ officialSources: _officialSources, ...coverage }) => coverage
    ),
  });

  if (strictLanguage && track.rewrittenCount !== track.count) {
    failures.push(
      `${track.id}: rewritten ${track.rewrittenCount ?? 0}/${track.count}`
    );
  }
}

const skeletonConcentration = getSkeletonConcentration(allQuestions);
if (strictLanguage) {
  const mostRepeated = skeletonConcentration.top[0]?.count ?? 0;
  if (mostRepeated > 50) {
    failures.push(
      `language: one prompt skeleton is repeated ${mostRepeated} times (maximum 50)`
    );
  }
  if (skeletonConcentration.repeatedRatio > 0.2) {
    failures.push(
      `language: ${(skeletonConcentration.repeatedRatio * 100).toFixed(1)}% of questions use skeletons repeated at least 10 times (maximum 20%)`
    );
  }
  if (generatedTemplateQuestions > 0) {
    failures.push(
      `language: ${generatedTemplateQuestions} known generated-template questions remain`
    );
  }
}

if (failures.length) {
  throw new Error(
    `Content audit failed (${failures.length}):\n${failures
      .slice(0, 50)
      .join("\n")}`
  );
}

if (process.argv.includes("--report")) {
  console.log(
    JSON.stringify(
      {
        schemaVersion: 1,
        contentVersion: manifest.contentVersion,
        technologyBaselineReviewedAt,
        totalQuestions: manifest.totalQuestions,
        skeletonConcentration,
        generatedTemplateQuestions,
        scienceRiskCounts,
        reports,
      },
      null,
      2
    )
  );
}
console.log(
  `Content audit passed: ${manifest.totalQuestions.toLocaleString("en-US")} questions, ${reports.length} tracks; ${(skeletonConcentration.repeatedRatio * 100).toFixed(1)}% in repeated language skeletons.`
);
