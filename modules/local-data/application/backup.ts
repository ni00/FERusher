import { z } from "zod";
import { aiSettingsSchema } from "@/modules/ai/domain/settings";
import {
  getAiSettings,
  saveAiSettings,
} from "@/modules/ai/infrastructure/settings-repository";
import { trackIds } from "@/modules/catalog/domain/question";
import {
  clearStore,
  getAllRecords,
  localStores,
  replaceRecords,
} from "../infrastructure/database";

const progressRecordSchema = z.object({
  questionId: z.string().min(1),
  status: z.enum(["unseen", "learning", "mastered"]),
  favorite: z.boolean(),
  attempts: z.number().int().nonnegative(),
  intervalDays: z.number().int().nonnegative(),
  lastReviewedAt: z.string().optional(),
  nextReviewAt: z.string().optional(),
  updatedAt: z.string(),
});

const reviewEventSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  rating: z.enum(["again", "learning", "mastered"]),
  reviewedAt: z.string(),
});

const learningPlanSchema = z.object({
  id: z.literal("active"),
  durationDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  dailyTarget: z.number().int().min(1).max(100),
  trackIds: z.array(z.enum(trackIds)).min(1),
  startDate: z.string(),
  endDate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const interviewSessionSchema = z.object({
  id: z.string().min(1),
  trackId: z.enum(trackIds),
  role: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
});

const portableAiSettingsSchema = aiSettingsSchema.omit({ apiKey: true });

const localBackupSchema = z.object({
  schemaVersion: z.literal(7),
  exportedAt: z.string(),
  questionProgress: z.array(progressRecordSchema),
  reviewEvents: z.array(reviewEventSchema),
  learningPlans: z.array(learningPlanSchema),
  interviewSessions: z.array(interviewSessionSchema),
  aiSettings: portableAiSettingsSchema,
});

export type LocalBackup = z.infer<typeof localBackupSchema>;

export async function createLocalBackup(): Promise<LocalBackup> {
  const [
    questionProgress,
    reviewEvents,
    learningPlans,
    interviewSessions,
    aiSettings,
  ] = await Promise.all([
    getAllRecords<z.infer<typeof progressRecordSchema>>(
      localStores.questionProgress
    ),
    getAllRecords<z.infer<typeof reviewEventSchema>>(localStores.reviewEvents),
    getAllRecords<z.infer<typeof learningPlanSchema>>(
      localStores.learningPlans
    ),
    getAllRecords<z.infer<typeof interviewSessionSchema>>(
      localStores.interviewSessions
    ),
    getAiSettings(),
  ]);

  return {
    schemaVersion: 7,
    exportedAt: new Date().toISOString(),
    questionProgress,
    reviewEvents,
    learningPlans,
    interviewSessions,
    aiSettings: {
      baseUrl: aiSettings.baseUrl,
      requiresApiKey: aiSettings.requiresApiKey,
      streamResponse: aiSettings.streamResponse,
      model: aiSettings.model,
      reasoningEffort: aiSettings.reasoningEffort,
      systemPrompt: aiSettings.systemPrompt,
      defaultAnalysisPrompt: aiSettings.defaultAnalysisPrompt,
      superModeByDefault: aiSettings.superModeByDefault,
      analysisPromptOrder: aiSettings.analysisPromptOrder,
      analysisPrompts: aiSettings.analysisPrompts,
      analysisModels: aiSettings.analysisModels,
      analysisReasoningEfforts: aiSettings.analysisReasoningEfforts,
    },
  };
}

export async function restoreLocalBackup(input: unknown): Promise<void> {
  if (
    !input ||
    typeof input !== "object" ||
    Reflect.get(input, "schemaVersion") !== 7
  ) {
    throw new Error("仅支持当前备份格式（schemaVersion 7）");
  }
  const parsed = localBackupSchema.parse(input);
  const currentSettings = await getAiSettings();

  await Promise.all([
    replaceRecords(localStores.questionProgress, parsed.questionProgress),
    replaceRecords(localStores.reviewEvents, parsed.reviewEvents),
    replaceRecords(localStores.learningPlans, parsed.learningPlans),
    replaceRecords(localStores.interviewSessions, parsed.interviewSessions),
    saveAiSettings({
      ...parsed.aiSettings,
      apiKey: currentSettings.apiKey,
    }),
  ]);
}

export async function clearAllLocalData(): Promise<void> {
  await Promise.all(Object.values(localStores).map(store => clearStore(store)));
}
