import {
  getRecord,
  localStores,
  putRecord,
} from "@/modules/local-data/infrastructure/database";
import type { AnalysisMode, AnalysisPromptId } from "../domain/prompt-presets";
import type { ReasoningEffort } from "@/modules/ai/domain/settings";

export interface CachedAnalysisResult {
  promptId: AnalysisPromptId;
  model: string;
  content: string;
}

export interface CachedQuestionAnalysis {
  id: string;
  questionId: string;
  mode: AnalysisMode;
  createdAt: string;
  results: CachedAnalysisResult[];
}

export interface AnalysisCacheRequest {
  promptId: AnalysisPromptId;
  model: string;
  reasoningEffort: ReasoningEffort;
  systemPrompt: string;
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export function createAnalysisCacheId(input: {
  questionId: string;
  analysisInput: string;
  mode: AnalysisMode;
  requests: readonly AnalysisCacheRequest[];
}): Promise<string> {
  const canonicalInput = {
    questionId: input.questionId,
    analysisInput: input.analysisInput,
    mode: input.mode,
    requests: [...input.requests].sort((left, right) =>
      left.promptId.localeCompare(right.promptId)
    ),
  };
  return digest(JSON.stringify(canonicalInput)).then(
    hash => `analysis:${hash}`
  );
}

export function getCachedQuestionAnalysis(
  id: string
): Promise<CachedQuestionAnalysis | undefined> {
  return getRecord<CachedQuestionAnalysis>(localStores.questionAnalyses, id);
}

export async function getReusableCachedQuestionAnalysis(input: {
  questionId: string;
  analysisInput: string;
  mode: AnalysisMode;
  requests: readonly AnalysisCacheRequest[];
  superRequests: readonly AnalysisCacheRequest[];
}): Promise<CachedQuestionAnalysis | undefined> {
  const exactId = await createAnalysisCacheId(input);
  const exact = await getCachedQuestionAnalysis(exactId);
  if (exact) return exact;

  if (input.mode === "super") return undefined;

  const superId = await createAnalysisCacheId({
    questionId: input.questionId,
    analysisInput: input.analysisInput,
    mode: "super",
    requests: input.superRequests,
  });
  const superCache = await getCachedQuestionAnalysis(superId);
  const request = input.requests[0];
  const reusable = superCache?.results.find(
    result => result.promptId === input.mode && result.model === request?.model
  );
  if (!superCache || !reusable) return undefined;

  return {
    id: exactId,
    questionId: input.questionId,
    mode: input.mode,
    createdAt: superCache.createdAt,
    results: [reusable],
  };
}

export function saveCachedQuestionAnalysis(
  value: CachedQuestionAnalysis
): Promise<void> {
  return putRecord(localStores.questionAnalyses, value);
}
