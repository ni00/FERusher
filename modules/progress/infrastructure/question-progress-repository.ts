import {
  getAllRecords,
  localStores,
  openLocalDatabase,
  putRecord,
} from "@/modules/local-data/infrastructure/database";
import {
  normalizeQuestionProgress,
  type QuestionProgress,
} from "../domain/question-progress";
import type { ReviewEvent } from "../domain/review-event";

export async function listQuestionProgress(): Promise<QuestionProgress[]> {
  const records = await getAllRecords<QuestionProgress>(
    localStores.questionProgress
  );
  return records.map(normalizeQuestionProgress);
}

export function saveQuestionProgress(value: QuestionProgress): Promise<void> {
  return putRecord(localStores.questionProgress, value);
}

export function listReviewEvents(): Promise<ReviewEvent[]> {
  return getAllRecords<ReviewEvent>(localStores.reviewEvents);
}

export async function saveQuestionReview(
  progress: QuestionProgress,
  event: ReviewEvent
): Promise<void> {
  const database = await openLocalDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      [localStores.questionProgress, localStores.reviewEvents],
      "readwrite"
    );
    transaction.objectStore(localStores.questionProgress).put(progress);
    transaction.objectStore(localStores.reviewEvents).put(event);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
