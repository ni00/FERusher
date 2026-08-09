import { z } from "zod";
import {
  questionTypes,
  trackIds,
  type Question,
  type TrackId,
} from "../domain/question";

const questionSchema = z.object({
  id: z.string().min(1),
  trackId: z.enum(trackIds),
  topicId: z.string().min(1),
  topicLabel: z.string().min(1),
  prompt: z.string().min(6),
  questionType: z.enum(questionTypes),
  difficulty: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  audiences: z.array(z.enum(["campus", "experienced"])).min(1),
  tags: z.array(z.string()),
  interviewStage: z.string().optional(),
  company: z.string().optional(),
  collectedAt: z.string().optional(),
});

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: z.string().min(1),
  generatedAt: z.string(),
  totalQuestions: z.number().int().nonnegative(),
  targets: z.object({
    launchPerTrack: z.number().int().positive(),
    stableMinPerTrack: z.number().int().positive(),
    stableMaxPerTrack: z.number().int().positive(),
    monthlyRefreshMin: z.number().int().positive(),
    monthlyRefreshMax: z.number().int().positive(),
  }),
  tracks: z.array(
    z.object({
      id: z.enum(trackIds),
      count: z.number().int().nonnegative(),
      file: z.string().startsWith("/content/packs/"),
      checksum: z.string().length(64),
      launchReady: z.boolean(),
      topicCount: z.number().int().nonnegative(),
    })
  ),
});

export type ContentManifest = z.infer<typeof manifestSchema>;

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`内容加载失败（${response.status}）`);
  return response.json() as Promise<unknown>;
}

export async function loadContentManifest(
  signal?: AbortSignal
): Promise<ContentManifest> {
  const parsed = manifestSchema.safeParse(
    await fetchJson("/content/manifest.json", signal)
  );
  if (!parsed.success) throw new Error("内容清单不符合预期格式");
  return parsed.data;
}

export async function loadQuestionCatalog(
  signal?: AbortSignal,
  requestedTracks?: TrackId[]
): Promise<Question[]> {
  const manifest = await loadContentManifest(signal);
  const selected = requestedTracks?.length
    ? manifest.tracks.filter(track => requestedTracks.includes(track.id))
    : manifest.tracks;
  const packs = await Promise.all(
    selected.map(async track => {
      const parsed = z
        .array(questionSchema)
        .safeParse(await fetchJson(track.file, signal));
      if (!parsed.success || parsed.data.length !== track.count) {
        throw new Error(`${track.id} 题包不符合内容清单`);
      }
      return parsed.data;
    })
  );

  return packs.flat();
}
