import type { ReviewRating } from "./question-progress";

export interface ReviewEvent {
  id: string;
  questionId: string;
  rating: ReviewRating;
  reviewedAt: string;
}

export function createReviewEvent(
  questionId: string,
  rating: ReviewRating,
  reviewedAt = new Date()
): ReviewEvent {
  return {
    id: crypto.randomUUID(),
    questionId,
    rating,
    reviewedAt: reviewedAt.toISOString(),
  };
}
