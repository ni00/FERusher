import { z } from "zod";
import {
  analysisPromptIds,
  defaultAnalysisModels,
  defaultAnalysisPrompts,
} from "@/modules/question-analysis/domain/prompt-presets";

const analysisPromptsSchema = z.object(
  Object.fromEntries(
    analysisPromptIds.map(id => [id, z.string().trim().min(1)])
  ) as Record<(typeof analysisPromptIds)[number], z.ZodString>
);

const analysisModelsSchema = z.object(
  Object.fromEntries(
    analysisPromptIds.map(id => [id, z.string().trim().min(1)])
  ) as Record<(typeof analysisPromptIds)[number], z.ZodString>
);

export const reasoningEfforts = [
  "auto",
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;
export type ReasoningEffort = (typeof reasoningEfforts)[number];
const reasoningEffortSchema = z.enum(reasoningEfforts);
const defaultAnalysisReasoningEfforts = Object.fromEntries(
  analysisPromptIds.map(id => [id, "auto"])
) as Record<(typeof analysisPromptIds)[number], ReasoningEffort>;
const analysisReasoningEffortsSchema = z.object(
  Object.fromEntries(
    analysisPromptIds.map(id => [id, reasoningEffortSchema])
  ) as Record<(typeof analysisPromptIds)[number], typeof reasoningEffortSchema>
);

const analysisPromptOrderSchema = z
  .array(z.enum(analysisPromptIds))
  .length(analysisPromptIds.length)
  .refine(order => new Set(order).size === analysisPromptIds.length, {
    message: "解析 Prompt 顺序不能重复",
  });

export const aiSettingsSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().url(),
  requiresApiKey: z.boolean(),
  streamResponse: z.boolean(),
  model: z.string().trim().min(1),
  reasoningEffort: reasoningEffortSchema.default("auto"),
  systemPrompt: z.string().trim().min(1),
  defaultAnalysisPrompt: z.enum(analysisPromptIds),
  superModeByDefault: z.boolean(),
  analysisPromptOrder: analysisPromptOrderSchema,
  analysisPrompts: analysisPromptsSchema,
  analysisModels: analysisModelsSchema,
  analysisReasoningEfforts: analysisReasoningEffortsSchema.default(
    defaultAnalysisReasoningEfforts
  ),
});

export type AiSettings = z.infer<typeof aiSettingsSchema>;

export const defaultAiSettings: AiSettings = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  requiresApiKey: true,
  streamResponse: true,
  model: "gpt-5-mini",
  reasoningEffort: "auto",
  defaultAnalysisPrompt: "coach",
  superModeByDefault: false,
  analysisPromptOrder: [...analysisPromptIds],
  analysisPrompts: defaultAnalysisPrompts,
  analysisModels: defaultAnalysisModels,
  analysisReasoningEfforts: defaultAnalysisReasoningEfforts,
  systemPrompt: `你是 DevRusher 的资深技术面试官。根据候选人的目标方向和经历，以真实面试节奏提出清晰、可验证的问题。

规则：
1. 一次只问一个问题，等待候选人回答后再追问。
2. 追问必须基于候选人的上一条回答，不要机械输出题库。
3. 区分事实错误、表达缺口和工程权衡，并给出简洁反馈。
4. 不虚构候选人的项目、公司经历或题目的公司来源。
5. 使用简体中文；必要的技术名词保留英文。`,
};

export function isAiEndpointReady(
  settings: Pick<AiSettings, "apiKey" | "requiresApiKey">
): boolean {
  return !settings.requiresApiKey || Boolean(settings.apiKey.trim());
}
