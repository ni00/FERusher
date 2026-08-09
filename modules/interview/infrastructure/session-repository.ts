import {
  getAllRecords,
  localStores,
  putRecord,
} from "@/modules/local-data/infrastructure/database";
import type { ChatMessage } from "@/modules/ai/infrastructure/openai-compatible-browser-client";
import type { TrackId } from "@/modules/catalog/domain/question";

export interface InterviewSessionRecord {
  id: string;
  trackId: TrackId;
  role: string;
  startedAt: string;
  completedAt: string;
  messages: ChatMessage[];
}

export async function listInterviewSessions(): Promise<
  InterviewSessionRecord[]
> {
  const sessions = await getAllRecords<InterviewSessionRecord>(
    localStores.interviewSessions
  );
  return sessions.sort((left, right) =>
    right.completedAt.localeCompare(left.completedAt)
  );
}

export function saveInterviewSession(
  session: InterviewSessionRecord
): Promise<void> {
  return putRecord(localStores.interviewSessions, session);
}
